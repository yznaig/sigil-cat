# visual_hull.py: a pose's shape carved straight from the brother's pose-sheet silhouettes (front, side,
# three-quarter, back), as a cross-check on the AI pose meshes and to trim them to the sheet's outline.
#
# A voxel block in cat units is carved by each view's silhouette (whiskers removed by an opening). The sheet's
# cameras are near-orthographic at a small pitch; each silhouette is fitted to the hull's own projection (its
# bounding box: height sets the scale, bottom and centre the offset), then the hull is re-carved, a few rounds.
# The sheets are slightly perspective, so each silhouette is dilated a little (more for the back view, which the
# brief trusts least).
# Run in the Hunyuan venv (numpy, scipy, scikit-image, trimesh):
#   python visual_hull.py <crops dir> <pose> <height in cat units> <out.ply>
# The PLY is in Blender axes (Z up, cat facing -Y), floor at z = 0.
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
from skimage import measure
import trimesh

crops, pose, H, out = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
PITCH_DEG = 9.0
VIEWS = [("front", 0, 3), ("side", 90, 3), ("three-quarter", 38, 4), ("back", 180, 6)]   # name, yaw, dilate px
VOX = 0.008


def silhouette(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(int)
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
    m = np.abs(a - bg).sum(2) > 150
    m = nd.binary_opening(m, structure=np.ones((19, 19)))       # whiskers off
    lab, n = nd.label(m)
    return lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)


def basis(yaw, pitch):
    y, p = np.radians(yaw), np.radians(pitch)
    d = np.array([np.sin(y) * np.cos(p), -np.cos(y) * np.cos(p), np.sin(p)])    # towards the camera
    look = -d
    right = np.cross(look, [0, 0, 1.0]); right /= np.linalg.norm(right)
    up = np.cross(right, look)
    return right, up


sils = {v: silhouette(os.path.join(crops, f"{pose}-{v}.png")) for v, _, _ in VIEWS}
bbox = {}
for v, m in sils.items():
    ys, xs = np.nonzero(m)
    bbox[v] = (xs.min(), xs.max(), ys.min(), ys.max())

# initial box from the front (width) and side (length), scaled by height
f, s_ = bbox["front"], bbox["side"]
Wd = H * (f[1] - f[0]) / (f[3] - f[2]); L = H * (s_[1] - s_[0]) / (s_[3] - s_[2])
g = np.mgrid[-Wd / 2 - 0.1:Wd / 2 + 0.1:VOX, -L / 2 - 0.15:L / 2 + 0.15:VOX, 0:H * 1.25:VOX]
P = g.reshape(3, -1).T
inside = np.ones(len(P), bool)
inside &= (np.abs(P[:, 0]) <= Wd / 2) & (np.abs(P[:, 1]) <= L / 2) & (P[:, 2] <= H)
for rnd in range(4):
    keep = np.ones(len(P), bool)
    for v, yaw, dil in VIEWS:
        r, u = basis(yaw, PITCH_DEG)
        pu, pv = P @ r, P @ u
        cur_u, cur_v = pu[inside], pv[inside]
        x0, x1, y0, y1 = bbox[v]
        k = (y1 - y0) / (cur_v.max() - cur_v.min())                  # pixels per cat unit
        cu = (cur_u.max() + cur_u.min()) / 2
        px = (x0 + x1) / 2 + (pu - cu) * k
        py = y1 - (pv - cur_v.min()) * k
        m = nd.binary_dilation(sils[v], iterations=dil)
        hh, ww = m.shape
        ok = (px >= 0) & (px < ww) & (py >= 0) & (py < hh)
        hit = np.zeros(len(P), bool)
        hit[ok] = m[py[ok].astype(int), px[ok].astype(int)]
        keep &= hit
    inside = keep
    print(f"round {rnd}: {inside.sum()} voxels", flush=True)

vol = inside.reshape(g.shape[1:])
vol = nd.binary_opening(vol, iterations=1)
lab, n = nd.label(vol); vol = lab == (np.argmax(np.bincount(lab.ravel())[1:]) + 1)
sm = nd.gaussian_filter(vol.astype(float), 1.2)
verts, faces, _, _ = measure.marching_cubes(sm, 0.5, spacing=(VOX, VOX, VOX))
verts += g[:, 0, 0, 0]
mesh = trimesh.Trimesh(verts, faces)
mesh.vertices[:, 2] -= mesh.vertices[:, 2].min()
mesh.vertices[:, 0] -= (mesh.vertices[:, 0].min() + mesh.vertices[:, 0].max()) / 2


mesh.export(out)
print(pose, "hull", np.round(mesh.bounds, 3).tolist(), len(mesh.faces), "faces ->", out)
