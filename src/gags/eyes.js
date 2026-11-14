// One physical craft-shop pair. The choir owns only its finite light/show.
import {css} from '../core/util.js';
import {createPhysicalEyes} from '../world/eyes.js';
export const EYES={size:.3,aspect:.48,choir:3.2,floor:{x:.18,y:-.32}};
css('eyes', `
.choir-light { position: absolute; left: 0; top: 0; width: 0; height: 0; pointer-events: none; }
.choir-light i { position: absolute; left: -210px; top: -900px; width: 420px; height: 940px; background: linear-gradient(180deg, rgba(255, 236, 170, 0), rgba(255, 236, 170, .55) 60%, rgba(255, 240, 190, .1)); clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%); opacity: 0; transition: opacity .8s; filter: blur(6px); }
.choir-light.on i { opacity: 1; }
`);

export default function createEyes(site){
  const {stage,cat,audio,keepsakes}=site;
  audio.loadAll(['choir','rattle','tap-pop']);
  const eyes=site.eyesWorld=createPhysicalEyes(site,EYES);
  let busy=false,count=0;
  async function show(){
    if(busy||cat.hidden)return false;
    busy=true;count++;
    try {
      const i=keepsakes.get('eyes')||keepsakes.give('eyes',{at:EYES.floor});
      await i.worldTask;if(!i.worldReady)return false;
      eyes.stick('cat');await stage.after(.45);
      audio.play('choir',{gain:.55});
      const p=cat.screenOf([0,cat.height,0]),light=document.createElement('div');
      light.className='choir-light';light.innerHTML='<i></i>';
      light.style.transform=`translate(${p.x}px, ${p.y+cat.rect.ppu*.9}px)`;
      document.getElementById('back').appendChild(light);
      requestAnimationFrame(()=>light.classList.add('on'));
      await stage.after(EYES.choir);light.classList.remove('on');setTimeout(()=>light.remove(),900);
      // They stay on him (playtest 2) until they are taken off, like a hat: a tap or a pull.
      return true;
    } finally {busy=false;}
  }
  site.spells.eight=show;
  // A new pose moves his face: the eyes move with it (they used to fall off here).
  cat.onPose.push(()=>eyes.updateCatSeat());
  return {find:'eyes',config:EYES,show,get busy(){return busy;},get count(){return count;},get on(){return keepsakes.get('eyes')?.state.on??null;},again:()=>site.cast('eight')};
}
