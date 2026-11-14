"""Make a seamless fibre-detail tile from the brother's pose sheet, so the cat's texture is the sheet's own.

Crops a flat-lit patch of body, removes the lighting (high-pass), normalises it around mid-grey, and makes it
tile with an offset cross-fade. Output: textures/fiber-tile.png (grey, 0.5 = no change) plus a 2x2 preview.
Run with any Python that has numpy + Pillow:  python make_fiber_tile.py
"""
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
SRC = HERE.parents[2] / "docs/reference/poses/loaf-sheet.png"
OUT = HERE.parent / "textures"
BOX = (200, 300, 360, 460)        # 160 px of the loaf hero's head: even light, no edges, ears or whiskers
SIZE = 160

img = Image.open(SRC).convert("L").crop(BOX)
a = np.asarray(img, dtype=np.float32)
low = np.asarray(img.filter(ImageFilter.GaussianBlur(12)), dtype=np.float32)
detail = a - low                                       # lighting gone, fibres kept
detail = (detail - detail.mean()) / (detail.std() + 1e-6)

# Seamless: blend the tile with itself shifted by half, weighted so seams land where the other copy is solid.
shifted = np.roll(np.roll(detail, SIZE // 2, 0), SIZE // 2, 1)
ramp = np.abs(np.linspace(-1, 1, SIZE))                # 1 at the edges, 0 in the middle
w = np.clip(np.maximum.outer(ramp, ramp) * 1.6 - 0.6, 0, 1)
tile = detail * (1 - w) + shifted * w
tile = tile / (tile.std() + 1e-6)

out = np.clip(0.5 + tile * 0.16, 0, 1)               # ~3 std in range
OUT.mkdir(exist_ok=True)
Image.fromarray((out * 255).astype(np.uint8)).save(OUT / "fiber-tile.png")
(HERE / "work").mkdir(exist_ok=True)
Image.fromarray((np.tile(out, (2, 2)) * 255).astype(np.uint8)).save(HERE / "work" / "fiber-preview.png")
print("tile written", out.shape, round(float(out.mean()), 3), round(float(out.std()), 3))
