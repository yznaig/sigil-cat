// text-reload.js: after checks/text.js, reload. The first-pickup tip stays said (once ever), nothing is revealed
// again, and the row of marks comes back the same: the sigils, then the controller.
await sleep(1200);
const A = site.achievements;
check('the pickup tip is remembered', !!store.get('tips.pickup'));
dispatchEvent(new CustomEvent('sigilcat:pickup', { detail: { id: 'tin', pointerType: 'mouse' } }));
await sleep(200);
check('so a pickup after the reload says nothing', !ui.speaking && !document.getElementById('speech').classList.contains('on'));
check('no reveal and no chime on reload', A.queued === 0 && !A.reveal && A.chimes === 0, `${A.queued} queued`);
const sigils = registry.FINDS.filter((f) => f.kind === 'sigil');
check('the row comes back: one place per sigil, then the controller', document.querySelectorAll('#marks li').length === sigils.length + 1 && !!document.querySelector('#marks li.again button[data-find=bird]'));
