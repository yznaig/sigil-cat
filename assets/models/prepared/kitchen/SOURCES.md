# Kitchen lane art — original sources
Original procedural models for the kitchen lane (e1111-58/59/61), authored 2026-11-12 for Aaron's Sigil Cat.
No downloaded mesh, photograph, HDRI or AI bitmap. Original art dedication: **CC0-1.0**.

All geometry, prints and maps are built at runtime from the matching `.js` file with three.js (MIT engine, not art)
and the browser canvas; seeds are fixed, so each build is identical. Units are cat-height units, Y up.

- `egg.js`: one big hen's egg. Narushin's egg curve (length .2, breadth .15, widest point .012 toward the blunt end)
  on a 72-segment lathe; seeded (811130) light-brown shell with faint mottle and ~900 darker brown speckles, densest at the blunt end
  and drawn wider near the poles so the lathe's pinch keeps them round; seeded (811131) pore bump map; roughness .44 (satin).
  `hullPoints()` gives the convex collider (13 rings of 16). It cannot break (e1111-59): no break state exists.
- `bin.js`: a small blue recycling bin. A tapered lathe pushed toward a rounded square (superellipse, power 5), rolled
  rim, darker inside, and a white chasing-arrows mark drawn on a canvas. `wallShapes()` gives a floor and four
  leaning wall boxes for its fixed body.
- `goodjob.js`: a gold-foil five-pointed star sticker printed GOOD / JOB! in red with a white keyline; seeded (811140)
  brushed foil grain, embossed rim; a metalness map keeps the print non-metallic; paper back, thin cut edge, one tip
  lifted a few millimetres. Convex collider: a centre pentagon and five tips, as the gold star's.

The pictures in the inventory are renders of these same models (and of every other item's own model), made in the
browser by `src/ui/item-icons.js`.
