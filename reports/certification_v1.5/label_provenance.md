# Dataset v1.5 Label Provenance Architecture

Three-tier label stratification is strictly enforced:
1. **Level 1 (Gold Standard Ground Truth):**
   - Ott Deceptive Opinion Spam (1,600 reviews; lab truth).
   - Synthetic Stress Test Cases (5 adversarial edge cases).
2. **Level 2 (Silver Standard Heuristics):**
   - E-Commerce Fake Reviews Benchmark (40,526 manipulated reviews).
   - Rating-sentiment discordance heuristics.
3. **Level 3 (Bronze Standard Unsupervised Signals):**
   - Cross-modal evidence anomalies (1,889 records).
   - Isolation Forest price anomalies (258 records).
   - Perceptual dHash duplicate clusters (60 clusters).
