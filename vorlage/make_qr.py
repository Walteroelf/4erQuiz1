"""Erzeugt den QR-Code für die Antwortkarte der Schüler.

    pip install segno
    python3 make_qr.py

schreibt qr-karte.svg in diesen Ordner. Die Seite antwortkarte-qr.html
bettet ihn ein; daraus entsteht das PDF über Chrome:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
      --headless=new --no-pdf-header-footer \\
      --print-to-pdf=antwortkarte-qr.pdf antwortkarte-qr.html
"""

import os

import segno

URL = "https://walteroelf.github.io/4erQuiz1/?karte"

here = os.path.dirname(os.path.abspath(__file__))

segno.make(URL, error="m").save(
    os.path.join(here, "qr-karte.svg"), scale=10, border=2, dark="#000"
)
print("qr-karte.svg ->", URL)
