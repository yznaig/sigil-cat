# Detailed world art — original sources

All model geometry, print, patterns and procedural maps in this folder are
original Sigil Cat work by Astra for Aaron, 2026-11-11. No downloaded mesh,
photograph, HDRI or AI bitmap is incorporated. Original art dedication:
**CC0-1.0**, https://creativecommons.org/publicdomain/zero/1.0/ .
The existing Three.js engine/addons are MIT software, not CC0 art.

## Cow: `cow.js`, `cow-surface.glb`

Original polled Holstein. A continuous implicit surface joins the deep barrel,
shoulders, hip region, neck, head and upper limbs. `tools/art/build-cow-surface.py`
uses numpy and original marching-tetrahedra code, a .035-unit sampling grid and
.016-unit vertex clustering to generate the skinned GLB. A split cylindrical UV
seam prevents interpolated pigment stripes across the face. No external model.

The JS module adds the udder/teats, lower articulated legs, cloven keratin hooves,
dewclaws, inset eyes, ears, muzzle and three-part switched tail. Original 1024×512
coat (seed 811101); 128² micro-hair bump. Tail seed 811102. Surface file is 606,184
bytes. Total visible cow: 31,210 triangles / 29 meshes. The continuously skinned
hide uses seven GPU bones; the rest follows named joint pivots.

API: `await create()`; `pose(group, {phase, walk, eat})` samples a finite pose.
`walk`/`eat` clamp to 0–1. Phase is radians. +X forward, Y up. Rig names include
`front.L/R`, `.knee`, `.fetlock`, `.hoof`; `rear.L/R`, `.stifle`, `.hock`, `.hoof`;
`neck`, `head`, `ear.L/R`, `tail.base`, `tail.mid`, `tail.switch`. Caller owns
elapsed time and stops sampling at rest. No timer or animation loop is installed.
Kinematic physics proxies and milk sensor must follow the actor/pose in runtime.

Anatomy references, viewed only (copyrighted; not incorporated as asset data):
- PDCA Dairy Cow Unified Scorecard, 2025 revision, original reference PDF:
  https://purebreddairycattle.com/file_open.php?id=14
- Holstein Association classification reference:
  https://www.holsteinusa.com/programs_services/classification.html

These informed the deep barrel, long face, relatively level back, hip/shoulder
structure, hock angle, attached udder and cloven feet. The references are not
claimed CC0; only our independently modeled art is dedicated above.

## Reproduction / shared geometry

`forms.js` supplies original lofts, closed limb surfaces, deterministic micro
maps and material batching. It reuses small primitives from `../core.js` without
changing that file. New tools only:
`python3 tools/serve.py . 18745`, then
`node tools/art/render-detail.mjs cow cow:sheet`.
`PW_FROM` selects an installed playwright-core project, `CHROME` a Chromium binary.
`ART_CDN_IP` optionally resolves the pinned jsDelivr endpoint through a verified
TLS edge when local DNS is unavailable. No visible browser window is opened.
Adjacent screenshot JSON records meshes, finite data, materials, rig and physics.
These are art diagnostics, not production CPU/GPU/iPhone acceptance results.

## Googly eyes: `eyes.js`

Original rounded disks, clear hemispherical domes, rolled rims and mobile pupil
meshes. Pair width .244; dome radius .053, backing radius .056. No bitmap or
external source. CC0-1.0 dedication above. +Z faces out; pupil offset clamps
to .018. Two convex envelopes describe one .040-mass pair.

## Foil star: `twinkle.js`

Original four-point Bézier silhouette retained exactly from our `src/eggs/bread.js`
star artwork, scaled .012 per original SVG unit (width/height .264). Subdivided
front and adhesive back joined by a .0024 thick wall; +Y tip curl .032. Gold
metalness 1, roughness .36; original 256² crease bump, seed 811104. No external
art. CC0-1.0 dedication above. Front +Z; four convex arms, mass .010.

## Bread crumbs: `crumbs.js`

Seven original deformed, clipped solid icosahedra, radii .012–.032, cluster width
about .18. Each piece settles onto its own local bottom before batching. Original
256² pore color/bump map (seed 811103), baked through a deterministic canvas;
vertex-color crust transition, roughness .96, bump .0012. Smooth shared normals
retain the irregular silhouette. 5,040 triangles, one material/draw, .015 total
mass and three conservative box lobes. No external art; CC0-1.0 above.

## Glass fragments: `shards.js`, `glass-form.js`

Four original closed curved fragments sampled from a tapered drinking-glass wall:
radius(y)=.071+.021*clamp(y/.22), thickness .004. Seeded trigonometric break
edges, twelve angular divisions, three height divisions; thin modeled edge
highlights are batched separately. No wireframe or line overlay. 5,248 triangles
and two meshes. Physical glass uses shared environment reflection, restrained
roughness and alpha; no screen refraction render target. Three conservative
box lobes support one grouped .035 body. Original CC0-1.0, exact license above.

## Cup before break: `cup.js`

Original 56-segment closed-wall lathe with open mouth, rolled rim and .018-thick
base; .222 height and .093 maximum radius. Separate closed 48-segment water
volume, level .152 with .002 meniscus. The fragments reuse its tapered wall
profile and .004 thickness. No bitmap or external art. Nine shell colliders
(base and eight convex wall wedges), .120 total play mass; contained water
is not an extra rigid body. Original CC0-1.0 dedication above.

## Birthday blower: `blower.js`

Original elliptical paper tube with 100 longitudinal and 12 circumferential
segments, closed ends, .275 extended paper length, two-turn tapered roll. A
caller-owned 0–1 extension unwinds a shrinking curl from a growing straight
section. Original 512×128 printed/fibrous texture, seed 811105; cream, coral,
teal and gold stripes. Hollow 32-segment lathed plastic mouthpiece and collar.
3,160 triangles / three materials, .015 mass, extension-dependent box proxy.
No external art; original CC0-1.0 dedication above. No callbacks or timers.

## Billowing cloud: `cloud.js`, `cloud-surface.glb`

Original smooth unions of four primary ellipsoids and twelve smaller billows,
correlated .005/.002-unit surface undulation and a smoothly rounded uneven
base. Original marching tetrahedra in `tools/art/build-cloud-surface.py`,
numpy only, .025 sampling grid, outward field normals and 16-bit indices.
18,836 triangles, 9,420 vertices, 339,920-byte GLB. Generator verifies closed
two-manifold topology (exactly two incident triangles per edge).

One rough physical material with original position-based water-vapor colors
and bounded storm/emission uniforms; no external image, bitmap, extra light
or raymarch pass. `setStorm(group,darkness,glow)` is event-driven. Three sphere
proxies, .040 total mass, anchor/eye seats exported. Original CC0-1.0 above.
This is a lit closed surface representation, not simulated light scattering.

## Confetti: `confetti.js`

Original closed .012×.022×.0006 paper piece, .0025 bow, 44 triangles, varying
instance dimensions and five solid paper colors. Forty-eight instances in one
draw, seed 811106. No bitmap or external art. .0002 play mass each; optional
thin-box envelope .012×.022×.0056 before instance scale. Analytic gravity 1.4,
restitution .18, finite damped floor contact and 2.4s removal; caller owns time
and teardown. `pieces` variant is a static inspection layout only. Original
CC0-1.0 dedication above. No persistent bodies, loops or keepsake registration.

## Handoff diagnostics

`node tools/art/verify-detail.mjs` checks finite articulated poses, blower proxy
enclosure across 21 extensions, bounded pupils/storm controls and finite
confetti floor/end states. Results and exact asset byte/geometry totals are in
`docs/shots/art/detail-audit.json`. Screenshot inspection is documented in
`docs/art-ready.md`; real GPU and iPhone performance gates belong to integration.
