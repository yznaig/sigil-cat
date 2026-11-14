// 360 no-scope. One drag on the cat that turns him one full turn, all one way, then lets him stop: two seconds of
// 2014 montage parody (src/eggs/mlg.js: an air horn, three hitmarkers, pixel shades, a chip, a slammed caption) and a
// hop. The turn is measured from the press to the moment his coast dies down, so most of it comes from the flick.
// It leaves Aaron's selected AWP splat as a rigid keepsake (assets/splats/SOURCES.md). Tap it: a hitmarker.
// Aaron's own video for this egg is still to come (spec N3); it will replace or join the overlay here.
import { createNoScopeVideo as createMLG } from './noscope-video.js';
import { css } from '../core/util.js';

export const NOSCOPE = {
  minDeg: 330, maxDeg: 450,    // total turn that counts
  stopSpeed: 0.3,              // rad/s: below this the spin has "died down"
  reverseSlack: 0.08,          // rad of turning back (finger jitter) still allowed
  cooldown: 20,                // seconds
  rifle: { file: 'assets/splats/awp-1.spz' },
};
css('noscope', `
.hitmark { position: fixed; left: 0; top: 0; z-index: 6; pointer-events: none; width: 0; height: 0; }
.hitmark svg { position: absolute; left: -22px; top: -22px; width: 44px; height: 44px; }
`);

export default function createNoScope(site) {
  const { stage, cat, audio, keepsakes } = site;
  audio.loadAll(['airhorn', 'hit']);
  const mlg = createMLG(site);
  let rec = null, last = -Infinity, fired = 0;
  const log = [];
  // Direction comes from every drag move (a quick turn-back can happen inside one frame); the coast after release
  // only ever slows down, so it cannot reverse.
  cat.onDrag.push((kind, press, dx) => {
    if (kind === 'start') rec = { y0: cat.yaw, dir: 0, back: 0, released: false };
    if (!rec) return;
    if (kind === 'move' && press.moved && dx) {
      const s = Math.sign(dx), turn = Math.abs(dx) * cat.config.rotate.radiansPerPixel;
      if (!rec.dir) rec.dir = s; else if (s !== rec.dir) rec.back += turn;
    }
    if (kind === 'end') rec.released = true;
  });
  stage.onFrame.push(() => {
    if (!rec || !rec.released || Math.abs(cat.vel) >= NOSCOPE.stopSpeed) return;
    const deg = Math.abs(cat.yaw - rec.y0) * 180 / Math.PI, clean = rec.back <= NOSCOPE.reverseSlack;
    const hit = clean && deg >= NOSCOPE.minDeg && deg <= NOSCOPE.maxDeg && stage.clock - last > NOSCOPE.cooldown && !site.input.locked;
    log.push({ deg: Math.round(deg), clean, hit }); if (log.length > 10) log.shift();
    rec = null;
    if (hit) { last = stage.clock; fire(); }
  });
  // opts go to mlg.fire (e.g. { speed: 0.05 } to slow it down for a screenshot, { caption })
  function fire(opts = {}) {
    fired++;
    const h = cat.height, top = cat.screenOf([0, h, 0]), bot = cat.screenOf([0, 0, 0]), mid = cat.screenOf([0, h * 0.5, 0]), size = bot.y - top.y;
    cat.playEmote('hop', '360 no-scope');
    site.registry.find('noscope');
    const done = mlg.fire(mid.x, mid.y, { size, faceY: mid.y - 0.22 * size, ...opts });
    done.then(() => { if (!keepsakes.has('rifle')) keepsakes.give('rifle'); });
    return done;
  }

  // ---- the rifle ----
  keepsakes.define({
    id: 'rifle', label: 'the rifle', kind: 'gl', size: 1.0, aspect: 0.26, home: () => ({ x: -1.12, y: 0.22 }),
    object(_site, inst) { return site.worldProps.create('rifle',inst); },
    place() {},
    removed(inst) { site.worldProps.remove(inst); },
    tap(inst, e) {
      audio.play('hit', { gain: 0.6 });
      site.worldProps.tap(inst);
      const x = e ? e.clientX : inst.px.x, y = e ? e.clientY : inst.px.y - inst.h / 2;
      const m = document.createElement('div'); m.className = 'hitmark';
      const arm = (a, b, w, c) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sy]) => `<line x1="${sx * a}" y1="${sy * a}" x2="${sx * b}" y2="${sy * b}" stroke="${c}" stroke-width="${w}" stroke-linecap="square"/>`).join('');
      m.innerHTML = `<svg viewBox="-50 -50 100 100">${arm(15, 40, 13, '#121212')}${arm(15, 40, 5.5, '#eee')}</svg>`;
      m.style.transform = `translate(${x}px, ${y}px)`;
      document.body.appendChild(m);
      m.firstChild.animate([{ scale: 1.7, opacity: 1 }, { scale: 1, opacity: 1, offset: 0.25 }, { scale: 1, opacity: 0 }], { duration: 450, fill: 'both' }).onfinish = () => m.remove();
    },
  });

  stage.debugExtra.push(() => { const l = log[log.length - 1]; return `360     ${rec ? 'measuring ' + Math.round(Math.abs(cat.yaw - rec.y0) * 180 / Math.PI) + '°' : '-'}  last ${l ? l.deg + '°' + (l.clean ? '' : ' (reversed)') + (l.hit ? ' HIT' : '') : '-'}  fired ${fired}`; });
  return { find: 'noscope', fire, config: NOSCOPE, get log() { return [...log]; }, get fired() { return fired; }, get active() { return mlg.active; }, again: () => fire() };
}
