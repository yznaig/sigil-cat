// Gags lane, playtest 2 (item 6): the charged bulb is a UV bulb (violet), and the lit lamp reveals a badly drawn
// smiley in invisible ink on the floor, down and to the right of the lamp. Nothing is drawn while the lamp is off.
// Run with checks/lib.js.
cat.auto=false;const L=site.lamp,T=site.THREE;
await L.award();await L.inst.worldTask;await sleep(600);
check('before the lamp is lit there is no smiley at all',!L.smiley||!L.smiley.visible);
const loose=L.inst.picture.materials.find(m=>m.name==='lamp-envelope');
const violet=c=>c.b>c.g&&c.r>c.g&&c.b>.5;
check('the charged bulb lying loose glows violet',L.glow>0&&violet(loose.emissive),loose.emissive.getHexString());
await L.use();await until(()=>L.on,3000);await until(()=>L.smiley?.material.opacity===1,15000);   // the first lamp-on recompiles the rack picture's lit materials (seconds, headless)
const s=L.smiley;
check('lighting the lamp shows the smiley, fully faded in',!!s&&s.visible&&s.material.opacity===1,JSON.stringify({o:s?.material.opacity,v:s?.visible,on:L.on,occ:L.occupied}));
// site.lamp.light is the speed lane's small view since playtest-2 (e1112-59: the light lives in the rack's picture at zero);
// the light itself is its .object
check('the lamp light is violet',violet(L.light.object.color)&&violet(L.halo.material.map.image.getContext('2d').getImageData(32,32,1,1).data.reduce((c,v,i)=>(c[['r','g','b'][i]]=v/255,c),{})||{}),L.light.object.color.getHexString());
// Where: down and to the right of the lamp on the floor, on the page and clear of the footer.
const socket=site.supports.registry.get('rack-lamp').slots[0].position,lamp=stage.toScreen(site.rack.root.localToWorld(new T.Vector3(...socket)));
s.updateMatrixWorld(true);const mid=stage.toScreen(s.localToWorld(new T.Vector3(.63*s.geometry.parameters.width-s.geometry.parameters.width/2,-(.56*s.geometry.parameters.height-s.geometry.parameters.height/2),0)));
check('the smiley is down and to the right of the lamp, on the page',mid.x>lamp.x+30&&mid.y>lamp.y+30&&mid.x<stage.width-20&&mid.y<stage.height-stage.insets.bottom,JSON.stringify({lamp,smiley:mid}));
await __shot('gags-lamp-uv-smiley');
await L.setOn(false);await sleep(stage.reducedMotion?100:900);
check('switched off, the smiley is gone (not drawn)',!s.visible);
await __shot('gags-lamp-off');
await L.setOn(true);await sleep(stage.reducedMotion?100:900);check('and back on, it is back',s.visible&&s.material.opacity===1);
// Polish lane (playtest 3, Aaron: "The glow-in-the-dark smiley face should also be moved closer to the front, just a little
// bit, because currently it's slightly covered by the controller stand"): with the stand and the egg cup in the row, no
// point of the face's ring (taken 15 % wide of the drawn line, for its stroke and glow) is hidden by furniture, and on
// the page it stays clear of the footer's buttons.
{const cm=await import(new URL('src/flappy/controller.js',document.baseURI).href),{eggCupService}=await import(new URL('src/world/egg-cup.js',document.baseURI).href);
 store.set('bird.stand',true);await cm.ensureStand(site);await eggCupService(site).ensure();await until(()=>!site.world.stats.listening,15000);L.changed();await sleep(300);
 const W=site.world,Rp=W.rapier,cam=stage.camera.position,w=s.geometry.parameters.width,d=s.geometry.parameters.height;s.updateMatrixWorld(true);
 const buttons=[...document.querySelectorAll('button')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0&&r.top>stage.height*.5);
 let hidden=0,under=0;
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2,u=.6+Math.cos(a)*.27*1.15*410/640*1.08,v=.55+Math.sin(a)*.27*1.15*.94,p=s.localToWorld(new T.Vector3((u-.5)*w,-(v-.5)*d,0)),dir=p.clone().sub(cam),len=dir.length();
  if(W.physics.castRay(new Rp.Ray(cam,dir.normalize()),len-.01,true,undefined,undefined,undefined,undefined,c=>/^furniture-/.test([...W.entries.values()].find(e=>e.body===c.parent())?.id||'')))hidden++;
  const q=stage.toScreen(p);if(buttons.some(r=>q.x>r.left&&q.x<r.right&&q.y>r.top&&q.y<r.bottom))under++;}
 check('the smiley is in front of the controller stand and the egg cup, and clear of the footer buttons',hidden===0&&under===0&&!!site.stand?.ready&&!!site.eggCup?.ready,`${hidden}/48 ring points behind furniture, ${under} under a button`);
 await __shot('gags-lamp-smiley-by-stand');}
