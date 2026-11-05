import pandas as pd

df = pd.read_parquet('data/processed/canonical_images.parquet')
print('=== SHAPE ===')
print(df.shape)
print('\n=== DOWNLOAD STATUS BY MARKETPLACE ===')
print(pd.crosstab(df['marketplace'], df['download_status']))

print('\n=== IMAGE TYPES ===')
print(pd.crosstab(df['marketplace'], df['image_type']))

print('\n=== SAMPLE URLS ===')
for mkt in df['marketplace'].unique():
    sample = df[df['marketplace'] == mkt]['image_url'].dropna().head(3).tolist()
    print(f'-- {mkt} --')
    for u in sample:
        print(' ', u)

print('\n=== NULL URLS ===')
print(df['image_url'].isna().sum())

print('\n=== UNIQUE URLS ===')
print('Total rows:', len(df))
print('Unique URLs:', df['image_url'].nunique())
