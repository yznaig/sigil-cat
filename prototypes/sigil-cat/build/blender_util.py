# blender_util.py: shared helpers for the Sigil Cat build scripts (headless Blender 5.2).
# Workbench renders from fixed angles, stitched into contact sheets with numpy, plus mesh health checks.
import bpy, bmesh, math, os
import numpy as np
from mathutils import Vector

CREAM = (0.969, 0.929, 0.890)


def clear_scene():
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)


def setup_workbench(mode="shaded", res=360):
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_WORKBENCH'
    scn.render.resolution_x = scn.render.resolution_y = res
    scn.render.film_transparent = False
    scn.render.dither_intensity = 0
    scn.view_settings.view_transform = 'Standard'
    sh = scn.display.shading
    sh.light = 'STUDIO'
    sh.color_type = 'SINGLE'
    sh.background_type = 'VIEWPORT'
    sh.background_color = CREAM
    sh.show_cavity = False
    if mode == "silhouette":
        sh.light = 'FLAT'; sh.single_color = (0.02, 0.02, 0.02)
    else:
        sh.single_color = (0.55, 0.55, 0.58)
    scn.display.shading.show_backface_culling = False
    return scn


def ortho_camera(name="cam"):
    cam = bpy.data.objects.get(name)
    if not cam:
        cd = bpy.data.cameras.new(name)
        cam = bpy.data.objects.new(name, cd)
        bpy.context.scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    bpy.context.scene.camera = cam
    return cam


def aim(cam, yaw_deg, pitch_deg, target, dist=6.0, scale=1.6):
    """yaw 0 = looking at the cat's front (cat faces -Y), 90 = from the cat's left (+X)."""
    yaw, pitch = math.radians(yaw_deg), math.radians(pitch_deg)
    d = Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch)))
    cam.location = Vector(target) + d * dist
    cam.rotation_mode = 'QUATERNION'
    cam.rotation_quaternion = (-d).to_track_quat('-Z', 'Y')
    cam.data.ortho_scale = scale
    cam.data.clip_end = 100


def render_to_array(path):
    # (save_grid switches the scene's output to JPEG for .jpg sheets; without this every later render was written to
    # <path>.jpg while the stale <path>.png was read back, and the contact sheets repeated one image)
    st = bpy.context.scene.render.image_settings
    st.file_format = 'PNG'; st.color_mode = 'RGBA'
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path, check_existing=False)
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]
    bpy.data.images.remove(img)
    return a


def label(a, text):
    """Tiny 3x5 pixel font label in the top-left corner (digits, letters, a few symbols)."""
    F = {
        '0': "111101101101111", '1': "010110010010111", '2': "111001111100111", '3': "111001111001111",
        '4': "101101111001001", '5': "111100111001111", '6': "111100111101111", '7': "111001001001001",
        '8': "111101111101111", '9': "111101111001111", ' ': "000000000000000", '_': "000000000000111",
        '-': "000000111000000", '.': "000000000000010", ':': "000010000010000", '/': "001001010100100",
    }
    LET = {
        'A': "010101111101101", 'B': "110101110101110", 'C': "011100100100011", 'D': "110101101101110",
        'E': "111100110100111", 'F': "111100110100100", 'G': "011100101101011", 'H': "101101111101101",
        'I': "111010010010111", 'J': "001001001101010", 'K': "101101110101101", 'L': "100100100100111",
        'M': "101111111101101", 'N': "110101101101101", 'O': "010101101101010", 'P': "110101110100100",
        'Q': "010101101110011", 'R': "110101110101101", 'S': "011100010001110", 'T': "111010010010010",
        'U': "101101101101111", 'V': "101101101101010", 'W': "101101111111101", 'X': "101101010101101",
        'Y': "101101010010010", 'Z': "111001010100111",
    }
    F.update(LET)
    s = 2
    x0 = 4
    for ch in text.upper():
        g = F.get(ch, F[' '])
        for i, bit in enumerate(g):
            if bit == '1':
                r, c = divmod(i, 3)
                a[4 + r * s:4 + r * s + s, x0 + c * s:x0 + c * s + s] = (0.8, 0.1, 0.1)
        x0 += 4 * s
    return a


def save_grid(rows, path):
    """rows: list of lists of HxWx3 float arrays -> PNG via Blender image."""
    gap = 4
    h, w = rows[0][0].shape[:2]
    ncol = max(len(r) for r in rows)
    H = len(rows) * h + (len(rows) - 1) * gap
    W = ncol * w + (ncol - 1) * gap
    out = np.ones((H, W, 3), np.float32)
    for ri, r in enumerate(rows):
        for ci, a in enumerate(r):
            out[ri * (h + gap):ri * (h + gap) + h, ci * (w + gap):ci * (w + gap) + w] = a
    rgba = np.concatenate([out, np.ones((H, W, 1), np.float32)], 2)[::-1].ravel()
    img = bpy.data.images.new(os.path.basename(path), W, H)
    img.pixels = rgba.tolist()
    img.filepath_raw = path
    if path.lower().endswith((".jpg", ".jpeg")):
        st = bpy.context.scene.render.image_settings
        st.file_format = 'JPEG'; st.color_mode = 'RGB'; st.quality = 85
        img.save_render(path)
    else:
        img.file_format = 'PNG'
        img.save()
    bpy.data.images.remove(img)


def mesh_health(me):
    bm = bmesh.new(); bm.from_mesh(me)
    nonman = sum(1 for e in bm.edges if not e.is_manifold)
    seen = np.zeros(len(bm.verts), bool)
    islands = 0
    bm.verts.ensure_lookup_table()
    for v in bm.verts:
        if seen[v.index]:
            continue
        islands += 1
        stack = [v]
        while stack:
            x = stack.pop()
            if seen[x.index]:
                continue
            seen[x.index] = True
            stack.extend(e.other_vert(x) for e in x.link_edges)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    return dict(verts=len(me.vertices), tris=tris, nonmanifold=nonman, islands=islands)


# ------------------------------------------------------------------ collision measure (shared by checks)
_wcache = {}
WHISKER_ROOT = 0.04

def _whisker_masks(rig, wob):
    if wob.name in _wcache:
        return _wcache[wob.name]
    wme = wob.data
    wv = np.array([v.co[:] for v in wme.vertices])
    groups = np.array([max(v.groups, key=lambda g: g.weight).group for v in wme.vertices])
    root_dist = np.zeros(len(wv))
    for g in np.unique(groups):
        idx = np.nonzero(groups == g)[0]
        bone = rig.data.bones[wob.vertex_groups[int(g)].name]
        root = np.array((rig.matrix_world @ bone.head_local)[:])
        root_dist[idx] = np.linalg.norm(wv[idx] - root, axis=1)
    far = np.array([root_dist[list(p.vertices)].min() > 0.035 for p in wme.polygons])
    fgroup = np.array([groups[p.vertices[0]] for p in wme.polygons])
    _wcache[wob.name] = (far, fgroup)
    return far, fgroup


def _evaluated(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = ob.evaluated_get(dg).to_mesh()
    verts = [ob.matrix_world @ v.co for v in me.vertices]
    polys = [tuple(p.vertices) for p in me.polygons]
    ob.evaluated_get(dg).to_mesh_clear()
    return verts, polys


def collisions(rig, body, wob, where=False):
    """Self-intersections of the deformed body, whiskers (past their roots) into the body or each other,
    and the lowest body point. With where=True also returns the centroids of the offending body faces."""
    from mathutils.bvhtree import BVHTree
    _, fgroup = _whisker_masks(rig, wob)
    bv, bp = _evaluated(body)
    wv, wp = _evaluated(wob)
    # a whisker face counts once it is more than WHISKER_ROOT from its posed root (the root is buried in the
    # cheek on purpose; a whisker scaled down to tuck it away is all root)
    roots = {}
    for g in set(fgroup.tolist()):
        name = wob.vertex_groups[int(g)].name
        roots[g] = rig.matrix_world @ rig.pose.bones[name].head
    far = np.array([min((wv[i] - roots[fgroup[fi]]).length for i in p) > WHISKER_ROOT for fi, p in enumerate(wp)])
    bt = BVHTree.FromPolygons(bv, bp, all_triangles=False)
    wt = BVHTree.FromPolygons(wv, wp, all_triangles=False)
    sets = [set(p) for p in bp]
    selfhits, spots = 0, []
    for a, b in bt.overlap(bt):
        if a < b and not (sets[a] & sets[b]):
            selfhits += 1
            if where:
                spots.append(tuple(round(c, 2) for c in (sum((bv[i] for i in bp[a]), Vector()) / len(bp[a]))))
    whits, wspots = 0, []
    for a, b in wt.overlap(bt):
        if far[a]:
            whits += 1
            if where:
                wspots.append(tuple(round(c, 2) for c in (sum((wv[i] for i in wp[a]), Vector()) / len(wp[a]))))
    for a, b in wt.overlap(wt):
        if a < b and fgroup[a] != fgroup[b]:
            whits += 1
    floor = min(v.z for v in bv)
    if where:
        return selfhits, whits, floor, spots, wspots
    return selfhits, whits, floor
