# Marketplace Trust Intelligence Engine — System Architecture
## AI-Powered Marketplace Trust Intelligence Platform — v1.7 Integration

### 1. High-Level Architecture Overview

The **Marketplace Trust Intelligence Engine** is structured into specialized, decoupled micro-services coordinated by the unified `MarketplaceTrustEngine` and exposed through the programmatic `MarketplaceTrustAPI`.

```mermaid
flowchart TD
    API["MarketplaceTrustAPI<br/>(src/engine/api.py)"]
    
    subgraph CoreServices["Domain Intelligence Services"]
        NLP["NLPReviewIntelligenceService<br/>- Preprocessing & Hinglish<br/>- 6-Aspect ABSA<br/>- Discordance Detection"]
        CV["ComputerVisionIntelligenceService<br/>- SHA/dHash Duplicate Clusters<br/>- 512-dim ResNet k-NN Search<br/>- Quality & Aspect Ratio"]
        PRICE["PricingIntelligenceService<br/>- Category Robust MAD z-scores<br/>- Discount Anomalies<br/>- Currency FX Normalization"]
        GRAPH["GraphIntelligenceService<br/>- Heterogeneous Topology<br/>- Degree Centrality<br/>- Bounded Risk Propagation"]
        MATCH["CrossMarketplaceMatchingService<br/>- Entity Resolution<br/>- Variant Preservation<br/>- Spec Conflict Detection"]
    end

    subgraph HighLevelEngines["Downstream Consumer Services"]
        TRUST["MarketplaceTrustEngine<br/>- Non-Circular Multimodal Fusion<br/>- Calibrated Confidence<br/>- Modality Ablations"]
        REC["RecommendationComparisonService<br/>- Trust-Aware Ranking Utility<br/>- Side-by-Side Comparison"]
        DRIFT["MarketplaceDriftMonitoringService<br/>- KS-Test, PSI, TVD<br/>- Embedding Centroid Drift"]
    end

    API --> TRUST
    API --> REC
    API --> MATCH
    API --> DRIFT

    TRUST --> NLP
    TRUST --> CV
    TRUST --> PRICE
    TRUST --> GRAPH
    
    REC --> TRUST
    REC --> MATCH
```

---

### 2. Non-Circular Fusion Governance
1. **Traceability:** Every penalty is mathematically tied to an observed anomaly (e.g. `RATING_SENTIMENT_DISCORDANCE`, `EXTREME_HIGH_PRICE_OUTLIER_MAD`).
2. **Missing Modality Neutrality:** Products lacking images or reviews receive lower confidence, but their trust penalty is **0.00**. Missingness is never treated as fraud.
3. **No Target Leakage:** Weak supervision heuristic scores are strictly separated from supervised classification targets.
