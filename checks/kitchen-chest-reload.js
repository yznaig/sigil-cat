// After kitchen-chest.js and a reload: the chest's contents and the inventory's order are kept; nothing duplicates.
cat.auto=false;await Promise.all([...keepsakes.live.values()].map(i=>i.worldTask));
const C=E.box.recipe,saved=store.get('kitchenCheck'),ids=C.state.chest.map(e=>e?.id||null);
check('chest contents survive a reload exactly',saved&&JSON.stringify(ids)===JSON.stringify(saved.chest),JSON.stringify(ids));
check('chest items in the chest stay out of the room',ids.filter(Boolean).every(id=>!keepsakes.has(id)));
check('chest the baked cake stays in the room, revealed',C.state.phase==='revealed'&&keepsakes.get('cake')?.worldEntry?.canGrab);
check('chest the box is closed after a reload',C.state.open===false&&!C.screen.isOpen&&keepsakes.get('box').hinge.rotation.x===0);
await C.openChest();await until(()=>C.screen.isOpen,3000);await sleep(200);
const pics=[...C.screen.root.querySelectorAll('.chest-slot[data-kind=chest] img:not([hidden])')].length;
check('chest items in the chest keep their pictures after a reload',pics===ids.filter(Boolean).length,`${pics}`);
check('chest inventory order is kept',Object.entries(saved?.inv||{}).every(([id,s])=>!keepsakes.has(id)||C.state.inv[id]===s),JSON.stringify(C.state.inv));
await __shot('kitchen-chest-reload');await C.screen.close();
