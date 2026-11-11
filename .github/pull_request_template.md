## Description

Briefly describe the proposed changes, architectural motivation, and affected components.

## Related Issues

Closes #(issue)

## Invariant Adherence Checklist

- [ ] **Zero-Penalty Invariant:** Verified that unobserved/missing modalities do not inflate anomaly probabilities or risk tiers.
- [ ] **Frozen Model Preservation:** Verified that `models/advanced_multimodal_gated_model.joblib` and `models/v1_1/advanced_multimodal_gated_model_v1_1.joblib` have NOT been modified or overwritten.
- [ ] **No Secrets / Local Paths:** Verified that no credentials, tokens, or absolute Windows paths (`C:\Users\...`) are committed.
- [ ] **Test Suite Verification:** All automated tests (`python -m pytest tests/ -q`) pass cleanly.
- [ ] **Documentation:** Relevant model cards, technical docs, and `CHANGELOG.md` updated.

## Verification Evidence

Provide terminal output or test execution logs showing successful validation:
```text
(paste test output here)
```
