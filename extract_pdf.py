import sys
import subprocess

try:
    import fitz
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf"])
    import fitz

doc = fitz.open("PolicylensAI.pdf")
text = ""
for page in doc:
    text += page.get_text()

with open("pdf_content.txt", "w", encoding="utf-8") as f:
    f.write(text)

print(f"Extracted {len(text)} characters.")
