# wrap_util.py: mesh helpers for fitting the cat's body onto the AI pose meshes (headless Blender 5.2, numpy).
#   load_ply / save_ply     the prepared targets (build/targets/<pose>.ply, Blender axes)
#   register_head()         finds the cat's head inside an AI mesh (prep_targets.py: the head is the ruler)
#   untangle()              removes self-intersections a fit leaves (anim_cat.py, after sdf_morph.py)
#   smooth_field, edges_of, tri_faces, vertex_normals   small mesh-graph helpers
# (Moving vertices straight onto the target, by nearest point, rays from the bones or inflation, was tried and
# dropped: it folded and streaked the skin. The fit itself is sdf_morph.py.)
import bpy
import math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def load_ply(path):
    """Target mesh as (verts, faces) numpy arrays, Blender axes (Z up, cat facing -Y)."""
    before = set(bpy.data.objects)
    bpy.ops.wm.ply_import(filepath=path, forward_axis='Y', up_axis='Z')
    ob = [o for o in bpy.data.objects if o not in before][0]
    me = ob.data
    v = np.array([ob.matrix_world @ x.co for x in me.vertices])
    f = [tuple(p.vertices) for p in me.polygons]
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    return v, f


def edges_of(me):
    return np.array([e.vertices[:] for e in me.edges])


def smooth_field(d, ed, nv, passes, keep=0.5):
    deg = np.maximum(np.bincount(ed.ravel(), minlength=nv), 1).astype(float)[:, None]
    for _ in range(passes):
        acc = np.zeros_like(d)
        np.add.at(acc, ed[:, 0], d[ed[:, 1]]); np.add.at(acc, ed[:, 1], d[ed[:, 0]])
        d = keep * d + (1 - keep) * acc / deg
    return d


def tri_faces(me):
    """The mesh's polygons as triangles (fans), for vertex normals."""
    tris = []
    for p in me.polygons:
        v = list(p.vertices)
        tris += [(v[0], v[i], v[i + 1]) for i in range(1, len(v) - 1)]
    return np.array(tris)


def vertex_normals(x, tris):
    fn = np.cross(x[tris[:, 1]] - x[tris[:, 0]], x[tris[:, 2]] - x[tris[:, 0]])
    vn = np.zeros_like(x)
    for j in range(3):
        np.add.at(vn, tris[:, j], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def save_ply(path, v, f):
    """Binary little-endian PLY (vertices + faces), Blender axes as given."""
    v = np.asarray(v, "<f4")
    with open(path, "wb") as fh:
        fh.write((f"ply\nformat binary_little_endian 1.0\nelement vertex {len(v)}\nproperty float x\n"
                  f"property float y\nproperty float z\nelement face {len(f)}\n"
                  f"property list uchar int vertex_indices\nend_header\n").encode())
        fh.write(v.tobytes())
        for face in f:
            fh.write(np.array([len(face)], "<u1").tobytes() + np.array(face, "<i4").tobytes())


def _umeyama(src, dst):
    """Similarity (s, R, t) with dst ~ s R src + t."""
    ms, md = src.mean(0), dst.mean(0)
    a, b = src - ms, dst - md
    U_, S, Vt = np.linalg.svd(b.T @ a / len(src))
    D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U_ @ Vt))
    R = U_ @ D @ Vt
    s = float(np.trace(np.diag(S) @ D) / (a * a).sum() * len(src))
    return s, R, md - s * R @ ms


def register_head(tv, tf, template, expect_h, log=print):
    """Finds the cat's head (template: rest-pose head and ear points, in cat units) inside the AI mesh.
    Multi-start: a coarse search over scale and position (upright), then trimmed ICP with rotation from the
    best few. Returns s, R, t mapping template -> target, and the trimmed residual (target units)."""
    bvh = BVHTree.FromPolygons([Vector(p) for p in tv], tf, all_triangles=False)
    rng = np.random.default_rng(2)
    sub = template[rng.choice(len(template), min(150, len(template)), replace=False)]
    full = template[rng.choice(len(template), min(800, len(template)), replace=False)]
    tc = template.mean(0)
    lo, hi = tv.min(0), tv.max(0)

    def cost(pts, s, R, t, inside_w=2.0):
        d = []
        for p in (s * (pts @ R.T) + t):
            co, n, _, dist = bvh.find_nearest(Vector(p))
            d.append(dist * (inside_w if (Vector(p) - co).dot(n) < 0 else 1.0))
        d = np.sort(d)
        return float(d[: int(len(d) * 0.85)].mean())

    cands = []
    s_exp = (hi[2] - lo[2]) / expect_h                   # expect_h: the pose's height in cat units, read off the sheet
    s_lo, s_hi = 0.8 * s_exp, 1.2 * s_exp
    for s in np.linspace(s_lo, s_hi, 5):
        for x in (0.0,):
            for y in np.linspace(lo[1], lo[1] + 0.5 * (hi[1] - lo[1]), 7):   # the head is at the front (-Y) half
                for z in np.linspace(lo[2], hi[2], 9):
                    t = np.array([x, y, z]) - s * tc
                    cands.append((cost(sub, s, np.eye(3), t), s, np.eye(3), t))
    cands.sort(key=lambda c: c[0])
    best = None
    for c0, s, R, t in cands[:8]:
        for it in range(25):
            mapped = s * (full @ R.T) + t
            q = np.array([bvh.find_nearest(Vector(p))[0][:] for p in mapped])
            r = np.linalg.norm(mapped - q, axis=1)
            ok = r <= max(np.median(r) * 2.5, 1e-4)
            s, R, t = _umeyama(full[ok], q[ok])
            if not s_lo <= s <= s_hi:                   # keep the scale in the measured range
                sc = min(s_hi, max(s_lo, s)); t = t + (s - sc) * (R @ full[ok].mean(0)); s = sc
        c = cost(full, s, R, t)
        if best is None or c < best[0]:
            best = (c, s, R, t)
    c, s, R, t = best
    ang = math.degrees(math.acos(max(-1, min(1, (np.trace(R) - 1) / 2))))
    log(f"head found: scale {s:.3f} (expected {s_exp:.3f}: target height {(hi[2]-lo[2])/s:.3f} cat units), "
        f"rotation {ang:.1f} deg, residual {c:.4f}")
    return s, R, t, c


def untangle(x, ed, polys, k, rounds=60, rings=2, log=print):
    """Removes self-intersections left by a fit: finds body triangles crossing other body triangles (pairs sharing
    a vertex don't count). A free triangle crossing a fixed one (k < 0.06: tail, face) is pushed out along the
    fixed one's normal; two free ones are smoothed (`rings` neighbours out) toward their neighbours' average. Repeats until none are left or `rounds` run out. Returns the fixed positions."""
    nv = len(x)
    psets = [set(p) for p in polys]
    nbr = [[] for _ in range(nv)]
    for a, b in ed:
        nbr[a].append(b); nbr[b].append(a)
    deg = np.maximum(np.bincount(ed.ravel(), minlength=nv), 1).astype(float)[:, None]
    fixed_poly = [all(k[v] < 0.06 for v in p) for p in polys]
    x = x.copy()
    for r in range(rounds):
        bt = BVHTree.FromPolygons([Vector(p) for p in x], polys, all_triangles=False)
        bad = set()
        hits = 0
        push = np.zeros_like(x)
        for a, b in bt.overlap(bt):
            if a < b and not (psets[a] & psets[b]):
                hits += 1
                fa, fb = fixed_poly[a], fixed_poly[b]
                if fa != fb:      # a free skin crossing a fixed part (tail, face): push it out of the fixed part
                    f, m = (a, b) if fa else (b, a)
                    pf = x[list(polys[f])]
                    n = np.cross(pf[1] - pf[0], pf[2] - pf[0]); n /= max(np.linalg.norm(n), 1e-12)
                    for v in polys[m]:
                        push[v] += n * 0.004
                else:
                    bad |= psets[a] | psets[b]
        if r == 0 or not hits or r % 10 == 0 or r == rounds - 1:
            kinds = {"fixed-fixed": 0, "fixed-free": 0, "free-free": 0}
            for a, b in bt.overlap(bt):
                if a < b and not (psets[a] & psets[b]):
                    kinds["fixed-fixed" if fixed_poly[a] and fixed_poly[b] else
                          "fixed-free" if fixed_poly[a] or fixed_poly[b] else "free-free"] += 1
            log(f"untangle round {r}: {hits} crossing pairs {kinds}")
        if not hits:
            break
        x += push * k[:, None]
        region = set(bad)
        for _ in range(rings):
            region |= {n for v in list(region) for n in nbr[v]}
        if not region:
            continue
        idx = np.array(sorted(region), dtype=int)
        acc = np.zeros_like(x)
        np.add.at(acc, ed[:, 0], x[ed[:, 1]]); np.add.at(acc, ed[:, 1], x[ed[:, 0]])
        avg = acc / deg
        x[idx] += 0.6 * k[idx, None] * (avg[idx] - x[idx])
    return x
