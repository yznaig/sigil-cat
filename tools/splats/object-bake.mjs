// Offline collider bake only; no image/model generation, no runtime build step.
// PW_FROM=... node tools/splats/object-bake.mjs
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {parseSpz} from '../../src/core/spz.js';
const {chromium}=createRequire((process.env.PW_FROM||process.cwd())+'/')('playwright-core');
const root=homedir()+'/.cache/ms-playwright/',dir=readdirSync(root).filter(s=>/^chromium-\d+$/.test(s)).sort().pop();
const browser=await chromium.launch({executablePath:root+dir+'/chrome-linux64/chrome',headless:true});
try{
 const page=await browser.newPage();
 await page.setContent('<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js"}}</script>');
 for(const id of (process.argv.length>2?process.argv.slice(2):['awp-1','top-1'])){
  const s=parseSpz(new Uint8Array(readFileSync('assets/splats/'+id+'.spz'))),groups=id==='awp-1'?[new Map(),new Map(),new Map()]:[new Map()];
  for(let i=0;i<s.count;i++){
   if(s.rgba[i*4+3]<96)continue;
   const p=Array.from(s.center.subarray(i*3,i*3+3)),g=id==='awp-1'?(p[0]<.12?0:p[0]<.3?1:2):0;
   const key=p.map(v=>Math.round(v*80)).join(',');if(!groups[g].has(key))groups[g].set(key,p);
  }
  const hulls=await page.evaluate(async groups=>{
   const T=await import('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js');
   const {ConvexGeometry}=await import('https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/geometries/ConvexGeometry.js');
   return groups.map(points=>{
    const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for(let n=0;n<96;n++){const y=1-2*(n+.5)/96,a=n*2.399963229728653,r=Math.sqrt(1-y*y);directions.push([r*Math.cos(a),y,r*Math.sin(a)]);}
    const selected=new Set(directions.map(d=>points.reduce((best,p)=>p.reduce((s,v,k)=>s+v*d[k],0)>best.score?{p,score:p.reduce((s,v,k)=>s+v*d[k],0)}:best,{score:-Infinity}).p));
    const g=new ConvexGeometry([...selected].map(p=>new T.Vector3(...p)));
    return Array.from(g.attributes.position.array,v=>+v.toFixed(6));
   });
  },groups.map(g=>[...g.values()]));
  writeFileSync('assets/splats/'+id+'.colliders.json',JSON.stringify({source:id+'.spz',method:'opaque alpha>=96; one sample per 1/80 source-unit voxel; 102 directional extrema; convex surface triangles',hulls})+'\n');
  console.log(id,hulls.map(h=>h.length/9+' triangles').join(', '));
 }
}finally{await browser.close();}
