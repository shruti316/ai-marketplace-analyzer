import os
from pathlib import Path
import json
import re

patterns = [
    r"\.\./data",
    r"Path\(\s*['\"]\.\./",
    r"Path\.cwd\(\)\.parent",
]

for root, dirs, files in os.walk("."):
    if ".venv" in root or ".git" in root or "__pycache__" in root:
        continue
    for file in files:
        if file.endswith(".py") or file.endswith(".ipynb"):
            p = Path(root) / file
            content = p.read_text(encoding="utf-8", errors="ignore")
            for pat in patterns:
                matches = list(re.finditer(pat, content))
                if matches:
                    print(f"File {p} matched {pat}: {len(matches)} times")
