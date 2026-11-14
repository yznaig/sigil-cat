# Sigil Cat: master spec
Every request and aim Aaron has given for the site (Nov 7-9, 2026), organised by feature, with what exists today.
The baseline for the revamp: read this first, then follow the source map (§9) for detail.

**How to read it**
- Status tags: **BUILT** (on `main`, passing `checks/run-all.sh`), **PARTLY**, **NOT BUILT**, **DROPPED**.
- Quotes are Aaron's own words (typos kept). Ids like `e1108-35` are his recorded decisions; dates are 2026-11-xx.
- When his asks changed over time, the latest is stated and the older one is marked replaced.
- "Suggestion:" marks an idea that is not Aaron's. Everything else traces to Aaron, his brother, or the code.

## 0. State at a glance (2026-11-09)
> **After the rebuild (unit 1 of `docs/revamp-brief.md`, same day):** the page was rewritten around the splat cat.
> The list below and the status tags in §3 and §4 describe the build before it. Now built and passing
> `checks/run-all.sh`: N1, N2 (on Aaron's new clip), N4 (keepsakes), N5, N6, N7, N9 (CC0 recordings), N11, N12, gags
> 1-8 of `docs/ideas/gags-round2.md`, and the "Hush" look in place of the 1999 footer. The mesh cat and `#cat=mesh`
> are gone. Still open: N3 (the video), N8 (a real iPhone), N10 (links). What Claude invented, for Aaron's veto:
> `docs/REVIEW.md`.

- One page. A small black felt cat floats in the middle; you spin him, tap him, and find his secrets.
- The cat is 4 still Gaussian-splat poses that **pop** into each other (`e1108-35`). The old rigged mesh cat still
  loads hidden, for its skeleton and timings, and is reachable with `#cat=mesh`.
- Eggs built: sigil spells + grimoire, Butterman (3 scenes, Aaron's audio), hole in the universe (galaxy cutscene),
  loaf → bread, 360 no-scope, the bolt, 1999 footer with bonk counter.
- **Nothing is live.** The public remote holds 1 commit (the old starter shelf); `main` is 138 commits ahead, unpushed.
- **Never seen on a real iPhone.** All checks run in headless Chrome with software WebGL.
- Every sound except Aaron's Butterman clips is a synthesized placeholder.
- Egg shader warm-up (`e1109-05`) is merged: first plays no longer freeze, but two ~0.6-0.9 s pauses now land 2-4 s after he appears (N7).

## 1. Vision and aims
**The frame** (Aaron, 2026-11-08):
> "we wanna make a fun gadget website, with the olden days as our predecessors, our goal is to create a modern art piece"
> "a fun gadget website *experience*"

- An *experience*, not a shelf of trinkets: surprises that unfold the longer you play; something you show a friend.
- Lineage: the classic novelty web (zombo.com, hampster dance, 1999 home pages, 88×31 badges, webrings, hit
  counters) and 1930s rubber-hose cartoons. "brain rot" gags, Easter eggs, trinket buttons.
- Old-web soul, modern craft: smooth 3D, careful timing and sound, polish in the details.
- Started as: "a widget website, like a goofy trinket website" (2026-11-07).

**Who it's for:** Aaron, his brother, their friends; mobile first in practice (Aaron's phone is an iPhone, `e1107-38`).

**Taste rules Aaron has stated**
| Rule | Aaron's words / source |
|---|---|
| No clipping, ever | "We don't want shapes clipping into each other. We want clean connections" (11-08); Butterman's legs (`e1109-04`) |
| Matte black felt / flocked foam look | "matte black sort of color", "microphone filter texture", "foam texture" (11-07/08); match the brothers' sheet |
| Springy, rubber-hose motion | "kind of a springy Mickey Mouse sort of vibe"; "right now they're really quite stiff" (11-07) |
| Tasteful pop, not morphing | "a satisfying / tasteful kind of pop movement" (11-09, `e1108-31`) |
| Comedic but deliberate timing | "not be robotic, but all very tempoed" (Butterman, 11-07) |
| Secrets are found, not handed out | "so theres some trace of buttaman before anyone finds him"; grimoire must not give shapes away (11-09) |
| High quality, not slop | "really high-quality render"; "resources that aren't just AI slop" (11-07) |
| Runs smoothly | "the website running smoothly and many animations"; "make this work cleanly while keeping the website running smoothly" (11-08) |
| Ambitious, not scoped in | "Don't let the research scope you in"; "Think outside of the box" (11-07) |

From `docs/ideas/vision.md` (Claude's reading of the frame, kept as a rule): weird on purpose, never sloppy; every
gag lands cleanly; one silly idea done with total commitment.

**Palette and type** (from the sheet and the code): Sigil Black `#121212` on Bone Beige `#F7EDE3`; butter accent
`#f3d36b`; pixel font Silkscreen for UI text.

## 2. People and roles
- **Aaron (owner):** sets direction, judges every look, records the audio (he sings Butterman's theme), picks splats.
- **His brother:** supplied the character sheet and pose sheets (the look's source of truth) and wrote the original brief.
  Edits in github.dev, pushes straight to `main`, no PRs (`e1107-38`).
- **The brother's original brief** (`docs/ideas/brother-brief.md`): "a single page site of this little cat character";
  "floating in the middle of the screen"; swipe or drag to rotate; "click on him and it makes a handful of different
  sound effects"; "some basic links to social pages at the bottom".
- **Claude sessions:** build in their own git worktrees and merge to `main` locally. Push only on Aaron's word (`e1107-33`).

## 3. The experience, feature by feature

### 3.1 The page — BUILT
- One page (`index.html`); the cat is the page; the old shelf home page is retired.
- Cat centred in the space above the footer. Top-left mark, top-right hint "drag to spin · tap him" (fades after a drag).
- "summoning the cat…" while loading; he fades in.
- Files: `index.html`, `src/main.js` (wiring), `src/config.js` (sounds, footer, counter, cat mode), `src/input.js`.

### 3.2 The cat's look — BUILT (splat cat)
**Requirements**
- Match the brothers' sheet: `docs/reference/character-sheet.png`, pose sheets in `docs/reference/poses/`.
  Chibi: head about half his height, tiny body, nub paws, soft round ears, three thick curved whiskers per side,
  **no face**, matte felt grain (`e1107-44`).
- Baked-in lighting is fine for the splat cat (`e1108-32`).
- **Fully opaque**: no see-through, e.g. whiskers showing through the head (`e1109-03`, which corrected `e1109-01`).
- **Same face direction after every pop** (`e1109-01`).
- Shadow under him: 20% bigger and a little darker in the centre (Aaron, 11-09) — BUILT (`shadowScale 1.2`, `shadowOpacity 0.22`, `src/cat.js`).

**Current state**
- Four Idol splats, 64k Gaussians each, ~0.95 MB `.spz` each: `assets/splats/{sit,loaf,sleep,stretch}.spz`.
- Aaron's picks: sleep and stretch from the first round ("the sleep splat came out perfect", "the stretch looks great"),
  **loaf-6**, **sit-12** (from his side-profile image `docs/reference/poses/sit-side-profile.png`) (`e1109-02`, `e1109-03`).
- Facing: `tools/splats/bake.py` turns each pose until its ear tips run square to the camera.
- Solid: a hidden opaque shell 3 voxels under each pose's surface (`tools/splats/solid.py`).
- Splats are made by Idol (single image → splat). Aaron picks each pose himself from a preview page; sessions don't
  auto-pick (`e1109-02`): `prototypes/splats/pick.html`, more candidates with `tools/splats/more.sh`.
- Mesh-cat look history (texture presets, creases, AO) lives in `docs/ideas/cat-look.md`; it only matters for `#cat=mesh`.

**Open:** whiskers are thin, faint splats; inside the galaxy they show as pale stubs (REVIEW.md, Galaxy).

### 3.3 Poses, the pop, and the cycle — BUILT (one new change NOT BUILT)
**Poses:** sit, loaf ("lie down"), sleep, stretch. Still frames, no morphing (`e1108-35`).
> "its 4 still frames for each pose, but they could be linked together in a tasteful/stylized way" (11-09)

**The pop** (`e1108-31`)
- Idle: "just be kind of floating in the air like a bouy faintly". No rise.
- Change: "shake slightly before the pop and reposition". Old pose blinks out, next springs in big and wobbles to size.
- Built: `src/splatcat.js`, knobs `SITE.cat.splat.pop` and `.buoy` in `src/config.js` (1.5 s; shake for the first 42%).
- **NEW (11-09), NOT BUILT:** no shake for loaf → sleep or sleep → loaf, "since theyre so close in shape". See §4 N1.

**The cycle** (latest: Aaron, 11-09, replaced his 11-07 transition table)
> "the cat lies down, the cat goes to sleep, the cat wakes up = goes back into loaf, and then stretches, and then sits,
> or sometimes the cat just loafs and then gets back up. Or the cat could just stretch on its own." … "a tiny bit slower"
- Paths: sit → loaf → sleep → loaf → stretch → sit; sit → loaf → sit; sit → stretch → sit.
- Holds (s): sit 6-12, loaf 5-10, sleep 10-18, stretch 3-5; about a fifth longer than before. BUILT.
- Where: `CONFIG.cycle` in `src/cat.js`; diagram in `docs/ideas/cat-poses.md`; `checks/site.js` runs 2000 steps.

**Emotes on site actions** (Aaron 11-07: "maybe it could do the emotes when different actions are taken on the
website") — PARTLY: hop, startle, spin and wake exist (whole-body moves on the splat cat). No fuller list was ever given.

### 3.4 Handling him: spin, tap, hop — BUILT
- **Spin: left-right only**, a turntable around the vertical axis (`e1107-36`; replaced the brother's "pretty much any
  axis"). Drag on desktop, swipe on phone; flicks coast. After 2.5 s idle he eases back to his home angle (`returnHome`).
- **Tap:** a random sound from a pool, never the same twice in a row, ±6% pitch; 1 in 50 is a "RARE BONK"; a hop or a
  spin; tapping him asleep wakes him. Sounds are placeholders (`SITE.sounds.tap`, `src/config.js`).
- Bonk milestones 10/100/500/1000 get a title and a spin (footer, §3.13).
- iPhone silent switch mutes tap sounds; Butterman plays anyway (`e1107-37`).
- Where: `src/cat.js` (`CONFIG.rotate`, `CONFIG.cycle.actions`), `src/input.js`, `src/main.js`.

### 3.5 The butter and the butter whisper — BUILT
- Two cat states: plain, and with "a little cube or slab of butter" on his head (Aaron, 11-07).
- Butterman's scene 1 slaps it on; it stays, also on later visits (`butterman.buttered` in localStorage).
- The butter sits on the crown of each pose and moves with each pop (`e1109-01`; `SITE.cat.splat.butter`).
- **Whisper** (Aaron, 11-08): "an audio really quietly plays when your mouse hovers super close to the butter".
  Built: one whispered line of his `Buttaman_quiet` clip per approach, 34 px radius, −30 dB; re-arms when the pointer
  leaves; a held or dragged finger counts on iPhone. Silent switch mutes it. Knobs: `whisper` in `src/butterman-config.js`.
- **NEW (11-09), NOT BUILT, replaces the one-line-per-approach version:** a vicinity effect. Aaron: "it should be
  unhearable, and then very quiet when you move your mouse close to it, like a vicinity thing, maybe it could just be
  constantly playing at 0 volume on loop until you move close." The clip loops silently the whole time the butter is
  on; its volume follows how near the pointer is to the butter, fading in and out smoothly, and stays very quiet even
  at its closest.
  Done when: with the pointer far away nothing is audible; moving toward the butter fades the whisper in with no click
  or restart, and away fades it out; the loop never audibly restarts; a held or dragged finger does the same on iPhone.

### 3.6 Sigils (draw to cast) — BUILT (one change NOT BUILT)
- Aaron's pick (`e1107-39`). Draw one stroke on the empty space around him; a $1 Unistroke recognizer names it.
- A stroke that starts on the cat spins him; a near-straight sideways swipe beside him flings him; a miss crumbles to
  dust with a fizzle; a cast glows once and sinks into him. Toast: "✶ NEW SIGIL: … (n/5) ✶".
- The five:

| Sigil | Grimoire name | Does | State |
|---|---|---|---|
| B | B for Butter | next Butterman scene (§3.8) | BUILT |
| Circle ("the O") | The Circle | one hop with a full turn | BUILT, to change: §4 N6 |
| Zig-zag | The Bolt | a bolt from the sky; he jumps | BUILT (Claude's pick; Aaron now builds on it) |
| Star | The Star | hole in the universe takeover (§3.9) | BUILT |
| Triangle | The Loaf | loaf → bread now (§3.10) | BUILT, shape to change: §4 N11 |

- **NEW (11-09):** "The O sigil is rather lackluster": 20 spins in 2 seconds, which must not open the galaxy. §4 N6.
- Where: `src/sigils/` (`spells.js`, `templates.js`, `recognize.js`, `dollar.js`); `checks/sigils.test.mjs`, `checks/sigils-page.js`.

### 3.7 The grimoire — BUILT (one change NOT BUILT)
- `spellbook.html`. Linked from the footer ("✶ grimoire") after the first sigil is found.
- Heading: "sigils of the cat. draw them on the empty space around him, in one stroke. the dot marks where the pen starts."
- Found sigils show their shape, a start dot, name and effect; tally "N of 5 found on this device" (localStorage).
- **Today unfound sigils are drawn blurred** (`.card.unknown svg { filter: blur(5px) }`). Aaron (11-09): "The grimoire
  needs to not show the blurred version of the sigils cause then someone immediately knows how to do them". §4 N5.

### 3.8 Butterman ("Buttaman") — BUILT (scene 2 to be redone)
Aaron's own gag (11-07): "a little stick figure guy that is the same color and the same texture as the cat. He'll walk
across the screen and then put a piece of butter on the cat's head." He writes "Buttaman"; the code says Butterman.

**Trigger:** the B sigil. **Each B plays one scene, in order** 1 → 2 → 3, remembered per device (`e1108-03`;
replaced "three things in a row" per press, `e1107-35`). Once all three have been watched to the end on the device, every
B plays scene 1, the butter (playtest-3: "so they can get butter without having to listen to every B scene"). A B mid-scene does nothing. The POWERED BY BUTTER badge only
gives hints.

**Scenes**
| # | Aaron's ask (latest) | Current state |
|---|---|---|
| 1 Butter | walk on, "slapping the butter on the cat's head, and then walking back the way he came" (`e1107-35`); jumps up to slap instead of stretching his arm (`e1108-10`). Cat pauses its cycle and drifts back to position. | BUILT. 26 s, his theme take 1. Hand up on "What's the BUT-ter man", slap on "…MAN?" at the top of a leap. |
| 2 Cross | **NEW (11-09):** walk to the middle, loop around the cat, stand in the open, stand still for the last second of the audio, then "instantaneously pop out of existence at the end of the audio". New audio coming. Replaces "walking all the way right to left" (`e1107-35`). | BUILT as the old ask (right-to-left strut over take 2, 23 s). New version NOT BUILT: §4 N2. |
| 3 Rise | rises "really big in front of the whole screen", arms in a Y that opens wider in three stages, "like he's yelling louder and louder" (`e1107-35`). Latest: "it should seem like Buttaman is just very close to the camera", not a giant (`e1109-04`). | BUILT. 11 s yell. Dolly-zoom to a 60° lens, he leans in at the lens; arm spread follows the yell's loudness per stage (28°, 70°, 84°). |

- **Off screen early** (`e1109-04`): "he should already be off screen shortly before the audios end, maybe 2-3 seconds
  before". BUILT for all scenes (2.5 s; rise 2.0 s so the widest Y lands). Scene 2's new ask replaces this for scene 2.

**Look** (latest `e1108-10`, his sheet `docs/reference/butterman-sheet.png`)
- "a rubber tube stick man, all connected, all one congruent shape" (11-08); "his whole body should be the same thickness".
- Ball head ~⅓ of his height, rounded body, plain even tubes for limbs, rounded ends, no hands or feet, no joints.
- Limbs bend in smooth arcs, never at elbows or knees. Legs never clip through his body (`e1109-04`; checked per frame).
- **Size:** "much, much smaller" (11-08), then "50% even smaller" (`e1108-10`): 0.24 of the cat's height now.
- Same felt as the cat; fibres at the cat's real fibre size.

**Motion:** a comedic, tempoed strut on one BPM grid (`e1107-39`):
> "He kind of shrugs his shoulder with each strut and then comedically kind of puts his hand up and then slaps down
> the butter. … At the same speed he takes steps, he should stick his hand up."
- Built: every action is a whole number of beats; each scene has its own BPM measured from Aaron's singing, and the
  beat grid bends to follow where he sped up or slowed down. Two steps per beat at half size.
- Mixamo clips Aaron named (Strut Walking, Stable Sword Outward Slash, Victory) are a fallback only; not used.

**Audio sync** (Aaron 11-08: "faithfully sync them to the audio lengths", loudness drives the 3 Y stages)
- Clips (`assets/audio/butterman/`): theme-song-1 (scene 1), theme-song-2 (scene 2), rise-yell (scene 3), whisper.
  > "they are me singing, it is essentially buttamans theme song, and then 3 is a climactic rising 'BUTTAMAAAAAN'"
- Lyric captions on screen. No step sounds: "butterman doesnt need step sound effects" (`e1109-01`; code kept, off).
- Full method and numbers: `docs/audio.md`. Knobs: `src/butterman-config.js`. Check: `node checks/butterman-audio.mjs`.

**Background cameos** (`e1107-40`) — BUILT
- "walk around really far in the background, like Walk into frame for a couple of seconds and then walk out" at a small
  random chance, "so theres some trace of buttaman before anyone finds him".
- They stop for good on that device once the visitor has summoned him. Now (playtest-2, "a good bit rarer"): at least
  5 min apart (and 5 min after the page loads), then 1/240 per second: about one every 9 minutes.

**The encore** (playtest-2) — BUILT
- > "buttaman walking into the middle of the screen, raising his arms, then the buttaman ticket falls from the sky and
  > lands right behind him, and then he walks off, and the player should only be able to see the scene one time ever."
- The whisker harp's tune plays it once ever (`butterman.encoreSeen` in the saved state); the ticket stays as a
  keepsake and no longer replays it. The harp's Encore achievement is the only achievement for it (e1112-38).

Where: `src/butterman.js`, `src/butterman-config.js`; check `checks/butterman.js`; sheets `checks/butterman/`.

### 3.9 Hole in the universe / galaxy — BUILT
Aaron's pick (`e1107-39`): his matte-black body becomes a window onto space.
- **Triggers:** the star sigil, or keep him spinning fast (above 8 rad/s for 2 s in total). Only *player* spins should
  count (11-09, see §4 N6).
- "a much more extravagent high quality universe" (11-08): nebula gas, temperature-coloured stars, a spiral galaxy,
  Windows-Starfield warp streaks when he spins fast, gold burn-in edge, violet knit-back. BUILT.
- **The splat cat stays** in the hole (no swap to the old mesh) and is **frozen in the pose he had** (`e1109-01`). BUILT.
- **Portal, not a skin** (11-09): "could we have the cat be a portal into the galaxy texture, rather than the galaxy
  texture spinning with the cat? Like how the minecraft end portal doesnt move". BUILT: the sky is fixed to the screen.
- **Cutscene takeover** (11-09, replaced 11-09's earlier "tap to end"):
  > "once the cat spins quick enough, the player loses control of it, it keeps spinning really fast as the galaxy
  > takes over, and slowly naturally comes to rest, the galaxy stays for a bit, and then it recedes to the normal page."
  - Built: all input swallowed; spins at 14 rad/s, winds down over 5 s, galaxy holds 3 s, recedes 1.8 s (~10 s).
  - The page dims "in a spacial/black hole kind of way": dark closes in from the edges; text and badges swirl in.
  - **Black-hole background (11-10):** a dark centre surrounds the portal, with gravitationally bent stars,
    a tilted, temperature-coloured accretion disk, a brighter approaching side, lensed disk images, a photon
    ring and a restrained cyan edge. Gas spirals inward and rotates faster near the centre. Page elements
    stretch tangentially and compress radially as they spiral in. Steady emission; no flashes or exposure pulses.
  - Esc still ends it early (Claude's pick; open question).
- Low drone while open (placeholder synth). `prefers-reduced-motion`: no warp or page deformation, smooth
  face-on landing without the wild spin, 30% sky clock; the black-hole disk/lensing runs at 10.5% normal speed.
- Where: `src/eggs/galaxy.js` (`GALAXY`, `GALAXY.cutscene`); checks `checks/play.js`, `checks/look-landing.js`,
  `checks/galaxy.js`; sequences `docs/shots/galaxy-{start,spin,peak-swirl,hold,recede}-{desktop,phone}.jpg`.

### 3.10 Loaf → bread — BUILT
Aaron's pick (`e1107-39`): when he settles into the loaf he turns into a literal loaf of bread for a beat.
- 15% of loaf holds, 1.5 s in, at most once per 2 min; 1.2 s as bread; tap the bread to undo; triangle sigil forces it.
  Butter rides on the bread. (Rates are Claude's; Aaron never set them.)
- "The bread should be hyper realistic, lets do a splat of a loaf of bread aswell, wonderbread" (11-09). Aaron then
  supplied images and picked **bread-2** (a golden scored loaf): `assets/splats/bread.spz`. BUILT.
- **Source of that image is unconfirmed** (§6). Fallback: the code-built loaf (`LOAF.model: 'code'`).
- Where: `src/eggs/loaf.js`, `src/eggs/bread.js`; `docs/reference/bread/SOURCE.md`.

### 3.11 360 no-scope — BUILT (video and aftermath NOT BUILT)
Aaron's pick (`e1107-39`).
- Trigger: one drag on him plus the coast, 330-450° all one way. 20 s cooldown.
- Now: 2 s 2014-montage parody overlay: air horn, 3 hitmarkers, pixel shades, an unbranded chip, "OH BABY A TRIPLE".
  Nothing flashes.
- **NEW (11-09):** "I am going to provide a video to play for the 360 no scope cause its a little generic right now". §4 N3.
- **NEW (11-09):** afterwards "there will be a csgo AWP laying on the ground off back and to the left of the cat". §4 N4.
- Where: `src/eggs/noscope.js` (trigger), `src/eggs/mlg.js` (overlay).

### 3.12 The bolt (zig-zag) — BUILT (aftermath NOT BUILT)
- A gold bolt from the top of the screen onto his head; he startles. Placeholder zap sound. In `src/sigils/spells.js`.
- **NEW (11-09):** "after the lightning bolt maybe a cloud starts floating around on the top of the screen". §4 N4.

### 3.13 Footer: the 1999 web page — BUILT with placeholders
Aaron's pick (`e1107-39`) and the brother's "basic links to social pages at the bottom".
- 88×31 badges: Instagram, TikTok, YouTube (all placeholders, "link soon"; which accounts is unknown) and
  POWERED BY BUTTER (cycles sigil hints when clicked).
- Odometer bonk counter: "you have bonked him N times", this device only, milestones with titles.
- Webring "← prev | sigil ring | next →" (placeholder links). Small print ("best viewed with a cat on your keyboard at 800×600").
- Grimoire link after the first sigil.
- Where: `src/footer.js`, `SITE.footer` and `SITE.counter` in `src/config.js`.

### 3.14 Audio — PARTLY (placeholders)
- Aaron's real clips: Butterman ×3 and the whisper (`docs/audio.md`). Levelled to −16 LUFS; `.m4a` + `.mp3`.
- Placeholders (synthesized, `tools/audio/make-placeholder-sounds.py`): 6 taps, rare bonk, sigil cast, fizzle, zap,
  hole whum, loaf ding, loaf boop, air horn, hitmarker, Butterman slap. Swap any by one line in `src/config.js`.
- Sounds load only after the cat is on screen. First tap always makes sound (iOS unlock on release).
- Silent switch mutes everything except Butterman's scenes (`e1107-37`).

### 3.15 Performance and iPhone — PARTLY
- Aaron's asks: "the website running smoothly" (11-07); "the site is very laggy" (11-09, fixed: MSAA off for splats);
  "could you kick off a session to do an overall optimization spree of the website?" (11-09, done).
- Now: first cat in 3.6 s on a phone-speed connection (was 9.1 s); preloads in the page head; splats re-sort every
  100 ms at rest; pixel ratio capped at 2 and adaptive. Before/after table: `docs/REVIEW.md`, Optimization.
- Egg shader warm-up so Butterman and the galaxy don't freeze on first play (`e1109-05`): BUILT (b5b014e); see N7 for the leftover pauses.
- Weight: 4 cat splats ~3.8 MB, Spark ~0.7 MB compressed, mesh GLB 0.9 MB still on the first-load path.
- **Unmeasured on an iPhone**: frame rate, the galaxy's full-screen pass, sound, silent switch. Use `?perf=1`.

### 3.16 Debug and checks — BUILT
- `#debug`: pose buttons, egg buttons (BM 1/2/3, BM reset, Hole, Bread, 360, each sigil), live readout.
- `?perf=1` fps/draw calls/GPU; `#cat=mesh|splat`; `#egg=hole|bread|mlg|butterman`; `#bmsheet=butter|cross|rise`;
  `#bpm=`; `&dpr=`; `?aa=0|1`.
- `checks/run-all.sh [base-url]` runs every check, desktop and phone; ends "ALL PASS". Needs a local server and the
  `shot` screenshot tool (set `SHOT=`). Headless WebGL is CPU-rendered: judge looks and logic, never frame rates.

## 4. New and not built yet
Today's requests (2026-11-09, latest) first, then older asks still open. Each has a done check.

**N1. No shake between loaf and sleep.**
> "there should be no shake before the pop for going from loaf to sleep or from sleep to loaf since theyre so close in shape."
- Done when: a loaf → sleep and a sleep → loaf pop show no shake (the pop itself still plays); every other pair still shakes.

**N2. Butterman scene 2, new choreography.** Waits on Aaron's new scene-2 audio.
> "walk into the middle of the room, do a loop around the cat, and then stand in the open, stand still for that last
> second of the audio, and then isntantaneously pop out of existence at the end of the audio"
- Done when, with the new clip: he walks in to the middle; makes one full loop around the cat without passing through
  him; stops in open space clear of the cat; is motionless for the clip's last ~1 s; vanishes in a single frame at
  the clip's end; legs never clip; still on the beat grid.
- Replaces for scene 2: the right-to-left cross (`e1107-35`) and "off screen 2-3 s before the end" (`e1109-04`).

**N3. 360 no-scope video.** Waits on Aaron's video.
> "I am going to provide a video to play for the 360 no scope cause its a little generic right now"
- Done when: the 360 trigger plays his video (how it sits with the current overlay is an open question, §7).
  It plays on iPhone Safari with sound, respects the cooldown, and nothing flashes.

**N4. Each egg leaves a mark on the main screen.**
> "after each easter egg, something about the main screen changes, so like after the 360 no scope, there will be a
> csgo AWP laying on the ground off back and to the left of the cat, and after the lightning bolt maybe a cloud starts
> floating around on the top of the screen."
- Done when: after a 360 no-scope an AWP-style rifle lies on the floor behind and left of the cat; after the bolt a
  cloud drifts along the top of the screen; neither covers the cat, the footer or the sigil space in a way that blocks
  drawing. The marks for the other eggs (Butterman, galaxy, bread, circle) are not yet named, and nor is whether the
  marks last for the visit or are remembered on the device (§7).
- The butter that stays on after Butterman scene 1 is already one such change.
- Note: the repo is public; the rifle model must be our own or properly licensed (the MLG overlay avoids brands the same way).

**N5. Grimoire hides unfound sigils.**
> "The grimoire needs to not show the blurred version of the sigils cause then someone immediately knows how to do them"
- Done when: an unfound sigil's card shows no shape at all (just "???" and "not yet found"); found cards are unchanged.
- Suggestion: leave the unfound shapes out of the page markup, not just hide them.

**N6. The O (circle) sigil: 20 fast spins.**
> "maybe it can make him spin like 20 times in 2 seconds really fast, which could make them try to spin the cat really
> fast on their own and figure out the galaxy one. The O sigils 20 spins should not activate the galaxy though, only player spins."
- Done when: casting the circle spins him 20 full turns in about 2 s and he lands facing his usual way; the hole does
  not open and the 360 no-scope does not fire; a player's own fast spin still opens the hole.
- Note: the hole counts `world.vel` above 8 rad/s; 20 turns in 2 s is ~63 rad/s, so the O spin must not feed that
  number (today's circle turns the `react` group, which the hole ignores).

**N7. Egg warm-up** (`e1109-05`): PARTLY. Merged b5b014e; first-play longest frame Butterman ~1 s -> 0.03-0.07 s,
  galaxy ~0.8 s -> 0.03-0.08 s (headless, real GPU). The compile cost moved to two ~0.6-0.9 s pauses 2-4 s after he
  appears (docs/REVIEW.md "Optimization"). Suggestion: spread it over more idle frames, or use parallel shader compile
  where the browser supports it (WSL's driver doesn't; desktop Chrome and iPhone may).
- Done when: no single frame over ~100 ms from load through the first Butterman and galaxy, with `?perf=1`, checked on
  the iPhone.

**N8. A real iPhone pass** (needed since 11-07; never done).
- Done when: on Aaron's iPhone, `?perf=1` holds about 30+ fps at rest, in a pop, in Butterman and in the galaxy
  cutscene; first tap makes sound; silent switch mutes taps but not Butterman; the whisper is audible.

**N9. Real sounds.** Tap pool and every placeholder in §3.14, recorded by the brothers ("Foley night" idea).
- Done when: no file under `assets/audio/placeholder/` is referenced from `src/config.js`.

**N10. Real footer links.** Social badges and webring sites (Aaron: "social links I'll provide later", 11-07).
- Done when: no badge or ring link in `SITE.footer` is a `#` placeholder.

**N11. The loaf sigil becomes a top half circle** (Aaron, 2026-11-09: "the bread sigil should be more of a top half
circle"). A dome, like the top of a loaf, replacing the triangle. Same effect (loaf → bread).
- Done when: the half-circle stroke casts it and the triangle no longer does; the recognizer still tells it apart from
  the full circle (the O) and the B's bowls; the grimoire card shows the new shape; the sigil checks pass.

**N12. Sigil combos: a second layer** (Aaron, 2026-11-09: "we could include some sigil interplay as well to add another
layer"). Some sigils cast one after another do something neither does alone.
- First combo, **loaf then star: the bread blasts off.** Aaron: "if someone does the loaf sigil and then the star sigil
  it could put the bread into space without the galaxy cat effect and throw the bread straight out into the void in a
  semi-random direction and have it disappear with a star like team rocket blasting off."
  - The loaf sigil turns him to bread, and from the sigil he stays bread for about 5 s (Aaron, 11-09; the random
    loaf -> bread in the pose cycle keeps its short 1.2 s).
  - A star cast within about 5 s of the loaf sigil (while he's bread) does NOT open the galaxy cat.
  - Instead the whole page goes to space, like the galaxy cutscene's dark, and the bread is flung straight out into
    the void in a semi-random direction, shrinks away and vanishes with a single twinkle star (the "blasting off
    again" gag).
  - Then the page comes back and the cat just pops back into place.
- Build combos as a small table (first sigil, second sigil, time window, effect) so more can be added later.
- Done when: loaf then star within the window plays the blast-off and never the galaxy; star on its own still opens
  the galaxy; a check casts both orders.
- Grimoire: each combo is hidden until found, then gets its own card (Aaron, 11-09). No other combos named yet.

## 5. Dropped or superseded (don't revive without Aaron)
| What | Why | When |
|---|---|---|
| Free rotation on any axis | Aaron: "spin left and right rather than all the way 360" | `e1107-36` |
| Yell into the mic to summon Butterman | iPhone asks mic permission every visit: "nah, we can remove that" | `e1107-45` |
| The rigged mesh cat with morphing between poses | "this is all just frankly terrible. Sleep is insanely warped … the morphing is not like natural movement at all"; replaced by still splat poses and the pop | `e1108-35` |
| AI (Hunyuan3D) pose meshes, blockout pose rework, hand-sculpted stretch | all fed the morphing cat; pudge, crease lines, a dented head | `e1108-04`, `e1108-35` |
| Springy clips, tail idle flicks, mesh transition clips | belonged to the rigged mesh; the pop replaced them ("we just need to do the idle setup with the pop") | `e1108-35` |
| Procedural foam / porous textures | pores "catching light and kind of glitching"; "literally none of them look felt"; mesh texture settled on "From the sheet" | `e1107-70` |
| Pop that rises | "It shouldnt rise when it does it though" | `e1108-31` |
| See-through splats | an early misread of "the splats dont need to be opaque"; corrected to fully opaque | `e1109-03` |
| Painted-over face on splat inputs | "painting over the face does not work at all" | 11-09 |
| Other splat inputs (mesh renders from six angles, felt recolour, the plain sheet sit views) | came out flat, or with a face painted on the back | 11-09 |
| Butterman: three scenes per press | one scene per B instead | `e1108-03` |
| Butterman: arm stretching to reach | "maybe he could jump up instead of his arm stretching" | `e1108-10` |
| Butterman: giant in the rise | "should seem like Buttaman is just very close to the camera" | `e1109-04` |
| Butterman footsteps / step sounds | "butterman doesnt need step sound effects" | `e1109-01` |
| Mixamo clips as the main animation | the beat-grid figure was built; Mixamo is a fallback only | 11-07 |
| POWERED BY BUTTER badge as Butterman's trigger | the B sigil is the reward; the badge gives hints | REVIEW.md |
| Galaxy painted on the cat, turning with him | now a fixed-sky portal ("like how the minecraft end portal doesnt move") | 11-09 |
| Hole swapping in the old mesh cat | "the galaxy mode turns it back into the old model" | `e1109-01` |
| Tap off the cat to end the galaxy | the cutscene takes all control now | 11-09 |
| Wonder Bread photo for the bread splat | Aaron picked bread-2 instead; the Wonder Bread bag is a trademark | 11-09 |
| The shelf-of-trinkets home page | the cat is the page | 11-07 |

## 6. Constraints and hard rules
**Publishing**
- Public repo: `github.com/yznaig/sigil-cat`, GitHub Pages, live URL `https://yznaig.github.io/sigil-cat/`.
- **Never push without Aaron's say-so** (`e1107-33`). Local commits are fine.
- **Before the first push**, all Aaron's call:
  - Local paths in history: commit `ab1be47` (a brief with session and tool paths; removed again in `fc5dc68`), and
    `6e216e1` and `28cf9bb` (a hard-coded home-folder path to the screenshot tool, removed in `6210d69`).
    Clean them from history first.
  - The bread splat's source image is unconfirmed (`docs/reference/bread/SOURCE.md`; REVIEW.md "Before the first push").
  - Inputs not cleared for a public repo stay local (`tools/splats/inputs/*.local.png` is git-ignored).
- Brother pushes straight to `main`: always pull before a push (`e1107-38`).

**Build**
- No build step: plain ES modules and one importmap in `index.html`. Pinned: three.js 0.186.1, Spark 2.4.0
  (`@sparkjsdev/spark`), both from jsDelivr. Use `./` relative paths (the site lives under `/sigil-cat/`).
- Run locally: `python3 -m http.server 8731`, open `http://localhost:8731/`.
- One file per egg (`src/eggs/`), so two people rarely edit the same file. Every tunable lives in a config object
  (`src/config.js`, `src/butterman-config.js`, `HOLE`, `LOAF`, `NOSCOPE`), not scattered through code.
- localStorage reads and writes always in try/catch (private mode must not break the page).
- Nothing flashes or strobes (eggs only move, scale and fade). `prefers-reduced-motion` gets calmer versions.

**Assets and tools**
- Cat splats: Idol (single image → Gaussian splat) from the sheet images; `tools/splats/` (`bake.py` lines up, faces,
  places the butter; `solid.py` adds the opaque shell; `more.sh` makes candidates). Aaron picks; sessions don't.
- Reference art: `docs/reference/` (character sheet, pose sheets, Butterman sheet, bread).
- Audio prep: `tools/audio/prepare-butterman-audio.py` (trim, level, analyse; writes `analysis.json`).
- The mesh cat's build pipeline (Blender, Hunyuan3D) lives in `prototypes/sigil-cat/build/`; legacy.
- The site loads the mesh GLB from `prototypes/sigil-cat/models/` (open question 3, §7).

**Checks:** `checks/run-all.sh` must end ALL PASS before a merge. Under heavy machine load the tap check can miss a
tap; rerun before calling it a bug.

**Working with Aaron's machine:** sessions must not open visible browser windows on his PC ("stop opening screens on
my computer now its interfering", 11-09). He has flagged usage cost ("im spending a lot more usage on this then I
was expecting", 11-09): keep sessions lean.

## 7. Open questions for Aaron
Each with the recommendation already on file (REVIEW.md unless noted). Settled or moot items are left out.

**From today's requests**
1. Scene 2: does the new clip replace theme-song-2? Which side does he enter from, and which way does the loop go?
2. After-egg marks: per visit, or remembered on the device like the butter? What mark do Butterman, the galaxy, the bread and the circle leave?
3. The 360 video: replace the MLG overlay, or play with it? Full screen or framed? Its own sound?
4. Grimoire: unfound cards as plain "???", or a vague hint (Claude's suggestion: a riddle line, no shape)?

**Site**
5. Butterman trigger: keep the B sigil only. Rec: keep; a "BUTTAMAN" 88×31 badge is one line if friends need a button.
6. Model location: rec copy the mesh GLB to `assets/models/` so pruning prototypes can't break the site.
7. Counter verb: bonked, petted or booped (`SITE.counter.label`).
8. The hint "drag to spin · tap him" is far from him on a phone. Rec: leave it.
9. Drawing cursor: rec grab hand over him, pen or crosshair over empty space.
10. Load wait: rec fine now that he fades in; a spinning pixel sigil if it feels long.

**Audio**
11. Full songs or cut ones (26 s, 23 s)? Rec: watch at full length; if it drags, cut take 2 first.
12. Whisper loudness (−30 dB). Rec: try on the iPhone; raise `whisper.volume` to 0.06 if inaudible.
13. Slap sound is a placeholder plop. Rec: record a short slap, or let the song carry it.

**Butterman**
14. The butter is as wide as he is tall, carried high over his head. Rec: keep (tiny man, giant butter).
15. Arms a little thinner than legs, as on his sheet. Rec: keep.
16. Two steps per beat at half size (a quick scurry). Rec: keep.
17. Rise leaves 2.0 s before the end, not 2.5, so the widest Y lands. Rec: keep.
18. Depth of field to sell "close to the lens". Rec: look at the new rise first.
19. Walk legs bend just under the body to avoid clipping (less diagonal than the sheet). Rec: keep.
20. Giant Butterman on a phone: arms run off both edges. Rec: watch on the iPhone first.
21. The cat's whiskers peek out behind his head in the rise. Rec: keep (it's funny).

**Galaxy**
22. iPhone frame rate unmeasured, and the cutscene costs more. Rec: `?perf=1`; if it stutters, `cutscene.stars: 0` first.
23. The drone (placeholder hum). Rec: listen on headphones; keep, mute (`hum.gain: 0`) or swap.
24. The galaxy covers his face at rest. Rec: keep (`galaxy.x: 0.5` moves it away).
25. Cutscene length (~10 s, no control). Rec: try twice; if it drags, `spinDown: 4`, `hold: 2`.
26. Esc still ends the takeover. Rec: keep as the one escape hatch.
27. Whiskers show as pale stubs inside the hole. Not fixed; the mask can be pushed if it bothers him.

**Performance**
28. Mesh GLB (0.9 MB) still on the first-load path though the splat cat only uses its skeleton. Rec: later (a skeleton-only file).

**Older, never answered** (`docs/research/open-questions.md`, `docs/workflow.md`)
29. Approve, edit or drop the draft project skills in `.claude/skills/` (`add-cat-animation`, `add-easter-egg`, `tune-butterman`).
30. `@claude` in issue comments for the brother (bills API tokens).
31. three.js pin: stay on 0.186.1, or move to 0.187.0 after 2026-11-13.
32. Keep the drift back to his home angle after a spin (`returnHome`, on)?

Moot with the splat cat: the mesh-pose items in REVIEW.md (sculpted stretch, sleep→loaf bounce, flank ridge, dome
height, mark above the tail root). They only matter if the mesh cat comes back.

## 8. Still needed from Aaron
- Scene-2 audio for Butterman (he is sending it).
- The 360 no-scope video.
- Social accounts for the footer badges, and which friends' sites go in the webring.
- His brother's GitHub username (push access to the repo).
- Confirmation of the bread image's source, or a swap.
- A yes to cleaning the local paths from history, then a yes to push.
- Recorded sounds: taps (and rare bonk), sigil cast/fizzle/zap, hole whum, loaf ding/boop, air horn, hitmarker, slap.
- An iPhone `?perf=1` screenshot and a listen (§4 N8).

## 9. Source map
| Area | Detail lives in |
|---|---|
| Vision, brother's brief, brainstorm | `docs/ideas/vision.md`, `brother-brief.md`, `brainstorm.md` |
| Cat look, texture history, whiskers | `docs/ideas/cat-look.md`; reference art `docs/reference/` |
| Pose cycle | `docs/ideas/cat-poses.md`; `CONFIG.cycle` in `src/cat.js` |
| Splat cat (how made, research) | `docs/research/splats.md`; `tools/splats/`; `src/splatcat.js`; REVIEW.md "Splat cat" |
| Butterman spec | `docs/ideas/butterman.md`; `src/butterman-config.js` |
| Butterman audio and sync | `docs/audio.md`; `assets/audio/butterman/analysis.json` |
| Sigils and grimoire | `src/sigils/`; `spellbook.html`; `docs/research/nostalgia-shortlist.md` §1 |
| Galaxy / hole | REVIEW.md "Galaxy" (3 rounds); `src/eggs/hole.js` |
| Bread | `src/eggs/loaf.js`, `bread.js`; `docs/reference/bread/SOURCE.md` |
| 360 no-scope | `src/eggs/noscope.js`, `mlg.js`; nostalgia-shortlist §4 |
| Footer | `src/footer.js`; `SITE.footer` in `src/config.js`; nostalgia-shortlist §6 |
| Performance | REVIEW.md "Optimization"; `docs/research/render-stack.md` |
| Build history, every session's notes and open items | `docs/REVIEW.md` |
| How to work on the site | `docs/workflow.md`; `README.md` |
| More egg ideas never picked (Pointer Cat, shake him silly, guestbook, era dial, …) | `docs/research/nostalgia-shortlist.md`, `nostalgia-ideas.md`, `docs/ideas/brainstorm.md` |
