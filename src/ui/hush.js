// The page's chrome in the "Hush" look: the name at the top, the numbers top right, the row of marks, the message
// line, the sound control, "ask the butter" and the grimoire link. Messages arrive in his script (a made-up
// alphabet of small signs) and settle into words, letter by letter.
//   ui.say('new: the bolt')        a message (ms: how long it stays; plain: no script)
//   ui.caption(text | null)        a line held as long as the caller wants it (Butterman's lyrics)
//   ui.speak(text | [sentences])   the cat says it: a line above his head in his script; at each sentence he hops
//                                  as if pressed and bonks once (playtest-2). Returns a promise (true when said).
//   ui.runes(el, text, opts)       write `text` into `el` in his script and let it settle (the achievement reveal)
//   ui.holdLine(on)                the achievement reveal has the message line: says wait until it is done
//   ui.bonk()                      one more bonk; returns the milestone's title when this one reaches it
//   ui.setBonks(n)                 the count set outright (the #debug panel)
//   ui.rareBonk()                  one more rare bonk: the gold "N rare bonks" line above the count (e1111-43)
import { store } from '../core/store.js';
import * as audio from '../core/audio.js';

// His script: thirteen strokes and four marks make twenty-six signs.
const BASE = ['M4 6v8a4 4 0 0 0 8 0', 'M4 12h8a4 4 0 1 0-4 4', 'M3 7h9l-8 10h10', 'M3 18v-7a5 5 0 0 1 10 0v7', 'M3 6v6a5 5 0 0 0 10 0V6',
  'M12 7a6 6 0 1 0 1 8a3 3 0 1 0-5-2', 'M4 6v12M12 6v12M4 12h8', 'M12 7c-8-1-8 5-4 5s4 6-4 5', 'M4 8h8v8H4z', 'M8 5v13M3 9h10',
  'M2 12c3-6 5-6 7 0s4 6 6 0', 'M3 18l5-12 5 12', 'M8 7a5 5 0 1 0 .01 0'];
const MARK = ['', '<circle cx="8" cy="2.4" r="1.25"/>', '<circle cx="8" cy="22" r="1.25"/>', '<path d="M4 22h8"/>'];
export function sign(ch) {
  const i = ch.toLowerCase().charCodeAt(0) - 97;
  if (i < 0 || i > 25) return '';
  return `<svg viewBox="0 0 16 24" aria-hidden="true"><path d="${BASE[(i * 5) % 13]}"/>${MARK[(i < 13 ? 0 : 2) + (i % 2)]}</svg>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const markSvg = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
// Write `text` into `el` in his script; each sign settles into its letter, one after another. plain: the words at
// once. words: each word kept whole, so a long line wraps between words, never inside one. Returns the ms it takes.
export function writeRunes(el, text, { plain = false, words = false, delay = 520, step = 34 } = {}) {
  clearTimeout(el._runes);
  el.classList.add('runes'); el.classList.toggle('plain', !!plain);
  el.setAttribute('aria-label', text);
  const ch = (c) => (c === ' ' ? '<span class="ch">&nbsp;</span>' : `<span class="ch" aria-hidden="true">${sign(c)}<i>${esc(c)}</i></span>`);
  el.innerHTML = words ? String(text).split(' ').map((w) => `<span class="w">${[...w].map(ch).join('')}</span>`).join(' ') : [...String(text)].map(ch).join('');
  if (plain) return 0;
  // unlettered signs (punctuation, digits) show as themselves at once
  const chars = [...el.querySelectorAll('.ch')];
  chars.forEach((c) => { if (!c.querySelector('svg')) c.classList.add('done'); });
  let i = 0;
  const next = () => { if (i < chars.length) { chars[i++].classList.add('done'); el._runes = setTimeout(next, step); } };
  el._runes = setTimeout(next, delay);
  return delay + chars.length * step;
}
// The row of marks shows the sigils only (playtest-2: the 360 and the rest are achievements now, done again by doing
// them). Read by kind, so a find that stops being a sigil (the star, sky lane) leaves the row by itself.
export const BAR_KIND = 'sigil';
// The one find kept beside the row: the bird's controller, a round button that plays the game again.
export const BAR_BUTTONS = ['bird'];

export function createUI(site) {
  const { stage, config, registry } = site, $ = (id) => document.getElementById(id);
  const footer = $('footer'), sayEl = $('say'), marks = $('marks'), hintEl = $('hint'), bonksEl = $('bonks'), foundEl = $('found');
  const reduced = () => stage.reducedMotion;

  // the name: the four-character mark, traced from Aaron's picture (tools/art/trace-name.py)
  fetch(new URL('../../assets/art/name-mark.svg', import.meta.url)).then((r) => r.text()).then((svg) => { $('name').innerHTML = svg; }).catch(() => { $('name').textContent = 'Sigil Cat'; });

  // ---- numbers ----
  let count = Number(store.get('bonks', 0)) || 0;
  const showCount = () => { bonksEl.textContent = `${count} bonk${count === 1 ? '' : 's'}`; };
  // "N of M sigils" counts what the row shows: the sigils (playtest-2, item 4). Worded "sigils" (integration, text
  // lane's to-do) so it is not read as the grimoire's "of 18 found", which counts every find.
  const sigils = () => registry.FINDS.filter((f) => f.kind === BAR_KIND);
  const showFound = () => { const all = sigils(); foundEl.textContent = `${all.filter((f) => registry.has(f.id)).length} of ${all.length} sigils`; };
  showCount(); showFound();
  // rare bonks: a gold line above the bonk count, from the first one on
  const rareEl = $('rare'), tallyEl = $('tally');
  function showRare() {
    const n = Number(store.get('rareBonks', 0)) || 0;
    if (!rareEl) return;
    rareEl.hidden = n === 0; tallyEl?.classList.toggle('has-rare', n > 0);
    rareEl.textContent = `${n} rare bonk${n === 1 ? '' : 's'}`;
  }
  showRare();

  // ---- the row of marks: one place per sigil; a found one is a button that casts it again. After the row, the
  // controller (once found) as a round button that plays the bird game again. ----
  function drawMarks(fresh) {
    const mark = (f, cls = '') => `<li class="${[cls, f.id === fresh ? 'new' : ''].join(' ').trim()}"><button type="button" data-find="${f.id}" aria-label="${esc(f.name)}: do it again" title="${esc(f.name)}">${markSvg(f.d)}</button></li>`;
    marks.innerHTML = sigils().map((f) => (registry.has(f.id) ? mark(f) : '<li class="no" aria-label="not yet found"></li>')).join('')
      + BAR_BUTTONS.map((id) => registry.byId.get(id)).filter((f) => f && registry.has(f.id)).map((f) => mark(f, 'again')).join('');
    const again = marks.querySelector('li.again button');
    if (again) { again.setAttribute('aria-label', 'play the bird game again'); again.title = 'play again'; }
  }
  drawMarks();
  marks.addEventListener('click', (e) => { const b = e.target.closest('button[data-find]'); if (b) site.again?.(b.dataset.find); });
  registry.onFind((f, { quiet }) => {
    drawMarks(f.id); showFound();
    $('grimoire').hidden = false;
    if (!quiet) say(`new: ${f.name}`, { ms: 3600 });
  });
  if (registry.count()) $('grimoire').hidden = false;
  // links, once there are any (SITE.ui.links)
  for (const l of config.ui.links) { const a = document.createElement('a'); a.href = l.href; a.textContent = l.label; a.rel = 'noopener'; $('links').appendChild(a); }

  // ---- messages ----
  let sayTimer = 0, toasting = false, held = null, queued = null, lineHeld = false;
  const waiting = [];   // says that came while the achievement reveal had the line (played after it, in order)
  function write(text, plain) {
    writeRunes(sayEl, text, { plain: !!plain || reduced() });
    sayEl.classList.add('on');
  }
  function say(text, { ms = 3000, plain = false } = {}) {
    if (held !== null) { queued = { text, ms, plain }; return; }   // a held line (a lyric) is up: wait for it
    if (lineHeld) { if (waiting.length < 4) waiting.push({ text, ms, plain }); return; }
    write(text, plain); toasting = true;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      toasting = false; if (held === null) sayEl.classList.remove('on');
      if (waiting.length && !lineHeld) { const w = waiting.shift(); setTimeout(() => say(w.text, w), 250); }
    }, ms);
  }
  // The achievement reveal sits where the message line is (src/ui/achievements.js): while it shows, the line steps
  // aside and new messages wait; then they play in order.
  function holdLine(on) {
    lineHeld = !!on; sayEl.classList.toggle('yield', lineHeld);
    if (!lineHeld && waiting.length && !toasting && held === null) { const w = waiting.shift(); say(w.text, w); }
  }
  function caption(text) {
    if (text === held) return;
    held = text;
    if (text === null) {
      sayEl.classList.remove('on');
      if (queued) { const q = queued; queued = null; setTimeout(() => say(q.text, q), 250); }
      return;
    }
    clearTimeout(sayTimer); toasting = false;
    write(text, true);
  }

  // ---- the hint: on a first visit each part goes quiet as it is done ----
  const HINT = config.ui.hint.split(' · ');
  const hinted = store.get('hinted', {});
  hintEl.innerHTML = HINT.map((h, i) => `<span data-i="${i}">${esc(h)}</span>`).join(' · ');
  const allDone = () => HINT.every((_, i) => hinted[i]);
  hintEl.classList.toggle('first', !allDone());
  [...hintEl.children].forEach((el, i) => el.classList.toggle('done', !!hinted[i]));
  function hintDone(i) {
    if (hinted[i]) return;
    hinted[i] = 1; store.set('hinted', hinted);
    hintEl.children[i]?.classList.add('done');
    if (allDone()) setTimeout(() => hintEl.classList.remove('first'), 1500);
  }

  // ---- the sound control ----
  const soundBtn = $('sound'), vol = $('volume');
  audio.onChange(({ muted, volume }) => {
    soundBtn.innerHTML = `sound <b>${muted ? 'off' : 'on'}</b>`;
    soundBtn.setAttribute('aria-pressed', String(!muted));
    vol.value = String(Math.round(volume * 100)); vol.style.setProperty('--v', (muted ? 0 : volume * 100) + '%');
  });
  soundBtn.addEventListener('click', () => { audio.context(); audio.setMuted(!audio.state().muted); if (!audio.state().muted) audio.play('click', { gain: 0.4 }); });
  vol.addEventListener('input', () => { audio.context(); audio.setVolume(Number(vol.value) / 100); });
  vol.addEventListener('change', () => audio.play('click', { gain: 0.4 }));

  // ---- ask the butter: it never does the trick for you ----
  let hintIx = store.get('askIx', 0);
  $('ask').addEventListener('click', () => { say(config.ui.hints[hintIx++ % config.ui.hints.length], { ms: 4200 }); store.set('askIx', hintIx); });

  // ---- the cat speaks: a line above his head, in his script, settling into words (playtest-2, item 1) ----
  // One sentence at a time. At the start of each he hops as if pressed and the bonk plays once. The line is placed
  // once per sentence (no per-frame work), kept inside the page, wrapped between words and made smaller when it has
  // to be, so it always fits (phone landscape too).
  const SPEAK = config.ui.speech;
  const speechEl = $('speech');
  const speechQueue = [];
  let speaking = false, speechTimer = 0, speechLine = null, speechBonks = 0;
  function speak(text, opts = {}) {
    const lines = (Array.isArray(text) ? text : [text]).map((t) => String(t ?? '').trim()).filter(Boolean);
    if (!lines.length || !speechEl) return Promise.resolve(false);
    return new Promise((done) => { speechQueue.push({ lines, opts, done }); if (!speaking) nextSpeech(); });
  }
  const wait = (ms) => new Promise((r) => { speechTimer = setTimeout(r, ms); });
  async function nextSpeech() {
    const job = speechQueue.shift();
    if (!job) { speaking = false; return; }
    speaking = true;
    for (const line of job.lines) {
      speechLine = line;
      const calm = reduced(), { hop = true, sound = true } = job.opts;
      if (hop && !calm && site.cat?.loaded && !site.cat.hidden) site.cat.playEmote('hop', 'speech');
      if (sound && audio.play(SPEAK.sound, { gain: SPEAK.gain })) speechBonks++;
      const settle = writeRunes(speechEl, line, { plain: calm, words: true, delay: SPEAK.settleDelay, step: SPEAK.settleStep });
      placeSpeech();
      speechEl.classList.add('on');
      await wait(settle + (job.opts.ms ?? Math.max(SPEAK.minMs, SPEAK.baseMs + line.length * SPEAK.perChar)));
    }
    speechEl.classList.remove('on'); speechLine = null; document.body.classList.remove('speech-over-name');
    await wait(SPEAK.gapMs);
    job.done(true);
    nextSpeech();
  }
  // Above his head: his crown in the pose he is in (or landing in), plus a hat, so it clears his ears (a hop's peak
  // may brush it). Kept on the page and clear of the words at the top: never wider than the room between the small
  // label (left) and the numbers (right); under the name if it fits there at a step or two smaller, else over the
  // name, which steps aside while he talks (a short screen: phone landscape). Shrunk a step at a time, to minPx.
  function placeSpeech() {
    const c = site.cat, edge = SPEAK.edge, W = stage.width, H = stage.height;
    let x = W / 2, y = H * 0.3;
    if (c?.loaded) {
      const crown = config.cat.crown[c.landingPose?.() ?? c.pose] ?? [0, c.height * 0.9, 0];
      const p = c.screenOf([crown[0], crown[1] + (c.seatLift || 0) + SPEAK.above, crown[2]]);
      if (Number.isFinite(p.x) && Number.isFinite(p.y)) { x = p.x; y = p.y; }
    }
    const box = (el) => { const r = el?.getBoundingClientRect(); return r && r.width && r.height ? r : null; };
    // the words at the top: one beside his x narrows the line; one over it (the name; the numbers on a narrow
    // portrait page) is a ceiling
    const name = box($('name')), tops = [box(document.querySelector('.top .tl')), box($('tally'))].filter(Boolean);
    const above = tops.filter((r) => r.left <= x && r.right >= x), sides = tops.filter((r) => !above.includes(r));
    let room = W - edge * 2;
    for (const r of sides) room = Math.min(room, 2 * (r.left > x ? r.left - x : x - r.right) - 16);
    speechEl.style.maxWidth = Math.max(160, Math.min(SPEAK.maxWidth, room)) + 'px';
    const base = W <= 700 || H <= 560 ? SPEAK.px[1] : SPEAK.px[0];
    const fit = (top, smallest) => {
      for (let px = base; px >= smallest; px--) {
        speechEl.style.fontSize = px + 'px';
        const r = speechEl.getBoundingClientRect();
        if (y - r.height >= top) return r;
      }
      return null;
    };
    const under = Math.max(edge, ...[name, ...above].filter(Boolean).map((r) => r.bottom + 6));
    let r = fit(under, base - 2), over = false;
    const ceiling = Math.max(edge, ...above.map((r) => r.bottom + 6));
    if (!r) { over = !!name; r = fit(ceiling, SPEAK.minPx) || speechEl.getBoundingClientRect(); }
    const cx = Math.max(edge + r.width / 2, Math.min(W - edge - r.width / 2, x));
    speechEl.style.left = cx + 'px'; speechEl.style.top = Math.max(over ? ceiling : under, y - r.height) + 'px';
    document.body.classList.toggle('speech-over-name', over);
  }
  addEventListener('resize', () => { if (speechLine) placeSpeech(); });

  // ---- the first pickup: the cat tells you how to move it nearer or further (playtest-2, item 2), once ever ----
  // world-input.js sends 'sigilcat:pickup' when a held item first moves. The wheel: down brings it nearer, up sends it
  // back (WHEEL in world-input.js). On touch the Nearer / Deeper buttons do it; they show only there.
  addEventListener('sigilcat:pickup', (e) => {
    if (store.get('tips.pickup')) return;
    store.set('tips.pickup', Date.now());
    const touch = !!site.worldInput?.bar || e.detail?.pointerType === 'touch';
    speak(touch ? config.ui.pickupTip.touch : config.ui.pickupTip.wheel);
  });

  // ---- how much room the chrome takes (the cat is centred in what is left) ----
  function fit() {
    // short and wide (a phone on its side, shell lane playtest-2): the compact chrome at the end of hush.css
    const short = stage.height <= 500 && stage.width > stage.height, narrow = stage.width <= 700 && !short;
    const top = short ? 40 : narrow ? 76 : 56, r = footer.getBoundingClientRect();
    stage.setInsets(top, Math.ceil(Math.max(60, r.height - (narrow ? 0 : 8))));
  }
  new ResizeObserver(fit).observe(footer);
  addEventListener('resize', fit);
  fit();

  return {
    say, caption, hintDone, sign, drawMarks, fit, showRare, speak, holdLine, runes: writeRunes, placeSpeech,
    get speaking() { return speaking; }, get speechEl() { return speechEl; }, get speechBonks() { return speechBonks; },
    get lineFree() { return !toasting && held === null && !lineHeld; },
    rareBonk() {
      store.set('rareBonks', (Number(store.get('rareBonks', 0)) || 0) + 1); showRare();
      if (!reduced() && rareEl) { rareEl.classList.remove('again'); void rareEl.offsetWidth; rareEl.classList.add('again'); rareEl.animate([{ transform: 'translateY(-3px) scale(1.06)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.3,1.6,.5,1)' }); }
    },
    get toasting() { return toasting; }, get count() { return count; },
    bonk() {
      count++; store.set('bonks', count); showCount();
      bonksEl.classList.remove('tick'); void bonksEl.offsetWidth; bonksEl.classList.add('tick');
      // The milestone still spins him (src/main.js); its line is gone: the bonk achievements say it now (e1112-32).
      const title = config.counter.milestones[count];
      return title || null;
    },
    // fx lane, playtest 3 (the #debug panel only: Aaron, "changing bonk amounts ... set to zero, +1000, +1000000"): the
    // count set outright, saved like a bonk; the bonk achievements read it from the store as they always do.
    setBonks(n) { count = Math.max(0, Math.floor(Number(n) || 0)); store.set('bonks', count); showCount(); return count; },
  };
}
