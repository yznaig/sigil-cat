// The zoom (controls lane, playtest-4). Aaron: "It seems like everything could be a little bit bigger and tighter in on
// mobile ... Perhaps there could be a zoom slider alongside the sound slider? this could help with both desktop and
// mobile to customize their zoom and screen tightness".
// A slider (since the p8 settings lane, in the settings screen; it was a felt patch beside SOUND): the camera comes closer (stage.setZoom), so he, the room
// and every keepsake are drawn larger; the furniture still plans itself on the page (shelf top left, board top right,
// rack bottom left, bin bottom right, all inside the safe sides), and what ends up behind something scoots into view,
// the same rules as after a resize. A change re-plans once it settles (ZOOM.settle ms after the last move of the
// slider, and on its release), never per frame; nothing runs while it is idle.
// Remembered on this device (store 'view.zoom', wiped by the grimoire's start over like the sound's volume). Never set:
// the device's default (a phone a little tighter than the old framing). ?zoom=1.2 overrides it for a visit (checks).
export const ZOOM = {
  min: 0.85, max: 1.3, step: 0.05,
  phone: 1.1,      // a phone on its side (coarse pointer, short side <= 600 px): a little bigger and tighter than it was
  other: 1,        // desktop and tablets: the framing as it was
  settle: 140,     // ms after the slider's last move before the room re-plans
};
const isPhone = () => matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) <= 600;
const clamp = (z) => Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(z / 0.01) * 0.01));

export function createZoom(site) {
  const { stage, store } = site;
  const forced = Number(stage.opt('zoom')) || null;
  const deviceDefault = () => isPhone() ? ZOOM.phone : ZOOM.other;
  const current = () => { const z = forced ?? Number(store.get('view.zoom', NaN)); return Number.isFinite(z) ? clamp(z) : deviceDefault(); };

  // the slider: the zoom row of the settings screen (p8 settings lane; index.html #settings, src/ui/settings.js)
  const wrap = document.querySelector('#settings .set-zoom') || document.body.appendChild(document.createElement('span'));
  wrap.insertAdjacentHTML('beforeend', `<input type="range" id="zoom" min="${Math.round(ZOOM.min * 100)}" max="${Math.round(ZOOM.max * 100)}" step="${Math.round(ZOOM.step * 100)}" aria-label="Zoom">`);
  const input = wrap.querySelector('input');

  function show(z) {
    input.value = String(Math.round(z * 100));
    input.setAttribute('aria-valuetext', Math.round(z * 100) + ' percent');
    input.style.setProperty('--v', ((z - ZOOM.min) / (ZOOM.max - ZOOM.min) * 100) + '%');
  }
  let timer = 0;
  function apply() { clearTimeout(timer); timer = 0; stage.setZoom(clamp(Number(input.value) / 100)); }
  input.addEventListener('input', () => {
    show(clamp(Number(input.value) / 100));
    clearTimeout(timer); timer = setTimeout(apply, ZOOM.settle);
  });
  input.addEventListener('change', () => { const z = clamp(Number(input.value) / 100); store.set('view.zoom', z); apply(); });

  // A phone turned (or a window resized across the phone rule) keeps a remembered zoom; an unset one follows the device.
  addEventListener('resize', () => { const z = current(); if (z !== stage.zoom) { show(z); stage.setZoom(z); } });
  const z = current(); show(z); stage.setZoom(z);
  return {
    ZOOM, input, el: wrap,
    get value() { return stage.zoom; },
    get deviceDefault() { return deviceDefault(); },
    // set it as the slider does (checks, keyboard-less callers): shown, remembered, re-planned now
    set(v) { const z = clamp(v); show(z); store.set('view.zoom', z); apply(); return z; },
  };
}
