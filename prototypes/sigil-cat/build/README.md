# Sigil Cat build
How the cat in `../models/sigil-cat.glb` is made, from the AI base mesh to the compressed GLB, and how to rebuild it.
Built 2026-11-07, pose shapes refit and creases added 2026-11-08 (e1107-49, -64, -71). Every step is a script.

## Rebuild

```bash
cd prototypes/sigil-cat/build
export LD_LIBRARY_PATH=~/opt/blender-libs/usr/lib/x86_64-linux-gnu
B="$HOME/opt/blender-5.2.3-linux-x64/blender -b"
# 1. clean the AI mesh: whiskers off, face and back-of-head bumps smoothed, tail added   (~60 s, ~3 GB RAM)
~/ai/hy3d-venv/bin/python -I clean_sdf.py ~/sigil-cat/prototypes/ai-3d/models/local-mv-left.glb work
# 2. retopo, whisker tubes, skeleton, weights, creases, baked AO                         (~20 s)
$B --factory-startup --python build_cat.py -- work work/cat_rig.blend
# 3. pose shapes (sdf_morph.py runs in the Hunyuan venv), clips, raw GLB                 (~3 min)
$B work/cat_rig.blend --python anim_cat.py -- work bake
# 4. the no-clipping check (+ volume and pop measures) and 8-angle contact sheets        (~60 s)
$B work/cat_anim.blend --python check_clips.py -- work/check 6
# 5. compress: meshopt with the normals left as floats (compress_glb.mjs says why; ~0.9 MB)
npx -y -p @gltf-transform/cli@4 -c 'node compress_glb.mjs work/cat.raw.glb ../models/sigil-cat.glb'
cp work/check/contact-*.jpg work/check/clip-check.json ../checks/contact/
```
A pose with `targets/<pose>-blockout.json` (the loaf, 2026-11-08) is built from that smooth primitive blockout, not an
AI mesh. To refit one: `blender -b work/cat_rig.blend --python dump_pose.py -- LIE` (the skeleton-posed cat), then
`~/ai/hy3d-venv/bin/python -I blockout.py fit loaf`, `look loaf` (overlays), `mesh loaf` (the committed preview mesh).
Pose close-ups from the real page: `SHOT=... python -I closeup_sheet.py <base url> ../compare-poses-closeup.png lie:loaf`.

The pose targets (`targets/<pose>.ply` + `.json`) are committed, so steps 1-5 need no GPU. To remake the AI ones:
```bash
~/ai/hy3d-venv/bin/python -I make_crops.py ../../../docs/reference/poses crops       # sheet views -> square crops
HF_HUB_OFFLINE=1 ~/ai/hy3d-venv/bin/python pose_gen.py crops work/ai loaf:front+left:7 sleep:front+left:1234 \
  stretch:front+left:1234                       # one Hunyuan3D-2mv process; refuses under 18 GB available RAM
$B work/cat_rig.blend --python prep_targets.py -- targets loaf=work/ai/local-pose-loaf-front+left-s7.glb ...
$B work/cat_rig.blend --python fit_pose.py -- loaf 12      # skeleton fit -> work/fit-loaf.json -> LOAF_V in anim_cat.py
```
Checking poses against the sheets: `$B work/cat_rig.blend --python anim_cat.py -- work compare LIE,SLEEP,BOW` writes
`work/compare.png` and silhouette-overlap scores. `preview SIT,LIE,BOW` renders poses from 6 angles to `work/poses.png`.
The base mesh is git-ignored (18 MB); it lives in the main tree at `prototypes/ai-3d/models/local-mv-left.glb`.

## Files

| File | Does |
|---|---|
| `clean_sdf.py` | Voxelizes the AI mesh into a signed distance field. A morphological opening erases the fused whiskers (and saves their centrelines). Stronger local openings smooth the whisker stubs and the small face and back-of-head bumps. A capsule-chain tail is smooth-unioned onto the rump. Marching cubes gives a dense watertight body. |
| `build_cat.py` | QuadriFlow retopo to 9.8k quads (19.6k triangles, 1 island, 0 non-manifold). Six whisker tubes. 40 bones (head and chest unconnected so poses can slide them). Bone-heat weights, then smoothing, a firm head, ear bands. Then the e1107-71 creases (two paw balls on spheres, chin, ear bases, haunch lines; depth kept as the `crease` attribute) and baked AO (`_AO`, 64 rays per vertex, body only). |
| `anim_cat.py` | Poses as parameter tables (`body_pose`: tilt, squash, bend, head and shoulder slides, world-angle limbs) plus a tail path solver. The `loaf` and `sleep` shapes, fitted to `targets/`. 12 clips with springy easing (per key, or per part: `{"*": "soft", "tail": "out"}`), per-bone lag, in-between keys, shapes that lag on the way out and lead on the way in (and cross-fade with the bones between two shapes). `relax_shape` smooths a built shape where the morph leaves folds. At export, `bake_pose_ao` bakes each shape's AO in its pose and `fix_morph_normals` rebuilds the shapes' normals in the GLB. `compare` mode scores poses against the sheets. |
| `blockout.py` | (Hunyuan venv) Pose targets from smooth primitives: ellipsoids and round cones smooth-unioned (polynomial smin) into a signed distance field, fitted to the sheet silhouettes by coordinate descent under rules (tail root on the surface, body clear of the tail, face left bare). `score`, `fit`, `look`, `head` (the posed head's ellipsoid as a fixed prim), `mesh`. |
| `dump_pose.py` | Writes a skeleton-posed pose (no shapes) with its part weights, bones and the sheet cameras for `blockout.py`. |
| `compress_glb.mjs` | Step 5: meshopt compression with every NORMAL left as floats (quantized, the morph-normal deltas were clamped). |
| `closeup_sheet.py` | Shoots poses on the real page next to the sheet, side and 3/4 (`compare-poses-closeup.png`). |
| `sdf_morph.py` | (Hunyuan venv) Moves the posed body onto a target by growing a signed-distance field from the body into the target, the face, ears and tail held. |
| `wrap_util.py` | Target loading, `register_head` (finds the cat's head in an AI mesh), `untangle` (removes self-intersections after the morph), mesh helpers. |
| `make_crops.py`, `pose_gen.py`, `prep_targets.py`, `fit_pose.py` | Sheet crops; AI pose meshes from front + side (one Hunyuan3D-2mv process); targets cleaned, decimated and placed in cat units with the head as the ruler; skeleton fits by evolution strategy + coordinate descent. |
| `visual_hull.py` | A pose carved from the sheet silhouettes alone: a cross-check on the AI meshes (scores 0.90-0.94 by construction). Not used by the build. |
| `check_clips.py` | For every other frame of every clip: body self-intersections, whisker hits, floor sinks; every frame: volume (collapse) and frame-to-frame jumps (pops). 8-angle contact sheets. |
| `scan_clips.py` | Diagnosis, not the check: evaluates clips or poses from the tables at every frame and prints crossings by body part, shape weights and volume dips. `OVR='...'` tries a change without editing `anim_cat.py`. |
| `blender_util.py` | Shared: renders, contact-sheet grids, mesh health, the collision measure. |

## What's in the cat

| Item | Value |
|---|---|
| Triangles | 21,890 (body 19,586 + whiskers 2,304), 2 draw calls |
| GLB | 0.92 MB meshopt with exact normals (3.0 MB raw), 12 clips, 2 blend shapes (`loaf`, `sleep`) with normals rebuilt from the posed surface, `_AO` on the body plus `_AOD0`/`_AOD1` (each shape's AO, as the change from the sit's) |
| Clips | holds `sit` 4 s, `lie` 4 s, `sleep` 6 s; transitions `sit_to_lie`, `lie_to_sit`, `lie_to_sleep`, `sleep_to_lie`, `sit_to_stretch`, `lie_to_stretch`; `stretch` (one-shot, ends seated); additive `add_hop`, `add_startle` |
| No-clipping check | 12 of 12 clips clean, no collapses or pops (`../README.md`, `../checks/contact/clip-check.json`) |

## Lessons (the non-obvious ones)

- **The diagonal flank line was the GLB compression** (2026-11-08). `gltf-transform optimize --compress meshopt`
  quantizes every NORMAL as a unit vector, morph-target normal deltas too; where a pose turns the skin far (the loaf
  and sleep flanks) the deltas pass length 1 and were clamped. The raw GLB and a flat-shaded render were clean.
  `compress_glb.mjs` leaves normals as floats. How to tell geometry from shading: on the page, `#tex=plain&ao=0`
  removes the texture and AO; setting the body material's `flatShading` shows the true geometry; in Blender a zebra
  matcap (`check_reflection_horizontal.exr`) shows every kink in the surface.
- **The head stays a ball** (2026-11-08, Aaron). Melting the back of the head into the dome, or freeing the chin,
  flattened and dented the head in profile. Now only the part of the head that ends up inside the body's blockout
  is free (`sdf_morph.py`: depth ramp 10 cm), so the visible head stays round and meets the dome along one seam, as
  on the sheets. A rigid head with nothing freed left the dome standing off it with a sharp rim instead.
- **A wrap copies its target, lumps and all** (2026-11-08, e1108-04). The loaf's pudge and flank folds came from the
  AI mesh. A primitive blockout is smooth by construction; what then showed were the morph's own seams:
  1. *k is a speed, not an amount.* Any vertex with freedom > 0 still lands on the goal, so the held/moved edge was a
     step. Blockout shapes scale the move by a smoothstep of k (`HANDOVER`), and the body's move is lightly
     smoothed (`BODY_DELTA_SMOOTH`).
  2. *Smooth union of two near-equal fields bulges* by a quarter of the blend radius: the 7 cm head blend made a
     1.75 cm lip round the lower face once the blockout also carried the head's ellipsoid. The cat's own head and its
     ellipsoid now meet with 1.2 cm, and that head meets the body with an 8 cm fillet (`HEAD_FILLET`).
  3. *Smoothing a shape's offsets keeps the posed fold* (target smooth, offsets = smooth - fold). `relax_shape` now
     runs on the tail's own skin only; the rump round the root is ironed in position instead (`ROOT_IRON`).
  4. *A buried tail root crumples, a swallowed tail carves a groove* (the channel kept round it). The fit keeps the
     root on the surface, the tail's centre line a radius outside and the whiskers 2 cm outside the body. Sleep's
     root slides 12 cm down the rump (`SLEEP_TAIL_ROOT`) so the tail leaves near the floor, as on the sheet.
  5. *Under a squashed body the tail chain shears*: a bone's world length changes with its direction, so the
     path solver re-finds its target after each aim (`tail_aim`, world lengths). Under the sleep's 2x squash even
     that zigzagged; `tail_hold1` keeps the first tail bone straight so its exact inverse scale holds and the chain
     below it is unsheared. `tail_scale` (uniform, in world
     terms) makes the loaf's tail the sheet's: thicker and round to his side; 1.25 kinked mid-move, 1.2 is clean.

- **Bone-local Y runs along the bone.** Squash on an upright bone is `(w, s, w)`, not `(w, w, s)`.
- **Rotating a child under a heavily squashed parent shears it** (three.js has no "aligned" scale inheritance). So sleep turns the head with a twist about the vertical, which commutes with the squash.
- **Most fixes were weights, not poses.** The lower cheeks followed the chest and bulged past the whiskers (fix: a firm head). The ears owned the cheeks (fix: an ear band). The front-leg pivot sat 9 cm under the chin, so any reach hit the chin (fix: pivot at z 0.17). The first tail joint sat deep in the rump and folded it (fix: joint at the surface).
- **A springy ease overshoots everything it touches.** Clamp scales at 0.03, or a tucked whisker turns inside out. Clamp blend-shape weights at 1.03, or the ball folds the head. Leave the overshoot to the bones.
- **Move volume through a field, not vertex by vertex** (2026-11-08). Nearest-point wraps, rays from the bones and
  inflation all folded or streaked the skin once a pose needed real volume (a dome behind the head). Growing a signed
  distance field from the posed body into the target (`sdf_morph.py`) never self-intersects. A plain blend of the two
  fields grows thick target parts as separate bubbles no vertex can reach; grow from the body's own surface instead.
- **Fit the skeleton first, and let it slide.** The head is two thirds of him; the sheets' loaf and sleep put it in
  front of the body, not on top. Bending the spine 90° crumples the skin; sliding the head and shoulders off their
  parents (unconnected bones) stretches it instead, which the morph can fix. Fitting needed world-angle limbs (the rig
  compensates for the body's bend) and a self-intersection penalty, or the optimiser finds crumpled poses.
- **The freedom map matters more than the method.** Each bug of the night was a part that was free when it should be
  held (the tail behind the head got the head-back freedom and was pulled into the body) or held when it should be
  free (the neck band left a groove; a fully locked tail collar blocked the untangle).
- **Shapes and overshoot.** A shape that goes away should lag the bones, one that arrives should lead, or the squashed
  skeleton stands mid-move without its volume (10-20% collapses). Bones overshooting past a shaped pose clip; arrive
  there with the gentle `soft` ease.
- **The rubber-hose squash stretch was tried and not kept** (2026-11-08, clip fix): the head scaled to 0.8-0.85 and
  lowered, the front legs reaching further (and splayed apart, `armsplay`, to make room), the hips higher. Side overlap
  with the sheet rose from 0.37 to 0.44-0.46, but every version drove the head through the front legs (54-500 crossing
  triangles). A search held to zero crossings, starting from the bow, never shrank or lowered the head and only tipped
  the nose down (0.79 / 0.41 / 0.64, reads the same as the bow). Shared premise of every stretch attempt: the front
  legs are short stubs from the AI base mesh, so a low head has nowhere to go. Next is Aaron's call: longer, slimmer
  forelegs in the rig, or a hand-sculpted bow. `headscale` stays in `body_pose` (default 1).
- **The stretch shape was tried again and dropped** (2026-11-08): skeleton fits from several starts, a target grown
  1.2x round the head, the target's own head cut out, the previous bow as the base. Each read worse than the plain bow
  or clipped. The shared premise: one mesh with the sit's head size fitted to the sheet's stretch. Next step is a
  decision (a smaller head for the stretch, or a hand-sculpted bow), not more fitting.
- **The stretch pose shape was tried and dropped** (2026-11-07). An AI mesh of the old sheet's tiny STRETCH crop was
  wrapped three ways; all garbled his head and legs.
- **The five clipping transitions (2026-11-08, clip fix).** A scratch scanner that evaluates clips straight from the
  tables (`pose_at`, every frame, crossings counted by body part) found five separate causes, none fixed by more keys:
  1. *Two domes.* Loaf and sleep both grow the dome behind the head. In a loaf <-> sleep cross-fade the leaving shape
     lagged and the arriving one led, so both were near full weight at once and the dome stood out as a brim round the
     head. Now all shapes together weigh at most 1 (`SHAPE_SUM_MAX`), and a shape-to-shape cross-fade follows the bones
     (a lingering loaf on the sleep's legs also folded the paw crease).
  2. *Overshoot on one part.* A springy ease overshoots every part it touches: the tail swung through the haunch on the
     way into the loaf, and rising behind him met the head's backward bounce on the way into the sit. A key's ease can
     now be per part, so the tail arrives with `out` while the body keeps its bounce.
  3. *Body parts must share an ease.* The head counter-scales the body's squash, so a bouncy `cog` with a calm head
     shrinks the head mid-move (sleep -> loaf lost 20% of its volume). Split eases only between whole parts (tail,
     ears, whiskers).
  4. *No margin in the fitted holds.* The paw balls sat so close under the chest that a 4% squash closed the crease
     between them, and asleep the chin rests on the paws. Front legs swung back 5 deg (loaf) and 10 deg (sleep, paws
     tipped up so they stay on the floor), a little `armsplay` asleep, and the sleep's anticipation became a breath in
     instead of curling tighter. Sheet overlap moved by under 0.01.
  5. *Shards at the tail root.* The morph holds a collar round the tail root still while the rump just outside moves
     fully; the skin crumples there and the shards cross once the pose changes. `relax_shape` smooths the shape's
     posed-space offsets in that ring after the build.
- **The flank line was three things on top of each other (2026-11-08, clip fix).** Each made the same diagonal from
  behind the ear down to the front leg, which is where the sit's neck ring and the underside of the big head end up
  once the loaf and sleep slide the head forward and melt the back of it onto the body:
  1. *Geometry:* the morph puts the creases back on a pose shape, the neck crease too, so the dragged ring was cut back
     in as a groove. The pose shapes now skip it on the back and sides of the neck (`NECK_CREASE_CUT`); the throat keeps it.
  2. *Normals:* the exporter takes a shape's normal deltas from the shape in bind space, a crumpled mesh wherever the
     skin hands over between bones. Blender shades the posed surface and looked fine; three.js showed a hard step.
     `fix_morph_normals` rebuilds them from the posed surface (n = A^-1 n_posed, A the vertex's skin matrix).
  3. *AO:* `_AO` is baked in the sit, where the body shadows the underside of the head; the shapes carried that shadow
     onto the flank. Each shape now gets its own AO (`bake_pose_ao`), mixed in by the morph weights in the felt shader
     (`USE_POSE_AO` in `src/cat.js` and `../index.html`).
  How to tell them apart: Blender workbench renders recompute normals and have no AO, so only (1) shows there; the
  raw GLB re-posed in numpy matched Blender to the vertex, which ruled out skinning; `#ao=0` isolates (3).
- **Check the contact sheets themselves.** Until 2026-11-08 every sheet repeated one stale image (the first JPEG save
  switched the render format, so later renders never overwrote the PNG being read back). The numbers were right.
- **three.js:** gltf-transform dedups identical accessors, and three's loader shares their arrays between clips. `makeClipAdditive` edits in place, so copy an additive clip's arrays first, or every clip's constant tracks zero out.
