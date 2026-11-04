# Dataset v1.6 Known Limitations & Operational Boundaries

1. **Flipkart Review Products Awaiting Image Crawl:** The 127 Flipkart review-bearing products currently lack local images; external network acquisition adapter is prepared awaiting explicit user authorization.
2. **Granular Merchant Tax Identifiers:** Individual merchant GSTIN/CIN numbers are unobserved in upstream catalog crawls; platform entities are modeled with honest null handling.
3. **Temporal Multi-Snapshot Pending:** The dataset provides a single-point-in-time baseline snapshot tagged `READY_FOR_DATA_COLLECTION`; longitudinal observations require scheduled recurring batch crawls.
4. **Academic Ground Truth Boundaries:** Real marketplace listings lack confirmed fraud verdicts; weak supervision heuristic labels are explicitly distinguished from verified ground truth.
