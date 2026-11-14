# scan_clips.py: a fast diagnostic for clipping (headless Blender 5.2). Evaluates clips (or pose functions) straight
# from anim_cat.py's tables with pose_at (no bake needed, every frame), and per bad frame prints the crossing body
# triangles by part (arm_L, tail, head...), the blend-shape weights, and the volume dip. check_clips.py stays the check;
# this is for finding out why. OVR (env) is Python run after anim_cat.py loads, to try a change without editing it:
# redefined pose functions are picked up by CLIPS, CLIP_OVR = {name: clip tuple} swaps whole clips.
#   blender -b work/cat_anim.blend --python scan_clips.py -- sit_to_lie,LIE_ANTIC [step]
#   OVR='LOAF_V = tweak(LOAF_V, arm=5)' blender -b work/cat_anim.blend --python scan_clips.py -- lie_to_sit
import bpy, sys, os, collections, numpy as np
extra = sys.argv[sys.argv.index("--") + 1:]
sys.argv = sys.argv[:sys.argv.index("--") + 1] + ["work", "none"]
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); __file__ = os.path.join(HERE, "anim_cat.py"); exec(open(__file__).read())
from mathutils.bvhtree import BVHTree
if os.environ.get("OVR"):
    exec(os.environ["OVR"])
    _g = globals()
    CLIPS = [(n, k, [(t, _g[fn.__name__] if fn.__name__ in _g and fn.__name__ != "<lambda>" else fn, e) for t, fn, e in keys]) for n, k, keys in CLIPS]
    if "CLIP_OVR" in _g: CLIPS = [CLIP_OVR.get(c[0], c) for c in CLIPS]
body = bpy.data.objects["cat_body"]; wob = bpy.data.objects["cat_whiskers"]
if rig.animation_data:
    rig.animation_data.action = None
    for tr in rig.animation_data.nla_tracks: tr.mute = True
k0 = body.data.shape_keys
if k0 and k0.animation_data:
    k0.animation_data.action = None
    for tr in k0.animation_data.nla_tracks: tr.mute = True
gname = [g.name for g in body.vertex_groups]
dom = []
for v in body.data.vertices:
    g = max(v.groups, key=lambda g: g.weight) if v.groups else None
    nm = gname[g.group] if g else "?"
    dom.append(nm if nm[-2:] in ("_L", "_R") else nm.split("_")[0])
names = extra[0].split(",")
step = int(extra[1]) if len(extra) > 1 else 1
CL = {c[0]: c for c in CLIPS}
total = 0
def hits():
    dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg).to_mesh()
    V = [v.co.copy() for v in ev.vertices]; P = [tuple(p.vertices) for p in ev.polygons]; body.evaluated_get(dg).to_mesh_clear()
    bt = BVHTree.FromPolygons(V, P, all_triangles=False); S = [set(p) for p in P]
    pairs = [(a, b) for a, b in bt.overlap(bt) if a < b and not (S[a] & S[b])]
    c = collections.Counter(tuple(sorted((collections.Counter(dom[i] for i in P[a]).most_common(1)[0][0],
                                          collections.Counter(dom[i] for i in P[b]).most_common(1)[0][0]))) for a, b in pairs)
    spots = [tuple(round(x, 2) for x in (sum((V[i] for i in P[a]), V[0] * 0) / len(P[a]))) for a, b in pairs]
    return len(pairs), c, spots
for name in names:
    if name not in CL:
        apply(globals()[name]()); n_, c, spots = hits(); s, w, fl = U.collisions(rig, body, wob)
        print(f"POSE {name:15s} self {n_} whisk {w} floor {fl:+.3f} {dict(c)} at {sorted(set(spots))[:6]}", flush=True)
        continue
    _, kind, keys = CL[name]
    poses = [(t, fn(), e) for t, fn, e in keys]
    Tmain, n = clip_length(kind, keys)
    bones = BONES if kind != "add" else [b for b in BONES if b in ADD_BONES]
    mlist = morphs() if kind != "add" else []
    rows = []
    worst = 0
    vols = []
    for f in range(0, n + 1, step):
        pose_at(kind, poses, Tmain, f / FPS, bones, mlist)
        bpy.context.view_layer.update()
        dg = bpy.context.evaluated_depsgraph_get(); ev = body.evaluated_get(dg).to_mesh()
        V = [v.co.copy() for v in ev.vertices]; P = [tuple(p.vertices) for p in ev.polygons]; body.evaluated_get(dg).to_mesh_clear()
        bt = BVHTree.FromPolygons(V, P, all_triangles=False); S = [set(p) for p in P]
        pairs = [(a, b) for a, b in bt.overlap(bt) if a < b and not (S[a] & S[b])]
        s, w, fl = U.collisions(rig, body, wob)
        X = np.array([tuple(v) for v in V]); TR = np.array([p[:3] for p in P if len(p) == 3] + [(p[0], p[2], p[3]) for p in P if len(p) == 4] + [p[:3] for p in P if len(p) == 4])
        vols.append(float(np.einsum("ij,ij->i", X[TR[:, 0]], np.cross(X[TR[:, 1]], X[TR[:, 2]])).sum() / 6))
        if pairs or w or fl < -0.01:
            c = collections.Counter(tuple(sorted((collections.Counter(dom[i] for i in P[a]).most_common(1)[0][0],
                                                  collections.Counter(dom[i] for i in P[b]).most_common(1)[0][0]))) for a, b in pairs)
            kb = body.data.shape_keys.key_blocks if body.data.shape_keys else {}
            rows.append(f"f{f}:{len(pairs)}" + "[" + "/".join(f"{k.value:.2f}" for k in kb if k.name != "Basis") + "]" + (f"w{w}" if w else "") + (f"fl{fl:.3f}" if fl < -0.01 else "") + str(dict(c.most_common(3))))
            worst = max(worst, len(pairs) + w)
    total += worst
    vr = np.array(vols) / min(vols[0], vols[-1]); lowf = [i * step for i, v in enumerate(vr) if v < 0.92]
    if lowf: total += 1
    print(f"SCAN {name:15s} frames {n+1:3d} worst {worst:4d} vol {vr.min():.3f}" + (f" COLLAPSE {lowf}" if lowf else "") + " " + (" ".join(rows) if rows else "CLEAN"), flush=True)
print("SCAN total", total)
