// A quick cartoon puff: cream blobs burst outward from a point on the page, swell and fade in about a third of a
// second. It covers a swap (cat to bread and back, into the box, a hat landing). No shader, no picture: a few
// rounded divs moved by the browser.
import { css } from './util.js';

css('puff', `
.puff { position: fixed; left: 0; top: 0; width: 0; height: 0; z-index: 4; pointer-events: none; }
.puff i { position: absolute; left: 0; top: 0; border-radius: 50%; background: radial-gradient(circle at 38% 34%, #fffdf8, #f1e6d6 62%, #e3d3bd); translate: -50% -50%; }
`);

export function puff(x, y, size = 200, { count = 9, seconds = 0.36, color = null } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) seconds *= 0.7;
  const root = document.createElement('div'); root.className = 'puff'; root.setAttribute('aria-hidden', 'true');
  root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  const blob = (dx, dy, big, delay) => {
    const b = document.createElement('i');
    b.style.width = b.style.height = big.toFixed(1) + 'px';
    if (color) b.style.background = color;
    root.appendChild(b);
    b.animate([
      { transform: `translate(${(dx * 0.25).toFixed(1)}px, ${(dy * 0.25).toFixed(1)}px) scale(.25)`, opacity: 1 },
      { transform: `translate(${(dx * 0.85).toFixed(1)}px, ${(dy * 0.85).toFixed(1)}px) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(.65)`, opacity: 0 },
    ], { duration: seconds * 1000, delay: delay * 1000, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' });
  };
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4, reach = (0.32 + Math.random() * 0.12) * size;
    blob(Math.cos(a) * reach, Math.sin(a) * reach * 0.75, (0.3 + Math.random() * 0.1) * size, Math.random() * 0.05);
  }
  blob(0, 0, 0.62 * size, 0);
  document.body.appendChild(root);
  setTimeout(() => root.remove(), seconds * 1000 + 120);
}
