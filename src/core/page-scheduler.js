// One pause boundary for the authored mock unload. Installed before the stage is built, so even
// warm-up, UI, store debounce and audio-loop timers retain their remaining delay. No time spoofing.
// Native clocks below belong only to the interlude (and its checks), never to the live scene.
export const wallClock = Object.fromEntries(['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback']
  .filter(k => typeof window[k] === 'function').map(k => [k, window[k].bind(window)]));
let installed = false, paused = false, nextId = -1;
const pending = new Map();
const now = () => performance.now();
function arm(job) {
  if (paused) return;
  job.at = now() + job.left;
  const fire = (...args) => {
    if (!pending.has(job.id)) return;
    job.native = null;
    if (job.repeat) { job.left = job.delay; arm(job); } else pending.delete(job.id);
    job.fn(...(job.kind === 'setTimeout' ? job.args : args));
  };
  job.native = wallClock[job.kind](fire, job.kind === 'setTimeout' ? job.left : job.options);
}
function schedule(kind, fn, delay, args, repeat=false, options) {
  // Application callbacks are functions; preserve native string-timer semantics for unrelated callers.
  if (typeof fn !== 'function') return wallClock[kind](fn, delay, ...args);
  const id=nextId--, job={id,kind,fn,args,repeat,options,delay:Math.max(0,Number(delay)||0),native:null};
  job.left=job.delay;pending.set(id,job);arm(job);return id;
}
const cancelName = kind => kind === 'setTimeout' ? 'clearTimeout' : kind === 'requestAnimationFrame' ? 'cancelAnimationFrame' : 'cancelIdleCallback';
function cancel(id, fallback) {
  const job=pending.get(id);
  if (job) { if(job.native!==null)wallClock[cancelName(job.kind)](job.native);pending.delete(id); }
  else wallClock[fallback](id);
}
export function installPageScheduler() {
  if(installed)return;installed=true;
  window.setTimeout=(fn,ms,...args)=>schedule('setTimeout',fn,ms,args);
  window.setInterval=(fn,ms,...args)=>schedule('setTimeout',fn,ms,args,true);
  window.clearTimeout=id=>cancel(id,'clearTimeout');window.clearInterval=id=>cancel(id,'clearInterval');
  window.requestAnimationFrame=fn=>schedule('requestAnimationFrame',fn,0,[]);
  window.cancelAnimationFrame=id=>cancel(id,'cancelAnimationFrame');
  if(wallClock.requestIdleCallback) {
    window.requestIdleCallback=(fn,options)=>schedule('requestIdleCallback',fn,0,[],false,options);
    window.cancelIdleCallback=id=>cancel(id,'cancelIdleCallback');
  }
}
// Pauses nest (playtest 4, flappybreak lane): the flappy screen and the shared freeze (src/core/freeze.js: the phone's
// "flip sideways" overlay, the books, the party) each hold their own pause. A second pause used to throw, which on a
// phone turned upright mid-flappy left the turn hold half made and the stage clock stopped for good after the game
// (cat still, strokes never fading, items stuck). Now each pause returns its own release (idempotent); the page's
// callbacks resume when the last one lets go.
let holders = 0;
export function pausePageCallbacks() {
  if (holders++ === 0) {
    paused = true;
    for (const job of pending.values()) {
      if (job.native !== null) wallClock[cancelName(job.kind)](job.native);
      job.native = null; job.left = Math.max(0, job.at - now());
    }
  }
  let released = false;
  return () => {
    if (released) return; released = true;
    if (--holders > 0) return;
    paused = false; for (const job of pending.values()) arm(job);
  };
}
export const pageCallbacksPaused = () => paused;
