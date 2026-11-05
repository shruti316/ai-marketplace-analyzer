"""
scratch/generate_v1_1_reports.py
---------------------------------
Generates all 20 comprehensive certification deliverables for the
frozen Marketplace Trust Evidence Dataset (v1.1 Release).

Writes all reports to reports/certification_v1.1/ and mirrors to reports/.
"""

import os
import json
import hashlib
from pathlib import Path
import pandas as pd

CERT_DIR = Path("reports/certification_v1.1")
REPORTS_DIR = Path("reports")
CERT_DIR.mkdir(parents=True, exist_ok=True)

DATA_DIR = Path("data/marketplace_trust_dataset_v1.1")

# Helper to write to both directories
def save_report(filename: str, content: str):
    p1 = CERT_DIR / filename
    p2 = REPORTS_DIR / filename
    with open(p1, "w", encoding="utf-8") as f:
        f.write(content)
    with open(p2, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Generated: {filename} ({len(content)} chars)")

print("Generating 20 Deliverables for v1.1 Certification...")
