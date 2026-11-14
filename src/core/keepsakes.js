// Keepsakes: what the eggs leave behind. Each one stays on the page (remembered on the device), can be dragged to
// arrange the page, and does something when tapped. A keepsake is defined once (keepsakes.define) by the egg or gag
// that gives it, and given once (keepsakes.give); after a reload the saved ones come back where they were left.
//
// Where they are: positions are kept in cat-heights from the spot on the floor under him (x right, y up), so a page
// arranged on a desktop still makes sense on a phone. All solids share one floor and sit in front of him; sky
// keepsakes stay behind. kind 'gl' definitions retain their authored model; physics only lifts them in screen space.
//
// define({ id, label, size (width in cat-heights), aspect (height / width), home: (site) => ({ x, y }),
//          anchor: 'base' | 'center', layer: 'auto' | 'front' | 'back', kind: 'dom' | 'gl', sky: true (lives up in the air),
//          make(el, inst), tap(inst, e), dropped(inst), frame(inst, dt), object(site) and place(obj, inst) for 'gl' })
import { store } from './store.js';
import {impactSound,contactSound} from './world-impact.js';

export function createKeepsakes(site) {
  const { stage, cat, input } = site;
  const defs = new Map(), live = new Map(), listeners = [];
  const back = document.getElementById('back'), front = document.getElementById('front'), keys = document.getElementById('keepsake-keys');
  const feet = { x: 0, y: 0 }, origin = new stage.THREE.Vector3(0, 0, 0);
  let u = 100, order = 0;
  const moving = new Set();
  const physics = { active: 0, steps: 0, listening: false };
  const exempt = (i) => i.def.sky || i.def.fixed || (i.id === 'eyes' && i.state.on);
  // Material behaviour, not a mass solver: gravity is shared; paper has air resistance.
  const materials = {
    top:      { bounce: .18, squash: .03 },
    tin:      { bounce: .10, squash: .025 },
    eyes:     { bounce: .16, squash: .04 },
    box:      { bounce: .05, squash: .12 },
    rack:     { bounce: .03, squash: .02, rock: .045 },
    rifle:    { bounce: .04, squash: 0, slide: .22 },
    crumbs:   { bounce: .06, squash: .06, scatter: .08 },
    shards:   { bounce: .04, squash: 0, scatter: .06 },
    paper:    { bounce: 0, squash: .02, flutter: .16, terminal: 460, lean: -.12 },
    postcard: { bounce: .02, squash: .03, flutter: .10, terminal: 600, lean: .10 },
    ticket:   { bounce: 0, squash: .02, flutter: .20, terminal: 400, lean: -.08 },
    pat:      { bounce: 0, squash: .20 },
    puddle:   { bounce: 0, squash: 0 },
  };
  const material = (i) => materials[i.id] || materials.top;
  // The one ground line, shared by every object, follows the layout (12 px below his projected feet).
  const floorY = () => site.worldLayout.floorY();
  const angleOf = (i) => exempt(i) ? 0 : (i.angle || 0);
  const scaleFor = (d) => d.sky || d.fixed ? 1 : Math.min(1, stage.width / 600);
  const widthOf = (d) => d.size * u * scaleFor(d);
  function extent(i) {
    const w = widthOf(i.def), h = w * (i.def.aspect ?? 1), a = angleOf(i);
    const sx = i.sx || 1, sy = i.sy || 1;
    return { w: Math.abs(Math.cos(a)) * w * sx + Math.abs(Math.sin(a)) * h * sy,
      h: Math.abs(Math.sin(a)) * w * sx + Math.abs(Math.cos(a)) * h * sy };
  }
  const groundAnchor = (i) => (i.autoHome ? collectionHome(i.id)?.y ?? floorY() : floorY()) - (i.def.anchor === 'center' ? extent(i).h / 2 : 0);
  function stop(i) {
    moving.delete(i); physics.active = moving.size;
    if (!moving.size && physics.listening) {
      stage.onFrame.splice(stage.onFrame.indexOf(stepPhysics), 1); physics.listening = false;
    }
  }
  function land(i) {
    if(i.physical){save(i);return;}
    stop(i); i.resting = true; i.contact = null; i.angle = material(i).lean || 0; i.sx = i.sy = 1;
    i.y = toUnits(0, groundAnchor(i)).y;
    constrain(i); place(i); scatter(i, material(i).scatter); save(i);
  }
  function release(i, vx = 0, vy = 0) {
    stop(i);
    if (!live.has(i.id) || exempt(i)) { if (live.has(i.id)) save(i); return; }
    i.resting = false; i.vx = vx; i.vy = vy; i.age = 0; i.bounced = false; i.contact = null;
    i.angle = 0; i.sx = i.sy = 1;
    // Drops under the floor, cancelled touches and near-floor drops simply set down.
    if (stage.reducedMotion || groundAnchor(i) - toPx(i.x, i.y).y < 8) { land(i); return; }
    moving.add(i); physics.active = moving.size;
    if (!physics.listening) { stage.onFrame.push(stepPhysics); physics.listening = true; }
    save(i);
  }
  function stepPhysics(dt) {
    physics.steps++;
    for (const i of moving) {
      if (exempt(i) || i.held) { stop(i); continue; }
      const m = material(i); i.age += dt;
      if (stage.reducedMotion || i.age > 3) { land(i); continue; }
      for (let left = Math.min(dt, .1); left > 0;) {
        const h = Math.min(left, 1 / 120); left -= h;
        if (i.contact !== null) {
          i.contact += h;
          const t = Math.min(1, i.contact / .24), wave = Math.sin(t * Math.PI) * (1 - t);
          i.sx = 1 + m.squash * wave; i.sy = 1 - m.squash * wave;
          i.angle = (m.lean || 0) * t + (m.rock || 0) * Math.sin(t * Math.PI * 3) * (1 - t);
          i.vx *= Math.exp(-18 * h); i.x += i.vx * h / u;
          i.y = toUnits(0, groundAnchor(i)).y;
          if (t === 1) { land(i); break; }
        } else {
          i.angle = (m.flutter || 0) * Math.sin(i.age * 13);
          i.vy = Math.min(m.terminal || 1600, i.vy + 1800 * h); i.vx *= Math.exp(-2.5 * h);
          i.x += i.vx * h / u; i.y -= i.vy * h / u;
          if (toPx(i.x, i.y).y >= groundAnchor(i)) {
            contactSound(site.audio,i,i.impactSound,i.vy/stage.pxPerUnit(origin));
            i.y = toUnits(0, groundAnchor(i)).y;
            const rebound = Math.min(85, i.vy * m.bounce);
            if (!i.bounced && rebound > 18) { i.vy = -rebound; i.bounced = true; }
            else { i.contact = 0; i.vx *= m.slide || 0; scatter(i, m.scatter); }
          }
        }
        constrain(i);
      }
      if (moving.has(i)) { place(i); save(i); }
    }
  }
  function scatter(i, amount = 0) {
    // The pieces keep their authored arrangement; a small local fan is repeatable and saved by rest pose.
    if (!amount) return;
    [...(i.id === 'shards' ? i.el.querySelectorAll('polygon, path') : i.el.children)].forEach((piece, n) => {
      piece.style.translate = `${((n % 3) - 1) * amount * i.w}px 0`;
    });
  }
  function constrain(i) {
    const bounds = extent(i), x = toPx(i.x, i.y).x;
    const half = Math.min(stage.width / 2, bounds.w / 2 + 12);
    const next = Math.max(half, Math.min(stage.width - half, x));
    if (next !== x) i.vx = -(i.vx || 0) * .15;
    i.x = toUnits(next, 0).x;
    const topOffset = i.def.anchor === 'center' ? bounds.h / 2 : bounds.h;
    if (toPx(i.x, i.y).y < topOffset + 12) {
      i.y = toUnits(0, topOffset + 12).y; i.vy = Math.max(0, i.vy || 0);
    }
  }

  function measure() { stage.toScreen(origin, feet); u = stage.pxPerUnit(origin); }
  const toPx = (x, y) => ({ x: feet.x + x * u, y: feet.y - y * u });
  const toUnits = (px, py) => ({ x: (px - feet.x) / u, y: (feet.y - py) / u });
  // keep it on the page: its middle never leaves the screen, and it stays clear of the bottom row of controls
  function clampUnits(def, p) {
    const m = 12, w = widthOf(def), h = w * (def.aspect ?? 1);
    const px = Math.min(stage.width - m - w * 0.5, Math.max(m + w * 0.5, feet.x + p.x * u));
    const top = def.anchor === 'center' ? h / 2 : h, py = Math.min(stage.height - stage.insets.bottom + 26, Math.max(m + top, feet.y - p.y * u));
    return toUnits(px, py);
  }

  // Fixed furniture never restores coordinates. This is also used before its first paint.
  function fixedHome(def) {
    const p = site.worldLayout.furniture()[def.id];
    return p ? clampUnits(def, toUnits(p.x, p.y)) : null;
  }
  // Reserved homes are independent of unlock order. Depth rows keep each silhouette clear.
  function collectionHome(id) {
    const sizes = [['rifle',1,.26],['top',.3,1],['pat',.2,.55],['ticket',.4,.45],
      ['tin',.34,.7],['postcard',.44,.667],['paper',.36,1.25],['box',.84,.74]];
    const gap = 10, left = Math.max(42, stage.width*.08) + .42*u/2 + 22;
    let x=left, bottom=Math.min(floorY()+60,stage.height-stage.insets.bottom-28), rowHeight=0;
    for (const [key,size,aspect] of sizes) {
      const w=size*u*Math.min(1,stage.width/600), h=w*aspect;
      const lean=materials[key]?.lean||0;
      const bw=Math.abs(Math.cos(lean))*w+Math.abs(Math.sin(lean))*h;
      const bh=Math.abs(Math.sin(lean))*w+Math.abs(Math.cos(lean))*h;
      if(x+bw>stage.width-12&&x>left){bottom-=rowHeight+gap;x=left;rowHeight=0;}
      if(key===id)return {x:(key==='box'?stage.width-12-bw/2:x+bw/2),y:bottom};
      x+=bw+gap;rowHeight=Math.max(rowHeight,bh);
    }
    return null;
  }

  function fitRifle(i) {
    // The old rifle's world-space length was larger than its drag box, and opaque meshes drew behind the cat.
    // Fit its loaded model to the same screen-space body as every other keepsake, without changing its pose.
    const obj = i.object, model = obj.children[1];
    obj.visible = !!model;
    if (!model) return;
    if (!i.fittedModel) {
      obj.traverse((node) => {
        if (!node.isMesh) return;
        node.renderOrder = 100 + i.order;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          mat.transparent = true; mat.depthWrite = false; mat.depthTest = false; mat.needsUpdate = true;
        }
      });
      i.fittedModel = model;
    }
    const key = [i.x, i.y, i.w, i.h, i.kick, stage.width, stage.height].join(',');
    if (i.fitKey === key) { obj.scale.setScalar(i.fitScale); obj.position.add(i.fitOffset); return; }
    const original = obj.position.clone();
    obj.scale.setScalar(1);
    const bounds = () => {
      obj.updateWorldMatrix(true, true);
      const p = new stage.THREE.Vector3();
      let left = Infinity, right = -Infinity, bottom = -Infinity;
      model.traverse((node) => {
        const positions = node.geometry?.attributes.position;
        if (!positions) return;
        for (let n = 0; n < positions.count; n++) {
          const s = stage.toScreen(p.fromBufferAttribute(positions, n).applyMatrix4(node.matrixWorld));
          left = Math.min(left, s.x); right = Math.max(right, s.x); bottom = Math.max(bottom, s.y);
        }
      });
      return { x: (left + right) / 2, y: bottom, w: right - left };
    };
    for (let n = 0; n < 2; n++) {
      let b = bounds(); obj.scale.multiplyScalar(i.w / Math.max(1, b.w)); b = bounds();
      obj.position.add(stage.onWall(i.px.x, i.box.y + i.box.h, obj.position.z).sub(stage.onWall(b.x, b.y, obj.position.z)));
    }
    i.renderBounds = bounds();
    i.fitKey = key; i.fitScale = obj.scale.x; i.fitOffset = obj.position.clone().sub(original);
  }

  function place(inst) {
    if(inst.physical && inst.px)return;
    const d = inst.def, p = toPx(inst.x, inst.y), w = widthOf(d), h = w * (d.aspect ?? 1), bounds = extent(inst);
    p.x += inst.ox || 0; p.y += inst.oy || 0;
    const layer = d.sky ? 'back' : 'front';
    if (inst.layer !== layer) { inst.layer = layer; (layer === 'front' ? front : back).appendChild(inst.el); }
    inst.el.style.width = w + 'px'; inst.el.style.height = h + 'px';
    inst.el.style.setProperty('--u', (u * scaleFor(d)) + 'px');
    const cy = d.anchor === 'center' ? p.y : p.y - bounds.h / 2;
    inst.el.style.transform = `translate3d(${(p.x - w / 2).toFixed(2)}px, ${(cy - h / 2).toFixed(2)}px, 0) rotate(${angleOf(inst)}rad) scale(${inst.sx || 1}, ${inst.sy || 1})`;
    inst.el.style.zIndex = String(inst.order);
    inst.px = p; inst.w = w; inst.h = h; inst.u = u;
    inst.box = { x: p.x - bounds.w / 2, y: cy - bounds.h / 2, w: bounds.w, h: bounds.h };
    if (inst.object && !inst.physical) {
      if (!exempt(inst) && Math.abs(p.y - groundAnchor(inst)) > .001) {
        // Keep each GL definition's authored shape, size and orientation; lift its floor placement in screen space.
        const py = p.y, by = inst.box.y, ground = groundAnchor(inst);
        p.y = ground; inst.box.y += ground - py;
        d.place(inst.object, inst, site);
        const z = inst.object.position.z;
        const a = stage.onWall(p.x, py, z), b = stage.onWall(p.x, ground, z);
        inst.object.position.add(a.sub(b));
        p.y = py; inst.box.y = by;
      } else d.place(inst.object, inst, site);
      if (inst.id === 'rifle') fitRifle(inst);
      site.worldLayout.shadow(inst);
    }
    inst.placed?.();
  }
  function layoutAll() {
    measure();
    for (const inst of live.values()) {
      if(inst.physical)continue;
      const fixed=fixedHome(inst.def);
      if(fixed)Object.assign(inst,fixed);
      else if(inst.autoHome){const p=collectionHome(inst.id);if(p)Object.assign(inst,toUnits(p.x,p.y));}
      Object.assign(inst, clampUnits(inst.def, inst));
      if (!inst.held && !moving.has(inst) && !exempt(inst)) inst.y = toUnits(0, groundAnchor(inst)).y;
      constrain(inst); place(inst);
    }
  }
  stage.onResize.push(layoutAll);

  function build(def, saved) {
    const sound=impactSound(def.id);
    if(sound){const load=()=>site.audio.loadImpacts(sound.material);if(stage.loaded)load();else stage.onLoaded.push(load);}
    const fixed=fixedHome(def);
    if(fixed)saved={...saved,...fixed};
    else if(saved.autoHome){const p=collectionHome(def.id);if(p)saved={...saved,...toUnits(p.x,p.y)};}
    const el = document.createElement('div');
    el.className = 'keepsake k-' + def.id; el.dataset.id = def.id;
    const inst = {
      id: def.id, def, el, impactSound:sound, autoHome: !!saved.autoHome, x: saved.x, y: saved.y, state: saved.state || {}, layer: null, object: null, held: false, order: saved.order ?? ++order, resting: false, angle: 0, sx: 1, sy: 1,
      setState(patch) { Object.assign(inst.state, patch); save(inst); },
      moveTo(x, y) { if(inst.def.fixed)return; inst.autoHome=false; inst.explicitPlacement=true;
        if(inst.physical){inst.moveWorld?.(toPx(x,y));return;}
        stop(inst); Object.assign(inst, clampUnits(inst.def, { x, y })); if (exempt(inst)) { place(inst); save(inst); } else land(inst); },
      wiggle() { el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); },
      hits(px, py) { if(inst.stored)return false;const b = inst.box, pad = def.pad ?? 6; return px >= b.x - pad && px <= b.x + b.w + pad && py >= b.y - pad && py <= b.y + b.h + pad; },
    };
    order = Math.max(order, inst.order);
    def.make?.(el, inst, site);
    // These old decorative tilts predate physics. The outer body now owns their 2D lean and contact bounds.
    if (def.id === 'paper' && el.querySelector('.sheet')) { el.style.perspective = 'none'; el.querySelector('.sheet').style.transform = 'none'; }
    if (def.id === 'postcard' && el.querySelector('.card')) el.querySelector('.card').style.rotate = '0deg';
    if (def.id === 'ticket' && el.querySelector('svg')) el.querySelector('svg').style.rotate = '0deg';
    if (def.id === 'pat') el.style.rotate = '0deg';
    if (def.kind === 'gl') {
      inst.object = def.object(site, inst); stage.scene.add(inst.object);
      if (!def.sky) inst.object.renderOrder = 10 + inst.order;
    }
    live.set(def.id, inst);site.supports?.discover(def.id);
    place(inst);
    // the keyboard's way to it
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = def.label; b.dataset.id = def.id;
    b.title = 'Enter: use it. Arrow keys: move it.';
    b.addEventListener('click', () => { def.tap?.(inst, null, site); });
    b.addEventListener('keydown', (e) => {
      const step = { ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
      if (step && !inst.def.fixed) {
        if(inst.physical){site.worldInput.keyboardMove(inst.worldEntry,e.key,e.shiftKey);e.preventDefault();return;}
        inst.autoHome=false;
        Object.assign(inst, clampUnits(inst.def, { x: inst.x + step[0], y: inst.y + step[1] }));
        place(inst); release(inst); e.preventDefault();
      }
    });
    b.addEventListener('focus', () => el.classList.add('focus')); b.addEventListener('blur', () => el.classList.remove('focus'));
    const li = document.createElement('li'); li.appendChild(b); keys.appendChild(li);
    if(inst.physical){
      const lift=document.createElement('button');lift.type='button';lift.textContent='Lift / place '+def.label;
      lift.addEventListener('click',()=>{if(!inst.worldEntry)return;if(site.world.held?.entry===inst.worldEntry)site.worldInput.keyboardPlace();else site.worldInput.keyboardLift(inst.worldEntry);});
      lift.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow')){site.worldInput.keyboardMove(inst.worldEntry,e.key,e.shiftKey);e.preventDefault();}});li.appendChild(lift);
    }
    inst.key = li;
    return inst;
  }
  const save = (inst) => store.set('keepsakes.' + inst.id, {
    ...(inst.id==='rack' ? {} : {autoHome:inst.autoHome, x: +inst.x.toFixed(4), y: +(exempt(inst) ? inst.y : toUnits(0, groundAnchor(inst)).y).toFixed(4)}),
    state: inst.state, order: inst.order, ...(inst.id==='rack'?{}:{world: site.worldLayout.pose(inst)}),
  });

  // Presses: tap it, or drag it somewhere else.
  const taker = (layer) => (e) => {
    const list = [...live.values()].filter((i) => i.layer === layer && !i.physical && !i.def.inert && i.hits(e.clientX, e.clientY)).sort((a, b) => Number(!!a.object) - Number(!!b.object) || b.order - a.order);   // the one on top first
    const inst = list.find((i) => !i.def.hit || i.def.hit(i, e.clientX, e.clientY));
    if (!inst) return null;
    if (inst.def.press) { const h = inst.def.press(inst, e, site); if (h) return h; }      // it wants the whole press (wiping the streak)
    const caught = moving.has(inst);
    if (caught) { stop(inst); inst.held = true; }
    const start = { x: e.clientX, y: e.clientY, ix: inst.x, iy: inst.y, moved: false, t: e.timeStamp };
    return {
      move(ev) {
        if (!start.moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 8) return;
        if (inst.def.fixed) return;
        if (!start.moved) { inst.autoHome=false; stop(inst); inst.resting = false; inst.angle = 0; inst.sx = inst.sy = 1; inst.el.classList.remove('arrive'); start.moved = true; inst.held = true; inst.el.classList.add('held'); inst.def.lifted?.(inst, site); }
        const before = { ...inst.px }, elapsed = Math.max(8, ev.timeStamp - (start.lastT ?? start.t)) / 1000;
        Object.assign(inst, clampUnits(inst.def, { x: start.ix + (ev.clientX - start.x) / u, y: start.iy - (ev.clientY - start.y) / u }));
        constrain(inst); place(inst);
        start.vx = Math.max(-500, Math.min(500, (inst.px.x - before.x) / elapsed));
        start.vy = Math.max(-350, Math.min(500, (inst.px.y - before.y) / elapsed)); start.lastT = ev.timeStamp;
        inst.def.dragging?.(inst, ev, site);
        save(inst);
      },
      end(ev) {
        inst.held = false; inst.el.classList.remove('held');
        if (start.moved) {
          inst.def.dropped?.(inst, ev, site);
          const fresh = ev.type === 'pointerup' && ev.timeStamp - start.lastT < 100;
          if (ev.type === 'pointercancel' && live.has(inst.id) && !exempt(inst)) land(inst);
          else release(inst, fresh ? start.vx : 0, fresh ? start.vy : 0);
        }
        else {
          if (ev.type === 'pointerup') inst.def.tap?.(inst, ev, site);
          if (caught && live.has(inst.id) && !exempt(inst)) {
            if (ev.type === 'pointercancel') land(inst); else release(inst);
          }
        }
      },
    };
  };
  input.claim(90, taker('front'));
  input.claim(40, taker('back'));
  input.cursors.push((e) => ([...live.values()].some((i) => !i.def.inert && i.hits(e.clientX, e.clientY) && (!i.def.hit || i.def.hit(i, e.clientX, e.clientY))) ? 'grab' : null));

  stage.onFrame.push((dt) => {
    // Keep the definition's animation contract (including a GL top supplied by another egg).
    // Physics has its own temporary callback; no resting body is integrated here.
    for (const inst of live.values()) {
      if(inst.physical)continue;
      if (inst.def.frame) inst.def.frame(inst, dt, site);
      if (inst.object || inst.def.follow) place(inst);
    }
  });

  const api = {
    defs, live, physics, floorY,
    saveWorld(inst){inst.resting=true;save(inst);},
    syncWorld(inst,rect){
      inst.box={...rect};inst.px={x:rect.x+rect.w/2,y:rect.y+rect.h};
      Object.assign(inst,toUnits(inst.px.x,inst.px.y));
      inst.el.style.transform=`translate3d(${rect.x}px,${rect.y}px,0)`;
      inst.el.style.width=rect.w+'px';inst.el.style.height=rect.h+'px';
      inst.placed?.();
    },
    home(inst) {
      const p=collectionHome(inst.id);if(!p)return;
      inst.autoHome=true;Object.assign(inst,toUnits(p.x,p.y));land(inst);
    },
    define(def) {
      defs.set(def.id, def);
      const saved = store.get('keepsakes.' + def.id);
      if (saved) {
        measure(); const inst = build(def, saved);
        if (!exempt(inst)) land(inst);
      }
      return def;
    },
    has: (id) => live.has(id),
    get: (id) => live.get(id) || null,
    // New keepsakes are set on the one floor, spread by home x. Sky arrival art keeps its source.
    give(id, { from = null, state = null, at = null } = {}) {
      const def = defs.get(id);
      if (!def) return null;
      if (live.has(id)) { const inst = live.get(id); if (state) inst.setState(state); inst.wiggle(); return inst; }
      measure();
      const home = clampUnits(def, at || def.home(site));
      const slot=!at&&collectionHome(id);
      if(slot)Object.assign(home,toUnits(slot.x,slot.y));
      const inst = build(def, { ...home, autoHome:!!slot, state: state || {} });
      if (!exempt(inst)) land(inst); else save(inst);
      if (exempt(inst) && inst.id!=='rack' && from && !stage.reducedMotion) {
        const dx = from.x - inst.px.x, dy = from.y - inst.px.y;
        inst.el.animate([{ translate: `${dx}px ${dy}px`, scale: 0.3, opacity: 0.2 }, { translate: `${dx * 0.3}px ${dy * 0.3 - 40}px`, scale: 1.1, opacity: 1, offset: 0.6 }, { translate: '0 0', scale: 1, opacity: 1 }],
          { duration: 650, easing: 'cubic-bezier(.3,.7,.3,1)' });
      } else if (exempt(inst) && inst.id!=='rack') inst.el.classList.add('arrive');
      for (const l of listeners) l(inst);
      return inst;
    },
    take(id) {                                                    // gone again (the butter pat put back on his head)
      const inst = live.get(id);
      if (!inst) return;
      inst.removing?.();
      stop(inst); site.worldLayout.remove(id); inst.el.remove(); inst.key.remove();
      if (inst.object) stage.scene.remove(inst.object);
      inst.def.removed?.(inst, site);
      live.delete(id); store.del('keepsakes.' + id);
    },
    onGive: (f) => listeners.push(f),
    toPx, toUnits, layoutAll,
    get unit() { return u; }, get feet() { return feet; },
    // the nearest keepsake (or other target) under a page point, for things dropped onto things
    under(px, py, except) { return [...live.values()].sort((a, b) => Number(!!a.object) - Number(!!b.object) || b.order - a.order).find((i) => i.id !== except && i.hits(px, py)) || null; },
  };
  return api;
}
