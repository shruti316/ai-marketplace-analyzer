"""
src/vision/expanded_embeddings.py
---------------------------------
Pretrained ResNet-18 Embedding Extraction for Expanded Usable Image Dataset.

Features:
- Extracts 512-dimensional, L2-normalized visual representations.
- Scope: Exactly all 5,887 usable images identified in expanded_image_manifest.parquet.
- Model: torchvision pretrained ResNet-18 with fc layer replaced by Identity.
- Batched CPU/GPU inference with inference_mode.
- Vector reuse for exact SHA-256 duplicates: avoids redundant forward passes while preserving
  distinct metadata rows and image IDs for all 5,887 eligible records.
- Preserves all near-duplicate images for individual forward-pass extraction (no collapsing).
- Checkpointing and resumability supported.
- Outputs separate artifacts:
  - data/processed/expanded_image_embeddings_resnet18.npy
  - data/processed/expanded_image_embeddings_metadata.parquet
  - data/processed/expanded_embedding_extraction_report.json
- Strictly preserves baseline pilot artifacts byte-for-byte.
"""

import os
import sys
import json
import time
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

sys.path.insert(0, os.path.abspath("."))

import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
from torchvision import models
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


class ExpandedResNetExtractor:
    """
    Extracts 512-dim ResNet-18 embeddings across all 5,887 eligible usable images.
    """

    def __init__(
        self,
        manifest_path: str = "data/interim/expanded_image_manifest.parquet",
        output_embeddings_path: str = "data/processed/expanded_image_embeddings_resnet18.npy",
        output_metadata_path: str = "data/processed/expanded_image_embeddings_metadata.parquet",
        output_report_path: str = "data/processed/expanded_embedding_extraction_report.json",
        checkpoint_dir: str = "data/interim/embedding_checkpoint",
        batch_size: int = 64,
        checkpoint_interval: int = 500,
        device: str = "cpu",
    ):
        self.manifest_path = Path(manifest_path)
        self.output_embeddings_path = Path(output_embeddings_path)
        self.output_metadata_path = Path(output_metadata_path)
        self.output_report_path = Path(output_report_path)
        self.checkpoint_dir = Path(checkpoint_dir)
        self.batch_size = batch_size
        self.checkpoint_interval = checkpoint_interval
        self.device = torch.device(device)

        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)
        self.output_embeddings_path.parent.mkdir(parents=True, exist_ok=True)

    def run(self) -> Tuple[np.ndarray, pd.DataFrame, Dict[str, Any]]:
        """
        Executes embedding extraction across usable images and validates output integrity.
        """
        t0 = time.time()
        logging.info("==================================================")
        logging.info("Starting Stage 3: ResNet-18 Embedding Extraction")
        logging.info("==================================================")

        # 1. Load manifest and filter strictly to usable images
        logging.info("Loading expanded image manifest from %s", self.manifest_path)
        df_manifest = pd.read_parquet(self.manifest_path)

        eligible_df = df_manifest[df_manifest["is_usable"].eq(True)].copy().reset_index(drop=True)
        total_eligible = len(eligible_df)
        logging.info("Total eligible usable images identified: %d", total_eligible)

        if total_eligible != 5887:
            raise ValueError(f"CRITICAL: Expected exactly 5,887 eligible records, but found {total_eligible}. Extraction aborted.")

        # Verify all local paths exist
        missing_paths = [p for p in eligible_df["local_path"] if not pd.notna(p) or not Path(str(p)).exists()]
        if missing_paths:
            raise FileNotFoundError(f"CRITICAL: Found {len(missing_paths)} missing local files among eligible images.")
        logging.info("Verified all %d local image files exist on disk.", total_eligible)

        # 2. Check for existing checkpoint
        ckpt_meta_path = self.checkpoint_dir / "ckpt_meta.parquet"
        ckpt_matrix_path = self.checkpoint_dir / "ckpt_vectors.npy"

        extracted_vectors: Dict[str, np.ndarray] = {}  # image_id -> vector
        if ckpt_meta_path.exists() and ckpt_matrix_path.exists():
            try:
                df_prev_meta = pd.read_parquet(ckpt_meta_path)
                prev_matrix = np.load(ckpt_matrix_path)
                for i, r in df_prev_meta.iterrows():
                    extracted_vectors[str(r["image_id"])] = prev_matrix[i]
                logging.info("Loaded %d previously checkpointed embedding vectors.", len(extracted_vectors))
            except Exception as e:
                logging.warning("Could not read checkpoint: %s. Starting fresh.", e)

        # 3. Model setup
        logging.info("Loading pretrained ResNet-18 model on device '%s'...", self.device)
        weights = models.ResNet18_Weights.DEFAULT
        model = models.resnet18(weights=weights)
        model.fc = torch.nn.Identity()
        model.eval()
        model = model.to(self.device)
        preprocess = weights.transforms()

        # 4. Partition into images requiring forward pass vs duplicate reuse
        # Exact duplicates have quality_status == 'DUPLICATE' and duplicate_of_image_id
        # All VALIDATED and NEAR_DUPLICATE images receive independent forward passes
        images_to_forward: List[Dict[str, Any]] = []
        duplicate_records: List[Dict[str, Any]] = []

        for _, row in eligible_df.iterrows():
            img_id = str(row["image_id"])
            q_status = str(row["quality_status"])

            rec = {
                "image_id": img_id,
                "canonical_product_id": str(row["canonical_product_id"]),
                "marketplace": str(row["marketplace"]),
                "local_path": str(row["local_path"]).replace("\\", "/"),
                "quality_status": q_status,
                "content_hash_sha256": str(row["content_hash_sha256"]),
                "perceptual_hash_dhash": str(row["perceptual_hash_dhash"]),
                "duplicate_of_image_id": row.get("duplicate_of_image_id"),
            }

            if q_status == "DUPLICATE" and pd.notna(row.get("duplicate_of_image_id")):
                duplicate_records.append(rec)
            else:
                images_to_forward.append(rec)

        logging.info("Images requiring ResNet forward pass (VALIDATED + NEAR_DUPLICATE): %d", len(images_to_forward))
        logging.info("Images reusing vectors from identical SHA-256 lead (DUPLICATE): %d", len(duplicate_records))
        assert len(images_to_forward) + len(duplicate_records) == 5887

        # 5. Execute batched forward passes
        pending_forward = [r for r in images_to_forward if r["image_id"] not in extracted_vectors]
        logging.info("Pending forward passes to compute: %d", len(pending_forward))

        forward_pass_count = 0
        extraction_errors: List[Dict[str, Any]] = []

        if pending_forward:
            with torch.inference_mode():
                for start_idx in range(0, len(pending_forward), self.batch_size):
                    batch_recs = pending_forward[start_idx : start_idx + self.batch_size]
                    tensors = []
                    valid_batch_recs = []

                    for r in batch_recs:
                        try:
                            with Image.open(r["local_path"]) as img:
                                rgb = img.convert("RGB")
                                t = preprocess(rgb)
                                tensors.append(t)
                                valid_batch_recs.append(r)
                        except Exception as exc:
                            logging.error("Failed opening/transforming image %s: %s", r["local_path"], exc)
                            extraction_errors.append({"image_id": r["image_id"], "error": str(exc)})

                    if tensors:
                        batch_tensor = torch.stack(tensors).to(self.device)
                        features = model(batch_tensor)
                        norm_features = F.normalize(features, p=2, dim=1).cpu().numpy()

                        for r, vec in zip(valid_batch_recs, norm_features):
                            extracted_vectors[r["image_id"]] = vec
                            forward_pass_count += 1

                    completed = min(len(pending_forward), start_idx + len(batch_recs))
                    if completed % self.checkpoint_interval < len(batch_recs) or completed == len(pending_forward):
                        logging.info("Forward pass progress: %d / %d completed (%.1f%%)",
                                     completed, len(pending_forward), (completed / len(pending_forward)) * 100)
                        self._save_checkpoint(extracted_vectors, eligible_df)

        # 6. Resolve vectors for exact duplicates from their lead image
        reused_count = 0
        for dup in duplicate_records:
            lead_id = str(dup["duplicate_of_image_id"])
            if lead_id in extracted_vectors:
                extracted_vectors[dup["image_id"]] = extracted_vectors[lead_id]
                reused_count += 1
            else:
                # If lead vector was not found (edge case), run direct forward pass
                logging.warning("Lead vector for duplicate %s not found (%s). Running individual pass.", dup["image_id"], lead_id)
                with torch.inference_mode():
                    with Image.open(dup["local_path"]) as img:
                        t = preprocess(img.convert("RGB")).unsqueeze(0).to(self.device)
                        vec = F.normalize(model(t), p=2, dim=1).squeeze(0).cpu().numpy()
                        extracted_vectors[dup["image_id"]] = vec
                        forward_pass_count += 1

        logging.info("Duplicate vector resolution complete. Reused: %d vectors.", reused_count)

        # 7. Assemble strictly aligned final matrix and metadata table
        final_meta_rows = []
        final_matrix_rows = []

        for idx, row in eligible_df.iterrows():
            img_id = str(row["image_id"])
            vec = extracted_vectors.get(img_id)

            if vec is None:
                raise ValueError(f"CRITICAL: Missing embedding vector for eligible image {img_id}")

            is_reused = str(row["quality_status"]) == "DUPLICATE" and pd.notna(row.get("duplicate_of_image_id"))
            source_lead_id = str(row["duplicate_of_image_id"]) if is_reused else img_id
            status_str = "SUCCESS_REUSED_DUPLICATE" if is_reused else "SUCCESS_FORWARD_PASS"

            final_meta_rows.append({
                "embedding_index": idx,
                "image_id": img_id,
                "canonical_product_id": str(row["canonical_product_id"]),
                "marketplace": str(row["marketplace"]),
                "local_path": str(row["local_path"]).replace("\\", "/"),
                "quality_status": str(row["quality_status"]),
                "content_hash_sha256": str(row["content_hash_sha256"]),
                "perceptual_hash_dhash": str(row["perceptual_hash_dhash"]),
                "embedding_source_image_id": source_lead_id,
                "embedding_extraction_status": status_str,
            })
            final_matrix_rows.append(vec)

        final_matrix = np.stack(final_matrix_rows).astype(np.float32)
        df_final_meta = pd.DataFrame(final_meta_rows)

        # 8. Mandatory Integrity Validations
        logging.info("Executing mandatory integrity validations...")
        assert len(final_matrix) == 5887, f"Expected 5,887 rows, got {len(final_matrix)}"
        assert len(df_final_meta) == 5887, f"Expected 5,887 metadata rows, got {len(df_final_meta)}"
        assert final_matrix.shape == (5887, 512), f"Matrix shape mismatch: {final_matrix.shape}"
        assert df_final_meta["image_id"].is_unique, "Duplicate image IDs found in metadata!"
        assert df_final_meta["image_id"].isin(eligible_df["image_id"]).all(), "Ineligible images present in metadata!"
        assert not np.isnan(final_matrix).any(), "Embedding matrix contains NaN values!"
        assert not np.isinf(final_matrix).any(), "Embedding matrix contains Inf values!"

        # Norm check
        norms = np.linalg.norm(final_matrix, axis=1)
        assert np.allclose(norms, 1.0, atol=1e-4), f"L2 norms deviate from 1.0: min={norms.min()}, max={norms.max()}"

        # Embedding index alignment check
        for test_idx in [0, 100, 1000, 3000, 5000, 5886]:
            row_idx = df_final_meta.iloc[test_idx]["embedding_index"]
            assert row_idx == test_idx, f"Index mismatch at {test_idx}: got {row_idx}"

        # 9. Save outputs
        np.save(self.output_embeddings_path, final_matrix)
        df_final_meta.to_parquet(self.output_metadata_path, index=False)

        # Clean up temporary checkpoint
        if ckpt_meta_path.exists():
            try:
                ckpt_meta_path.unlink()
                ckpt_matrix_path.unlink()
            except Exception:
                pass

        elapsed = time.time() - t0
        logging.info("Saved expanded embeddings to %s (Shape: %s)", self.output_embeddings_path, final_matrix.shape)
        logging.info("Saved expanded metadata to %s (Rows: %d)", self.output_metadata_path, len(df_final_meta))

        # 10. Generate extraction report
        report = {
            "execution_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "elapsed_seconds": round(elapsed, 2),
            "total_images_processed": len(final_matrix),
            "unique_sha256_represented": eligible_df["content_hash_sha256"].nunique(),
            "forward_passes_executed": forward_pass_count,
            "duplicate_vectors_reused": reused_count,
            "extraction_failures": len(extraction_errors),
            "matrix_shape": list(final_matrix.shape),
            "metadata_shape": list(df_final_meta.shape),
            "embedding_dimension": 512,
            "norm_min": float(norms.min()),
            "norm_max": float(norms.max()),
            "norm_mean": float(norms.mean()),
            "unique_products_represented": df_final_meta["canonical_product_id"].nunique(),
            "output_files": {
                "embeddings_matrix": str(self.output_embeddings_path),
                "embeddings_metadata": str(self.output_metadata_path),
                "extraction_report": str(self.output_report_path),
            },
            "validations_passed": {
                "exactly_5887_records": bool(len(final_matrix) == 5887),
                "unique_image_ids": bool(df_final_meta["image_id"].is_unique),
                "finite_values_no_nan_or_inf": bool(np.isfinite(final_matrix).all()),
                "unit_l2_normalization": bool(np.allclose(norms, 1.0, atol=1e-4)),
                "index_alignment": True,
                "local_paths_verified": True,
            },
        }

        with open(self.output_report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        logging.info("Saved extraction report to %s", self.output_report_path)

        return final_matrix, df_final_meta, report

    def _save_checkpoint(self, extracted_vectors: Dict[str, np.ndarray], eligible_df: pd.DataFrame) -> None:
        """Saves current state to checkpoint."""
        try:
            saved_ids = list(extracted_vectors.keys())
            if not saved_ids:
                return
            matrix = np.stack([extracted_vectors[i] for i in saved_ids]).astype(np.float32)
            df_meta = eligible_df[eligible_df["image_id"].isin(saved_ids)][["image_id"]].copy()

            np.save(self.checkpoint_dir / "ckpt_vectors.npy", matrix)
            df_meta.to_parquet(self.checkpoint_dir / "ckpt_meta.parquet", index=False)
        except Exception as e:
            logging.warning("Error saving checkpoint: %s", e)


if __name__ == "__main__":
    extractor = ExpandedResNetExtractor(device="cpu", batch_size=64)
    matrix, meta, report = extractor.run()
    print("\nExtraction Summary:\n", json.dumps(report, indent=2))
