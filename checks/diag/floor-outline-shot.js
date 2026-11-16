// Floor lane shots (music round 2026-11-15): the floor rows of checks/floor-outline-lib.mjs, before and after, from ONE
// page load: the outline switched off (what main draws: a picture not outlined takes the shader's old path) and on.
//   node checks/run.mjs '<url>?dpr=N' --lib checks/lib.js --js checks/diag/floor-outline-shot.js --size WxH|phone --out <dir>
//     --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}'
// Shots: before-<size>.png, after-<size>.png; an INFO line gives the floor rows' band (CSS px) for the strip's crop.
const L = await import('/checks/floor-outline-lib.mjs');
cat.auto = false;
if (cat.pose !== 'sit') { await cat.load('sit'); cat.request('sit'); stage.timeScale = 8; await until(() => cat.pose === 'sit' && cat.phase === 'hold', 20000); stage.timeScale = 1; }
const st = document.createElement('style'); st.textContent = '.ach-reveal{display:none!important}'; document.head.append(st);
const all = await L.layOut(site, MOBILE, {until, sleep});
const BD = E.bird; if (BD && BD.state !== 'waiting') { if (BD.state === 'flying') BD.leave(); await until(() => BD.state === 'waiting', 20000); }
document.activeElement?.blur(); ui.say?.(''); ui.speak?.(''); await sleep(800); await document.fonts.ready;
let top = Infinity, bottom = 0; for (const id of all) { const r = keepsakes.get(id)?.picture?.rect; if (r) { top = Math.min(top, r.y); bottom = Math.max(bottom, r.y + r.h); } }
__say('INFO band ' + JSON.stringify({top: Math.floor(top - 8), bottom: Math.ceil(bottom + 8), width: stage.width, height: stage.height, dpr: stage.dpr}));
stage.timeScale = 0;
site.floorOutline.set(false); await sleep(400); await __shot('before');
site.floorOutline.set(true); await sleep(400); await __shot('after');
stage.timeScale = 1;
__done();
