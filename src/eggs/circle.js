// The circle (the O sigil): he spins twenty times in two seconds (Aaron, 2026-11-09: so that people try to spin him
// fast themselves and find the galaxy). The spin is the page's, not the player's: it never feeds the speed the galaxy
// and the 360 watch (cat.spinTurns), so neither can fire from it.
// It leaves a selected steel splat spinning top by his feet. Tap the top: it spins, and he cannot help turning once to watch.
// The circle also spins the top (e1111-58) when it is loose on the floor: it rights itself and spins with him. A top put
// away on the shelf stays put away (a sigil does not reach into the shelf), and a charged top is already spinning.

export const CIRCLE = { turns: 20, seconds: 2, calmTurns: 2, topSpin: 6 };

export default function createCircle(site) {
  const { stage, cat, audio, keepsakes } = site;
  audio.load('whoosh');
  let spinning = false, casts = 0;
  function cast() {
    if (spinning || cat.hidden) return false;
    spinning = true; casts++;
    const top = keepsakes.get('top');
    if (top?.worldReady && !top.worldEntry?.support && !top.state.charged && top.elapsed >= CIRCLE.topSpin) site.worldProps.tap(top);
    const calm = stage.reducedMotion, turns = calm ? CIRCLE.calmTurns : CIRCLE.turns;
    // the whirr: the whoosh, slowed to fill the two seconds, with a second one rising over it
    audio.play('whoosh', { gain: 0.5, rate: 0.36 });
    audio.play('whoosh', { gain: 0.3, rate: 0.6, when: (audio.context()?.currentTime ?? 0) + CIRCLE.seconds * 0.45 });
    cat.spinTurns(turns, CIRCLE.seconds, () => {
      spinning = false;
      cat.playEmote('hop', 'circle');
      if (!keepsakes.has('top')) keepsakes.give('top', { from: cat.screenOf([0, 0.5, 0]) });
    });
    return true;
  }
  site.spells.circle = cast;

  keepsakes.define({
    id: 'top', label: 'the spinning top', kind: 'gl', size: 0.3, aspect: 1,
    home: () => ({ x: 0.8, y: -0.14 }),
    object(_site, inst) { return site.worldProps.create('top',inst); },
    place() {},
    removed(inst) { site.worldProps.remove(inst); },
    tap(inst) {
      if(inst.elapsed<CIRCLE.topSpin) return;
      site.worldProps.tap(inst);
      audio.play('whoosh', { gain: 0.25, rate: 0.5 });
      cat.playEmote('spin', 'the top');
    },
  });
  return { find: 'circle', cast, config: CIRCLE, get spinning() { return spinning; }, get casts() { return casts; } };
}
