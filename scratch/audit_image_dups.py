import pandas as pd
import json

# Check v1.0 entity relationships
edges = pd.read_parquet('data/marketplace_trust_dataset/evidence_relationships/entity_relationships.parquet')
dup_edges = edges[edges['relationship_type'] == 'IMAGE_EXACT_DUPLICATE_OF']
print(f"Total IMAGE_EXACT_DUPLICATE_OF edges: {len(dup_edges)}")

# Check v1.0 cross modal evidence
xmod = pd.read_parquet('data/marketplace_trust_dataset/evidence_relationships/cross_modal_evidence.parquet')
img_reuse = xmod[xmod['investigation_type'] == 'IMAGE_IMAGE_REUSE']
print(f"Total IMAGE_IMAGE_REUSE records in cross_modal_evidence: {len(img_reuse)}")

# Let's inspect images table
imgs = pd.read_parquet('data/marketplace_trust_dataset/evidence/images.parquet')
usable = imgs[imgs['is_usable'] == True]
print(f"Total usable images: {len(usable)}")
print(f"Unique SHA-256 in usable: {usable['content_hash_sha256'].nunique()}")

# Group by SHA-256
sha_counts = usable.groupby('content_hash_sha256').agg(
    img_count=('image_id', 'count'),
    prod_count=('canonical_product_id', 'nunique'),
    pids=('canonical_product_id', lambda x: list(set(x))),
    image_ids=('image_id', list)
).reset_index()

mult_prods = sha_counts[sha_counts['prod_count'] > 1]
print(f"SHA-256 clusters spanning > 1 product: {len(mult_prods)}")
print(f"Total images in these clusters: {mult_prods['img_count'].sum()}")

# Calculate pair combinations
total_pairs = 0
for idx, r in mult_prods.iterrows():
    n = len(r['image_ids'])
    total_pairs += n * (n - 1) // 2
print(f"Total pairwise image-image combinations from these SHA clusters: {total_pairs}")
