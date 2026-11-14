# Prepared art for the world builders

Original CC0 procedural modules in `assets/models/prepared/`; sources and invocation
in that folder's [SOURCES.md](../assets/models/prepared/SOURCES.md). No `src/` wiring.
Y-up; dimensions in cat heights; mass is the plan's play mass. `create()` returns
the actual 3D Group, `physics` exports local colliders/anchors. Full box sizes,
Y-axis cylinders, XYZ Euler radians. Builders own contact tuning and all G1–G5
checks: these renders do not establish physics, phone or real-GPU cost acceptance.

| Asset / module | Simple collider / mass | Inspected three-angle render | Readiness / honest art judgment |
|---|---|---|---|
| Rack / `rack.js` | Fixed base/post/socket cylinders + 4 peg boxes; 0 | [rack](shots/art/rack.jpg) | Inspected; plausible turned walnut/aged brass, restrained grain after one revision; not scan-level surface wear. 10,336 triangles / 4 material batches. |
| Bulb / `bulb.js` | Envelope sphere + base cylinder; .060 | [bulb](shots/art/bulb.jpg) | Inspected; recognizable clear envelope, filament, threads and black insulator. Reflective alpha glass avoids refraction pass; small profile facets remain at close zoom. 5,872 triangles / 5 batches. |
| Wizard / `hats.js`, `create({variant:'wizard'})` | Cone + brim cylinder; .060 | [wizard](shots/art/hats-wizard.jpg) | Inspected: hollow underside, gold band, purple/yellow pixel stars; 832 triangles / 3 batches. |
| Cone / `hats.js`, variant `cone` | Cone + base box; .080 | [cone](shots/art/hats-cone.jpg) | Inspected: hollow orange cone and square foot, two white bands; 304 triangles / 2 batches. |
| Party / `hats.js`, variant `party` | Cone; .030 | [party](shots/art/hats-party.jpg) | Inspected: pink/teal pixel checks, cream rim, voxel pom; 424 triangles / 3 batches. |
| Crown / `hats.js`, variant `crown` | 8 ring boxes; .100 | [crown](shots/art/hats-crown.jpg) | Inspected: open gold ring, eight points, square red/blue gems; intentionally faceted pixel style. 480 triangles / 4 batches. |
| Enamel tin / `tin.js` | Box .35 × .19 × .225; .120 | [tin](shots/art/tin.jpg) | Inspected after enamel/corner revision: readable original print, rolled lid, seam, exposed-metal lip. 1,728 triangles / 8 batches. Macro finish is clean manufactured enamel, not heavy wear. |
| Shelf / `shelf.js` | Fixed split board, 6 cradle boxes, plate cylinder; 0 | [shelf](shots/art/shelf.jpg) | Inspected front/rear/underside: true recessed well, 2 rifle contacts, glazed plate, tin rails and steel brackets. 3,940 triangles / 6 batches. Grain remains visibly procedural at macro scale. |
| Box with separate lid / `box.js` | Bottom + four wall boxes; .25 shell + .04 lid | [open](shots/art/box.jpg), [closed](shots/art/box-closed.jpg) | Inspected open/closed/underside. Empty cavity, visible fluting and THIS WAY UP print; clean kraft finish, limited crease wear. 8,028 triangles / 9 batches including lid. |
| Flour sack / `flour.js` | Bag box; .10; separate flour portion convex fit .03 | [flour](shots/art/flour.jpg) | Inspected front/rear/top. Folded paper closure and original wheat print; sack silhouette has gentle wrinkles, macro paper remains procedural. 1,414 triangles / 2 batches. |
| Bucket with milk / `bucket.js` | Bottom cylinder + 8 convex wall wedges; .25 empty; milk cylinder .12 | [bucket](shots/art/bucket.jpg) | Inspected rim/interior/handle and milk top. Galvanized metal, rolled rim and coherent milk volume; 4,472 triangles / 4 batches. |
| Three-tine pitchfork / `pitchfork.js` | Shaft capsule + crossbar box + 3 tine boxes; .60 | [pitchfork](shots/art/pitchfork.jpg) | Inspected three views. Ash shaft, steel socket, three curved sharpened tines; repaired socket gap. 1,716 triangles / 3 batches. |
| Hay pile / `hay.js` | One convex hull; .12 falling / 0 landed | [hay](shots/art/hay.jpg) | Inspected after rebuild: crossed modeled straw now reads as a loose pile, not a cushion. 9,908 triangles / 4 batches; one physical body. |
| Cake / `cake.js` | Conservative cylinder (includes cut-out); .18 | [cake](shots/art/cake.jpg) | Inspected layered sponge, jam/cream, piped icing and cut slice. 8,688 triangles / 4 batches; porous map carries crumb detail. |
| Cow / `cow.js` | Kinematic trunk/head + 4 leg boxes; 0; milk sensor anchor | [standing](shots/art/cow.jpg), [grazing](shots/art/cow-eat.jpg) | **Provisional, not accepted against the hyper-real bar.** 13,760 triangles / 23 batches. Recognizable coat/udder/hooves and named pose pivots, but rounded anatomy and neck joins still read toy-like. |

Additional inspected states: [lit bulb](shots/art/bulb-lit.jpg),
[empty bucket](shots/art/bucket-empty.jpg), [milk volume](shots/art/bucket-milk.jpg),
[flour portion](shots/art/flour-portion.jpg). Flour portion: .030 mass, one shallow
convex mound, 352 triangles. Milk portion: .120 mass, one cylinder, 320 triangles.
These are coherent recipe portions, not fluid/grain simulations.

Import `create` and `physics` from the module using the existing `three` import
map. Place the returned Group using the same transform as the body. Box sizes
are **full extents**: halve them for APIs that expect half extents. A capsule's
`halfHeight` excludes its caps. Convex vertices are local triples. Whole-body
mass is applied once across the compound, not once per part. Preserve separate
lid and milk ownership; their child-local collider frames are in the render JSON.
Rack socket Y=1.455 seats the bulb screw inside the modeled socket. Shelf anchors
are reference seat points: fit final AWP/top body centers in unit 6. Supported
hat/head/peg contact is adapter-owned; loose hat colliders are conservative.

Validation: all 15 modules/variants rendered with zero page errors and finite
position/normal/UV data; source syntax and `git diff --check` passed. Run
`python3 tools/art/audit.py` after rendering the complete set. The recorded
[audit](shots/art/audit.json) totals **31,364 raw JS bytes / 15,629 gzip bytes**,
**71,902 triangles / 84 meshes**, and **6,902,592 generated geometry bytes** for one
of each requested asset (including cow; alternate states excluded). Texture
sizes are recorded per render. No texture download is required. The studio uses
headless Chromium/SwiftShader on port 18745, not real GPU or iPhone validation.
These are size diagnostics, **not G1–G5 performance passes**. Cow remains on a
visual quality hold; all other verdicts above are provisional overnight judgments.


## Detailed cow and unit 8b — 2026-11-11

New modules are in `assets/models/prepared/world-detail/`; the original prepared
files remain untouched for the world builder. [Detailed sources](../assets/models/prepared/world-detail/SOURCES.md).
The new cow replaces the earlier provisional `cow.js` for integration.

| Asset / new file | Collider / play mass | Inspected renders | Judgment and handoff |
|---|---|---|---|
| Cow / `world-detail/cow.js` + `cow-surface.glb` | Kinematic trunk/head boxes + 4 leg capsules; 0; milk sensor | [side, three-quarter, front](shots/art/detail-cow.jpg); [walk/graze sheet](shots/art/detail-cow-sheet.jpg) | Revised to a continuous skinned hide with deep barrel, hip/shoulder structure, dewlap, attached udder, hocks, cloven hooves and switched tail. At the requested mid-size it reads believably as a dairy cow; macro hair remains a procedural bump treatment rather than a groom. 31,210 triangles / 29 meshes. |
| Googly eyes / `world-detail/eyes.js` | Two rounded convex domes; .040 pair | [three angles](shots/art/detail-eyes.jpg) | Inspected: sealed clear plastic domes, ivory backs and loose-looking black pupils; 5,776 triangles / 5 meshes. Named pupils accept event-driven `setPupils(group,x,y)` with bounded travel; no polling. |
| Four-point foil star / `world-detail/twinkle.js` | Four thin convex arm hulls; .010 | [front/back/top](shots/art/detail-twinkle.jpg); [curl/low light angle](shots/art/detail-twinkle-under.jpg) | Inspected: original four-point silhouette, gold face, pale adhesive reverse and lifted tip. Corrected face winding; smooth foil highlights and subtle creases. 2,496 triangles / 3 meshes. |
| Bread crumb cluster / `world-detail/crumbs.js` | Three box lobes, one body; .015 total | [three angles](shots/art/detail-crumbs.jpg) | Seven solid irregular pieces, browned crust against porous interior. Inspected after rejecting round seed-like first shapes and coarse facets. Pores are baked bump/color at this scale, not modeled cavities. 5,040 triangles / 1 mesh. |
| Curved glass fragments / `world-detail/shards.js` + `glass-form.js` | Three conservative box lobes, one body; .035 total | [three angles](shots/art/detail-shards.jpg) | Four closed wall fragments with .004 thickness, curved faces and bright edge geometry; inspected from above and behind. Shared cup radius profile. 5,248 triangles / 2 meshes. |
| Glass cup with water / `world-detail/cup.js` | Base cylinder + 8 wall hulls; .120 total, water follows cup | [rim, water and back](shots/art/detail-cup.jpg) | Open thick rim, .018 base and closed water volume with meniscus. Inspected: clear taper and water level read in all three angles. 2,848 triangles / 3 meshes. |
| Birthday blower / `world-detail/blower.js` | One conservative box, resized by extension; .015 | [rolled](shots/art/detail-blower.jpg); [half](shots/art/detail-blower-half.jpg); [extended](shots/art/detail-blower-extended.jpg) | Inspected all three states: closed printed paper tube, spiral roll, hollow plastic mouthpiece and collar. 3,160 triangles / 3 meshes. `setExtension(group,0…1)` reuses geometry; `physicsForExtension()` supplies the matching hull. |
| Billowing cloud / `world-detail/cloud.js` + `cloud-surface.glb` | Three rounded sphere lobes; .040 | [three angles](shots/art/detail-cloud.jpg); [six sides](shots/art/detail-cloud-sheet.jpg); [storm](shots/art/detail-cloud-storm.jpg); [lit underside](shots/art/detail-cloud-under.jpg) | Inspected: blended primary/secondary billows, rounded uneven base, complete back and underside. A closed soft surface, not a volumetric scattering simulation. 18,836 triangles / 1 mesh; GLB 339,920 bytes. |
| Finite confetti set / `world-detail/confetti.js` | Per-piece thin box .012 × .022 × .0056 before instance scale; .0002 each, .0096 total | [piece set](shots/art/detail-confetti-pieces.jpg); [start](shots/art/detail-confetti-start.jpg); [burst](shots/art/detail-confetti.jpg); [late](shots/art/detail-confetti-late.jpg) | 48 closed curved paper pieces, 5 colors, one instanced mesh / 2,112 displayed triangles. Inspected piece thickness/curl and three burst stages. Finite analytic gravity, damped floor bounce/contact; zero active instances at 2.4s. |

Cow choices for veto: polled Holstein, natural black/ivory coat, dark broad muzzle;
finite two-bone leg pose sampling and head-down grazing, with named pivots for
runtime retiming. `await create()` loads the 606,184-byte local skinned GLB.
The earlier hard shoulder joins and facial UV seam were rejected and corrected.
The six pose panels were inspected for contact, bent hocks and hay-height muzzle.
Final world movement, foot-speed matching and kinematic collider sync belong to
the runtime builder; this art pass does not claim the production performance gates.

Eyes choice for veto: off-white craft backing and restrained clear-plastic highlights.
Pair stays one rigid body; the runtime owns attachment and finite pupil settling.

Star choice for veto: one +Y point curls forward by .032; front is +Z.
Gold uses the shared scene environment. Glint/flutter envelopes belong to runtime.

Crumb choice for veto: a compact seven-piece bread cluster with torn and cut faces;
one body owns the brief hop. The art has no independent crumb simulation.

Glass choice for veto: slightly green clear glass with environment highlights and
alpha transparency; no extra refraction pass. This is an economical optical
approximation. The four fragments remain a single grouped .035 body; the broad
first proxy supports two adjacent fragments. Break timing is runtime-owned.

Cup choice for veto: water level .152 in a .222-high tumbler; contained water is
visual and does not add another rigid body. The open compound admits contents;
runtime replaces the cup once with fragments and the existing floor puddle.

Blower choices for veto: coral/teal/gold diagonal print on cream paper and an ivory
mouthpiece. Forward +X, mouth anchor −.035. The runtime owns the single bounded
unfurl/retract envelope, attachment and removal; there is no internal timer.

Cloud choices for veto: a softly shaded closed cumulus surface and blue-violet
storm glow. `await create()` loads the local GLB; `setStorm(group,darkness,glow)`
clamps both controls to 0–1. Glow is material emission, with no added light,
refraction target or timer. The generator asserts every mesh edge has exactly
two incident faces. At screen size the billows read well; very close views reveal
a sculpted surface rather than translucent vapor. Runtime owns sky drift,
return, handling, attachments and the finite lightning envelope.

Confetti choices for veto: 48 pieces in two side bursts, seeded palette and tumble,
2.4s lifetime. `sampleBurst(group,seconds,{floor})` returns false and hides/zeros
instances at expiry or invalid time; caller must stop sampling and release the
effect. The exported `piecePhysics` is optional for an engine adapter; this
prepared effect uses analytic particles and does not create 48 persistent bodies
or a keepsake. Apply instance scale to the optional collider.

Detail handoff validation: all nine asset modules and their requested variants
rendered headlessly with finite geometry and zero page errors. Every listed
image was opened and inspected. `node tools/art/verify-detail.mjs` passed 24 cow
poses, 21 blower poses with enclosing colliders, pupil bounds, cloud state clamps,
and 60 confetti samples with floor contact plus zero instances at/after 2.4s.
The cloud generator separately passed its closed-surface topology assertion.
[Machine-readable audit](shots/art/detail-audit.json): **979,074 raw bytes /
605,703 gzip bytes** for the new JS/GLBs including shared helpers; **76,726
triangles / 48 meshes** for one of each asset, including 48 confetti instances.
These totals exclude the already-existing `../core.js` and engine dependencies;
textures are generated once and their dimensions are in the audit. No production
G1–G5 or iPhone pass is claimed. Cow is believable at the requested screen size,
but its hair and facial microdetail remain below photographic close-up realism.

Prepared commits on `sc/art` (no push):

| Asset | Commit |
|---|---|
| Revised cow and walk/graze rig | `aef1092` |
| Googly eyes | `d682536` |
| Curled gold foil star | `d937755` |
| Bread crumb cluster | `416c888` |
| Curved glass fragments | `2e6737d` |
| Glass cup and water | `084a819` |
| Birthday blower | `dd4ded5` |
| Billowing cloud and storm underside | `ab6a9df` |
| Finite instanced confetti | `c3994fb` |

The choices above are the veto list for this narrowly scoped art follow-up;
the integrator owns any transfer into `docs/REVIEW.md`. No runtime or existing
check files were edited.

## Cow realism pass — licensed source, 2026-11-11

**Route (a), prepared and visually inspected.** New files under
`assets/models/prepared/cow-real/` supersede the earlier cow for integration;
the earlier model and its renders remain untouched. This pass changes no runtime
or existing check. The canonical source ledger is updated as explicitly requested.

| Asset | Files | Collider / mass | Renders inspected | Cost |
|---|---|---|---|---|
| Rukh3D dairy cow, adapted with walk and graze | [GLB](../assets/models/prepared/cow-real/cow.glb), [adapter](../assets/models/prepared/cow-real/cow.js), [source and licence](../assets/models/prepared/cow-real/SOURCES.md) | **0, kinematic**. Trunk box 1.62×.76×.63 at (−.05,.83,0); head box .56×.39×.30 at (1.31,1.04,0), follows head; four leg capsules radius .065 / half-height .31 at x=−.65 or .61, y=.38, z=±.19. Milk sensor sphere radius .20 at (−.55,.40,0). Runtime updates moving proxies. | [Side / three-quarter / front](shots/art/cow-real-cow.jpg), [four walk phases and two graze views](shots/art/cow-real-cow-sheet.jpg), [head / hooves / coat close-ups](shots/art/cow-real-cow-detail.jpg), [previous cow in the same lighting](shots/art/cow-real-cow-previous.jpg) | **548,340 B GLB**, 338,114 B gzip; adapter 7,391 B. 9,546 triangles, 2 skinned meshes, 2 materials, 55 bones; 512×256 coat, 128² eye JPEGs, generated 128² micro-bump. |

Source: [Farm Cow Animated Dairy cattle](https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e)
by [Rukh3D](https://sketchfab.com/rukh3d),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Licence verified from
the original model's page metadata and matching source notices. Download bytes
came from a revision-pinned, attributed public redistribution, detailed with exact
URLs and SHA-256 in the asset's provenance manifest. Preserve attribution in the
public game. No unclear-licence or generated-model source is used.

**Visual judgment:** a clear improvement over the rejected procedural cow. The
source has a deep dairy barrel, pronounced shoulder/hip structure, shaped knee
and hock masses, actual cloven hoof geometry, dewlap, udder, a connected head and
neck, modeled muzzle/nostril and eye-socket forms, horns, ears and tail switch.
The head-down pose deforms a continuous skin. Irregular textured patches and
subtle cavity shading replace the previous flat procedural patches; hoof horn
pigment makes the split toes readable. The new cow is believable at the intended
mid-size screen view. **It is still below photographic close-up realism:** the
small source coat map blurs in macro views, the face/horns show facets, and hair
is a subtle bump treatment rather than individual fibers. These limitations are
visible in the supplied close-up render; no hyper-real close-up pass is claimed.

Choices for Aaron's veto:

1. Use this CC BY 4.0 source with public attribution, rather than another
   procedural anatomy rebuild. Keep the previous version for comparison.
2. Keep the source's horned black-and-white Holstein appearance, body proportions
   and 9,546-triangle skin. Further decimation would damage useful anatomy.
3. Use corrected dielectric hide/eyes, baked cavity shading and grey-brown hooves.
   Keep the original compressed textures; do not upscale and imply added detail.
4. Replace source idle/combat clips with newly authored **walk (1.6 s)** and
   **head-down graze (2 s)**. This source did not come with a walk. Reverse the
   graze sample to raise the head; jaw chewing is not a delivered clip.
5. Preserve actual skin bones with runtime aliases. Rear legs expose hip, hock,
   fetlock and hoof; the source has no independently weighted stifle control.
   The runtime should use the supplied sampler/skin hierarchy rather than the
   old rigid-part rotation recipe.

API: `await create()` returns a group facing +X, Y up, full height 1.48 and floor
at zero. `pose(group,{phase,walk:1})` samples the baked walk; advance +X at
`group.userData.rig.speed` = **.26209677 units/s** (scaled with the group). This
matches a .26-unit stance sweep over .62 of a 1.6-second cycle. Cycle advance is
.41935484 units. `pose(group,{eat:0..1})` samples the lowering clip. Use exclusive
walk/graze states and let the runtime own entry/exit blending, the finite visit,
collider following, milk contact and cleanup. The adapter installs no timer,
render loop, body or world registration. Full alias map and rebuild commands are
in the asset source record.

[Cow-specific validation](shots/art/cow-real-validation.json) passed: 129 walk
samples, 41 graze samples, named skin bones, finite deformed geometry bounds,
exact loop closure and return to rest, placement/rotation/scale invariance,
and no floor penetration beyond numerical epsilon. Planted-hoof height drift
was .0002371 units and compensated forward drift .0003378 units; maximum
authored-vs-baked joint error was .0045531 between baked samples. All four render
files were opened and inspected, including the old cow under the same lighting.
No production G1–G5 or device performance pass is claimed; this is an art handoff.
These five choices are the veto list within this follow-up's allowed paths; the
integrator owns transfer into `docs/REVIEW.md`.
