# Unit 8b small objects

Runtime uses the original CC0 procedural prepared models from
[`assets/models/prepared/world-detail/SOURCES.md`](../../models/prepared/world-detail/SOURCES.md):
`eyes.js`, `twinkle.js`, `crumbs.js`, `shards.js`, `glass-form.js`, and `cup.js`.
Their seeds, geometry, 256-square material maps and inspected art are recorded in
[`docs/art-ready.md`](../../../docs/art-ready.md). No generated/downloaded replacement
art or new textures are introduced by this unit. The existing cloud is unchanged.

The runtime scales models once to their initial keepsake size and saves that scale.
Prepared convex vertices and rotated box/cylinder proxies become body-local hulls.
The eyes retain two domes and named movable pupils; crumbs/shards retain three
lobes each; the star retains four thin arms; the temporary cup has a base and eight
walls. Masses remain .040, .015, .035, .010 and .120 respectively.
Static geometry is batched by material through the existing mesh-picture atlas.
Eyes retain their small articulated group so pointer events can move real pupils.

Actual contacts use the original material impact library documented in
[`docs/sound-direction.md`](../../../docs/sound-direction.md): small butter for
crumbs, small glass for fragments, medium glass for the intact cup, small paper
for foil, and small tin for the craft pair's hollow rattle. Existing choir, bite,
twinkle, slide and smash cues retain their trigger meanings. Glass is the prepared
reflective alpha approximation, with a thick rim and contained water, without an
additional refraction pass.

Runtime contact fitting: the prepared boxes left visible gaps after some rotated
landings. The adapter therefore samples 122 fixed support directions from the
actual art and builds three convex surface lobes for each cluster, and two for the
eyes. This retains the prepared masses and lobe counts, without using rendering
triangles as colliders. The star and cup retain their prepared hulls. Glass-fragment
restitution is .02 with .08 soft CCD prediction and .001 skin; the tuned surfaces
and natural sleep are checked with 100 seeded drops at each viewport.
