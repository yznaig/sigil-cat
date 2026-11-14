# check_clips.py: the no-clipping check for every baked clip (headless Blender 5.2).
# For sampled frames of every clip it measures, on the deformed meshes:
#   self   body triangles that cross other body triangles (pairs sharing a vertex don't count)
#   whisk  whisker triangles more than U.WHISKER_ROOT from their posed root that cross the body or another whisker
#   floor  how far the lowest body vertex dips under the floor (z < 0)
#   volume the body's enclosed volume every frame: a transition must not dip more than VOL_DIP below the smaller
#          of its two end poses (a collapse)
#   pop    the largest vertex move between consecutive frames: a frame is a pop when it moves more than POP_FLOOR
#          and more than POP_REL times both neighbouring frames (a spike, not just fast motion)
# and renders contact sheets: rows = sampled frames, columns = 8 angles (every 45 degrees), shaded grey
# so creases show. Writes <outdir>/clip-check.json and <outdir>/contact-<clip>.jpg.
# Run: blender -b work/cat_anim.blend --python check_clips.py -- <outdir> [frames-per-sheet] [clip,clip]
import bpy, bmesh, sys, os, json, math, time
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_util as U

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
NSHEET = int(argv[1]) if len(argv) > 1 else 6
ONLY = argv[2].split(",") if len(argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
T0 = time.time()

rig = bpy.data.objects["cat_rig"]
body = bpy.data.objects["cat_body"]
wob = bpy.data.objects["cat_whiskers"]
for o in bpy.data.objects:
    if o.type == 'EMPTY':
        o.hide_render = True
for tr in rig.animation_data.nla_tracks:
    tr.mute = True
clips = [tr.name for tr in rig.animation_data.nla_tracks]
if ONLY:
    clips = [c for c in clips if c in ONLY]

def measure():
    return U.collisions(rig, body, wob)

VOL_DIP, POP_REL, POP_FLOOR = 0.08, 2.5, 0.03
tris = np.array([t.vertices[:] for t in body.data.loop_triangles]) if body.data.loop_triangles else None
if tris is None:
    body.data.calc_loop_triangles(); tris = np.array([t.vertices[:] for t in body.data.loop_triangles])

def body_verts():
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg).to_mesh()
    co = np.empty(len(ev.vertices) * 3); ev.vertices.foreach_get("co", co)
    body.evaluated_get(dg).to_mesh_clear()
    return co.reshape(-1, 3)

def volume(x):
    a, b, c = x[tris[:, 0]], x[tris[:, 1]], x[tris[:, 2]]
    return float(np.einsum("ij,ij->i", a, np.cross(b, c)).sum() / 6)

cam = U.ortho_camera()
U.setup_workbench("shaded", 170)
report = {}
for name in clips:
    act = bpy.data.actions[name]
    rig.animation_data.action = act
    key = body.data.shape_keys
    if key:
        key.animation_data_create()
        key.animation_data.action = act
        slots = [sl for sl in act.slots if sl.target_id_type == 'KEY']
        if slots:
            key.animation_data.action_slot = slots[0]
    f0, f1 = (int(x) for x in act.frame_range)
    frames = list(range(f0, f1 + 1, 2))
    if frames[-1] != f1:
        frames.append(f1)
    worst = dict(self=0, whisk=0, floor=1.0)
    bad = []
    # volume and pops: every frame
    vols, moves, prev_x = [], [], None
    for f in range(f0, f1 + 1):
        bpy.context.scene.frame_set(f)
        x = body_verts()
        vols.append(volume(x))
        if prev_x is not None:
            moves.append(float(np.linalg.norm(x - prev_x, axis=1).max()))
        prev_x = x
    vols, moves = np.array(vols), np.array(moves)
    vol_floor = min(vols[0], vols[-1]) * (1 - VOL_DIP)
    med = float(np.median(moves)) if len(moves) else 0.0
    # a pop is a spike: one frame moving far more than the frames either side of it (fast motion isn't a pop)
    pops = [int(f0 + 1 + i) for i, m in enumerate(moves)
            if m > POP_FLOOR and m > POP_REL * max(moves[i - 1] if i > 0 else 0, moves[i + 1] if i + 1 < len(moves) else 0)]
    collapse = [int(f0 + i) for i, v in enumerate(vols) if v < vol_floor]
    worst["vol_min_ratio"] = round(float(vols.min() / min(vols[0], vols[-1])), 3)
    worst["max_move"] = round(float(moves.max()) if len(moves) else 0.0, 4)
    if pops:
        bad.append(dict(pops=pops[:20]))
    if collapse:
        bad.append(dict(collapse=collapse[:20]))
    for f in frames:
        bpy.context.scene.frame_set(f)
        s, w, fl = measure()
        worst["self"] = max(worst["self"], s); worst["whisk"] = max(worst["whisk"], w)
        worst["floor"] = min(worst["floor"], fl)
        if s or w or fl < -0.01:
            bad.append(dict(frame=f, self=s, whisk=w, floor=round(fl, 4)))
    # contact sheet: NSHEET frames spread over the clip (always first and last)
    sheet_frames = sorted(set(round(f0 + (f1 - f0) * i / (NSHEET - 1)) for i in range(NSHEET)))
    rows = []
    for f in sheet_frames:
        bpy.context.scene.frame_set(f)
        row = []
        for yaw in range(0, 360, 45):
            U.aim(cam, yaw, 12, (0, 0.10, 0.42), scale=1.75)
            p = os.path.join(OUT, "_tmp.png")
            a = U.render_to_array(p)
            row.append(U.label(a, f"{name} f{f} {yaw}" if yaw == 0 else f"{yaw}"))
        rows.append(row)
    U.save_grid(rows, os.path.join(OUT, f"contact-{name}.jpg"))
    report[name] = dict(frames_checked=len(frames), sheet_frames=sheet_frames, worst=worst, bad=bad,
                        ok=not bad)
    print(f"[check {time.time()-T0:6.1f}s] {name:15s} frames {len(frames):3d} self {worst['self']:4d} "
          f"whisk {worst['whisk']:3d} floor {worst['floor']:+.4f} vol {worst['vol_min_ratio']:.3f} "
          f"move {worst['max_move']:.3f} {'OK' if not bad else 'BAD ' + str(bad[:6])}",
          flush=True)
if os.path.exists(os.path.join(OUT, "_tmp.png")):
    os.remove(os.path.join(OUT, "_tmp.png"))
# rest pose baseline
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
bpy.context.view_layer.update()
s, w, fl = measure()
report["_rest"] = dict(self=s, whisk=w, floor=round(fl, 4))
print("[check] rest pose", report["_rest"])
prev = {}
path = os.path.join(OUT, "clip-check.json")
if ONLY and os.path.exists(path):
    prev = json.load(open(path))
prev.update(report)
json.dump(prev, open(path, "w"), indent=1)
