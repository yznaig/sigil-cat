# Splat cat prototype
Four still Gaussian-splat poses (sit, loaf, sleep, stretch) that pop into each other on the beat, plus a skinning test.
Findings, status and the Idol run command: `docs/research/splats.md`. Renderer: Spark 2.4.0 via the importmap.

## Run it
```
python3 -m http.server 8761          # from the repo root
open http://localhost:8761/prototypes/splats/                  # pop poses; tap the cat or use the buttons
open http://localhost:8761/prototypes/splats/#view=compare     # live mesh prototype left, splat right
open http://localhost:8761/prototypes/splats/skin.html         # splat bound to the GLB bones, mesh beside it
```
Hash flags (combine with `&`), `index.html`:
- `#style=puff|shimmer|pop|smear`, `#pose=loaf`, `#n=131072` (32768 / 65536 / 131072 / 262144), `#yaw=-35`.
- `#auto=0` no automatic changes, `#bob=0` no idle bob, `#fuzz=0` no fibre strands, `#ui=0` clean screenshots.
- `#from=sit&to=loaf&u=0.5`: freeze that moment of a pose change (contact sheets).
- `#src=idol`: load `splats/<pose>.spz` (Idol output, lined up with the mesh) instead of the stand-ins.
- `?perf=1`: fps, frame time, Gaussians drawn, pixel ratio, GPU. `&dpr=1` pins the pixel ratio.

`skin.html`: `#clip=sit_to_lie|lie_to_sleep|sit_to_stretch|stretch|add_hop`, `#t=1.2` freeze, `#naive=1` Spark's
skinning API as documented (drifts), `#src=idol`.

## Files
- `index.html`: the pop poses, transitions (one Spark `dyno` modifier per pose) and the beat timeline.
- `bake.js`: turns a posed, skinned mesh into splats (felt discs + short fibre strands, soft light baked in).
  The stand-ins come from `../sigil-cat/models/sigil-cat.glb` and `../sigil-cat/textures/fiber-tile.png`.
- `skin.html`: nearest-vertex skin weights into Spark's `SplatSkinning`, with the transform fix described in the doc.
- `splats/`: empty until Idol runs (SPZ at 65k, about 0.85 MB each).
