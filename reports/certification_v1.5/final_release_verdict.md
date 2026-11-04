# Marketplace Trust Intelligence Dataset v1.5 — Final Release Verdict

## Official Verdict
**`CERTIFIED_WITH_LIMITATIONS`**

## Technical Justification
The v1.5 release successfully completes comprehensive independent verification, eliminates narrative disconnects, reconciles review and image provenance, establishes six discrete evaluation protocols, and eliminates target circularity in baseline models.

The qualification `WITH_LIMITATIONS` is maintained with complete scientific honesty:
1. **Unlinked Quarantined Reviews (240 reviews):** 240 Flipkart customer reviews lack verified product line linkage and are preserved as unlinked to prevent false relationship artifacts.
2. **Missing Local Images for Review Products:** 127 Flipkart review products lack local image downloads. An external acquisition adapter has been prepared, awaiting user authorization.
3. **Aggregate Merchant Granularity:** Listing scrapes do not expose backend tax identifiers (GSTIN/CIN); products link to 6 aggregate platform entities.
4. **Single-Snapshot Temporal Span:** The crawl represents a point-in-time cross-sectional snapshot; longitudinal temporal splitting is formally specified in Protocol 6 for future multi-snapshot crawls.

All release invariants, hashes, and schemas are 100% verified.
