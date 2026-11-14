// The glass (gag 3; the cup sigil, a half circle open at the top). A glass of water appears on the floor in front of
// him. He considers it. Then, slowly, in three shoves, he pushes it to the front edge of the page and off it: it tips
// forward, toward you, and drops out of the bottom of the page. A beat later it tumbles down from the top of the
// page and shatters on the floor in front of him, where the puddle spreads (playtest 2).
// What stays: shards, and a fixed floor puddle of clean water. A bolt cast while there is a
// puddle goes to ground through the water and reaches him that way (src/combos.js).
// Thick prepared glass with a contained water volume.
import {defineShards,warmFragment,prepareFragment} from '../world/fragments.js';
import {createCup} from '../world/cup.js';
import { rand, smooth, ease } from '../core/util.js';

export const GLASS = {
  height: 0.36,          // the glass's height, in cat-heights
  start: [0.34, 0.5],    // where it appears on the floor: x (his left as you look is negative), z toward you
  shoves: 3, shove: 0.5, // how many pushes, and how far each sends it toward you (world units)
  consider: 1.7,         // seconds he looks at it first
  pause: 0.8,            // seconds between shoves (he looks at you)
  // Over the edge (playtest 3): `tip` s turning on its front foot to `release` radians, then a fall under `gravity`
  // (world units/s^2, the physics world's) still turning at the speed it had, drifting `drift` units/s toward you,
  // until its whole picture is below the page (at most `max` s).
  over: { tip: 0.42, release: 1.0, gravity: 9.81, drift: 0.35, max: 2.5 },
  gone: 0.45,            // seconds it is out of sight before it comes down from the top
  tumble: 0.85,          // seconds of the fall from the top of the page to the floor
  turns: [1.6, 0.7, 1.1],// how many turns it tumbles through on the way down, about x, y, z
};
const VERT = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
// Clean water on the floor (e1111-58): no mirror picture any more. The floor under it is a little darker and cooler
// (wet), a darker meniscus line runs round the edge, and the surface catches the light: a soft sheen growing toward
// the far side (grazing angle) and one soft highlight with a crisper glint along the far inner edge. It is drawn
// before the floor shadows, so whatever stands in or near it still casts its shadow across the water.
// Static: nothing here animates, so a puddle costs nothing while the page rests.
const PUDDLE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uAlpha, uCharged;
float blob(vec2 p) {   // an uneven pool: a circle with a wandering edge (the same edge glass.energize() tests)
  float ang = atan(p.y, p.x), r = length(p);
  return r - (0.78 + 0.1 * sin(ang * 3.0 + 1.0) + 0.06 * sin(ang * 5.0 + 4.0) + 0.04 * sin(ang * 9.0));
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;                       // p.y > 0: the far side of the pool
  float d = blob(p), aa = fwidth(d) * 1.2;
  float cover = 1.0 - smoothstep(-aa, aa, d);
  if (cover <= 0.0) discard;
  float depth = smoothstep(0.0, -0.25, d);        // 0 at the edge, 1 well inside
  float rim = exp(-pow((d + 0.022) / 0.022, 2.0)); // the meniscus, just inside the edge
  float near = smoothstep(0.6, -0.9, p.y);        // the near side: you look down into it, so it reads darker
  float wet = 0.075 + 0.045 * depth * near + rim * 0.10;
  vec3 tint = vec3(0.33, 0.36, 0.40);             // the colour the floor goes toward when wet: cool and dark
  float fres = smoothstep(-0.4, 1.0, p.y);        // the far side catches the light at a grazing angle
  vec3 sheen = vec3(0.88, 0.93, 1.0) * fres * fres * 0.07 * depth;
  vec2 h = (p - vec2(-0.3, 0.38)) * vec2(1.9, 3.6);
  vec3 spec = vec3(1.0, 0.99, 0.96) * (exp(-dot(h, h) * 2.2) * 0.09 + exp(-dot(h, h) * 14.0) * 0.10) * depth;
  float glint = exp(-pow((d + 0.04) / 0.012, 2.0)) * smoothstep(0.1, 0.7, p.y);
  spec += vec3(1.0) * glint * 0.16;
  float a = wet * cover;
  vec4 water = vec4(tint * a + (sheen + spec) * cover, a);
  // Charged (a bolt through the water into a top standing in it): the water takes an electric-blue tint, deepest along
  // the rim, laid over it as a colour with its own coverage. It used to be added as light (colour, no alpha): on this
  // pale page that summed past white, so the pool glowed nearly white (Aaron, playtest 2: "the water turns strangely
  // bright"). Now the blue's colour never exceeds its alpha, so it can only tint, never brighten past the page.
  float ca = uCharged * cover * (0.16 + depth * 0.10 + rim * 0.34);
  gl_FragColor = (vec4(vec3(0.13, 0.42, 0.62) * ca, ca) + water * (1.0 - ca)) * uAlpha;
}`;

const WIDE = Math.SQRT2, PUDDLE_ORDER = -8;
export default function createGlass(site) {
  const { stage, cat, audio, keepsakes, THREE } = site, G = GLASS;
  audio.loadAll(['glass-slide', 'glass-smash', 'drip', 'hit']);
  let busy = false, count = 0, cup = null, breaks = 0, over = null, brokeAt = null, shattered = null, shards = null;
  const shardsWanted = () => !keepsakes.has('shards') && !site.eggs.recycle?.done;
  const material = (frag, uniforms) => new THREE.ShaderMaterial({
    uniforms, vertexShader: VERT, fragmentShader: frag, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  const pu = { uCharged: {value:0}, uAlpha: { value: 1 } };
  stage.warm(function puddle() { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(PUDDLE_FRAG, pu)); stage.scene.add(m); stage.warmDraw([m]); stage.scene.remove(m); });
  const pos = new THREE.Vector3();
  stage.onRender.push(() => {
    if (!keepsakes.has('puddle')) return;
    pu.uCharged.value=site.worldProps.charged.active?1:0;
  });

  async function show() {
    if (busy || cat.hidden || cat.standIn) return false;
    busy = true; count++;
    window.dispatchEvent(new CustomEvent('sigilcat:ingredient-source', {detail:'cup'}));
    const calm = stage.reducedMotion, fx = cat.fx, wasAuto = cat.auto;
    cat.auto = false;
    try {
    if (shardsWanted()) warmFragment(site, 'shards');
    cup = await createCup(site,G.height*cat.height);
    pos.set(G.start[0], .002, G.start[1]);cup.pose(pos);
    audio.play('drip', { gain: 0.5 });
    // The shards are built now, hidden, with the cup's own arrival (their build stops the page for a moment), and put in
    // the moment it breaks.
    if (shardsWanted()) warmFragment(site, 'shards').then(() => { if (busy && !shards && shardsWanted()) shards = prepareFragment(site, 'shards', site.worldLayout.reachable(pos)); });
    await stage.after(.3);
    // he considers it
    cat.setYawTarget(0.42, 2.4);
    await stage.after(G.consider);
    for (let i = 0; i < G.shoves; i++) {
      audio.play('glass-slide', { gain: 0.6, rate: rand(0.9, 1.1) });
      const z0 = pos.z;
      await stage.tween(1.25, (u) => {
        const e = smooth(u);
        pos.z = z0 + G.shove * e;
        cup.pose(pos);
        fx.y = -0.012 * Math.sin(u * Math.PI); fx.rot = (calm ? 0 : 0.035) * Math.sin(u * Math.PI);     // he leans into it
      });
      fx.y = 0; fx.rot = 0;
      if (i < G.shoves - 1) { cat.setYawTarget(cat.config.rotate.homeYaw, 3); await stage.after(G.pause); cat.setYawTarget(0.42, 3); await stage.after(0.35); }
    }
    // Over the front edge, in one motion (playtest 3: "it needs to visually look like it falls all the way off the
    // screen"): it tips forward on its front foot (its top toward you), then falls under gravity, still turning, until
    // all of it is below the bottom of the page. A picture moved by hand the whole way (cup.fly: no body, so no floor
    // rule can catch it). A beat later it comes back down from the top to break where the puddle will be: the
    // reachable floor in front of him, below where it went over.
    const landing = site.worldLayout.reachable(pos), start=pos.clone(), q=new THREE.Quaternion(), e3=new THREE.Euler();
    audio.play('glass-slide', {gain:.45,rate:1.25});
    if(!calm){
      cup.fly();
      const foot=Math.min(...cup.vertices.map(v=>v.y)),r=Math.max(...cup.vertices.filter(v=>v.y<foot+.01).map(v=>v.z));
      const D=G.over,alpha=2*D.release/(D.tip*D.tip),omega=alpha*D.tip,pivot=new THREE.Vector3(start.x,start.y,start.z+r);
      // where the base's middle is with the glass turned by `a` on its front foot
      const onFoot=a=>new THREE.Vector3(start.x,pivot.y+r*Math.sin(a),pivot.z-r*Math.cos(a));
      const v0=new THREE.Vector3(0,r*omega*Math.cos(D.release),r*omega*Math.sin(D.release)+D.drift);
      const p0=onFoot(D.release);
      over={frames:0,gone:null};
      await new Promise(resolve=>{
        let t=0;
        const f=dt=>{
          t+=dt;let a;
          if(t<D.tip){a=.5*alpha*t*t;pos.copy(onFoot(a));pos.z+=D.drift*t*t/(2*D.tip);}
          else{const s=t-D.tip;a=D.release+omega*s;pos.set(p0.x,p0.y+v0.y*s-.5*D.gravity*s*s,p0.z+D.drift*D.tip/2+v0.z*s);}
          q.setFromEuler(e3.set(a,0,.12*Math.min(1,t/D.tip)));cup.pose(pos,q);over.frames++;
          // gone once its whole picture is below the bottom of the page (or after `max` s, whatever the screen)
          const rc=cup.picture.rect;
          if(rc.y>stage.height||t>D.max){over.gone={t,y:rc.y};stage.onFrame.splice(stage.onFrame.indexOf(f),1);resolve();}
        };
        stage.onFrame.push(f);
      });
      cup.root.visible=false;cup.picture.draw(true);site.worldLayout.remove('glass');
      await stage.after(G.gone);
      // From above the top of the page, tumbling, straight down onto the landing spot.
      const top=stage.onWall(stage.toScreen(landing).x,-.12*stage.height,landing.z), turns=G.turns;
      cup.root.visible=true;cup.shadowless=true;
      await stage.tween(G.tumble,u=>{
        const k=u*u;
        q.setFromEuler(e3.set(turns[0]*Math.PI*2*u,turns[1]*Math.PI*2*u,turns[2]*Math.PI*2*u));
        pos.set(landing.x,top.y+(.002-Math.min(...cup.vertices.map(v=>v.clone().applyQuaternion(q).y))-top.y)*k,landing.z);
        cup.pose(pos,q);
      });
    }else pos.copy(landing);
    const at=pos.clone();cup.finish();const fell=stage.toScreen(at);breaks++;brokeAt=performance.now();
    audio.play('glass-smash', { gain: 0.75 });
    cat.playEmote('startle', 'glass');
    cat.setYawTarget(null);
    cat.auto = wasAuto;
    const x = Math.min(stage.width - 80, Math.max(80, fell.x)), from = { x, y: stage.height + 20 };
    const floorY = site.worldLayout.floorY();
    if (!keepsakes.has('puddle')) {
      const pool=keepsakes.give('puddle', {at:keepsakes.toUnits(x,floorY),from});
      const floor=[...pool.state.floor];floor[0]=at.x;floor[1]=at.z;
      pool.setState({floor});pool.def.place(pool.object,pool);
    }
    // The shards (playtest 3: "the glass shards seemed to appear way after the glass broke"): given the moment it
    // breaks, where it breaks, kicked up a little by the smash; warmed when the cup appeared (src/world/fragments.js).
    // After the sixth star from the recycling bin there are no more shards to recycle (playtest 2, recycle.js).
    if (shards) {
      const from=at.clone();from.y=.05;const s=shards;shards=null;
      const i=await s.show({from,velocity:{x:rand(-.25,.25),y:.7,z:rand(0,.3)},spin:{x:rand(-2,2),y:rand(-3,3),z:rand(-2,2)},yaw:rand(-1,1)});
      if(i?.worldEntry)shattered={at:performance.now(),from,broke:brokeAt};
    }
    return true;
    } finally {
      if(cup&&cup.mode!=='broken')cup.dispose();
      shards?.cancel();shards=null;
      busy=false;fx.y=0;fx.rot=0;cat.setYawTarget(null);cat.auto=wasAuto;
    }
  }
  site.spells.cup = show;

  // ---- what stays ----
  keepsakes.define({
    // About twice the floor area it had (e1111-58: 1.414 x 1.414). Drawn first of the floor things (renderOrder below
    // every floor shadow's -5), so shadows land on the water.
    id: 'puddle', label: 'the puddle', kind: 'gl', fixed:true, inert:true, size: 0.7 * WIDE, aspect: 0.36, anchor: 'center', home: () => ({ x: 0.3, y: -0.45 }),
    object() {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material(PUDDLE_FRAG, pu));
      m.frustumCulled = false; m.renderOrder = PUDDLE_ORDER;
      return m;
    },
    // Flat on the floor, covering its box on the page: seen from this low a pool that looks this deep on the screen is
    // a long one on the floor, so its length is found by putting the box's top and bottom on the floor.
    place(obj, inst) {
      // Persist the actual floor patch, not a draggable screen rectangle.
      if(!inst.state.floor){
        const near=stage.onFloor(inst.px.x,inst.px.y+inst.h/2),far=stage.onFloor(inst.px.x,inst.px.y-inst.h/2);
        const center=new THREE.Vector3((near.x+far.x)/2,0,(near.z+far.z)/2);
        inst.setState({floor:[center.x,center.z,inst.w/stage.pxPerUnit(center),Math.abs(near.z-far.z)],wide:1});
      } else if(!inst.state.wide){                  // a pool saved before it doubled: same middle, twice the area
        const [x,z,w,d]=inst.state.floor;inst.setState({floor:[x,z,w*WIDE,d*WIDE],wide:1});
      }
      const [x,z,w,d]=inst.state.floor;
      obj.position.set(x,.003,z);obj.rotation.set(-Math.PI/2,0,0);obj.scale.set(w,d,1);obj.renderOrder=PUDDLE_ORDER;
    },
  });
  defineShards(site);

  function energize(){
    const pool=keepsakes.get('puddle'),top=keepsakes.get('top');
    if(!pool?.state.floor||!top?.worldReady)return false;
    const [x,z,w,d]=pool.state.floor,b=top.worldEntry.body;
    const q=new THREE.Quaternion().copy(b.rotation()),p=new THREE.Vector3().copy(b.translation());
    const wet=top.colliderVertices.some(v=>{
      const a=v.clone().applyQuaternion(q).add(p);if(a.y>.05)return false;
      const dx=(a.x-x)*2/w,dz=(a.z-z)*2/d,angle=Math.atan2(-dz,dx);
      const edge=.78+.1*Math.sin(angle*3+1)+.06*Math.sin(angle*5+4)+.04*Math.sin(angle*9);
      return Math.hypot(dx,dz)<edge;
    });
    return wet&&site.worldProps.charged.charge(top);
  }
  return {
    find: 'glass', config: GLASS, show, energize, get cup(){return cup;},get breaks(){return breaks;}, get over(){return over;}, get shattered(){return shattered;}, get busy() { return busy; }, get count() { return count; },
    // the puddle's middle on the page, for the bolt (null when there is none)
    get puddle() { const p = keepsakes.get('puddle'); return p ? stage.toScreen(p.object.position) : null; },
    again: () => site.cast('cup'),
  };
}
