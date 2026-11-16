// Floor outline (music round, 2026-11-15; Aaron's pick e1115-55, "go with your rec"). His words: "The only other
// change the game needs is for items that are too hard to see on the ground to be more visible some way or another."
// The floormock lane measured every keepsake against the cream floor (docs/REVIEW.md, "Floormock lane"); seven melt into
// it (median edge colour difference 3-7, where ~10 is the least a glance finds). Those seven get the mock-up's look b,
// a thin warm near-black ink line (~1.4 px) round their picture. Everything else stays as it was.
//   recipe card, rejected paper   card stock 'recipe', 'paper' (src/world/cards.js STOCK)
//   measure of flour, of milk     ingredient kinds 'recipe-flour', 'recipe-milk' (src/world/ingredients.js)
//   googly eyes                   src/world/eyes.js
//   broken glass                  fragment 'shards' (src/world/fragments.js)
//   light bulb                    src/world/lamp.js
// Each is marked where its kind is defined (def.outline), so another item of the same kind (a second recipe-card
// stock, another measure of flour) is outlined with no list to update here.
// When: while the item is loose, wherever its own picture is drawn: lying on the floor, held, thrown, falling, scooted
// out from behind furniture, summoned, restored after a reload. Not while it sits in a support (the board, the shelf,
// the rack, the lamp's socket, on the cat's face): there it is drawn inside the furniture's or the cat's picture, or is
// part of the furniture, and is easy to see. The line is part of the item's picture, so wherever the pictures are hidden
// (the galaxy's dark, flappy, the grimoire's sheet, the error page, the closed doors) it is hidden with them.
// Cost: none per frame. The set of outlined pictures is worked out when the picture batch is rebuilt (which happens
// only when a picture changes), the line is drawn by the batch's own shader, in the same draw, and only for the
// outlined pictures. Reduced motion: nothing to do, it never moves on its own.
// ?outline=0 leaves it out (checks and before/after shots); site.floorOutline.set(on) switches it live.
import {worldPresentation} from '../core/world-presentation.js';
export const INK = {px: 1.4, colour: [.17, .13, .1], alpha: .78};
export function floorOutline(site) {
  const {keepsakes, stage} = site, P = worldPresentation(site), cards = new Set();
  let on = stage.opt('outline') !== '0';
  const outlined = (i) => !!(i?.def.outline && i.picture?.card && !i.worldEntry?.support && !i.stored);
  function collect() {
    cards.clear(); if (!on) return cards;
    for (const i of keepsakes.live.values()) if (outlined(i)) cards.add(i.picture.card);
    return cards;
  }
  P.setInk({...INK, cards: collect});
  const api = {
    INK, get on() { return on; },
    set(v) { on = !!v; P.refresh(); },
    // an outlined item seated in or freed from a support (src/core/supports.js): rebuild once, as it may not move
    seated(e) { if (on && keepsakes.get(e?.id)?.def.outline) P.refresh(); },
    // for checks: whether this item's picture is outlined right now
    has(id) { const i = keepsakes.get(id); return on && outlined(i) && !!i.picture.card.visible; },
    // for checks: whether the picture batch's last build outlined it (what is on screen now)
    drawn(id) { const c = keepsakes.get(id)?.picture?.card; return !!c && cards.has(c) && !!c.visible; },
  };
  return site.floorOutline = api;
}
