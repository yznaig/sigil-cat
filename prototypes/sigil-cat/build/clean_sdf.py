"""clean_sdf.py: stage 1 of the Sigil Cat build. Turns the raw AI mesh into one smooth, whisker-free body with a tail.

Runs in the Hunyuan3D venv (it has trimesh, scipy, scikit-image), not in Blender:
  ~/ai/hy3d-venv/bin/python -I clean_sdf.py <raw.glb> <outdir>
Writes <outdir>/body_sdf.ply (dense marching-cubes surface) and <outdir>/whiskers.json (6 centerlines).

Method: mark surface voxels from the dense vertices, flood-fill the inside, build a signed distance field,
then a morphological opening (erode, dilate by R_OPEN) erases thin parts (the fused whiskers) and keeps the
thick ears and paws. What the opening removed, near the cheeks, is clustered into whiskers and reduced to
centerlines. A tail (capsule chain) is smooth-unioned onto the rump. Units are the raw mesh's glTF units
(Y up, cat faces +Z, about 2 tall); Blender's importer turns that into Z up, facing -Y.
"""
import sys, json, os, time
import numpy as np
import trimesh
from scipy import ndimage as ndi
from skimage import measure

T0 = time.time()
def log(*a):
    print(f"[sdf {time.time()-T0:6.1f}s]", *a, flush=True)

SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

PITCH = 0.007
R_OPEN = 0.05         # erases parts thinner than ~2*R_OPEN (whiskers are ~0.06 thick once voxelized)
SMOOTH_SIGMA = 2.2    # voxels, gaussian on the signed field (removes voxel ripples)

# Tail, in glTF coords (x right, y up, z toward the viewer, so the back is -z).
# Rest pose: straight out of the low rump, rising gently, so bone heat binds it cleanly.
# Poses bend it into the sheet's curves.
TAIL = [(0.0, -0.80, -0.42), (0.0, -0.80, -0.78), (0.0, -0.74, -1.12), (0.0, -0.64, -1.44), (0.0, -0.50, -1.72)]
TAIL_R = [0.135, 0.13, 0.122, 0.116, 0.11]   # thick and soft, like the sheet's stretch pose
TAIL_BLEND = 0.08     # smooth-union radius where the tail meets the rump
R_OPEN_ZONE = 0.12    # stronger opening inside the clean-up zones (whisker roots)
ZONE_SIGMA = 6.0      # voxels, heavy smoothing inside the clean-up zones

m = trimesh.load(SRC).to_geometry()
V = m.vertices.astype(np.float64)
log("raw", V.shape[0], "verts", m.faces.shape[0], "faces")

lo = np.minimum(V.min(0), np.array(TAIL).min(0) - 0.15) - 0.05
hi = np.maximum(V.max(0), np.array(TAIL).max(0) + 0.15) + 0.05
shape = np.ceil((hi - lo) / PITCH).astype(int) + 1
log("grid", shape, int(np.prod(shape)) / 1e6, "M voxels")

# surface voxels from vertices plus face centroids (edges are ~0.004, under the pitch)
pts = np.concatenate([V, m.triangles_center])
ijk = np.round((pts - lo) / PITCH).astype(int)
surf = np.zeros(shape, bool)
surf[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
surf = ndi.binary_dilation(surf, iterations=1)
inside = ndi.binary_fill_holes(surf)
# keep the biggest solid only (drops floaters)
lab, n = ndi.label(inside)
sizes = ndi.sum(inside, lab, range(1, n + 1))
inside = lab == (1 + int(np.argmax(sizes)))
log("filled; components were", n)

def sdf_of(mask):
    dout = ndi.distance_transform_edt(~mask)
    din = ndi.distance_transform_edt(mask)
    return (dout - din) * PITCH   # >0 outside

# the dilation above grew the shell by about one voxel; give it back
sdf0 = sdf_of(inside) + PITCH * 0.5
log("sdf done")

# opening: erode by R, then dilate by R
eroded = sdf0 < -R_OPEN
opened_sdf = ndi.distance_transform_edt(~eroded) * PITCH - R_OPEN
log("opening done")
removed = (sdf0 < 0) & (opened_sdf > 0.012)

# ---- whiskers: removed bits that sit out to the side, at cheek height
gx = lo[0] + np.arange(shape[0]) * PITCH
gy = lo[1] + np.arange(shape[1]) * PITCH
gz = lo[2] + np.arange(shape[2]) * PITCH
lab, n = ndi.label(removed)
whiskers = []
for k in range(1, n + 1):
    idx = np.argwhere(lab == k)
    if len(idx) < 60:
        continue
    P = np.stack([gx[idx[:, 0]], gy[idx[:, 1]], gz[idx[:, 2]]], 1)
    span = P.max(0) - P.min(0)
    log("removed part", len(idx), "center", P.mean(0).round(3), "span", span.round(3))
    if span[0] < 0.12:          # whiskers run sideways
        continue
    # centerline: bin along |x|, average the rest
    side = np.sign(P[:, 0].mean())
    ax = np.abs(P[:, 0])
    edges = np.linspace(ax.min(), ax.max(), 12)
    line = []
    for a, b in zip(edges[:-1], edges[1:]):
        sel = (ax >= a) & (ax <= b)
        if sel.sum() > 3:
            line.append(P[sel].mean(0).tolist())
    line = [[p[0], -p[2], p[1]] for p in line]   # Blender axes, like the mesh
    whiskers.append(dict(side=int(side), voxels=int(len(idx)), y=float(P[:, 1].mean()), line=line))
    log("whisker", int(side), len(idx), "voxels, y", round(float(P[:, 1].mean()), 3), "x span", round(float(span[0]), 3))
whiskers.sort(key=lambda w: (w["side"], -w["y"]))
json.dump(dict(units="blender, z up, cat faces -y", whiskers=whiskers), open(os.path.join(OUT, "whiskers.json"), "w"), indent=1)

# ---- clean-up zones: the whisker roots leave stubs on the cheeks, and the face has a small nose bump.
# Inside soft spheres there, use a stronger opening plus heavy smoothing.
eroded2 = sdf0 < -R_OPEN_ZONE
opened2 = ndi.distance_transform_edt(~eroded2) * PITCH - R_OPEN_ZONE
opened2 = ndi.gaussian_filter(opened2, ZONE_SIGMA)
zones = []   # (center in glTF coords, radius)
for w in whiskers:
    p = w["line"][0]                       # innermost point, Blender axes
    zones.append(((p[0], p[2], -p[1]), 0.13))
# face center: frontmost surface point on the middle line, at mid-head height
col = np.argwhere(opened_sdf[np.argmin(np.abs(gx)), :, :] < 0)
mid = col[(gy[col[:, 0]] > -0.05) & (gy[col[:, 0]] < 0.35)]
fy, fz = gy[mid[np.argmax(mid[:, 1]), 0]], gz[mid[:, 1].max()]
log("face front", round(float(fy), 3), round(float(fz), 3))
zones.append(((0.0, 0.13, fz - 0.05), 0.24))
bz = gz[mid[:, 1].min()]                  # the back of the head has the same bump
zones.append(((0.0, 0.13, bz + 0.05), 0.24))
mask = np.zeros(shape, np.float32)
for c, r in zones:
    sl = [slice(max(0, int((c[i] - r - lo[i]) / PITCH)), int((c[i] + r - lo[i]) / PITCH) + 1) for i in range(3)]
    xs, ys, zs = np.meshgrid(gx[sl[0]], gy[sl[1]], gz[sl[2]], indexing="ij")
    d = np.sqrt((xs - c[0]) ** 2 + (ys - c[1]) ** 2 + (zs - c[2]) ** 2) / r
    m = np.clip(1.5 - 1.5 * d, 0, 1)          # full strength in the inner third, fades out at the edge
    m = m * m * (3 - 2 * m)
    mask[sl[0], sl[1], sl[2]] = np.maximum(mask[sl[0], sl[1], sl[2]], m)
opened_sdf = opened_sdf * (1 - mask) + np.maximum(opened_sdf, opened2) * mask
del opened2, eroded2
log("zones cleaned", len(zones))

# ---- tail: capsule chain with tapered radius, smooth-unioned onto the body
X, Y, Z = np.meshgrid(gx, gy, gz, indexing="ij")
tail = np.full(shape, 1e9)
for (a, b, ra, rb) in zip(TAIL[:-1], TAIL[1:], TAIL_R[:-1], TAIL_R[1:]):
    a, b = np.array(a), np.array(b)
    ab = b - a
    t = ((X - a[0]) * ab[0] + (Y - a[1]) * ab[1] + (Z - a[2]) * ab[2]) / ab.dot(ab)
    t = np.clip(t, 0, 1)
    d = np.sqrt((X - a[0] - t * ab[0]) ** 2 + (Y - a[1] - t * ab[1]) ** 2 + (Z - a[2] - t * ab[2]) ** 2) - (ra + (rb - ra) * t)
    tail = np.minimum(tail, d)
del X, Y, Z
k = TAIL_BLEND
h = np.clip(0.5 + 0.5 * (tail - opened_sdf) / k, 0, 1)
body = tail * (1 - h) + opened_sdf * h - k * h * (1 - h)
log("tail merged")

body = ndi.gaussian_filter(body, SMOOTH_SIGMA)
verts, faces, _, _ = measure.marching_cubes(body, 0.0, spacing=(PITCH, PITCH, PITCH))
verts += lo
mesh = trimesh.Trimesh(verts, faces[:, ::-1], process=True)
if mesh.volume < 0:
    mesh.invert()
parts = mesh.split(only_watertight=False)
mesh = max(parts, key=lambda p: len(p.faces))
log("surface", len(mesh.vertices), "verts", len(mesh.faces), "faces, watertight", mesh.is_watertight, "parts", len(parts))
# write in Blender axes (Z up, cat faces -Y): (x, y, z)_gltf -> (x, -z, y)
mesh.vertices = np.stack([mesh.vertices[:, 0], -mesh.vertices[:, 2], mesh.vertices[:, 1]], 1)
mesh.export(os.path.join(OUT, "body_sdf.ply"))
log("wrote", OUT)
