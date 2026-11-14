# closeup_sheet.py: the pose close-up for judging the surface (lumps, fold lines): each pose shot from the real page
# (three.js, felt shader, springs and tail idle off) next to the brother's sheet, side, 3/4 and back, large.
#   SHOT=<path to shot> python -I closeup_sheet.py <base url> <out.png> lie:loaf sleep:sleep stretch:stretch
# (page pose : sheet name). Needs crops/ (make_crops.py). Any Python with Pillow + numpy.
import sys, os, glob, subprocess, tempfile
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
base, out, pairs = sys.argv[1], sys.argv[2], [p.split(":") for p in sys.argv[3:]]
SHOT = os.environ.get("SHOT", "shot")
VIEWS = (("side", -90), ("three-quarter", -38), ("back", 180))     # page yaw that matches each sheet view
H = 460                                             # tile height


def tight(im, dark):
    a = np.asarray(im.convert("RGB")).astype(int)
    m = a.sum(2) < dark                             # the cat is near black; the floor shadow is not
    ys, xs = np.nonzero(m)
    pad = 24
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))


def tile(im, label):
    im = im.convert("RGB")
    im = im.resize((max(1, round(im.width * H / im.height)), H), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 8 + 7 * len(label), 18), fill=(255, 255, 255))
    d.text((4, 3), label, fill=(160, 20, 20))
    return im


rows = []
tmp = tempfile.mkdtemp()
for pose, sheet in pairs:
    row = []
    for view, yaw in VIEWS:
        row.append(tile(tight(Image.open(os.path.join(HERE, "crops", f"{sheet}-{view}.png")), 300), f"sheet {sheet} {view}"))
        d = os.path.join(tmp, f"{pose}{yaw}")
        model = f"&model={os.environ['CU_MODEL']}" if os.environ.get("CU_MODEL") else ""   # (try another GLB from models/)
        subprocess.run([SHOT, f"{base}prototypes/sigil-cat/index.html#pose={pose}&ui=0&springs=0&idle=0&yaw={yaw}{model}",
                        "--out", d, "--width", "720", "--height", "720", "--timeout", "90"], capture_output=True)
        row.append(tile(tight(Image.open(glob.glob(os.path.join(d, "*.png"))[0]), 300), f"ours {pose} {view}"))
    rows.append(row)
W = max(sum(t.width for t in r) for r in rows) + 10 * 4
sheet_im = Image.new("RGB", (W, len(rows) * (H + 10)), (247, 237, 227))
for i, r in enumerate(rows):
    x = 0
    for t in r:
        sheet_im.paste(t, (x, i * (H + 10))); x += t.width + 10
sheet_im.save(out)
print("wrote", out, sheet_im.size)
