// Pet, pet, bite (gag 8; no sigil). Stroke him up and down and a purr builds with the stroking. Keep on too long and
// he bites.
// After one bite the plaster and refusal to be petted stay until Forget everything.
// The plaster is the mouse pointer's (a plaster on the arrow); on a touch screen there is none at all (touchfeel lane,
// playtest 4, Aaron: "If youre on mobile, there should be no bandaid for when you drag your finger around"; the old
// resting/following finger plaster is gone). The tin only rustles.
import { css, clamp } from '../core/util.js';
import {defineTin} from '../world/tin.js';
import {shelfService} from '../world/shelf.js';

export const PET = {
  stroke: 14,            // minimum px in a vertical pass; at most one stroke per pass
  purrPer: 0.2,          // how much each stroke adds to the purr (0-1)
  // how fast the purr dies away once the stroking stops (per second). Touchfeel lane, playtest 4 (Aaron: "purr sound
  // should be about double as long"): halved from .55, so the purr rings on twice as long after the last stroke.
  purrFade: 0.275,
  purrGain: 0.5,
  patience: 7,          // strokes before he bites
  twitchFrom: 0.6,       // the share of his patience gone when he starts to twitch
  // Each counted stroke: a short low burst of his purr (Aaron, e1111-58: "so the player knows they're actually doing
  // something"). A slice of the same purr recording, slowed a little, from a fresh place each time; it rides over the
  // building loop and is never closer than `gap` seconds to the last one.
  // Playtest 4: each burst is twice as long (was 0.32-0.46 s): one unbroken slice of the same 7 s recording, so there
  // is no seam to hear; its swell in and out scales with it.
  burst: { seconds: [0.64, 0.92], rate: [0.82, 0.92], gain: [0.55, 0.75], lowpass: 900, attack: 0.05, gap: 0.16 },
  // The purr on a phone (touchfeel lane, playtest 4: "I didnt hear him purring when I pet him on mobile"). The strokes
  // counted and the bursts played on a phone; nothing was heard because the recording is all rumble: 99.8% of its
  // energy is under 300 Hz (most of it 50-100 Hz), where a phone's speaker gives nothing. Above 300 Hz it sat at
  // -53 dBFS against about -28 for every other sound. On a coarse-pointer device the same recording gets its own
  // overtones added (a soft clip of it, kept to `band` Hz, mixed in at `mix` of its level): the ear hears the purr's
  // 27-a-second pulse from those (the "missing fundamental"), so it is the same purr, now about +21 dB in the band a
  // phone plays (-32 dBFS). Desktop keeps the recording untouched.
  phone: { drive: 6, band: [260, 1400], mix: 1 },
  // Leave him be and he calms down: his patience comes back (strokes per second) once the stroking has stopped for
  // calmAfter seconds. Without it a few strokes short of a bite left him twitching for the rest of the visit
  // (e1111-58: "The cat somehow got stuck shaking constantly").
  calmAfter: 1.5, calmRate: 2,
};
// The pointer with a plaster on: an arrow with a pink strip across it.
const CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M5 3v20l5-4.500 3.500 8 3.500-1.600-3.500-7.900H21z" fill="#fff" stroke="#121212" stroke-width="1.6" stroke-linejoin="round"/><g transform="rotate(-38 12 14)"><rect x="3" y="11" width="18" height="6.500" rx="3" fill="#f1c6a4" stroke="#b9805a" stroke-width=".8"/><rect x="9" y="11.600" width="6" height="5.300" fill="#f9e1cd"/><g fill="#b9805a"><circle cx="5.500" cy="13" r=".5"/><circle cx="5.500" cy="15.500" r=".5"/><circle cx="18.500" cy="13" r=".5"/><circle cx="18.500" cy="15.500" r=".5"/></g></g></svg>')}") 5 3, auto`;
css('petbite', `
html.plaster, html.plaster * { cursor: ${CURSOR} !important; }
`);
export default function createPetBite(site) {
  const { stage, cat, audio, keepsakes, store, registry } = site, P = PET;
  audio.loadAll(['purr', 'bite', 'hiss', 'paper']);
  // A phone's speaker: the purr with its overtones (PET.phone, phoneVoice below), under the same name, so the loop, the
  // bursts and anything else that plays 'purr' all get it.
  const phone = matchMedia('(pointer: coarse)').matches;
  if (phone) audio.reshape('purr', (ch, rate) => ch.map((d) => phoneVoice(d, rate)));
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
      burstFilter.connect(audio.bus('cat'));   // his voice: the settings screen's cat volume
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
    audio.play('bite', { gain: 0.7, bus: 'cat' }); audio.play('hiss', { gain: 0.5, when: (audio.context()?.currentTime ?? 0) + 0.08 });
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

  return { find: 'bite', config: PET, stroke, bite, plaster, voice: phone ? 'phone' : 'recording',
    get purr() { return level; }, get twitching() { return twitching; }, get annoyance() { return annoy / P.patience; }, get bites() { return bites; }, get strokes() { return strokes; }, get bursts() { return bursts; }, purrBurst,
    get plastered() { return document.documentElement.classList.contains('plaster'); }, again: () => bite() };
}

// The purr's overtones for a phone speaker (PET.phone): a soft clip of the recording (its peak at `drive`) makes
// harmonics of the 50-100 Hz rumble, a 4th-order band of `band` Hz keeps the ones a small speaker plays (260 Hz up,
// nothing buzzy past 1.4 kHz), and they are mixed under the untouched recording at `mix` of its RMS. The pulse rate
// (37 ms apart, as recorded) is unchanged. Runs once on the decoded clip (7 s: a few ms).
export function phoneVoice(x, rate, { drive, band, mix } = PET.phone) {
  const biquad = (d, type, f0, Q) => {
    const w = 2 * Math.PI * f0 / rate, c = Math.cos(w), a = Math.sin(w) / (2 * Q), k = type === 'hp' ? (1 + c) / 2 : (1 - c) / 2;
    const b0 = k, b1 = type === 'hp' ? -2 * k : 2 * k, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < d.length; i++) { const v = d[i], y = (b0 * v + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = v; y2 = y1; y1 = y; d[i] = y; }
    return d;
  };
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  if (!peak) return x;
  const h = Float32Array.from(x, (v) => Math.tanh(drive * v / peak));
  for (const Q of [0.5412, 1.3066]) { biquad(h, 'hp', band[0], Q); biquad(h, 'lp', band[1], Q); }   // Butterworth pairs
  const rms = (d) => Math.sqrt(d.reduce((s, v) => s + v * v, 0) / d.length), g = mix * rms(x) / (rms(h) || 1);
  return Float32Array.from(x, (v, i) => v + g * h[i]);
}
