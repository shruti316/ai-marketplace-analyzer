# Marketplace Trust Intelligence Dataset v1.6 — Executive Summary

## 1. Release Identification
- **Release Version:** `v1.6`
- **Release Status:** `FROZEN`
- **Directory:** `data/marketplace_trust_dataset_v1.6/`
- **Certification Verdict:** `CERTIFIED_WITH_LIMITATIONS`
- **Audit Date:** November 2026
- **Assigned Milestone:** Indian-First Multimodal Expansion, Temporal Price Schema, Seller Governance, Multilingual Review Intelligence, and Protocol-Isolated AI Readiness.

## 2. Master Key Achievements of Release v1.6
1. **Formal 4-Tier Modality Taxonomy:** Clean mathematical categorization of all 6,043 products:
   - Tier A (Complete Multimodal): **305 products** (300 Amazon US, 5 Amazon India).
   - Tier B (Visual Commerce): **2,506 products** (1,480 Amazon India, 927 Flipkart, 99 Amazon US).
   - Tier C (Textual Commerce): **127 products** (Flipkart review-bearing listings).
   - Tier D (Catalog / Single Modality): **3,105 products** (Myntra 1,000, Walmart 1,131, Amazon US 621, BestBuy 249, Flipkart catalog 89, Amazon India missing-price 15).
2. **Flipkart 127 Review Products Expansion:** Registered the 127 Flipkart review-bearing products with active prices and 3,260 reviews in `manifests/flipkart_127_image_target_manifest.csv` with a network-governed offline adapter (`flipkart_image_adapter_v1_6.py`).
3. **Seller Identity Resolution & Honest Null Governance:** Resolved 6 platform aggregate seller entities in `entities/sellers.parquet` while strictly preserving 100% honest nulls on `products.seller_id`. Zero synthetic GSTINs/CINs fabricated.
4. **Temporal Price Observation Architecture:** Upgraded `price_observations.parquet` to the standardized temporal schema with observation timestamps, source references, and batch IDs (`BATCH_20261102_BASELINE_T0`). Single-observation listings are honestly tagged `READY_FOR_DATA_COLLECTION`.
5. **Multilingual Review Intelligence:** Annotated all 56,697 reviews for script, language confidence, and transliterated Indic (Hinglish) density:
   - English: 45,012 reviews (79.39%)
   - Hinglish (Latinized Indic): 11,672 reviews (20.59%)
   - Unknown / Symbol-only: 13 reviews (0.02%)
6. **7-Tier Fraud Ground Truth Taxonomy:** Programmatic weak supervision framework (`WEAK_LABEL_SUSPICIOUS`: 22,105, `WEAK_LABEL_PROMOTIONAL_SUSPECT`: 3,276, `UNLABELED`: 31,059). Zero real marketplace reviews falsely labeled `CONFIRMED_FRAUD`. Academic benchmarks (Ott et al.) remain strictly isolated in `collections/isolated_benchmarks/`.
7. **Computer Vision Deep Feature Embeddings:** Extracted 512-dimensional deep feature embeddings for all 5,228 verified usable images on disk using PyTorch ResNet, serialized in `visual_embeddings_metadata.parquet` and `visual_embeddings_v1_6.npz`.
8. **NetworkX Graph Intelligence:** Extracted degree centrality, neighborhood density, and component structure across 72,881 nodes and 67,101 edges (`graph_features.parquet`).
9. **Leakage-Free Protocol 3 NLP Benchmarking:** Trained baseline sentiment models on reviewer-held-out splits with 0 reviewer leakage:
   - Logistic Regression: Accuracy 0.9510, ROC-AUC 0.9774
   - Multinomial Naive Bayes: Accuracy 0.9419, ROC-AUC 0.9719
10. **Test & Validation Mastery:** 102/102 automated validator invariant checks (100.0%) passed; 316/316 full regression pytest suite (100.0%) passed; all 16 protected baselines verified 100% bit-perfect.
