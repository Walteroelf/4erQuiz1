"""Erzeugt die Quiz-Vorlagen als SVG.

    python3 make_vorlage.py

schreibt in diesen Ordner:

- quiz-vorlage.svg     eine Karte (2000 x 1563), Marken 0 bis 3
- quiz-vorlage-a5.svg  A4 hochkant mit zwei Karten im A5-Format,
                       oben Marken 0 bis 3, unten Marken 4 bis 7

Die Maße der Karte müssen zu LAYOUTS.aruco in index.html passen.

Die PDFs entstehen aus den SVGs über Chrome:

    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\
      --headless=new --no-pdf-header-footer \\
      --print-to-pdf=quiz-vorlage-a5.pdf druck-a5.html

(druck-a5.html bettet die SVG mit @page A4 und Rand 0 ein.)
"""

import os

# ArUco DICT_4X4_50, Muster aus opencv.js generateImageMarker;
# "#" = schwarz.
MARKERS = {
    0: ["######", "#.#..#", "##.#.#", "###..#", "###.##", "######"],
    1: ["######", "######", "#....#", "#.##.#", "#.#.##", "######"],
    2: ["######", "###..#", "###..#", "###.##", "#..#.#", "######"],
    3: ["######", "#.##.#", "#.##.#", "##.###", "##..##", "######"],
    4: ["######", "##.#.#", "##.###", "#.##.#", "#...##", "######"],
    5: ["######", "##...#", "#.##.#", "#..###", "#..#.#", "######"],
    6: ["######", "#.##.#", "#...##", "###.##", "#...##", "######"],
    7: ["######", "#..###", "##.###", "#....#", "###.##", "######"],
}

W, H = 2000, 1563
S = 120          # Markengröße
M = S // 6       # Modulgröße
LINE = 14        # Rahmenstärke

# Kartenecke -> linke obere Ecke der Marke
# (0 oben links, 1 oben rechts, 2 unten rechts, 3 unten links)
CORNER_POS = {
    0: (120, 120),
    1: (1760, 120),
    2: (1760, 1323),
    3: (120, 1323),
}

FONT = "Arial, Helvetica, sans-serif"


def marker(id_, x, y):
    out = [f'<rect x="{x}" y="{y}" width="{S}" height="{S}" fill="#000"/>']
    for r, row in enumerate(MARKERS[id_]):
        for c, ch in enumerate(row):
            if ch == ".":
                out.append(
                    f'<rect x="{x + c * M}" y="{y + r * M}" '
                    f'width="{M}" height="{M}" fill="#fff"/>'
                )
    return "\n  ".join(out)


def box(x0, y0, x1, y1):
    h = LINE / 2
    return (
        f'<rect x="{x0 + h}" y="{y0 + h}" width="{x1 - x0 - LINE}" '
        f'height="{y1 - y0 - LINE}" fill="none" stroke="#000" '
        f'stroke-width="{LINE}"/>'
    )


def text(x, y, s, size, anchor="start", fill="#000"):
    return (
        f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" '
        f'fill="{fill}">{s}</text>'
    )


def card_parts(card_set):
    """Bestandteile einer Karte; card_set 0 -> Marken 0-3, 1 -> 4-7."""
    return [
        f'<rect width="{W}" height="{H}" fill="#fff"/>',
        *(marker(card_set * 4 + c, *CORNER_POS[c]) for c in range(4)),
        text(1000, 215, "Quiz-Vorlage", 110, "middle"),
        box(120, 280, 1880, 560),
        text(160, 360, "Frage:", 52),
        text(125, 625, "Richtige Antwort:", 50),
        text(1025, 625, "Falsche Antwort:", 50),
        box(120, 645, 980, 915),
        box(1020, 645, 1880, 915),
        text(125, 975, "Falsche Antwort:", 50),
        text(1025, 975, "Falsche Antwort:", 50),
        box(120, 995, 980, 1265),
        box(1020, 995, 1880, 1265),
        text(1000, 1400,
             "Mit dunklem Stift schreiben · Ecken nicht verdecken",
             34, "middle", "#555"),
    ]


def card_svg(card_set=0):
    parts = card_parts(card_set)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{FONT}">
  {chr(10).join("  " + p for p in parts).strip()}
</svg>
'''


def a5_sheet_svg():
    """A4 hochkant (Einheit 0,1 mm), zwei A5-Karten mit Schnittlinie.

    Jede Karte wird auf die A5-Höhe (148,5 mm) verkleinert und
    waagerecht mittig gesetzt. Ihr eigener weißer Rand hält die
    Marken vom Papier- und Schnittrand fern.
    """
    page_w, page_h = 2100, 2970
    slot_h = page_h / 2
    scale = slot_h / H
    offset_x = (page_w - W * scale) / 2

    groups = []
    for card_set in range(2):
        inner = "\n    ".join(card_parts(card_set))
        groups.append(
            f'<g transform="translate({offset_x:.1f} {card_set * slot_h:.1f}) '
            f'scale({scale:.5f})">\n    {inner}\n  </g>'
        )

    cut = (
        f'<line x1="0" y1="{slot_h}" x2="{page_w}" y2="{slot_h}" '
        'stroke="#999" stroke-width="3" stroke-dasharray="25 20"/>'
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {page_w} {page_h}" width="210mm" height="297mm" font-family="{FONT}">
  <rect width="{page_w}" height="{page_h}" fill="#fff"/>
  {groups[0]}
  {groups[1]}
  {cut}
</svg>
'''


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))

    with open(os.path.join(here, "quiz-vorlage.svg"), "w",
              encoding="utf-8") as f:
        f.write(card_svg(0))

    with open(os.path.join(here, "quiz-vorlage-a5.svg"), "w",
              encoding="utf-8") as f:
        f.write(a5_sheet_svg())
