# fit_pose.py: fits the skeleton to an AI pose mesh, so the wrap that follows only has small moves left
# (headless Blender 5.2; a tuning tool: its output is pasted into the pose tables in anim_cat.py).
#
# 1. Loads targets/<pose>.ply, placed in cat units by prep_targets.py (the head is the ruler: it is the same size
#    in every pose), with the head's place in it (<pose>.json): the posed head is pulled there point to point.
# 2. Coordinate descent over a pose's free parameters (body tilt, squash, spine bends, leg swings and lengths)
#    minimising a two-way distance between the posed body (tail and whiskers left out) and the target. The head
#    keeps its size (it counter-scales the body squash) and the cat is lifted so his lowest point is on the floor.
# 3. Writes the best parameters to work/fit-<pose>.json and an overlay render to work/scratch/fitpose-<pose>.png.
#
# Run: blender -b work/cat_rig.blend --python fit_pose.py -- <pose> [rounds] [target]   pose: loaf | sleep | stretch
import bpy, sys, os, json, math
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index("--") + 1:]
POSE = args[0]
ROUNDS = int(args[1]) if len(args) > 1 else 8
TNAME = args[2] if len(args) > 2 else POSE       # which prepared target: targets/<TNAME>.ply
sys.argv = sys.argv[:sys.argv.index("--") + 1] + [os.path.join(HERE, "work"), "none"]
sys.path.insert(0, HERE)
import anim_cat as AC
import wrap_util as WU
log = AC.log

# free parameters: name -> (start, step, lo, hi). Mirrored limbs share one value (thigh splay flips sign).
PARAMS = {
    "loaf": AC.FIT_LOAF, "sleep": AC.FIT_SLEEP, "stretch": AC.FIT_STRETCH,
}[POSE]
pose_fn = {"loaf": AC.lie_from, "sleep": AC.sleep_from, "stretch": AC.bow_from}[POSE]

body = bpy.data.objects["cat_body"]; me = body.data
nv = len(me.vertices)
P0 = pose_fn({k: v[0] for k, v in PARAMS.items()})
for m in list(P0):
    if m.startswith("@"): P0.pop(m)
posed, A, W = AC.posed_state(P0)
normals = AC.posed_normals(P0)
tv, tf = WU.load_ply(os.path.join(AC.TARGETS, TNAME + ".ply"))            # prep_targets.py: already in cat units
place = json.load(open(os.path.join(AC.TARGETS, TNAME + ".json")))
rest = np.array([v.co[:] for v in me.vertices])
tmask = (W["head"] + W["ear"] > 0.85) & (rest[:, 2] > 0.5)                 # head above the cheeks, plus ears
head_goal = rest[tmask] @ np.array(place["R"]).T + np.array(place["t"])   # where each head vertex should land
log(f"{POSE}: target in cat units, {np.round(tv.min(0), 3)} .. {np.round(tv.max(0), 3)}")
bvh = BVHTree.FromPolygons([Vector(p) for p in tv], tf, all_triangles=False)
rng = np.random.default_rng(0)
tsamp = tv[rng.choice(len(tv), min(4000, len(tv)), replace=False)]

# which cat vertices take part: everything but the tail (posed by its own path) and ears (they flop)
use = (W["tail"] < 0.3) & (W["ear"] < 0.3)
vsub = rng.choice(np.nonzero(use)[0], 2500, replace=False)
hidx = np.nonzero(tmask)[0]
hpick = rng.choice(len(hidx), 400, replace=False)
hsub, hgoal = hidx[hpick], head_goal[hpick]
# target points near the target's tail can't be matched by the body: the trimmed means drop the worst 12%

def evaluated():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg).to_mesh()
    co = np.empty(len(ev.vertices) * 3); ev.vertices.foreach_get("co", co)
    body.evaluated_get(dg).to_mesh_clear()
    return co.reshape(-1, 3)

# where the tail should leave the body: the target's rearmost midline point in the pose's tail band (loaf, sleep:
# low on the rump; stretch: the top of the raised rump)
zlo, zhi = AC.TAIL_EXIT_BAND[POSE]
band = tv[(np.abs(tv[:, 0]) < 0.08) & (tv[:, 2] > zlo) & (tv[:, 2] < zhi)]
tail_exit = band[np.argmax(band[:, 1])] - np.array([0, 0.02, 0])
log(f"tail exit {np.round(tail_exit, 3)}")
SELF_W = float(os.environ.get("FIT_SELF", 0.0004))
TAIL_W = float(os.environ.get("FIT_TAIL", 1.0))
polys = [tuple(p.vertices) for p in me.polygons]
psets = [set(p) for p in polys]

def self_hits(x):
    """Body triangles crossing other body triangles (pairs sharing a vertex don't count), like check_clips."""
    bt = BVHTree.FromPolygons([Vector(p) for p in x], polys, all_triangles=False)
    return sum(1 for a, b in bt.overlap(bt) if a < b and not (psets[a] & psets[b]))

def trimmed(d, keep=0.88):
    d = np.sort(d)
    return float(d[: int(len(d) * keep)].mean())

def cost(vals, detail=False):
    P = pose_fn(vals)
    for m in list(P):
        if m.startswith("@"): P.pop(m)
    AC.apply(P)
    x = evaluated()
    zshift = x[use, 2].min()
    x[:, 2] -= zshift                                  # grounded
    a = np.array([bvh.find_nearest(Vector(p))[3] for p in x[vsub]])
    kd = KDTree(len(vsub))
    for i, p in enumerate(x[vsub]):
        kd.insert(p, i)
    kd.balance()
    b = np.array([kd.find(p)[2] for p in tsamp])
    h = np.linalg.norm(x[hsub] - hgoal, axis=1)
    c = trimmed(a) + trimmed(b) + 2 * trimmed(h, 0.9) + 0.3 * max(0.0, 0.75 - vals["sy"])   # no pancakes
    c += SELF_W * self_hits(x)            # crumpled skin (the wrap can't iron out a fold)
    # the tail must leave the body where the target's rump is (else the grown rump swallows its root)
    root = np.array((AC.rig.matrix_world @ AC.PB["tail_1"].head)[:]); root[2] -= zshift
    c += TAIL_W * float(np.linalg.norm(root - tail_exit))
    if detail:
        return c, trimmed(a), trimmed(b), trimmed(h, 0.9), self_hits(x)
    return c

vals = {k: v[0] for k, v in PARAMS.items()}
steps = {k: v[1] for k, v in PARAMS.items()}
best = cost(vals)
log(f"start cost {best:.4f}", cost(vals, True))
# (1+1) evolution strategy over all parameters at once (escapes the local minima coordinate steps get stuck in),
# step size adapted by the 1/5 success rule
ES = int(os.environ.get("FIT_ES", 500))
start_vals, start_best = dict(vals), best
results = []
for restart in range(3):
  rng = np.random.default_rng(restart + 10)
  vals, best = dict(start_vals), start_best
  sig, wins = 1.5, 0
  for i in range(ES):
    trial = {k: min(PARAMS[k][3], max(PARAMS[k][2], vals[k] + sig * steps[k] * rng.normal())) for k in vals}
    c = cost(trial)
    if c < best:
        best, vals, wins = c, trial, wins + 1
    if i % 20 == 19:
        sig *= 1.5 if wins > 4 else 0.7
        wins = 0
  log(f"es restart {restart}: cost {best:.4f}")
  results.append((best, vals))
best, vals = min(results, key=lambda r: r[0])
for r in range(ROUNDS):
    improved = False
    for k, (_, _, lo, hi) in PARAMS.items():
        for sgn in (1, -1):
            trial = dict(vals); trial[k] = min(hi, max(lo, vals[k] + sgn * steps[k]))
            if trial[k] == vals[k]:
                continue
            c = cost(trial)
            if c < best - 1e-5:
                best, vals, improved = c, trial, True
                break
    log(f"round {r}: cost {best:.4f}", {k: round(v, 3) for k, v in vals.items()})
    if not improved:
        steps = {k: v / 2 for k, v in steps.items()}
log("final", cost(vals, True))
json.dump(dict(pose=POSE, target=TNAME, params=vals, cost=best), open(os.path.join(HERE, "work", f"fit-{TNAME}.json"), "w"), indent=1, default=float)

# overlay: target (red) over the fitted cat (grey)
P = pose_fn(vals)
for m in list(P):
    if m.startswith("@"): P.pop(m)
AC.apply(P)
AC.OUT = os.path.join(HERE, "work")
for o in bpy.data.objects:
    if o.type == 'EMPTY': o.hide_render = True
AC.fit_overlay(tv - np.array([0, 0, 0]), tf, f"scratch/fitpose-{TNAME}.png")
