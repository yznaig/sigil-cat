# SDF cat prototype
The cat made in code, with no Blender and no bought model: one signed distance field (SDF) pinned to the cat-viewer's parts, drawn two ways.
Round-2 route test, 2026-11-07. Proof: `index.html`, `checks/sdf-mesh.js`, `checks/sdf-ray.js`, and `shots/`.

## Verdict

**Mesh mode works. It is a real candidate for the production cat, or at least the fallback, if the shape gets a proper sculpting pass.** It turns the toy built of parts into one seamless body. It needs no Blender, no rig, no skinning work and no clip authoring, because the cat-viewer's poses, clips, emotes, tap and butter drive it unchanged. It fits the render budget exactly as a bought GLB would.

**Ray mode is the better-looking of the two, but its per-pixel cost makes it a bad trade on phones.** Keep it as the editing preview for sculpting, not for the site.

## How it works

- **Shape.** 32 primitives in each part's local frame:
  - 11 ellipsoids: chest, hips, skull, cheeks, muzzle, haunches and paws.
  - 2 ears, each a round cone flattened front to back.
  - 19 round cones: the neck runs from a body point to a head point, plus 4 legs and the tail.
  - The tail is 14 short cones along a Catmull-Rom curve through the 7 tail joints. With straight segments, a curled tail looked like a polyline.
  - A polynomial smooth-min (k 0.06–0.2) joins the primitives. Tail joints use a hard min, because a soft blend there bulges into beads.
  - One `packShape()` feeds both modes, so they draw the same cat. The shape spec is `SHAPE` in `index.html`.
- **`#mode=mesh` (the default).** This happens once at load, in the rest pose:
  1. Surface nets polygonize the field on a grid with 0.032 cells. A coarse 4×4×4 pass skips most of the box.
  2. Two Newton steps snap each vertex onto the surface. The field gradient gives smooth normals.
  3. Auto-skin. Each primitive pulls on its part with weight `(1 - (d_i - d_min)/0.08)²`. The neck cone splits its pull along its length between body and head. Each vertex keeps its 4 strongest parts, normalized.
  4. The named parts are now `THREE.Bone`s and become the `Skeleton` directly.
- **`#mode=ray`.**
  1. A box fitted to the pose each frame is drawn with the cat's own `MeshPhysicalMaterial`.
  2. The material is patched so each pixel marches the SDF, using part matrices sent as uniforms.
  3. The patch hands three.js the hit's position and normal. Sheen, environment, lights and tone mapping are therefore three.js's own, the same as the mesh.
  4. It writes `gl_FragDepth`, so the butter and the ear occlude each other correctly.
  5. Edge coverage from the nearest miss feeds alpha-to-coverage, so the silhouettes come out as smooth as the mesh's.
  6. Cheap tricks: the box proxy, a per-pixel bounding-sphere cull mask, early exit, `#rayScale=0.5` (march at half resolution, then upsample colour and depth), `#rayCull=0`, and `#rayHeat=1` (a step-count heatmap).
- `#mode=prim` shows the old primitive cat for side-by-side comparison. `?perf=1` adds a `mode` line to the readout.

## Numbers

| | Mesh | Ray (1280×900, DPR 1) | Ray (iPhone 1170×2532, DPR 3) |
|---|---|---|---|
| Geometry | 17.6k tris, 8.8k verts, 1 draw call | 12-tri box | same |
| Bones / weights | 15 (the named parts), at most 3 per vertex (cap 4), sums exact to 4e-8 | n/a (32 primitives, 141 vec4 uniforms) | same |
| Build | 92–136 ms at load (nets 50–77, snap 15–28, skin 17–28), 179k field evals | none | none |
| Per frame | GPU skinning | 7M primitive evals; 8–9.5 march steps per cat pixel, 96 max on grazing rims | 15–17M primitive evals; box 0.5–0.85M px, cat 0.14–0.21M px |
| Baked GLB | 952 KB raw with every clip (`catViewer.exportGLB(true)` downloads it); meshopt would cut that several-fold (not run) | n/a | n/a |

The table's figures come from both checks plus the `?perf=1` and `?dpr=3` runs.

- The cull mask makes 14× fewer evaluations: 97M per frame without it.
- **Headless frame times are meaningless.** Headless WebGL is SwiftShader, which renders on the CPU. Treat these only as a comparison between modes on the same machine:

| Mode | Headless fps (1280×900) |
|---|---|
| prim | 12.5 |
| mesh | 8.7 |
| ray | 1.6 |
| ray at half resolution | 7.6 |
| ray without cull | 1.7 |

SwiftShader doesn't benefit from the cull. It predicates the loop on the CPU, so skipped primitives still cost time. A real GPU skips warp-coherently, which is unmeasured here.
- Generation time is real JavaScript time on this desktop. A mid-range phone runs JavaScript perhaps 2–4× slower, roughly 200–500 ms once at load. Baking to a GLB removes that cost.

## Look, judged against the primitive cat

- `shots/poses-prim-mesh-ray.png`: rows are sit, lie, sleep and stretch; columns are prim, mesh and ray. Both SDF columns read as one animal: haunches, cheeks, a tapered tail and legs that flow into the shoulders. The prim column reads as a toy of capsules with a collar seam.
  - It is still stylized programmer art: a slightly long head, rod-like legs, and egg-shaped back paws in the sit. It looks more like a vinyl toy than a sculpted cat. The shape is only as good as the numbers someone tunes.
- `shots/sleep-neck-mesh-top-ray-bottom.png`: this is where the two modes differ. The sleep pose pushes the head into the chest.
  - The skinned mesh shows a hard intersection crease. Linear-blend skinning moves the vertices, but it can't re-blend the two shapes.
  - Ray mode re-blends every frame, so the head melts in. Widening the skin blend from 0.07 to 0.12 barely helped.
  - In sit and stretch the two modes look the same.
- `shots/edges-ray-mesh-halfres.png`: edges compared, left to right: ray, mesh, ray at half resolution.
  - With alpha-to-coverage, ray edges match the mesh's MSAA edges.
  - Half resolution is soft but acceptable at phone DPR.
- `shots/mobile-mesh-top-ray-bottom.png`: all four poses at 390×844.
- Small mesh flaw: the ear tips are a bit blunt, because the 0.032 grid cell can't resolve a thinner tip. Ray tips stay sharp.

## Phone cost

- **Mesh:** one skinned draw call, 17.6k triangles and 15 bones. That is inside the render-stack budget (8–20k tris, ≤30 bones, 4 weights) and costs the same as a bought or Blender GLB. There is no per-pixel overhead. Fine on any phone.
- **Ray:** this is an estimate, not a measurement.
  - At DPR 3, one frame is about 16M primitive evaluations × ~40 ALU ops, plus the 32-sphere cull on every box pixel. That is about 1 GFLOP per frame, or about 60 GFLOP/s at 60 fps.
  - Silhouette warps run up to 96 steps in lockstep, so the real cost sits above the average.
  - A recent iPhone (A15–A17 class, about 1.5–2 TFLOPS peak, maybe 15–25% efficiency on loop-heavy shaders) should manage it in about 3–5 ms.
  - A mid-range Android (Mali-G52/G57 class) would take about 15–40 ms. It would need the existing DPR cap of 2 (4/9 of the pixels) plus `#rayScale=0.5`.
  - Either way, it burns GPU and battery every frame for a cat that mostly sits still; a mesh idles at almost nothing.
- **Real numbers** come from a phone loading `?perf=1#mode=ray` from the Pages URL.

## What it would take to make this the production cat

1. **Sculpt the shape: the real work, about 4–8 hobby hours.**
   - Build a small tuning page: sliders per primitive, previewed in ray mode, which needs no re-polygonizing, so edits are live.
   - Fix head and leg proportions and the paw shapes.
   - Nudge the sleep and lie pose offsets so the head doesn't sink into the chest. Alternatively, add a smoothing pass on the neck weights.
2. **Bake to a GLB so the site needs no generator code.**
   - Get the file from `catViewer.exportGLB(true)`, or from a node script running the same code.
   - Then run `gltf-transform optimize --compress meshopt` with the flags in `docs/research/render-stack.md`.
   - Optionally leave the clips out of the GLB and keep baking them in code, as now.
   - Runtime generation (~300 lines, ~100–140 ms) also works if the brothers would rather tweak numbers than re-export.
3. **Procedural life layers on cleanly.** Tail spring physics and a head look-at are bone rotations applied after `mixer.update`, the same as on the primitive cat. The skinned mesh follows for free, and ray mode follows through the matrices it reads each frame.
4. **Unchanged:** the butter is still a child of the `head` bone, and the hit area is still the invisible ellipsoid.
5. **Limits to know:**
   - Ray mode's cull mask is one 32-bit uint and is now full at 32 primitives. More primitives need a second mask.
   - three.js has no dual-quaternion skinning, so extreme twists would need weight tuning instead.

## Run it

```
python3 -m http.server 8745        # from the repo root
shot 'http://localhost:8745/prototypes/cat-sdf/index.html#mode=mesh&debug' --js "$(cat prototypes/cat-sdf/checks/sdf-mesh.js)"
shot 'http://localhost:8745/prototypes/cat-sdf/index.html#mode=ray&debug'  --js "$(cat prototypes/cat-sdf/checks/sdf-ray.js)"
```

- The cat-viewer's own `checks/emotes.js` and `checks/rotate-tap-butter.js` pass in mesh mode.
- In full-resolution ray mode, `checks/emotes.js` only times out headless. At about 1.6 fps the clamped frame step slows every clip roughly 6×. It passes on `#mode=ray&rayScale=0.5`.
