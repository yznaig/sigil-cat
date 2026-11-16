// "turn silence off for sound" (music lane, 2026-11-15). Aaron: "upon opening the game for the first time on mobile, it
// should flash 'turn silence off for sound' for like 2 seconds, similar to the 'flip screen' screen" (e1115-14).
// The page plays through iOS's 'ambient' audio session (src/core/audio.js, e1107-37), so the ring/silent switch mutes
// every sound, the music too; this says so once.
// Once per device (the store), on a phone only (the shell's rule: a coarse pointer, a short side of at most 600 px).
// In the way in (src/ui/shell.js reveal): after "flip sideways" and the full-screen step, over the still-closed
// loading doors, before he pops in, so it never covers him or the room. The flip card's look: the same translucent grey
// sheet, a line drawing above one line of words. It stays `seconds`, then fades (a tap ends it sooner). No sound
// (e1112-40). Reduced motion: no fades, the bell drawn still. ?silence=0 off; under automation off unless ?silence=1.
//   site.silence.step()   resolves once it has been shown (or at once when it is not wanted)
import { css } from '../core/util.js';

export const SILENCE = { seconds: 2, fadeIn: 0.22, fadeOut: 0.3, key: 'shell.silenceTold' };

css('silence', `
.turn.silence .silence-bell { width: 96px; height: 96px; overflow: visible; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.silence-bell .bell { transform-origin: 0 -24px; animation: silence-ring 2s ease-in-out infinite; }
.silence-bell .slash { stroke-width: 2.6; stroke-dasharray: 64; stroke-dashoffset: 0; animation: silence-slash 2s ease-in-out infinite; }
.silence-bell .wave { stroke-width: 2; opacity: 0; animation: silence-wave 2s ease-out infinite; }
@keyframes silence-slash { 0%, 25% { stroke-dashoffset: 0; } 50%, 100% { stroke-dashoffset: 64; } }
@keyframes silence-ring { 0%, 50% { rotate: 0deg; } 56% { rotate: 12deg; } 64% { rotate: -10deg; } 72% { rotate: 7deg; } 80% { rotate: -4deg; } 88%, 100% { rotate: 0deg; } }
@keyframes silence-wave { 0%, 52% { opacity: 0; } 62% { opacity: .8; } 100% { opacity: 0; } }
.turn.silence.calm .bell, .turn.silence.calm .slash, .turn.silence.calm .wave { animation: none; }
.turn.silence.calm .wave { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .silence-bell .bell, .silence-bell .slash, .silence-bell .wave { animation: none; } .silence-bell .wave { opacity: 0; } }
`);

const BELL = `<svg class="silence-bell" viewBox="-40 -40 80 80" aria-hidden="true">
  <g class="bell"><path d="M-15 12V-3a15 15 0 0 1 30 0v15l5 6h-40z"/><path d="M-5 22a5 5 0 0 0 10 0"/><path d="M0 -18v-5"/></g>
  <path class="wave" d="M23 -14a20 20 0 0 1 0 22M29 -20a28 28 0 0 1 0 34"/><path class="wave" d="M-23 -14a20 20 0 0 0 0 22M-29 -20a28 28 0 0 0 0 34"/>
  <path class="slash" d="M-24 -26l48 52"/></svg>`;

export function createSilence(site) {
  const { stage, store, shell } = site, S = SILENCE;
  const calm = () => stage.reducedMotion;
  const off = stage.opt('silence') === '0', forced = stage.opt('silence') === '1';
  const log = [];
  let shown = null;
  const wanted = () => !off && (forced || !navigator.webdriver) && !!shell?.phone && !store.get(S.key);
  function step() {
    if (shown) return shown;
    if (!wanted()) return Promise.resolve(false);
    store.set(S.key, true); store.flush?.();             // told once per device, whatever happens next
    const el = document.createElement('div');
    el.id = 'silence'; el.className = 'turn silence' + (calm() ? ' calm' : '');
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.innerHTML = `<div class="turn-card">${BELL}<p id="silence-words">turn silence off for sound</p></div>`;
    document.body.append(el);
    log.push('shown'); shell?.log?.push('silence shown');
    const t0 = performance.now();
    if (!calm()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: S.fadeIn * 1000, easing: 'ease-out' });
    return (shown = new Promise((resolve) => {
      let done = false;
      const close = (how) => {
        if (done) return; done = true;
        clearTimeout(timer); el.removeEventListener('pointerdown', tapped);
        log.push(`${how} ${((performance.now() - t0) / 1000).toFixed(2)} s`);
        el.style.pointerEvents = 'none';
        const gone = () => { el.remove(); shown = null; resolve(true); };
        if (calm()) gone(); else el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: S.fadeOut * 1000, easing: 'ease-in', fill: 'forwards' }).finished.then(gone, gone);
      };
      const tapped = () => close('tapped');
      const timer = setTimeout(() => close('timed'), S.seconds * 1000);
      el.addEventListener('pointerdown', tapped);
    }));
  }
  return { step, config: S, log, get shown() { return !!shown; } };
}
