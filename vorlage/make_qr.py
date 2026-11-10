"""Erzeugt die QR-Codes für die Antwortkarte der Schüler.

    pip install segno
    python3 make_qr.py

schreibt qr-karte-antippen.svg und qr-karte-wischen.svg in diesen
Ordner. Die Seite antwortkarte-qr.html bettet beide ein; daraus
entsteht das PDF über Chrome:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
      --headless=new --no-pdf-header-footer \\
      --print-to-pdf=antwortkarte-qr.pdf antwortkarte-qr.html
"""

import os

import segno

BASE = "https://walteroelf.github.io/4erQuiz1/"

CODES = {
    "qr-karte-antippen.svg": BASE + "?karte",
    "qr-karte-wischen.svg": BASE + "?karte=wischen",
}

here = os.path.dirname(os.path.abspath(__file__))

for name, url in CODES.items():
    segno.make(url, error="m").save(
        os.path.join(here, name), scale=10, border=2, dark="#000"
    )
    print(name, "->", url)
