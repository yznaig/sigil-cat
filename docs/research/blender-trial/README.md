# Blender trial: Claude scripts the cat
A hands-on test of one model-making path: Claude drives headless Blender with Python to build, rig and animate the matte-black cat, then exports a GLB for three.js.
Round 2, 2026-11-07. Output: `prototypes/cat-glb/models/claude-blender-cat.glb`. Scripts and previews are in this folder.

## Short answer

**It worked, and quickly.** About 20 minutes of wall-clock produced:
- one watertight skinned mesh
- a 27-bone hand-placed armature bound with Blender's automatic weights
- all **10 clips** in the pose spec, not only the 5 the brief asked for
- a 279 KB meshopt GLB that loads and plays in three.js 0.186.1

The clips are a **blockout**: every pose reads as a cat in silhouette, but the motion is plain key-pose interpolation with no polish. **Verdict: a strong path for this cat.** It is a scriptable, repeatable pipeline. Taste still needs a human, and motion still needs a live look.

## What was built

| Item | Value |
|---|---|
| Blender | **5.2.3 LTS** (Linux x64 tarball, built 2026-10-22), portable in `~/opt/blender-5.2.3-linux-x64/` |
| SHA256 | `78486c018b4443efe5e75ab54c290ed8c15abafd249b862c2c9ce2530a918eec`, matched against the official `blender-5.2.3.sha256` |
| Mesh | 6,349 verts, **12,694 triangles**, 1 island, 0 non-manifold edges, 1 material (`cat_black`, #0d0d0f, roughness 0.7) |
| Bones | **27** with underscore names: `root`, `hips`, `spine_1`, `spine_2`, `chest`, `neck`, `head`, `ear_L/R`, `front_upper/lower/paw_L/R`, `back_upper/lower/paw_L/R`, `tail_1`…`tail_6` |
| Socket | `butter_socket` Empty, child of the `head` joint, sitting on top of the skull between the ears |
| Weights | bone heat, then 6 numpy Laplacian smoothing passes, limited to 4 per vertex and normalized. No vertex is left unweighted. |
| Clips | `sit` (4 s loop: breathing, tail-tip sway), `lie` (4 s loop), `sleep` (6 s slow-breathing loop), `sit_to_lie`, `lie_to_sleep`, `lie_to_sit`, `sleep_to_lie`, `sit_to_stretch`, `lie_to_stretch`, `stretch` (3.25 s one-shot: stand, bow, stand, then ends seated) |
| GLB | 1.16 MB raw, **279 KB** after meshopt. 81 channels per clip (27 bones × T/R/S, all kept). |
| Seams | Checked numerically in Blender: every transition's first frame equals its source hold's frame 0, its last frame equals the target's frame 0, and every hold's last frame equals its first. Max difference 0.0. `stretch` starts on the standing pose that both `*_to_stretch` clips end on. |

Previews (top row 3/4 view, bottom row side view; poses: sit, lie, sleep, stand, stretch bow):
- `preview-poses-silhouette.png`: the five poses as flat black on cream, which is how the site renders him
- `preview-poses-shaded.png`: the same poses lit grey, to show deformation
- `preview-sit-to-lie.png`: `sit_to_lie` at frames 0, 10, 20, 30 and 40
- `preview-stretch.png`: `stretch` at frames 0, 18, 40, 60 and 78

## Method

1. **Shape (`build_cat.py`).** Metaballs (balls and capsules) make the body, head, cheeks, muzzle bump and legs, which gives soft vinyl-toy blends at every joint. The ears are flattened mesh cones and the tail is a tapered bevelled curve. The parts are joined, then turned into one shell:
   - **voxel remesh** at 6 mm, which unions the parts into one watertight volume
   - a smooth pass
   - **QuadriFlow** to about 6,300 quads (decimate is the fallback)

   The build checks the result: one island, no non-manifold edges.
2. **Rig.** A hand-placed armature in the standing rest pose. Every bone's roll is aligned so that local X is world +X, which makes "rotate about X" mean pitch on every bone. A pose is then a small table of degrees.
3. **Bind.** `parent_set(type='ARMATURE_AUTO')`, then a numpy weight-smoothing pass. This is needed because `vertex_group_smooth` won't run headless (see below).
4. **Animate (`anim_cat.py`).** Poses are Python dicts: `SIT`, `LIE`, `SLEEP`, `STAND`, `BOW`. Holds are breathing loops built on top of a pose. Transitions are 3 to 6 keys: the source pose, one or two hand-tweaked in-betweens, and the target pose.
   - Each clip is one Action, pushed to its own muted NLA track.
   - Hips height is a location key on `hips`. `root` never moves.
5. **Proof.** Workbench renders: flat black for silhouette, studio grey for deformation, from side, 3/4, front and top views, stitched into sheets with numpy. One render takes about 0.2 s, so a full re-render of every pose is about 20 s.
6. **Export.** glTF exporter settings:
   - `export_animation_mode='ACTIONS'`, with force sampling on
   - optimize animation size off; "keep channels for bones" on
   - reset pose bones between actions on
   - 4 influences

   Then `gltf-transform optimize … --compress meshopt` with the round-1 flags **plus `--prune false`** (see below).

To re-run:
```bash
export LD_LIBRARY_PATH=~/opt/blender-libs/usr/lib/x86_64-linux-gnu
B="$HOME/opt/blender-5.2.3-linux-x64/blender -b --factory-startup"
$B --python build_cat.py -- /tmp/cat_rig.blend
$B /tmp/cat_rig.blend --python anim_cat.py -- /tmp/catout all      # renders, seam check, raw GLB
$B /tmp/cat_rig.blend --python anim_cat.py -- /tmp/catout preview  # the README strips
npx @gltf-transform/cli optimize /tmp/catout/claude-blender-cat.raw.glb out.glb --compress meshopt \
  --simplify false --flatten false --join false --instance false --palette false --texture-compress false --prune false
```

## Wall-clock per step

Times are real, from 14:49:42 to 15:09 local, and include Claude's writing time.

| Step | Time | Notes |
|---|---|---|
| 1. Get Blender | ~7 min | ~4 min to download the 385 MB tarball. Then ~2 min to fix 4 missing system libraries (below). |
| 2. MCP check | ~3 min | Ran while the download ran |
| 3–4. Build and rig script, first bind | ~5 min | The first run worked: 3 s to build, bone heat in 0.1 s, 0 unweighted vertices |
| 5–6. Poses, 10 clips, render iterations | ~12 min | About 8 render-and-look rounds |
| 7. Export, compress, inspect, three.js check | ~4 min | The export worked first time. The socket problem was found by reading the GLB JSON. |
| 8. Deliverables and this README | ~5 min | |
| **Total** | **~20 min** | Against a 2.5 h timebox. Steps overlapped, so the rows add up to more than the total. |

## What failed and the fix

| Problem | Fix |
|---|---|
| Blender wouldn't start: `libSM.so.6`, `libICE.so.6`, `libXt.so.6` and `libOpenGL.so.0` were missing on this WSL Ubuntu | No system install. `apt-get download libsm6 libice6 libxt6t64 libopengl0` (signed Ubuntu archive), then `dpkg-deb -x` into `~/opt/blender-libs/` and `LD_LIBRARY_PATH`. EGL warnings are harmless: Workbench renders anyway. |
| **`gltf-transform optimize` silently deleted `butter_socket`.** Its prune step drops empty leaf nodes. | Add `--prune false`. Without it there's nowhere to attach the butter. **The round-1 compress command needs this flag.** |
| `bpy.ops.object.vertex_group_smooth` fails its context check in background mode | Rewrote it as numpy Laplacian smoothing over the edge graph (about 15 lines) |
| Exported material came out grey in three.js. Blender 5 exports the node tree, not the viewport colour. | Set the Principled BSDF base colour |
| The first ears were swallowed by the metaball head, and the first sit tail stuck out sideways | Bigger cones. Wrap the tail with yaw (`rz`) on `tail_1`, not only further down the tail. |
| The sleep head first rolled, so the ears stuck out sideways like horns | Turn the head by twist about its own axis (`head` `ry`) instead of `rz` |
| Dithered renders made 800 KB PNGs | `dither_intensity = 0`. The PNGs are now 68–238 KB. |

Bone heat, the failure seen in the round-1 MCP recording, did **not** fail here. The reason is the order: build one watertight shell first, at sane scale (about 1.2 m tall), then bind.

## Quality verdict (honest)

**Good enough now:**
- Every pose reads as a cat in pure silhouette: sit, loaf, curled sleep, standing with a question-mark tail, and a proper play-bow stretch.
- No candy-wrapper twisting, no collapsed knees or elbows, and no stretched ears in any rendered frame.
- The shell is smooth and toy-like.
- It loads and plays in three.js with meshopt, and the butter rides the head.

**Weak:**
- **The motion is a blockout.** Transitions interpolate key poses, so there's no anticipation, overlap or tail follow-through, and paws slide and dip below the floor mid-transition. There's no IK foot planting. That matters less for a floating cat, but you'd see it.
- **Judged from stills only.** I never saw it move at speed. Timing and pops need the live check (`add-cat-animation` step 5), or a rendered turntable video.
- **Small deformation flaws, visible only under grey lighting:** a crease at the neck and chest in `sleep`, a slightly lumpy flank in the standing pose, and a dimple on the belly in `lie`. Black material hides almost all of it.
- **Generic design.** Thin cartoon legs, tall ears, a big head. It reads more "Halloween cat" than designer vinyl toy. Proportions are art direction for the brothers, and they're cheap to change: the shape is about 30 lines of numbers.
- In the 3/4 view, `sleep` is mostly a blob. It reads best from the side.

## Estimate for a "good" 10-clip set this way

About **8–12 hours of Claude time**, spread over 4–6 review rounds with Aaron or his brother:

| Task | Time |
|---|---|
| Art pass on the shape: chunkier vinyl-toy proportions, ear shape, paw size; re-bind | 1–2 h |
| IK foot and paw planting during transitions (IK constraints, then bake to keys), and a floor-penetration check | 1.5–2 h |
| Motion polish per clip: anticipation, offset tail and head keys, ease curves, a second hold variant (about 30 min × 10) | 4–5 h |
| Weight and corrective fixes for the neck, chest and flank creases | 1 h |
| Turntable or frame-sequence video renders for review, plus the live seam check in the browser | 1 h |

The bottleneck is the human taste loop, not Claude's build speed.

## MCP options (checked, not installed)

| Option | What it is | Cautions |
|---|---|---|
| **Blender Lab official connector** (projects.blender.org/lab/blender_mcp) | Made by the Blender developers, launched 2026-04-28, listed in the Claude connector marketplace as Anthropic-verified. It needs a Blender add-on, and the marketplace says it gives natural-language access to Blender's Python API and docs. The project page returned 403 to fetch, so its tool list is unverified. | The add-on runs Python inside your Blender session |
| **ahujasid/blender-mcp** (`uvx mcp-for-blender`, about 33.6k stars) | Tools include `execute_blender_code`, `look` (viewport, camera and multi-angle screenshots), scene info, asset search/import (Poly Haven, Sketchfab, Poly Pizza), and `generate_3d` (Tripo, Hunyuan3D, Rodin, Meshy). | The socket server on `localhost:9876` has **no authentication**: anything that can reach the port runs Python in Blender. Keep it on localhost. It has a telemetry toggle. The generators send prompts and images to third-party services. Optional `BLENDER_MCP_SAFE_MODE=1`. |

**What MCP adds over headless `bpy`:**
- a live GUI Aaron can watch and grab
- viewport screenshots without writing render code
- a scene that stays loaded between calls, rather than reloading a .blend each time (about 1 s here, so that barely matters)

For building, headless `bpy` is the same capability, and it's reproducible: the whole cat is two scripts. MCP's real value would be a **shared tuning session**: Aaron says "ears smaller", Claude edits the live scene, and both see it.
