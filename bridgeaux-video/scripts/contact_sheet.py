"""Tile preview stills into a labelled 2x2 contact sheet for quick review.
usage: python3 scripts/contact_sheet.py out.png a.png b.png c.png d.png
"""
import sys
from PIL import Image, ImageDraw

out, *paths = sys.argv[1:]
tiles = [Image.open(p).convert("RGB").resize((960, 540)) for p in paths]
cols = 2
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (960 * cols + 10 * (cols - 1), 540 * rows + 10 * (rows - 1)), (40, 40, 40))
for i, (t, p) in enumerate(zip(tiles, paths)):
    x = (i % cols) * 970
    y = (i // cols) * 550
    sheet.paste(t, (x, y))
    d = ImageDraw.Draw(sheet)
    label = p.split("/")[-1].replace(".png", "")
    d.rectangle([x, y, x + 8 * len(label) + 12, y + 22], fill=(0, 0, 0))
    d.text((x + 6, y + 5), label, fill=(255, 255, 0))
sheet.save(out)
