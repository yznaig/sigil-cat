# sdf_morph.py: moves the posed cat's body onto a pose target by morphing signed distance fields (Hunyuan venv:
# numpy, scipy, trimesh). Called by anim_cat.py's fit_target (it writes <in>.npz, reads <out>.npz).
#
# Why fields: the sheet poses need big volume changes (a dome behind the head, a long reaching leg). Moving
# vertices straight onto the target (nearest point, rays) folds and streaks the skin. A signed distance field's
# zero surface never passes through itself, so the body follows a family of shapes from the posed body P to the
# goal G, each vertex pulled back onto the current surface along the field's gradient (with tangential relaxation
# so the triangles stay even):
#     shape(r) = [(P grown by r) and G]  or  [P and (G grown by R - r)],   r = 0 -> R
# It grows out of the body's own surface, only into the goal, and recedes where the body sticks out of the goal.
# (A plain blend (1 - t) S_P + t S_G nucleates thick goal parts as separate bubbles that no vertex can reach.)
# S_goal is the AI pose mesh smooth-unioned with the cat's own head, ears and tail where the skeleton put them,
# so the body flows up to them and never into them.
#
# in.npz: verts (posed), tris, edges, k (0..1 freedom per vertex), keep (0..1: head/ears/tail), tverts, tfaces
# out.npz: verts
import sys, time
import numpy as np
import trimesh
from scipy import ndimage as ndi

T0 = time.time()
def log(*a):
    print(f"[morph {time.time() - T0:6.1f}s]", *a, flush=True)

src, dst = sys.argv[1], sys.argv[2]
D = np.load(src)
X0, tris, ed, k, keep = D["verts"], D["tris"], D["edges"], D["k"], D["keep"]
TV, TF = D["tverts"], D["tfaces"]
PITCH = float(D["pitch"]) if "pitch" in D else 0.008
STEPS = int(D["steps"]) if "steps" in D else 48
BLEND = 0.07            # smooth-union radius where the target meets the cat's own head and tail (a soft neck)

lo = np.minimum(X0.min(0), TV.min(0)) - 0.12
hi = np.maximum(X0.max(0), TV.max(0)) + 0.12
shape = np.ceil((hi - lo) / PITCH).astype(int) + 1
log("grid", shape.tolist(), f"{np.prod(shape) / 1e6:.1f} M voxels")


def solid(verts, faces, n=600000):
    m = trimesh.Trimesh(verts, faces, process=False)
    pts, _ = trimesh.sample.sample_surface(m, n, seed=0)
    pts = np.concatenate([pts, verts])
    ijk = np.round((pts - lo) / PITCH).astype(int)
    surf = np.zeros(shape, bool)
    surf[ijk[:, 0], ijk[:, 1], ijk[:, 2]] = True
    surf = ndi.binary_dilation(surf, iterations=1)
    inside = ndi.binary_fill_holes(surf)
    lab, nl = ndi.label(inside)
    sizes = ndi.sum(inside, lab, range(1, nl + 1))
    return lab == (1 + int(np.argmax(sizes)))


def sdf(mask):
    return (ndi.distance_transform_edt(~mask) - ndi.distance_transform_edt(mask)) * PITCH + PITCH * 0.5


def smin(a, b, r):
    h = np.clip(0.5 + 0.5 * (b - a) / r, 0, 1)
    return b * (1 - h) + a * h - r * h * (1 - h)


S0 = ndi.gaussian_filter(sdf(solid(X0, tris)), 1.0)
ST_HEAD = None
if "blockout" in D:     # a primitive blockout (blockout.py): its exact field, no voxel steps to smooth away
    import json, os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import blockout
    gp = lo + np.indices(shape).reshape(3, -1).T * PITCH
    spec = json.loads(str(D["blockout"]))
    heads = [p for p in spec["prims"] if p.get("name") == "head"]
    body = dict(spec, prims=[p for p in spec["prims"] if p.get("name") != "head"])
    ST = blockout.field(body, gp).reshape(shape)                    # the body alone
    # the head stays rigid wherever it is outside the body; the part of it inside the body (its hidden back, behind the
    # dome) joins the body's surface, so the visible head stays a round ball meeting the dome along one seam
    inside = np.clip(-blockout.field(body, X0) / 0.10, 0, 1)
    head_in = inside * np.clip(keep - D["keep_tail"], 0, 1) * (1 - np.clip(D["w_ear"] * 4, 0, 1)) if "w_ear" in D else 0 * k
    k = np.maximum(k, head_in)
    if heads:
        ST_HEAD = blockout.field(dict(prims=heads), gp).reshape(shape)   # the head's ellipsoid
    del gp
else:
    ST = ndi.gaussian_filter(sdf(solid(TV, TF)), 1.0)
# the cat's own head/ears/tail as a solid of their own: the posed body's inside voxels whose nearest vertex is one
# of those parts (a cut through the posed field instead would paste a patch of the old body into the goal)
from scipy.spatial import cKDTree
inside0 = S0 < 0
ii = np.argwhere(inside0)
_, nn = cKDTree(X0).query(lo + ii * PITCH)
keep_tail = D["keep_tail"] if "keep_tail" in D else np.zeros(len(X0))
def part_field(w):
    m = np.zeros(shape, bool)
    m[tuple(ii[w[nn] > 0.5].T)] = True
    m = ndi.binary_opening(m, iterations=1)
    return ndi.gaussian_filter(sdf(m), 1.0) if m.any() else np.full(shape, 1.0)
SK = part_field(np.clip(keep - keep_tail, 0, 1))         # head and ears: the body blends up to them
S_tail = part_field(keep_tail)                           # the tail: the body keeps TAIL_GAP clear of it
TAIL_GAP = 0.015
ST = -smin(-ST, -(TAIL_GAP - S_tail), 0.01)              # carve a channel for the tail out of the target
if "thead_c" in D:      # cut the target's own head out (an ellipsoid and two ear balls, grown by 5 cm)
    gp = lo + np.indices(shape).reshape(3, -1).T * PITCH
    Minv = np.linalg.inv(D["thead_M"])
    q = (gp - D["thead_c"]) @ Minv.T
    rmin = float(np.min(np.linalg.norm(D["thead_M"], axis=0)))
    S_th = (np.linalg.norm(q, axis=1) - 1) * rmin
    for e in D["thead_ears"]:
        S_th = np.minimum(S_th, np.linalg.norm(gp - e, axis=1) - float(D["thead_ear_r"]))
    S_th = S_th.reshape(shape)
    ST = -smin(-ST, -(0.05 - S_th), 0.02)
    del gp, q
HEAD_CARVE = float(D["head_carve"]) if "head_carve" in D else 0.0   # >0: the target's own head goes (ours replaces it)
if HEAD_CARVE > 0 and np.any(SK < 0):
    ST = -smin(-ST, -(HEAD_CARVE - SK), 0.02)
if ST_HEAD is not None:
    # (blockouts) the cat's own head and its ellipsoid nearly coincide, and a wide smooth union of two near-equal fields
    # bulges by blend / 4 (it was a lip round the lower face), so those two meet with a tiny blend; the body meets the
    # resulting head with a real fillet (a tiny one there was a hard crease from the ear down the flank)
    SG = smin(ST, smin(ST_HEAD, SK, 0.012), float(D["head_fillet"]) if "head_fillet" in D else BLEND)
else:
    SG = smin(ST, SK, BLEND)
log("fields ready")
import os as _os
if _os.environ.get("MORPH_GOAL_PLY"):        # debug: the goal surface itself, to tell its creases from the morph's
    from skimage import measure
    gv, gf, _, _ = measure.marching_cubes(SG, 0.0, spacing=(PITCH,) * 3)
    gv = gv + lo
    with open(_os.environ["MORPH_GOAL_PLY"], "wb") as fh:
        fh.write((f"ply\nformat binary_little_endian 1.0\nelement vertex {len(gv)}\nproperty float x\nproperty float y\n"
                  f"property float z\nelement face {len(gf)}\nproperty list uchar int vertex_indices\nend_header\n").encode())
        fh.write(np.asarray(gv, "<f4").tobytes())
        rec = np.zeros(len(gf), dtype=[("n", "u1"), ("i", "<i4", 3)]); rec["n"] = 3; rec["i"] = gf[:, ::-1]
        fh.write(rec.tobytes())
GG = np.stack(np.gradient(SG, PITCH))


def sample(F, x):
    c = ((x - lo) / PITCH).T
    return ndi.map_coordinates(F, c, order=1, mode="nearest")


def vertex_normals(x):
    fn = np.cross(x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]])
    vn = np.zeros_like(x)
    for j in range(3):
        np.add.at(vn, tris[:, j], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


nv = len(X0)
deg = np.maximum(np.bincount(ed.ravel(), minlength=nv), 1).astype(float)[:, None]


def relax(x, a_t=0.5, a_n=0.1):
    acc = np.zeros_like(x)
    np.add.at(acc, ed[:, 0], x[ed[:, 1]]); np.add.at(acc, ed[:, 1], x[ed[:, 0]])
    L = acc / deg - x
    n = vertex_normals(x)
    Ln = np.sum(L * n, 1, keepdims=True) * n
    return x + k[:, None] * (a_t * (L - Ln) + a_n * Ln)


R = max(float(np.percentile(np.abs(SG[S0 < 0]), 99.5)) + 0.05,       # far enough to cover both shapes
        float(S0[SG < 0].max()) + 0.02, float(SG[S0 < 0].max()) + 0.02)
SM = 0.012                                              # smooth min/max radius (keeps the gradient continuous)
def smax(a, b, r):
    return -smin(-a, -b, r)
log(f"growth radius R {R:.3f}")
x = X0.copy()
for step in range(1, STEPS + 1):
    r = R * step / STEPS
    St = smin(smax(S0 - r, SG, SM), smax(S0, SG - (R - r), SM), SM)
    Gt = np.stack(np.gradient(St, PITCH))
    for it in range(4):
        s = sample(St, x)
        g = np.stack([sample(Gt[a], x) for a in range(3)], 1)
        g2 = np.maximum((g * g).sum(1), 1e-6)
        dx = -(np.clip(s, -0.03, 0.03) / g2)[:, None] * g
        x += k[:, None] * dx
        x = relax(x)
    if step % 12 == 0:
        log(f"r {r:.2f}: |S| at free vertices mean {np.abs(s[k > 0.5]).mean():.4f} max {np.abs(s[k > 0.5]).max():.3f}")
# settle on the goal
for it in range(30):
    s = sample(SG, x)
    g = np.stack([sample(GG[a], x) for a in range(3)], 1)
    g2 = np.maximum((g * g).sum(1), 1e-6)
    x += k[:, None] * (-(np.clip(s, -0.02, 0.02) / g2)[:, None] * g)
    x = relax(x, 0.4, 0.05)
if "even" in D:    # (blockouts) even the skin out along the surface wherever it moved at all, then back onto the goal
    m = np.clip(k * 4, 0, 1)
    for it in range(int(D["even"])):
        acc = np.zeros_like(x)
        np.add.at(acc, ed[:, 0], x[ed[:, 1]]); np.add.at(acc, ed[:, 1], x[ed[:, 0]])
        L = acc / deg - x
        n = vertex_normals(x)
        x = x + m[:, None] * 0.5 * (L - np.sum(L * n, 1, keepdims=True) * n)
        s = sample(SG, x)
        g = np.stack([sample(GG[a], x) for a in range(3)], 1)
        x += m[:, None] * (-(np.clip(s, -0.02, 0.02) / np.maximum((g * g).sum(1), 1e-6))[:, None] * g)
s = sample(SG, x)
log(f"done: |S_goal| at free vertices mean {np.abs(s[k > 0.5]).mean():.4f}, p95 {np.percentile(np.abs(s[k > 0.5]), 95):.4f}")
np.savez(dst, verts=x, k=k)
