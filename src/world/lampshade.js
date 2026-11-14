// The rack's lampshade: an empire shade of cream linen with walnut-brown piping, held on a three-spoke brass spider
// with a little finial on top. Our own lathe geometry and a procedural weave; built once, drawn in the rack's cached
// picture. lit(u) only changes material values (0 = dark, 1 = glowing from inside); it never schedules work.
import {forPicture} from '../core/cat.js';
// Sizes in the rack model's own units (the post is 1.5 tall); the rack scales the whole group.
export const SHADE = {bottom: .17, top: .108, height: .22, lift: .05, trim: .0065, spokes: 3};
function linen(T) {
  const w = 512, h = 192, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
  let seed = 20261111; const rnd = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  const warp = Float32Array.from({length: w}, () => rnd() - .5), weft = Float32Array.from({length: h}, () => rnd() - .5);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // a plain weave: alternate over/under cells, each thread a little thicker or thinner than its neighbour (slubs)
    const over = ((x >> 1) + (y >> 1)) & 1, thread = over ? warp[x] : weft[y];
    const f = .9 + thread * .09 + (over ? .025 : -.025) + (rnd() - .5) * .04;
    const i = (y * w + x) * 4; d[i] = 238 * f; d[i + 1] = 225 * f; d[i + 2] = 200 * f; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // the one vertical seam where the fabric was joined, and a faint shade of the fold under each piping
  g.fillStyle = 'rgba(120,96,64,.18)'; g.fillRect(w * .62, 0, 2, h);
  const edge = g.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, 'rgba(90,70,45,.16)'); edge.addColorStop(.07, 'rgba(90,70,45,0)'); edge.addColorStop(.93, 'rgba(90,70,45,0)'); edge.addColorStop(1, 'rgba(90,70,45,.2)');
  g.fillStyle = edge; g.fillRect(0, 0, w, h);
  const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.wrapS = T.RepeatWrapping; map.anisotropy = 4;
  return map;
}
export function createLampshade(T) {
  const S = SHADE, group = new T.Group(); group.name = 'lampshade';
  const map = linen(T);
  // Outside: matte linen. Inside: the same cloth seen in its own shadow. Lit, both carry the bulb's warmth through the
  // weave (emissiveMap), the inside brighter, so the shade reads as a glowing drum rather than a painted cone.
  const outside = new T.MeshStandardMaterial({color: '#f3ece0', map, roughness: .92, metalness: 0, side: T.FrontSide, emissive: '#000000', emissiveMap: map, emissiveIntensity: 0});
  const inside = new T.MeshStandardMaterial({color: '#d9c8a8', map, roughness: .95, metalness: 0, side: T.BackSide, emissive: '#000000', emissiveMap: map, emissiveIntensity: 0});
  outside.name = 'shade-outside'; inside.name = 'shade-inside';
  const piping = new T.MeshStandardMaterial({color: '#5a3b26', roughness: .8, metalness: 0}), brass = new T.MeshStandardMaterial({color: '#8a7350', roughness: .32, metalness: .85});
  for (const m of [outside, inside, piping, brass]) forPicture(m);
  // An empire profile with a soft belly: wide at the hem, gently curving in to the crown.
  const profile = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, r = S.bottom + (S.top - S.bottom) * (u * .82 + u * u * .18) + Math.sin(u * Math.PI) * .006;
    profile.push(new T.Vector2(r, S.lift + u * S.height));
  }
  const shellGeometry = new T.LatheGeometry(profile, 64);
  // the weave runs round the shade once, about 3.4 repeats so a thread is roughly as wide as it is tall
  const uv = shellGeometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 3.4);
  const shell = new T.Mesh(shellGeometry, outside); shell.name = 'lampshade-shell';
  const lining = new T.Mesh(shellGeometry, inside);
  group.add(shell, lining);
  const ring = (r, y, t) => { const m = new T.Mesh(new T.TorusGeometry(r, t, 8, 64), piping); m.rotation.x = Math.PI / 2; m.position.y = y; group.add(m); };
  ring(S.bottom + .0015, S.lift, S.trim); ring(S.top + .001, S.lift + S.height, S.trim * .85);
  // The spider: spokes from the crown ring to a washer over the socket, and the finial that holds it down.
  const crown = S.lift + S.height - .004, washerY = crown + .012;
  for (let k = 0; k < S.spokes; k++) {
    const a = k / S.spokes * Math.PI * 2 + .4, from = new T.Vector3(Math.cos(a) * S.top * .97, crown, Math.sin(a) * S.top * .97), to = new T.Vector3(0, washerY, 0);
    const len = from.distanceTo(to), rod = new T.Mesh(new T.CylinderGeometry(.0028, .0028, len, 8), brass);
    rod.position.copy(from).add(to).multiplyScalar(.5); rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(from).normalize()); group.add(rod);
  }
  const washer = new T.Mesh(new T.CylinderGeometry(.016, .018, .006, 24), brass); washer.position.y = washerY; group.add(washer);
  const finial = new T.Mesh(new T.LatheGeometry([[0, 0], [.007, .001], [.009, .006], [.004, .012], [.011, .022], [.012, .03], [.007, .038], [0, .041]].map(p => new T.Vector2(...p)), 24), brass);
  finial.position.y = washerY + .003; group.add(finial);
  for (const o of group.children) o.castShadow = o.receiveShadow = true;
  const warm = new T.Color('#9a5cff');   // a UV lamp (playtest 2): the shade glows violet from inside
  function lit(u) {
    outside.emissive.copy(warm).multiplyScalar(u > 0 ? 1 : 0); outside.emissiveIntensity = 1.05 * u;
    inside.emissive.copy(warm).multiplyScalar(u > 0 ? 1 : 0); inside.emissiveIntensity = 2.2 * u;
  }
  lit(0);
  return {group, shell, lit, dispose() { group.traverse(o => o.geometry?.dispose()); for (const m of [outside, inside, piping, brass]) m.dispose(); map.dispose(); }};
}
