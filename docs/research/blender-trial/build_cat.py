# build_cat.py: stage 1 of the Claude-scripted Blender cat.
# Builds one watertight stylized cat mesh (metaballs + mesh ears/tail, voxel remesh, quadriflow/decimate),
# a 27-bone armature, binds with automatic (bone-heat) weights, adds butter_socket, saves cat_rig.blend.
# Run: blender -b --factory-startup --python build_cat.py -- <out.blend>
import bpy, bmesh, math, sys, time
from mathutils import Vector, Quaternion

T0 = time.time()
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/cat_rig.blend"
TARGET_FACES = int(argv[1]) if len(argv) > 1 else 6500   # quads -> ~2x triangles
SMOOTH_ITERS = int(argv[2]) if len(argv) > 2 else 6       # weight-smoothing passes after bone heat

K = 0.575  # surface radius per unit metaball radius at stiffness 2, threshold 0.6 (measured)

def log(*a):
    print(f"[build {time.time()-T0:6.1f}s]", *a, flush=True)

for o in list(bpy.data.objects):
    bpy.data.objects.remove(o)
scn = bpy.context.scene
col = scn.collection

# ---------------------------------------------------------------- shape (rest pose: standing, facing -Y, ground z=0)
# left = +X (cat faces -Y)
mb = bpy.data.metaballs.new("cat_mb")
mb.resolution = 0.012
mb.render_resolution = 0.012
mbo = bpy.data.objects.new("cat_mb", mb)
col.objects.link(mbo)

def ball(co, r, stiff=2.0):
    e = mb.elements.new(); e.type = 'BALL'; e.co = co; e.radius = r / K; e.stiffness = stiff

def capsule(a, b, r, stiff=2.0):
    a, b = Vector(a), Vector(b)
    e = mb.elements.new(); e.type = 'CAPSULE'
    e.co = (a + b) / 2
    e.size_x = (b - a).length / 2
    e.radius = r / K
    e.stiffness = stiff
    e.rotation = Vector((1, 0, 0)).rotation_difference((b - a).normalized())

# torso
capsule((0, -0.20, 0.56), (0, 0.18, 0.55), 0.150)
ball((0, -0.25, 0.58), 0.150)          # chest
ball((0, 0.20, 0.56), 0.140)           # rump
# neck + head
capsule((0, -0.33, 0.64), (0, -0.45, 0.77), 0.085)
ball((0, -0.49, 0.85), 0.150)          # cranium
ball((0, -0.60, 0.80), 0.075)          # muzzle bump
for s in (1, -1):
    ball((0.07 * s, -0.52, 0.82), 0.10)  # cheeks widen the head
# legs
for s in (1, -1):
    x = 0.095 * s
    # front: shoulder -> elbow -> wrist -> toe
    capsule((x, -0.27, 0.50), (x, -0.25, 0.28), 0.058)
    capsule((x, -0.25, 0.28), (x, -0.26, 0.07), 0.045)
    capsule((x, -0.26, 0.05), (x, -0.32, 0.04), 0.048)
    # hind: hip -> knee -> hock -> toe
    capsule((x, 0.21, 0.50), (x, 0.13, 0.31), 0.075)
    capsule((x, 0.13, 0.31), (x, 0.27, 0.13), 0.045)
    capsule((x, 0.27, 0.11), (x, 0.20, 0.04), 0.042)
    ball((x, 0.18, 0.04), 0.045)

dg = bpy.context.evaluated_depsgraph_get()
body_me = bpy.data.meshes.new_from_object(mbo.evaluated_get(dg))
body = bpy.data.objects.new("cat_body_raw", body_me)
col.objects.link(body)
bpy.data.objects.remove(mbo)
log("metaball mesh verts", len(body_me.vertices))

# ears: flattened cones (mesh), sunk into the head
def cone(name, base, tip, r, flat):
    base, tip = Vector(base), Vector(tip)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=r, radius2=0.004, depth=(tip - base).length)
    for v in bm.verts:
        v.co.y *= flat
        v.co.z += (tip - base).length / 2
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); col.objects.link(ob)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((tip - base).normalized())
    ob.location = base
    return ob

ears = [cone(f"ear{s}", (0.085 * s, -0.48, 0.93), (0.15 * s, -0.465, 1.19), 0.085, 0.45) for s in (1, -1)]

# tail: tapered tube along a gentle upward line, from inside the rump
cu = bpy.data.curves.new("tail", 'CURVE'); cu.dimensions = '3D'
cu.bevel_depth = 1.0; cu.bevel_resolution = 6; cu.use_fill_caps = True
sp = cu.splines.new('BEZIER')
pts = [(0, 0.24, 0.58), (0, 0.55, 0.60), (0, 0.80, 0.64), (0, 1.00, 0.70)]
radii = [0.056, 0.047, 0.040, 0.034]
sp.bezier_points.add(len(pts) - 1)
for bp, p, r in zip(sp.bezier_points, pts, radii):
    bp.co = p; bp.radius = r
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
tail_ob = bpy.data.objects.new("tail", cu); col.objects.link(tail_ob)
dg = bpy.context.evaluated_depsgraph_get()
tail_me = bpy.data.meshes.new_from_object(tail_ob.evaluated_get(dg))
bpy.data.objects.remove(tail_ob)
tail = bpy.data.objects.new("tail_mesh", tail_me); col.objects.link(tail)
# round tail tip: add a ball at the end via a uv sphere
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.034)
tip_me = bpy.data.meshes.new("tailtip"); bm.to_mesh(tip_me); bm.free()
tip = bpy.data.objects.new("tailtip", tip_me); tip.location = pts[-1]; col.objects.link(tip)

# join everything, apply transforms, voxel remesh = boolean union, watertight
for o in bpy.context.view_layer.objects:
    o.select_set(False)
parts = [body] + ears + [tail, tip]
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
cat = bpy.context.view_layer.objects.active
cat.name = "cat"; cat.data.name = "cat"

rm = cat.modifiers.new("remesh", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.006; rm.adaptivity = 0.0
bpy.ops.object.modifier_apply(modifier="remesh")
log("voxel remesh verts", len(cat.data.vertices))
sm = cat.modifiers.new("smooth", 'SMOOTH'); sm.factor = 0.5; sm.iterations = 6
bpy.ops.object.modifier_apply(modifier="smooth")

# retopo: quadriflow for deformation-friendly quads, decimate as fallback
ok = False
try:
    t = time.time()
    r = bpy.ops.object.quadriflow_remesh(target_faces=TARGET_FACES, use_mesh_symmetry=False, use_preserve_sharp=False,
                                         use_preserve_boundary=False, smooth_normals=False, mode='FACES', seed=0)
    ok = 'FINISHED' in r and len(cat.data.polygons) > TARGET_FACES * 0.5
    log("quadriflow", r, len(cat.data.polygons), "faces", f"{time.time()-t:.1f}s")
except Exception as ex:
    log("quadriflow failed", ex)
if not ok:
    tris = sum(len(p.vertices) - 2 for p in cat.data.polygons)
    dm = cat.modifiers.new("dec", 'DECIMATE'); dm.ratio = (TARGET_FACES * 2) / tris
    bpy.ops.object.modifier_apply(modifier="dec")
    log("decimated to", len(cat.data.polygons))

bpy.ops.object.shade_smooth()
me = cat.data
tri_count = sum(len(p.vertices) - 2 for p in me.polygons)
# watertight check
bm = bmesh.new(); bm.from_mesh(me)
nonman = sum(1 for e in bm.edges if not e.is_manifold)
islands = 0
seen = set()
for v in bm.verts:
    if v.index in seen: continue
    islands += 1; stack = [v]
    while stack:
        x = stack.pop()
        if x.index in seen: continue
        seen.add(x.index)
        stack.extend(e.other_vert(x) for e in x.link_edges)
bm.free()
log(f"mesh: {len(me.vertices)} verts, {tri_count} tris, non-manifold edges {nonman}, islands {islands}")

# ---------------------------------------------------------------- armature
arm = bpy.data.armatures.new("cat_rig")
rig = bpy.data.objects.new("cat_rig", arm)
col.objects.link(rig)
bpy.context.view_layer.objects.active = rig
for o in bpy.context.view_layer.objects: o.select_set(o is rig)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.edit_bones

def bone(name, head, tail, parent=None, connect=False, deform=True):
    b = eb.new(name); b.head = head; b.tail = tail
    b.use_deform = deform
    if parent:
        b.parent = eb[parent]; b.use_connect = connect
    # roll: local X = world +X for every bone (pitch = rotate about local X)
    v = (Vector(tail) - Vector(head)).normalized()
    z = Vector((1, 0, 0)).cross(v)
    if z.length > 1e-4:
        b.align_roll(z)
    return b

bone("root", (0, 0, 0), (0, 0, 0.15), deform=False)
bone("hips", (0, 0.22, 0.55), (0, 0.06, 0.56), "root")
bone("spine_1", (0, 0.06, 0.56), (0, -0.10, 0.57), "hips", True)
bone("spine_2", (0, -0.10, 0.57), (0, -0.24, 0.59), "spine_1", True)
bone("chest", (0, -0.24, 0.59), (0, -0.33, 0.64), "spine_2", True)
bone("neck", (0, -0.33, 0.64), (0, -0.45, 0.77), "chest", True)
bone("head", (0, -0.45, 0.77), (0, -0.50, 0.96), "neck", True)
for s, side in ((1, "L"), (-1, "R")):
    x = 0.095 * s
    bone(f"ear_{side}", (0.095 * s, -0.478, 0.97), (0.145 * s, -0.467, 1.16), "head")
    bone(f"front_upper_{side}", (x, -0.27, 0.50), (x, -0.25, 0.28), "chest")
    bone(f"front_lower_{side}", (x, -0.25, 0.28), (x, -0.26, 0.06), f"front_upper_{side}", True)
    bone(f"front_paw_{side}", (x, -0.26, 0.06), (x, -0.34, 0.04), f"front_lower_{side}", True)
    bone(f"back_upper_{side}", (x, 0.21, 0.50), (x, 0.13, 0.31), "hips")
    bone(f"back_lower_{side}", (x, 0.13, 0.31), (x, 0.27, 0.12), f"back_upper_{side}", True)
    bone(f"back_paw_{side}", (x, 0.27, 0.12), (x, 0.17, 0.03), f"back_lower_{side}", True)
tail_pts = [Vector((0, 0.26, 0.58))]
# sample along the tail curve's straight-ish path, 6 bones
path = [Vector(p) for p in pts]
def along(t):  # piecewise-linear along control points
    seg = [(path[i+1] - path[i]).length for i in range(len(path) - 1)]
    L = sum(seg); d = t * L
    for i, sl in enumerate(seg):
        if d <= sl or i == len(seg) - 1:
            return path[i].lerp(path[i+1], min(d / sl, 1.0))
        d -= sl
for i in range(1, 7):
    tail_pts.append(along(0.07 + 0.93 * i / 6))
prev = "hips"
for i in range(6):
    bone(f"tail_{i+1}", tail_pts[i], tail_pts[i+1], prev, i > 0)
    prev = f"tail_{i+1}"
bpy.ops.object.mode_set(mode='OBJECT')
log("bones", len(arm.bones))

# ---------------------------------------------------------------- bind (bone heat)
for o in bpy.context.view_layer.objects: o.select_set(False)
cat.select_set(True); rig.select_set(True)
bpy.context.view_layer.objects.active = rig
t = time.time()
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
log(f"auto weights {time.time()-t:.1f}s")
# check every vertex got weight
unweighted = sum(1 for v in me.vertices if not any(g.weight > 1e-4 for g in v.groups))
empty_groups = [vg.name for vg in cat.vertex_groups if not any(g.group == vg.index and g.weight > 1e-3 for v in me.vertices for g in v.groups)]
log("unweighted verts", unweighted, "empty groups", empty_groups)

bpy.context.view_layer.objects.active = cat
for o in bpy.context.view_layer.objects: o.select_set(o is cat)
# soften bone-heat seams (lumps where tail/leg weights meet the torso)
# (vertex_group_smooth's poll fails headless, so smooth the weight matrix with numpy)
import numpy as np
nv, ng = len(me.vertices), len(cat.vertex_groups)
W = np.zeros((nv, ng), dtype=np.float64)
for v in me.vertices:
    for g in v.groups:
        W[v.index, g.group] = g.weight
ed = np.array([e.vertices[:] for e in me.edges])
deg = np.bincount(ed.ravel(), minlength=nv).astype(np.float64)
for _ in range(SMOOTH_ITERS):
    acc = np.zeros_like(W)
    np.add.at(acc, ed[:, 0], W[ed[:, 1]]); np.add.at(acc, ed[:, 1], W[ed[:, 0]])
    W = 0.5 * W + 0.5 * acc / deg[:, None]
W /= W.sum(1, keepdims=True)
for gi, vg in enumerate(cat.vertex_groups):
    idx = np.nonzero(W[:, gi] > 1e-3)[0]
    vg.remove(list(range(nv)))
    for i in idx:
        vg.add([int(i)], float(W[i, gi]), 'REPLACE')
bpy.ops.object.vertex_group_limit_total(group_select_mode='ALL', limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode='ALL', lock_active=False)

# butter_socket on top of the head
sock = bpy.data.objects.new("butter_socket", None)
sock.empty_display_type = 'PLAIN_AXES'; sock.empty_display_size = 0.05
col.objects.link(sock)
sock.parent = rig; sock.parent_type = 'BONE'; sock.parent_bone = "head"
hb = arm.bones["head"]
# place at the top of the skull between the ears (world), stored relative to the bone tail
world = Vector((0, -0.50, 1.00))
from mathutils import Matrix
tail_m = hb.matrix_local @ Matrix.Translation((0, hb.length, 0))   # bone-parent space is the bone tail
sock.matrix_parent_inverse = Matrix.Identity(4)
sock.matrix_basis = tail_m.inverted() @ Matrix.Translation(world)

with open(OUT.replace(".blend", "_stats.txt"), "w") as f:
    f.write(f"verts {len(me.vertices)} tris {tri_count} nonmanifold {nonman} islands {islands} bones {len(arm.bones)} unweighted {unweighted} empty_groups {empty_groups}\n")
bpy.ops.wm.save_as_mainfile(filepath=OUT)
log("saved", OUT)
