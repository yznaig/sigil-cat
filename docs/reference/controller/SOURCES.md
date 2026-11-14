# Controller — e1111-11

Aaron supplied `tools/splats/inputs/controller-1.local.png` on 2026-11-11.
The original picture's external source/licence is unconfirmed, as for the bread
reference. The input is git-ignored and is never committed.

The built-in image editing tool removed the Xbox emblem and replaced the four
letter markings with plain colored dots. The edited reference is also ignored:
`tools/splats/inputs/controller-generic.local.png`. Inspected: no Xbox emblem or
letter markings remain. The tool left a plain round black inset where the logo was.

The initial sandbox reconstruction stopped at the requested CUDA premise check:
`~/ai/idol-venv/bin/python` reports `torch.cuda.is_available() == False`,
device count 0, and “Can't initialize NVML”. No candidate was claimed at that stage.

The handoff requested exactly one candidate on the orchestrator's CUDA-capable host:

```sh
IDOL_PY=~/ai/idol-venv/bin/python \
SPLAT_TRANSFORM=~/ai/splat-work/tools/node_modules/.bin/splat-transform \
tools/splats/more.sh controller 1 generic.local
```

The filter deliberately excludes the unedited original. `more.py` straightens,
reduces to 65,536 Gaussians and solidifies the object. The initial adapter used a
matte-black mesh while waiting for the host candidate. That stand-in is now replaced
as described below; the keepsake/support registration and payoff required no shared
world edits.

## Host candidate integrated (2026-11-11)

The orchestrator ran that exact command on the host GPU and supplied the reviewed
`prototypes/splats/cands/controller-1.spz` and preview. The candidate is copied
unchanged to `assets/splats/controller-1.spz`: 66,043 Gaussians, already oriented
flat with the controls up. `tools/splats/object-bake.mjs controller-1` produced
188 convex surface triangles in `controller-1.colliders.json`.
The selected SPZ's SHA-256 is
`f66abb913861dd06a0e22fa9a2b69a359fe6dd0351a2b2e6a96c7445e9d84c8f`;
the asset check uses this digest so it also works without ignored GPU candidates.

`src/flappy/controller.js` uses `createPropPicture` and the same scaled baked hull
for its input proxy, contact shadow and Rapier body. The original mesh stand-in is
removed. The ignored input remains uncommitted. Functional/visual acceptance is
recorded in the current bird entry of `docs/REVIEW.md`.
