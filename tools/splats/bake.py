"""Bake Idol splats into the site's pose files (decision e1108-35; docs/research/splats.md, "Splat cat").
For each pose: turn the Idol PLY upright and to face +z (toward the camera at home), scale it to the pose's height,
centre it on x and z with its feet on y = 0, thin it to 64k Gaussians and write assets/splats/<pose>.spz. Prints where
the butter goes (the crown between the ears, in the same space) for SITE.cat.splat.butter in src/config.js.
Needs numpy and plyfile (the Idol venv has both) and splat-transform (npm @playcanvas/splat-transform).
Run: SPLAT_TRANSFORM=<path to splat-transform> python bake.py <idol output folder> <repo root>
"""
import json, math, os, subprocess, sys, tempfile
import numpy as np
from plyfile import PlyData
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from solid import solidify

# pose -> Idol output name (in the Idol output folder, or a candidate in prototypes/splats/cands/), rough front (degrees
# to turn about y so the face looks at +z, read off renders; None: found from the ears) and height in cat units (mesh sit = 1). The front is then
# fine-tuned from the ears (`face`): every pose ends up with the line between its ear tips square to the camera, so
# the face points the same way after each pop (round 2, Aaron 2026-11-09).
POSES = {
    'sit':     ('sit-12', None, 1.0),           # Aaron's pick (2026-11-09): Idol on sit-side-profile.png, guidance 4, seed 42095
    'loaf':    ('loaf-6', 270, 0.8),          # Aaron's pick (2026-11-09): Idol on loaf-hero.png, seed 37518
    'sleep':   ('sleep-hero', 300, 0.72),
    'stretch': ('stretch-hero', 315, 1.08),
}
COUNT = 65536

def turned(xyz, front):
    x, y, z = xyz.T
    x, y, z = x, -y, -z                      # 180 about x: Idol's PLY is y-down for Spark
    a = math.radians(front)                  # then about y (right-handed, like three.js rotation.y)
    c, s = math.cos(a), math.sin(a)
    return np.stack([c * x + s * z, y, -s * x + c * z], 1)

def ears(p):
    """The two ear tips (left, right): the highest points in his front half (not the stretch's tail), split in two."""
    front = p[p[:, 2] > np.median(p[:, 2]) - 0.05]
    top = front[front[:, 1] > np.percentile(front[:, 1], 97)]
    c = np.array([top[top[:, 0].argmin()], top[top[:, 0].argmax()]])[:, [0, 2]]
    for _ in range(20):                                         # 2-means on x/z
        lab = np.linalg.norm(top[:, None, [0, 2]] - c[None], axis=2).argmin(1)
        c = np.array([top[lab == k][:, [0, 2]].mean(0) for k in (0, 1)])
    tips = [g[g[:, 1].argsort()[-max(5, len(g) // 5):]].mean(0) for g in (top[lab == 0], top[lab == 1])]
    return sorted(tips, key=lambda t: t[0])

def place(raw, front, height):
    """Turn, scale and move to the site's frame: feet on y = 0, centred on x and z. Returns points, scale, move."""
    solid = turned(raw, front)
    lo, hi = np.percentile(solid, 0.2, 0), np.percentile(solid, 99.8, 0)
    k = height / (hi[1] - lo[1])
    t = -np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2]) * k
    return solid * k + t, k, t, (hi - lo) * k

def face(raw, front, height):
    """Fine-tune the front so the ear line runs along x (face toward +z). Returns the front and the ear-line yaw before."""
    first = None
    for _ in range(3):
        L, R = ears(place(raw, front, height)[0])
        yaw = math.degrees(math.atan2(-(R - L)[2], (R - L)[0]))
        first = yaw if first is None else first
        front -= yaw
        if abs(yaw) < 0.5: break
    return front % 360, first

def face_any(raw, height):
    """No rough front known (a new input view): try four starts, keep the one with the head furthest forward."""
    best = None
    for start in (0, 90, 180, 270):
        front, was = face(raw, start, height)
        L, R = ears(place(raw, front, height)[0])
        z = (L[2] + R[2]) / 2
        if best is None or z > best[0]: best = (z, front, was)
    return best[1], best[2]

def bake(ply, front, height, dst, st):
    """Idol PLY -> site .spz at dst: faced (front None = find it), sized, 64k, solid shell. Returns a report dict."""
    v = PlyData.read(ply)['vertex']
    raw = np.stack([v['x'], v['y'], v['z']], 1)
    op = 1 / (1 + np.exp(-np.asarray(v['opacity'])))
    raw = raw[op > 0.3]
    front, was = face(raw, front, height) if front is not None else face_any(raw, height)
    p, k, t, size = place(raw, front, height)
    # butter: on the crown, between the ears: the top of the head within a small circle around their midpoint
    L, R = ears(p); mid = (L + R) / 2
    crown = p[np.hypot(p[:, 0] - mid[0], p[:, 2] - mid[2]) < 0.035]
    butter = [round(float(mid[0]), 3), round(float(np.percentile(crown[:, 1], 99)), 3), round(float(mid[2]), 3)]
    with tempfile.TemporaryDirectory() as d:
        mid_ply, shelled = os.path.join(d, 'mid.ply'), os.path.join(d, 'solid.ply')
        # splat-transform's frame is turned 180 degrees about x from what Spark shows for an .spz, so the turn about y
        # and the y and z of the move are negated there
        subprocess.run([st, '-q', '-w', ply, '-r', '180,0,0', '-r', f'0,{-front},0', '-s', f'{k}', '-t', ','.join(f'{x}' for x in t * [1, -1, -1]),
                        '-d', str(COUNT), mid_ply], check=True, stderr=subprocess.DEVNULL)
        added = solidify(mid_ply, shelled)                 # a hidden opaque shell: nothing shows through him (solid.py)
        subprocess.run([st, '-q', '-w', shelled, dst], check=True, stderr=subprocess.DEVNULL)
    return dict(front=front, was=was, k=k, size=size, butter=butter, added=added)

def main(src, repo):
    st = os.environ.get('SPLAT_TRANSFORM', 'splat-transform')
    out = {}
    for pose, (name, front, height) in POSES.items():
        ply = os.path.join(repo, 'prototypes', 'splats', 'cands', name + '.ply')
        ply = ply if os.path.exists(ply) else os.path.join(src, name + '.ply')
        dst = os.path.join(repo, 'assets', 'splats', pose + '.spz')
        r = bake(ply, front, height, dst, st)
        out[pose] = r['butter']
        print(f"{pose}: {name} front {r['front']:.1f} (ears were {r['was']:+.1f}) scale {r['k']:.3f} size {np.round(r['size'], 3).tolist()} "
              f"{os.path.getsize(dst) / 1e6:.2f} MB, +{r['added']} shell, butter {out[pose]}")
    print('butter', json.dumps({{'loaf': 'lie'}.get(k, k): b for k, b in out.items()}))   # config keys

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
