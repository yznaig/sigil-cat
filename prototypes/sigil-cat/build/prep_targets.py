# prep_targets.py: turns raw AI pose meshes into small wrap targets for the sculpted pose shapes, placed in cat
# units, so the cat rebuilds without the GPU. Needs the rig loaded (the head is the ruler):
#   blender -b work/cat_rig.blend --python prep_targets.py -- <targets dir> <name>=<raw.glb|.ply> ...
#   (name: loaf, sleep or stretch, optionally with a suffix: loaf-s7)
# For each mesh: keeps the largest piece, decimates to ~TARGET_FACES, smooths lightly, then finds the cat's head
# in it (wrap_util.register_head: the rest-pose head and ears as a template, the scale held within 20% of the
# pose's height read off the sheet, anim_cat.SHEET_HEIGHT). The mesh is scaled to cat units, centred on x, put on
# the floor (z = 0) and slid along y so its head sits over the rest head. Writes <name>.ply (Blender axes: Z up,
# cat facing -Y) and <name>.json (the head's placement in it: rotation R and offset t, so a rest head point p
# lands at R p + t; fit_pose.py pulls the posed head there).
import bpy, bmesh, sys, os, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
args = sys.argv[sys.argv.index("--") + 1:]
OUT = os.path.abspath(args[0])
os.makedirs(OUT, exist_ok=True)
sys.argv = sys.argv[:sys.argv.index("--") + 1] + [os.path.join(HERE, "work"), "none"]
import anim_cat as AC
import wrap_util as WU
TARGET_FACES = 20000
# The stretch sheet draws his head smaller next to his body than the other sheets do; at head scale its body is too
# small to take the head without it sinking into the chest. 1.2 puts its height near the 1.45 read off the sheet.
GROW = {"stretch": 1.2}


def head_template():
    body = bpy.data.objects["cat_body"]; me = body.data
    rest = np.array([v.co[:] for v in me.vertices])
    gname = [g.name for g in body.vertex_groups]
    hw = np.zeros(len(rest))
    for v in me.vertices:
        for g in v.groups:
            if gname[g.group].startswith(("head", "ear")):
                hw[v.index] += g.weight
    return (hw > 0.85) & (rest[:, 2] > 0.5), rest     # head above the cheeks (whisker roots), plus the ears


def clean(src):
    before = set(bpy.data.objects)
    if src.endswith(".ply"):
        bpy.ops.wm.ply_import(filepath=src, forward_axis='Y', up_axis='Z')
    else:
        bpy.ops.import_scene.gltf(filepath=src)
    ob = [o for o in bpy.data.objects if o not in before and o.type == 'MESH'][0]
    for o in bpy.context.view_layer.objects:
        o.select_set(o == ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bm.verts.ensure_lookup_table()
    seen, best = set(), []
    for v in bm.verts:                                  # largest connected piece only (drops floaters)
        if v.index in seen:
            continue
        comp, stack = [], [v]
        while stack:
            x = stack.pop()
            if x.index in seen:
                continue
            seen.add(x.index); comp.append(x)
            stack.extend(e.other_vert(x) for e in x.link_edges)
        if len(comp) > len(best):
            best = comp
    keep = {v.index for v in best}
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index not in keep], context='VERTS')
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(ob.data); bm.free()
    if len(ob.data.polygons) > TARGET_FACES:
        dm = ob.modifiers.new("dec", 'DECIMATE'); dm.ratio = TARGET_FACES / len(ob.data.polygons)
        bpy.ops.object.modifier_apply(modifier="dec")
    sm = ob.modifiers.new("sm", 'SMOOTH'); sm.factor = 0.5; sm.iterations = 3
    bpy.ops.object.modifier_apply(modifier="sm")
    v = np.array([ob.matrix_world @ x.co for x in ob.data.vertices])
    f = [tuple(p.vertices) for p in ob.data.polygons]
    me = ob.data
    bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
    return v, f


tmask, rest = head_template()
template = rest[tmask]
for spec in args[1:]:
    name, src = spec.split("=", 1)
    tv, tf = clean(src)
    tv[:, 2] -= tv[:, 2].min(); tv[:, 0] -= (tv[:, 0].min() + tv[:, 0].max()) / 2
    s, R, t, res = WU.register_head(tv, tf, template, AC.SHEET_HEIGHT[name.split("-")[0]], log=AC.log)
    tv = tv / s; t = t / s                          # cat units: a rest head point p lands at R p + t
    shift = np.array([0.0, 0.0, -tv[:, 2].min()])
    shift[1] = -0.015 - (template @ R.T + t)[:, 1].mean()   # target head over the rest head (head bone y)
    tv += shift; t = t + shift
    g = GROW.get(name.split("-")[0], 1.0)                # grow the pose's body round its head (see GROW)
    if g != 1.0:
        c = np.array([0.0, (template @ R.T + t)[:, 1].mean(), 0.0])
        tv = g * (tv - c) + c; R = g * R; t = g * (t - c) + c
    WU.save_ply(os.path.join(OUT, name + ".ply"), tv, tf)
    json.dump(dict(source=os.path.basename(src), R=R.tolist(), t=t.tolist(), residual=res / s,
                   height=float(tv[:, 2].max()), length=float(np.ptp(tv[:, 1])), width=float(np.ptp(tv[:, 0]))),
              open(os.path.join(OUT, name + ".json"), "w"), indent=1)
    AC.log(f"[targets] {name}: {len(tf)} faces, {tv[:, 2].max():.3f} tall, {np.ptp(tv[:, 1]):.3f} long, "
           f"{np.ptp(tv[:, 0]):.3f} wide, head residual {res / s:.4f}")
