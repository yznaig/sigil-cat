# Butterman prototype
A throwaway page for the Butterman easter egg: a matte-black stick figure struts on, slaps butter on the cat's head, struts across, then rises up huge yelling "BUTTAMAN!" three times louder.
Everything runs on one tempo from one config object (`BUTTERMAN` at the top of `index.html`), so Aaron can retime it by ear once his clips arrive.

## Run it
```
cd sigil-cat-round2 && python3 -m http.server 8742
open http://localhost:8742/prototypes/butterman/            # press "Buttaman"
open http://localhost:8742/prototypes/butterman/?tune       # lil-gui panel: bpm, every action, Play, Copy config
```
Hash flags (combine with `&`):
- `#b=7.05`: freeze at beat 7.05. `#t=3.5` does the same in seconds.
- `#bpm=150`: override the tempo.
- `#rm=1`: force reduced motion.
- `#cameo=1`: force a background cameo now.
- `#log`: show the state panel.

`window.butterman` = `{ play, seek, config, state, buildSchedule, clipsReady }`. Check: `checks/two-tempos.js` plays the gag at 120 and 180 bpm and prints every action's beat and seconds.

## How to tune
**One tempo.** `bpm` sets the beat. Every `start`, `length`, `shift`, audio `offset`, caption `at`/`hold` and sub-timing (`raise`, `strike`, `settle`, `move`, `turn`, cat `ease.length`, `startle`, `captionStyle`) is in beats. Change `bpm` and the whole gag speeds up or slows down together. He takes one step per beat, so every footfall is on the beat. A walk action's `length` is its step count; strides stretch if he needs more ground to get off-screen.

**Order.** `scenes` play in array order (butter, cross, rise). To reorder the gag, reorder the array. To reorder within a scene, reorder its `actions`. With `start: 'auto'`, each scene packs right after the previous one plus `gap` beats, and each action packs right after the previous action. A number pins it (beats from the click, or from the scene's start). `shift` nudges it in whole beats and pushes everything after it; a negative shift overlaps. The packed timeline is `butterman.buildSchedule()`.

**Per action:** `length`, `easing` (a name from `EASE`), `audio`, `caption`, plus its own knobs:
- `hand-up`: `raise`, `hover`.
- `slap`: `hit`, `strike`, `settle`.
- `walk-out`: `turn`.
- Rise stages: `move`, `arms` (degrees from straight up; 28 is the Y, 50 and 80 are the wider stages), `shake`.

`catStartle` makes the cat jump on that action.

**The strut:** see `strut.*`: stride, bounce, bounceShape, lean, chinUp, kneeLift, armSwing, armRaise, armLead, contactHold, stance, shrug, shrugRoll, turnToCamera. Each line is commented.

**The cat:** the butter scene's `cat.yaw` is the angle the turntable eases to (`cat.ease`). `pauseCycle` freezes his pose cycle for that scene. He keeps the butter afterward.

**Sync:**
- Clips are scheduled on the Web Audio clock (`source.start(when, trimStart, length)`), and motion reads `audioCtx.currentTime - outputLatency - t0`.
- The fallback is `performance.now()` when audio can't start. `state.clock` says which clock ran.
- `nudge` (seconds) shifts all motion against the sound, for Bluetooth headphones.
- `metronome: true` adds a quiet tick on every beat, with an accent on each scene's first beat, so you can hear the grid.
- On iPhone, `navigator.audioSession.type = 'playback'` is set inside the click so the silent switch doesn't mute the gag. The previous type is restored when the gag ends.

**Dropping in Aaron's clips:**
1. Put the files in `audio/` exactly as recorded. Never edit them.
2. Point each action's `audio.file` at its clip.
3. Use `trimStart` / `trimEnd` (seconds into the file) to cut silence.
4. Use `offset` (beats into the action, or `'hit'`) to place the clip, and `gain` to level it.

A clip that fails to load plays a synthesized beep instead, and `state.clips` shows `fallback`. The current files are placeholder beeps from `make-placeholder-audio.py`.

## Background cameos (e1107-40)
`cameo`:
- `chancePerSecond` (checked every frame, once `minGap` seconds have passed since the page loaded or since the last cameo).
- `duration` (seconds he stands there, rounded to whole beats).
- `scale`, `depth`, `from`, `stopAt`.

He struts in small, far behind the cat, stands, about-faces and struts out, on the same beat grid. Pressing Buttaman stores `localStorage['butterman.summoned']`, and cameos stop for that visitor. Every storage read and write is in try/catch. If storage is blocked, the cameos simply keep coming. `#cameo=1` forces one.

## Upgrade path: Aaron's Mixamo clips
Not downloaded here (no login). Aaron's picks, and how each would slot into this config while the procedural rig stays the base:

| Clip | Replaces | Config it plugs into | Retime to the grid |
|---|---|---|---|
| **Strut Walking** (export "In Place") | `walkPose` in `walk-in`, `walk-out`, `cross` | per walk action: `clip: 'Strut Walking'`; the root still moves `path.S` per beat, as now | The clip holds 2 steps, so its step period is `clip.duration / 2`. Set `action.timeScale = (clip.duration / 2) / (60 / bpm)` so one step lands per beat. Find the clip time `tc` of a heel contact (the lowest foot frame). Each frame set `action.time = tc + (beat - walkStart) * (clip.duration / 2)` (mod duration), so contacts sit on whole beats. Drive `action.time` from the beat clock instead of `mixer.update` so it can't drift. |
| **Stable Sword Outward Slash** | the `hand-up` + `slap` arm | `slap.clip`, plus `clipWindup` and `clipImpact` (seconds in the clip) | `timeScale = (clipImpact - clipWindup) / ((hand-up.length + slap.hit) * 60 / bpm)`, so the windup fills the hand-up beat and the impact frame lands on the hit. Seek `action.time = clipWindup + (beat - handUp.start) * 60 / bpm * timeScale`. The butter's `Object3D.attach` hand-off stays as it is: attach the butter to the Mixamo hand bone instead of `grip`. |
| **Victory** | rise `stage-1` pose | `stage-1.clip` (hold its last frame) | Its arms-up pose stands in for the Y. The two wider stages stay procedural: after the mixer runs, rotate the shoulder bones out by each stage's `arms` (an additive layer), because Victory has no three-stage opening. |

**Caveats.** Mixamo gives a human mesh, not a stick figure. Either give it the shared matte material, or hang this page's capsules on its bones. bpm changes then only change `timeScale` and the seek formula; every start and length stays in beats.

## What makes the strut read
Applied in `walkPose` and the `strut` config:

1. **Proud walk = lean back, longer contact, high arms that lead the legs.** Source: Alan Becker, [Animating Walk Cycles](https://www.youtube.com/watch?v=2y6aVz0Acx0). For a "happy proud walk" he leans the body back, emphasizes the contact pose, brings the arms way up, and offsets them two frames ahead of the legs, "leading with his arms." Credible: Becker made *Animator vs. Animation*, the best-known stick-figure series, and draws every pose on screen. Config: `lean`, `contactHold`, `armRaise`, `armLead`.
2. **Bounce is what makes it a strut, and the double bounce is the cartoon strut.**
   - Source: Richard Williams, *The Animator's Survival Kit*, walks chapter ([CMU 15-464 course handout](https://www.cs.cmu.edu/~15464-s13/handouts/Animators_Survival_Kit_walks.pdf)). Credible: Williams was animation director of *Roger Rabbit*, and this is the standard text.
   - The handout is a scanned image I couldn't OCR here. So the specific tips below come second-hand, via students quoting the book:
     - "If the character remains 'down' at the passing position, it can give the character more bounce" ([jimi3d course blog](https://jimi3d.wordpress.com/2013/05/02/animation-assessment-2-animated-character-walk/)).
     - "Have the foot pick up fast … and have a slow put down" ([Martin Chowns course blog](https://martinchowns.wordpress.com/2015/04/28/personality-walking-ctycle/)). Chowns also filmed a strut with the contact high and the passing low, and a pause on contact.
   - Config: `bounceShape` (`double` | `strut` | `normal`), and the swing foot's fast-up/slow-down curve.
3. **Attitude comes from a contact pose that tells the whole emotion in one image, then pushing the passing pose.** Source: Dermot O'Connor, [Don't just walk: sneak, strut & stomp!](https://www.linkedin.com/pulse/dont-just-walk-sneak-strut-stomp-dermot-o-connor). Credible: a professional animator, author of the LinkedIn Learning course *2D Animation: Character & Attitude Walk Cycles*. Applied: the contact pose carries the lean-back and chin-up, and the shrug pops on landing.
4. **The passing pose is where the flavor goes; the head lags the weight shift.** Source: Erik Westlund, [Pushing Poses: basic walk cycle part 2](https://pushingposes.blogspot.com/2008/03/basic-walk-cycle-part-2.html), working page by page from Williams. Credible: an animation teacher and academic chair at an art school, citing the book's pages. Applied: high knees at passing (`kneeLift`) and the head's counter-bob.
5. **Feet must not slide, and the chest counter-moves.** Source: Jason Martinsen via [Animation Mentor](https://www.animationmentor.com/?p=45949). Credible: supervising animator at Sunrise, formerly at Blue Sky and Sony Imageworks (*Ferdinand*, *Storks*). He keeps foot translation linear to stop sliding and counter-rotates the chest. Applied: the step phase is computed from distance walked, so planted feet are fixed in the world. The shrug rolls the chest against the landing foot.
6. **Silhouette.** Source: Rob Redman, [Creative Bloq](https://www.creativebloq.com/3d/animation-basics-5-pro-tips-getting-your-character-walk-71515773). Credible: creative director of Pariah Studios. His advice: "Study silhouettes to learn how different people move." Everything here is black on cream, so only the outline reads. To keep limbs apart in the outline:
   - He is turned 0.35 rad toward the camera (`turnToCamera`), so the near and far limbs separate.
   - The arms are at their extremes on the contact poses (`armLead`).
   - The butter arm is held up like a waiter's tray, away from the body.
