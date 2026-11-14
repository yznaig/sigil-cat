# Butterman (Easter egg)
Seed idea from Aaron, 2026-11-07. Not built yet.
A "Buttaman" button triggers a three-beat gag: a stick figure butters the cat.

## The gag: three scenes in a row (Aaron, 2026-11-07, decision e1107-35)
> Since e1108-03 (Aaron, 2026-11-08) each B sigil plays **one** scene, in this order (1 butter, 2 cross, 3 rise, then
> back to 1), and which scene is next is remembered per device. See docs/audio.md, "One scene per B". Since playtest-3,
> once all three have been watched to the end, every B plays scene 1 (the butter).
1. **Butter.** He walks on from one side, jumps up and slaps the butter on the cat's head at the top of the leap
   (since e1108-10, below), and walks back off the way he came.
   During this scene the cat pauses its pose cycle, and any spin eases back to the angle the scene needs.
   The cat keeps the butter afterward (the butter model state).
2. **Cross.** He walks all the way across the screen, right to left.
3. **Rise.** He slowly rises up huge in front of the whole screen, arms raised in a Y. Then his arms open a little
   wider, then wider again: three stages, like he's yelling "BUTTAMAN!" louder and louder.
   Since e1109-04 (Aaron, 2026-11-09): "it should seem like Buttaman is just very close to the camera", not a giant.
   He stays his own size right at the lens: the camera dolly-zooms to a wide 60° lens (the cat keeps its size), he
   leans in so his head comes out biggest, and his felt fibres are the cat's real fibre size (`lens`, `lean`, `drop`
   on the rise scene).
4. **Off screen early (e1109-04).** In every scene he is out of frame about 2.5 s before the clip ends
   (`offscreenLead`, rounded to the beat; the rise uses 2.0 s so the widest Y still lands). The last walk is retimed
   to fit, same steps per beat.

## How he moves: a tempoed strut (Aaron, 2026-11-07)
Comedic and deliberate, never robotic, and every motion lands on the same beat as his steps:
- He struts, shrugging a shoulder with each step.
- On the beat, he sticks his hand up (holding the butter) as he arrives.
- On the beat, he slaps the butter down on the cat's head.
- On the beat, he brings his arm down and keeps walking away.
- **The jump-slap (Aaron, 2026-11-08, e1108-10):** "maybe he could jump up instead of his arm stretching". At half
  size he can't reach, so he leaps: the butter pumped up high over his head, an anticipation crouch (squash), a
  springy leap (stretch) up first and then over so he clears the head, the slap at the top of the arc on the hit
  ("...MAN?"), a drop back to his mark and a landing squash. His arm never stretches past its length (the check
  measures it). Crouch, takeoff, landing and squash/stretch are knobs on the slap action in the config.
- Since he went half size he takes two steps per beat (`strut.stepsPerBeat`), so his gait is the same as before;
  footsteps tick on every step.
So the timeline runs on one tempo (BPM) in the config, and each action is a whole number of beats long.
Change the BPM and the whole scene speeds up or slows down together, which also makes lining up with
Aaron's audio easy. Mixamo walks are a possible base for the strut; check they can be retimed to the beat grid.

## Mixamo clips Aaron picked (fallback or base)
- **Strut Walking**: the strut.
- **Stable Sword Outward Slash**: the butter slap.
- **Victory**: arms-up pose for the rise. Not the exact three-stage Y opening, but close.

## Background cameos: a trace before anyone finds him (Aaron, 2026-11-07, e1107-40)
- On a very small random chance each tick, Butterman walks into frame far in the background (small, behind the cat),
  stays a couple of seconds, and walks back out. A rare sighting, a hint that he exists.
- Once a visitor has cast the Butterman sigil (the "B") and summoned him, the cameos stop for that visitor
  (remembered on their device).
- Chance per tick, cameo length, and the minimum gap between cameos live in the same config.

Build a basic version first. Aaron will direct the timing and staging once his audio clips are in.

## Look
- **Aaron's sheet (2026-11-08, e1108-10): `docs/reference/butterman-sheet.png`.** "his whole body should be the same
  thickness ... he should look more like this". A soft matte-black felt figure, the cat's material:
  - a big ball head, about a third of his height, sitting right on the body (no neck);
  - a simple rounded body, widest low, sloping shoulders, oval front to back;
  - arms and legs as plain round tubes of one even thickness end to end (no taper), rounded ends: no hands, no feet,
    no visible joints. The legs are a little thicker than the arms, as on the sheet, and split from the body by a
    narrow gap.
  - Side by side with the sheet: `checks/butterman/compare-sheet.png` (front, three-quarter, side, walk; `#bmlook`).
- Still a **rubber-hose tube man** (Aaron, 2026-11-07): limbs bend in smooth arcs, never at elbows or knees.
- **No leg clipping (e1109-04).** A leg leaves his body heading down (`hose.legRoot`) and bends into the stride below
  it, so its hidden top never swings out through his back or belly; the legs never touch. `checks/butterman.js`
  measures both in every walk frame (`legScan`).
- **Size (e1108-10): half of v1**, 0.24 of the cat's height in the butter and cross scenes and the cameos (`figure.height`).
  The scene-3 rise still fills the screen; that contrast is the joke.
- At that size the butter is as wide as he is tall, so he carries it high over his head (his head shows underneath).
- Cat needs two model states: regular, and with butter on its head.
- Every size is a knob in `figure` in src/butterman-config.js: height, head, arm, leg, legGap, legDepth, body.

## Butter whisper (Aaron, 2026-11-07, 23:40)
- After the butter is on the cat's head, a clip plays **really quietly** when the mouse hovers super close to the
  butter. Aaron supplies that clip too.
- Config: hover radius (small, in screen pixels around the butter), volume (low), and a cooldown so it doesn't
  restart on every mouse move. Plays once per approach: it re-arms after the pointer leaves the radius.
- iPhone has no hover: treat a finger held or dragged near the butter the same way (pointer events cover both).
  A tap on the cat still plays the normal tap sounds.

## Audio
- Aaron will record audio clips for each beat.
- Build the timing so it is easy to fine-tune: each beat's start time, duration, and audio clip
  live in one config object, not hard-coded across the animation code.
