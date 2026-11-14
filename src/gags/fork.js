// Unit 8 handoff: the world adapter listens for this cancelable event and prevents the placeholder sparkle.
import { css } from '../core/util.js';
css('fork', `.fork-spark {position:fixed;pointer-events:none;z-index:5;color:#d9ae45;font:30px Georgia;transform:translate(-50%,-50%);}`);
export default function createFork(site) {
  site.spells.fork = (info={}) => {
    const event=new CustomEvent('sigilcat:fork',{cancelable:true,detail:info});
    if(!dispatchEvent(event))return;
    const at=info.stroke?.at(-1) || site.cat.screenOf([0,.75,0]);
    const spark=document.createElement('span');spark.className='fork-spark';spark.textContent='✧';spark.ariaHidden='true';
    spark.style.left=at.x+'px';spark.style.top=at.y+'px';document.body.append(spark);
    spark.animate([{opacity:1},{opacity:0}],{duration:600}).finished.then(()=>spark.remove());
  };
  return { find:'fork', again:()=>site.cast('fork') };
}
