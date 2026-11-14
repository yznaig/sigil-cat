# Prepared 3D art sources

All geometry, grain, wear and print in this folder are original procedural work for
Sigil Cat, authored 2026-11-10 by Astra for Aaron. No downloaded model, photograph,
HDRI or AI bitmap. Original art is dedicated under **CC0-1.0**:
https://creativecommons.org/publicdomain/zero/1.0/ . Source is the matching `.js`
file in this folder, with the shared construction/material source `core.js`.
No external asset URL exists for our own work. Three.js is the existing MIT engine,
not CC0 art; studio RoomEnvironment is Three.js MIT code, used only for inspection.

- `rack.js`: turned walnut foot/post, four aged brass pegs, screw lamp socket.
- `bulb.js`: glass envelope, threaded brass base, insulator, supports and coil.
- `core.js`: seeded (111033) 256² color/bump maps; bevel/lathe/tube primitives and
  stationary material batching. Textures build once on creation, no animation.

Use the site's pinned `three` import map (0.186.1). Call `create()` once; returned
Group is Y-up, at its authored support origin. Exported `physics` is plain data,
also on `group.userData.physics`. Box dimensions are full extents; cylinder axis
is Y; Euler rotations are radians XYZ. Masses are plan play weights, not kg.
The runtime must dispose geometries/materials/textures when ownership ends.
Texture construction uses the browser canvas only for lettering; no network I/O.

Reproduce: serve repo with `python3 tools/serve.py . 18745`, then
`node tools/art/render.mjs rack bulb`. `PW_FROM` may point to any installed
playwright-core project; `CHROME` may select a headless Chromium binary.
Render tooling lives in `tools/art/studio.html` and `tools/art/render.mjs`.
Each JPG is the actual asset from three cameras; adjacent JSON records geometry,
materials, collider data, errors and renderer. No runtime performance gate claimed.

## Hats (`hats.js`)
Original modeled hollow wizard/cone/party/crown. Palettes are reused from this
repo's `src/gags/hat.js` (no third-party image). New 32² nearest-filter pixel
patterns wrap the 3D surfaces; no sprites. 16-sided hat crowns and a 32-segment
pointed crown ring. Choose `create({variant:'wizard'|'cone'|'party'|'crown'})`.
`physics[variant]` supplies head/peg/butter anchors; `crownHeight` is also on the
returned Group. Primitive collision is an intentionally conservative outer fit;
head/peg attachment uses anchors rather than trying to thread a solid cone hull.
Render: `node tools/art/render.mjs hats:wizard hats:cone hats:party hats:crown`.

## Tin (`tin.js`)
Original rounded extrusion, closed lid, enamel/metal seam, cloth plaster patch.
Front wording and cream/green palette from `src/gags/petbite.js`; reverse wording
is original. Deterministic canvas print at 512×189 / 512×160; no fonts downloaded.
Sparse seeded (111036) edge chips, 256² original cloth. Render: `node tools/art/render.mjs tin`.

## Shelf (`shelf.js`)
Original beveled wood extrusion with circular hole and recessed bottom, two
leather-lined steel rifle saddles, glazed plate, tin rails, bolted triangular
brackets. 256² seeded grain/metal/cloth only. Width 1.35, depth .34; slot anchors
are reference seat points, not final selected-splat body centers. Unit 6 must fit
rifle/top transforms from actual selected art and test contact gaps.
Render: `node tools/art/render.mjs shelf` (includes underside).

## Box with separate lid (`box.js`)
Original five-wall kraft shell, modeled exposed fluting, original arrow print and shipping tape. 256² paper; two 512-wide canvas labels. create({open:false}) or variant closed closes it. Named lid child has separate lidPhysics, local hinge origin and full collider dimensions. interior exports actual free bounds. No hinge solver or tick is included.
Render: `node tools/art/render.mjs box`. Original CC0 dedication above applies.

## Flour sack (`flour.js`)
Original 20×32 ring superellipse sack, folded paper closure and original FLOUR / STONE GROUND / WHEAT • 01 lettering/wheat mark. 256² paper (seed 111033), 512×602 print. createPortion() and portionPhysics provide a separate powder mound; it is not a particle system.
Render: `node tools/art/render.mjs flour`. Original CC0 dedication above applies.

## Bucket with milk (`bucket.js`)
Original double-wall lathed pail, rolled rim, wire bail, wooden grip, stamped ribs and rivets. Seed 111038 creates a 128² zinc map; grip has 256² wood. create() includes a named milk child; create({variant:'empty'}) omits it (empty is a string). createMilk()/milkPhysics provide a capped volume for transfer. No liquid or handle loop.
Render: `node tools/art/render.mjs bucket`. Original CC0 dedication above applies.

## Three-tine pitchfork (`pitchfork.js`)
Original turned ash shaft, riveted metal socket and three curved steel tines. 256² wood only; no imported tool model. Grip anchor at Y=.65. One capsule and four boxes are conservative physical fit; the fine tip curve is visual detail.
Render: `node tools/art/render.mjs pitchfork`. Original CC0 dedication above applies.

## Hay pile (`hay.js`)
Original seed 111039: 600 four-sided tapered straw segments, four dry-straw colors, low hidden mound core. Static geometry is merged into four material batches. No textures, instanced updates or separate straw colliders. The landed mass-zero policy is metadata for the adapter.
Render: `node tools/art/render.mjs hay`. Original CC0 dedication above applies.

## Cake (`cake.js`)
Original extruded 298-degree sponge layers, jam/cream filling, icing top and piped
beads (chocolate since playtest 3: dark sponge, ganache top, milk-chocolate buttercream); removed wedge exposes real cut faces. Original 256² crumb/crust maps (seed
111033); no downloaded food image. .18 play mass, one conservative cylinder.
No separate pore meshes or physics crumbs. Render: `node tools/art/render.mjs cake`.

## Cow (`cow.js`) — provisional art study
Original modeled trunk, shoulder, head/muzzle, four articulated leg groups,
split hooves, ears/horns, udder/teats, tail and eyes. 256² original Holstein-like
coat from seed 111041; no animal photo or downloaded model. 13,760 triangles.
`poseCow(group, {walkPhase, walkAmount, eatAmount})` samples an authored pose;
amounts clamp to 0–1. It has no timer; the runtime owns the finite visit and stops
sampling at rest. Head and four leg pivots remain separate named groups.
Kinematic head/leg proxies must follow those pose transforms during the visit.
The modeled anatomy is visibly simplified: do not treat this as approved hyper-real
cow art. Render: `node tools/art/render.mjs cow cow:eat`.

## Final inspection and integration notes
All modules are new art-only files. Final screenshots use linear magnification
for realistic procedural maps and nearest filtering only for the hats. Lighting
was reduced for material evaluation, and every final view was inspected.
`bulb:lit`, `bucket:empty`, `bucket:milk` and `flour:portion` are extra render variants.
The rack socket seat and party-hat butter anchor were fitted to their actual
geometry. The crown ring's conservative collider boxes reach the point height.

The renderer can use `ART_CDN_IP` for a temporary DNS outage, passing a Chromium
host resolver override while retaining HTTPS host/certificate verification.
Final run used 104.16.174.226 for cdn.jsdelivr.net after DNS timed out; engine
URLs/version remained unchanged. This is tooling-only, not a runtime dependency.
`tools/art/audit.py` verifies saved finite-geometry/collider reports and writes
`docs/shots/art/audit.json`; it does not test the production physics or frame cost.

## Unit 6 runtime fitting (2026-11-11)
Original CC0 adjustments in this worktree: tin front/back print planes moved
outward .002 units to clear the enamel; shelf `create({rifleStops:[{x,y},…]})`
accepts fitted saddle positions and uses narrower padded risers. The exported
`physics` remains the original reference dimensions; `src/world/shelf.js` builds
the matching runtime fixed colliders from the selected rifle sections. No new
external art, model, texture or sound source was added.
