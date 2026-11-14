// After gags-cakes.js: the slices eaten stay eaten, the finished cake stays gone, and baking can go on.
cat.auto=false;const C=E.box.recipe;await keepsakes.get('cake')?.worldTask;await sleep(400);
const c=keepsakes.get('cake'),arc=i=>Math.max(...i.colliderVertices.map(v=>Math.hypot(v.x,v.z)>.01?(Math.atan2(-v.z,v.x)+2*Math.PI)%(2*Math.PI):0));
check('cakes reload the first cake keeps its two slices eaten (three left, in its shape too)',c?.state.slices===2&&c.worldReady&&Math.abs(arc(c)-(.65+5.2*3/5))<.08,JSON.stringify({slices:c?.state.slices,arc:c&&arc(c)}));
check('cakes reload the finished cake stays gone',!keepsakes.has('cake-2')&&C.state.bakes===2&&C.state.finished.includes('cake-2'));
check('cakes reload the next bake would be a third cake',C.cakeId(C.state.bakes+1)==='cake-3'&&C.insideAll()===false);
await __shot('gags-cakes-reload');
