# anim_cat.py: stage 2 of the Claude-scripted Blender cat.
# Opens cat_rig.blend, keys pose clips (one Action per clip, each pushed to its own NLA track),
# renders proof stills, exports the GLB.
# Run: blender -b --factory-startup <cat_rig.blend> --python anim_cat.py -- <outdir> [render|export|all]
import bpy, math, os, sys, time
import numpy as np
from mathutils import Vector, Euler, Matrix

T0 = time.time()
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUTDIR = argv[0] if argv else "/tmp/catout"
MODE = argv[1] if len(argv) > 1 else "all"
os.makedirs(OUTDIR, exist_ok=True)
def log(*a): print(f"[anim {time.time()-T0:6.1f}s]", *a, flush=True)

scn = bpy.context.scene
rig = bpy.data.objects["cat_rig"]
cat = bpy.data.objects["cat"]
FPS = 24
scn.render.fps = FPS

# ------------------------------------------------------------------ poses
# Every value: (rx, ry, rz) degrees in the bone's local frame. Every bone has local X = world +X at rest,
# so rx is pitch: + swings a down-pointing bone backward, a forward-pointing bone downward, a back-pointing
# bone upward. rz bends sideways. "hips_loc" is a world-space offset of the hips (root never moves).
BONES = [b.name for b in rig.data.bones]

def mirror(d, base, rx=0, ry=0, rz=0, side_flip=True):
    d[base + "_L"] = (rx, ry, rz)
    d[base + "_R"] = (rx, -ry if side_flip else ry, -rz if side_flip else rz)

def P(**kw):
    d = {}
    for k, v in kw.items():
        if k.endswith("_LR"):
            mirror(d, k[:-3], *v)
        else:
            d[k] = v
    return d

SIT = P(
    hips_loc=(0, 0.0, -0.33),
    hips=(-42, 0, 0),
    spine_1=(2, 0, 0), spine_2=(4, 0, 0), chest=(2, 0, 0),
    neck=(12, 0, 0), head=(20, 0, 0),
    ear_LR=(0, 0, 0),
    front_upper_LR=(36, 0, 0), front_lower_LR=(4, 0, 0), front_paw_LR=(-12, 0, 0),
    back_upper_LR=(-34, 0, 0), back_lower_LR=(82, 0, 0), back_paw_LR=(-52, 0, 0),
    tail_1=(-10, 0, -45), tail_2=(32, 0, -30), tail_3=(-14, 0, -35), tail_4=(-12, 0, -35), tail_5=(-8, 0, -30), tail_6=(-4, 0, -20),
)
LIE = P(
    hips_loc=(0, 0.02, -0.37),
    hips=(0, 0, 0),
    spine_1=(0, 0, 0), spine_2=(0, 0, 0), chest=(-2, 0, 0),
    neck=(-8, 0, 0), head=(8, 0, 0),
    ear_LR=(0, 0, 0),
    front_upper_LR=(62, 0, 0), front_lower_LR=(-150, 0, 0), front_paw_LR=(60, 0, 0),
    back_upper_LR=(-52, 0, 0), back_lower_LR=(104, 0, 0), back_paw_LR=(-94, 0, 0),
    tail_1=(-35, 0, 0), tail_2=(25, 0, -15), tail_3=(5, 0, -30), tail_4=(0, 0, -30), tail_5=(0, 0, -25), tail_6=(0, 0, -20),
)
SLEEP = P(
    hips_loc=(0, 0.02, -0.40),
    hips=(0, 0, 10),
    spine_1=(0, 0, -14), spine_2=(0, 0, -14), chest=(-2, 0, -14),
    neck=(30, 0, -12), head=(14, 30, -4),
    ear_LR=(-6, 0, 0),
    front_upper_LR=(62, 0, 0), front_lower_LR=(-150, 0, 0), front_paw_LR=(60, 0, 0),
    back_upper_LR=(-52, 0, 0), back_lower_LR=(104, 0, 0), back_paw_LR=(-94, 0, 0),
    tail_1=(-35, 0, -30), tail_2=(25, 0, -35), tail_3=(5, 0, -40), tail_4=(0, 0, -40), tail_5=(0, 0, -35), tail_6=(0, 0, -30),
)

STAND = P(
    hips_loc=(0, 0, -0.02),
    neck=(0, 0, 0), head=(0, 0, 0),
    tail_1=(38, 0, 0), tail_2=(20, 0, 0), tail_3=(8, 0, 0), tail_4=(-10, 0, 0), tail_5=(-25, 0, 6), tail_6=(-30, 0, 8),
)
BOW = P(
    hips_loc=(0, 0.04, -0.07),
    hips=(28, 0, 0),
    spine_1=(4, 0, 0), spine_2=(4, 0, 0), chest=(0, 0, 0),
    neck=(-22, 0, 0), head=(-16, 0, 0),
    ear_LR=(-10, 0, 0),
    front_upper_LR=(-106, 0, 0), front_lower_LR=(-2, 0, 0), front_paw_LR=(58, 0, 0),
    back_upper_LR=(-28, 0, 0), back_lower_LR=(4, 0, 0), back_paw_LR=(-2, 0, 0),
    tail_1=(30, 0, 0), tail_2=(20, 0, 0), tail_3=(10, 0, 0), tail_4=(-10, 0, 0), tail_5=(-25, 0, 0), tail_6=(-30, 0, 0),
)

def lerp_pose(a, b, t):
    out = {}
    for k in set(a) | set(b):
        va = a.get(k, (0, 0, 0)); vb = b.get(k, (0, 0, 0))
        out[k] = tuple(x + (y - x) * t for x, y in zip(va, vb))
    return out

def add(pose, **kw):
    """Add deltas to a pose (for breathing and in-betweens)."""
    out = dict(pose)
    for k, v in kw.items():
        keys = [k[:-3] + "_L", k[:-3] + "_R"] if k.endswith("_LR") else [k]
        for kk in keys:
            base = out.get(kk, (0, 0, 0))
            out[kk] = tuple(x + y for x, y in zip(base, v))
    return out

# ------------------------------------------------------------------ keying
hips_rest = rig.data.bones["hips"].matrix_local.to_3x3()

def apply_pose(pose):
    for pb in rig.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.location = (0, 0, 0)
        pb.rotation_euler = Euler([math.radians(x) for x in pose.get(pb.name, (0, 0, 0))], 'XYZ')
        pb.scale = (1, 1, 1)
    wl = Vector(pose.get("hips_loc", (0, 0, 0)))
    rig.pose.bones["hips"].location = hips_rest.inverted() @ wl

def key_pose(frame, pose):
    apply_pose(pose)
    for pb in rig.pose.bones:
        pb.keyframe_insert("location", frame=frame)
        pb.keyframe_insert("rotation_euler", frame=frame)
        pb.keyframe_insert("scale", frame=frame)

rig.animation_data_create()
CLIPS = {}

def make_clip(name, keys):
    """keys: list of (frame, pose). One Action, pushed down to its own NLA track."""
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data.action = act
    for f, pose in keys:
        key_pose(f, pose)
    end = keys[-1][0]
    rig.animation_data.action = None
    tr = rig.animation_data.nla_tracks.new()
    tr.name = name
    st = tr.strips.new(name, 0, act)
    tr.mute = True
    CLIPS[name] = (act, end)
    log("clip", name, "frames 0 -", end)

def breathing(base, period, amp, frames, **extra):
    """Hold loop: breathe in on odd half-periods; `extra` deltas (tail sway, ear flick) ride the inhale."""
    keys = []
    for f in range(0, frames + 1, period // 2):
        inhale = (f // (period // 2)) % 2 == 1
        p = add(base, chest=(-amp, 0, 0), spine_2=(-amp * 0.6, 0, 0), spine_1=(amp * 0.5, 0, 0), **extra) if inhale else base
        keys.append((f, p))
    return keys

make_clip("sit", breathing(SIT, 48, 2.5, 96, tail_5=(0, 0, 8), tail_6=(0, 0, 14), head=(-1.5, 0, 0)))
make_clip("lie", breathing(LIE, 48, 2.0, 96, tail_5=(0, 0, 6), tail_6=(0, 0, 10)))
make_clip("sleep", breathing(SLEEP, 72, 2.5, 144))
# sit -> lie: front paws walk forward while the rump slides back and the chest lowers
mid1 = add(lerp_pose(SIT, LIE, 0.45), front_upper_L=(-20, 0, 0), front_lower_L=(10, 0, 0))
mid2 = add(lerp_pose(SIT, LIE, 0.75), front_upper_R=(-15, 0, 0), front_lower_R=(-30, 0, 0))
make_clip("sit_to_lie", [(0, SIT), (14, mid1), (26, mid2), (40, LIE)])
# lie -> sleep: head sinks, tail wraps, body curls
mid3 = add(lerp_pose(LIE, SLEEP, 0.5), neck=(8, 0, 0))
make_clip("lie_to_sleep", [(0, LIE), (20, mid3), (40, SLEEP)])

# lie -> sit: chest pushes up on straightening front legs, rump settles
mid4 = add(lerp_pose(LIE, SIT, 0.5), front_lower_LR=(30, 0, 0), front_upper_LR=(-10, 0, 0), hips_loc=(0, 0, 0.05))
make_clip("lie_to_sit", [(0, LIE), (18, mid4), (36, SIT)])
# sleep -> lie: head lifts first, then the body uncurls
mid5 = add(lerp_pose(SLEEP, LIE, 0.4), neck=(-25, 0, 0), head=(-5, 0, 0))
make_clip("sleep_to_lie", [(0, SLEEP), (14, mid5), (36, LIE)])
# sit -> stretch start (standing): front legs push, rump lifts
mid6 = add(lerp_pose(SIT, STAND, 0.45), hips_loc=(0, 0, 0.04))
make_clip("sit_to_stretch", [(0, SIT), (14, mid6), (30, STAND)])
mid7 = add(lerp_pose(LIE, STAND, 0.5), front_upper_LR=(-15, 0, 0))
make_clip("lie_to_stretch", [(0, LIE), (16, mid7), (34, STAND)])
# stretch one-shot: stand -> play bow (front stretch) -> stand -> sit (ends seated)
BOW2 = add(BOW, hips_loc=(0, 0.02, -0.02), front_upper_LR=(-6, 0, 0), neck=(-6, 0, 0))
mid8 = add(lerp_pose(STAND, SIT, 0.5), hips_loc=(0, 0, 0.03))
make_clip("stretch", [(0, STAND), (18, BOW), (40, BOW2), (56, STAND), (66, mid8), (78, SIT)])

# ------------------------------------------------------------------ material
mat = bpy.data.materials.get("cat_black") or bpy.data.materials.new("cat_black")
mat.diffuse_color = (0.0056, 0.0056, 0.0064, 1)   # ~#0d0d0f
mat.roughness = 0.7
mat.use_nodes = True
bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs["Base Color"].default_value = mat.diffuse_color
bsdf.inputs["Roughness"].default_value = 0.7
if not cat.data.materials:
    cat.data.materials.append(mat)

# ------------------------------------------------------------------ render
def setup_render():
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = 520; scn.render.resolution_y = 420
    scn.render.film_transparent = False
    sh = scn.display.shading
    sh.color_type = 'SINGLE'
    w = bpy.data.worlds.new("bg"); w.color = (0.82, 0.78, 0.70); scn.world = w
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_mode = 'RGB'
    scn.view_settings.view_transform = 'Standard'
    scn.render.dither_intensity = 0.0          # no noise: keeps PNGs small
    scn.render.image_settings.compression = 100

def camera(name, loc, target, ortho=1.9):
    cam = bpy.data.objects.get(name)
    if not cam:
        cam = bpy.data.objects.new(name, bpy.data.cameras.new(name)); scn.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = ortho
    cam.location = loc
    d = Vector(target) - Vector(loc)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return cam

def render_to(path, cam, style):
    sh = scn.display.shading
    if style == "flat":
        sh.light = 'FLAT'; sh.single_color = (0.01, 0.01, 0.012)
    else:
        sh.light = 'STUDIO'; sh.single_color = (0.45, 0.45, 0.47)
        sh.show_cavity = False
    scn.camera = cam
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)

def stitch(paths, out, cols):
    imgs = []
    for p in paths:
        im = bpy.data.images.load(p)
        w, h = im.size
        a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
        imgs.append(a); bpy.data.images.remove(im)
    h, w = imgs[0].shape[:2]
    rows = math.ceil(len(imgs) / cols)
    sheet = np.ones((rows * h, cols * w, 4), dtype=np.float32)
    for i, a in enumerate(imgs):
        r, c = divmod(i, cols)
        # image pixel rows go bottom-up
        sheet[(rows - 1 - r) * h:(rows - r) * h, c * w:(c + 1) * w] = a
    img = bpy.data.images.new("sheet", cols * w, rows * h)
    img.pixels = sheet.ravel()
    img.save_render(out, scene=scn)
    bpy.data.images.remove(img)

def show_clip_frame(name, frame):
    act, end = CLIPS[name]
    rig.animation_data.action = act
    scn.frame_set(frame)

if MODE in ("render", "all"):
    setup_render()
    tgt = (0, 0.18, 0.5)
    cams = {
        "side": camera("cam_side", (4, 0.1, 0.5), tgt),
        "q34": camera("cam_q34", (2.6, -2.8, 1.6), tgt),
        "front": camera("cam_front", (0, -4, 0.6), tgt),
        "top": camera("cam_top", (0, 0.18, 4), (0, 0.18, 0)),
    }
    cams["top"].rotation_euler = (0, 0, math.pi)
    shots = [("rest", None, 0)] + [(n, n, 0) for n in ("sit", "lie", "sleep")] + \
            [("sit_to_lie@14", "sit_to_lie", 14), ("sit_to_lie@26", "sit_to_lie", 26), ("lie_to_sleep@20", "lie_to_sleep", 20),
             ("lie_to_sit@18", "lie_to_sit", 18), ("sleep_to_lie@14", "sleep_to_lie", 14), ("sit_to_stretch@14", "sit_to_stretch", 14),
             ("lie_to_stretch@16", "lie_to_stretch", 16), ("stand", "stretch", 0), ("stretch@30", "stretch", 30), ("stretch@66", "stretch", 66)]
    VIEWS = argv[3].split(",") if len(argv) > 3 else ["side", "q34", "front"]
    which = argv[2].split(",") if len(argv) > 2 else None
    for label, clip, f in shots:
        if which and label.split("@")[0] not in which and label not in which:
            continue
        if clip is None:
            rig.animation_data.action = None
            for pb in rig.pose.bones:
                pb.location = (0, 0, 0); pb.rotation_euler = (0, 0, 0)
            scn.frame_set(0)
        else:
            show_clip_frame(clip, f)
        parts = []
        safe = label.replace("@", "_")
        for cname in VIEWS:
            for style in ("flat", "studio"):
                p = os.path.join(OUTDIR, f"_{safe}_{cname}_{style}.png")
                render_to(p, cams[cname], style)
                parts.append(p)
        # order: row1 = flat side, flat 3/4, flat front; row2 = studio
        order = parts[0::2] + parts[1::2]
        stitch(order, os.path.join(OUTDIR, f"sheet_{safe}.png"), len(VIEWS))
        log("rendered", label)

def pose_at(name, frame):
    act, end = CLIPS[name]
    rig.animation_data.action = act
    scn.frame_set(frame)
    return [tuple(pb.matrix_basis.col[i][j] for i in range(4) for j in range(3)) for pb in rig.pose.bones]

def max_diff(a, b):
    return max(abs(x - y) for pa, pb_ in zip(a, b) for x, y in zip(pa, pb_))

if MODE == "preview":
    # README previews: the five poses as silhouettes and lit grey, and one transition as a strip
    setup_render()
    scn.render.resolution_x = 400; scn.render.resolution_y = 330
    tgt = (0, 0.18, 0.5)
    cside = camera("cam_side", (4, 0.18, 0.5), tgt, 1.95)
    cq = camera("cam_q34", (2.6, -2.8, 1.6), tgt, 1.95)
    poses = [("sit", 0), ("lie", 0), ("sleep", 0), ("stretch", 0), ("stretch", 30)]
    def strip(frames, out, rows):
        paths = []
        for style, cam in rows:
            for i, (clip, f) in enumerate(frames):
                show_clip_frame(clip, f)
                pth = os.path.join(OUTDIR, f"_pv_{style}_{cam.name}_{i}.png")
                render_to(pth, cam, style); paths.append(pth)
        stitch(paths, out, len(frames))
    strip(poses, os.path.join(OUTDIR, "preview-poses-silhouette.png"), [("flat", cq), ("flat", cside)])
    strip(poses, os.path.join(OUTDIR, "preview-poses-shaded.png"), [("studio", cq), ("studio", cside)])
    strip([("sit_to_lie", f) for f in (0, 10, 20, 30, 40)], os.path.join(OUTDIR, "preview-sit-to-lie.png"), [("flat", cside), ("studio", cq)])
    strip([("stretch", f) for f in (0, 18, 40, 60, 78)], os.path.join(OUTDIR, "preview-stretch.png"), [("flat", cside), ("studio", cq)])
    log("previews done")

if MODE in ("check", "all"):
    seams = {"sit_to_lie": ("sit", "lie"), "lie_to_sleep": ("lie", "sleep"), "lie_to_sit": ("lie", "sit"),
             "sleep_to_lie": ("sleep", "lie"), "sit_to_stretch": ("sit", "stretch"), "lie_to_stretch": ("lie", "stretch"),
             "stretch": ("stretch", "sit")}
    for clip, (a, b) in seams.items():
        d0 = max_diff(pose_at(clip, 0), pose_at(a, 0))
        d1 = max_diff(pose_at(clip, CLIPS[clip][1]), pose_at(b, 0))
        print(f"SEAM {clip}: start vs {a}[0] {d0:.2e}, end vs {b}[0] {d1:.2e}")
    for h in ("sit", "lie", "sleep"):
        print(f"LOOP {h}: first vs last {max_diff(pose_at(h, 0), pose_at(h, CLIPS[h][1])):.2e}")

if MODE == "bones":
    show_clip_frame("sit", 0)
    for n in ("hips","tail_1","tail_2","tail_3","tail_4","tail_5","tail_6"):
        pb = rig.pose.bones[n]; print("BONE", n, tuple(round(x,3) for x in (rig.matrix_world @ pb.head)), tuple(round(x,3) for x in (rig.matrix_world @ pb.tail)))

if MODE in ("export", "all"):
    rig.animation_data.action = None
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0); pb.rotation_euler = (0, 0, 0)
    for o in bpy.context.view_layer.objects: o.select_set(o.name in ("cat", "cat_rig", "butter_socket"))
    out = os.path.join(OUTDIR, "claude-blender-cat.raw.glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=True, export_frame_step=1,
        export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=True,
        export_reset_pose_bones=True, export_anim_slide_to_zero=True,
        export_skins=True, export_influence_nb=4, export_all_influences=False,
        export_def_bones=False, export_yup=True, export_apply=False,
        export_morph=False, export_texcoords=False, export_cameras=False, export_lights=False,
    )
    log("exported", out, os.path.getsize(out))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUTDIR, "cat_anim.blend"))
