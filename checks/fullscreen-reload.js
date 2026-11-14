// fullscreen-reload.js (fullscreen lane, playtest-3): after fullscreen.js?case=api chose full screen, a reload in the
// same visit (the browser leaves full screen on a reload) does not ask again; the button is there to go back in.
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(25); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
await until(() => window.site?.stage?.loaded, 60000);
const { shell, fullscreen: F } = window.site, b = document.getElementById('fs-toggle');
shell.go();
await until(() => shell.revealed, 15000); await wsleep(300);
check('fullscreen reload in the same visit: no second step, the button ready ("full screen")', shell.log.join(' > ') === 'pop > doors > revealed' && !document.getElementById('fs-step') && !F.active &&
  !!b && !b.hidden && b.getAttribute('aria-pressed') === 'false' && sessionStorage.getItem('sigilcat.fullscreen.asked') === 'chosen', shell.log.join(' > '));
