// Butter fling (gag 2). Spin a buttered cat fast, or cast the circle on him: the butter leaves his head, hits the
// inside of the screen and slides down it.
// What stays: a grease streak on the glass, which a finger (or the mouse, held down) wipes away, and the pat of butter
// waiting at the bottom. Drag the pat back onto him to butter him again.
import {createButter} from '../world/butter.js';
import { sponge } from './sponge.js';
import { css, clamp, ease } from '../core/util.js';

export const FLING = {
  speed: 9,              // rad/s he must be turning (the player's spin or the circle's)
  hold: 0.22,            // for this many seconds
  fly: 0.34,             // seconds from his head to the glass
  slide: 2.6,            // seconds sliding down
  width: 0.36,           // the streak's width, in cat-heights
  impactScale: 2.4,      // glass size relative to the resting pat
  impactSeconds: 0.22,
  impactSquash: 0.35,    // additional squash at the middle of the splat
  hitX: 0.12,            // viewport fraction either side of centre
  hitY: 0.40,            // viewport fraction down from the top
  flightScale: 0.5, flightArc: 30, // initial scale and arc height in CSS px
  wipe: 26,              // px: half the width a finger wipes
  gone: 0.78,            // the streak is gone once this much of it has been wiped
};

css('fling', `
.k-grease canvas { width: 100%; height: 100%; display: block; }
.flying-pat { position: fixed; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
`);

export default function createFling(site) {
  const { stage, cat, audio, keepsakes, store } = site, F = FLING;
  audio.loadAll(['splat', 'sponge-wipe', 'slap']);
  const butter=createButter(site);
  let fast = 0, busy = false, count = 0;

  stage.onFrame.push((dt) => {
    if (busy || !cat.butterOn || cat.hidden || site.eggs.butterman?.running || site.eggs.paradox?.active) { fast = 0; return; }
    fast = Math.abs(cat.yawRate) > F.speed ? fast + dt : 0;
    if (fast >= F.hold) fling();
  });

  async function fling() {
    if (busy) return false;
    busy = true; fast = 0; count++;
    await cat.ensureButter();
    site.registry.find('fling');
    const from = cat.screenOf([cat.seat.position.x, cat.seat.position.y + 0.04, cat.seat.position.z]);
    const existing=keepsakes.get('pat');if(existing){await existing.worldTask;site.supports.detach(existing.worldEntry,{wake:false});}
    cat.setButter(false, 'quiet');
    store.set('butterman.buttered', false);
    // It grows toward the viewer and hits the glass near the middle of the view.
    const side = Math.random() < 0.5 ? -1 : 1;
    const hit = { x: stage.width * (0.5 + side * F.hitX), y: stage.height * F.hitY };
    for (const id of ['grease']) if (keepsakes.has(id)) keepsakes.take(id);
    const bottom = keepsakes.floorY();                               // the page's one floor (src/core/keepsakes.js)
    const resting = keepsakes.get('pat')||keepsakes.give('pat', { at: keepsakes.toUnits(hit.x, bottom) });
    await resting.worldTask;resting.moveWorld({x:hit.x,y:bottom});
    // Reserve a clear floor landing among the existing solids. In particular, DOM art
    // paints above the GL pat, and its touch padding must not steal the butter drag.
    const half = resting.w / 2, margin = half + 12;
    const cy = resting.px.y - resting.h / 2;
    const blocked = [...keepsakes.live.values()].filter(i => i !== resting && !i.def.sky && !i.def.fixed)
      .filter(i => cy >= i.box.y - (i.def.pad ?? 6) && cy <= i.box.y + i.box.h + (i.def.pad ?? 6))
      .map(i => [i.box.x - (i.def.pad ?? 6) - half - 2, i.box.x + i.box.w + (i.def.pad ?? 6) + half + 2]);
    const candidates = [hit.x, margin, stage.width - margin, ...blocked.flat()]
      .filter(x => x >= margin && x <= stage.width - margin)
      .filter(x => blocked.every(([a,b]) => x <= a || x >= b))
      .sort((a,b) => Math.abs(a-hit.x) - Math.abs(b-hit.x));
    if (candidates.length) {
      const at = keepsakes.toUnits(candidates[0], resting.px.y); resting.moveTo(at.x, at.y);
    }
    butter.beginFlight(resting);
    resting.el.classList.remove('arrive');
    const pat = document.createElement('div'); pat.className='flying-pat'; document.body.appendChild(pat);
    const place = (x,y,sc,rot,sq=1,depth=0) => {
      resting.flight={x,y,sc,sq,rot,depth};
      resting.def.place(resting.object,resting);
      pat.style.transform=`translate(${x}px,${y}px)`;
    };
    await stage.tween(F.fly, k=>place(from.x+(hit.x-from.x)*k,from.y+(hit.y-from.y)*k-Math.sin(k*Math.PI)*F.flightArc,F.flightScale+(F.impactScale-F.flightScale)*ease.in(k),k*300*side));
    audio.play('splat', { gain: 0.7 });
    // flat against the glass for a moment, then down it, leaving grease
    const streak = keepsakes.give('grease', { at: { x: (resting.x + keepsakes.toUnits(hit.x, resting.px.y).x) / 2, y: resting.y }, state: { top: (resting.px.y - hit.y) / keepsakes.unit, offsetX: (hit.x-resting.px.x)/keepsakes.unit, wiped: 0, seed: Math.floor(Math.random() * 1e6) } });
    streak.el.classList.remove('arrive');
    streak.grow = 0; streak.redraw?.();
    await stage.tween(F.impactSeconds, (k) => place(hit.x, hit.y, F.impactScale, (300 + 74 * k) * side, 1 + F.impactSquash * Math.sin(k * Math.PI)));
    const squeak = audio.play('sponge-wipe', { gain: 0.12, rate: 0.65 });
    await stage.tween(F.slide, (k) => {
      // Discovery can grow the phone footer and reframe the page mid-flight.
      // Follow the live anchor, not the position captured before that layout change.
      const end = stage.toScreen(resting.flightLanding);
      const e = k * k * (3 - 2 * k), y = hit.y + (end.y - hit.y) * e;
      place(hit.x + (end.x-hit.x)*e + Math.sin(k * 9) * 3 * (1-e), y, F.impactScale + (1-F.impactScale) * e, 14 * side * (1 - e),1,e);
      streak.grow = e; streak.endPx = (resting.picture?.rect?.y ?? y - resting.h * (F.impactScale + (1-F.impactScale) * e) / 2) - streak.box.y; streak.redraw?.();
    });
    streak.endPx = null; streak.redraw?.();
    try { squeak?.stop(); } catch { /* done */ }
    pat.remove();
    butter.endFlight(resting);
    busy = false;
    return true;
  }

  // The streak: a tall thin canvas from where the pat hit down to the floor. Wiping rubs it out.
  keepsakes.define({
    id: 'grease', label: 'the grease streak', size: F.width, aspect: 1, fixed: true, layer: 'front', pad: 4,
    home: () => ({ x: 1.2, y: -0.4 }),
    make(elm, inst) {
      const cv = document.createElement('canvas'); elm.appendChild(cv);
      const g = cv.getContext('2d');
      const filmSize = F.width + Math.abs(inst.state.offsetX || 0);
      inst.def = { ...inst.def, size: filmSize, aspect: Math.max(1, (inst.state.top || 2) / filmSize) };     // as tall as the slide was
      inst.grow = 1; inst.erased = [];
      inst.redraw = () => {
        const W = Math.max(8, Math.round(inst.w || 40)), H = Math.max(8, Math.round(inst.h || 200));
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
        const filmW = W * F.width / filmSize, dx = W * (inst.state.offsetX || 0) / filmSize;
        // While the pat slides it is drawn larger than at rest, and the film (a page layer, over the GL pat) would run
        // into it: during the slide it stops at the top of the pat's drawn picture (inst.endPx, set by the slide; polish lane, playtest 3,
        // when the film became dense enough to show there).
        const len = Math.max(0,Math.min((H-filmW*.35)*(inst.grow ?? 1), inst.endPx ?? Infinity));
        // Thin butter transmits the page colour. Feather the edges and leave narrow wet ridges,
        // rather than giving the smear the opaque silhouette of a second pat.
        // Polish lane (playtest 3, Aaron: "The butter streak from flinging the butter needs to be less see-through, so
        // it's a bit more blaring on the screen"): the film about three times as dense (its peak .25 -> .72) and a
        // deeper butter yellow, the ridges brighter; the edges still feather out to nothing.
        let seed=inst.state.seed||7; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
        for(let y=0;y<len;y++) {
          const cap=Math.min(1,Math.sqrt(y/Math.max(1,filmW*.22)));
          const width=filmW*(.72+.045*Math.sin(y*.031)+.018*Math.sin(y*.19))*cap;
          const centre=W/2+dx*(.5-y/H);
          const left=centre-width/2+Math.sin(y*.025)*filmW*.025;
          const gr=g.createLinearGradient(left,0,left+width,0);
          gr.addColorStop(0,'rgba(238,196,82,0)');gr.addColorStop(.12,'rgba(238,196,82,.42)');
          gr.addColorStop(.38,'rgba(248,220,128,.72)');gr.addColorStop(.78,'rgba(238,196,82,.55)');gr.addColorStop(1,'rgba(238,196,82,0)');
          g.fillStyle=gr;g.fillRect(left,y,width,1);
          for(let j=0;j<4;j++) {const x=centre+filmW*(-.23+j*.14)+Math.sin(y*.018+j)*1.2;g.fillStyle=`rgba(255,248,215,${(.14+rnd()*.14)*(1-y/H*.5)})`;g.fillRect(x,y,.7,1);}
        }
        g.globalCompositeOperation = 'destination-out';
        for (const e of inst.erased) { g.beginPath(); g.arc(e[0] * W, e[1] * H, F.wipe, 0, 7); g.fill(); }
      };
      requestAnimationFrame(() => inst.redraw());
    },
    frame(inst) { if (inst.w && inst.canvasW !== Math.round(inst.w)) { inst.canvasW = Math.round(inst.w); inst.redraw(); } },
    removed(inst) { inst.finishWipe?.(); },
    // wiping: every move under the press rubs out a disc; enough of them and the streak is gone
    press(inst, e) {
      let last = 0, previous=e, sound=null;
      const tool=sponge(); inst.sponge=tool;
      const stop=()=>{ if(sound) { const c=audio.context(); sound.gain.gain.setTargetAtTime(0,c.currentTime,.025); sound.stop(c.currentTime+.12); sound=null; } };
      const finish=()=>{tool.hide();stop();};
      inst.finishWipe=finish;
      const rub = (ev) => {
        if(!keepsakes.has('grease')) return;
        tool.move(ev);
        const speed=Math.min(1,Math.hypot(ev.clientX-previous.clientX,ev.clientY-previous.clientY)/Math.max(1,ev.timeStamp-previous.timeStamp)); previous=ev;
        const b = inst.box, x = (ev.clientX - b.x) / b.w, y = (ev.clientY - b.y) / b.h;
        if (x < -0.5 || x > 1.5 || y < -0.05 || y > 1.05) return;
        inst.erased.push([x, y]); inst.redraw();
        if (speed>0.01 && ev.timeStamp-last>130) { last=ev.timeStamp; stop(); sound=audio.play('sponge-wipe',{gain:.07+.13*speed,rate:.7+.5*speed}); }
        // how much is gone: the share of the streak's length that has a rub near it
        const rows = new Set(inst.erased.map((p) => Math.round(clamp(p[1]) * b.h / (F.wipe * 1.2))));
        const wiped = rows.size / Math.max(1, Math.ceil(b.h / (F.wipe * 1.2)));
        inst.state.wiped = wiped;
        if (wiped >= F.gone) keepsakes.take('grease');
      };
      rub(e);
      return { move: rub, end() { finish(); if (keepsakes.has('grease')) inst.setState({ wiped: inst.state.wiped }); } };
    },
  });
  const putBack=()=>butter.putBack();

  return { find: 'fling', config: FLING, fling, putBack, butter, get busy() { return busy; }, get count() { return count; },
    again: () => { if (cat.butterOn) site.cast('circle'); else if (keepsakes.has('pat')) putBack(); } };
}
