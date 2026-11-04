# Image Integrity and Perceptual Duplicate Audit (v1.2)

## 1. Visual Integrity Verification

- **Total Registered Images:** 5,554 records.
- **Usable Images on Disk:** 5,228 images verified physically on disk.
- **Download Failure Audits:** 326 records preserved to document upstream CDN dropouts.
- **Image Corruption Check:** 100% of usable images open cleanly and have valid non-zero dimensions.
- **Perceptual Hash Clusters:** 64-bit dHash computed for 100% of usable images.

---

## 2. Duplicate Cluster Analysis
- Hero images reused across distinct listings represent common manufacturer stock assets or catalog variant duplication.
- Registered via `IMAGE_EXACT_DUPLICATE_OF` (SHA-256 collisions) and `IMAGE_PERCEPTUAL_DUPLICATE_OF` (dHash distance = 0).
- **Leakage Prevention:** Union-Find grouping guarantees no duplicate cluster spans across Train, Validation, or Test splits.
