// Settings lane (p8, 2026-11-21). Aaron: "please just make a settings button that opens a settings screen so people can
// change the volume of different things individually like the music and sounds and cat sounds. and that can consolidate
// the usual sliders into one". Run with checks/lib.js, ?music=1, --then checks/settings-reload.js, at desktop and phone
// sizes (phone held upright with ?turn=0: a real phone upright gets "flip sideways").
//  1 the corner: one round settings button at the bottom left (upright: the footer's centred row, as SOUND was), a 44 px
//    target; no SOUND or zoom pill in the room
//  2 the button opens the card (real press), every control named, inside the screen, 44 px rows; screenshots
//  3 each slider moves its own gain only: music -> the music's control gain, sound effects -> the sfx bus, cat sounds ->
//    the cat bus; the master multiplies all three; the master's switch silences all three (and a clip on each bus)
//  4 the zoom slider zooms (the camera, re-planned)
//  5 it closes on its (x), on Escape and on a tap outside; the music is never held by it; focus comes back to the button
//  6 values left for the reload (checks/settings-reload.js)
//  7 (p8-final triage) a phone on its side keeps the footer height main had (room framing unchanged); under any other
//    lock the master SOUND pill is shown and mutes; Safari's bar colour follows the settings dim
cat.auto = false;
const show = (o) => JSON.stringify(o);
const centre = (el) => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
const owns = (el, p) => { const t = document.elementFromPoint(p.x, p.y); return t === el || el.contains(t); };
const CORNERS = [[-21.5, -21.5], [21.5, -21.5], [-21.5, 21.5], [21.5, 21.5], [0, 0]];
const reach44 = (el) => { const p = centre(el); return CORNERS.every(([x, y]) => owns(el, { x: p.x + x, y: p.y + y })); };
const what = (el) => { const p = centre(el); return CORNERS.map(([x, y]) => { const t = document.elementFromPoint(p.x + x, p.y + y); return t ? (t.id || String(t.className?.baseVal ?? t.className) || t.tagName) : null; }); };
const S = site.settings, M = site.music, btn = document.getElementById('settings-btn'), pop = document.getElementById('settings');
const tag = `${innerWidth}x${innerHeight}`;
const settle = () => sleep(160);                                   // setTargetAtTime: 15 ms time constant
const g = () => ({ master: audio.output().gain.value, sfx: audio.bus('sfx').gain.value, cat: audio.bus('cat').gain.value, music: M.control?.gain.value ?? null });
const near = (a, b, e = 0.02) => Math.abs(a - b) < e;
const slide = async (el, v) => { el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); await settle(); };
audio.setMuted(false); audio.setVolume(0.8); for (const k of audio.LEVELS) audio.setLevel(k, 1);
await until(() => !!M.control, 5000);

// ---- 1. the corner ----
await sleep(400);
{ const b = btn.getBoundingClientRect(), shownIn = [...document.querySelector('#footer .fl').children].filter((e) => e.getBoundingClientRect().width > 0);
  const sound = document.querySelector('#footer .sound'), zoomPill = document.querySelector('#footer .zoom');
  check(`settings ${tag} 1 one round button at the bottom left, nothing else in the corner`,
    b.width > 0 && (b.left < innerWidth / 3 || innerWidth < innerHeight) && b.bottom > innerHeight * 0.75 && Math.abs(b.width - b.height) < 1 && getComputedStyle(sound).display === 'none' && !zoomPill && btn.getAttribute('aria-label') === 'settings' && shownIn.length === 1 && shownIn[0] === btn,
    show({ btn: R(btn), soundDisplay: getComputedStyle(sound).display, zoomPill: !!zoomPill, shown: shownIn.map((e) => e.id || e.className) }));
  check(`settings ${tag} 1 the button is a 44 px target`, reach44(btn), show(R(btn))); }
await __shot('settings-closed');

// ---- 2. open with a real press ----
await __pointer([centre(btn)]); await sleep(400);
const card = pop.querySelector('.settings-card');
{ const ids = ['set-sound', 'set-volume', 'vol-music', 'vol-sfx', 'vol-cat', 'zoom'], els = ids.map((id) => document.getElementById(id));
  const named = els.every((el) => el && (el.labels?.length || el.getAttribute('aria-label')));
  const c = card.getBoundingClientRect(), inside = c.left >= 0 && c.top >= 0 && c.right <= innerWidth && c.bottom <= innerHeight;
  const rows = [...pop.querySelectorAll('.set-row')].map((r) => Math.round(r.getBoundingClientRect().height));
  const labels = [...pop.querySelectorAll('.set-row label')].map((l) => l.textContent.trim());
  check(`settings ${tag} 2 the button opens the settings screen, every control named and on screen`,
    S.showing && !pop.hidden && pop.getAttribute('aria-modal') === 'true' && btn.getAttribute('aria-expanded') === 'true' && named && inside && input.locked && card.scrollHeight <= card.clientHeight + 1,
    show({ showing: S.showing, card: R(card), labels, scroll: [card.scrollHeight, card.clientHeight] }));
  check(`settings ${tag} 2 the labels: sound, music, sound effects, cat sounds, zoom`, show(labels) === show(['sound', 'music', 'sound effects', 'cat sounds', 'zoom']), show(labels));
  const targets = [...els, pop.querySelector('[data-close]')].map((el) => ({ id: el.id || 'close', ok: reach44(el), r: R(el), at: what(el) }));
  check(`settings ${tag} 2 every control is a 44 px target`, targets.every((t) => t.ok) && rows.every((h) => h >= 44), show({ targets: targets.filter((t) => !t.ok), rows })); }
await __shot('settings-open');

// ---- 3. the volumes, on the real audio graph ----
{ const music = document.getElementById('vol-music'), sfx = document.getElementById('vol-sfx'), catv = document.getElementById('vol-cat'), master = document.getElementById('set-volume');
  const base = g();
  await slide(music, 30); const a = g();
  check(`settings ${tag} 3 music moves only the music (master x music)`, near(a.music, 0.8 * 0.3) && near(a.sfx, 1) && near(a.cat, 1) && near(a.master, 0.8) && near(audio.state().levels.music, 0.3), show({ base, a }));
  await slide(sfx, 55); const b = g();
  check(`settings ${tag} 3 sound effects move only the sfx bus`, near(b.sfx, 0.55) && near(b.cat, 1) && near(b.music, 0.24) && near(b.master, 0.8), show(b));
  await slide(catv, 20); const c = g();
  check(`settings ${tag} 3 cat sounds move only the cat bus`, near(c.cat, 0.2) && near(c.sfx, 0.55) && near(c.music, 0.24) && near(c.master, 0.8), show(c));
  // the clips go to the right bus: a trill, a purr, a hiss and bonking him on the cat bus; a thunder and a click on sfx
  const routes = {};
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) { if (dest === audio.bus('cat')) routes.last = 'cat'; else if (dest === audio.bus('sfx')) routes.last = 'sfx'; else if (dest === audio.output()) routes.last = 'master'; return orig.call(this, dest, ...rest); };
  const via = (f) => { routes.last = null; f(); return routes.last; };
  const split = { 'tap-mrrp': via(() => audio.play('tap-mrrp', { gain: 0.01 })), purr: via(() => audio.play('purr', { gain: 0.01, duration: 0.05 })), hiss: via(() => audio.play('hiss', { gain: 0.01 })),
    thunder: via(() => audio.play('thunder', { gain: 0.01 })), click: via(() => audio.play('click', { gain: 0.01 })), tone: via(() => audio.tone({ gain: 0.001, dur: 0.02 })),
    tapBonkBus: via(() => audio.play('tap-bonk', { gain: 0.01, bus: 'cat' })), tapBonkPlain: via(() => audio.play('tap-bonk', { gain: 0.01 })) };
  AudioNode.prototype.connect = orig;
  check(`settings ${tag} 3 his voice goes to the cat bus, everything else to the sfx bus`,
    split['tap-mrrp'] === 'cat' && split.purr === 'cat' && split.hiss === 'cat' && split.tapBonkBus === 'cat' && split.thunder === 'sfx' && split.click === 'sfx' && split.tone === 'sfx' && split.tapBonkPlain === 'sfx', show(split));
  await slide(master, 50); const d = g();
  check(`settings ${tag} 3 the master multiplies with each (music 0.5 x 0.3, buses under a master of 0.5)`, near(d.master, 0.5) && near(d.music, 0.15) && near(d.sfx, 0.55) && near(d.cat, 0.2), show(d));
  // the master's switch: all three silent, a clip on each bus unheard
  await __pointer([centre(document.getElementById('set-sound'))]); await settle();
  audio.play('thunder', { gain: 0.8 }); audio.play('tap-mrrp', { gain: 0.8 }); await sleep(250);
  const e = g(), lvl = audio.level(), ml = M.level();
  check(`settings ${tag} 3 the master switch silences music, sound effects and cat sounds`, audio.state().muted && e.master < 1e-3 && e.music < 1e-3 && lvl < 1e-6 && ml < 1e-6 && /off/i.test(document.getElementById('set-sound').textContent) && card.classList.contains('muted'),
    show({ e, page: lvl, music: ml, label: document.getElementById('set-sound').textContent }));
  await __shot('settings-muted');
  await __pointer([centre(document.getElementById('set-sound'))]); await settle();
  const f = g();
  check(`settings ${tag} 3 on again: each comes back to its own level`, !audio.state().muted && near(f.master, 0.5) && near(f.music, 0.15) && near(f.sfx, 0.55) && near(f.cat, 0.2), show(f));
  // a real drag on the music slider moves it live (the music is not held while the card is open)
  const mb = music.getBoundingClientRect(), before = Number(music.value);
  await __pointer([{ x: mb.x + mb.width * 0.3, y: mb.y + mb.height / 2 }, { x: mb.x + mb.width * 0.6, y: mb.y + mb.height / 2 }, { x: mb.x + mb.width * 0.9, y: mb.y + mb.height / 2 }]); await settle();
  const h = g();
  check(`settings ${tag} 3 dragging the music slider (real input) changes the music gain live, music not held`, Number(music.value) > before + 20 && near(h.music, 0.5 * Number(music.value) / 100) && !M.state.holds.length && S.showing, show({ before, after: music.value, h, holds: M.state.holds })); }

// ---- 4. the zoom ----
{ const Z = site.zoom, zin = document.getElementById('zoom'), z0 = stage.zoom;
  const target = z0 >= Z.ZOOM.max - 0.01 ? Z.ZOOM.min : Z.ZOOM.max;
  const zb = zin.getBoundingClientRect(), x = target > z0 ? zb.right - 2 : zb.left + 2;
  await __pointer([{ x: zb.x + zb.width / 2, y: zb.y + zb.height / 2 }, { x, y: zb.y + zb.height / 2 }]); await sleep(Z.ZOOM.settle + 400);
  check(`settings ${tag} 4 the zoom slider zooms (the camera follows, remembered)`, Math.abs(stage.zoom - target) < 1e-6 && Math.abs(store.get('view.zoom') - target) < 1e-6 && S.showing, show({ z0, target, now: stage.zoom, value: zin.value }));
  await __shot('settings-zoomed');
  Z.set(Z.ZOOM.max); await sleep(300); }

// ---- 5. closing ----
{ await __pointer([centre(pop.querySelector('[data-close]'))]); await sleep(250);
  const byX = !S.showing && pop.hidden && !input.locked && document.activeElement === btn && btn.getAttribute('aria-expanded') === 'false' && !pop.hasAttribute('aria-modal');
  btn.click(); await sleep(250); const again = S.showing;
  await __key('Escape'); await sleep(250); const byEsc = again && !S.showing;
  btn.click(); await sleep(250);
  const c = card.getBoundingClientRect(), outside = { x: Math.max(4, c.left / 2), y: Math.max(4, c.top / 2) };
  await __pointer([outside]); await sleep(250); const byOutside = !S.showing;
  btn.click(); await sleep(250);
  await __pointer([{ x: c.left + 30, y: c.top + 14 }]); await sleep(250); const insideStays = S.showing;    // the card itself does not close it
  S.close(); await sleep(200);
  check(`settings ${tag} 5 it closes on its (x), Escape and a tap outside (not a tap on the card); focus back on the button`, byX && byEsc && byOutside && insideStays && !input.locked && !document.body.classList.contains('settings-open'),
    show({ byX, byEsc, byOutside, insideStays, locked: input.locked })); }

// ---- 7. the triage round (p8-final): the footer keeps main's height, the master sound under any lock, Safari's bars ----
{ const fl = document.querySelector('#footer .fl'), short = innerHeight <= 500 && innerWidth > innerHeight;
  // a phone on its side: the left group is as tall as ZOOM stacked over SOUND was (28 + 6 + 28), so the room's framing
  // (stage.insets.bottom; 64 at 844x390 on main) is unchanged and a returning player's props are not fitted again
  const h = fl.getBoundingClientRect().height, want = tag === '844x390' ? 64 : null;
  check(`settings ${tag} 7 the footer is as tall as before the settings button (the room's framing unchanged)`,
    !short || (Math.abs(h - 62) < 0.5 && (want === null || stage.insets.bottom === want)), show({ short, fl: h, insetBottom: stage.insets.bottom }));
  // any other lock (the bread's blast-off, the bird's trailer): the button can't open, so the master pill is there, and works
  const sound = document.querySelector('#footer .sound'), mutedBefore = audio.state().muted;
  input.lock('check-lock', true); await sleep(120);
  const pill = sound.getBoundingClientRect(), pillAt = R(sound), shown = getComputedStyle(sound).display !== 'none' && pill.width > 0 && getComputedStyle(btn).display === 'none';
  const opened = S.open();
  await __pointer([centre(document.getElementById('sound'))]); await sleep(150);
  const toggled = audio.state().muted !== mutedBefore;
  await __pointer([centre(document.getElementById('sound'))]); await sleep(150);
  input.lock('check-lock', false); await sleep(120);
  const back = getComputedStyle(sound).display === 'none' && btn.getBoundingClientRect().width > 0;
  check(`settings ${tag} 7 while the page is locked the master sound is on screen and mutes (as SOUND always could)`, shown && !opened && toggled && back && audio.state().muted === mutedBefore,
    show({ shown, pill: pillAt, opened, toggled, back }));
  // Safari fills its bar strips with the root's colour (older Safari: the theme-color): the settings dim there too
  const meta = document.querySelector('meta[name="theme-color"]'), rootBg = () => getComputedStyle(document.documentElement).backgroundColor;
  const closedBg = rootBg();
  btn.click(); await sleep(250); const openBg = rootBg(), openMeta = meta.content;
  S.close(); await sleep(250); const shutBg = rootBg(), shutMeta = meta.content;
  check(`settings ${tag} 7 Safari's bars take the settings screen's dim while it is open, the paper again after`,
    openBg === 'rgb(207, 196, 187)' && openMeta === openBg && shutBg === closedBg && shutMeta === closedBg, show({ closedBg, openBg, openMeta, shutBg, shutMeta })); }

// ---- 6. left for the reload: master 0.5, music 0.6, sfx 0.55, cat 0.2, muted, zoom at its most ----
audio.setLevel('music', 0.6); audio.setMuted(true); store.flush();
check(`settings ${tag} 6 saved for the reload`, show(store.get('sound.levels')) === show({ music: 0.6, sfx: 0.55, cat: 0.2 }) && store.get('sound.muted') === true && near(store.get('sound.volume'), 0.5), show(store.get('sound')));
