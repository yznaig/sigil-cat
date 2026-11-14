# render_rest.py: 8-angle renders of the built cat (shaded grey + black silhouette rows), for checking shape.
# Run: blender -b work/cat_rig.blend --python render_rest.py -- <out.png> [action] [frame]
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_util as U

argv = sys.argv[sys.argv.index("--") + 1:]
out = argv[0]
rig = bpy.data.objects["cat_rig"]
if len(argv) > 1:
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions[argv[1]]
    bpy.context.scene.frame_set(int(argv[2]) if len(argv) > 2 else 0)
for o in bpy.data.objects:
    if o.type == 'EMPTY':
        o.hide_render = True
cam = U.ortho_camera()
rows = []
for mode in ("shaded", "silhouette"):
    U.setup_workbench(mode, 300)
    row = []
    for yaw in range(0, 360, 45):
        U.aim(cam, yaw, 8, (0, 0.15, 0.48), scale=1.35)
        a = U.render_to_array(out + f".{yaw}.png")
        os.remove(out + f".{yaw}.png")
        row.append(U.label(a, str(yaw)))
    rows.append(row)
U.save_grid(rows, out)
