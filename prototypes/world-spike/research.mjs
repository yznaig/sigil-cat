import {createRequire} from 'node:module';import {readdirSync,writeFileSync} from 'node:fs';import {homedir} from 'node:os';
const {chromium}=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/')('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',exe=root+readdirSync(root).filter(x=>/^chromium-\d+$/.test(x)).sort().pop()+'/chrome-linux64/chrome';
const browser=await chromium.launch({executablePath:exe,headless:true,args:['--headless=new','--use-gl=angle','--use-angle=gl-egl','--ignore-gpu-blocklist'],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:'',GALLIUM_DRIVER:'d3d12',MESA_D3D12_DEFAULT_ADAPTER_NAME:'NVIDIA'}});
const result={engines:[],priorArt:[],matchedProps:[]};
try{
 for(const size of ['desktop','phone']){const context=await browser.newContext({viewport:size==='desktop'?{width:1280,height:900}:{width:390,height:844}});const p=await context.newPage();await p.goto('http://localhost:8743/prototypes/world-spike/engines.html');
 for(const name of ['cannon','rapier','jolt']){try{const r=await p.evaluate(name=>runEngine(name),name);const s=[...r.samples].sort((a,b)=>a-b);result.engines.push({...r,size,samples:undefined,stepMeanMs:s.reduce((a,b)=>a+b,0)/s.length,stepP95Ms:s[Math.floor(s.length*.95)]});console.log(result.engines.at(-1));}catch(e){result.engines.push({size,name,error:String(e)});}}await context.close();}
 // Match the spike's actual 20 compound props, not merely boxes.
 for(const size of ['desktop','phone']){
  const context=await browser.newContext({viewport:size==='desktop'?{width:1280,height:900}:{width:390,height:844}}),p=await context.newPage();
  await p.goto('http://localhost:8743/prototypes/world-spike/');await p.waitForFunction(()=>window.spike);
  const fixture=await p.evaluate(()=>{spike.manual(true);spike.reset(20);return spike.items.map(i=>({mass:i.body.mass,p:i.body.position,q:i.body.quaternion,v:i.body.velocity,w:i.body.angularVelocity,shapes:i.body.shapes.map((s,n)=>({points:s.vertices.flatMap(v=>[v.x,v.y,v.z]),offset:i.body.shapeOffsets[n],rotation:i.body.shapeOrientations[n]}))}));});
  const measured=await p.evaluate(async fixture=>{
   const R=(await import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs')).default;await R.init();
   const world=new R.World({x:0,y:-9.81,z:0});world.timestep=1/120;
   world.createCollider(R.ColliderDesc.cuboid(100,.1,100).setTranslation(0,-.1,0).setFriction(1).setRestitution(1).setFrictionCombineRule(R.CoefficientCombineRule.Multiply).setRestitutionCombineRule(R.CoefficientCombineRule.Multiply));
   const bodies=fixture.map(i=>{const b=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(i.p.x,i.p.y,i.p.z).setRotation(i.q).setLinvel(i.v.x,i.v.y,i.v.z).setAngvel(i.w).setLinearDamping(.12).setAngularDamping(.25).setCcdEnabled(true));for(const s of i.shapes)world.createCollider(R.ColliderDesc.convexHull(new Float32Array(s.points)).setTranslation(s.offset.x,s.offset.y,s.offset.z).setRotation(s.rotation).setMass(i.mass/i.shapes.length).setFriction(.38).setRestitution(.28),b);return b;});
   const times=[];for(let i=0;i<240;i++){const t=performance.now();for(const b of bodies){const v=b.linvel(),e=Math.hypot(v.x,v.y,v.z)>1?.28:0;for(let j=0;j<b.numColliders();j++)b.collider(j).setRestitution(e);}world.step();times.push(performance.now()-t);}world.free();times.sort((a,b)=>a-b);return {steps:times.length,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)],maxMs:times.at(-1)};
  },fixture);result.matchedProps.push({size,engine:'rapier 0.19.3, CCD enabled',...measured});console.log('MATCHED',result.matchedProps.at(-1));await context.close();
 }
 for(const url of ['https://pmndrs.github.io/cannon-es/examples/threejs_mousepick','https://2019.bruno-simon.com/','https://jrouwe.github.io/JoltPhysics.js/falling_shapes.html']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await context.newPage(),requests=[],errors=[];
  p.on('requestfinished',async r=>{try{requests.push({url:r.url(),...await r.sizes()});}catch{}});p.on('pageerror',e=>errors.push(String(e)));
  try{await p.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForSelector('canvas',{timeout:20000});await p.waitForTimeout(5000);const renderer=await p.evaluate(()=>{const c=document.querySelector('canvas'),gl=c.getContext('webgl2')||c.getContext('webgl'),e=gl?.getExtension('WEBGL_debug_renderer_info');return gl?gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER):'unknown';});const gaps=await p.evaluate(()=>new Promise(resolve=>{let last=0,g=[];function f(t){if(last)g.push(t-last);last=t;if(g.length>=30)resolve(g);else requestAnimationFrame(f);}requestAnimationFrame(f);}));result.priorArt.push({url,renderer,viewport:'390x844 DPR2 (desktop CPU)',requests,errors,rafMeanMs:gaps.reduce((a,b)=>a+b,0)/gaps.length,rafMaxMs:Math.max(...gaps)});}catch(e){result.priorArt.push({url,requests,errors,error:String(e)});}await context.close();
 }
}finally{writeFileSync('prototypes/world-spike/research-results.json',JSON.stringify(result,null,2)+'\n');await browser.close();}
