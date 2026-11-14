# Speed lane (playtest-2): why a big window is slower, and the render pipeline's pixel budget
What the speed lane changed in the render pipeline, the API other lanes may meet at merge, and how to measure it.
Branch `sc/p2-speed`, 2026-11-12. Results and Aaron's choices: `docs/REVIEW.md`, "Speed lane (playtest-2, 2026-11-12)".

## The cause, in one paragraph
Everything on the page is framed to the window's height, so a bigger window draws every item, and the cat, with more
pixels: a 4K window has four times the pixels of a 1080p one, with the same items "in frame". Frames that redraw
pictures pay for those pixels: a tumbling or carried item is redrawn every frame, and the cat is redrawn every frame of
a pop at twice the screen's sharpness (his still-picture quality). Windows Chrome on Aaron's PC draws on the AMD chip
(the integrated one; `docs/REVIEW.md`, first speed pass), where that pixel cost is many milliseconds a frame. Measured
GPU time per frame is in the REVIEW table.

## What changed (all in the render pipeline)
| File | Change | API |
|---|---|---|
| `src/core/picture-motion.js` | A moving picture is drawn at `motionScale(stage)` picture pixels per page pixel: `sqrt(MOTION.budget / window area)`, at most `stage.dpr`, at least `MOTION.floor × stage.dpr`. Budget 1.5 MP: windows up to ~1.5 MP (1280×900, the check size; a phone) are unchanged. | new `motionScale(stage)`, `still(a, b)`; `MOTION.budget`, `MOTION.floor`, `MOTION.stillMs`; `pictureScale(stage, precise)` unchanged in shape. Knobs `?mbudget=` (MP), `?motion=`, `?lod=`. |
| `src/core/prop-picture.js`, `src/core/mesh-atlas.js` | A picture drawn lighter while moving is redrawn sharp once its body has stayed still for `MOTION.stillMs` (150 ms), without waiting for the physics to put it to sleep (~2 s). | none |
| `src/core/cat.js` | His pop counts as motion for the picture's sharpness (it redraws every frame for 1.5 s); turning and popping use `motionScale`. Rest sharpness is unchanged (`config.cat.picture.rest`, 2). | none (`cat.quality` reports it, as before) |
| `src/core/stage.js` | The adaptive pixel ratio may go below 1 in a big window on a machine that cannot keep up, down to `PERF.floorPixels` (1.2 MP) in all, never below `PERF.lowestDpr` (0.5). Small windows: as before. | `PERF.floorPixels`, `PERF.lowestDpr` |
| `checks/run.mjs` | `--uncapped`: frame-rate cap and vsync off (speed diagnostics). | runner flag |

### Speed-pass fixes (decision e1112-59: costs 1, 2 and 4 built, 3 investigated)
| File | Change | API |
|---|---|---|
| `src/core/stage.js` | `ensureEnv` loads the baked prefiltered room light (`assets/textures/room-light.pmrem.f16`, made by `tools/art/bake-room-pmrem.js`) instead of running three's PMREM build: bit-identical lighting (checked by rendering 18 test spheres both ways: 0 differing bytes). `renderer.debug.checkShaderErrors` only under `#debug`. Each warm step's draw waits for a frame of its own after its background compile, and the next step waits a frame. | none |
| `src/core/warm-shared.js` (new) | Boot warm-ups for the programs every keepsake shares: picture batch + its shadow, support shadow, mesh-atlas clear + two tile variants. Called once from `src/main.js`. | `warmShared(site)` |
| `src/core/world-presentation.js` | `warm()`: one chunk and the shared shadow through `stage.warm`. | `presentation.warm()` |
| `src/core/world-layout.js` | `warmMaterial()`: the same support-shadow material `shadow()` makes. | `worldLayout.warmMaterial()` |
| `src/core/mesh-atlas.js` | `meshAtlas(site)` makes the atlas ahead; `atlas.warm(materials)` compiles and draws the clear quad and one 1-px tile per material, off screen. | `meshAtlas(site)`, `atlas.warm(materials)` |
| `src/core/cat.js` | His butter is also warmed in the galaxy's solid-mask pass (camera layer 2, no lights). | none |
| `src/eggs/galaxy.js` | `pullChrome` gives each pulled element `will-change: transform, opacity` for the pull (restored after). | none |
| `src/world/lamp.js` | The lamp's PointLight is in the rack's picture from its first build at intensity 0 (no shader rebuild at the first lamp-on); the lit bulb's variant is warmed once a lampshade exists. | `site.lamp.light` is now a view: `visible` (shining), `castShadow`, `object` (the PointLight) |
| `src/core/soft-floor-shadow.js` | The rack's silhouette is filled 1024 triangles at a time (0.66 s -> ~35 ms). | none |

No shared contract changed: `pictureScale` keeps its signature; the stage's public object is unchanged.

## How to measure
`checks/diag/speed-window.js` (diagnostic, no gate): one page, resized through window sizes, four scenes (`cat`, `pop`,
`rest`, `moving`; the moving and rest ones are the final-cost gate's twenty bodies), live render loop, frame times and
GPU time per frame (`EXT_disjoint_timer_query_webgl2`):

    node checks/run.mjs "http://localhost:PORT/?dpr=1&sizes=1280x720,1920x1080,2560x1440,3840x2160" --lib checks/lib.js \
      --js checks/diag/speed-window.js --size 1280x720 --dpr 1 --uncapped --gpu amd --timeout 900

`--gpu amd` is the chip Aaron's Chrome uses. Headless frames are not held back by the GPU, so the frame rate there says
little; the GPU time per frame is the number that matches a real screen (over 16.7 ms is a dropped frame at 60 Hz).

## Focused check
`checks/speed-motion.js` (in `run-all.sh` at both sizes): the check sizes keep full sharpness in motion (so the cost
gates measure the same work as before), a pop is drawn at the moving scale and he is sharp after it, and at 1920×1080
a tumbling splat prop and a tumbling mesh item are drawn lighter, then sharp once still (before sleep) and at rest.
