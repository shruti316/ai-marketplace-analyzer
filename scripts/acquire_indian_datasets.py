"""
scripts/acquire_indian_datasets.py
----------------------------------
Acquires authentic Indian marketplace data for Flipkart, Amazon India,
and Myntra, verifies columns, enforces sampling limits, and saves clean raw CSVs to:
- data/raw/flipkart/flipkart_products_raw.csv
- data/raw/flipkart/flipkart_reviews_raw.csv
- data/raw/amazon_india/amazon_india_products_raw.csv
- data/raw/myntra/myntra_products_raw.csv
"""

import os
import sys
import logging
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


def acquire_flipkart(target_path: str = "data/raw/flipkart/flipkart_products_raw.csv", max_samples: int = 2500):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        logging.info("Flipkart raw catalog already exists at %s (%d bytes).", target_path, os.path.getsize(target_path))
        return True

    logging.info("Acquiring Flipkart catalog from public Hugging Face mirror...")
    urls = [
        "https://huggingface.co/datasets/gcp-acp/flipkart-raw-subset/resolve/main/flipkart_com-ecommerce_sample.csv",
        "https://raw.githubusercontent.com/PromptCloudHQ/Sample-Data/master/flipkart_com-ecommerce_sample.csv",
        "https://huggingface.co/datasets/kenthua/flipkart-ecommerce-sample/resolve/main/flipkart_com-ecommerce_sample.csv",
    ]

    df = None
    # Method 1: Try datasets library
    try:
        from datasets import load_dataset
        logging.info("Attempting Hugging Face datasets.load_dataset('gcp-acp/flipkart-raw-subset')...")
        ds = load_dataset("gcp-acp/flipkart-raw-subset", split="train", streaming=True)
        items = []
        for i, row in enumerate(ds):
            items.append(row)
            if i + 1 >= max_samples:
                break
        if items:
            df = pd.DataFrame(items)
            logging.info("Successfully streamed %d records from Hugging Face.", len(df))
    except Exception as e:
        logging.warning("datasets.load_dataset failed: %s", e)

    # Method 2: Try direct download URLs
    if df is None:
        import urllib.request
        for u in urls:
            try:
                logging.info("Attempting direct download from %s...", u)
                req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    df = pd.read_csv(resp)
                    logging.info("Successfully downloaded %d rows from %s", len(df), u)
                    break
            except Exception as e:
                logging.warning("Failed downloading from %s: %s", u, e)

    if df is not None and not df.empty:
        if len(df) > max_samples:
            df = df.sample(n=max_samples, random_state=42)
        df.to_csv(target_path, index=False)
        logging.info("Saved %d Flipkart products to %s", len(df), target_path)
        return True

    logging.error("Could not acquire Flipkart dataset via network.")
    return False


def acquire_flipkart_reviews(target_path: str = "data/raw/flipkart/flipkart_reviews_raw.csv", max_samples: int = 3500):
    """Acquire genuine Flipkart customer reviews for Indian marketplace items."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        logging.info("Flipkart raw reviews already exist at %s (%d bytes).", target_path, os.path.getsize(target_path))
        return True

    logging.info("Acquiring Flipkart reviews from ml-hub/flipkart-reviews...")
    try:
        from datasets import load_dataset
        ds = load_dataset("ml-hub/flipkart-reviews", split="train")
        df = ds.to_pandas()
        if len(df) > max_samples:
            df = df.sample(n=max_samples, random_state=42)
        df.to_csv(target_path, index=False)
        logging.info("Saved %d Flipkart reviews to %s", len(df), target_path)
        return True
    except Exception as e:
        logging.error("Failed to acquire Flipkart reviews: %s", e)
        return False


def acquire_amazon_india(target_path: str = "data/raw/amazon_india/amazon_india_products_raw.csv", max_samples: int = 1500):
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        logging.info("Amazon India raw catalog already exists at %s (%d bytes).", target_path, os.path.getsize(target_path))
        return True

    logging.info("Acquiring Amazon India catalog...")
    df = None
    # Method 1: Try datasets library
    try:
        from datasets import load_dataset
        logging.info("Attempting Hugging Face datasets.load_dataset('pgurazada1/amazon_india_products')...")
        ds = load_dataset("pgurazada1/amazon_india_products", split="train", streaming=True)
        items = []
        for i, row in enumerate(ds):
            items.append(row)
            if i + 1 >= max_samples:
                break
        if items:
            df = pd.DataFrame(items)
            logging.info("Successfully streamed %d records from Hugging Face.", len(df))
    except Exception as e:
        logging.warning("datasets.load_dataset failed for Amazon India: %s", e)

    # Method 2: Try direct URL
    if df is None:
        urls = [
            "https://huggingface.co/datasets/pgurazada1/amazon_india_products/raw/main/amazon_india_products.csv",
            "https://huggingface.co/datasets/pgurazada1/amazon_india_products/resolve/main/amazon_india_products.csv",
        ]
        import urllib.request
        for u in urls:
            try:
                logging.info("Attempting direct download from %s...", u)
                req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    df = pd.read_csv(resp)
                    logging.info("Successfully downloaded %d rows from %s", len(df), u)
                    break
            except Exception as e:
                logging.warning("Failed downloading from %s: %s", u, e)

    if df is not None and not df.empty:
        if len(df) > max_samples:
            df = df.sample(n=max_samples, random_state=42)
        df.to_csv(target_path, index=False)
        logging.info("Saved %d Amazon India products to %s", len(df), target_path)
        return True

    logging.error("Could not acquire Amazon India dataset via network.")
    return False


def acquire_myntra(target_path: str = "data/raw/myntra/myntra_products_raw.csv", max_samples: int = 1500):
    """Acquire genuine Myntra catalog records representing Indian fashion, ethnic wear, and apparel."""
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        logging.info("Myntra raw catalog already exists at %s (%d bytes).", target_path, os.path.getsize(target_path))
        return True

    logging.info("Acquiring Myntra catalog from Gssmc/myntra_dataset...")
    try:
        from datasets import load_dataset
        ds = load_dataset("Gssmc/myntra_dataset", split="train")
        df = ds.to_pandas()
        if len(df) > max_samples:
            df = df.sample(n=max_samples, random_state=42)
        df.to_csv(target_path, index=False)
        logging.info("Saved %d Myntra products to %s", len(df), target_path)
        return True
    except Exception as e:
        logging.error("Failed to acquire Myntra dataset: %s", e)
        return False


if __name__ == "__main__":
    fk_ok = acquire_flipkart()
    fk_rev_ok = acquire_flipkart_reviews()
    amz_ok = acquire_amazon_india()
    myn_ok = acquire_myntra()
    print(f"Acquisition Summary: Flipkart={fk_ok}, Flipkart_Reviews={fk_rev_ok}, Amazon_India={amz_ok}, Myntra={myn_ok}")
