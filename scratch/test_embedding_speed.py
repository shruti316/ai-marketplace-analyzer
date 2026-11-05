"""
Benchmark image feature extraction speed on 100 images
"""
import time
from pathlib import Path
import pandas as pd
from PIL import Image
import torch
import torchvision.transforms as T
import torchvision.models as models

v15_imgs = pd.read_parquet("data/marketplace_trust_dataset_v1.5/evidence/images.parquet")
usable = v15_imgs[v15_imgs["is_usable"] == True]
sample_paths = usable["local_image_path"].head(100).tolist()

model = models.resnet18(weights=None)
model.eval()
modules = list(model.children())[:-1]
feature_extractor = torch.nn.Sequential(*modules)

transform = T.Compose([
    T.Resize((128, 128)),
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

t0 = time.time()
with torch.no_grad():
    for p in sample_paths:
        with Image.open(p) as img:
            t_img = transform(img.convert("RGB")).unsqueeze(0)
            feat = feature_extractor(t_img).squeeze().numpy()

elapsed = time.time() - t0
print(f"Processed 100 images in {elapsed:.2f} seconds ({elapsed/100:.4f}s per image).")
