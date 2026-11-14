# build_cat.py: stage 2 of the Sigil Cat build (headless Blender 5.2).
# Takes stage 1's dense body (work/body_sdf.ply) and whisker centerlines (work/whiskers.json) and builds:
#   cat_body      one watertight quad shell, ~20k triangles (QuadriFlow), shade smooth
#   cat_whiskers  six constant-thickness curved tubes with round ends, each skinned 100% to its own bone
#   cat_rig       ~33-bone chibi skeleton, bone-heat weights + numpy smoothing, 4 influences
#   butter_socket an Empty on the head bone
# Rest pose is the sheet's sitting pose (the AI mesh's pose). Height 1.0, floor z=0, facing -Y.
# Run: blender -b --factory-startup --python build_cat.py -- <work dir> <out.blend>
import bpy, bmesh, math, sys, os, json, time
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_util as U

T0 = time.time()
def log(*a):
    print(f"[build {time.time()-T0:6.1f}s]", *a, flush=True)

argv = sys.argv[sys.argv.index("--") + 1:]
WORK, OUT = argv[0], argv[1]

SCALE = 0.5
QUADS = 10000            # quads -> ~2x triangles
WHISKER_R = 0.0155       # bold strokes, about the ear tip's thickness (Aaron, via review)
WHISKER_SWEEP = 25       # degrees swept toward the front, so from the side they read as strokes, not a line
WHISKER_FAN = 7          # extra degrees: top whisker up, bottom whisker down
WHISKER_SEG = 8
WHISKER_OUT = 0.15       # how far each whisker reaches beyond the cheek
SMOOTH_ITERS = 8
HEAD_FIRM = (0.35, 0.43)
EAR_BAND = (0.72, 0.80)   # rest height band where the ear bones take over from the head (ear base ~0.78)  # rest height band where weights hand over to the head (neck crease is at 0.36)

U.clear_scene()
scn = bpy.context.scene
col = scn.collection

# ------------------------------------------------------------------ body
bpy.ops.wm.ply_import(filepath=os.path.join(WORK, "body_sdf.ply"), forward_axis='Y', up_axis='Z')
body = [o for o in scn.objects if o.type == 'MESH'][0]
body.name = "cat_body"; body.data.name = "cat_body"
zmin = min(v.co.z for v in body.data.vertices)
body.data.transform(Matrix.Diagonal((SCALE, SCALE, SCALE, 1)) @ Matrix.Translation((0, 0, -zmin)))
bpy.context.view_layer.objects.active = body
body.select_set(True)

dm = body.modifiers.new("dec", 'DECIMATE'); dm.ratio = 160000 / len(body.data.polygons)
bpy.ops.object.modifier_apply(modifier="dec")
log("decimated to", len(body.data.polygons))
r = bpy.ops.object.quadriflow_remesh(target_faces=QUADS, use_mesh_symmetry=True, use_preserve_sharp=False,
                                     use_preserve_boundary=False, smooth_normals=False, mode='FACES', seed=7)
log("quadriflow", r, len(body.data.polygons), "faces")
# a light relax to even out QuadriFlow's slight waviness without shrinking the silhouette
sm = body.modifiers.new("smooth", 'CORRECTIVE_SMOOTH'); sm.factor = 0.5; sm.iterations = 4
sm.smooth_type = 'LENGTH_WEIGHTED'; sm.use_only_smooth = True; sm.rest_source = 'ORCO'
bpy.ops.object.modifier_apply(modifier="smooth")
bpy.ops.object.shade_smooth()
health = U.mesh_health(body.data)
log("body", health)

# ------------------------------------------------------------------ whiskers
bm = bmesh.new(); bm.from_mesh(body.data)
bvh = BVHTree.FromBMesh(bm); bm.free()

def inside(p):
    loc, nrm, _, _ = bvh.find_nearest(p)
    return (p - loc).dot(nrm) < 0, (p - loc).length

def fit_curve(pts):
    """Quadratic least-squares fit by chord length: a clean, even curve through the voxel centerline."""
    P = np.array(pts)
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
    t = d / d[-1]
    coef = [np.polyfit(t, P[:, i], 2) for i in range(3)]
    return lambda tt: Vector([np.polyval(c, tt) for c in coef]), d[-1]

def tube(points, r, seg):
    """Constant-radius tube along points with hemispherical caps at both ends (watertight)."""
    bm = bmesh.new()
    n = len(points)
    tang = [(points[min(i + 1, n - 1)] - points[max(i - 1, 0)]).normalized() for i in range(n)]
    ref = Vector((0, 0, 1))
    nrm = tang[0].cross(ref).cross(tang[0]).normalized() if abs(tang[0].dot(ref)) < 0.9 else Vector((1, 0, 0))
    frames = []
    for i in range(n):   # parallel transport
        if i:
            nrm = (nrm - tang[i] * nrm.dot(tang[i])).normalized()
        frames.append((nrm.copy(), tang[i].cross(nrm).normalized()))
    def ring(c, f, rad):
        return [bm.verts.new(c + (f[0] * math.cos(2 * math.pi * k / seg) + f[1] * math.sin(2 * math.pi * k / seg)) * rad)
                for k in range(seg)]
    caps = 3
    rings = []
    # start cap (rings shrinking backward), body rings, end cap
    for j in range(caps, 0, -1):
        a = math.pi / 2 * j / (caps + 1)
        rings.append(ring(points[0] - tang[0] * r * math.sin(a), frames[0], r * math.cos(a)))
    for i in range(n):
        rings.append(ring(points[i], frames[i], r))
    for j in range(1, caps + 1):
        a = math.pi / 2 * j / (caps + 1)
        rings.append(ring(points[-1] + tang[-1] * r * math.sin(a), frames[-1], r * math.cos(a)))
    for a, b in zip(rings[:-1], rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    p0 = bm.verts.new(points[0] - tang[0] * r)
    p1 = bm.verts.new(points[-1] + tang[-1] * r)
    for k in range(seg):
        bm.faces.new((rings[0][(k + 1) % seg], rings[0][k], p0))
        bm.faces.new((rings[-1][k], rings[-1][(k + 1) % seg], p1))
    return bm

wdata = json.load(open(os.path.join(WORK, "whiskers.json")))["whiskers"]
xf = lambda p: Vector(((p[0]) * SCALE, p[1] * SCALE, (p[2] - zmin) * SCALE))
whiskers = []   # (name, root, tip, points)
for w in wdata:
    side = "L" if w["side"] > 0 else "R"          # cat's left is +X (it faces -Y)
    curve, length = fit_curve([xf(p) for p in w["line"]])
    # walk inward from the innermost point until the centerline is 0.012 under the cheek surface
    t_in = 0.0
    while t_in > -3.0:
        ok, dist = inside(curve(t_in))
        if ok and dist > 0.012:
            break
        t_in -= 0.02
    # reach: extend outward until the tip is WHISKER_OUT beyond the cheek
    t_out = 1.0
    while t_out < 3.0:
        ok, dist = inside(curve(t_out))
        if not ok and dist >= WHISKER_OUT:
            break
        t_out += 0.02
    pts = [curve(t_in + (t_out - t_in) * i / 17) for i in range(18)]
    whiskers.append(dict(side=side, y=w["y"], root=pts[0], tip=pts[-1], pts=pts))
for side in "LR":
    ws = sorted([w for w in whiskers if w["side"] == side], key=lambda w: -w["y"])
    for i, w in enumerate(ws):
        w["name"] = f"whisker_{side}{i + 1}"     # 1 = top
from mathutils import Matrix as _M
for w in whiskers:
    sgn = 1 if w["side"] == "L" else -1
    k = {"1": 1, "2": 0, "3": -1}[w["name"][-1]]
    R = _M.Rotation(math.radians(-sgn * WHISKER_SWEEP), 3, 'Z') @ _M.Rotation(math.radians(-sgn * k * WHISKER_FAN), 3, 'Y')
    w["pts"] = [w["root"] + R @ (p - w["root"]) for p in w["pts"]]
    w["tip"] = w["pts"][-1]
log("whiskers", [(w["name"], [round(c, 3) for c in w["root"]], [round(c, 3) for c in w["tip"]]) for w in whiskers])

wbm = bmesh.new()
wme = bpy.data.meshes.new("cat_whiskers")
for w in whiskers:
    t = tube(w["pts"], WHISKER_R, WHISKER_SEG)
    tmp = bpy.data.meshes.new("tmp"); t.to_mesh(tmp); t.free()
    w["vstart"] = len(wbm.verts)
    wbm.from_mesh(tmp)
    w["vend"] = len(wbm.verts)
    bpy.data.meshes.remove(tmp)
wbm.to_mesh(wme); wbm.free()
wob = bpy.data.objects.new("cat_whiskers", wme); col.objects.link(wob)
for p in wme.polygons:
    p.use_smooth = True
log("whisker mesh", U.mesh_health(wme))

# ------------------------------------------------------------------ armature
arm = bpy.data.armatures.new("cat_rig")
rig = bpy.data.objects.new("cat_rig", arm); col.objects.link(rig)
bpy.context.view_layer.objects.active = rig
for o in scn.objects:
    o.select_set(o is rig)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.edit_bones

def bone(name, head, tail, parent=None, connect=False, deform=True, roll_x=True):
    b = eb.new(name); b.head = head; b.tail = tail; b.use_deform = deform
    if parent:
        b.parent = eb[parent]; b.use_connect = connect
    if roll_x:   # local X = world +X, so rotating about X is pitch on every centerline bone
        v = (Vector(tail) - Vector(head)).normalized()
        z = Vector((1, 0, 0)).cross(v)
        if z.length > 1e-4:
            b.align_roll(z)
    return b

# Squash and stretch live on `cog` (head at the floor): scale it and the whole cat squashes onto the floor.
bone("root", (0, 0, 0), (0, 0, 0.08), deform=False)
bone("cog", (0, 0.02, 0.0), (0, 0.02, 0.14), "root", deform=False)
bone("hips", (0, 0.12, 0.09), (0, 0.04, 0.20), "cog")
bone("spine", (0, 0.04, 0.20), (0, -0.01, 0.30), "hips", True)
# chest not connected: the stretch and loaf slide the shoulders (chest, arms, head) forward off the hips, rubber-hose
bone("chest", (0, -0.01, 0.30), (0, -0.02, 0.38), "spine", False)
bone("neck", (0, -0.02, 0.38), (0, -0.015, 0.46), "chest", True)
# head not connected: the sheet poses slide it forward and down off the body (loaf, sleep); the neck skin stretches
bone("head", (0, -0.015, 0.46), (0, -0.015, 0.80), "neck", False)
for s, side in ((1, "L"), (-1, "R")):
    bone(f"ear_{side}", (0.175 * s, -0.035, 0.80), (0.236 * s, -0.045, 0.985), "head")
    # front-leg pivot low (z 0.17): a leg swung forward then lies well under the chin (pivot at 0.27 hit it)
    bone(f"arm_{side}", (0.10 * s, -0.15, 0.17), (0.10 * s, -0.21, 0.08), "chest")
    bone(f"paw_{side}", (0.10 * s, -0.21, 0.08), (0.10 * s, -0.32, 0.05), f"arm_{side}", True)
    bone(f"thigh_{side}", (0.19 * s, 0.14, 0.19), (0.27 * s, -0.06, 0.10), "hips")
    bone(f"foot_{side}", (0.27 * s, -0.06, 0.10), (0.27 * s, -0.20, 0.05), f"thigh_{side}", True)
for w in whiskers:
    bone(w["name"], w["root"], w["tip"], "head", roll_x=False)

# tail: 8 bones along the rest tail (stage 1's TAIL, in these units)
TAIL = [Vector(p) for p in [(0, 0.21, 0.1036), (0, 0.39, 0.1036), (0, 0.56, 0.1336), (0, 0.72, 0.1836), (0, 0.86, 0.2536)]]
TAIL.append(TAIL[-1] + (TAIL[-1] - TAIL[-2]).normalized() * 0.05)   # into the round tip
seg = [(TAIL[i + 1] - TAIL[i]).length for i in range(len(TAIL) - 1)]
L = sum(seg)
def along(d):
    for i, sl in enumerate(seg):
        if d <= sl or i == len(seg) - 1:
            return TAIL[i].lerp(TAIL[i + 1], min(d / sl, 1.0))
        d -= sl
NT = 8
TAIL_START = 0.09   # first tail joint sits at the rump surface (y ~0.30), not deep inside the body
tp = [along(TAIL_START + (L - TAIL_START) * i / NT) for i in range(NT + 1)]
prev = "hips"
for i in range(NT):
    bone(f"tail_{i + 1}", tp[i], tp[i + 1], prev, i > 0)
    prev = f"tail_{i + 1}"
# end bones: tiny non-deforming children at the tips of leaf bones, so three.js knows each bone's direction
# and length (glTF stores joints, not bone tails). The springs aim these.
for name in ["ear_L", "ear_R", "tail_8"] + [w["name"] for w in whiskers]:
    b = eb[name]
    d = (b.tail - b.head).normalized()
    bone(name + "_end", b.tail, b.tail + d * 0.02, name, True, deform=False, roll_x=False)
bpy.ops.object.mode_set(mode='OBJECT')
log("bones", len(arm.bones))

# ------------------------------------------------------------------ bind
deform_bones = [b.name for b in arm.bones if b.use_deform and not b.name.startswith("whisker")]
for b in arm.bones:     # bone heat only for body bones
    b.use_deform = b.name in deform_bones
for o in scn.objects:
    o.select_set(o in (body, rig))
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
for b in arm.bones:
    b.use_deform = b.name not in ("root", "cog") and not b.name.endswith("_end")
me = body.data
unweighted = sum(1 for v in me.vertices if not any(g.weight > 1e-4 for g in v.groups))
log("bone heat done; unweighted", unweighted)

# smooth the weights over the edge graph (vertex_group_smooth won't run headless)
groups = [vg.name for vg in body.vertex_groups]
nv, ng = len(me.vertices), len(groups)
W = np.zeros((nv, ng))
for v in me.vertices:
    for g in v.groups:
        W[v.index, g.group] = g.weight
if unweighted:   # give stragglers their nearest weighted neighbour's weights
    log("WARNING unweighted verts present")
ed = np.array([e.vertices[:] for e in me.edges])
deg = np.bincount(ed.ravel(), minlength=nv).astype(float)
for _ in range(SMOOTH_ITERS):
    acc = np.zeros_like(W)
    np.add.at(acc, ed[:, 0], W[ed[:, 1]]); np.add.at(acc, ed[:, 1], W[ed[:, 0]])
    W = 0.5 * W + 0.5 * acc / deg[:, None]
# The head moves as one firm ball: above the neck crease only head and ear weights count, blending in over
# the crease. Otherwise the lower cheeks follow the chest when the body squashes and bulge past the whiskers.
gidx = {vg.name: vg.index for vg in body.vertex_groups}
z = np.array([v.co.z for v in me.vertices])
# Ears own only the ears: below the ear base their weight goes to the head (bone heat bleeds them down the cheeks,
# so folding an ear back would drag the cheek into the whiskers).
ek = np.clip((z - EAR_BAND[0]) / (EAR_BAND[1] - EAR_BAND[0]), 0, 1)
ek = ek * ek * (3 - 2 * ek)
for n in ("ear_L", "ear_R"):
    moved = W[:, gidx[n]] * (1 - ek)
    W[:, gidx[n]] -= moved
    W[:, gidx["head"]] += moved
fam = [gidx[n] for n in ("head", "ear_L", "ear_R") if n in gidx]
z = np.array([v.co.z for v in me.vertices])
h = np.clip((z - HEAD_FIRM[0]) / (HEAD_FIRM[1] - HEAD_FIRM[0]), 0, 1)
h = h * h * (3 - 2 * h)
Wf = np.zeros_like(W)
Wf[:, fam] = W[:, fam]
s = Wf.sum(1)
Wf[s < 1e-6, gidx["head"]] = 1.0
Wf /= Wf.sum(1, keepdims=True)
W = (1 - h[:, None]) * W + h[:, None] * Wf
# keep the 4 biggest, renormalize
order = np.argsort(-W, axis=1)
keep = np.zeros_like(W, bool)
np.put_along_axis(keep, order[:, :4], True, axis=1)
W = np.where(keep & (W > 0.01), W, 0)
W /= W.sum(1, keepdims=True)
for gi, vg in enumerate(body.vertex_groups):
    vg.remove(list(range(nv)))
    idx = np.nonzero(W[:, gi])[0]
    for i in idx:
        vg.add([int(i)], float(W[i, gi]), 'REPLACE')
log("weights smoothed, groups", ng)

# ---- creases (decision e1107-71: the sheet's paw balls, chin/neck crease, ear bases and haunch lines).
# A crease sits where two parts hand over, so its depth comes from the weights: 4 wA wB peaks at the hand-over
# line. The rest mesh is pushed in along its normal by that depth (the sit gets the creases), and the depth is kept
# as the `crease` attribute so anim_cat.py re-applies it to the sculpted pose shapes (the morph would smooth it
# away). The paw centres also bulge out a little, so they read as two round balls, not a row of bumps.
CREASES = dict(chin=0.012, ear=0.008, haunch=0.004)   # (a deeper haunch line folds the thigh into the body in the loaf)
PAW_R = 0.095                 # the sheet's front paws: two round balls side by side on the floor (front.png, main.png)
PAW_X = 0.105                 # ball centres this far either side (a little gap: the notch between them)
PAW_CREASE = 0.012            # where the balls meet the chest

def wsum(*names):
    return sum(W[:, gidx[n]] for n in names if n in gidx)

co0 = np.array([v.co[:] for v in me.vertices])
co = co0.copy()
me.update()
nrm = np.array([v.normal[:] for v in me.vertices])
# paw balls: paw-weighted skin pulled onto two spheres resting on the floor at the front
paw = wsum("paw_L", "paw_R")
yfront = co[paw > 0.5, 1].min()
for sx in (1, -1):
    c = np.array([sx * PAW_X, yfront + PAW_R, PAW_R])
    d = co - c; r = np.linalg.norm(d, axis=1)
    near = (r < 2.2 * PAW_R) & (np.sign(co[:, 0]) * sx >= -0.02)
    s_ = np.clip((paw - 0.15) / 0.5, 0, 1) * near
    s_ = s_ * s_ * (3 - 2 * s_)
    on = c + d / np.maximum(r, 1e-9)[:, None] * PAW_R
    co = co + (on - co) * s_[:, None]
    ring = np.exp(-((r - 1.25 * PAW_R) / (0.3 * PAW_R)) ** 2) * (paw < 0.4) * (co[:, 2] < 2.5 * PAW_R)
    co = co - nrm * (PAW_CREASE * ring)[:, None]
# the forearms above the balls flatten into the chest (else they stand out as two ridges above the paws)
forearm = wsum("arm_L", "arm_R") * (paw < 0.4)
for _ in range(12):
    acc = np.zeros_like(co); np.add.at(acc, ed[:, 0], co[ed[:, 1]]); np.add.at(acc, ed[:, 1], co[ed[:, 0]])
    co = co + (acc / deg[:, None] - co) * (0.5 * np.clip(forearm * 1.5, 0, 1))[:, None]
headish = wsum("head", "ear_L", "ear_R")
ears = wsum("ear_L", "ear_R")
thigh = wsum("thigh_L", "thigh_R", "foot_L", "foot_R")
side = np.clip((np.abs(co[:, 0]) - 0.12) / 0.08, 0, 1)                      # haunch lines only on the sides
front = np.clip((-co[:, 1] + 0.05) / 0.15, 0, 1)                           # chin crease: front and sides of the neck
depth = (CREASES["chin"] * 4 * headish * (1 - headish) * np.maximum(front, 0.4) * (1 - np.clip(ears * 4, 0, 1))
         + CREASES["ear"] * 4 * ears * (1 - ears) + CREASES["haunch"] * 4 * thigh * (1 - thigh) * side)
for _ in range(3):
    acc = np.zeros(nv); np.add.at(acc, ed[:, 0], depth[ed[:, 1]]); np.add.at(acc, ed[:, 1], depth[ed[:, 0]])
    depth = 0.5 * depth + 0.5 * acc / deg
co = co - nrm * depth[:, None]
for i, v in enumerate(me.vertices):
    v.co = co[i]
me.update()
inset = np.sum((co0 - co) * nrm, 1)          # how far each point went in (negative: out), for re-applying in poses
attr = me.attributes.new("crease", 'FLOAT', 'POINT')
attr.data.foreach_set("value", inset.astype(np.float32))
log(f"creases: deepest {inset.max():.4f}, paw balls out by up to {-inset.min():.4f}")

# ---- baked ambient occlusion (decision e1107-71): per vertex, rest pose, the body only (whiskers neither get it
# nor cast it). Exported as the glTF attribute _AO (0 = fully occluded, 1 = open); three.js reads it as `_ao`.
AO_RAYS, AO_DIST = 64, 0.25
from mathutils.bvhtree import BVHTree
me.update()
nrm = np.array([v.normal[:] for v in me.vertices])
bvh = BVHTree.FromPolygons([Vector(p) for p in co], [tuple(p.vertices) for p in me.polygons], all_triangles=False)
rng = np.random.default_rng(7)
u1, u2 = rng.random(AO_RAYS), rng.random(AO_RAYS)
local = np.stack([np.sqrt(u1) * np.cos(2 * np.pi * u2), np.sqrt(u1) * np.sin(2 * np.pi * u2), np.sqrt(1 - u1)], 1)
ao = np.zeros(nv)
for i in range(nv):
    n = nrm[i]
    a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
    t1 = np.cross(n, a); t1 /= np.linalg.norm(t1); t2 = np.cross(n, t1)
    dirs = local[:, :1] * t1 + local[:, 1:2] * t2 + local[:, 2:] * n
    o = Vector(co[i] + n * 0.002)
    hits = sum(1 for d in dirs if bvh.ray_cast(o, Vector(d), AO_DIST)[0] is not None)
    ao[i] = 1 - hits / AO_RAYS
for _ in range(2):
    acc = np.zeros(nv); np.add.at(acc, ed[:, 0], ao[ed[:, 1]]); np.add.at(acc, ed[:, 1], ao[ed[:, 0]])
    ao = 0.5 * ao + 0.5 * acc / deg
attr = me.attributes.new("_AO", 'FLOAT', 'POINT')
attr.data.foreach_set("value", ao.astype(np.float32))
log(f"AO baked: mean {ao.mean():.3f}, min {ao.min():.3f}")

# whiskers: rigid, one bone each
wob.parent = rig
for w in whiskers:
    vg = wob.vertex_groups.new(name=w["name"])
    vg.add(list(range(w["vstart"], w["vend"])), 1.0, 'REPLACE')
mod = wob.modifiers.new("rig", 'ARMATURE'); mod.object = rig

# butter_socket on top of the skull between the ears
sock = bpy.data.objects.new("butter_socket", None)
sock.empty_display_type = 'PLAIN_AXES'; sock.empty_display_size = 0.04
col.objects.link(sock)
sock.parent = rig; sock.parent_type = 'BONE'; sock.parent_bone = "head"
hb = arm.bones["head"]
tail_m = hb.matrix_local @ Matrix.Translation((0, hb.length, 0))
sock.matrix_parent_inverse = Matrix.Identity(4)
sock.matrix_basis = tail_m.inverted() @ Matrix.Translation((0, -0.02, 0.875))

# material: matte black (three.js replaces it with the felt material by name)
mat = bpy.data.materials.new("sigil_black")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (0.0060, 0.0060, 0.0060, 1)   # #121212 in linear
bsdf.inputs["Roughness"].default_value = 0.85
body.data.materials.append(mat)
# whiskers: their own smooth material (no felt grain; three.js swaps both by name)
wmat = bpy.data.materials.new("whisker_black")
wmat.use_nodes = True
wb = wmat.node_tree.nodes.get("Principled BSDF")
wb.inputs["Base Color"].default_value = (0.0060, 0.0060, 0.0060, 1)
wb.inputs["Roughness"].default_value = 0.6
wob.data.materials.append(wmat)

stats = dict(body=health, whiskers=U.mesh_health(wme), bones=len(arm.bones), unweighted=unweighted,
             tris=health["tris"] + U.mesh_health(wme)["tris"])
json.dump(stats, open(OUT.replace(".blend", "_stats.json"), "w"), indent=1)
log("stats", stats)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
log("saved", OUT)
