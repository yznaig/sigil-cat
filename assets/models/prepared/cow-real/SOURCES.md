# Real cow: source, adaptation and handoff

`cow.glb` is a derivative of **Farm Cow Animated Dairy cattle** by
[Rukh3D](https://sketchfab.com/rukh3d), licensed under
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Exact original page:
https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e

Licence checked 2026-11-11 against that model's page metadata at
https://api.sketchfab.com/v3/models/0e780cb5ab6d457198ded7d4e191a03e
(CC Attribution, explicit BY 4.0 URL). The source glTF's embedded attribution and
the redistributed `license.txt` agree. This is **CC BY, not CC0**. The user
explicitly allowed CC BY for this cow revision. Preserve the credit when sharing
the asset or the game. The unmodified notice is in `source-license.txt`.

Required credit:

> This work is based on “Farm Cow Animated Dairy cattle” by Rukh3D, licensed under
> CC BY 4.0. Sigil Cat adaptation: material corrections, cavity/hoof shading,
> repacking, runtime bone aliases, and newly authored walk/graze animations.

Use the linked title, author and licence above with that credit. The same source
credit is embedded in the GLB and recorded in `assets/models/SOURCES.md`.

## Retrieved source

The original download endpoint requires an authenticated account. The bytes were
retrieved from a public redistribution carrying the original attribution:

https://huggingface.co/datasets/fernandotonon/QtMeshEditor-motion-corpus/tree/da7af50bca493e2208e1ba06c18d30e61d486a1c/raw/sketchfab/Farm_Cow_Animated_Dairy_cattle_0e780cb5

`source-provenance.json` records the pinned revision, exact download URLs, byte
counts and SHA-256 of all five source files. The dataset is a retrieval mirror;
Rukh3D remains the author and the original model page determines this asset's
licence. No personal-use licence or generated-model service is involved.

## Changes and limits

- Original 9,546 triangles, UVs, skin weights, 55-bone skeleton and two meshes
  retained. Further decimation would hurt the muzzle, joints and split hooves.
- Original compressed JPEG maps embedded: 512×256 body and 128×128 eyes. No
  upscaling is presented as additional detail. The coat is a source texture with
  irregular patch boundaries and subtle coloration. Macro views reveal its limits.
- Hide and eyes changed from metallic to dielectric; hide roughness .84, eyes
  .28. Added subtle baked vertex cavity shading and grey-brown horn pigment on
  the hooves. `cow.js` adds an original seeded 128² directional micro-bump map.
- Removed the five source idle/attack/death clips. **The source did not include a
  walk.** The delivered `walk` (1.6 s, 65 samples) and `graze` (2 s, 61 samples)
  are new Sigil Cat motion, baked onto the source skin rig. No third-party motion
  was copied. Graze is a head-lowering clip; runtime can sample it back to stand.
- GLB: 548,340 bytes (338,114 gzip), including both JPEGs and both clips; SHA-256
  `f1d60b20b6c373dc8672e3e4b9cee2a6c6efb93c88d40db9430a7683bfa2f838`.
  Adapter: about 7.4 KB. No runtime compression decoder or BVH is needed.

This is a substantial realism improvement over `world-detail/cow.js`: anatomical
leg volumes and cloven hooves, an integrated head/muzzle/neck, udder, dewlap,
horns and tail switch. It is a believable game-resolution dairy cow at the
requested mid-size view. **It is not photographic close-up realism**: the face
and horns show faceting, the body map is small, and there are no individual hairs.

## Runtime contract

```js
import {create, pose, physics} from './cow.js';
const cow = await create(); // local GLB; no timers or animation loop
pose(cow, {phase: elapsed / 1.6 * Math.PI * 2, walk: 1});
// Advance +X at cow.userData.rig.speed (about .2621 units/s) for planted feet.
pose(cow, {eat: progress}); // progress 0..1 lowers the head; reverse to rise
```

The adapter aligns +X forward, Y up, floor at zero, full height 1.48. The standalone
GLB retains its source coordinate frame; use the adapter for world conventions.
`userData.clips` contains UUID-bound clips safe after runtime bone renaming.
Aliases include `front.L/R`, `.knee`, `.fetlock`, `.hoof`; `rear.L/R`, `.hock`,
`.fetlock`, `.hoof`; `neck.base`, `neck`, `head`; `tail.base`, `tail.mid`,
`tail.switch`. All are actual skin bones. The source has no independently weighted
rear stifle control, so no fake stifle pivot is advertised. Its hip/hock chain
provides the delivered walk deformation. Original-to-runtime mapping is exported
in `userData.rig.sourceAliases`.

The walk has a .62 stance fraction, .26-unit stance sweep, .41935-unit advance
per 1.6-second cycle, and four staggered contacts. Scale speed with the root scale.
Runtime owns translation, finite visit timing, blending on entry/exit, collider
following, bucket contact, removal and resource disposal. Do not independently
run a second animation mixer while sampling `pose`. `physics` describes simple
kinematic proxies, not a ragdoll; mass is zero as specified in the world plan.

## Reproduce and inspect

From the repo, with Node, Python and a headless Playwright Chromium installed:

```sh
python3 tools/art/fetch-cow-real.py
python3 tools/art/prepare-cow-real.py
python3 tools/serve.py . 18745
# In another shell (PW_FROM and CHROME can select local Playwright/Chromium):
node tools/art/bake-cow-motion.mjs
node tools/art/bake-cow-surface.mjs
python3 tools/art/prepare-cow-real.py --motion /tmp/cow-motion.json --colors /tmp/cow-colors.json
node tools/art/render-cow-real.mjs cow cow:sheet cow:detail cow:previous
node tools/art/verify-cow-real.mjs
```

Three.js 0.186.1 is used only by the adapter/studio. Offline cavity baking uses
`three-mesh-bvh` 0.9.5 (MIT) from jsDelivr; it adds no runtime dependency.
`ART_CDN_IP` is an optional environment-specific DNS override, not required in
normal networking. Tools blank DISPLAY/WAYLAND_DISPLAY and launch Chromium
headlessly with SwiftShader. All renders are actual delivered geometry/materials;
none is an illustration or a substituted beauty image.
