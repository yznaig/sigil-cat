cat.auto=false;cat.setButter(false,'quiet');await E.bread.whenReady();await site.cast('dome');await E.bread.whenBread();await sleep(150);
// Deterministic review direction only; gameplay keeps the existing random angle.
const random=Math.random;Math.random=()=>.5;
const done=E.bread.blastOff();Math.random=random;
async function capture(ready,name){await until(ready,15000,8);stage.timeScale=0;await __shot('bread-float-'+name);stage.timeScale=1;}
await capture(()=>E.bread.flight?.u>=.015,'launch');
await capture(()=>E.bread.flight?.u>=.5,'midpoint');
await capture(()=>E.bread.flight?.u>=.88,'distant');
await capture(()=>!cat.standIn&&cat.fx.scale>.8,'return');
await done;check('bread float review shots captured',!input.locked);
