// The whole page held still, for as long as anything asks: the pop-up books, the "flip sideways" overlay, the cake's
// crash screen. One hold stops every per-frame cost and the clock with it: the render loop, the physics, splat
// sorting and every timer (all run off the page scheduler, src/core/page-scheduler.js), the sound (the audio clock
// stops, so nothing scheduled plays late), and running CSS animations. Nothing is unloaded that costs a download:
// splats, models, textures and sounds all stay, so letting go is instant and every item is exactly where it was.
//   const release = site.freeze.hold('book')   ...   release()        (holds nest; the last release resumes)
//   site.freeze.frozen                                                 true while anything holds
//   site.freeze.onViewport(fn)                                         fn() on every window resize, frozen or not
// A resize while frozen is not applied (the page would lay itself out for a screen nobody sees, e.g. a phone held
// upright under the overlay); it is applied once, on the release.
import { pausePageCallbacks } from './page-scheduler.js';

export function createFreeze(site) {
  const { stage, audio } = site;
  const holds = new Set(), viewport = [];
  let resume = null, resumeAudio = null, animations = [], resized = false, pinned = null;
  // Registered before anything else listens (main.js builds this right after the stage): a capture listener on the
  // window runs first, so while frozen no other resize handler sees the event at all.
  addEventListener('resize', (e) => {
    for (const f of viewport) { try { f(); } catch (err) { console.error(err); } }
    if (holds.size) { resized = true; e.stopImmediatePropagation(); }
  }, true);

  function hold(reason) {
    if (holds.has(reason)) return () => release(reason);
    holds.add(reason);
    if (holds.size === 1) {
      resume = pausePageCallbacks();
      resumeAudio = audio.suspend('freeze');
      animations = document.getAnimations().filter((a) => a.playState === 'running');
      for (const a of animations) a.pause();
      stage.holdLayout(true);
      // The canvas keeps its own size while the window changes under it (no squashed picture behind an overlay).
      const c = stage.canvas;
      pinned = { w: c.style.width, h: c.style.height };
      c.style.width = stage.width + 'px'; c.style.height = stage.height + 'px';
    }
    return () => release(reason);
  }
  function release(reason) {
    if (!holds.delete(reason) || holds.size) return;
    const c = stage.canvas;
    if (pinned) { c.style.width = pinned.w; c.style.height = pinned.h; pinned = null; }
    for (const a of animations) if (a.playState === 'paused') a.play();
    animations = [];
    // The first frame back runs at dt = 0: the stage's last timestamp is from before the hold, and no step may
    // swallow the whole time away (no 100 ms jump in the physics, no skipped tween).
    const scale = stage.timeScale; stage.timeScale = 0;
    const rebase = () => { stage.timeScale = scale; const i = stage.onFrame.indexOf(rebase); if (i >= 0) stage.onFrame.splice(i, 1); };
    stage.onFrame.push(rebase);
    const r = resume, a = resumeAudio; resume = resumeAudio = null;
    r?.(); a?.();
    stage.holdLayout(false);
    if (resized) { resized = false; dispatchEvent(new Event('resize')); }
  }
  return {
    hold, release,
    get frozen() { return holds.size > 0; }, get reasons() { return [...holds]; },
    onViewport(fn) { viewport.push(fn); },
  };
}
