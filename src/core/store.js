// Saved state: everything the page remembers on this device, in one JSON value in localStorage. Every read and write
// is in try/catch, so a private window or blocked storage only means nothing sticks. Other tabs are not synced.
//   store.get('sound.volume', 0.8)   store.set('keepsakes.cloud', { x: 0.2, y: 0.1 })   store.del('keepsakes.cloud')
const KEY = 'sigilcat.v2';
let data = {};
try { data = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { data = {}; }

// The first build kept a few loose keys; bring them along once so an early visitor keeps their bonks and sigils.
if (!data.migrated) {
  const old = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const bonks = Number(old('sigilcat.bonks'));
  if (bonks > 0) data.bonks = bonks;
  try {
    const NAMES = { butter: 'butter', circle: 'circle', zigzag: 'bolt', star: 'star', triangle: 'loaf' };
    for (const s of JSON.parse(old('sigilcat.sigils') || '[]')) if (NAMES[s]) (data.found ??= {})[NAMES[s]] = 1;
  } catch { /* nothing to bring */ }
  if (old('butterman.buttered') === '1') (data.butterman ??= {}).buttered = true;
  if (old('butterman.summoned') === '1') (data.butterman ??= {}).summoned = true;
  const next = Number(old('butterman.next'));
  if (next > 0) (data.butterman ??= {}).next = next;
  data.migrated = 1;
}

let timer = 0, stopped = false;
function save() {
  if (stopped) return;
  clearTimeout(timer);
  timer = setTimeout(flush, 150);          // a drag writes many times a second; one write when it settles
}
function flush() { clearTimeout(timer); if (stopped) return; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* blocked */ } }
addEventListener('pagehide', flush);

const walk = (path, make) => {
  const keys = path.split('.');
  let o = data;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') { if (!make) return [null, null]; o[keys[i]] = {}; }
    o = o[keys[i]];
  }
  return [o, keys[keys.length - 1]];
};
// store.watch(fn): fn(path, value) after every set (the achievements read state from what the page saves).
const watchers = [];
export const store = {
  get(path, fallback = null) { const [o, k] = walk(path, false); return o && o[k] !== undefined ? o[k] : fallback; },
  set(path, value) { const [o, k] = walk(path, true); o[k] = value; save(); for (const f of watchers) f(path, value); return value; },
  watch(fn) { watchers.push(fn); return () => watchers.splice(watchers.indexOf(fn), 1); },
  del(path) { const [o, k] = walk(path, false); if (o) { delete o[k]; save(); } },
  flush,
  // Forget everything (the grimoire's "start over" and the checks).
  reset() { data = { migrated: 1 }; flush(); },
  // Start over for real (the grimoire, e1112-39): wipe, then never write again on this page, so nothing still running
  // (a keepsake saving its place on the way out) can put any of it back before the reload.
  wipe() { data = { migrated: 1 }; flush(); stopped = true; },
  get all() { return data; },
};
