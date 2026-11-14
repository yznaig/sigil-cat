# make_crops.py: square, centred 768 px crops of the brother's pose views, for pose_gen.py.
# Run (any Python with Pillow + numpy, e.g. the Hunyuan venv): python make_crops.py <poses dir> <crops dir>
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
for pose in ("loaf", "sleep", "stretch"):
    for v in ("front", "side", "back", "three-quarter"):
        im = Image.open(os.path.join(src, f"{pose}-{v}.png")).convert("RGB")
        a = np.asarray(im).astype(int)
        bg = np.median(np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3)]), 0).astype(int)
        # keep only the cat: the dark body and its anti-aliased rim (sheet divider lines and the soft floor
        # shadow are faint and get painted out, so neither Hunyuan nor the silhouette score sees them)
        diff = np.abs(a - bg).sum(2)
        cat = diff >= 150
        lab, n = nd.label(cat)                            # drop specks and divider-line remnants
        area = np.bincount(lab.ravel()); area[0] = 0
        cat = np.isin(lab, np.nonzero(area > 0.004 * area.max())[0])
        cat = nd.binary_dilation(cat, iterations=2)       # keep the anti-aliased rim
        a = np.where(cat[..., None], a, bg).astype(np.uint8)
        im = Image.fromarray(a)
        ys, xs = np.nonzero(cat)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        S = int(max(x1 - x0, y1 - y0) * 1.15)          # 15% margin, cat centred on its bounding box
        sq = Image.new("RGB", (S, S), tuple(bg))
        sq.paste(im.crop((x0, y0, x1 + 1, y1 + 1)), (S // 2 - (x1 - x0) // 2, S // 2 - (y1 - y0) // 2))
        sq.resize((768, 768), Image.LANCZOS).save(os.path.join(out, f"{pose}-{v}.png"))
