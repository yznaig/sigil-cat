// Boot warm-ups for the programs every keepsake shares (speed lane, playtest-2; decision e1112-59, costs 2 and 4).
// The first keepsake to appear after he is shown (the galaxy's postcard, the pat Butterman leaves) used to build these
// live and stop the page for 0.1-0.3 s: the picture batch and its floor shadow (world-presentation), the support
// shadow (world-layout), and the mesh atlas's clear quad and its two standard-material variants (with and without a
// printed picture). Each is drawn once, unseen, through stage.warm: one per quiet moment after he is shown.
import { worldPresentation } from './world-presentation.js';
import { meshAtlas } from './mesh-atlas.js';
import { forPicture } from './cat.js';

const keep = [];        // the warm-up materials stay alive, so their programs stay in three's cache
export function warmShared(site) {
  const { stage, THREE: T } = site;
  worldPresentation(site).warm();
  stage.warm(async function supportShadow() {
    // a model's geometry: position, normal and uv (three's program depends on which attributes there are)
    const m = new T.Mesh(new T.PlaneGeometry(1e-4, 1e-4), site.worldLayout.warmMaterial());
    m.frustumCulled = false; stage.scene.add(m);
    try { await stage.compile(m); stage.warmDraw([m]); } finally { m.removeFromParent(); keep.push(m.material); }
  });
  stage.warm(async function atlasTiles() {
    const white = new T.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); white.colorSpace = T.SRGBColorSpace; white.needsUpdate = true;
    await meshAtlas(site).warm([forPicture(new T.MeshStandardMaterial()), forPicture(new T.MeshStandardMaterial({ map: white }))]);
  });
}
