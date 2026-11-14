// The star that stayed: the bread's blast-off leaves a gold star stuck on the screen. Since playtest 2 it is a flat 2D
// sticker in the sticker layer above the room (src/world/stickers.js): it can never be lost behind the pinboard or the
// cat. Drag it anywhere on the screen; a tap tilts it toward you with a fingernail-on-glass tink (e1111-58).
import {defineSticker} from './stickers.js';

export function defineStar(site) {
  const {stage} = site;
  site.store.del('worldBodies.twinkle');   // an older save's physical star has nothing to restore into
  defineSticker(site, {id: 'twinkle', label: 'the star that stayed', art: 'star', spot: [.7, .2], tilt: -8});
  // Older callers and checks: a sticker is always stuck; there is nothing to peel.
  return {stick: () => true, peel: () => false, get glinting() { return !stage.reducedMotion && !!site.keepsakes.get('twinkle')?.el.querySelector('.face')?.getAnimations().length; }};
}
