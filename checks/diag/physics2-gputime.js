// Physics lane: GPU time per frame of the final-cost 'twenty'/'maximum' scenes (EXT_disjoint_timer_query_webgl2),
// split into splat prop renders and the atlas pass. Diagnostic only.
const gl=stage.renderer.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
note('gpu timer available',String(!!ext));
if(ext){
const {collectFinal}=await import('/checks/world-final-collection.mjs');
let items=await collectFinal(site,{cake:false});const W=site.world,T=site.THREE;
await until(()=>!W.stats.listening&&!site.supports.listening,20000);
for(const i of items){site.supports.detach(i.worldEntry,{wake:false});i.object.visible=true;}
const ids=['rifle','top','tin','pat','eyes','twinkle','crumbs','shards','box','flour','bucket','pitchfork','recipe-flour','recipe-butter','recipe-milk','rack/wizard','rack/cone','rack/crown','bulb','controller'];
const entries=items.map(i=>i.worldEntry),mixed=ids.map(id=>W.entries.get(id));
function reset(list){for(const [n,e]of list.entries()){const row=Math.floor(n/2);W.cancelReturn(e);e.body.setTranslation({x:(n%2-.5)*1.4,y:.7+(row%4)*.22,z:-row*.9},false);e.body.setRotation(new T.Quaternion().setFromEuler(new T.Euler(n*.37,n*.13,n*.23)),false);e.body.setLinvel({x:(n%3-1)*.2,y:-.5,z:0},false);e.body.setAngvel({x:1,y:n%3,z:.7},false);W.wake(e);}}
const pending=[],sums={};let current=null;
const begin=k=>{if(current)return false;const q=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);current={q,k};return true;};
const end=()=>{if(!current)return;gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(current);current=null;};
const wrap=(obj,name,key)=>{const f=obj[name];obj[name]=function(...a){const mine=begin(key);try{return f.apply(this,a);}finally{if(mine)end();}};};
wrap(site.meshPictures,'flush','atlas');
for(const id of ['rifle','top','controller']){const e=W.entries.get(id),f=e.sync;e.sync=function(x){const mine=begin('splat:'+id);try{return f.call(this,x);}finally{if(mine)end();}};}
for(const [name,list]of [['twenty',mixed],['maximum',entries]]){
 for(const e of entries)if(!list.includes(e))site.supports.mount(e,e.id==='rack/party'?'rack':'pinboard',e.id==='rack/party'?'party':e.id,{animate:false});
 for(const e of list){site.supports.detach(e,{wake:false});e.body.setEnabled(true);e.object.visible=true;}
 for(const k of Object.keys(sums))delete sums[k];
 for(let n=0;n<120;n++){if(n%45===0)reset(list);W.step(1/60);if(n%10===9){await new Promise(r=>requestAnimationFrame(r));await sleep(30);
  for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE)){const ns=gl.getQueryParameter(p.q,gl.QUERY_RESULT);(sums[p.k]??=[]).push(ns/1e6);gl.deleteQuery(p.q);pending.splice(i,1);}}}
 }
 await sleep(200);for(let i=pending.length-1;i>=0;i--){const p=pending[i];if(gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE)){(sums[p.k]??=[]).push(gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(p.q);pending.splice(i,1);}}
 note('gpu ms per frame '+name,JSON.stringify(Object.fromEntries(Object.entries(sums).map(([k,v])=>[k,+(v.reduce((a,b)=>a+b,0)/120).toFixed(3)]))));
}
}
