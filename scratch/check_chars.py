import pandas as pd
import re

df = pd.read_parquet('data/processed/canonical_images.parquet')
invalid_chars = set()
for img_id in df['image_id']:
    invalid = re.findall(r'[<>:"/\\|?*]', str(img_id))
    if invalid:
        invalid_chars.update(invalid)
print('Invalid chars in image_id:', invalid_chars)
