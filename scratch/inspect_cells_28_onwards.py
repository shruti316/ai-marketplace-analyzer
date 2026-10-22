import json
from pathlib import Path
import traceback

with open("notebooks/04_nlp_analysis.ipynb", "r", encoding="utf-8") as f:
    nb = json.load(f)

# Let's inspect Code Cell 18 (Notebook Cell 28)
c18 = nb["cells"][28]
print("Cell 28 (Code 18) source:")
print("".join(c18["source"]))

# Let's inspect Code Cell 19 (Notebook Cell 29)
c19 = nb["cells"][29]
print("Cell 29 (Code 19) source:")
print("".join(c19["source"]))

# Let's inspect Code Cell 27 (Notebook Cell 39)
c27 = nb["cells"][39]
print("Cell 39 (Code 27) source:")
print("".join(c27["source"]))

# Let's inspect Code Cell 29 (Notebook Cell 41)
c29 = nb["cells"][41]
print("Cell 41 (Code 29) source:")
print("".join(c29["source"]))
