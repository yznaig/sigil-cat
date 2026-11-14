// Offline cavity shading and horn-coloured hooves. No BVH runtime dependency.
import {createRequire} from 'node:module';
import {writeFileSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
const {chromium}=createRequire((process.env.PW_FROM||process.env.HOME+'/command-hq/scripts/shot')+'/')('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().pop();
const browser=await chromium.launch({executablePath:process.env.CHROME||root+dir+'/chrome-linux64/chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader',...(process.env.ART_CDN_IP?[`--host-resolver-rules=MAP cdn.jsdelivr.net ${process.env.ART_CDN_IP}`]:[])],env:{...process.env,DISPLAY:'',WAYLAND_DISPLAY:''}});
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:18745/tools/art/cow-real-studio.html');await page.waitForFunction(()=>window.artReady,{},{timeout:120000});
 const result=await page.evaluate(async()=>{
  const T=await import('three'),{MeshBVH}=await import('https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.9.5/build/index.module.js'),mod=await import('/assets/models/prepared/cow-real/cow.js'),cow=await mod.create();
  let body;cow.traverse(o=>{if(o.isMesh&&o.material.name==='material')body=o;});
  const geo=body.geometry.clone(),positions=new Float32Array(geo.attributes.position.count*3),v=new T.Vector3();
  for(let i=0;i<geo.attributes.position.count;i++){body.getVertexPosition(i,v).applyMatrix4(body.matrixWorld);v.toArray(positions,i*3);}
  geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.computeVertexNormals();
  const bvh=new MeshBVH(geo),ray=new T.Ray(),n=new T.Vector3(),t=new T.Vector3(),b=new T.Vector3(),colors=[],samples=32;
  for(let i=0;i<geo.attributes.position.count;i++){
   v.fromBufferAttribute(geo.attributes.position,i);n.fromBufferAttribute(geo.attributes.normal,i).normalize();
   t.set(Math.abs(n.y)>.9?1:0,Math.abs(n.y)>.9?0:1,0).cross(n).normalize();b.crossVectors(n,t);
   ray.origin.copy(v).addScaledVector(n,.0015);let occlusion=0;
   for(let k=0;k<samples;k++){const r=Math.sqrt((k+.5)/samples),a=k*2.399963229728653;ray.direction.copy(n).multiplyScalar(Math.sqrt(1-r*r)).addScaledVector(t,r*Math.cos(a)).addScaledVector(b,r*Math.sin(a));const hit=bvh.raycastFirst(ray,T.DoubleSide,.0006,.15);if(hit)occlusion+=Math.pow(1-hit.distance/.15,1.3);}
   const shade=Math.max(.52,1-.72*occlusion/samples),hoof=1-T.MathUtils.smoothstep(v.y,.065,.108);
   for(const pigment of [.28,.25,.22])colors.push(Math.round(255*shade*T.MathUtils.lerp(1,pigment,hoof)));
  }
  return {mesh:body.name,vertices:positions.length/3,colors,samples,radius:.15};
 });
 writeFileSync('/tmp/cow-colors.json',JSON.stringify(result));console.log({mesh:result.mesh,vertices:result.vertices,samples:result.samples});
} finally {await browser.close();}
