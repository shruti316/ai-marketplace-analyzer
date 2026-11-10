# Risk Methodology & Scoring Framework Report
**Indian Marketplace Multimodal Trust Dataset v1.7**
*AI-Powered Indian Marketplace Trust Intelligence Platform*
*Release Date: November 10, 2026*

---

## 1. Executive Summary

A critical failure mode in commercial marketplace analytics is the assignment of uncalibrated pseudo-probabilities (e.g., claiming a listing has an "87.3% fraud probability") without access to ground-truth regulatory or legal outcome labels. Such uncalibrated scores mislead consumers, create legal liability, and conflate statistical variance with fraudulent intent.

This report documents the rigorous **Deterministic Risk Methodology & Scoring Framework** implemented in Dataset v1.7 and the `src/trust_engine/` subsystem.

---

## 2. Rejection of Uncalibrated Pseudo-Probabilities

The platform adheres to four strict mathematical principles:
1. **No Fabricated Posteriors:** Bayesian posteriors or sigmoid probability scores ($P(\text{Fraud} \mid X)$) are prohibited unless trained and validated on a verified, balanced, and independently audited dataset of adjudicated fraud cases.
2. **Deterministic Explainable Tiers:** Products are classified into discrete, rule-governed risk tiers based on verifiable physical, textual, numerical, and relational evidence.
3. **Statistical Dispersion $\ne$ Malfeasance:** Statistical corridor deviations (e.g. a ₹15,000 designer handbag in an accessory category with median ₹500) are flagged as exploratory corridor outliers, never as statutory fraud.
4. **Zero-Penalty Invariant:** Unreviewed or unimaged products receive zero risk inflation. Missing data is classified explicitly as `UNASSESSED_SPARSE_DATA`.

---

## 3. Mathematical Formulations

### 3.1 Non-Parametric Price Corridors & Robust Z-Scores
E-commerce pricing exhibits severe right-skewness that invalidates Gaussian mean and standard deviation. We utilize robust L-estimators:
- **Interquartile Range ($\text{IQR}$):**
  $$\text{IQR} = Q_3 - Q_1$$
- **Corridor Boundaries ($[c_{\text{lower}}, c_{\text{upper}}]$):**
  $$c_{\text{lower}} = \max(0.0, Q_1 - 1.5 \times \text{IQR})$$
  $$c_{\text{upper}} = Q_3 + 1.5 \times \text{IQR}$$
- **Median Absolute Deviation ($\text{MAD}$):**
  $$\text{MAD} = \text{median}(|X_i - \text{median}(X)|)$$
- **Robust Z-Score ($z_{\text{robust}}$):**
  $$z_{\text{robust}} = \frac{X_i - \text{median}(X)}{1.4826 \times \text{MAD}}$$
  Where $1.4826$ standardizes the MAD to equivalent scale under normality. A product is flagged as an extreme price outlier if $|z_{\text{robust}}| \ge 3.0$.

### 3.2 Rating-Text Sentiment Discordance
To detect review manipulation (e.g. 5-star ratings attached to negative complaints or 1-star ratings attached to promotional praise), discordance delta ($\Delta_{\text{disc}}$) is calculated:
$$\Delta_{\text{disc}} = \left| \frac{R_i - 1.0}{4.0} - \frac{S_i + 1.0}{2.0} \right|$$
Where $R_i \in [1, 5]$ is the customer star rating, and $S_i \in [-1, +1]$ is the rule-normalized lexical sentiment score.
A review is flagged as discordant if $\Delta_{\text{disc}} \ge 0.60$.

### 3.3 Visual Similarity & Cross-Product Image Reuse
Hero images are embedded using pre-trained ResNet-18 deep visual features ($\mathbf{v} \in \mathbb{R}^{512}$), centered across the catalog mean $\boldsymbol{\mu}$, and compared via cosine similarity:
$$\text{Sim}(\mathbf{u}, \mathbf{v}) = \frac{(\mathbf{u} - \boldsymbol{\mu}) \cdot (\mathbf{v} - \boldsymbol{\mu})}{\|\mathbf{u} - \boldsymbol{\mu}\|_2 \|\mathbf{v} - \boldsymbol{\mu}\|_2}$$
Pairs exhibiting $\text{Sim} \ge 0.95$ across distinct canonical product IDs are flagged as `CROSS_PRODUCT_IMAGE_REUSE`.

---

## 4. Multi-Modal Fusion Logic

```
Modality Assessment Logic & Tier Assignment
├── 1. Modality Availability Check:
│   ├── Core Modalities: Pricing, Image CV, Review NLP
│   └── If Available Core Modalities < 2:
│       └── Overall Tier = UNASSESSED_SPARSE_DATA (Zero Penalty Invariant)
├── 2. Intra-Modality De-Duplication:
│   ├── Pricing: Group (Corridor Outlier, Extreme Markdown, MRP Breach) -> Max 1 Pricing Flag
│   ├── Image CV: Group (File Corrupt, Visual Reuse) -> Max 1 Image Flag
│   └── Review NLP: Group (Duplicate Cluster, Discordance, Burst) -> Max 1 Review Flag
└── 3. Cross-Modal Corroboration:
    ├── If Active Independent Anomaly Modalities >= 2:
    │   └── Overall Tier = ELEVATED_MULTIMODAL_ANOMALY
    ├── If Active Independent Anomaly Modalities == 1:
    │   └── Overall Tier = MODERATE_SINGLE_MODALITY_ANOMALY
    └── If Active Independent Anomaly Modalities == 0:
        └── Overall Tier = LOW_OBSERVED_ANOMALY
```

---

## 5. Risk Tier Definitions & Actionable Next Steps

| Risk Tier | Operational Trigger Criteria | Confidence | Recommended Consumer & Platform Action |
| :--- | :--- | :--- | :--- |
| **`UNASSESSED_SPARSE_DATA`** | Core available modalities $< 2$ (e.g. price only; no hero image or reviews). | Medium (0.50) | **Zero Penalty.** Do not display negative trust badges. Prompt platform crawlers to acquire customer reviews or hero image assets. |
| **`LOW_OBSERVED_ANOMALY`** | Core modalities $\ge 2$; zero active anomaly flags across all evaluated modalities. | High (1.00) | **Approved for High-Trust Display.** Consistent pricing, verified unique image assets, and organic review sentiment distribution. |
| **`MODERATE_SINGLE_MODALITY_ANOMALY`** | Core modalities $\ge 2$; exactly 1 independent modality exhibits an anomaly. | High (0.85 – 0.92) | **Informational Warning.** Highlight specific signal (e.g. "Price deviates from subcategory median" or "Image shared with sister product"). |
| **`ELEVATED_MULTIMODAL_ANOMALY`** | Core modalities $\ge 2$; $\ge 2$ independent modalities exhibit corroborating anomalies. | High (0.90 – 0.98) | **Investigation Required.** Flag for catalog operations review. Compounding anomalies indicate catalog misrepresentation or deceptive markdown bait. |
