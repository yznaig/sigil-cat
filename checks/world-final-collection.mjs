// Shared final-acceptance scene. Uses production registrations, geometry and
// adapters; recipe state represents three dispensed measures before assembly.
export async function collectFinal(site,{cake=false}={}){
 const {keepsakes:K,eggs,cat}=site;cat.auto=false;
 const C=eggs.box.recipe;
 C.state.phase=cake?'revealed':'ingredients';C.state.portions={flour:true,butter:true,milk:true};C.state.contents=[];
 const ids=['cloud','top','crumbs','twinkle','postcard','rifle','paper','shards','puddle','box','eyes','rack','ticket','tin','pat','grease','flour','bucket','pitchfork',...(cake?['cake']:['recipe-flour','recipe-butter','recipe-milk'])];
 for(const id of ids)K.give(id);
 await Promise.all([...K.live.values()].map(i=>i.worldTask));await site.rack.ready();await site.shelf.ensure();
 await eggs.box.setOpen(false);C.save();
 await site.lamp.award();if(!site.lamp.inst)K.give('bulb');await site.lamp.inst.worldTask;await site.lamp.use();
 if(!K.defs.has('controller'))(await import('/src/flappy/controller.js')).defineController(site,()=>{});
 await K.give('controller').worldTask;
 return [...K.live.values()].filter(i=>i.worldEntry&&!i.worldEntry.fixed);
}
