// Focused cutscene contract; existing egg/landing checks remain unchanged.
// Run with checks/lib.js, desktop/phone, with and without --reduced.
cat.auto = false;
await until(() => stage.warmLeft === 0, 30000);
const galaxy = E.galaxy, overlay = stage.scene.getObjectByName('galaxy');
check('galaxy shader rehearsed before first play', stage.warmLog.some(s => s.includes('galaxy')));
const elements = [...document.querySelectorAll('.top > *, #footer > *, #ink, #back, #front')];
const props = ['transform', 'transform-origin', 'opacity', 'transition'];
const styles = () => elements.map(el => props.map(p => el.style.getPropertyValue(p)));
const original = JSON.stringify(styles());
const phases = {}, anchors = [], pixelRatios = [], yaw = [];
const start = stage.clock;
galaxy.open('check');
const sample = () => {
  const t = stage.clock - start;
  phases[galaxy.phase] ??= t;
  if (t > 1 && t < 4.5) {
    // Sample after the galaxy's onRender hook has updated the anchor for this frame's DPR. Compare in
    // screen pixels: adaptive DPR changes the buffer dimensions without moving the portal on the page.
    const ratio = stage.dpr;
    anchors.push(galaxy.uniforms.uHoleCat.value.toArray().map(x => x / ratio));
    pixelRatios.push(ratio); yaw.push(cat.yaw);
  }
};
stage.onRender.push(sample);
await until(() => stage.clock - start > 1.1);
// Playtest 2: the page no longer spirals into a black hole; its words fade into the dark (opacity only).
check('galaxy page fades without being stretched', elements.every(el => !el.style.transform) && input.locked
  && (!stage.reducedMotion || galaxy.uniforms.uHoleWarp.value === 0));
await until(() => galaxy.phase === 'hold', 15000);
if (stage.reducedMotion) {
  await __shot('galaxy-reduced-hold');
  check('galaxy reduced motion keeps the sky slow and cat calm', galaxy.uniforms.uHoleWarp.value === 0   // (the black hole's slowed lens went with it)
    && Math.max(...yaw) - Math.min(...yaw) < .6);
}
// Playtest 2: the way in is ~3x slower (hold from 6.6 s) and the galaxy then holds until a click.
await sleep(2500);
const stillHeld = galaxy.phase === 'hold';
const clickAt = stage.clock - start;
await tap(stage.width * .2, stage.height * .4);
await until(() => !galaxy.isOpen, 12000);
stage.onRender.splice(stage.onRender.indexOf(sample), 1);
check('galaxy tuned way in, hold until a click, recede', Math.abs(phases.hold - 6.6) < .13 && stillHeld
  && Math.abs(phases.recede - clickAt) < .2 && Math.abs(phases.closed - clickAt - 1.8) < .25, JSON.stringify({ ...phases, clickAt }));
const anchorTravel = Math.max(...anchors.map(v => Math.hypot(...v.map((x, i) => x - anchors[0][i]))));
check('galaxy portal anchor stays fixed through the spin', anchors.length > 30 && anchorTravel < .01,
  `${anchorTravel} screen pixels; buffer scale ${Math.min(...pixelRatios)}–${Math.max(...pixelRatios)}`);
check('galaxy natural return restores page and unlocks', !input.locked && JSON.stringify(styles()) === original && !overlay.visible);

galaxy.open('check');
await sleep(1200);
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
const escaped = galaxy.phase === 'recede';
await until(() => !galaxy.isOpen, 4000);
check('galaxy Escape eases out and restores styles', escaped && !galaxy.isOpen && !input.locked && JSON.stringify(styles()) === original);
const clocks = [galaxy.uniforms.uHoleClock.value, galaxy.uniforms.uDimT.value];
await sleep(1000);
check('galaxy at rest has no visible pass or advancing sky clocks', !overlay.visible
  && clocks[0] === galaxy.uniforms.uHoleClock.value && clocks[1] === galaxy.uniforms.uDimT.value);
