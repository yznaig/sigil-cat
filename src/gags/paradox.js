// The buttered cat paradox (gag 1). A cat always lands on its feet. Toast always lands butter side down. So when a cat
// who is wearing butter becomes bread, the loaf straps to his back, butter side up, and he can do neither: he rises,
// hovers and turns, humming, for ten seconds. Then physics gives up and he drops.
// Trigger: the loaf sigil on a buttered cat (src/combos.js). (He no longer turns to bread by himself: e1111-58.)
// Not every time (PARADOX.again): otherwise a buttered cat could never be bread, and never blast off.
// Keepsake: a rejected physics paper on the floor, as a bad photocopy. Tap it to read the rejection.
import {cardService} from '../world/cards.js';
import {cardSheet} from '../world/card-sheet.js';
import { forPicture } from '../core/cat.js';
import { makeSplatMesh } from '../core/splats.js';
import { puff } from '../core/puff.js';
import { css, smooth, ease } from '../core/util.js';

export const PARADOX = {
  seconds: 10,           // how long he hovers and turns
  again: 0.25,           // after the first time on a visit, the chance a buttered bread is the paradox again
  rise: 0.24,            // how high he hovers, in cat-heights
  spin: 2.4,             // radians a second, once up to speed
  loaf: 0.6,             // the strapped loaf's length, in cat-heights
  // where the loaf sits on his back in each pose (his own space), and how far it leans back along it (radians)
  back: { sit: [0, 0.6, -0.3, -0.55], lie: [0.12, 0.6, -0.05, 0], sleep: [0.12, 0.5, -0.05, 0], stretch: [0.1, 0.6, -0.2, 0.3] },
  side: -1.5,            // the angle he is turned to for it: side-on, so the loaf on his back can be seen
  hum: { hz: 98, gain: 0.07 },
};

// Reading the paper: the sheet it was before it became a 3D card (unit 5), restored for Aaron (e1111-58: "The paper
// should be its older texture just 3d-ified and open the same way it did before, i liked it"). The card's own print
// is the same photocopy (src/world/card-print.js).
css('paradox', `
.paper-read .sheet { position: relative; background: #e9e7e1; color: #111; text-transform: none; letter-spacing: 0; font-stretch: normal; font-family: "Times New Roman", Times, serif; overflow: hidden; filter: contrast(1.35) grayscale(1); }
.paper-read .sheet::before { content: ""; position: absolute; inset: 0; pointer-events: none; mix-blend-mode: multiply; opacity: .5;
  background: linear-gradient(90deg, rgba(0, 0, 0, .55), transparent 5%, transparent 96%, rgba(0, 0, 0, .25)),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.1' numOctaves='2' seed='8'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -14 6.2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E"); }
.paper-read .sheet h2 { font: 700 1.25em/1.1 "Times New Roman", serif; margin: 0 0 .3em; text-align: center; }
.paper-read .sheet .by { text-align: center; font-style: italic; margin: 0 0 .7em; font-size: .85em; }
.paper-read .sheet p { margin: 0 0 .6em; text-align: justify; }
.paper-read .sheet .stamp { position: absolute; rotate: -17deg; border: .22em solid #111; padding: .1em .35em; font: 900 2.3em/1 Impact, "Arial Black", sans-serif; letter-spacing: .06em; opacity: .82; }
/* the page around it (src/world/card-sheet.js): one small (x) on its corner, a click outside or Escape (playtest 3) */
.paper-read { --sheet-width: 520px; }
.paper-read .sheet { overflow: auto; font-size: .9375rem; line-height: 1.4; padding: 34px 38px 30px; rotate: -1.2deg; box-shadow: 0 12px 30px rgba(40, 28, 16, .4); }
.paper-read .sheet .stamp { left: auto; right: 6%; top: 5%; font-size: 1.875rem; }
`);
const TITLE = 'On the Rotational Equilibrium of a Buttered Felid';
const LETTER = `<h2>${TITLE}</h2><p class="by">S. Cat, Dept. of Applied Loafing</p><span class="stamp">REJECTED</span>
<p>Dear Dr. Cat,</p>
<p>Thank you for sending us your manuscript, in which a cat (who lands on his feet) is fastened to a slice of buttered toast (which lands butter side down) and is reported to hover and turn without end.</p>
<p>Referee 1 notes that the apparatus hummed for ten seconds and then fell over, which is not without end. Referee 2 asks where the bread came from and was not satisfied by the answer &ldquo;I was the bread.&rdquo; Referee 3 was bitten.</p>
<p>We regret that we cannot publish. Please do not send more toast.</p>
<p>The Editors</p>`;

export default function createParadox(site) {
  const { stage, cat, audio, keepsakes, THREE } = site, P = PARADOX;
  audio.loadAll(['ding', 'box-thud', 'paper', 'slap', 'paradox-hum']);
  let active = false, seen = false, count = 0, rig = null;
  const ready = () => !!site.eggs.bread?.ready && !!cat.butter;
  const due = () => cat.butterOn && !active && ready() && !cat.hidden && !cat.standIn && !site.eggs.butterman?.running && (!seen || Math.random() < P.again);

  // The loaf, the strap and the butter on top: built once, drawn into his picture while it lasts.
  async function build() {
    if (rig) return rig;
    const stand = await site.eggs.bread.whenReady();
    const loaf = makeSplatMesh(stand.splat), k = P.loaf * cat.height / stand.size.x, c = stand.splat.box.getCenter(new THREE.Vector3());
    loaf.scale.setScalar(k); loaf.position.set(-c.x * k, -stand.splat.box.min.y * k, -c.z * k);
    const turned = new THREE.Group(); turned.add(loaf); turned.rotation.y = Math.PI / 2;       // its length runs down his back
    const group = new THREE.Group(); group.add(turned);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.017, 8, 40), forPicture(new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.8 })));
    const butter = new THREE.Mesh(cat.butterGeometry, cat.butter.material);
    butter.scale.setScalar(0.8); butter.position.set(0, stand.size.y * k + 0.012, 0); butter.rotation.y = 0.3;
    group.add(butter);
    return (rig = { group, loaf, strap, loafTop: stand.size.y * k });
  }
  let hum = null, humWanted = false;
  audio.load('paradox-hum').then(() => { if (humWanted) humOn(true); });
  function humOn(on) {
    humWanted = on;
    if (on && !hum) {
      hum = audio.loop('paradox-hum', { cross: .6 });
      hum?.gain(P.hum.gain * 4, .9);
    } else if (!on && hum) {
      hum.stop(.24); hum = null;
    }
  }

  async function start() {
    if (active || !ready()) return false;
    active = true; seen = true; count++;
    site.registry.find('paradox');
    const r = await build(), fx = cat.fx, calm = stage.reducedMotion, wasAuto = cat.auto;
    cat.auto = false;
    const m = cat.screenOf([0, cat.height * 0.45, 0]); puff(m.x, m.y, cat.rect.ppu * 0.9);
    audio.play('ding', { gain: 0.5 });
    // strap it on: the loaf on his back, butter side up; the butter leaves his head for the loaf
    const b = P.back[cat.shown] || P.back.sit;
    r.group.position.set(b[0], b[1], b[2]); r.group.rotation.x = b[3];
    r.strap.position.set(b[0], b[1] - 0.16, b[2] * 0.45); r.strap.rotation.set(b[3] * 0.5, 0, 0);     // round his middle and over the loaf
    cat.setYawTarget(P.side, 4);
    cat.spin.add(cat.inPicture(r.group)); cat.spin.add(cat.inPicture(r.strap));
    cat.setButter(false, 'quiet');
    cat.touch();
    await stage.after(0.5);
    // up, and round, humming
    humOn(true);
    await stage.tween(0.9, (u) => { fx.y = P.rise * ease.out(u); });
    let rot = 0, lastT = 0;
    await stage.tween(P.seconds, (u) => {
      const t = u * P.seconds, dt = t - lastT, speed = P.spin * smooth(t / 1.5) * (1 - smooth((t - (P.seconds - 1.6)) / 1.6));
      lastT = t;
      rot += (calm ? 0 : speed) * dt;
      fx.rot = calm ? Math.sin(t * 1.3) * 0.1 : rot;
      fx.y = P.rise + Math.sin(t * 2.1) * 0.015;
      hum?.gain(P.hum.gain * 4 * (0.75 + 0.25 * Math.sin(rot * 2)), .06);
    });
    humOn(false);
    // physics gives up: he comes level and drops
    const from = fx.rot, level = Math.round(from / (Math.PI * 2)) * Math.PI * 2;
    await stage.tween(0.35, (u) => { fx.rot = from + (level - from) * smooth(u); });
    fx.rot = 0;
    await stage.tween(0.28, (u) => { fx.y = P.rise * (1 - u * u); });
    fx.y = 0;
    audio.play('box-thud', { gain: 0.6 });
    cat.playEmote('startle', 'paradox');
    const m2 = cat.screenOf([0, cat.height * 0.45, 0]); puff(m2.x, m2.y, cat.rect.ppu * 0.8);
    cat.spin.remove(r.group); cat.spin.remove(r.strap);
    cat.setYawTarget(null);
    cat.setButter(true, 'slap'); audio.play('slap', { gain: 0.4 });
    cat.touch();
    cat.auto = wasAuto;
    active = false;
    if (!keepsakes.has('paper')) { audio.play('paper', { gain: 0.5 }); keepsakes.give('paper', { from: { x: m2.x + 40, y: stage.insets.top + 40 } }); }
    return true;
  }

  const cards=cardService(site);
  const transcript=document.createElement('div');transcript.innerHTML=LETTER.replaceAll('</p>','</p>\n').replaceAll('</h2>','</h2>\n');
  // the sheet, held up to read, as before unit 5; one small (x), a tap outside it or Esc puts it down (playtest 3)
  let reading = null;
  function read() {
    if (reading?.open) return;
    reading = cardSheet(site, { className: 'paper-read', sheetClass: 'sheet', label: 'The rejection letter', html: LETTER });
  }
  cards.define({id:'paper',label:'the rejected paper',size:.56,aspect:1.25,home:()=>({x:1.28,y:-.3}),tap:read,read},transcript.textContent);

  return { find: 'paradox', config: PARADOX, start, due, take: (by) => (due() ? (start(), true) : false), read,
    get active() { return active; }, get count() { return count; }, get reading() { return !!reading?.open; }, closeReading() { reading?.close(); }, again: () => start() };
}
