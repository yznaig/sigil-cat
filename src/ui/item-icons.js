// Inventory icons (kitchen lane, e1111-61): each item's own 3D model, rendered once into a small square picture from
// a little above the front, then cached (in memory, and in this browser under its own key so an item in the chest
// keeps its picture after a reload). Uses the stage's renderer, lights and environment, outside the frame loop.
const KEY = 'sigilcat.icons.v1', SIZE = 96;
export function createItemIcons(site) {
  const { THREE: T, stage } = site;
  const cache = new Map();
  try { for (const [k, v] of Object.entries(JSON.parse(localStorage.getItem(KEY) || '{}'))) cache.set(k, v); } catch {}
  let rt = null, scene = null, camera = null;
  const stats = { renders: 0 };
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cache))); } catch {}
  }
  const keyOf = (inst) => inst.id + (inst.id === 'bucket' && site.eggs.box?.recipe.state.milkFull ? ':milk' : '');
  function setup() {
    if (rt) return;
    rt = new T.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true, samples: 4 });
    scene = new T.Scene(); camera = new T.PerspectiveCamera(26, 1, .01, 50);
  }
  function render(inst) {
    const visual = inst.picture?.visual, root = inst.object;
    if (!visual || !root) return null;
    setup();
    for (const child of [...scene.children]) scene.remove(child);
    for (const child of stage.scene.children) if (child.isLight) { const l = child.clone(); l.castShadow = false; scene.add(l); if (l.target) { l.target = child.target.clone(); scene.add(l.target); } }
    scene.environment = stage.scene.environment; scene.environmentIntensity = stage.scene.environmentIntensity;
    root.updateWorldMatrix(true, false);
    const clone = visual.clone(); clone.matrixAutoUpdate = false; clone.matrix.copy(root.matrixWorld); clone.visible = true;
    clone.traverse((o) => { o.visible = true; o.frustumCulled = false; o.layers.set(0); });
    scene.add(clone); clone.updateMatrixWorld(true);
    // Frame the item's own collider (or picture) points, as it lies in the room now.
    const pts = (inst.colliderVertices || []).map((v) => v.clone().applyMatrix4(root.matrixWorld));
    if (!pts.length) { const b = new T.Box3().setFromObject(clone); pts.push(b.min, b.max); }
    const sphere = new T.Sphere().setFromPoints(pts);let dir = new T.Vector3(0, .62, 1).normalize();
    // A card is shown face on, upright, so its print fills the slot.
    if (inst.cardDimensions) {
      const q = new T.Quaternion().setFromRotationMatrix(root.matrixWorld), n = new T.Vector3(0, 0, 1).applyQuaternion(q);
      if (n.dot(dir) < 0) n.negate();
      dir = n.clone().multiplyScalar(4).add(new T.Vector3(0, .25, .35)).normalize();
      camera.up.copy(new T.Vector3(0, 1, 0).applyQuaternion(q));
    } else camera.up.set(0, 1, 0);
    const dist = sphere.radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)) * 1.02;
    camera.position.copy(sphere.center).addScaledVector(dir, dist); camera.lookAt(sphere.center);
    camera.near = Math.max(.001, dist - sphere.radius * 2); camera.far = dist + sphere.radius * 2; camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    // Splat props sort their ellipses for the viewing eye.
    inst.picture.mesh?.sortFor?.(camera);
    const R = stage.renderer, prev = R.getRenderTarget(), color = R.getClearColor(new T.Color()), alpha = R.getClearAlpha();
    R.setRenderTarget(rt); R.setClearColor(0x000000, 0); R.clear(true, true, true); R.render(scene, camera);
    const px = new Uint8Array(SIZE * SIZE * 4); R.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, px);
    R.setRenderTarget(prev); R.setClearColor(color, alpha);
    scene.remove(clone);
    stats.renders++;
    // Upright, and un-premultiplied for a canvas picture.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
    const c = canvas.getContext('2d'), img = c.createImageData(SIZE, SIZE);
    let any = false;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const s = ((SIZE - 1 - y) * SIZE + x) * 4, d = (y * SIZE + x) * 4, a = px[s + 3];
      if (a) any = true;
      const k = a ? 255 / a : 0;
      img.data[d] = Math.min(255, px[s] * k); img.data[d + 1] = Math.min(255, px[s + 1] * k); img.data[d + 2] = Math.min(255, px[s + 2] * k); img.data[d + 3] = a;
    }
    if (!any) return null;
    c.putImageData(img, 0, 0);
    return canvas.toDataURL('image/png');
  }
  return {
    stats,
    // The picture for a live item (rendered now if it has none yet, or if its look changed), or a saved one by id.
    of(inst, { fresh = false } = {}) {
      const key = keyOf(inst);
      if (!fresh && cache.has(key)) return cache.get(key);
      let url = null; try { url = render(inst); } catch (e) { console.warn('icon', inst.id, e); }
      if (url) { cache.set(key, url); if (key !== inst.id) cache.set(inst.id + ':any', url); else cache.set(inst.id + ':any', url); persist(); }
      return url || cache.get(key) || null;
    },
    saved(id, variant = '') { return cache.get(id + variant) || cache.get(id) || cache.get(id + ':any') || null; },
    forget() { cache.clear(); try { localStorage.removeItem(KEY); } catch {} },
  };
}
