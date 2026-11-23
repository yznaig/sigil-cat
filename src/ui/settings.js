// The settings screen (p8 settings lane, 2026-11-21). Aaron: "please just make a settings button that opens a settings
// screen so people can change the volume of different things individually like the music and sounds and cat sounds. and
// that can consolidate the usual sliders into one".
// One round felt button at the bottom left (where SOUND and the zoom used to be) opens a card in the books' look with:
//   sound (the master, with its on/off switch)   music   sound effects   cat sounds   zoom
// Each volume multiplies with the master (src/core/audio.js setLevel; the music's in src/core/music.js); all of it is
// remembered on this device in the store: 'sound.muted', 'sound.volume' and 'view.zoom' as before (so a returning
// player keeps what they had), plus 'sound.levels' { music, sfx, cat } (missing on an older save: all at full).
// Unlike the books it does not freeze the room: the zoom is seen as it moves, a sound effects or cat level is heard
// (a click or a trill) when the slider is let go, and the music, which plays through the books too, plays on so its
// slider is heard live. The room's input is locked while it is open (nothing behind the card takes a press or a key).
// Closes on its (x), Escape, a tap outside the card, and the phone's Back.
// During the galaxy and the 360 the master sound is still on screen as before (the footer's .sound, src/ui/hush.js).
//   site.settings.open()   site.settings.close()   site.settings.showing
import * as audio from '../core/audio.js';

const PREVIEW = { sfx: ['click', { gain: 0.4 }], cat: ['tap-mrrp', { gain: 0.4, bus: 'cat' }] };

export function createSettings(site) {
  const { stage, input } = site;
  const btn = document.getElementById('settings-btn'), pop = document.getElementById('settings');
  if (!btn || !pop) return null;
  const card = pop.querySelector('.settings-card');
  const master = pop.querySelector('#set-volume'), toggle = pop.querySelector('#set-sound');
  const sliders = [...pop.querySelectorAll('input[data-level]')];
  let showing = false, inertBefore = [], pushed = false, skipPop = 0;
  const calm = () => stage.reducedMotion;

  // ---- the controls ----
  const fill = (el, v) => { el.value = String(Math.round(v * 100)); el.style.setProperty('--v', v * 100 + '%'); el.setAttribute('aria-valuetext', Math.round(v * 100) + ' percent'); };
  audio.onChange(({ muted, volume, levels }) => {
    toggle.innerHTML = `<b>${muted ? 'off' : 'on'}</b>`;
    toggle.setAttribute('aria-pressed', String(!muted));
    fill(master, volume);
    for (const s of sliders) fill(s, levels[s.dataset.level]);
    card.classList.toggle('muted', muted);
  });
  toggle.addEventListener('click', () => { audio.context(); audio.setMuted(!audio.state().muted); if (!audio.state().muted) audio.play('click', { gain: 0.4 }); });
  master.addEventListener('input', () => { audio.context(); audio.setVolume(Number(master.value) / 100); });
  master.addEventListener('change', () => audio.play('click', { gain: 0.4 }));
  for (const s of sliders) {
    s.addEventListener('input', () => { audio.context(); audio.setLevel(s.dataset.level, Number(s.value) / 100); });
    const p = PREVIEW[s.dataset.level];
    if (p) s.addEventListener('change', () => audio.play(...p));
  }

  // ---- open and close ----
  function open() {
    if (showing || site.books?.showing || input.locked) return false;
    showing = true;
    inertBefore = [...document.body.children].filter((n) => n !== pop).map((n) => [n, n.inert]);
    for (const [n] of inertBefore) n.inert = true;
    input.lock('settings', true);
    pop.hidden = false; pop.setAttribute('aria-modal', 'true'); document.body.classList.add('settings-open');
    btn.setAttribute('aria-expanded', 'true');
    try { history.pushState({ ...(history.state || {}), sigilSettings: 1 }, ''); pushed = true; } catch { pushed = false; }
    card.focus({ preventScroll: true });
    pop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: calm() ? 140 : 180, easing: 'ease-out' });
    if (!calm()) card.animate([{ transform: 'translateY(12px) scale(.985)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1)' });
    return true;
  }
  function close(fromBack = false) {
    if (!showing) return false;
    showing = false;
    if (pushed) { pushed = false; if (!fromBack) { skipPop++; history.back(); } }
    for (const [n, v] of inertBefore) n.inert = v;
    inertBefore = [];
    pop.hidden = true; pop.removeAttribute('aria-modal'); document.body.classList.remove('settings-open');
    btn.setAttribute('aria-expanded', 'false');
    input.lock('settings', false);
    btn.focus({ preventScroll: true });
    return true;
  }

  btn.addEventListener('click', () => { audio.context(); open(); });
  pop.addEventListener('pointerdown', (e) => { pop.downOutside = e.target === pop; });
  pop.addEventListener('click', (e) => {
    if (e.target === pop && pop.downOutside) close();
    else if (e.target.closest?.('[data-close]')) close();
  });
  input.onEscape.push(() => { if (showing) close(); });
  // something else takes the page (a scene, a book): the card gets out of its way
  input.onLock.push((reason) => { if (reason !== 'settings' && showing) close(); });
  addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } if (showing) close(true); });
  // Tab stays inside the card (the page under it is inert anyway)
  pop.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = [...card.querySelectorAll('button, input')];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && (i === items.length - 1 || i < 0)) { e.preventDefault(); items[0].focus(); }
  });

  return { open, close, get showing() { return showing; }, element: pop, button: btn };
}
