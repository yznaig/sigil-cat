"""Make Idol splat candidates for one pose, for Aaron to pick from in prototypes/splats/pick.html.
Each candidate: one input image from tools/splats/inputs/<pose>-*<filter>*.png (taken in turn), a fresh random seed
and a guidance strength from CFGS (env CFGS=3,4.5,6 to vary it); env MODE=real for photos. Writes to prototypes/splats/cands/: <pose>-<n>.ply (full Idol output, for bake.py),
<pose>-<n>.png (what Idol saw) and the page's preview <pose>-<n>.spz, with the hidden solid shell (solid.py) as
bake.py adds it.
Numbers carry on from what is in cands/index.json.
Run through more.sh. `more.sh --previews` remakes every preview (after a change to solid.py).
Idol's knobs (idol.sample): seed, cfg_strength (guidance, 3), steps (50), rescale_t (3), mode (synthetic/real),
crop_margin, num_gaussians.
"""
import glob, json, os, random, subprocess, sys, tempfile, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from solid import solidify

CFGS = tuple(float(x) for x in os.environ.get('CFGS', '3').split(','))   # guidance, taken in turn (Idol's default 3)

def preview(out, name, st):
    """cands/<name>.ply -> cands/<name>.spz as the site would show it: faced like the other poses (ear tips, bake.py),
    upright, sized, 64k, solid shell. Other things (the bread) are stood up by their own axes instead (`straighten`)."""
    from bake import POSES, bake
    pose = name.split('-')[0]
    if pose in POSES:
        bake(os.path.join(out, name + '.ply'), None, POSES[pose][2], os.path.join(out, name + '.spz'), st)
        return True
    with tempfile.TemporaryDirectory() as d:
        level, small, solid = (os.path.join(d, f) for f in ('level.ply', 'small.ply', 'solid.ply'))
        straighten(os.path.join(out, name + '.ply'), level)
        subprocess.run([st, '-q', '-w', level, '-d', '65536', small], check=True, stderr=subprocess.DEVNULL)
        solidify(small, solid)
        subprocess.run([st, '-q', '-w', solid, os.path.join(out, name + '.spz')], check=True, stderr=subprocess.DEVNULL)
    return True

def straighten(src, dst):
    """Stand an object up by its own axes: longest along x, flattest up (y), centred, resting on y = 0. Idol's frame is
    y-down, so 'up' is the flat axis on the side of -y."""
    import numpy as np
    from plyfile import PlyData, PlyElement
    v = PlyData.read(src)['vertex'].data.copy()
    xyz = np.stack([v['x'], v['y'], v['z']], 1).astype(np.float64)
    seen = 1 / (1 + np.exp(-v['opacity'].astype(np.float64))) > 0.3
    c = xyz[seen].mean(0)
    vec = np.linalg.eigh(np.cov((xyz[seen] - c).T))[1]                     # columns, flattest first
    up, long = vec[:, 0], vec[:, 2]
    if up[1] > 0: up = -up                                                   # toward Idol's up (-y)
    R = np.stack([long, up, np.cross(long, up)])                            # rows: new x, y, z (a proper rotation)
    p = (xyz - c) @ R.T
    p[:, 1] -= np.percentile(p[seen, 1], 0.5)
    v['x'], v['y'], v['z'] = p.T
    qr = quat(R)                                                             # turn each Gaussian too: q' = qr * q
    q = np.stack([v[f'rot_{i}'] for i in range(4)]).astype(np.float64)
    w, x, y, z = qr
    turned = np.stack([w * q[0] - x * q[1] - y * q[2] - z * q[3], w * q[1] + x * q[0] + y * q[3] - z * q[2],
                       w * q[2] - x * q[3] + y * q[0] + z * q[1], w * q[3] + x * q[2] - y * q[1] + z * q[0]])
    for i in range(4): v[f'rot_{i}'] = turned[i]
    PlyData([PlyElement.describe(v, 'vertex')]).write(dst)

def quat(R):
    """Rotation matrix -> unit quaternion (w, x, y, z), stable for any angle."""
    import numpy as np
    t = np.trace(R)
    if t > 0:
        s = 2 * np.sqrt(1 + t); return np.array([s / 4, (R[2, 1] - R[1, 2]) / s, (R[0, 2] - R[2, 0]) / s, (R[1, 0] - R[0, 1]) / s])
    i = int(np.argmax(np.diag(R))); j, k = (i + 1) % 3, (i + 2) % 3
    s = 2 * np.sqrt(1 + R[i, i] - R[j, j] - R[k, k])
    q = np.zeros(4); q[0] = (R[k, j] - R[j, k]) / s; q[1 + i] = s / 4; q[1 + j] = (R[j, i] + R[i, j]) / s; q[1 + k] = (R[k, i] + R[i, k]) / s
    return q

def finish(out, idx, entry, st):
    entry['upright'] = preview(out, entry['name'], st); idx.append(entry)

def main(pose, count, flt, repo):
    st = os.environ.get('SPLAT_TRANSFORM', 'splat-transform')
    out = os.path.join(repo, 'prototypes', 'splats', 'cands'); os.makedirs(out, exist_ok=True)
    idx_path = os.path.join(out, 'index.json')
    idx = json.load(open(idx_path)) if os.path.exists(idx_path) else []
    save = lambda: json.dump(idx, open(idx_path, 'w'), indent=1)
    if pose == '--previews':
        raw = list(idx); idx.clear()
        for c in raw:
            finish(out, idx, c, st); save(); print('preview', c['name'], flush=True)
        return
    inputs = sorted(f for f in glob.glob(os.path.join(repo, 'tools', 'splats', 'inputs', f'{pose}-*.png')) if flt in os.path.basename(f))
    if not inputs: sys.exit(f'no inputs: tools/splats/inputs/{pose}-*{flt}*.png')
    from idol.pipeline import IdolPipeline
    pipe = IdolPipeline.from_pretrained('speridlabs/idol')
    done = len([c for c in idx if c['pose'] == pose])
    for i in range(count):
        n = done + i + 1
        img = inputs[i % len(inputs)]
        seed, cfg = random.randrange(1, 100000), CFGS[i % len(CFGS)]
        name = f'{pose}-{n}'
        t = time.time()
        o = pipe(img, mode=os.environ.get('MODE', 'synthetic'), seed=seed, cfg_strength=cfg, num_gaussians=262144)
        o.gaussian.save_ply(os.path.join(out, name + '.ply'))
        o.preprocessed_image.resize((256, 256)).save(os.path.join(out, name + '.png'))
        finish(out, idx, {'name': name, 'pose': pose, 'input': os.path.basename(img), 'seed': seed, 'cfg': cfg, 'mode': os.environ.get('MODE', 'synthetic')}, st); save()
        print(f'{name}: {os.path.basename(img)} seed {seed} cfg {cfg} ({time.time() - t:.0f} s)', flush=True)

if __name__ == '__main__':
    a = sys.argv[1:]
    main(a[0], int(a[1]) if len(a) > 2 and a[1] else 8, a[2] if len(a) > 3 else '', a[-1])
