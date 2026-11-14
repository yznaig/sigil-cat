// Small things the eggs and gags share.
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const ease = {
  out: (u) => 1 - (1 - u) ** 3,
  in: (u) => u * u * u,
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2),
  back: (u, s = 1.9) => 1 + (s + 1) * (u - 1) ** 3 + s * (u - 1) ** 2,
  bounce: (u) => { const n = 7.5625, d = 2.75; if (u < 1 / d) return n * u * u; if (u < 2 / d) return n * (u -= 1.5 / d) * u + 0.75; if (u < 2.5 / d) return n * (u -= 2.25 / d) * u + 0.9375; return n * (u -= 2.625 / d) * u + 0.984375; },
};
// One <style> per egg, added once: each egg keeps its own few CSS rules in its own file.
export function css(id, text) {
  if (document.getElementById('css-' + id)) return;
  const el = document.createElement('style'); el.id = 'css-' + id; el.textContent = text;
  document.head.appendChild(el);
}
export function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
// A soft round shadow for something standing on the page's floor.
export const floorShadow = 'radial-gradient(ellipse at center, rgba(40, 28, 16, .28), rgba(40, 28, 16, .12) 45%, transparent 70%)';
// A material that shows a picture exactly as it was drawn (premultiplied colour, no tone mapping, no colour-space
// change): for the small pictures things draw of themselves (the cloud), the way the cat's own picture is shown.
export function rawPicture(THREE, texture, extra = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: texture }, uOpacity: { value: 1 } }, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D map; uniform float uOpacity; varying vec2 vUv; void main() { gl_FragColor = texture2D(map, vUv) * uOpacity; }',
    ...extra,
  });
}
