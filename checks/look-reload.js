const saved=JSON.parse(sessionStorage.getItem('look-position')),top=keepsakes.get('top'),pat=keepsakes.get('pat');await top.worldTask;await cat.ensureButter();await stage.after(.2);
check('look top and butter survive reload',!!top?.object&&!!pat?.object?.visible&&Math.abs(top.x-saved.x)<.002&&Math.abs(top.y-saved.y)<.002&&top.elapsed===E.circle.config.topSpin,JSON.stringify({saved,now:{x:top.x,y:top.y},asleep:top.worldEntry?.body.isSleeping()}));

note('props interaction restore diagnostic',JSON.stringify({before:JSON.parse(sessionStorage.getItem('look-world-pose')||'null'),after:{position:{...top.worldEntry.body.translation()},quaternion:{...top.worldEntry.body.rotation()},box:{...top.box}},footer:stage.height-stage.insets.bottom}));
note('props restore scale after',JSON.stringify({scale:top.picture.mesh.scale.toArray(),offset:top.picture.mesh.position.toArray(),unit:keepsakes.unit,width:top.w,insets:stage.insets,layout:site.world.layoutKey(),saved:store.get('worldBodies.top')}));
await __shot('world-unit3-after-interaction-reload');
