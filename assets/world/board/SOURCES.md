# Pinboard and printed cards

Original project art, authored in code for this repository on 2026-11-11. No external pictures, textures, model outputs, font files, art or sounds were copied.

- `src/world/board-art.js`: original mitred beveled walnut frame, inset cork, corner screw heads, steel shafts and three enamel pin heads. Seed 187 generates wood grain (1024×512) and cork chips (512×512) using Canvas 2D. Three standard materials use these textures as colour and shallow bump; the existing project room environment supplies lighting.
- `src/world/card-geometry.js`: original 24×24 front/back grids, continuous thin edge, shallow corner curl and ticket notches. Paper/postcard physics uses two eight-corner wedges fitted to the surface corners. The ticket uses two original bevelled thin slabs (2mm centre, .2mm perimeter, 3mm bevel inset); its art keeps the shallow curl. Both reused-body and fresh-body 100-seed controls rest broad-face; see REVIEW and diagnostic JSON.
- `src/world/card-print.js`: deterministic original print, generated at runtime only after the cat appears. Paper is 768×960 (seed 51); postcard 768×512 (seed 73); ticket 768×346 (seed 91). Canvas renders platform serif/sans-serif fonts; no font binaries are distributed here.
- Paper wording comes from the project's existing rejection letter in `src/gags/paradox.js`. Front/back prints preserve that wording. The red rejection stamp is a provisional styling choice for Aaron's veto.
- Postcard preserves the project's cream border, purple night sky, crescent, stars, “Greetings from THE VOID / nothing for miles”, and the cat's message on the back. Ticket preserves cream/red letterpress styling, “ADMIT ONE / BUTTAMAN / the encore / No. 0001”; its new back reads “KEEP THIS STUB / one more for the road”. These are new code-rendered versions of the project's own earlier art.
- Inspect views render the actual front/back/edge geometry; the selectable HTML text is a transcript. Review JPEGs under `docs/shots/world-unit5-*` are captures of this repository's page.
- Tap sounds retain the existing `paper` and encore actions; floor contacts use the project's authored paper impact voices via `docs/sound-direction.md`. No Idol/model generation was run. No AWP/top input pictures were added.

Three remains the existing pinned 0.186.1 CDN import; Rapier remains compat 0.19.3 (Apache-2.0), recorded in `docs/plans/world.md`. No new runtime library was introduced.
