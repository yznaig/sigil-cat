// Prove the old merged sound check's shared-bag premise with actual contacts.
cat.auto=false;const W=site.world;await W.ensure();await audio.loadImpacts('paper');audio.setMuted(false);
const events=[],original=site.audio;site.audio={...audio,impact(item,options){const voice=audio.impact(item,options);if(voice)events.push({source:'world',id:item.id,at:performance.now(),file:voice.soundName});return voice;}};
const e=await W.add({id:'paper-contact-bag',object:new site.THREE.Group(),position:{x:0,y:.6,z:0},shapes:[{half:[.1,.001,.12]}],mass:.015,sound:{material:'paper',size:'medium'}});
try{
 for(let n=0;n<9;n++){const voice=audio.impact({id:'sound-bag-probe'},{material:'paper',size:'medium'});if(voice)events.push({source:'probe',at:performance.now(),file:voice.soundName});await sleep(90);}
 const all=events.map(e=>e.file),probe=events.filter(e=>e.source==='probe').map(e=>e.file);
 const cycles=a=>[0,3,6].every(i=>new Set(a.slice(i,i+3)).size===3);
 note('world sound bag shared-consumer measurement',JSON.stringify({events,worldVoices:events.filter(e=>e.source==='world').length,allFirstNineCycles:cycles(all),probeOnlyCycles:cycles(probe)}));
 check('world real contacts consume the same material bag',events.some(e=>e.source==='world')&&events.filter(e=>e.source==='probe').length===9&&cycles(all));
}finally{W.remove(e.id);site.audio=original;}
