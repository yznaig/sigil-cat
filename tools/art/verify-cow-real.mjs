// Cow-only offline validation; leaves runtime and existing checks untouched.
import {createRequire} from 'node:module';import {writeFileSync,readdirSync} from 'node:fs';import {homedir} from 'node:os';
const {chromium}=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/')('playwright-core'),root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().pop();
const browser=await chromium.launch({executablePath:process.env.CHROME||root+dir+'/chrome-linux64/chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.ART_CDN_IP?[`--host-resolver-rules=MAP cdn.jsdelivr.net ${process.env.ART_CDN_IP}`]:[])],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:''}});
try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:18745/tools/art/cow-real-studio.html');await p.waitForFunction(()=>window.artReady,{},{timeout:120000});
 const result=await p.evaluate(async()=>{
  const T=await import('three'),mod=await import('/assets/models/prepared/cow-real/cow.js'),g=await mod.create(),names=[...g.userData.rig.legs.flatMap(n=>[n,n+(n.startsWith('front')?'.knee':'.hock'),n+'.fetlock',n+'.hoof']),...g.userData.rig.neck,...g.userData.rig.tail];
  for(const name of names)if(!g.getObjectByName(name)?.isBone)throw Error('Missing bone '+name);
  const bounds=()=>{g.traverse(o=>{if(o.isSkinnedMesh)o.computeBoundingBox();});return new T.Box3().setFromObject(g);};
  const points=()=>names.map(n=>g.getObjectByName(n).getWorldPosition(new T.Vector3())),rest=points();
  let maxBakeError=0,minY=Infinity,maxY=-Infinity,stanceHeightDrift=0,stanceSlide=0;
  const legs=g.userData.rig.legs,contacts=Object.fromEntries(legs.map(n=>[n,[]]));
  for(let i=0;i<=128;i++){
   const phase=i/128*Math.PI*2;mod.authorPose(g,{phase,walk:1});const authored=points();mod.pose(g,{phase,walk:1});const baked=points();
   for(let j=0;j<baked.length;j++){maxBakeError=Math.max(maxBakeError,baked[j].distanceTo(authored[j]));if(!baked[j].toArray().every(Number.isFinite))throw Error('Nonfinite pose');}
   const b=bounds();minY=Math.min(minY,b.min.y);maxY=Math.max(maxY,b.max.y);
   for(let j=0;j<4;j++){const u=(i/128+[.25,.75,0,.5][j])%1;if(u>.025&&u<.595){const v=g.getObjectByName(legs[j]+'.hoof').getWorldPosition(new T.Vector3());contacts[legs[j]].push({u,x:v.x+g.userData.rig.stanceSweep*u/.62,y:v.y});}}
  }
  for(const a of Object.values(contacts)){stanceHeightDrift=Math.max(stanceHeightDrift,Math.max(...a.map(v=>v.y))-Math.min(...a.map(v=>v.y)));stanceSlide=Math.max(stanceSlide,Math.max(...a.map(v=>v.x))-Math.min(...a.map(v=>v.x)));}
  mod.pose(g,{phase:0,walk:1});const start=points();mod.pose(g,{phase:2*Math.PI,walk:1});const loopError=Math.max(...points().map((p,i)=>p.distanceTo(start[i])));
  let grazeMinY=Infinity;for(let i=0;i<=40;i++){mod.pose(g,{eat:i/40});const b=bounds();grazeMinY=Math.min(grazeMinY,b.min.y);if(!b.min.toArray().concat(b.max.toArray()).every(Number.isFinite))throw Error('Nonfinite graze');}
  mod.pose(g,{});const restError=Math.max(...points().map((p,i)=>p.distanceTo(rest[i])));
  mod.pose(g,{phase:.7,walk:1});const local=points();g.position.set(3,.4,-2);g.rotation.y=1.1;g.scale.setScalar(.7);mod.pose(g,{phase:.7,walk:1});const transformError=Math.max(...points().map((p,i)=>g.worldToLocal(p).distanceTo(local[i])));
  const result={samples:{walk:129,graze:41},clips:g.userData.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),bones:names,maxBakeError,loopError,restError,transformError,stanceHeightDrift,stanceSlide,minY,maxY,grazeMinY};
  if(maxBakeError>.006||loopError>1e-6||restError>1e-6||transformError>1e-5||stanceHeightDrift>.012||stanceSlide>.012||minY<-.025||grazeMinY<-.025)throw Error(JSON.stringify(result));return result;
 });
 if(errors.length)throw Error(errors.join('\n'));writeFileSync('docs/shots/art/cow-real-validation.json',JSON.stringify({...result,errors},null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();}
