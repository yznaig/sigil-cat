// Original procedural cellulose sponge: shaded pores, damp green lower face.
// The same canvas follows mouse and touch; no external image or cursor dependency.
import { css } from '../core/util.js';
css('sponge', `
html.wiping, html.wiping body, html.wiping body * { cursor: none !important; }
.wipe-sponge { position:fixed; left:0; top:0; width:58px; height:42px; z-index:50; pointer-events:none; filter:drop-shadow(1px 3px 2px #362b243b); transition:opacity .18s; }
`);
export function sponge() {
 const cv=document.createElement('canvas'); cv.width=174; cv.height=126; cv.className='wipe-sponge';
 const g=cv.getContext('2d'); g.scale(3,3);
 const side=g.createLinearGradient(0,20,0,41); side.addColorStop(0,'#64715a'); side.addColorStop(1,'#293d32');
 g.fillStyle=side; g.beginPath(); g.roundRect(3,13,52,27,5); g.fill();
 const top=g.createLinearGradient(0,2,45,32); top.addColorStop(0,'#f1dea1'); top.addColorStop(.55,'#ccb66f'); top.addColorStop(1,'#9b894c');
 g.fillStyle=top; g.beginPath(); g.roundRect(3,3,52,28,5); g.fill();
 g.save(); g.clip(); let seed=91; const rnd=()=>((seed=seed*16807%2147483647)/2147483647);
 for(let i=0;i<560;i++) {
  const x=3+rnd()*52,y=3+rnd()*28,r=.2+rnd()*1.1;
  g.fillStyle=`rgba(80,63,26,${.08+rnd()*.3})`; g.beginPath();g.ellipse(x,y,r,r*.65,0,0,7);g.fill();
  g.strokeStyle='#fff3c340';g.lineWidth=.35;g.beginPath();g.arc(x,y+.3,r,0,Math.PI);g.stroke();
 }
 g.restore();
 for(let i=0;i<160;i++) {g.fillStyle=i%4?'#172f242d':'#b6c5a76b';g.fillRect(5+rnd()*48,32+rnd()*6,.5,.6);}
 let timer; const hide=()=>{document.documentElement.classList.remove('wiping');cv.style.opacity=0;clearTimeout(timer);timer=setTimeout(()=>cv.remove(),200);};
 return { move(e) {clearTimeout(timer);if(!cv.isConnected)document.body.appendChild(cv);document.documentElement.classList.add('wiping');cv.style.opacity=1;cv.style.transform=`translate(${e.clientX-29}px,${e.clientY-21}px) rotate(-12deg)`;},hide };
}
