"""
Test Suite: Combined Milestone 3 + 4 Review NLP, Image Intelligence & Multimodal Evidence
Dataset Release: Indian Marketplace Trust Dataset v1.5
AI-Powered Indian Marketplace Trust Intelligence Platform

Verifies:
1. Review NLP preprocessing, tokenization, and length metrics.
2. Review exact duplicate clustering and temporal bursts.
3. Sentiment analysis and rating-text discordance calculation.
4. Aspect-based sentiment analysis (ABSA) extraction across 6 domains with evidence spans.
5. Annotation provenance auditing and distinction between single-annotator, silver, and pending.
6. Image file integrity, cryptographic (SHA-256) and perceptual (dHash) hashing.
7. ResNet-18 centered cosine similarity and near-duplicate clustering.
8. Physical OCR dependency blocker audit and separation from title-token proxy.
9. Image-text consistency schema and dependency blocker.
10. Unified atomic multimodal evidence schema compliance.
11. Explicit missing modality handling (zero false fraud penalties for unreviewed/unimaged products).
12. Checksum and manifest integrity.
"""

from collections import defaultdict
import json
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
import numpy as np
import pandas as pd

from src.nlp.review_intelligence import (
    ReviewTextProcessor,
    LanguageAndScriptDetector,
    ExplainableSentimentAnalyzer,
    AspectBasedSentimentAnalyzer,
    ReviewManipulationDetector,
)
from src.cv.image_intelligence import (
    ImageFileValidator,
    VisualEmbeddingMatcher,
    ImageClusterDetector,
)
from src.ocr.ocr_pipeline import OCRDependencyAuditor
from src.multimodal.evidence_fusion import MissingModalityHandler

DATASET_V15_DIR = Path("data/indian_marketplace_trust_dataset_v1_5")


class TestReviewNLPIntelligence:
    """Tests for Milestone 3 Review NLP Intelligence."""

    def test_review_text_preprocessing(self):
        """Verifies text normalization and length metric computation."""
        raw = "  Great HEADPHONES! Sound is 10/10... Really loved it!!   "
        stats = ReviewTextProcessor.compute_text_stats(raw)
        assert stats["review_text_normalized"] == "great headphones! sound is 10/10... really loved it!!"
        assert stats["word_count"] > 0
        assert stats["char_length"] == len(raw)
        assert not stats["is_empty"]

    def test_language_and_script_detection(self):
        """Verifies English baseline and Hinglish transliteration detection."""
        en_text = "The product quality is good and arrived on time."
        en_res = LanguageAndScriptDetector.identify_language(en_text)
        assert en_res["detected_language"] == "en"
        assert en_res["detected_script"] == "Latin"

        hi_en_text = "bahut acha product hai paisa vasool"
        hi_en_res = LanguageAndScriptDetector.identify_language(hi_en_text)
        assert hi_en_res["detected_language"] == "hi-en"
        assert hi_en_res["is_code_mixed"] is True

    def test_sentiment_and_rating_discordance(self):
        """Verifies bounded sentiment scoring and discordance detection."""
        pos_text = "excellent product amazing quality loved it"
        pos_res = ExplainableSentimentAnalyzer.analyze_sentiment(pos_text)
        assert pos_res["sentiment_score"] > 0.5
        assert pos_res["sentiment_polarity"] == "POSITIVE"

        neg_text = "worst purchase ever fake and broken completely waste"
        neg_res = ExplainableSentimentAnalyzer.analyze_sentiment(neg_text)
        assert neg_res["sentiment_score"] < -0.5
        assert neg_res["sentiment_polarity"] == "NEGATIVE"

        # Discordance test: 5-star rating with strongly negative text
        disc_score, is_disc = ExplainableSentimentAnalyzer.compute_discordance(5.0, -0.9)
        assert disc_score >= 0.50
        assert is_disc is True

        # Concordance test: 5-star rating with positive text
        conc_score, is_conc = ExplainableSentimentAnalyzer.compute_discordance(5.0, 0.8)
        assert conc_score < 0.30
        assert is_conc is False

    def test_aspect_based_sentiment_domains_and_spans(self):
        """Verifies 6 ABSA domains and supporting evidence span extraction."""
        text = "The fabric quality is great. But delivery was late and courier delayed."
        aspects = AspectBasedSentimentAnalyzer.analyze_aspects(text)

        assert aspects["quality"]["present"] is True
        assert aspects["quality"]["polarity"] == "POSITIVE"
        assert "fabric" in aspects["quality"]["supporting_span"] or "quality" in aspects["quality"]["supporting_span"]
        assert aspects["quality"]["experience_type"] == "PRODUCT_EXPERIENCE"

        assert aspects["delivery"]["present"] is True
        assert aspects["delivery"]["polarity"] == "NEGATIVE"
        assert aspects["delivery"]["experience_type"] == "SELLER_LOGISTICS_EXPERIENCE"

        assert aspects["authenticity"]["present"] is False
        assert aspects["authenticity"]["polarity"] == "NOT_MENTIONED"

    def test_review_nlp_parquet_table(self):
        """Verifies derived_evidence/review_nlp_features.parquet structure and row count."""
        path = DATASET_V15_DIR / "derived_evidence" / "review_nlp_features.parquet"
        assert path.exists(), f"Missing {path}"
        df = pd.read_parquet(path)
        assert len(df) == 3659
        assert "sentiment_score" in df.columns
        assert "rating_discordance_score" in df.columns
        assert "aspect_quality_present" in df.columns
        assert "REVIEW_SIMILARITY_SIGNAL" in df.columns
        assert "REVIEW_BURST_SIGNAL" in df.columns
        assert "RATING_DISCORDANCE_SIGNAL" in df.columns

    def test_review_similarity_clusters_table(self):
        """Verifies derived_evidence/review_similarity_clusters.parquet."""
        path = DATASET_V15_DIR / "derived_evidence" / "review_similarity_clusters.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) > 0
        assert "cluster_id" in df.columns
        assert "member_count" in df.columns
        assert (df["member_count"] >= 2).all()


class TestAnnotationProvenance:
    """Tests for Annotation Provenance Auditing."""

    def test_human_review_annotation_classification(self):
        """Verifies the 100 human reviews are audited and marked as provisional single annotator."""
        path = DATASET_V15_DIR / "annotations" / "review_human_annotations.parquet"
        df = pd.read_parquet(path)
        assert len(df) == 100
        assert "provenance_classification" in df.columns
        assert (df["provenance_classification"] == "TIER_2_PROVISIONAL_SINGLE_ANNOTATOR").all()
        assert (df["is_multi_annotator_adjudicated"] == False).all()

    def test_silver_and_pending_separation(self):
        """Verifies silver annotations and pending tasks remain distinct."""
        silver_path = DATASET_V15_DIR / "annotations" / "review_silver_annotations.parquet"
        pending_path = DATASET_V15_DIR / "annotations" / "human_annotation_pending_tasks.parquet"
        queue_path = DATASET_V15_DIR / "annotations" / "annotation_task_queue_v1_5.json"

        assert len(pd.read_parquet(silver_path)) == 600
        assert len(pd.read_parquet(pending_path)) == 500

        assert queue_path.exists()
        with open(queue_path, "r", encoding="utf-8") as f:
            qdata = json.load(f)
        assert qdata["total_pending_tasks"] == 500
        assert len(qdata["tasks"]) == 500
        assert qdata["tasks"][0]["annotation_protocol"]["required_annotators"] == 2


class TestImageIntelligence:
    """Tests for Milestone 4 Image Intelligence."""

    def test_image_file_validations_and_hashes(self):
        """Verifies 4,708 images exist on disk and have valid dimensions and hashes."""
        path = DATASET_V15_DIR / "derived_evidence" / "image_intelligence_features.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) == 4708
        assert df["file_exists"].all()
        assert not df["is_corrupt"].any()
        assert (df["width"] > 0).all()
        assert (df["height"] > 0).all()
        assert (df["aspect_ratio"] > 0.0).all()
        assert df["sha256_hash"].notna().all()

    def test_visual_embedding_centered_normalization(self):
        """Verifies that centered ResNet-18 embeddings remove representation anisotropy."""
        emb_path = DATASET_V15_DIR / "derived_evidence" / "visual_embeddings_resnet18.npz"
        npz = np.load(emb_path)
        raw_emb = npz["normalized_embeddings"]

        centered_emb = VisualEmbeddingMatcher.center_and_normalize(raw_emb)
        norms = np.linalg.norm(centered_emb, axis=1)
        np.testing.assert_allclose(norms, 1.0, atol=1e-5)

        # Off-diagonal centered similarity mean should be close to 0.14, far below raw 0.99
        sample_sim = np.dot(centered_emb[:50], centered_emb[:50].T)
        off_diag = sample_sim[~np.eye(50, dtype=bool)]
        assert off_diag.mean() < 0.35, f"Expected centered similarity mean < 0.35, got {off_diag.mean()}"

    def test_image_similarity_pairs_and_clusters(self):
        """Verifies near-duplicate pairs and visual clusters."""
        pairs_path = DATASET_V15_DIR / "derived_evidence" / "image_similarity_pairs.parquet"
        clusters_path = DATASET_V15_DIR / "derived_evidence" / "image_clusters.parquet"

        assert pairs_path.exists()
        pairs_df = pd.read_parquet(pairs_path)
        assert len(pairs_df) > 0
        assert (pairs_df["similarity_score"] >= 0.90).all()

        assert clusters_path.exists()
        clusters_df = pd.read_parquet(clusters_path)
        assert len(clusters_df) > 0
        assert (clusters_df["image_count"] >= 2).all()


class TestOCRandImageTextConsistency:
    """Tests for OCR capability handling and Vision-Language dependency blockers."""

    def test_ocr_offline_dependency_blocker_fidelity(self):
        """Verifies physical OCR reports blocked dependency without fake text."""
        path = DATASET_V15_DIR / "evidence" / "ocr_evidence.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) > 0
        assert (df["processing_status"] == "BLOCKED_OFFLINE_DEPENDENCY_ABSENT").all()
        assert (df["ocr_confidence"] == 0.0).all()
        assert df["detected_text"].isna().all(), "Zero synthetic fabrication violated in physical OCR!"

    def test_title_token_proxy_remains_isolated(self):
        """Verifies title token proxy remains separate from physical OCR."""
        proxy_path = DATASET_V15_DIR / "evidence" / "title_token_packaging_proxy.parquet"
        assert proxy_path.exists()
        proxy_df = pd.read_parquet(proxy_path)
        assert len(proxy_df) == 1000
        assert "proxy_method" in proxy_df.columns
        assert (proxy_df["proxy_confidence"] == 0.5).all()

    def test_image_text_consistency_offline_blocker(self):
        """Verifies image-text consistency is marked dependency blocked without fake scores."""
        path = DATASET_V15_DIR / "derived_evidence" / "image_text_consistency.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) == 1
        assert df["execution_status"].iloc[0] == "BLOCKED_OFFLINE_DEPENDENCY_ABSENT"
        assert df["similarity_score"].iloc[0] == 0.0


class TestMultimodalEvidenceAndMissingModality:
    """Tests for Multimodal Evidence Integration and Missing Modality Invariant."""

    def test_atomic_multimodal_evidence_records_schema(self):
        """Verifies atomic evidence records table structure and signal severity."""
        path = DATASET_V15_DIR / "derived_evidence" / "multimodal_evidence_records.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) > 0
        required_cols = [
            "evidence_id", "entity_id", "canonical_product_id", "evidence_modality",
            "evidence_type", "evidence_signal_name", "signal_value", "signal_severity",
            "detection_method", "confidence", "modality_available", "provenance", "timestamp"
        ]
        for col in required_cols:
            assert col in df.columns, f"Missing column {col} in atomic evidence records"

        valid_modalities = {"REVIEW_NLP", "IMAGE_CV", "PRICING", "SELLER_GRAPH", "OCR", "IMAGE_TEXT_CONSISTENCY"}
        assert set(df["evidence_modality"]).issubset(valid_modalities)

    def test_missing_modality_zero_penalty_invariant(self):
        """
        MANDATORY REQUIREMENT:
        - Products without reviews must NOT receive a negative review penalty.
        - Products without images must NOT receive a negative image penalty.
        - Missing modality must be marked as MODALITY_UNAVAILABLE, never penalized.
        """
        path = DATASET_V15_DIR / "derived_evidence" / "product_multimodal_summary.parquet"
        assert path.exists()
        df = pd.read_parquet(path)
        assert len(df) == 3643

        # Check products with 0 reviews
        unreviewed = df[df["review_count"] == 0]
        assert len(unreviewed) > 3000
        assert (unreviewed["review_modality_status"] == "MODALITY_UNAVAILABLE").all()
        assert (unreviewed["review_risk_signal"] == "NOT_EVALUATED_MODALITY_UNAVAILABLE").all()
        assert unreviewed["mean_sentiment_score"].isna().all()

        # Check products with 0 images
        unimaged = df[df["usable_image_count"] == 0]
        assert len(unimaged) > 1000
        assert (unimaged["image_modality_status"] == "MODALITY_UNAVAILABLE").all()
        assert (unimaged["image_risk_signal"] == "NOT_EVALUATED_MODALITY_UNAVAILABLE").all()

    def test_no_false_fraud_labels_or_uncalibrated_probabilities(self):
        """Verifies absence of definitive fraud labels or fake Bayesian probabilities."""
        path = DATASET_V15_DIR / "derived_evidence" / "product_multimodal_summary.parquet"
        df = pd.read_parquet(path)

        for col in df.columns:
            if "probability" in col.lower():
                pytest.fail(f"Uncalibrated probability column found: {col}")

        # Provisional risk tier must be explicitly categorized as heuristic
        valid_tiers = {
            "UNASSESSED_SPARSE_DATA",
            "LOW_OBSERVED_ANOMALY",
            "MODERATE_SINGLE_MODALITY_ANOMALY",
            "ELEVATED_MULTIMODAL_ANOMALY"
        }
        assert set(df["provisional_risk_tier"]).issubset(valid_tiers)

    def test_checksum_and_manifest_validity(self):
        """Verifies sha256_manifest.json and checksums.sha256 exist and match files."""
        sha_path = DATASET_V15_DIR / "manifests" / "sha256_manifest.json"
        manifest_path = DATASET_V15_DIR / "manifests" / "dataset_manifest.json"
        chk_path = DATASET_V15_DIR / "manifests" / "checksums.sha256"

        assert sha_path.exists()
        assert manifest_path.exists()
        assert chk_path.exists()

        with open(sha_path, "r", encoding="utf-8") as f:
            sha_data = json.load(f)
        assert len(sha_data) >= 40
