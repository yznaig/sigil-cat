# Pose shapes: how to make clean ones
How stylized-character artists make clean pose shapes for a soft character, and the technique the cat's loaf, sleep and stretch use.
Research 2026-11-08 (e1108-04); raw notes and every source: `pose-shapes-sources.md`.

## Why the old shapes were lumpy
The loaf and sleep shapes were made by wrapping the cat onto AI (Hunyuan3D) meshes of the brother's sheets. A wrap
copies its target exactly, so the AI meshes' lumps, grooves and dents went straight into the cat: the pudge behind the
head, the diagonal folds on the flank, the dented loaf back. Every wrap method has this property; the fix is the target.

## What artists do (short)
| Technique | What it is | Where it breaks | Use for us |
|---|---|---|---|
| Corrective shape keys from a sculpt | Sculpt the posed mesh, store it back as a key ("Apply as Shape Key") | Needs hand sculpting; the key holds whatever the sculpt holds | The storing step only (we already do it: `store_shape`) |
| Shrinkwrap | Each vertex snaps to the nearest target point | Vertices bunch on bumps, stretch over hollows, fold; jumps across creases | No: the old builds dropped it for the same reasons |
| Surface Deform / mesh-deform cage | Bind to a proxy, move the proxy, the mesh follows | Bind fails on messy targets; artefacts where mesh and proxy differ | Fallback only |
| Corrective Smooth / Delta Mush (Mancewicz 2014) | Smooth the deformation, re-add the rest detail | Volume loss on thin parts; Blender's modifier doesn't export | The idea: smooth the offsets, not the shape (`store_shape`, `relax_shape` do) |
| Primitive blockout, smooth-unioned (metaballs, SDF smin; Dreams, MagicaCSG, Womp) | Spheres, ellipsoids, capsules melted together with a smooth minimum | Bulges slightly at joins; one blend radius per join to tune | **Yes: the target** |
| Wrap with tangential relaxation + reprojection | Move vertices onto the target in small steps, relax them along the surface between steps | Slow; needs a field | **Yes: the wrap** (`sdf_morph.py` already works this way) |

## Picked: a primitive blockout as the target, the existing field morph as the wrap
- Each pose's target is a handful of primitives (a body ellipsoid, haunches, chest, forearm cones, paw balls, a flat
  floor) joined with a polynomial smooth minimum (Inigo Quilez's `smin`). The result is smooth everywhere by
  construction: no lumps, no grooves, and every join a soft fillet like vinyl over one body.
- The primitives are tuned by a script to the sheet silhouettes (front, side, 3/4, back), not by hand
  (`build/blockout.py fit`). The cat is soft blobs, so a few primitives cover the sheets.
- The head, ears, whiskers and tail stay the cat's own (rigid), as before; the morph smooth-unions the blockout with
  the cat's own head, so the neck is a soft fillet too.
- `sdf_morph.py` reads the blockout's exact field instead of voxelising a mesh, so not even voxel steps reach the skin.
- Why not the others: shrinkwrap and nearest-point wraps were tried in the earlier builds and folded; a cage only
  moves the problem to the cage; hand sculpting can't be scripted and re-run.
