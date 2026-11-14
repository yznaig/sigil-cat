// Shared by rigid bodies and legacy drops until their 3D conversion.
// Files, shuffle bag, 80ms/item limiter and mute/restore: docs/sound-direction.md.
const MATERIALS={top:'wood',rack:'wood',rifle:'metal',paper:'paper',postcard:'paper',ticket:'paper',box:'paper',pat:'butter',crumbs:'butter',glass:'glass',shards:'glass',tin:'tin'};
export function impactSound(id,override){
 const material=override?.material??MATERIALS[id];
 return material?{material,size:override?.size??(['top','ticket','shards','crumbs'].includes(id)?'small':'medium')}:null;
}
export function contactSound(audio,item,sound,speed,restoring=false){
 if(!sound||speed<=.18)return;
 audio.impact(item,{...sound,strength:Math.min(1,(speed-.18)/2.5),restoring,sleeping:item.body?.isSleeping()??false});
}
