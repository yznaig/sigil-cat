# dump_pose.py: writes each sheet pose's skeleton-posed cat (no pose shapes) to work/blockout/<pose>-posed.npz, so
# blockout.py can score and mesh a primitive blockout around it without Blender:
#   blender -b work/cat_rig.blend --python dump_pose.py -- [LIE,SLEEP,BOW]
# npz: body verts/tris/edges and part weights, whisker verts/tris, bone heads and tails (world), and the three
# sheet cameras of anim_cat.compare (origin, right, up, view, ortho scale, resolution).
import bpy, sys, os, math
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
args = sys.argv[sys.argv.index("--") + 1:]
names = (args[0] if args else "LIE,SLEEP,BOW").split(",")
sys.argv = sys.argv[:sys.argv.index("--") + 1] + [os.path.join(HERE, "work"), "none"]
import anim_cat as AC
import wrap_util as WU

OUT = os.path.join(HERE, "work", "blockout")
os.makedirs(OUT, exist_ok=True)
SHEET = {"LIE": "loaf", "SLEEP": "sleep", "BOW": "stretch"}


def evaluated(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg).to_mesh()
    v = np.array([ob.matrix_world @ x.co for x in ev.vertices])
    f = [tuple(p.vertices) for p in ev.polygons]
    ob.evaluated_get(dg).to_mesh_clear()
    tris = np.array([(p[0], p[i], p[i + 1]) for p in f for i in range(1, len(p) - 1)])
    return v, tris


for name in names:
    P = AC.no_shapes(getattr(AC, name)())
    posed, A, W = AC.posed_state(P)
    body = bpy.data.objects["cat_body"]; me = body.data
    bv, bt = evaluated(body)
    wv, wt = evaluated(bpy.data.objects["cat_whiskers"])
    bones = {}
    for b in AC.rig.pose.bones:
        bones["h_" + b.name] = np.array((AC.rig.matrix_world @ b.head)[:])
        bones["t_" + b.name] = np.array((AC.rig.matrix_world @ b.tail)[:])
    cams = []
    for view, yaw in AC.VIEWS:
        yw, pt = math.radians(yaw), math.radians(AC.SHEET_PITCH)
        d = np.array((math.sin(yw) * math.cos(pt), -math.cos(yw) * math.cos(pt), math.sin(pt)))
        f = -d; r = np.cross(f, (0, 0, 1)); r /= np.linalg.norm(r); u = np.cross(r, f)
        cams.append(np.concatenate([(0, 0.05, 0.40), r, u, f]))
    np.savez(os.path.join(OUT, f"{SHEET[name]}-posed.npz"), verts=bv, tris=bt, edges=WU.edges_of(me),
             whisk_verts=wv, whisk_tris=wt, cams=np.array(cams), cam_scale=2.3, cam_res=400,
             views=np.array([v for v, _ in AC.VIEWS]), **{"w_" + k: x for k, x in W.items()},
             **{k: v for k, v in bones.items()})
    print("dumped", name, len(bv), "verts", flush=True)
