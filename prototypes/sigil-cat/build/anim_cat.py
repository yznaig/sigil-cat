# anim_cat.py: stage 3 of the Sigil Cat build (headless Blender 5.2). Poses, clips, export.
#
# Poses are small tables of rotations (degrees, bone-local, relative to the sitting rest pose). The tail is
# posed by a path solver: each tail bone is aimed along a polyline, so a wrap can be routed around the
# haunch instead of through it. Clips are key poses on a timeline with an ease per segment
# ('elastic' and 'back' overshoot and settle). Transitions add per-bone lag (follow-through: head after
# chest, ears and tail last), clamped so frame 0 is exactly the source pose and the last frame exactly the
# target pose. Holds loop with no lag, so their seams are exact too.
#
# Run: blender -b work/cat_rig.blend --python anim_cat.py -- <outdir> [preview|bake|all]
#   preview  renders each key pose from 4 angles -> <outdir>/poses.png
#   bake     builds every clip (actions + NLA tracks), saves <outdir>/cat_anim.blend, exports <outdir>/cat.raw.glb
#   export   (run on work/cat_anim.blend) only re-exports <outdir>/cat.raw.glb
#   compare  renders poses next to the brother's pose sheets with silhouette scores (see compare())
import bpy, sys, os, math, json, time
from mathutils import Vector, Quaternion, Euler, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blender_util as U

T0 = time.time()
def log(*a):
    print(f"[anim {time.time()-T0:6.1f}s]", *a, flush=True)

argv = sys.argv[sys.argv.index("--") + 1:]
OUT = argv[0]
MODE = argv[1] if len(argv) > 1 else "all"
os.makedirs(OUT, exist_ok=True)
FPS = 30

scn = bpy.context.scene
scn.render.fps = FPS
rig = bpy.data.objects["cat_rig"]
PB = rig.pose.bones
for pb in PB:
    pb.rotation_mode = 'QUATERNION'
BONES = [b.name for b in rig.data.bones if not b.name.endswith("_end")]   # end bones never animate
TAIL = [f"tail_{i}" for i in range(1, 9)]

# ------------------------------------------------------------------ pose helpers
def q(rx=0, ry=0, rz=0):
    return Euler((math.radians(rx), math.radians(ry), math.radians(rz)), 'XYZ').to_quaternion()

def squash(s):
    """Volume-preserving scale for an upright bone (bone-local Y runs along the bone, so Y is height):
    s < 1 squashes (flatter, wider), s > 1 stretches."""
    w = 1 / math.sqrt(s)
    return (w, s, w)

def wide(k):
    """Widen an upright bone's section (breathing), keeping its height."""
    return (k, 1.0, k)

class Pose(dict):
    """bone -> (Quaternion, location Vector, scale Vector); missing bones are at rest.
    Blend-shape weights ride along as "@<shape>" entries with the weight in location.x."""
    def get3(self, b):
        return self.get(b, (Quaternion(), Vector((0, 0, 0)), Vector((1, 1, 1))))

def lowest_z():
    dg = bpy.context.evaluated_depsgraph_get()
    ob = bpy.data.objects["cat_body"]
    me = ob.evaluated_get(dg).to_mesh()
    z = min((ob.matrix_world @ v.co).z for v in me.vertices)
    ob.evaluated_get(dg).to_mesh_clear()
    return z

def make(spec, tail_path=None, tail_curl=None, ground=False, root_shift=None):
    """spec: {bone: (rx, ry, rz) | dict(r=(..), l=(..), s=(..))}. Tail: a path (world points) or a curl
    list of per-bone (rx, rz). Returns a Pose with every bone set."""
    P = Pose()
    spec = dict(spec)
    for m, w in spec.pop("morph", {}).items():
        P["@" + m] = (Quaternion(), Vector((w, 0, 0)), Vector((1, 1, 1)))
    lift = spec.pop("whisk_lift", 0)
    tail_scale = spec.pop("tail_scale", None)   # uniform tail scale (longer and thicker, as the sheets' lying tails)
    tail_aim = spec.pop("tail_aim", 1)          # aiming passes per tail bone (a squashed body shears the chain: 1 misses)
    tail_hold1 = spec.pop("tail_hold1", False)  # the first tail bone stays straight: with tail_scale its exact inverse
                                                # of the body squash then holds, and the rest of the chain is unsheared
    tuck = spec.pop("whisk_tuck", 1.0)     # < 1 shrinks the whiskers into the cheeks (asleep)
    if tuck != 1.0:
        for b in BONES:
            if b.startswith("whisker"):
                P[b] = (Quaternion(), Vector((0, 0, 0)), Vector((tuck, tuck, tuck)))
    if lift:   # raise every whisker tip by `lift` degrees (about the horizontal axis across the whisker)
        for b in BONES:
            if b.startswith("whisker"):
                bone = rig.data.bones[b]
                m = bone.matrix_local.to_3x3()
                axis = m.col[1].cross(Vector((0, 0, 1))).normalized()
                k = {"1": 0.5, "2": 1.0, "3": 1.8}[b[-1]]     # 1 = top whisker, 3 = bottom
                P[b] = (Quaternion(m.inverted() @ axis, math.radians(lift * k)), Vector((0, 0, 0)), Vector((tuck, tuck, tuck)))   # (keeps the tuck)
    for b, v in spec.items():
        if isinstance(v, dict):
            P[b] = (q(*v.get("r", (0, 0, 0))), Vector(v.get("l", (0, 0, 0))), Vector(v.get("s", (1, 1, 1))))
        else:
            P[b] = (q(*v), Vector((0, 0, 0)), Vector((1, 1, 1)))
    if "cog" in P and "tail_1" not in spec:
        sc = P["cog"][2]            # cog local: X = world X, Y = world up, Z = world forward
        k = 1 - TAIL_KEEP_SQUASH
        inv = Vector((1 / sc.x ** k, 1 / sc.z ** k, 1 / sc.y ** k))   # tail_1 local: X = X, Y = back, Z = up
        P["tail_1"] = (Quaternion(), Vector((0, 0, 0)), inv)
    if tail_scale:     # uniform, in world terms: undo the inherited body squash, then scale (no shear in the chain)
        sc = P["cog"][2]
        P["tail_1"] = (Quaternion(), Vector((0, 0, 0)), Vector((tail_scale / sc.x, tail_scale / sc.z, tail_scale / sc.y)))
    if root_shift:     # slide the tail's root by a world offset (the sheet poses' rumps reach further back)
        qq, _, sc = P.get3("tail_1")
        def root_at(L):
            P["tail_1"] = (qq, Vector(L), sc); apply(P)
            return np.array((rig.matrix_world @ PB["tail_1"].head)[:])
        h0 = root_at((0, 0, 0))
        J = np.stack([root_at(e) - h0 for e in np.eye(3)], 1)
        L = np.linalg.solve(J, np.array(root_shift, float))
        P["tail_1"] = (qq, Vector(L), sc)
    if tail_curl:
        for b, (rx, rz) in zip(TAIL, tail_curl):
            P[b] = (q(rx, 0, rz), Vector((0, 0, 0)), Vector((1, 1, 1)))
    if tail_path:
        solve_tail(P, tail_path, world_len=bool(tail_scale) or tail_aim > 1, aim=tail_aim, hold1=tail_hold1)
    if ground:   # lift the whole cat (cog) so the lowest point just touches the floor
        apply(P)
        dz = 0.004 - lowest_z()
        qq, l, sc = P.get3("cog")
        # cog location is bone-local: its Y axis is world up (the bone points up), unrotated parent
        P["cog"] = (qq, l + Vector((0, dz, 0)), sc)
        if tail_path:
            solve_tail(P, tail_path, world_len=bool(tail_scale) or tail_aim > 1, aim=tail_aim, hold1=tail_hold1)
    return P

def shape_keys():
    sk = bpy.data.objects["cat_body"].data.shape_keys
    return sk.key_blocks if sk else {}

def morphs():
    return [k.name for k in shape_keys() if k.name != "Basis"]

def apply(P):
    for b in BONES:
        qq, l, s = P.get3(b)
        PB[b].rotation_quaternion = qq; PB[b].location = l; PB[b].scale = s
    for m in morphs():
        shape_keys()[m].value = P.get3("@" + m)[1].x
    bpy.context.view_layer.update()

def solve_tail(P, path, world_len=False, aim=1, hold1=False):
    """Aim each tail bone, root to tip, at the point on `path` one bone-length from its head.
    A path given as ("rel", [...]) is offsets from the posed tail root."""
    rel = isinstance(path, tuple) and path[0] == "rel"
    builder = path if callable(path) else None
    if rel:
        path = path[1]
    if not builder:
        path = [Vector(p) for p in path]
    keep_scale = P.get3("tail_1")[2].copy()
    keep_loc = P.get3("tail_1")[1].copy()          # a tail_root slide (make) survives the re-solve
    for b in TAIL:
        P.pop(b, None)
    P["tail_1"] = (Quaternion(), keep_loc, keep_scale)
    apply(P)
    root = rig.matrix_world @ PB["tail_1"].head
    if rel:
        path = [root + p for p in path]
    if builder:
        path = builder(root)
    for b in TAIL:
        pb = PB[b]
        head = rig.matrix_world @ pb.head
        if hold1 and b == "tail_1":
            P[b] = (pb.rotation_quaternion.copy(), keep_loc, keep_scale)
            continue
        def target_at(L):
            # first path point farther than L from head, walking the polyline
            target = None
            for a, c in zip(path[:-1], path[1:]):
                # solve |a + t(c-a) - head| = L for t in [0,1], take the largest t
                d = c - a; f = a - head
                A = d.dot(d); B = 2 * f.dot(d); C = f.dot(f) - L * L
                disc = B * B - 4 * A * C
                if disc >= 0:
                    t = (-B + math.sqrt(disc)) / (2 * A)
                    if 0 <= t <= 1:
                        target = a + d * t
            return path[-1] if target is None else target
        for _ in range(aim):    # (world_len: the bone's length changes with its direction under a squashed parent,
            cur = (rig.matrix_world @ pb.tail) - head      # so the target is found again after each aim)
            want = target_at(cur.length if world_len else pb.bone.length) - head
            rot_world = cur.rotation_difference(want)
            # convert the world-space delta into a bone-local delta
            M = (rig.matrix_world @ pb.matrix).to_3x3()
            local = M.inverted() @ rot_world.to_matrix() @ M
            pb.rotation_quaternion = pb.rotation_quaternion @ local.to_quaternion()
            bpy.context.view_layer.update()
        P[b] = (pb.rotation_quaternion.copy(), keep_loc if b == "tail_1" else Vector((0, 0, 0)),
                keep_scale if b == "tail_1" else Vector((1, 1, 1)))

def wrap(r, a0, a1, z0, z1, out=0.10, n=24):
    """Returns a path builder: the solver calls it with the posed tail root."""
    return lambda root: _wrap(root, r, a0, a1, z0, z1, out, n)

def _wrap(root, r, a0, a1, z0, z1, out, n):
    """Tail path: leaves the rump heading straight back, eases into a horizontal arc of radius r around the
    body's vertical axis (angles in degrees: 90 = straight back, 180 = the cat's right), with no sharp corner."""
    root = Vector(root)
    a = math.radians(a0)
    A = Vector((r * math.cos(a), r * math.sin(a), z0))
    T = Vector((-math.sin(a), math.cos(a), 0))
    P1 = root + Vector((0, out, 0)); P2 = A - T * out
    pts = []
    for i in range(10):
        t = i / 10
        pts.append(root * (1 - t) ** 3 + P1 * 3 * t * (1 - t) ** 2 + P2 * 3 * t * t * (1 - t) + A * t ** 3)
    return pts + arc(0, 0, r, a0, a1, z0, z1, n)

def wrap_ell(rx, ry, cy, a0, a1, z0, z1, out=0.10, n=28):
    """Like wrap(), round an ellipse (half-width rx, half-length ry, centred at y = cy) instead of a circle, for
    the long loaf and sleep bodies: the tail hugs the side instead of swinging wide of it."""
    return lambda root: _wrap_ell(root, rx, ry, cy, a0, a1, z0, z1, out, n)

def _wrap_ell(root, rx, ry, cy, a0, a1, z0, z1, out, n):
    root = Vector(root)
    def at(a_deg, z):
        a = math.radians(a_deg)
        return Vector((rx * math.cos(a), cy + ry * math.sin(a), z))
    A = at(a0, z0)
    T = (at(a0 + 1, z0) - at(a0 - 1, z0)).normalized() * (1 if a1 > a0 else -1)
    P1 = root + Vector((0, out, 0)); P2 = A - T * out
    pts = [root * (1 - t) ** 3 + P1 * 3 * t * (1 - t) ** 2 + P2 * 3 * t * t * (1 - t) + A * t ** 3
           for t in (i / 10 for i in range(10))]
    return pts + [at(a0 + (a1 - a0) * i / n, z0 + (z1 - z0) * i / n) for i in range(n + 1)]

def arc(cx, cy, r, a0, a1, z0, z1, n=24, lead=None):
    """Points on a horizontal arc around (cx, cy), angles in degrees (0 = +X, 90 = +Y/back), height z0->z1."""
    pts = [Vector(p) for p in (lead or [])]
    for i in range(n + 1):
        t = i / n
        a = math.radians(a0 + (a1 - a0) * t)
        pts.append(Vector((cx + r * math.cos(a), cy + r * math.sin(a), z0 + (z1 - z0) * t)))
    return pts

def blend(P0, P1, u):
    """Per bone: rotation along the shortest arc (u may leave [0, 1] for overshoot), loc/scale linear."""
    R = Pose()
    for b in BONES:
        q0, l0, s0 = P0.get3(b); q1, l1, s1 = P1.get3(b)
        d = q0.rotation_difference(q1)
        ax, ang = d.to_axis_angle()
        R[b] = (q0 @ Quaternion(ax, ang * u), l0.lerp(l1, u), s0.lerp(s1, u))
    return R

def merge(*parts):
    P = Pose()
    for p in parts:
        P.update(p)
    return P

# ------------------------------------------------------------------ easing
def ease(kind, u):
    u = min(max(u, 0.0), 1.0)
    if kind == "lin": return u
    if kind == "io": return u * u * (3 - 2 * u)
    if kind == "sine": return 0.5 - 0.5 * math.cos(math.pi * u)
    if kind == "in": return u * u
    if kind == "out": return 1 - (1 - u) * (1 - u)
    if kind == "back":     # overshoot ~10%, settle
        s = 1.70158; v = u - 1
        return 1 + (s + 1) * v ** 3 + s * v ** 2
    if kind == "elastic":  # snappy start, overshoot ~18%, one dip, lands exactly on 1
        return 1 - (1 - u) * math.exp(-4 * u) * math.cos(3 * math.pi * u)
    if kind == "soft":     # gentle overshoot ~6% (for settles)
        return 1 - (1 - u) * math.exp(-3 * u) * math.cos(2 * math.pi * u)
    raise ValueError(kind)

# per-bone lag in transitions (seconds): the body leads, the head follows, ears and tail trail
def lag_of(b):
    base = {"root": 0, "cog": 0, "hips": 0, "spine": 0.02, "chest": 0.04, "neck": 0.06, "head": 0.08}
    if b in base: return base[b]
    if b.startswith("ear"): return 0.13
    if b.startswith("arm"): return 0.03
    if b.startswith("paw"): return 0.06
    if b.startswith("thigh"): return 0.01
    if b.startswith("foot"): return 0.04
    if b.startswith("tail"): return 0.03 + 0.025 * int(b.split("_")[1])
    if b.startswith("whisker"): return 0.12
    return 0
MAXLAG = max(lag_of(b) for b in BONES)

# ------------------------------------------------------------------ key poses
# Sign guide (from the rig's roll): spine/neck/head +rx pitches forward; tail +rx lifts, +rz swings to the
# cat's right (-X); arm +rx swings the paw back, -rx reaches forward; ears +rx tip forward, rz splays.
def sit_tail_path(lift=0.0, wrap_deg=None, z_tip=None, r=None):
    # e1107-71: the sheet's sit never shows the tail (front, side, back), and wrapped round a haunch it always peeked
    # out from the front. So it leaves the rump straight back and curls up behind his back, where the head hides it
    # from the front. `lift` raises it a little (landing, startle); r (old clearance radius) leans it back.
    back = 0.06 if r is None else (r - 0.415)       # (clear of the head even when he squashes on landing)
    return ("rel", [(0, 0, 0), (0, 0.10 + back, 0.02), (0, 0.16 + back, 0.10 + lift), (0, 0.17 + back, 0.26 + lift),
                    (0, 0.20 + back, 0.42 + lift), (0, 0.24 + back, 0.55 + lift)])

def SIT(**kw):
    return make({}, tail_path=sit_tail_path(**kw))

def SIT_BREATHE():
    return make({"cog": dict(s=squash(1.012)), "chest": dict(r=(-1.5, 0, 0), s=wide(1.025)),
                 "head": (-1.2, 0, 0), "ear_L": (0, 0, -2), "ear_R": (0, 0, 2)},
                tail_path=sit_tail_path())

TAIL_KEEP_SQUASH = 0.3   # the tail keeps this share of the body squash (else it flattens into a ribbon)

# standing on four nubs: the whole body tilts forward on the cog (the rump rises without bending the
# lower body), legs stretch long to reach the floor (rubber hose)
STAND_SPEC = {
    "cog": dict(r=(14, 0, 0), l=(0, 0.0, 0.07), s=squash(1.04)),
    "neck": (-6, 0, 0), "head": (-8, 0, 0),
    "arm_L": dict(r=(-14, 0, 0), s=(1, 1.35, 1)), "arm_R": dict(r=(-14, 0, 0), s=(1, 1.35, 1)),
    "thigh_L": dict(r=(-14, 0, 0), s=(1, 1.2, 1)), "thigh_R": dict(r=(-14, 0, 0), s=(1, 1.2, 1)),
}
def stand_tail():
    return ("rel", [(0, 0, 0), (0, 0.16, 0.06), (0, 0.27, 0.20), (0, 0.30, 0.38), (0, 0.24, 0.52), (0, 0.16, 0.56)])
def STAND():
    return make(STAND_SPEC, tail_path=stand_tail(), ground=True)

def bow_tail():
    # up from the rump, then hooking forward over the back (the sheet's question mark)
    # (the big head sits higher than the sheet's, so the hook curls over without reaching forward into it)
    # it leaves the rump along its rest line (tilted up with the body) and only then curves up, so the root doesn't fold
    return ("rel", [(0, 0, 0), (0, 0.13, 0.08), (0, 0.22, 0.18), (0, 0.27, 0.31), (0, 0.27, 0.45), (0, 0.21, 0.55), (0, 0.12, 0.58), (0, 0.06, 0.54)])

# ---- the sheet poses (brother's pose sheets, docs/reference/poses), as fitted parameter sets.
# fit_pose.py fits these to the AI pose meshes; its results are pasted into FIT_* (start values) below.
# Parameters: cog tilt (deg, + = nose down), fwd (cog shift, + = forward), sx/sy/sz (cog squash: width, height,
# length), bend (a forward bend shared by spine, chest and neck: brings the head forward and down, the body behind
# it), cfwd/cdown (the shoulders slide forward and down off the hips: a longer body, rubber-hose), hfwd/hdown (the head slides forward and down off the neck: the sheets' loaf and sleep have the head in front of
# the body, not on top of it), spine/chest/neck (extra pitch each), head/arm/thigh (world pitch: the rig compensates for the body's tilt and
# bend, so these say where the part points), turn (a twist about the vertical shared by spine..head), chestlen,
# paw/foot pitch, armlen/thighlen (rubber-hose lengths), splay (thighs out), armsplay (front legs out). The head
# counter-scales the body squash, so it stays the sit's size in every pose; headscale (default 1) shrinks it on top.
def body_pose(v, ears, tail, extra=None, root=None):
    sx, sy, sz, cl = v["sx"], v["sy"], v["sz"], v.get("chestlen", 1.0)
    tw = v.get("turn", 0.0)
    bend = v.get("bend", 0.0)
    sp, ch, nk = v["spine"] + bend / 3, v["chest"] + bend / 3, v["neck"] + bend / 3
    above_chest = v["tilt"] + sp + ch            # pitch the arms inherit
    spec = {
        "cog": dict(r=(v["tilt"], 0, 0), l=(0, 0.0, v["fwd"]), s=(sx, sy, sz)),
        "spine": (sp, tw, 0), "neck": (nk, tw, 0),
        # shoulder slide (chest local: Y up, Z forward), in world units like the head slide
        "chest": dict(r=(ch, tw, 0), s=(1, cl, 1), l=(0, -v.get("cdown", 0.0) / sy, v.get("cfwd", 0.0) / sz)),
        # head slide: local Y is up, local Z forward; divided by the body squash so the values are world units
        "head": dict(r=(v["head"] - above_chest - nk, tw, 0), s=tuple(v.get("headscale", 1.0) * c for c in (1 / sx, 1 / (sy * cl), 1 / sz)),
                     l=(0, -v.get("hdown", 0.0) / (sy * cl), v.get("hfwd", 0.0) / sz)),
        "arm_L": dict(r=(v["arm"] - above_chest, 0, -v.get("armsplay", 0.0)), s=(1, v["armlen"], 1)),   # armsplay: front legs out, as splay
        "arm_R": dict(r=(v["arm"] - above_chest, 0, v.get("armsplay", 0.0)), s=(1, v["armlen"], 1)),
        "paw_L": (v["paw"], 0, 0), "paw_R": (v["paw"], 0, 0),
        "thigh_L": dict(r=(v["thigh"] - v["tilt"], 0, -v["splay"]), s=(1, v["thighlen"], 1)),
        "thigh_R": dict(r=(v["thigh"] - v["tilt"], 0, v["splay"]), s=(1, v["thighlen"], 1)),
        "foot_L": (v["foot"], 0, 0), "foot_R": (v["foot"], 0, 0),
    }
    spec.update(ears)
    spec.update(extra or {})
    return make(spec, tail_path=tail, ground=True, root_shift=root)

# each pose's height (floor to the highest point) in cat units, read off the sheets' views with the head as the
# ruler (its width and height match the sit's). The sheets are slightly perspective, so these are +-10%.
SHEET_HEIGHT = dict(loaf=0.82, sleep=0.80, stretch=1.25)
TAIL_EXIT_BAND = dict(loaf=(0.08, 0.25), sleep=(0.08, 0.25), stretch=(0.60, 0.95))   # height band where the tail leaves

def _fp(**kw):     # parameter table: name -> (start, step, lo, hi)
    base = dict(tilt=(0, 6, -30, 70), fwd=(0, 0.04, -0.35, 0.3), sx=(1, 0.08, 0.75, 1.7), sy=(1, 0.08, 0.6, 1.5),
                sz=(1, 0.08, 0.75, 2.0), bend=(0, 8, -25, 45), hfwd=(0, 0.04, -0.1, 0.6), hdown=(0, 0.04, -0.15, 0.45),
                cfwd=(0, 0.04, -0.1, 0.6), cdown=(0, 0.04, -0.3, 0.4), spine=(0, 5, -30, 30), chest=(0, 5, -30, 30),
                neck=(0, 5, -30, 30),
                head=(0, 6, -40, 50), arm=(0, 10, -100, 70), armlen=(1, 0.1, 0.7, 2.2), paw=(0, 10, -80, 80),
                thigh=(0, 8, -70, 50), splay=(0, 5, -15, 30), thighlen=(1, 0.1, 0.7, 2.2), foot=(0, 10, -70, 70))
    for k, v in kw.items():
        base[k] = (v,) + base.get(k, (v, 0.05, -1e9, 1e9))[1:] if not isinstance(v, tuple) else v
    return base

FIT_LOAF = _fp(sx=1.12, sy=0.8, sz=1.35, fwd=-0.2, bend=10, hfwd=0.25, hdown=0.12, head=4, arm=6, paw=-6, splay=6)
FIT_SLEEP = _fp(sx=1.14, sy=0.8, sz=1.36, fwd=-0.2, bend=10, hfwd=0.3, hdown=0.18, head=10, arm=6, paw=-6,
                turn=(-4, 4, -25, 25))
FIT_STRETCH = _fp(   # the play-bow, from the AI mesh's landmarks: head low over flat front legs, rump high on long hind legs
    tilt=(45, 5, 25, 65), fwd=(-0.1, 0.04, -0.35, 0.2), sx=1.1, sy=1.0, sz=1.0, hdown=(0.25, 0.04, 0.05, 0.45),
    hfwd=(0.0, 0.04, -0.15, 0.3), head=(5, 5, -20, 30), arm=(-70, 8, -110, -30), armlen=(1.5, 0.1, 1.0, 2.2), paw=(0, 10, -40, 60),
    thigh=(0, 8, -40, 40), thighlen=(1.6, 0.1, 1.2, 2.2), foot=(0, 10, -40, 60), chestlen=(1.0, 0.08, 0.8, 1.4))

def loaf_tail():
    # out of the rump and round his left side (the sheet's side and 3/4 views), tucked along the floor under the
    # edge of the loaf, tip forward by his left front paw
    # hugging the blockout's footprint at tail height (0.40 half-wide, back end at y 0.78) one tail radius out, so no
    # stub pokes out behind (Aaron, 2026-11-08)
    return wrap_ell(0.49, 0.46, 0.40, 88, -40, 0.11, 0.075, out=0.10)
def sleep_tail2():
    # the same, further round: the tip comes round the front towards the paws
    # (hugging the sleep blockout's footprint at tail height, as the loaf's: 0.625 out on his left)
    return wrap_ell(0.71, 0.62, 0.41, 78, -70, 0.08, 0.075, out=0.06)
# whisk_lift raises the whisker tips (degrees; more on the lower whiskers): level on the loaf, over the paws asleep
LOAF_EARS = {"ear_L": (6, 0, 8), "ear_R": (6, 0, -8), "whisk_lift": 8, "tail_scale": 1.2, "tail_aim": 6}   # (the sheet's tail: thick, round to the paws; 1.25 kinked mid-move)
SLEEP_EARS = {"ear_L": (6, 0, 8), "ear_R": (6, 0, -8), "whisk_lift": 0, "tail_scale": 1.2, "tail_aim": 6, "tail_hold1": True}   # (more lift pushes them into the cheeks)
STRETCH_EARS = {"ear_L": (-14, 0, 0), "ear_R": (-14, 0, 0)}
# tail root slides (world: x, back, up) so the tail leaves the rump where the sheet's rump is, not inside it
LOAF_TAIL_ROOT = STRETCH_TAIL_ROOT = None
SLEEP_TAIL_ROOT = (0.10, -0.02, -0.12)   # (sleep: the root slides low on the rump, so the tail leaves near the floor, as on the sheet)   # (the skeleton fit puts the root on the rump instead: a slide webs the skin)
def lie_from(v):
    return body_pose(v, LOAF_EARS, loaf_tail(), root=LOAF_TAIL_ROOT)
def sleep_from(v):
    return body_pose(v, SLEEP_EARS, sleep_tail2(), root=SLEEP_TAIL_ROOT)
def bow_from(v):
    return body_pose(v, STRETCH_EARS, bow_tail(), root=STRETCH_TAIL_ROOT)

# fitted by fit_pose.py to targets/<pose>.ply (the chosen AI meshes, see build/README.md)
LOAF_V = dict(tilt=3.437, fwd=-0.316, sx=1.2, sy=0.748, sz=1.441, bend=-15.451, hfwd=0.225, hdown=0.102, cfwd=0.08, cdown=0.074, spine=-2.842, chest=6.816, neck=-7.356, head=2.811, arm=-15.107, armlen=0.719, paw=41.501, thigh=15.931, splay=-1.343, thighlen=1.048, foot=-7.193)
SLEEP_V = dict(tilt=4.758, fwd=-0.35, sx=1.546, sy=0.807, sz=2.0, bend=45, hfwd=0.213, hdown=0.045, cfwd=-0.098, cdown=0.063, spine=-2.135, chest=-5.363, neck=2.477, head=12.652, arm=-17.65, armlen=0.917, paw=35.622, thigh=39.862, splay=14.079, thighlen=1.08, foot=-50.414, turn=0.126)
STRETCH_V = dict(tilt=50, fwd=0.10, sx=0.96, sy=1.0, sz=1.1, bend=0.0, hfwd=0.0, hdown=0.0, cfwd=0.0, cdown=0.0, spine=0.0, chest=0.0, neck=-6, head=38, arm=-23, armlen=1.3, paw=70, thigh=26, splay=0.0, thighlen=1.6, foot=0.0, chestlen=1.15)   # the previous build's clip-free bow: his head can't sit as low as the sheet's, so the legs reach and the shape does the rest

def tweak(v, **d):
    """A copy of a parameter table with some values changed: multiplied for the squash (sx/sy/sz), added otherwise."""
    v = dict(v)
    for k, x in d.items():
        v[k] = v.get(k, 1.0 if k in ("sx", "sy", "sz") else 0.0) * x if k in ("sx", "sy", "sz") else v.get(k, 0.0) + x
    return v

# Clip margin (2026-11-08): the fitted front legs tuck the paw balls so close under the chest that the crease between
# them closes at a 4% squash, and every springy arrival squashes more than that. Swung back a little (and asleep,
# the paws tipped up so they stay on the floor), the crease stays open. Sheet overlap moves by under 0.01.
LOAF_V = tweak(LOAF_V, arm=5)
SLEEP_V = tweak(SLEEP_V, arm=10, paw=-10, armsplay=3)   # (and asleep the paw balls' notch closed: legs a touch apart)

def with_shape(P, name, w=1.0):
    P["@" + name] = (Quaternion(), Vector((w, 0, 0)), Vector((1, 1, 1)))
    return P

# Loaf (sheet: loaf): the skeleton puts the head low over tucked paws, the body bent behind it; the loaf shape
# (wrapped from the AI mesh) makes the long dome and wraps nothing else.
def LIE():
    return with_shape(lie_from(LOAF_V), "loaf")
def LIE_BREATHE():
    return with_shape(lie_from(tweak(LOAF_V, sy=1.02, sx=1.01)), "loaf")
# Sleep (sheet: sleep): a curled loaf, head tucked down, whiskers over the paws, tail round the front
SLEEP_LIFT = -0.03       # (the fitted head sits 3 cm too low over the paws: they clip under the chin)
SLEEP_NOD = 0            # (lower or nodded, the head is his lowest point and grounding lifts the whole cat: tried 2026-11-08)
def SLEEP():
    return with_shape(sleep_from(tweak(SLEEP_V, hdown=SLEEP_LIFT, head=SLEEP_NOD)), "sleep")
def SLEEP_BREATHE():
    return with_shape(sleep_from(tweak(SLEEP_V, sy=1.015, sx=1.005, hdown=SLEEP_LIFT, head=SLEEP_NOD)), "sleep")
# Stretch (sheet: stretch): the play-bow
def BOW():
    # (a shape wrapped from the stretch sheet's AI mesh was built and dropped: it read worse than the bare bow and
    # clipped; see build/README.md. The bow is the skeleton's, as in the previous build.)
    return bow_from(STRETCH_V)

POSES = dict(sit=SIT, lie=LIE, sleep=SLEEP, stand=STAND, bow=BOW)

def preview():
    global POSES
    if len(argv) > 2:   # only some poses: names of pose functions, e.g. SLEEP,BOW_DEEP
        POSES = {n: globals()[n] for n in argv[2].split(',')}
    cam = U.ortho_camera()
    rows = []
    for mode in ("shaded",):
        U.setup_workbench(mode, 260)
        for name, fn in POSES.items():
            apply(fn())
            sh, wh, fl, spots, wsp = U.collisions(rig, bpy.data.objects["cat_body"], bpy.data.objects["cat_whiskers"], where=True)
            log(f"pose {name:12s} self {sh:4d} whisk {wh:3d} floor {fl:+.3f}",
                ("self at " + str(sorted(set(spots))[:: max(1, len(set(spots)) // 6)])) if sh else "",
                ("whisk at " + str(sorted(set(wsp))[:: max(1, len(set(wsp)) // 4)])) if wh else "")
            row = []
            for yaw in (0, 45, 90, 135, 180, 270):
                U.aim(cam, yaw, 10, (0, 0.0, 0.42), scale=1.9)
                p = os.path.join(OUT, "_tmp.png")
                row.append(U.label(U.render_to_array(p), f"{name} {yaw}"))
            rows.append(row)
    os.remove(os.path.join(OUT, "_tmp.png"))
    U.save_grid(rows, os.path.join(OUT, "poses.png"))
    log("preview written")

# ------------------------------------------------------------------ comparison with the brother's pose sheets
# Renders a pose from the sheet's cameras (front, side, three-quarter) next to the sheet's cut views and scores
# each view by silhouette overlap (IoU): both silhouettes cropped to their bounding box, scaled to the same height,
# aligned bottom-centre. Height-normalised, so it measures shape and proportion, not size.
#   blender -b work/cat_rig.blend --python anim_cat.py -- work compare LIE,SLEEP,BOW   -> work/compare.png
REF = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../docs/reference"))
SHEET_OF = {"SIT": "sit", "LIE": "loaf", "SLEEP": "sleep", "BOW": "stretch", "BOW_DEEP": "stretch"}
VIEWS = (("front", 0), ("side", 90), ("three-quarter", 38))   # sheet view, our camera yaw (90 = from his left)
SHEET_PITCH = 9

def sheet_path(sheet, view):
    if sheet == "sit":
        return os.path.join(REF, "views", f"{view}.png") if view != "three-quarter" else None
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "crops", f"{sheet}-{view}.png")   # make_crops.py

def load_rgb(path):
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
    bpy.data.images.remove(img)
    return a

def silhouette(a):
    bg = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), 0)
    return np.abs(a - bg).sum(2) > 0.25

def norm_sil(m, H=240, W=480):
    ys, xs = np.nonzero(m.sum(1) >= 3)[0], np.nonzero(m.sum(0) >= 3)[0]    # specks don't set the box
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    nw = min(W, max(1, round(w * H / h)))
    yi = (np.arange(H) * h / H).astype(int); xi = (np.arange(nw) * w / nw).astype(int)
    r = m[yi][:, xi]
    out = np.zeros((H, W), bool); x0 = (W - nw) // 2
    out[:, x0:x0 + nw] = r
    return out

def iou(a, b):
    return float((a & b).sum() / max(1, (a | b).sum()))

def fit_tile(a, size):
    """Letterbox an image into a size x size tile (nearest-neighbour)."""
    h, w = a.shape[:2]; k = size / max(h, w)
    nh, nw = max(1, int(h * k)), max(1, int(w * k))
    yi = (np.arange(nh) / k).astype(int).clip(0, h - 1); xi = (np.arange(nw) / k).astype(int).clip(0, w - 1)
    t = np.ones((size, size, 3), np.float32) * np.array(U.CREAM, np.float32)
    y0, x0 = (size - nh) // 2, (size - nw) // 2
    t[y0:y0 + nh, x0:x0 + nw] = a[yi][:, xi]
    return t

def overlay(ours, ref):
    """Our silhouette (grey) and the sheet's outline (red) on one tile, both height-normalised."""
    t = np.ones(ours.shape + (3,), np.float32) * np.array(U.CREAM, np.float32)
    t[ours] = (0.35, 0.35, 0.38)
    edge = ref & ~(np.roll(ref, 1, 0) & np.roll(ref, -1, 0) & np.roll(ref, 1, 1) & np.roll(ref, -1, 1))
    edge |= np.roll(edge, 1, 0) | np.roll(edge, 1, 1)
    t[edge] = (0.85, 0.1, 0.1)
    return t

def compare(names, size=260, out_name="compare.png"):
    cam = U.ortho_camera()
    rows, scores = [], {}
    for name in names:
        sheet = SHEET_OF.get(name.split(":")[0], "sit")
        apply(globals()[name.split(":")[0]]())
        row_ref, row_ours, row_ov = [], [], []
        for view, yaw in VIEWS:
            path = sheet_path(sheet, view)
            if not path:
                continue
            ref = load_rgb(path)
            U.setup_workbench("silhouette", 400)
            U.aim(cam, yaw, SHEET_PITCH, (0, 0.05, 0.40), scale=2.3)
            p = os.path.join(OUT, "_cmp.png")
            sil = silhouette(U.render_to_array(p))
            U.setup_workbench("shaded", 400)
            shaded = U.render_to_array(p)
            a, b = norm_sil(sil), norm_sil(silhouette(ref))
            scores[f"{name} {view}"] = round(iou(a, b), 3)
            row_ref.append(U.label(fit_tile(ref, size), f"sheet {sheet} {view}"))
            ys, xs = np.nonzero(sil); pad = 12
            crop = shaded[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]
            row_ours.append(U.label(fit_tile(crop, size), f"{name} {yaw}"))
            row_ov.append(U.label(fit_tile(overlay(a, b), size), f"iou {scores[name + ' ' + view]:.2f}"))
        rows += [row_ref, row_ours, row_ov]
        log(name, {k: v for k, v in scores.items() if k.startswith(name + " ")})
    if os.path.exists(os.path.join(OUT, "_cmp.png")):
        os.remove(os.path.join(OUT, "_cmp.png"))
    U.save_grid(rows, os.path.join(OUT, out_name))
    json.dump(scores, open(os.path.join(OUT, out_name.rsplit(".", 1)[0] + ".json"), "w"), indent=1)
    return scores

# ------------------------------------------------------------------ in-between poses
def variant(base_spec, tail, ground=False, **over):
    sp = dict(base_spec); sp.update(over)
    return make(sp, tail_path=tail, ground=ground)

def SIT_SPEC_():
    return {}
def ANTIC_UP():      # sit, drawing up before pouring forward
    return variant({}, sit_tail_path(), cog=dict(s=squash(1.07)), head=(-7, 0, 0), ear_L=(-6, 0, -4), ear_R=(-6, 0, 4))
def SIT_CROUCH():    # sit, squashing down before springing up
    return variant({}, sit_tail_path(r=0.505), cog=dict(s=squash(0.86)), head=(5, 0, 0), ear_L=(8, 0, 6), ear_R=(8, 0, -6))
def SIT_LAND():      # landing in sit at the end of the stretch: squashed, ears flung forward
    return variant({}, sit_tail_path(lift=0.03, r=0.51), cog=dict(s=squash(0.84)), head=dict(r=(6, 0, 0), s=squash(0.96)),
                   ear_L=(14, 0, 8), ear_R=(14, 0, -8))
def LIE_ANTIC():     # loaf, squashing deeper before pushing up
    return with_shape(lie_from(tweak(LOAF_V, sy=0.95, sx=1.02, hdown=-0.03)), "loaf")
def LIE_YAWN():      # loaf, head lifting back before tucking into sleep
    return with_shape(lie_from(tweak(LOAF_V, head=-4, sy=1.03, hdown=-0.05)), "loaf")   # (-8 crossed the reshaped chin)
def SLEEP_ANTIC():   # asleep, a big breath in before waking (curling tighter pressed the chin into the paws)
    return with_shape(sleep_from(tweak(SLEEP_V, sy=1.03, sx=0.99, hdown=SLEEP_LIFT, head=SLEEP_NOD, armsplay=3)), "sleep")   # (legs apart: the paw notch)
# mid-move keys: the parts that would pass through each other on a straight blend are held apart on the way through
def straight_back_tail():
    # (long enough for the loaf's longer tail: past its end the last bones bunch up and kink)
    return ("rel", [(0, 0, 0), (0, 0.15, 0.0), (0, 0.33, -0.03), (0, 0.50, -0.06), (0, 0.66, -0.08), (0, 0.82, -0.09), (0, 0.98, -0.10)])
def MID_LOAF_UP():   # between sit and loaf: head lifted off the paws, paws forward under the chin, tail straight back
    v = tweak(LOAF_V, hdown=-0.18, hfwd=-0.06, sy=1.12, arm=-15)   # (paws further forward fold the paw crease)
    return with_shape(body_pose(v, LOAF_EARS, straight_back_tail()), "loaf", 0.4)   # (0.6 folded the blockout's bigger paw balls)
# (2026-11-08) both in-between keys keep the sleep's lowered tail root, or it jumps between keys and the tail crosses
# itself, and route the tail wide round the haunch, outside both blended bodies (scan_clips: loaf and sleep tails cut
# the left haunch on the way through)
def MID_SLEEP_UP():  # between loaf and sleep: the head lifts clear of the haunch while the body curls
    v = tweak(SLEEP_V, hdown=-0.12, sy=1.10, armsplay=3)    # (rising this much keeps the belly's underside from creasing mid-way; legs apart keep the paw notch open)
    P = with_shape(body_pose(v, SLEEP_EARS, wrap_ell(0.85, 0.66, 0.41, 90, -50, 0.08, 0.075, out=0.06), root=SLEEP_TAIL_ROOT), "sleep", 0.5)
    return with_shape(P, "loaf", 0.5)
def MID_WAKE_UP():   # between sleep and loaf on waking: the head lifts higher than when dozing off (lower, the dome's rim
    v = tweak(SLEEP_V, hdown=-0.18, sy=1.10, armsplay=3)    # behind the head folds into the back as the loaf arrives)
    P = with_shape(body_pose(v, SLEEP_EARS, wrap_ell(0.72, 0.66, 0.41, 90, -50, 0.11, 0.09, out=0.07), root=SLEEP_TAIL_ROOT), "sleep", 0.5)
    return with_shape(P, "loaf", 0.5)
def MID_BOW_UP():    # diving into the bow: arms already forward, head still up
    return bow_from(dict(STRETCH_V, tilt=40, head=30))

def STAND_ANTIC():   # standing, rocking back before the bow
    return variant(STAND_SPEC, stand_tail(), ground=True, cog=dict(r=(6, 0, 0), l=(0, 0.01, 0.05), s=squash(0.95)))
def BOW_DEEP():      # holding the bow, reaching further (the long, trembling part of a stretch)
    return bow_from(dict(STRETCH_V, tilt=54, neck=-8, head=38, arm=-26, armlen=1.32, thighlen=1.7, chestlen=1.2))
def STAND_TALL():    # popping back up out of the bow, stretched tall
    return variant(STAND_SPEC, stand_tail(), ground=True, cog=dict(r=(8, 0, 0), l=(0, 0.0, 0.09), s=squash(1.09)), head=(-10, 0, 0))

# ------------------------------------------------------------------ sculpted pose shapes (corrective blend shapes)
# The sheet's poses are body-shape changes more than joint bends (decision e1107-64). For each shaped pose the
# rig is posed (the skeleton fitted to an AI mesh of the brother's pose sheet by fit_pose.py), the body is wrapped
# onto that mesh (wrap_util.py; head, ears, tail and whiskers excluded), the offsets are smoothed in posed space
# (neighbours across the neck skin very differently, so smoothing bind-space offsets would undo the correction at
# the crease), and each offset is taken back to bind space through the inverse of that vertex's skinning matrix.
# glTF morph targets apply before skinning, so at weight 1 in that pose the body lands exactly on the wrap.
#   loaf, sleep, stretch   one per sheet pose, from targets/<name>.ply
import numpy as np
SHAPE_SMOOTH = 14      # smoothing passes on the offsets

def posed_state(P):
    body = bpy.data.objects["cat_body"]; me = body.data
    apply(P)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = body.evaluated_get(dg).to_mesh()
    posed = np.array([v.co[:] for v in ev.vertices])
    body.evaluated_get(dg).to_mesh_clear()
    gname = [g.name for g in body.vertex_groups]
    mats = {n: np.array(PB[n].matrix @ PB[n].bone.matrix_local.inverted()) for n in gname}
    nv = len(me.vertices)
    A = np.zeros((nv, 3, 3)); W = {k: np.zeros(nv) for k in ("tail", "ear", "head", "arm", "paw", "thigh", "foot")}
    for v in me.vertices:
        for g in v.groups:
            n = gname[g.group]
            A[v.index] += g.weight * mats[n][:3, :3]
            for k in W:
                if n.startswith(k): W[k][v.index] += g.weight
    return posed, A, W

def store_shape(name, posed, A, target, k, smooth=None):
    body = bpy.data.objects["cat_body"]; me = body.data
    dp = (target - posed) * k[:, None]
    nv = len(me.vertices)
    ed = np.array([e.vertices[:] for e in me.edges])
    deg = np.bincount(ed.ravel(), minlength=nv).astype(float)[:, None]
    for _ in range(SHAPE_SMOOTH if smooth is None else smooth):
        acc = np.zeros_like(dp); np.add.at(acc, ed[:, 0], dp[ed[:, 1]]); np.add.at(acc, ed[:, 1], dp[ed[:, 0]])
        dp = 0.5 * dp + 0.5 * acc / deg
    d = np.linalg.solve(A, dp[..., None])[..., 0]
    rest = np.array([v.co[:] for v in me.vertices])
    if not me.shape_keys:
        body.shape_key_add(name="Basis", from_mix=False)
    kb = body.shape_key_add(name=name, from_mix=False)
    for i, v in enumerate(kb.data):
        v.co = rest[i] + d[i]
    kb.slider_min, kb.slider_max = 0.0, 1.03     # shapes barely overshoot (they fold if pushed far past 1); the bones carry the spring
    log(f"shape {name}: max offset {float(np.abs(d).max()):.3f}, mean {float(np.linalg.norm(dp, axis=1).mean()):.3f}")

# ---- shapes wrapped from AI pose meshes (wrap_util.py): the skeleton pose does the big moves, the wrap the rest
import wrap_util as WU
TARGETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "targets")

def posed_normals(P):
    apply(P)
    dg = bpy.context.evaluated_depsgraph_get(); body = bpy.data.objects["cat_body"]
    ev = body.evaluated_get(dg).to_mesh()
    n = np.array([v.normal[:] for v in ev.vertices])
    body.evaluated_get(dg).to_mesh_clear()
    return n

DEBUG_FIT = os.environ.get("DEBUG_FIT")

def fit_overlay(tv, tf, out_name, yaws=(0, 90, 38)):
    """Debug: the registered target (red) over the posed cat (grey), as silhouettes."""
    me = bpy.data.meshes.new("tgt"); me.from_pydata([tuple(p) for p in tv], [], tf)
    tob = bpy.data.objects.new("tgt", me); bpy.context.scene.collection.objects.link(tob)
    cam = U.ortho_camera(); U.setup_workbench("silhouette", 300); row = []
    cat = [bpy.data.objects[n] for n in ("cat_body", "cat_whiskers")]
    lo, hi = tv.min(0), tv.max(0); ctr = (lo + hi) / 2; span = float((hi - lo).max()) * 1.25
    for yaw in yaws:
        U.aim(cam, yaw, SHEET_PITCH, tuple(ctr), scale=max(2.0, span))
        tob.hide_render = True
        a = silhouette(U.render_to_array("/tmp/_fo.png"))
        tob.hide_render = False
        for o in cat: o.hide_render = True
        b = silhouette(U.render_to_array("/tmp/_fo.png"))
        for o in cat: o.hide_render = False
        t = np.ones(a.shape + (3,), np.float32) * np.array(U.CREAM, np.float32)
        t[a] = (0.45, 0.45, 0.5); t[b & ~a] = (0.9, 0.5, 0.5); t[a & b] = (0.35, 0.2, 0.25)
        row.append(U.label(t, f"fit {yaw}"))
    bpy.data.objects.remove(tob); bpy.data.meshes.remove(me)
    U.save_grid([row], os.path.join(OUT, out_name))

NECK_CREASE_CUT = 3.0  # how wide a band round the neck crease the pose shapes leave out of the re-applied creases
TAIL_COLLAR = 0.15     # radius round the tail root where the body keeps (most of) its posed shape
BLOCKOUT_TAIL_HOLD = {"sleep": 0.3}   # tail weight below which the root's skin follows the rump (sleep's root slides down)
HEAD_FILLET = 0.08     # blockout targets: smooth-union radius where the body meets the head (sdf_morph.py)
BODY_DELTA_SMOOTH = 12  # blockout targets: smoothing passes on the body's displacement (fit_target)
HANDOVER = 0.15        # blockout targets: k below this moves the skin only part of the way (smoothstep)
ROOT_IRON = (0.22, 30)  # blockout targets: radius round the tail root and passes of the fold ironing (fit_target)
BLOCKOUT_EVEN = 60      # blockout targets: passes evening the skin out along the goal after the morph (sdf_morph.py)
HEAD_BACK_FREE = 0.8   # how free the back of the head is to melt into the body (the face never moves)
MORPH_PY = os.path.expanduser(os.environ.get("MORPH_PY", "~/ai/hy3d-venv/bin/python"))   # numpy+scipy+trimesh
# per-target morph settings passed to sdf_morph.py: head_carve cuts the target's head round ours (for a target
# drawn with a smaller head); cut_target_head cuts it out wherever the target has it (tried on the old bow: worse)
WRAP_KW = {"stretch": dict(head_carve=0.08)}

def fit_target(posed, W, P, tname):
    """Fits the posed body onto targets/<tname>.ply (placed in cat units by prep_targets.py) with sdf_morph.py:
    the face, ears and tail stay where the skeleton puts them, the rest (and the back of the head, which melts
    into the body as on the sheets) moves onto the target. Then the creases go back on, nothing sinks through
    the floor, and untangle removes leftover self-intersections. Returns (posed-space positions, k)."""
    me = bpy.data.objects["cat_body"].data
    ed = WU.edges_of(me)
    tv, tf = WU.load_ply(os.path.join(TARGETS, tname + ".ply"))
    if DEBUG_FIT:
        fit_overlay(tv, tf, f"scratch/fit-{tname}.png")
    headish = np.clip(W["head"] + W["ear"], 0, 1)
    tail = np.clip((W["tail"] - 0.25) / 0.5, 0, 1)      # the tail itself; the rump it grows from stays free
    k = (1 - headish) ** 2 * (1 - tail)
    # the back of the head (the side facing the body) may melt into the body, as on the sheets; face and ears stay
    hc = posed[W["head"] > 0.9].mean(0); bc = posed[k > 0.9].mean(0)
    dirb = (bc - hc) / np.linalg.norm(bc - hc)
    rel = posed - hc; rel /= np.maximum(np.linalg.norm(rel, axis=1, keepdims=True), 1e-9)
    fwd = np.array((rig.matrix_world.to_3x3() @ PB["head"].matrix.to_3x3()).col[2][:]); fwd /= np.linalg.norm(fwd)
    face = np.clip((rel @ fwd - 0.3) / 0.3, 0, 1)
    back = np.clip((rel @ dirb + 0.2) / 0.5, 0, 1) * HEAD_BACK_FREE * (1 - face) * (1 - np.clip(W["ear"] * 3, 0, 1))
    # the cheeks round the whisker roots stay put too (the AI mesh has the whiskers fused on as lumps there)
    roots = np.array([(rig.matrix_world @ PB[b].head)[:] for b in BONES if b.startswith("whisker")])
    dw = np.min(np.linalg.norm(posed[:, None, :] - roots[None], axis=2), axis=1)
    back = back * np.clip((dw - 0.10) / 0.10, 0, 1)
    back = back * np.clip(headish * 10, 0, 1)   # only on the head and the neck band (the tail is behind the head too)
    if os.path.exists(os.path.join(TARGETS, tname + "-blockout.json")):
        # (blockouts: the whole head stays rigid, a round ball in front of the body as on the sheets; melting its back
        # into the dome and freeing the chin flattened and dented it in profile, Aaron 2026-11-08)
        back = np.zeros(len(posed))
    k = np.maximum(k, back)       # not scaled by head weight beyond that: the neck band must be free too
    k = WU.smooth_field(k[:, None], ed, len(posed), 6)[:, 0]
    # a collar round the tail's root stays near the posed rump, so the grown rump can't fold over the root
    root = np.array((rig.matrix_world @ PB["tail_1"].head)[:])
    collar = np.clip(np.linalg.norm(posed - root, axis=1) / TAIL_COLLAR, 0, 1) ** 2
    if os.path.exists(os.path.join(TARGETS, tname + "-blockout.json")):
        # (blockouts: the collar holds only the tail's own skin; plain rump skin round the root goes to the new rump,
        # which can sit far from the posed one; held, it crumpled into the root)
        hold = BLOCKOUT_TAIL_HOLD.get(tname, 0.0)       # (a slid root leaves lightly tail-weighted skin up the rump)
        collar = 1 - (1 - collar) * np.clip((W["tail"] - hold) * 5, 0, 1)
    k = k * collar
    keep = np.clip(headish + tail, 0, 1)
    import subprocess, tempfile
    tmp = tempfile.mkdtemp(dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), "work"))
    extra = dict(WRAP_KW.get(tname, {}))
    bpath = os.path.join(TARGETS, tname + "-blockout.json")
    if os.path.exists(bpath):          # a primitive blockout: sdf_morph.py evaluates its exact field
        extra["blockout"] = open(bpath).read()
        extra.update(even=BLOCKOUT_EVEN, head_fillet=HEAD_FILLET, w_ear=W["ear"])
    if extra.pop("cut_target_head", False):
        # the target's own head, wherever it is (prep_targets.py recorded its placement): an ellipsoid round the rest
        # head and a ball on each ear, mapped by R, t. Cut out, the body follows the target and never grows a 2nd head.
        pl = json.load(open(os.path.join(TARGETS, tname + ".json")))
        R, t = np.array(pl["R"]), np.array(pl["t"])
        rest = np.array([v.co[:] for v in me.vertices])
        hd = rest[(W["head"] > 0.85) & (W["ear"] < 0.05)]
        c = (hd.min(0) + hd.max(0)) / 2; rad = (hd.max(0) - hd.min(0)) / 2
        ears = [rest[(W["ear"] > 0.5) & (np.sign(rest[:, 0]) == sg)].mean(0) for sg in (1, -1)]
        extra.update(thead_c=R @ c + t, thead_M=R @ np.diag(rad), thead_ears=np.array([R @ e + t for e in ears]),
                     thead_ear_r=0.12 * np.cbrt(abs(np.linalg.det(R))))
    np.savez(os.path.join(tmp, "in.npz"), verts=posed, tris=WU.tri_faces(me), edges=ed, k=k, keep=keep, keep_tail=tail,
             tverts=tv, tfaces=np.array([f[:3] for f in tf]), **extra)
    r = subprocess.run([MORPH_PY, "-I", os.path.join(os.path.dirname(os.path.abspath(__file__)), "sdf_morph.py"),
                        os.path.join(tmp, "in.npz"), os.path.join(tmp, "out.npz")], capture_output=True, text=True)
    for line in r.stdout.splitlines():
        log(line)
    if r.returncode:
        raise RuntimeError("sdf_morph failed:\n" + r.stderr[-3000:])
    out = np.load(os.path.join(tmp, "out.npz")); x = out["verts"]
    if "k" in out.files:
        k = out["k"]           # (blockouts: the morph frees the part of the head that ends up inside the body)
    if "blockout" in extra:
        # in the morph k is a speed, so any vertex with k > 0 still lands on the goal and the hand-over from held to
        # moved skin is a step (it was a band across the back of the head). Here k sets how far each one goes.
        w = np.clip(k / HANDOVER, 0, 1); w = w * w * (3 - 2 * w)
        x = posed + w[:, None] * (x - posed)
        # the sit's chin and neck crease (build_cat.py) stays on the held face as a groove round the lower head; lying
        # on his paws it reads as a line, so it is filled back out where the skin didn't move (not paw balls, haunches)
        if "crease" in me.attributes:
            cr = np.zeros(len(posed)); me.attributes["crease"].data.foreach_get("value", cr)
            limbs = W["arm"] + W["paw"] + W["thigh"] + W["foot"]
            m = (1 - np.clip(limbs * 20, 0, 1)) * (1 - np.clip(W["ear"] * 10, 0, 1)) * np.clip(cr, 0, None) * (1 - w)
            x = x + m[:, None] * WU.vertex_normals(x, WU.tri_faces(me))
    # untangle: the body may give a little anywhere, but never the tail, ears or face (smoothing shrinks thin parts)
    # put the creases back (build_cat.py: paw balls, chin, ear bases, haunches): the morph smooths them away
    # (not on a blockout target: it has its own paw balls, and the haunch and neck lines read as fold lines on its
    # smooth body, Aaron 2026-11-08)
    if "crease" in me.attributes and "blockout" not in extra:
        cr = np.zeros(len(posed)); me.attributes["crease"].data.foreach_get("value", cr)
        # not the neck crease (build_cat.py: the head/body hand-over ring): the head slides forward and the back of the
        # head melts onto the body, so that ring is dragged down the flank, and cut back in it was the diagonal line
        # along the loaf and sleep flanks. Where the morph left the skin alone (the chin, k = 0) the rest crease stays.
        wh = np.clip(W["head"] + W["ear"], 0, 1)
        rest_y = np.array([v.co.y for v in me.vertices])          # the cat faces -Y: the throat keeps its crease
        back = np.clip((rest_y + 0.10) / 0.10, 0, 1)              # (under the chin it gives the paws their clearance)
        neck = np.clip(4 * wh * (1 - wh) * (1 - np.clip(W["ear"] * 4, 0, 1)) * NECK_CREASE_CUT, 0, 1) * back
        cr = cr * (1 - neck)
        x = x - (k * cr)[:, None] * WU.vertex_normals(x, WU.tri_faces(me))
    if "blockout" in extra:
        # the body's displacement, lightly smoothed (not the head, ears, paws or tail): the morph leaves a faint ripple
        # on the back that a zebra render shows; smoothing the move rather than the shape keeps the skin's own form
        d = x - posed
        mb = (k > 0.5) & (headish < 0.05) & (W["ear"] < 0.05) & (W["paw"] < 0.2) & (W["tail"] < 0.05)
        deg = np.bincount(ed.ravel(), minlength=len(x)).astype(float)[:, None]
        for _ in range(BODY_DELTA_SMOOTH):
            acc = np.zeros_like(d); np.add.at(acc, ed[:, 0], d[ed[:, 1]]); np.add.at(acc, ed[:, 1], d[ed[:, 0]])
            d[mb] = (0.5 * d + 0.5 * acc / deg)[mb]
        x = posed + d
        # the skinning folds the skin just above the tail's root where the tail bends down out of the rump, and the
        # collar keeps that fold; ironed out here (plain Laplacian on positions, the tail tube itself held)
        dr = np.linalg.norm(x - root, axis=1)
        m = np.clip(1.5 - 1.5 * dr / ROOT_IRON[0], 0, 1) * (1 - np.clip((W["tail"] - BLOCKOUT_TAIL_HOLD.get(tname, 0.0)) * 3, 0, 1))
        deg = np.bincount(ed.ravel(), minlength=len(x)).astype(float)[:, None]
        for _ in range(ROOT_IRON[1]):
            acc = np.zeros_like(x); np.add.at(acc, ed[:, 0], x[ed[:, 1]]); np.add.at(acc, ed[:, 1], x[ed[:, 0]])
            x = x + 0.5 * m[:, None] * (acc / deg - x)
    free = k > 0.02
    x[free, 2] = np.maximum(x[free, 2], 0.003)     # nothing grows through the floor
    x = WU.untangle(x, ed, [tuple(p.vertices) for p in me.polygons], np.maximum(k, 0.6 * (1 - keep)), rounds=120, rings=3,
                    log=log)
    import shutil
    if DEBUG_FIT:
        shutil.copy(os.path.join(tmp, "in.npz"), os.path.join(OUT, f"scratch/morph-{tname}-in.npz"))
        shutil.copy(os.path.join(tmp, "out.npz"), os.path.join(OUT, f"scratch/morph-{tname}-out.npz"))
    shutil.rmtree(tmp)
    return x, np.ones(len(posed))

# ---- relaxing a stored shape where the morph leaves sharp folds (2026-11-08). The morph holds a collar round the tail
# root still while the rump just outside it moves fully, so the skin there crumples into shards that cross each other
# once the pose changes. Smoothing the shape's offsets in posed space (as store_shape does) inside a mask evens them out.
RELAX_TAIL_ROOT = (0.26, 40)     # radius round the tail root, passes

def relax_mask(posed, W, what):
    m = np.zeros(len(posed))
    if "tailroot" in what:
        root = np.array((rig.matrix_world @ PB["tail_1"].head)[:])
        r = np.linalg.norm(posed - root, axis=1) / RELAX_TAIL_ROOT[0]
        m = np.maximum(m, np.clip(1.5 - 1.5 * r, 0, 1) * (1 - np.clip((W["tail"] - 0.5) / 0.4, 0, 1)))
    return m

def relax_shape(name, pose_fn, what, passes, tail_only=False):
    """Smooths shape `name`'s posed-space offsets inside relax_mask(what), with pose_fn the pose it was built in."""
    body = bpy.data.objects["cat_body"]; me = body.data
    P = no_shapes(pose_fn())
    posed, A, W = posed_state(P)
    kb = me.shape_keys.key_blocks[name]
    rest = np.array([v.co[:] for v in me.vertices])
    d = np.array([v.co[:] for v in kb.data]) - rest
    dp = np.einsum("nij,nj->ni", A, d)
    m = relax_mask(posed, W, what)
    if tail_only:
        m = m * np.clip(W["tail"] * 5, 0, 1)
    ed = np.array([e.vertices[:] for e in me.edges]); nv = len(rest)
    deg = np.bincount(ed.ravel(), minlength=nv).astype(float)[:, None]
    for _ in range(passes):
        acc = np.zeros_like(dp); np.add.at(acc, ed[:, 0], dp[ed[:, 1]]); np.add.at(acc, ed[:, 1], dp[ed[:, 0]])
        dp = dp + 0.5 * m[:, None] * (acc / deg - dp)
    d2 = np.linalg.solve(A, dp[..., None])[..., 0]
    for i, v in enumerate(kb.data):
        v.co = rest[i] + d2[i]
    log(f"relaxed {name} ({what}): {int((m > 0.01).sum())} vertices, max change {float(np.abs(d2 - d).max()):.4f}")
    apply(Pose())

def no_shapes(P):
    for m in list(P):
        if m.startswith("@"): P.pop(m)
    return P

SHAPES = [   # name, the pose it is wrapped in, the target (targets/<name>.ply), smoothing passes on the offsets
    ("loaf", lambda: no_shapes(LIE()), "loaf", 0),          # 0: the morph is smooth already, and smoothing
    ("sleep", lambda: no_shapes(SLEEP()), "sleep", 0),        # again would undo the untangle pass
]
SHAPE_RELAX = {"loaf": ("tailroot",), "sleep": ("tailroot",)}   # relax_shape after the build (masks in relax_mask)

def build_shapes():
    sk = bpy.data.objects["cat_body"].data.shape_keys
    have = set(sk.key_blocks.keys()) if sk else set()
    for name, pose_fn, tname, smooth in SHAPES:
        if name in have or (ONLY_SHAPES and name not in ONLY_SHAPES):
            continue
        P = pose_fn()
        posed, A, W = posed_state(P)
        target, k = fit_target(posed, W, P, tname)
        store_shape(name, posed, A, target, k, smooth)
        if name in SHAPE_RELAX:
            # (after a blockout only on the tail's own skin: on the rump, smoothing the offsets puts the skinning's
            # fold at the tail root back)
            relax_shape(name, pose_fn, SHAPE_RELAX[name], RELAX_TAIL_ROOT[1],
                        tail_only=os.path.exists(os.path.join(TARGETS, tname + "-blockout.json")))
    apply(Pose())

ONLY_SHAPES = os.environ.get("SHAPES", "").split(",") if os.environ.get("SHAPES") else None
if MODE != "none":
    build_shapes()

# ------------------------------------------------------------------ clips
# (name, kind, keys). keys: (seconds, pose_fn, ease into this key). kind: hold (loops, no lag),
# move (transition / one-shot: lag, last key held for the lag), add (additive overlay: starts and ends on sit).
CLIPS = [
    ("sit", "hold", [(0, SIT, None), (2.0, SIT_BREATHE, "sine"), (4.0, SIT, "sine")]),
    ("lie", "hold", [(0, LIE, None), (2.0, LIE_BREATHE, "sine"), (4.0, LIE, "sine")]),
    ("sleep", "hold", [(0, SLEEP, None), (3.0, SLEEP_BREATHE, "sine"), (6.0, SLEEP, "sine")]),
    ("sit_to_lie", "move", [(0, SIT, None), (0.24, ANTIC_UP, "io"), (0.62, MID_LOAF_UP, "io"),
                            (1.12, LIE, {"*": "out", "tail": "out"})]),   # (2026-11-08: 'soft' overshot the round head into the dome's seam)   # (a full elastic overshoot runs past the loaf shape; an overshooting tail swings into the haunch)
    ("lie_to_sit", "move", [(0, LIE, None), (0.22, LIE_ANTIC, "io"), (0.55, MID_LOAF_UP, "io"),
                            (0.98, SIT, {"*": "elastic", "tail": "out"})]),   # (the tail rising behind him met the head's backward bounce)
    ("lie_to_sleep", "move", [(0, LIE, None), (0.55, LIE_YAWN, "io"), (1.05, MID_SLEEP_UP, "io"), (1.65, SLEEP, "out")]),   # dozing off: no bounce
    ("sleep_to_lie", "move", [(0, SLEEP, None), (0.32, SLEEP_ANTIC, "io"), (0.68, MID_WAKE_UP, "io"),
                              (1.08, LIE, {"*": "out", "ear": "elastic", "whisker": "elastic"})]),   # (the body arrives calmly, ears and whiskers spring: a body overshoot pushed the dome's rim into the back, and the body parts must share an ease or the head's counter-scale drifts and he loses 20% of his volume)
    ("sit_to_stretch", "move", [(0, SIT, None), (0.22, SIT_CROUCH, "io"), (0.82, STAND, "elastic")]),
    ("lie_to_stretch", "move", [(0, LIE, None), (0.22, LIE_ANTIC, "io"), (0.55, MID_LOAF_UP, "io"), (0.9, STAND, "elastic")]),
    ("stretch", "move", [(0, STAND, None), (0.3, STAND_ANTIC, "io"), (0.7, MID_BOW_UP, "io"), (1.1, BOW, "back"), (2.0, BOW_DEEP, "sine"),
                         (2.45, STAND_TALL, "io"), (2.95, SIT_LAND, "in"), (3.45, SIT, "elastic")]),
    ("add_hop", "add", [(0, SIT, None), (0.1, SIT_CROUCH, "out"),
                        (0.3, lambda: variant({}, sit_tail_path(), cog=dict(l=(0, 0, 0.09), s=squash(1.12)), head=(-5, 0, 0)), "out"),
                        (0.5, SIT_LAND, "in"), (0.85, SIT, "elastic")]),
    ("add_startle", "add", [(0, SIT, None), (0.12, lambda: variant({}, sit_tail_path(lift=0.04), cog=dict(l=(0, 0.02, 0.03), s=squash(1.1)),
                                                                   head=(-8, 0, 0), ear_L=(-18, 0, -10), ear_R=(-18, 0, 10)), "out"),
                            (0.7, SIT, "elastic")]),
]
MORPH_LAG = 0.04       # blend shapes trail the skeleton a touch (the flesh follows the bones)
MORPH_LEAVE_LAG = 0.14   # a shape the clip ends without fades late (seconds)
MORPH_ARRIVE_LEAD = 0.06 # a shape the clip ends in grows early
SHAPE_SUM_MAX = 1.0      # the most all shapes together may weigh (see pose_at)
GROUND_CLIPS = {"sit_to_stretch", "lie_to_stretch", "stretch"}
ADD_BONES = {"cog", "head", "neck", "ear_L", "ear_R"}

def part_ease(e, b):
    """A key's ease is a name, or {part: name} with "*" for the rest: a part is a bone-name prefix (tail, ear, arm...)
    or "@" for the blend shapes. Lets one part arrive gently where its overshoot would clip, the rest springy."""
    if not isinstance(e, dict):
        return e
    for part, name in e.items():
        if part != "*" and b.startswith(part):
            return name
    return e["*"]

def pose_at(kind, poses, Tmain, t, bones, mlist):
    """Sets the rig and blend shapes to a clip's state at time t (what bake() keys at each frame).
    poses: [(seconds, Pose, ease)]."""
    for b in bones:
        tb = t if kind == "hold" else min(max(t - lag_of(b) * (0.6 if kind == "add" else 1.0), 0.0), Tmain)
        for i in range(1, len(poses)):
            if tb <= poses[i][0] + 1e-9:
                break
        t0, P0, _ = poses[i - 1]; t1, P1, e = poses[i]
        u = ease(part_ease(e, b), (tb - t0) / (t1 - t0))
        q0, l0, s0 = P0.get3(b); q1, l1, s1 = P1.get3(b)
        d = q0.rotation_difference(q1); ax, ang = d.to_axis_angle()
        pb = PB[b]
        pb.rotation_quaternion = q0 @ Quaternion(ax, ang * u)
        pb.location = l0.lerp(l1, u)
        sc = s0.lerp(s1, u)
        pb.scale = Vector([max(c, 0.03) for c in sc])   # an overshooting ease must never turn a part inside out
    key = bpy.data.objects["cat_body"].data.shape_keys
    W = {}
    # a cross-fade from one shape to another (loaf <-> sleep) keeps its volume by itself: both follow the bones, or
    # the leaving shape lingers on the arriving pose's skeleton (the loaf's paws on the sleep's legs fold the paw crease)
    w_from = sum(poses[0][1].get3("@" + m)[1].x for m in mlist); w_to = sum(poses[-1][1].get3("@" + m)[1].x for m in mlist)
    crossfade = w_from > 0 and w_to > 0
    for m in mlist:
        # a shape that is going away lags the bones, one that is arriving leads them: a squashed skeleton
        # never stands mid-move without its shape's volume (a straight morph collapses ~10-20%)
        wa, wb = poses[0][1].get3("@" + m)[1].x, poses[-1][1].get3("@" + m)[1].x
        lag = MORPH_LAG if kind == "hold" or crossfade else (MORPH_LEAVE_LAG if wb < wa else -MORPH_ARRIVE_LEAD if wb > wa else MORPH_LAG)
        tb = t if kind == "hold" else min(max(t - lag, 0.0), Tmain)
        for i in range(1, len(poses)):
            if tb <= poses[i][0] + 1e-9:
                break
        t0, P0, _ = poses[i - 1]; t1, P1, e = poses[i]
        u = ease(part_ease(e, "@"), (tb - t0) / (t1 - t0))
        w0, w1 = P0.get3("@" + m)[1].x, P1.get3("@" + m)[1].x
        kb = key.key_blocks[m]
        W[m] = min(max(w0 + (w1 - w0) * u, kb.slider_min), kb.slider_max)
    # All shapes together never weigh more than SHAPE_SUM_MAX: loaf and sleep both build the dome behind the head, and
    # two domes at once (an overshooting ease, or the old leave-lag plus arrive-lead) stack into a brim round the head.
    tot = sum(W.values())
    for m, w in W.items():
        key.key_blocks[m].value = w * (SHAPE_SUM_MAX / tot if tot > SHAPE_SUM_MAX else 1.0)
    if kind == "move":   # in-betweens (bones and shapes both mid-way): lift the cat so nothing sinks
        bpy.context.view_layer.update()
        z = lowest_z()
        if z < 0.002:
            PB["cog"].location.y += 0.004 - z   # cog location is in its rest frame: Y = world up

def clip_length(kind, keys):
    Tmain = keys[-1][0]
    T = Tmain if kind != "move" else Tmain + MAXLAG + 0.04
    return Tmain, round(T * FPS)

def bake():
    rig.animation_data_create()
    while rig.animation_data.nla_tracks:
        rig.animation_data.nla_tracks.remove(rig.animation_data.nla_tracks[0])
    k0 = bpy.data.objects["cat_body"].data.shape_keys
    if k0 and k0.animation_data:
        while k0.animation_data.nla_tracks:
            k0.animation_data.nla_tracks.remove(k0.animation_data.nla_tracks[0])
    meta = {}
    for name, kind, keys in CLIPS:
        poses = [(t, fn(), e) for t, fn, e in keys]
        Tmain, n = clip_length(kind, keys)
        act = bpy.data.actions.new(name); act.use_fake_user = True
        rig.animation_data.action = act
        key = bpy.data.objects["cat_body"].data.shape_keys
        mlist = morphs() if kind != "add" else []
        if key:
            key.animation_data_create()
            key.animation_data.action = act      # the same action, a second slot: bones and blend shapes in one clip
        bones = BONES if kind != "add" else [b for b in BONES if b in ADD_BONES]
        for f in range(n + 1):
            pose_at(kind, poses, Tmain, f / FPS, bones, mlist)
            for m in mlist:
                key.key_blocks[m].keyframe_insert("value", frame=f)
            for b in bones:
                pb = PB[b]
                pb.keyframe_insert("rotation_quaternion", frame=f)
                pb.keyframe_insert("location", frame=f)
                pb.keyframe_insert("scale", frame=f)
        rig.animation_data.action = None
        if key:
            slot = key.animation_data.action_slot
            key.animation_data.action = None
            if mlist:                               # the exporter finds blend-shape tracks through the key's NLA
                kt = key.animation_data.nla_tracks.new(); kt.name = name
                ks = kt.strips.new(name, 0, act); ks.action_slot = slot; kt.mute = True
        tr = rig.animation_data.nla_tracks.new(); tr.name = name
        tr.strips.new(name, 0, act); tr.mute = True
        meta[name] = dict(kind=kind, seconds=round(n / FPS, 3), frames=n + 1)
        log("clip", name, kind, n + 1, "frames")
    json.dump(meta, open(os.path.join(OUT, "clips.json"), "w"), indent=1)
    return meta

def export():
    rig.animation_data.action = None
    for pb in PB:
        pb.location = (0, 0, 0); pb.rotation_quaternion = Quaternion(); pb.scale = (1, 1, 1)
    for o in bpy.context.view_layer.objects:
        o.select_set(o.name in ("cat_body", "cat_whiskers", "cat_rig", "butter_socket"))
    bake_pose_ao()
    out = os.path.join(OUT, "cat.raw.glb")
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', use_selection=True,
        export_animations=True, export_animation_mode='ACTIONS',
        export_force_sampling=True, export_frame_step=1,
        export_optimize_animation_size=False,
        export_optimize_animation_keep_anim_armature=True,
        export_reset_pose_bones=True, export_anim_slide_to_zero=True,
        export_skins=True, export_influence_nb=4, export_all_influences=False,
        export_def_bones=False, export_yup=True, export_apply=False,
        export_morph=True, export_morph_normal=True, export_morph_tangent=False, export_morph_animation=True, export_texcoords=False, export_cameras=False, export_lights=False,
        export_attributes=True,   # the baked _AO (attributes named with a leading underscore export as custom glTF attributes)
    )
    log("exported", out, os.path.getsize(out))
    fix_morph_normals(out)

# ---- AO per pose shape (2026-11-08). build_cat.py bakes _AO in the sit, where the body shadows the underside of the big
# head. The loaf and sleep shapes melt that underside onto the flank, so its sit shadow drew a dark diagonal line there.
# glTF can't morph a custom attribute, so each shape's AO is baked in its own pose and exported as the change from the
# sit (_AOD0, _AOD1, in morph target order); the felt shader adds them in by the morph weights (USE_POSE_AO).
AO_RAYS, AO_DIST = 64, 0.25      # as build_cat.py

def bake_ao(x, tris, polys, ed):
    from mathutils.bvhtree import BVHTree
    nv = len(x); nrm = WU.vertex_normals(x, tris)
    bvh = BVHTree.FromPolygons([Vector(p) for p in x], polys, all_triangles=False)
    rng = np.random.default_rng(7)
    u1, u2 = rng.random(AO_RAYS), rng.random(AO_RAYS)
    local = np.stack([np.sqrt(u1) * np.cos(2 * np.pi * u2), np.sqrt(u1) * np.sin(2 * np.pi * u2), np.sqrt(1 - u1)], 1)
    ao = np.zeros(nv)
    for i in range(nv):
        n = nrm[i]
        a = np.array([1.0, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1.0, 0])
        t1 = np.cross(n, a); t1 /= np.linalg.norm(t1); t2 = np.cross(n, t1)
        dirs = local[:, :1] * t1 + local[:, 1:2] * t2 + local[:, 2:] * n
        o = Vector(x[i] + n * 0.002)
        ao[i] = 1 - sum(1 for d in dirs if bvh.ray_cast(o, Vector(d), AO_DIST)[0] is not None) / AO_RAYS
    deg = np.maximum(np.bincount(ed.ravel(), minlength=nv), 1).astype(float)
    for _ in range(2):
        acc = np.zeros(nv); np.add.at(acc, ed[:, 0], ao[ed[:, 1]]); np.add.at(acc, ed[:, 1], ao[ed[:, 0]])
        ao = 0.5 * ao + 0.5 * acc / deg
    return ao

def bake_pose_ao():
    me = bpy.data.objects["cat_body"].data
    if "_AO" not in me.attributes:
        return
    base = np.zeros(len(me.vertices)); me.attributes["_AO"].data.foreach_get("value", base)
    tris = WU.tri_faces(me); polys = [tuple(p.vertices) for p in me.polygons]; ed = WU.edges_of(me)
    shapes = {n: fn for n, fn, _, _ in SHAPES}
    for k, name in enumerate(morphs()):          # shape key order = the GLB's morph target order
        P = Pose(); P.update(no_shapes(shapes[name]())); with_shape(P, name, 1.0)
        posed, A, W = posed_state(P)
        d = (bake_ao(posed, tris, polys, ed) - base).astype(np.float32)
        an = f"_AOD{k}"
        if an in me.attributes:
            me.attributes.remove(me.attributes[an])
        me.attributes.new(an, 'FLOAT', 'POINT').data.foreach_set("value", d)
        log(f"pose AO {name} -> {an}: mean change {float(d.mean()):+.3f}, range {float(d.min()):+.2f}..{float(d.max()):+.2f}")
    apply(Pose())

# ---- morph normals (2026-11-08). The exporter takes each shape's normal deltas from the shape in bind space, which is
# a crumpled mesh wherever the skin hands over between bones (the offsets were taken back through each vertex's own
# skin matrix). three.js skins those normals, so the posed loaf and sleep were shaded with a hard line along the
# head/body hand-over (the "flank seam"), though the posed surface itself is smooth. Here each delta is rebuilt from
# the posed surface: three.js turns a bind-space normal n into A n (A: the vertex's skin matrix), so n = A^-1 n_posed.
def fix_morph_normals(path):
    import struct
    from mathutils.kdtree import KDTree
    body = bpy.data.objects["cat_body"]; me = body.data
    assert rig.matrix_world == Matrix.Identity(4) and body.matrix_world == Matrix.Identity(4), "posed_state works in armature space"
    b = open(path, "rb").read()
    jl = struct.unpack("<I", b[12:16])[0]; J = json.loads(b[20:20 + jl])
    o = 20 + jl; bl = struct.unpack("<I", b[o:o + 4])[0]; BIN = bytearray(b[o + 8:o + 8 + bl])
    def read_vec3(ai):
        a = J["accessors"][ai]; v = J["bufferViews"][a["bufferView"]]
        assert a["componentType"] == 5126 and not v.get("byteStride")
        st = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        return np.frombuffer(bytes(BIN[st:st + 12 * a["count"]]), np.float32).reshape(-1, 3).astype(np.float64)
    mesh = [m for m in J["meshes"] if m["name"] == "cat_body"][0]
    prim = mesh["primitives"][0]; names = mesh["extras"]["targetNames"]
    Pg = read_vec3(prim["attributes"]["POSITION"]); Ng = read_vec3(prim["attributes"]["NORMAL"])
    kd = KDTree(len(me.vertices))
    for i, v in enumerate(me.vertices):
        kd.insert((v.co.x, v.co.z, -v.co.y), i)      # glTF is Y-up: (x, y, z) -> (x, z, -y)
    kd.balance()
    idx = np.array([kd.find(p)[1] for p in Pg])
    tris = WU.tri_faces(me)
    shapes = {n: fn for n, fn, _, _ in SHAPES}
    for k, name in enumerate(names):
        P = Pose(); P.update(no_shapes(shapes[name]())); with_shape(P, name, 1.0)
        posed, A, W = posed_state(P)
        n_posed = WU.vertex_normals(posed, tris)
        nb = np.linalg.solve(A, n_posed[..., None])[..., 0]
        nb /= np.maximum(np.linalg.norm(nb, axis=1, keepdims=True), 1e-12)
        nb_g = np.stack([nb[:, 0], nb[:, 2], -nb[:, 1]], 1)[idx]
        delta = (nb_g - Ng).astype(np.float32)
        while len(BIN) % 4: BIN.append(0)
        J["bufferViews"].append(dict(buffer=0, byteOffset=len(BIN), byteLength=delta.nbytes))
        BIN += delta.tobytes()
        J["accessors"].append(dict(bufferView=len(J["bufferViews"]) - 1, componentType=5126, count=len(delta), type="VEC3"))
        prim["targets"][k]["NORMAL"] = len(J["accessors"]) - 1
        log(f"morph normals {name}: rebuilt from the posed surface, mean change {float(np.abs(delta).mean()):.3f}")
    apply(Pose())
    J["buffers"][0]["byteLength"] = len(BIN)
    js = json.dumps(J, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    while len(BIN) % 4: BIN.append(0)
    total = 12 + 8 + len(js) + 8 + len(BIN)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<I4s", len(js), b"JSON")); f.write(js)
        f.write(struct.pack("<I4s", len(BIN), b"BIN\x00")); f.write(bytes(BIN))

if MODE == "export":     # re-export an already baked cat_anim.blend
    export()
if MODE in ("bake", "all"):
    bake()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "cat_anim.blend"))
    export()

def closeup(names, size=560, out_name="closeup.png"):
    """Big shaded side and 3/4 views of poses next to the sheet's: for judging the surface (lumps, fold lines)."""
    cam = U.ortho_camera(); rows = []
    for name in names:
        sheet = SHEET_OF.get(name, "sit")
        apply(globals()[name]())
        row = []
        views = [(v.split(":")[0], float(v.split(":")[1])) for v in os.environ["CU_VIEWS"].split(",")] \
            if os.environ.get("CU_VIEWS") else VIEWS[1:]
        for view, yaw in views:
            if os.path.exists(sheet_path(sheet, view) or ""):
                row.append(U.label(fit_tile(load_rgb(sheet_path(sheet, view)), size), f"sheet {sheet} {view}"))
            U.setup_workbench("shaded", 900)
            bpy.context.scene.display.shading.show_cavity = False
            at = tuple(float(c) for c in os.environ.get("CU_AT", "0,0.05,0.40").split(","))
            U.aim(cam, yaw, float(os.environ.get("CU_PITCH", SHEET_PITCH)), at, scale=float(os.environ.get("CU_SCALE", 2.3)))
            a = U.render_to_array(os.path.join(OUT, "_cu.png")); sil = silhouette(a)
            if os.environ.get("CU_RAW"):
                import shutil; shutil.copy(os.path.join(OUT, "_cu.png"), os.path.join(OUT, f"cu-{name}-{view}.png"))
            ys, xs = np.nonzero(sil); pad = 20
            row.append(U.label(fit_tile(a[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad], size),
                               f"ours {name} {view}"))
        rows.append(row)
    U.save_grid(rows, os.path.join(OUT, out_name))

if MODE in ("preview", "compare", "closeup"):
    for o in bpy.data.objects:
        if o.type == 'EMPTY': o.hide_render = True
if MODE == "closeup":
    closeup(argv[2].split(","), out_name=argv[3] if len(argv) > 3 else "closeup.png")
if MODE == "preview":
    preview()
if MODE == "compare":
    compare(argv[2].split(","), out_name=argv[3] if len(argv) > 3 else "compare.png")
    if os.environ.get("CU_ALSO"):     # and the close-ups, in the same run (the shapes take a minute each to build)
        closeup(argv[2].split(","), out_name=os.environ["CU_ALSO"])
