# CLIP Vision-Language Consistency Benchmark Report

**Project:** AI-Powered Indian Marketplace Trust Intelligence Platform  
**Phase:** Phase 1 Final — Scientific Architecture Finalization  
**Specification:** [`reports/phase_1_final/clip_validation_report.md`](file:///c:/Users/shruti/Desktop/project/ai-based-marketplace-analyzer/reports/phase_1_final/clip_validation_report.md)  
**Model Architecture:** openai/clip-vit-base-patch32  

---

## 1. Contrastive Text-Image Alignment Benchmark ($N=100$)

We evaluated zero-shot text-image cosine similarities across true matched catalog pairs versus contrastive cross-product & cross-category mismatched pairs:

- **Matched Pair Distribution:** Mean = **0.3389**, Range = `[0.2114, 0.4414]`
- **Contrastive Mismatched Distribution:** Mean = **0.1358**, Range = `[0.0352, 0.2141]`
- **Contrastive ROC-AUC:** **0.9999**
- **Contrastive PR-AUC:** **0.9999**

---

## 2. Threshold Calibration on Validation Benchmark

| Cosine Threshold ($\cos \theta$) | Precision | Recall | $F_1$ Score | Operational Classification |
| :---: | :---: | :---: | :---: | :--- |
| **0.15** | 0.7353 | 1.0 | 0.8475 | Benchmark Validation Split |
| **0.2** | 0.9524 | 1.0 | 0.9756 | Benchmark Validation Split |
| **0.25** | 1.0 | 0.95 | 0.9744 | Benchmark Validation Split |
| **0.3** | 1.0 | 0.85 | 0.9189 | Benchmark Validation Split |
| **0.35** | 1.0 | 0.43 | 0.6014 | Benchmark Validation Split |

---

## 3. Calibrated Operational Thresholds

1. **`HIGH_VISUAL_TEXT_ALIGNMENT` ($\cos \ge 0.30$):** High concordance between image visual concepts and listing title.
2. **`MODERATE_ALIGNMENT` ($0.20 \le \cos < 0.30$):** Generic title or partial visual overlap; non-penalized monitoring.
3. **`DISCORDANT_ANOMALY` ($\cos < 0.20$):** Extreme discordance (e.g. cosmetics title paired with laptop image); triggers corroboration flag.
