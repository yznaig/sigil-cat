// silence-reload.js (music lane, 2026-11-15): after checks/silence.js on a phone, the next visit has no card (once per
// device). The full-screen step is answered for this visit already (sessionStorage).
const { wallClock } = await import(new URL('src/core/page-scheduler.js', document.baseURI));
const wsleep = (ms) => new Promise((r) => wallClock.setTimeout(r, ms));
const until = async (f, ms = 30000) => { const t = performance.now(); while (performance.now() - t < ms) { if (f()) return true; await wsleep(15); } return false; };
const check = (name, ok, detail = '') => __say(`CHECK ${name}: ${detail} ${ok ? 'PASS' : 'FAIL'}`);
await until(() => window.site?.stage?.loaded, 60000);
const S = window.site;
S.shell.go();
let ever = false; const t = performance.now();
while (!S.shell.revealed && performance.now() - t < 20000) { ever ||= !!document.getElementById('silence'); await wsleep(15); }
check('silence reload: not shown again on this device', S.shell.revealed && !ever && !S.silence.log.length, S.shell.log.join(' > '));
