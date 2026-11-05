import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pandas as pd
from src.evaluation.split_protocols_v1_5 import EvaluationSplitEngineV15

prods = pd.read_parquet('data/processed_v1_5/canonical_products_v1_5.parquet')
revs = pd.read_parquet('data/processed_v1_5/canonical_reviews_v1_5.parquet')
imgs = pd.read_parquet('data/processed_v1_5/canonical_images_v1_5.parquet')
vars_df = pd.read_parquet('data/marketplace_trust_dataset_v1.4/entities/product_variants.parquet')

engine = EvaluationSplitEngineV15(prods, vars_df, revs, imgs)

protocols = [
    ('1 (Product)', engine.build_protocol_1_product_held_out),
    ('2 (Variant)', engine.build_protocol_2_variant_family_held_out),
    ('3 (Reviewer)', engine.build_protocol_3_reviewer_held_out),
    ('4 (Image Cluster)', engine.build_protocol_4_image_cluster_held_out),
    ('5 (Cross-Listing)', engine.build_protocol_5_cross_listing_held_out),
]

for p_num, p_method in protocols:
    res = p_method()
    m = res['metrics']
    print(f"Protocol {p_num}: Train={m['train_count']}, Val={m['val_count']}, Test={m['test_count']}, Overlaps=(Tr-Va:{m['product_overlap_train_val']}, Tr-Te:{m['product_overlap_train_test']}, Va-Te:{m['product_overlap_val_test']})")

p6 = engine.build_protocol_6_temporal()
print("Protocol 6 status:", p6['feasibility_status'])
