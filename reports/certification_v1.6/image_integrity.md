# Dataset v1.6 Image Integrity & Deep Feature Embedding Report

Total Indexed Image Records: **5,554**.
- Usable Physical Images (`is_usable == True`): **5,228**
- Documented Download Failures (`is_usable == False`): **326**
- Physical Existence on Disk: **5,228 / 5,228 (100.0%)**
- PIL Image Decode Verification: **5,228 / 5,228 (100.0%)**

## Deep Visual Embeddings Master Inventory
- Deep Embeddings Table: `derived_evidence/visual_embeddings_metadata.parquet` (5,228 rows)
- Dense Embedding Matrix: `data/processed_v1_6/visual_embeddings_v1_6.npz` (shape: `5228 x 512`, float32)
- Feature Backbone: PyTorch ResNet-18 Global Average Pooling (512 dimensions)
- Mean L2-Norm: 1.0000 (standardized unit sphere)
