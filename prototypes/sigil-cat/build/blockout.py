# blockout.py: clean pose targets from smooth primitives (2026-11-08, e1108-04). Hunyuan venv (numpy, scipy, skimage).
#
# Why: the loaf and sleep shapes were wrapped onto AI pose meshes and inherited their lumps and grooves. A clay
# blockout (ellipsoids, round cones, paw balls, smooth-unioned as a signed distance field) is smooth by construction,
# and the cat is soft blobs already, so a handful of primitives matches the sheets. The cat's own head, ears, whiskers
# and tail stay rigid (as before); the blockout is the body only. See docs/research/pose-shapes.md.
#
#   python -I blockout.py score  <pose>               silhouette overlap with the sheet (front, side, 3/4, back)
#   python -I blockout.py fit    <pose> [rounds]      tunes targets/<pose>-blockout.json to the sheet silhouettes
#   python -I blockout.py mesh   <pose>               marching cubes -> targets/<pose>.ply (the morph's target)
#   python -I blockout.py head   <pose>               adds the posed head's ellipsoid as a fixed prim
#   python -I blockout.py look   <pose>               work/blockout/<pose>-look.png: overlays and shaded views
# Needs work/blockout/<pose>-posed.npz (dump_pose.py) and crops/ (make_crops.py).
#
# Spec (targets/<pose>-blockout.json): {"prims": [...], "floor": k}. A prim: {"t": "ell", "c": [x,y,z], "r": [a,b,c],
# "rot": [rx,ry,rz] (degrees, XYZ), "k": blend} or {"t": "cone", "a": [..], "b": [..], "ra": r, "rb": r, "k": blend};
# "mirror": true adds its mirror image in x; "sym": true keeps it on the centre line (fit moves only y, z and pitch);
# "lock": [keys] and "fixed": true keep those numbers out of the fit. Each prim is smooth-unioned onto the ones before it with its own k
# (polynomial smooth min). "floor" flattens the underside onto z = 0 with that blend. Blender axes: Z up, the cat
# faces -Y, his left is +X. Units: the cat's (the sit is about 1.0 tall).
import sys, os, json, math, time
import numpy as np
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.join(HERE, "work", "blockout")
TARGETS = os.path.join(HERE, "targets")
CROPS = os.path.join(HERE, "crops")


# ---------------------------------------------------------------- fields
def smin(a, b, k):
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - h) + a * h - k * h * (1 - h)


def rotm(deg):
    rx, ry, rz = (math.radians(d) for d in deg)
    X = np.array([[1, 0, 0], [0, math.cos(rx), -math.sin(rx)], [0, math.sin(rx), math.cos(rx)]])
    Y = np.array([[math.cos(ry), 0, math.sin(ry)], [0, 1, 0], [-math.sin(ry), 0, math.cos(ry)]])
    Z = np.array([[math.cos(rz), -math.sin(rz), 0], [math.sin(rz), math.cos(rz), 0], [0, 0, 1]])
    return Z @ Y @ X


def f_ell(p, c, r, rot):
    q = (p - np.asarray(c)) @ rotm(rot) if rot is not None else p - np.asarray(c)
    r = np.maximum(np.asarray(r, float), 1e-3)
    k0 = np.linalg.norm(q / r, axis=1)
    k1 = np.linalg.norm(q / (r * r), axis=1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)          # iq's ellipsoid bound (exact on the surface)


def f_cone(p, a, b, ra, rb):
    """Round cone (iq): a sphere of radius ra at a swept to one of radius rb at b."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a; l2 = float(ba @ ba); rr = ra - rb; a2 = l2 - rr * rr; il2 = 1.0 / max(l2, 1e-9)
    pa = p - a
    y = pa @ ba; z = y - l2
    xv = pa * l2 - y[:, None] * ba
    x2 = (xv * xv).sum(1); y2 = y * y * l2; z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    out = (np.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra
    m1 = np.sign(z) * a2 * z2 > k
    m2 = np.sign(y) * a2 * y2 < k
    out = np.where(m1, np.sqrt(x2 + z2) * il2 - rb, out)
    out = np.where(m2 & ~m1, np.sqrt(x2 + y2) * il2 - ra, out)
    return out


def expand(spec):
    out = []
    for pr in spec["prims"]:
        out.append(pr)
        if pr.get("mirror"):
            m = dict(pr)
            for key in ("c", "a", "b"):
                if key in m:
                    m[key] = [-m[key][0], m[key][1], m[key][2]]
            if "rot" in m:
                m["rot"] = [m["rot"][0], -m["rot"][1], -m["rot"][2]]
            out.append(m)
    return out


def field(spec, p):
    d = None
    for pr in expand(spec):
        if pr["t"] == "ell":
            f = f_ell(p, pr["c"], pr["r"], pr.get("rot"))
        elif pr["t"] == "cone":
            f = f_cone(p, pr["a"], pr["b"], pr["ra"], pr["rb"])
        else:
            raise ValueError(pr["t"])
        d = f if d is None else smin(d, f, pr.get("k", 0.06))
    fl = spec.get("floor", 0)
    if fl:
        d = -smin(-d, p[:, 2], fl)                         # smooth max with the floor plane: flat underneath
    return d


def grid_for(spec, pitch, pad=0.08):
    lo, hi = np.full(3, 1e9), np.full(3, -1e9)
    for pr in expand(spec):
        pts = [pr["c"]] if "c" in pr else [pr["a"], pr["b"]]
        rad = max(pr["r"]) if "r" in pr else max(pr["ra"], pr["rb"])
        for q in pts:
            lo = np.minimum(lo, np.asarray(q) - rad); hi = np.maximum(hi, np.asarray(q) + rad)
    lo -= pad; hi += pad; lo[2] = max(lo[2], -pad)
    n = np.ceil((hi - lo) / pitch).astype(int) + 1
    return lo, n


def sample(spec, pitch):
    lo, n = grid_for(spec, pitch)
    idx = np.indices(n).reshape(3, -1).T
    p = lo + idx * pitch
    return lo, n, field(spec, p).reshape(n)


# ---------------------------------------------------------------- silhouettes
class Pose:
    def __init__(self, pose, res=200):
        self.pose = pose
        D = np.load(os.path.join(WORK, f"{pose}-posed.npz"))
        self.D = D
        self.res = res
        self.scale = float(D["cam_scale"])
        self.cams = D["cams"]
        self.views = [str(v) for v in D["views"]]
        W = {k[2:]: D[k] for k in D.files if k.startswith("w_")}
        self.W = W
        head = np.clip(W["head"] + W["ear"], 0, 1)
        tail = np.clip((W["tail"] - 0.25) / 0.5, 0, 1)
        self.keep = np.clip(head + tail, 0, 1)
        v, t = D["verts"], D["tris"]
        kt = t[(self.keep[t] > 0.5).all(1)]
        self.kept_pts = np.concatenate([tri_points(v, kt), tri_points(D["whisk_verts"], D["whisk_tris"])])
        self.all_pts = np.concatenate([tri_points(v, t), tri_points(D["whisk_verts"], D["whisk_tris"])])
        self.sheet = {}
        for vi, view in enumerate(self.views + ["back"]):
            self.sheet[view] = norm_sil(sheet_sil(pose, view))

    def cam(self, view):
        if view == "back":
            o, r, u, f = self.cams[0].reshape(4, 3)
            return o, -r, u, -f
        return self.cams[self.views.index(view)].reshape(4, 3)

    def project(self, pts, view):
        o, r, u, f = self.cam(view)
        s = self.res / self.scale
        x = np.round(self.res / 2 + (pts - o) @ r * s).astype(int)
        y = np.round(self.res / 2 - (pts - o) @ u * s).astype(int)
        ok = (x >= 0) & (x < self.res) & (y >= 0) & (y < self.res)
        m = np.zeros((self.res, self.res), bool)
        m[y[ok], x[ok]] = True
        return m

    def raster(self, pts, view, close=1):
        m = self.project(pts, view)
        if close:
            m = ndi.binary_closing(m, iterations=close)
        return ndi.binary_fill_holes(m)

    def sil(self, inside_pts, view, kept=True):
        m = self.raster(self.kept_pts if kept else self.all_pts, view)
        if inside_pts is not None and len(inside_pts):
            m |= self.raster(inside_pts, view, close=1)
        return m

    def scores(self, inside_pts, views=None, kept=True):
        out = {}
        for view in views or (self.views + ["back"]):
            out[view] = iou(norm_sil(self.sil(inside_pts, view, kept)), self.sheet[view])
        return out


def tri_points(v, t, n=4):
    """Points spread over each triangle (an n x n barycentric lattice), enough to fill a silhouette pixel."""
    a, b, c = v[t[:, 0]], v[t[:, 1]], v[t[:, 2]]
    out = []
    for i in range(n + 1):
        for j in range(n + 1 - i):
            u, w = i / n, j / n
            out.append(a + u * (b - a) + w * (c - a))
    return np.concatenate(out)


def load_rgb(path):
    from PIL import Image
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255


def silhouette(a):
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
    return np.abs(a - bg).sum(2) > 0.25


def sheet_sil(pose, view):
    return silhouette(load_rgb(os.path.join(CROPS, f"{pose}-{view}.png")))


def norm_sil(m, H=240, W=480):          # as anim_cat.norm_sil: height-normalised, centred
    ys, xs = np.nonzero(m.sum(1) >= 3)[0], np.nonzero(m.sum(0) >= 3)[0]
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    nw = min(W, max(1, round(w * H / h)))
    yi = (np.arange(H) * h / H).astype(int); xi = (np.arange(nw) * w / nw).astype(int)
    r = m[yi][:, xi]
    out = np.zeros((H, W), bool); x0 = (W - nw) // 2
    out[:, x0:x0 + nw] = r
    return out


def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))


def inside_points(spec, pitch):
    lo, n, F = sample(spec, pitch)
    return lo + np.argwhere(F < 0) * pitch


# ---------------------------------------------------------------- fitting
def leaves(spec):
    """(path, value) for every tunable number in the spec ('k' and 'floor' are blends, kept fixed)."""
    out = []
    for i, pr in enumerate(spec["prims"]):
        if pr.get("fixed"):
            continue
        for key in ("c", "r", "rot", "a", "b"):
            if key in pr:
                for j in range(3):
                    if pr.get("sym") and ((key in ("c", "a", "b") and j == 0) or (key == "rot" and j > 0)):
                        continue      # sym: stays on the centre line, pitched only
                    if key in pr.get("lock", ()):
                        continue
                    out.append(((i, key, j), pr[key][j]))
        for key in ("ra", "rb"):
            if key in pr and key not in pr.get("lock", ()):
                out.append(((i, key, None), pr[key]))
    return out


def setv(spec, path, x):
    i, key, j = path
    if j is None:
        spec["prims"][i][key] = x
    else:
        spec["prims"][i][key][j] = x


def step_of(path):
    return 6.0 if path[1] == "rot" else 0.02


VIEW_W = {"front": 1.0, "side": 1.0, "three-quarter": float(os.environ.get("W3Q", 1.0)), "back": 0.25}   # (back: not in the check, a light hint for the hidden side)


ROOT_DEPTH = (-0.02, 0.0)   # the tail's root sits this deep in the blockout (field value range): the joint at the surface


def objective(P, spec, pitch):
    s = P.scores(inside_points(spec, pitch))
    worst = min(s[v] for v in ("front", "side", "three-quarter"))
    # the tail must grow out of the surface (buried, its base skin folds; outside, it floats)
    f = float(field(spec, P.D["h_tail_1"][None])[0])
    pen = 4 * (max(0.0, ROOT_DEPTH[0] - f) + max(0.0, f - ROOT_DEPTH[1]))
    s["root"] = round(f, 3)
    # the tail lies outside the body (one tail radius out from its centre line): swallowed, its channel cuts a groove
    tl = np.array([P.D[f"h_tail_{i}"] for i in range(4, 9)] + [P.D["t_tail_8"]])   # (2, 3: by the root; clearing them carves a cleft)
    ft = field(spec, tl)
    pen += TAIL_CLEAR_W * float(np.clip(TAIL_CLEAR - ft, 0, None).sum())
    s["tail"] = round(float(ft.min()), 3)
    # the body keeps clear of the whiskers (they are rigid and stick out of the cheeks: inside the body they clip)
    wv = P.D["whisk_verts"][::7]
    fw = field(dict(spec, prims=[q for q in spec["prims"] if q.get("name") != "head"]), wv)   # (the roots are in the head)
    pen += WHISK_CLEAR_W * float(np.clip(WHISK_CLEAR - fw, 0, None).mean())
    s["whisk"] = round(float(fw.min()), 3)
    # the body must not climb up round the face: a held face sunk in it reads as a groove across the lower face
    hp = [q for q in spec["prims"] if q.get("name") == "head"]
    if hp:
        body = dict(spec, prims=[q for q in spec["prims"] if q.get("name") != "head"])
        cov = float((field(body, face_points(hp[0])) < -0.005).mean())
        pen += FACE_COVER_W * cov
        s["face"] = round(cov, 3)
    return sum(VIEW_W[v] * s[v] for v in VIEW_W) / sum(VIEW_W.values()) + 0.5 * worst - pen, s


FACE_COVER_W = 2.0
WHISK_CLEAR, WHISK_CLEAR_W = 0.02, 40.0
TAIL_CLEAR, TAIL_CLEAR_W = 0.07, 4.0     # tail centre line this far outside the body (tail radius ~0.075 at scale 1.25)


def face_points(hp, n=400):
    """Points on the front of the head prim (facing -Y), from just below the whiskers up: the face the body must
    leave bare."""
    rng = np.random.default_rng(1)
    d = rng.normal(size=(n * 4, 3)); d /= np.linalg.norm(d, axis=1, keepdims=True)
    d = d[(d[:, 1] < -0.35) & (d[:, 2] > -0.55)][:n]
    return np.asarray(hp["c"]) + (d * np.asarray(hp["r"])) @ rotm(hp.get("rot", (0, 0, 0))).T


def fit(pose, rounds=6, pitch=0.014):
    path = os.path.join(TARGETS, f"{pose}-blockout.json")
    spec = json.load(open(path))
    P = Pose(pose)
    best, s = objective(P, spec, pitch)
    print(f"start {best:.4f}", {k: round(v, 3) for k, v in s.items()}, flush=True)
    rng = np.random.default_rng(0)
    for rd in range(rounds):
        L = leaves(spec)
        order = rng.permutation(len(L))
        shrink = 1.0 / (1 + rd)
        for li in order:
            pth, _ = L[li]
            for sgn in (1, -1):
                trial = json.loads(json.dumps(spec))
                cur = trial["prims"][pth[0]][pth[1]] if pth[2] is None else trial["prims"][pth[0]][pth[1]][pth[2]]
                setv(trial, pth, round(cur + sgn * step_of(pth) * shrink, 4))
                val, s2 = objective(P, trial, pitch)
                if val > best + 1e-4:
                    best, spec, s = val, trial, s2
                    break
        print(f"round {rd + 1}: {best:.4f}", {k: round(v, 3) for k, v in s.items()}, flush=True)
        json.dump(spec, open(path, "w"), indent=1)
    return spec


# ---------------------------------------------------------------- mesh and look
def mesh(pose, pitch=0.016):     # (coarse: committed, and only a preview and the morph's bounds; it reads the field)
    from skimage import measure
    spec = json.load(open(os.path.join(TARGETS, f"{pose}-blockout.json")))
    lo, n, F = sample(spec, pitch)
    v, f, _, _ = measure.marching_cubes(F, 0.0, spacing=(pitch,) * 3)
    v = v + lo
    sys.path.insert(0, HERE)
    save_ply(os.path.join(TARGETS, f"{pose}.ply"), v, f[:, ::-1])   # skimage winds inward for an SDF
    print(f"{pose}.ply: {len(v)} verts, {len(f)} tris", flush=True)
    return v, f


def save_ply(path, v, f):
    v = np.asarray(v, "<f4"); f = np.asarray(f, "<i4")
    with open(path, "wb") as fh:
        fh.write((f"ply\nformat binary_little_endian 1.0\nelement vertex {len(v)}\nproperty float x\nproperty float y\n"
                  f"property float z\nelement face {len(f)}\nproperty list uchar int vertex_indices\nend_header\n").encode())
        fh.write(v.tobytes())
        rec = np.zeros(len(f), dtype=[("n", "u1"), ("i", "<i4", 3)]); rec["n"] = 3; rec["i"] = f
        fh.write(rec.tobytes())


def look(pose, pitch=0.008):
    from PIL import Image
    spec = json.load(open(os.path.join(TARGETS, f"{pose}-blockout.json")))
    P = Pose(pose, res=300)
    pts = inside_points(spec, pitch)
    tiles = []
    for view in P.views + ["back"]:
        ours = norm_sil(P.sil(pts, view)); ref = P.sheet[view]
        t = np.ones(ours.shape + (3,)) * (0.96, 0.93, 0.89)
        blk = norm_sil(P.raster(pts, view) & ~P.raster(P.kept_pts, view)) if len(pts) else ours & False
        t[ours] = (0.45, 0.45, 0.5); t[blk & ours] = (0.55, 0.45, 0.35)
        edge = ref & ~ndi.binary_erosion(ref, iterations=1)
        t[ndi.binary_dilation(edge)] = (0.85, 0.1, 0.1)
        tiles.append((t * 255).astype(np.uint8))
        print(view, round(iou(ours, ref), 3))
    Image.fromarray(np.concatenate(tiles, 0)).save(os.path.join(WORK, f"{pose}-look.png"))


def head_prim(pose, k=0.05):
    """The posed head as an ellipsoid (a least-squares quadric through the firm head), put in the blockout as a fixed
    prim named "head": the chin and throat, freed in the morph, round out onto it instead of leaving a ledge."""
    P = Pose(pose)
    x = P.D["verts"][(P.W["head"] > 0.95) & (P.W["ear"] < 0.02)]
    A = np.c_[x * x, 2 * x[:, 0] * x[:, 1], 2 * x[:, 0] * x[:, 2], 2 * x[:, 1] * x[:, 2], 2 * x]
    p = np.linalg.lstsq(A, np.ones(len(x)), rcond=None)[0]
    Q = np.array([[p[0], p[3], p[4]], [p[3], p[1], p[5]], [p[4], p[5], p[2]]])
    c = -np.linalg.solve(Q, p[6:9]); Q = Q / (1 + c @ Q @ c)
    w, V = np.linalg.eigh(Q)
    R = np.zeros((3, 3)); r = np.zeros(3)
    for i in range(3):                       # each eigenvector to the world axis it is closest to
        j = int(np.argmax(np.abs(V[:, i])))
        R[:, j] = V[:, i] * np.sign(V[j, i]); r[j] = 1 / math.sqrt(w[i])
    if np.linalg.det(R) < 0:
        R[:, 0] *= -1
    rot = [math.degrees(math.atan2(R[2, 1], R[2, 2])), math.degrees(-math.asin(np.clip(R[2, 0], -1, 1))),
           math.degrees(math.atan2(R[1, 0], R[0, 0]))]
    path = os.path.join(TARGETS, f"{pose}-blockout.json")
    spec = json.load(open(path))
    spec["prims"] = [q for q in spec["prims"] if q.get("name") != "head"]
    spec["prims"].append(dict(name="head", t="ell", c=[round(float(a), 4) for a in c], r=[round(float(a), 4) for a in r],
                              rot=[round(a, 2) for a in rot], k=k, fixed=True))
    json.dump(spec, open(path, "w"), indent=1)
    print("head prim", spec["prims"][-1])


if __name__ == "__main__":
    cmd, pose = sys.argv[1], sys.argv[2]
    if cmd == "score":
        spec = json.load(open(os.path.join(TARGETS, f"{pose}-blockout.json"))) if len(sys.argv) < 4 else None
        P = Pose(pose)
        if sys.argv[3:] == ["all"]:
            print("whole posed cat", {k: round(v, 3) for k, v in P.scores(None, kept=False).items()})
        else:
            print({k: round(v, 3) for k, v in P.scores(inside_points(spec, 0.01)).items()})
    elif cmd == "fit":
        fit(pose, int(sys.argv[3]) if len(sys.argv) > 3 else 6)
    elif cmd == "mesh":
        mesh(pose)
    elif cmd == "head":
        head_prim(pose)
    elif cmd == "look":
        look(pose)
