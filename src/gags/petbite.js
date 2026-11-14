// Pet, pet, bite (gag 8; no sigil). Stroke him up and down and a purr builds with the stroking. Keep on too long and
// he bites.
// After one bite the plaster and refusal to be petted stay until Forget everything.
// On touch screens a plaster rests by the controls and follows a held finger; the tin only rustles.
import { css, clamp } from '../core/util.js';
import {defineTin} from '../world/tin.js';
import {shelfService} from '../world/shelf.js';

export const PET = {
  stroke: 14,            // minimum px in a vertical pass; at most one stroke per pass
  purrPer: 0.2,          // how much each stroke adds to the purr (0-1)
  purrFade: 0.55,        // how fast the purr dies away once the stroking stops (per second)
  purrGain: 0.5,
  patience: 7,          // strokes before he bites
  twitchFrom: 0.6,       // the share of his patience gone when he starts to twitch
  // Each counted stroke: a short low burst of his purr (Aaron, e1111-58: "so the player knows they're actually doing
  // something"). A slice of the same purr recording, slowed a little, from a fresh place each time; it rides over the
  // building loop and is never closer than `gap` seconds to the last one.
  burst: { seconds: [0.32, 0.46], rate: [0.82, 0.92], gain: [0.55, 0.75], lowpass: 900, attack: 0.05, gap: 0.16 },
  // Leave him be and he calms down: his patience comes back (strokes per second) once the stroking has stopped for
  // calmAfter seconds. Without it a few strokes short of a bite left him twitching for the rest of the visit
  // (e1111-58: "The cat somehow got stuck shaking constantly").
  calmAfter: 1.5, calmRate: 2,
};
// The pointer with a plaster on: an arrow with a pink strip across it.
const CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 3v20l5-4.500 3.500 8 3.500-1.600-3.500-7.900H21z" fill="#fff" stroke="#121212" stroke-width="1.6" stroke-linejoin="round"/><g transform="rotate(-38 12 14)"><rect x="3" y="11" width="18" height="6.500" rx="3" fill="#f1c6a4" stroke="#b9805a" stroke-width=".8"/><rect x="9" y="11.600" width="6" height="5.300" fill="#f9e1cd"/><g fill="#b9805a"><circle cx="5.500" cy="13" r=".5"/><circle cx="5.500" cy="15.500" r=".5"/><circle cx="18.500" cy="13" r=".5"/><circle cx="18.500" cy="15.500" r=".5"/></g></g></svg>')}") 5 3, auto`;
css('petbite', `
html.plaster, html.plaster * { cursor: ${CURSOR} !important; }
.touch-plaster { display: none; position: fixed; left: 18px; bottom: 82px; width: 36px; height: 16px; pointer-events: none; z-index: 30; transform: rotate(-25deg); }
.touch-plaster.following { bottom: auto; transform: translate(-50%, -50%) rotate(-25deg); }
@media (pointer: coarse) { html.plaster .touch-plaster { display: block; } }
`);
export default function createPetBite(site) {
  const { stage, cat, audio, keepsakes, store, registry } = site, P = PET;
  audio.loadAll(['purr', 'bite', 'hiss', 'paper']);
  let purr = null, level = 0, shown = 0, annoy = 0, travel = 0, dir = 0, countedPass = false, lastStroke = -Infinity, bites = 0, strokes = 0, touch = false;

  let bitten = store.get('plaster') === true || !!store.get('found.bite');

  function stroke() {
    strokes++;
    lastStroke = stage.clock;
    if (bitten) return;
    level = Math.min(1, level + P.purrPer);
    annoy += 1;
    if (annoy >= P.patience) bite(); else purrBurst();
  }
  // One stroke's purr: a soft slice of the recording, low-passed, with its own little swell in and out.
  let lastBurst = -Infinity, burstFilter = null, lastOffset = -1, bursts = 0;
  const pick = ([a, b]) => a + Math.random() * (b - a);
  function purrBurst() {
    const B = P.burst, c = audio.context(), buf = audio.buffer('purr');
    if (!c || !buf || stage.clock - lastBurst < B.gap) return null;
    if (!burstFilter || burstFilter.context !== c) {
      burstFilter = c.createBiquadFilter(); burstFilter.type = 'lowpass'; burstFilter.frequency.value = B.lowpass; burstFilter.Q.value = 0.5;
      burstFilter.connect(audio.output());
    }
    const seconds = pick(B.seconds), rate = pick(B.rate), gain = pick(B.gain) * (0.85 + 0.3 * level);
    let offset;
    do offset = 0.2 + Math.random() * (buf.duration - seconds * rate - 0.4); while (Math.abs(offset - lastOffset) < 0.6 && buf.duration > 3);
    const s = audio.play('purr', { gain, rate, offset, duration: seconds * rate, fade: seconds * 0.45, dest: burstFilter });
    if (!s) return null;
    const at = c.currentTime;                                   // play() starts it now: swell in so it never clicks
    s.gain.gain.cancelScheduledValues(at); s.gain.gain.setValueAtTime(0, at); s.gain.gain.linearRampToValueAtTime(gain, at + B.attack);
    s.gain.gain.setValueAtTime(gain, at + seconds * 0.55); s.gain.gain.linearRampToValueAtTime(0.0001, at + seconds);
    lastBurst = stage.clock; lastOffset = offset; bursts++;
    return s;
  }
  cat.onDrag.push((kind, press, dx, dy) => {
    if (kind === 'start') { travel = 0; dir = 0; countedPass = false; }
    if (kind !== 'move' || !dy || Math.abs(dy) < Math.abs(dx) * 1.1 || cat.hidden || cat.standIn) return;
    touch = press.type === 'touch';
    const s = Math.sign(dy);
    if (s !== dir) { dir = s; travel = 0; countedPass = false; } // a turn at the top or bottom of a stroke
    if (countedPass) return;                                 // a long pass is still only one pet
    travel += Math.abs(dy);
    if (travel >= P.stroke) { countedPass = true; stroke(); }
  });
  stage.onFrame.push((dt) => {
    const idle = stage.clock - lastStroke > 0.35;
    if (idle) { level = Math.max(0, level - P.purrFade * dt); }
    if (annoy > 0 && stage.clock - lastStroke > P.calmAfter) annoy = Math.max(0, annoy - P.calmRate * dt);
    if (level > 0 && !purr && audio.context() && audio.buffer('purr')) purr = audio.loop('purr', { gain: 0, cross: 0.8 });
    if (purr && Math.abs(level - shown) > 0.01) { shown = level; purr.gain(level * level * P.purrGain, 0.25); }
    if (purr && level <= 0 && shown !== 0) { shown = 0; purr.gain(0, 0.3); }
    // the warning: he starts to twitch
    const k = clamp((annoy / P.patience - P.twitchFrom) / (1 - P.twitchFrom));
    const twitch = k > 0 && !stage.reducedMotion && !site.eggs.paradox?.active;
    if (twitch) cat.fx.rot = Math.sin(stage.clock * 46) * 0.022 * k;
    else if (twitching) cat.fx.rot = 0;
    twitching = twitch;
  });
  let twitching = false;

  const badge = document.createElement('span'); badge.className = 'touch-plaster';
  badge.setAttribute('role', 'img'); badge.setAttribute('aria-label', 'a plaster for a bitten finger');
  badge.innerHTML = '<svg viewBox="0 0 36 16" aria-hidden="true"><rect x="1" y="1" width="34" height="14" rx="7" fill="#f1c6a4" stroke="#b9805a"/><rect x="13" y="2" width="10" height="12" rx="2" fill="#f9e1cd"/><path d="M6 5h2m-2 6h2m20-6h2m-2 6h2" stroke="#b9805a"/></svg>';
  document.body.appendChild(badge);
  const park = () => { badge.style.left=''; badge.style.top=''; badge.classList.remove('following'); };
  const follow = e => { if(e.pointerType==='touch' && bitten && e.buttons) {badge.style.left=`${e.clientX}px`;badge.style.top=`${e.clientY-24}px`;badge.classList.add('following');} };
  addEventListener('pointerdown', follow); addEventListener('pointermove', follow);
  addEventListener('pointerup', park); addEventListener('pointercancel', park);
  function plaster(on) {
    // Once bitten, even the tin or another gag cannot remove it.
    on = bitten || on;
    document.documentElement.classList.toggle('plaster', on);
    store.set('plaster', !!on);
  }
  function bite() {
    if (bitten) return;
    bitten = true; bites++; annoy = 0; level = 0;
    if (purr) { shown = 0; purr.gain(0, 0.05); }
    audio.play('bite', { gain: 0.7 }); audio.play('hiss', { gain: 0.5, when: (audio.context()?.currentTime ?? 0) + 0.08 });
    cat.playEmote('startle', 'bite');
    registry.find('bite');
    if (touch) {                                                  // a finger: the page flinches
      if (!stage.reducedMotion) document.body.animate([{ translate: '0 0' }, { translate: '0 14px', offset: 0.2 }, { translate: '0 -4px', offset: 0.55 }, { translate: '0 0' }], { duration: 380, easing: 'ease-out' });
    }
    plaster(true);
    if (!keepsakes.has('tin')) stage.after(0.6).then(() => keepsakes.give('tin', { from: cat.screenOf([0, 0.5, 0]) }));
  }
  // Migrate anyone who already found the bite, including an expired old timer.
  if (bitten) plaster(true);

  defineTin(site);
  shelfService(site);

  return { find: 'bite', config: PET, stroke, bite, plaster,
    get purr() { return level; }, get twitching() { return twitching; }, get annoyance() { return annoy / P.patience; }, get bites() { return bites; }, get strokes() { return strokes; }, get bursts() { return bursts; }, purrBurst,
    get plastered() { return document.documentElement.classList.contains('plaster'); }, again: () => bite() };
}
