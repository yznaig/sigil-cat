// Diagnostic (harp lane, music round): where the bottom-of-screen room is at this size; not in run-all.
cat.auto=false;await sleep(1500);
const r=(e)=>{const b=e.getBoundingClientRect();return b.width?[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.height)]:null;};
for(const id of ['grimoire','achievements'])document.getElementById(id).hidden=false;
note('room size',JSON.stringify({w:stage.width,h:stage.height,ins:stage.insets}));
note('room marks',JSON.stringify([...document.querySelectorAll('#marks > li')].map(r)));
note('room fl',JSON.stringify([...document.querySelectorAll('#footer .fl > *')].map(r)));
note('room fr',JSON.stringify([...document.querySelectorAll('#footer .fr > *')].filter(a=>!a.hidden).map(r)));
note('room hint',JSON.stringify(r(document.getElementById('hint'))));
const ws=E.harp.whiskers();note('room whiskers',JSON.stringify(ws.map(w=>[w.index,w.pts.map(p=>[Math.round(p.x),Math.round(p.y)])])));
note('room cat',JSON.stringify(cat.screenOf([0,0,0]))+' '+JSON.stringify(cat.screenOf([0,cat.height,0])));
await __shot('harp-room');
