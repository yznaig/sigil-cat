# Unit 7 rack, hats and lamp

All rack, hat and bulb art is original Sigil Cat procedural work (CC0), imported
from `assets/models/prepared/{rack,hats,bulb,core}.js`. See
[`../../models/prepared/SOURCES.md`](../../models/prepared/SOURCES.md) for the
prepared source record and [`../../../docs/art-ready.md`](../../../docs/art-ready.md)
for inspected art renders. No external image, model or texture is added here.

`src/world/rack-art.js` merges the prepared geometry for the shared mesh atlas,
converts the authored collider descriptions, and applies the adapter's physical
scale. `hats.js` fits four hollow hats to named knobs and the cat's crown.
`lamp.js` creates its own 64×64 radial warm-glow texture; no downloaded bitmap,
post-process glow, shadow light, animation or idle callback is used.

Runtime fitting keeps both lower brass arms and their collars .20 model units
lower, with matching peg anchors and fixed colliders, so the four brims remain
separated in the phone projection. The prepared rack's optional `upperReach`
fit extends the upper arms from .28 to .36 model units, with matching knobs,
anchors and colliders, to separate party/crown bounds at desktop size. The
default prepared studio model remains unchanged. The wizard collider follows its beveled brim
profile. The party collider is one convex hull of the actual art vertices,
including the pom; this avoids an equal-mass compound falsely placing half the
hat mass in that small ornament. Paper friction/damping is passive. Render
geometry retains the hollow underside and all original pixel motifs.

Mounted props share their actual geometry with invisible floor-shadow proxies;
these are updated only by support changes and finite peg sway.
