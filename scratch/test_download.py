import urllib.request
import ssl
import sys

urls = [
    "https://m.media-amazon.com/images/I/3117rKqnXUL.jpg",
    "https://images-na.ssl-images-amazon.com/images/I/41l0RjF1XIL._SS40_.jpg",
    "http://img5a.flixcart.com/image/track-pant/h/b/f/1809lower-sweet-angel-1100x1360-imaeyrfknsfshdzz.jpeg"
]

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Marketplace-Analyzer/2.0"}

for url in urls:
    print(f"Testing {url} ...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            print(f"  SUCCESS! Code: {resp.getcode()}, Bytes: {len(content)}")
    except Exception as e:
        print(f"  FAILED: {e}")
