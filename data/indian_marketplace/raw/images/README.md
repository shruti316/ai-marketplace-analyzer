# Indian Marketplace Image Assets

This directory contains raw image manifests and links for Indian marketplace products.

## Storage Architecture
- Physical downloaded images are cached in `data/raw/images/cache/` (3,208 validated JPEG/WEBP images, 599.4 MB).
- Full per-image quality metrics, sharpness, luminance, dimensions, and perceptual hashes are recorded in `data/indian_marketplace/processed/indian_images.parquet`.
- Image references map directly to `flipkart_<pid>_<idx>.jpg`.
