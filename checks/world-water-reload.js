const pool=keepsakes.get('puddle'),top=keepsakes.get('top');await top.worldTask;await sleep(500);
check('water one fixed patch survives reload',document.querySelectorAll('.k-puddle').length===1&&JSON.stringify(pool.state.floor)===JSON.stringify(store.get('waterCheck')));
check('water charged reward survives reload',top.state.charged&&site.worldProps.charged.active);
await __shot('world-unit4-reload');
site.worldProps.charged.stop();
