// Physics lane: which loose meshes cost how many atlas draw calls (material groups) in the final scene.
const {collectFinal}=await import('/checks/world-final-collection.mjs');
const items=await collectFinal(site,{cake:false});
const out=[];
for(const i of items){const v=i.picture?.visual;if(!v)continue;const parts=[];v.traverse(o=>{if(o.isMesh){const ms=Array.isArray(o.material)?o.material:[o.material];parts.push({tris:(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3|0,groups:o.geometry.groups.length,mats:ms.map(m=>m.type+(m.map?'+map':'')+(m.emissive&&m.emissive.getHex()?'+emis':'')+(m.transparent?'+tr':'')+(m.vertexColors?'+vc':'')+(m.isShaderMaterial?'+shader':'')).join('|')});}});out.push([i.id,i.picture.constructor?.name,parts]);}
note('atlas parts',JSON.stringify(out));
