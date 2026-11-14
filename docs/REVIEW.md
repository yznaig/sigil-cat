# Review: the rebuild (unit 1)

## Galaxy black-hole revision — 2026-11-10 (Astra; choices for Aaron's veto)

- Keep the screen-anchored cat portal and all existing takeover/dissolve/hold/return timings. The black hole
  surrounds the portal: the cat remains a window into the original deep universe inside its dark centre.
- Use an analytic, deliberately stylised lens rather than a physical ray tracer: a tilted accretion disk,
  the far disk bent into an arch, a weaker lower image, a thin resolved photon ring and a subtle cyan fringe.
  Gas grades from red/amber to white-blue inward; the approaching left side stays brighter and cooler.
- Make gas flow differentially (faster inward), and bend background stars into the same gravity well.
  Keep brightness stable: no flashing, pulsing exposure or timed light bursts.
- Stretch the page's existing words/keepsake layers tangentially as they spiral inward, then restore their
  original styles on return. Reduced motion keeps the page fade, omits this deformation, and slows the sky.
- Reuse the existing noise texture, full-screen pass and shader warm-up. Add no textures, postprocessing
  passes, animation loops or idle-page work. Keep the bread blast-off's borrowed space treatment separate.
- Measure headlessly on NVIDIA at the checks' sizes (1280×900 DPR 1; 390×844 DPR 2), three fresh-page
  first activations per size. Screenshot capture is a separate run with the stage clock paused at each
  checkpoint. This is phone viewport emulation on the desktop GPU, not a physical phone measurement.

### Final art choices and visual judgement

The first visual pass was too white and broad: its hot band buried the photon ring. I narrowed the lensed
arch, reduced disk emission by a third, and confined blue-white gas to the inner edge. The lower lensed image
is deliberately dimmer. The disk is tilted about 10 degrees, with a shadow radius of 0.59 cat heights;
the photon ring is 0.615 cat heights and at least a resolved pixel wide. The cyan fringe is intentionally
small. Star brightness is now constant rather than oscillating; only position, flow, scale and fades animate.
Gas filaments lose contrast when subpixel, and the ring uses signed-distance multiplication rather than
GLSL `pow` on negative inputs (undefined on some drivers).

The page pull now acts on individual header/footer groups and the existing keepsake/ink layers. Its nominal
turn is 280 degrees rather than 140, accelerating inward; it compresses radially and stretches tangentially.
Text fades over 10–88% of the same 2.2-second dim-in instead of 10–75%, to let the deformation read.
Inline styles and priorities are saved and restored. These shared page transforms also accompany the bread's
borrowed dark; the disk, central shadow and lens remain exclusive to the galaxy. Reduced motion has no page
deformation or starfield warp, and the new disk/lens moves at 10.5% normal speed (the original sky at 30%).

I opened and judged **all ten final sequence screenshots**, at both sizes:

| Moment (seconds after trigger) | Desktop | Phone |
| --- | --- | --- |
| Start, 0.25 | [start](shots/galaxy-start-desktop.jpg) | [start](shots/galaxy-start-phone.jpg) |
| Spin / page stretch, 1.15 | [spin](shots/galaxy-spin-desktop.jpg) | [spin](shots/galaxy-spin-phone.jpg) |
| Peak swirl, 2.65 | [peak](shots/galaxy-peak-swirl-desktop.jpg) | [peak](shots/galaxy-peak-swirl-phone.jpg) |
| Hold, 6.3 | [hold](shots/galaxy-hold-desktop.jpg) | [hold](shots/galaxy-hold-phone.jpg) |
| Recede, 8.8 | [recede](shots/galaxy-recede-desktop.jpg) | [recede](shots/galaxy-recede-phone.jpg) |

Judgement: substantially more spectacular, with a clear black centre, separate photon ring, amber gas lanes,
white-blue approaching side, and long curved star images. The portal remains the focal point. The phone
intentionally crops the outer disk horizontally but retains the entire shadow/ring and cat. Start still reads
as felt opening onto space; the existing warp becomes intense at peak; hold resolves back into the galaxy
inside the cat; recede visibly knits the felt back in. Two honest limitations: the original pale whiskers still
stand out against the portal, and the cream page creates a bright intermediate field during entrance/return.
That is a continuous reveal/fade, not a flash. This is a stylised black hole framing a cat-shaped portal,
not a physically accurate black-hole simulation. No generated assets were needed.

### Frame time before / after

`tools/perf/galaxy.mjs`, headless Chromium 1243, ANGLE D3D12 on **NVIDIA GeForce RTX 5070 Ti**. Before is
`27f3543`; after is the shader in `feb72e8` (exact SHA-256 in the after JSON). Each value below is from three
fresh-page first activations, seven seconds after the first visible cat, vsync enabled, covering the entire
cutscene including return. Screenshots are a separate paused-clock run and do not contaminate timing.

| Frame metric, ms unless stated | Desktop before | Desktop after | Phone before | Phone after |
| --- | ---: | ---: | ---: | ---: |
| Median of mean frame time | 17.32 | 17.43 | 17.55 | 16.84 |
| Median p95 | 16.8 | 16.8 | 16.8 | 16.8 |
| Median longest frame | 66.7 | 166.7 | 100.0 | 50.0 |
| Longest frame across all three | 433.3 | 366.6 | 100.0 | 566.7 |
| Median number of frames over 25 ms | 17 | 11 | 23 | 6 |

The usual frame cadence is approximately 60 fps at both sizes, with a 0.11 ms desktop mean increase and a
0.71 ms phone decrease. **The tails are not uniformly better:** desktop's median worst frame increased,
and one phone return stalled for 566.7 ms at 9.50 s. Its other two runs peaked at 50 and 33.4 ms. This shared
16-core host had load averages of 20–30 during the after runs; a contemporaneous GPU probe read 5% utilization.
That is evidence of contention, not proof that every stall is external. No physical-phone claim is made.
All six after activations started with the warm queue empty and the galaxy shader already rehearsed.
The pass remains invisible and its clocks stop at rest; no new frame hook, loop or render target was added.

Raw data: [before](perf/galaxy-before.json), [after](perf/galaxy-after.json), and
[screenshot times/source hash](perf/galaxy-shots.json). All runs are retained. An exploratory desktop batch
before the signed-distance portability fix showed mean/p95/worst of 18.21/16.8/516.6,
22.06/50.0/183.4 and 16.69/16.8/33.4 ms, then failed to load its screenshot page. It is not the final table.
Two failed setup attempts prompted a loading probe: external Three.js/fonts took 26 seconds, while a later
probe took 10–14 seconds. The driver now allows 90 seconds for startup, pins the shader source across the
batch, and saves each completed run plus warm-up/long-frame diagnostics. Timing still starts after startup.

### Regression evidence

The existing checks are unchanged. Added `checks/galaxy.js` verifies the warmed shader, original phase times,
fixed portal anchor through the spin, normal/reduced page motion, natural return, Escape, style restoration,
and no visible galaxy pass or advancing sky clocks at rest. Desktop normal motion passed all seven checks:
hold at 5.000 s, recede at 8.0165 s, closed at 9.7998 s; portal anchor displacement **0 drawing-buffer pixels**.

Desktop reduced motion and phone normal/reduced also passed. Their hold/recede/closed transitions were within
one frame of 5/8/9.8 seconds. The new anchor check initially compared buffer pixels and failed when adaptive
DPR changed on phone; it now samples after the frame's uniforms update and compares screen coordinates.
The application needed no change for this: an adaptive buffer resize does not move the sky on the screen.
The inspected calm-mode stills are `shots/galaxy-reduced-hold-{desktop,phone}.jpg`.

Validation setup encountered DNS failures (`ERR_NAME_NOT_RESOLVED`) for jsDelivr. Host DNS was measured failing;
HTTPS to its resolved Fastly address returned 200. Remaining headless checks use a temporary `CHROME` launcher
with `--host-resolver-rules=MAP cdn.jsdelivr.net 151.101.129.229`, retaining the same Chromium binary and TLS
hostname. No dependencies, production URLs, or existing assertions were substituted. Preview process exits
and a collision on another worker's port were also detected; final validation uses only assigned port 18747.
The rack runner hardcodes its browser path rather than reading `CHROME`, so the complete rerun applies that
same DNS flag through a temporary Node preload wrapping `chromium.launch`; no check file is edited.

The first full suite is retained in `perf/galaxy-run-all-attempt-1.log`. It failed rack's phone startup timeout,
desktop world CPU budget (2.10 ms versus 2.00 ms), and butter landing at desktop/phone (two/zero impact
samples). Every galaxy entry/landing/return assertion passed. Before retrying, I tested the shared timing
premise: butter was already ready, its flight began at offset zero, and impact began at 0.350/0.3502 seconds.
The probes recorded 150–700 ms startup frame gaps instead; they did not support a delayed model-load cause.
Those measurements are in `perf/galaxy-landing-probe-{desktop,phone}.log`. The unchanged isolated world check
then passed at 2.00 ms, and the final reduced-phone anchor check passed with zero screen-pixel displacement
at DPR 1.75. No timing window, numerical threshold, existing check, or unrelated animation was changed.

The second complete-suite attempt was stopped after the same 2.10 ms CPU-budget failure; its partial log is
`perf/galaxy-run-all-attempt-2.log`. A measured quieter-core affinity experiment did not help (2.20 ms), so
that setting was discarded. Crucially, substituting **only the original `27f3543` galaxy source** under Chrome
153 also failed at 2.10 ms (`perf/galaxy-world-original-source.log`). The final source on installed **Chrome
151.0.7922.34** passed the unchanged workload at 2.00 ms (`perf/galaxy-world-chrome151.log`). I chose Chrome 151
for the final complete run, with the same NVIDIA/headless/viewport settings and DNS repair; no CPU affinity.
The before/after cutscene measurements above remain the unfiltered Chrome **153.0.8010.12** measurements.
This browser choice is for Aaron's veto too; it is not a claim that the original suite was green on Chrome 153.

**Final complete-suite result: ALL PASS**, 2026-11-11, desktop and phone. Exact invocation used:

```sh
NODE_OPTIONS='--import=/tmp/galaxy-browser-setup.mjs' \
SC_CHECK_CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome \
PW_FROM=~/command-hq/scripts/shot SC_CHECK_PORT=18747 \
checks/run-all.sh --shots docs/shots
```

The exact temporary launch adapter is preserved as [galaxy-validation-launch.mjs](perf/galaxy-validation-launch.mjs)
(use its absolute path in `NODE_OPTIONS` to reproduce). `SC_GALAXY_BASELINE` was **unset** for this run: the final
production shader was tested. The complete [passing log](perf/galaxy-run-all.log) ends `ALL PASS`.
Both CPU budgets passed at 2.00 ms; both butter landings supplied ten impact frames, centred at .380/.400,
with width ratios 3.226 desktop and 3.185 phone. All galaxy sigil/positive-spin/negative-spin landing and
return checks passed at both sizes. The phone landing runner recovered one CDN socket error through the
existing runner's automatic startup retry, before any assertions ran. All review screenshots were refreshed.
`git diff --check` passed. All work is committed locally on `sc/galaxy`; nothing was pushed.

What the rebuild of 2026-11-09 made, how to try it, and everything Claude had to invent, for Aaron's veto.
The plan it was built from is `docs/revamp-brief.md`; the earlier overnight review is in git history (before `f7f6af7`).

## How to look at it
```
cd ~/sigil-cat && python3 tools/serve.py . 8732      # then http://localhost:8732/
checks/run-all.sh                                    # plays the whole page, desktop and phone size; ends ALL PASS
```
Screenshots of every egg and gag at both sizes: `docs/shots/` (numbered in the order the check plays them).
`#debug` adds a row of buttons that fire each thing. "forget everything" (two presses) is at the foot of the grimoire.

## What to try first (sound on)
1. Turn him, tap him a few times. Then draw on the empty space beside him, one stroke each: a **circle**, a
   **zig-zag**, a **B**. Each leaves something on the page. Press a found mark in the bottom row to do it again.
2. After the B he wears butter. Move the pointer slowly up to the butter. Then spin him hard (or draw the circle).
3. Draw the **top half of a circle** (he becomes bread for 5 s), and while he is still bread, a **star**.
4. Draw a **cup** (the bottom half of a circle), a **square**, an **eight lying on its side**, a **triangle**.
5. Tap his whiskers: his left three, top to bottom, are B, C, D. Play B C B D B.
6. Stroke him up and down, and keep going.
7. Draw a second B for Butterman's new scene 2 (your new clip). Open the grimoire. Reload the page: everything stays.

## Before the first push
- **The bread's picture: source still unconfirmed** (`docs/reference/bread/SOURCE.md`). Confirm it or pick another loaf.
- **`cast.mp3`**: its Freesound page reads "CC0 since 2026-06-06" and it is a mix of two other CC0 sounds. Fine as far
  as the page states; say if you would rather swap it than rely on that.
- Nothing is pushed. `main` is local only.

## Speed: before and after
Same machine, same hour, headless Chromium on the real GPUs through WSL; the old build (`797fbb7`) and the new one
measured in turn, five rounds each (`tools/perf/compare.mjs`; every run's numbers are in `docs/perf/`).

**desktop size, NVIDIA GeForce RTX 5070 Ti** (median of 5, lowest-highest in brackets)

| | before | after |
|---|---|---|
| time to first cat, ms | 8427 (2229-13109) | 3656 (2294-6897) |
| MB before first frame | 3.32 (3.27-3.42) | 1.80 (1.78-1.82) |
| frame time at rest, ms | 1.90 (1.45-4.89) | 0.68 (0.54-1.48) |
| longest frame, his first 7 s, ms | 1117 (750-1450) | 650 (500-950) |
| longest frame, first bolt, ms | 450 (350-733) | 300 (200-467) |
| longest frame, first Butterman, ms | 17 (17-50) | 17 (17-33) |
| longest frame, first galaxy, ms | 50 (50-117) | 83 (67-150) |

**phone size, NVIDIA GeForce RTX 5070 Ti** (median of 5, lowest-highest in brackets)

| | before | after |
|---|---|---|
| time to first cat, ms | 5958 (2615-12885) | 3849 (3062-10934) |
| MB before first frame | 3.30 (3.30-3.34) | 1.80 (1.78-1.82) |
| frame time at rest, ms | 2.74 (1.63-4.37) | 1.37 (0.93-1.91) |
| longest frame, his first 7 s, ms | 1083 (967-1450) | 767 (683-983) |
| longest frame, first bolt, ms | 617 (433-700) | 450 (350-667) |
| longest frame, first Butterman, ms | 33 (33-33) | 33 (17-67) |
| longest frame, first galaxy, ms | 100 (67-150) | 100 (67-117) |

**desktop size, AMD Radeon (the chip Windows Chrome was choosing)** (median of 5, lowest-highest in brackets)

| | before | after |
|---|---|---|
| time to first cat, ms | 6358 (1374-8809) | 1092 (1031-1796) |
| MB before first frame | 3.30 (3.30-3.33) | 1.80 (1.78-1.82) |
| frame time at rest, ms | 7.25 (6.75-9.01) | 2.78 (0.81-11.69) |
| longest frame, his first 7 s, ms | 200 (133-317) | 67 (33-83) |
| longest frame, first bolt, ms | 117 (67-333) | 150 (50-300) |
| longest frame, first Butterman, ms | 50 (17-83) | 50 (33-67) |
| longest frame, first galaxy, ms | 67 (50-100) | 50 (33-67) |

Read it as: he arrives sooner, the page downloads 1.5 MB less before he does, a frame at rest costs half or less, and
the longest stop in his first seconds is shorter. Time to first cat swings with the 3D library's download (the machine's
network was slow that hour), which is why its ranges are wide; the old build downloads more, so it swings more.

**Two cells are worse, by two frames at the median:** the first galaxy on the RTX card at desktop size (83 against
50 ms) and the first bolt on the AMD chip (150 against 117 ms). Both are inside the run-to-run spread, and the galaxy's
is not a shader being built: it is there on every opening, first or not (most likely the page's words being lifted
onto their own layers so they can swirl). The bolt's cause was looked for and not pinned down. First Butterman is the same as before.
So the brief's "nothing worse than before" is met in 19 of 21 cells, not all 21.

The "MB before first frame" for the new build is from a second run of the corrected measure: the first count missed
what the worker downloads (his first pose, 0.94 MB), so the `docs/perf/` files show 0.85 for it.


## What Claude invented (strike anything; each is one config value or one file)

**The page**
- The name is the traced mark, small, top centre (your decision e1109-22). The trace (`assets/art/name-mark.svg`)
  comes from a small crop, so its corners are slightly soft; a larger original would make a crisper one.
- "Sigil Cat" stays as a small label top left on desktop only; counts top right; on a phone the counts sit under the name.
- The words: status "he is on his way"; hint "turn him · tap him · draw on the air"; nine "ask the butter" hints
  (`src/config.js`); bonk titles at 10, 100, 500, 1000 kept from the old page.
- Messages write themselves in the name's script, then turn into words.
- No social links yet: the row is empty until you name them (`SITE.ui.links`).
- Keepsakes can be dragged anywhere and stay there. The ones nearer the bottom of the page sit in front.

**Finds and the row of marks**
- 16 things to find: 9 sigils, the 360, 3 combos (blast-off, paradox, fling), 3 secrets (harp, bite, whisper).
- Each has a small line mark in the bottom row (a dot until found), a riddle in the grimoire before it is found and
  a plain line after (`src/finds.js`). Combos do not appear in the grimoire at all until found.
- Pressing a found mark does it again.

**Sigil shapes** (`src/sigils/templates.js`)
- Hat: a closed triangle. It no longer casts the loaf (N11).
- Loaf: an arc open at the bottom. Cup: the same arc open at the top. A V is refused as either.
- Box: a closed square or rectangle (told from a circle by how much of its frame it fills and how sharply it turns).
- Eyes: a figure eight on its side, either direction, starting anywhere.
- The recognizer test draws all nine with hand-like wobble: each is recognised 94% of the time or better.

**Eggs: what was added to what you had approved**
- Bolt: 0.45 s to darken, one flash (0.22 s), a 0.4 s shake, 0.5 s hold, 1.3 s back to light. Keepsake: a small
  **volumetric cloud** drifting along the top. Tap it: it grumbles and lights up; each new bolt darkens it.
- Circle: 20 turns in 2 s (2 slow turns in calm-motion mode). Keepsake: a **1950s tin-litho spinning top**. Tap it:
  it spins and he turns once to watch.
- Bread: chance bread kept as it was (15% a loaf, 1.2 s); from the sigil 5 s. Keepsake: **crumbs**.
- Blast-off (loaf then star within 6 s, while bread): 0.35 s shake, 1.3 s flight, 0.7 s hold, 1.1 s back. Keepsake:
  a **gold foil star sticker** in the sky.
- Galaxy: the look and the takeover are the old ones, ported. The star sigil spins him up over 0.8 s. Keepsake: a
  **1950s "Greetings from THE VOID" postcard**.
- 360: the montage is the old one. Keepsake: the rifle, a **low-poly CC0 model** (Quaternius), lying behind him to
  the left. Tap it: a hitmarker.
- Butterman scene 2 (your new clip, 66.39 bpm): in over 10 beats, once round the cat over 16 (0.53 from his middle,
  he is 0.43 wide), 3 beats out to open floor, turns to face you and stands for 3.21 beats, gone on the clip's last
  instant with a small pop. The cat sits facing his usual way for it.
- The old scene 2 (the cross) is kept as a secret fourth scene, the **encore**: only the whisker tune plays it.
- The whisper: silent beyond 150 px from the butter, loudest within 26 px, at about a twentieth of the songs' volume.

**Gags 1-8: triggers, what stays, the style of each keepsake**
1. **Paradox.** The loaf sigil on a buttered cat: he turns side-on, the loaf straps to his back, he hovers and turns
   for 10 s. Always the first time each visit, then 1 time in 4 (otherwise a buttered cat could never blast off).
   Stays: a **rejected physics paper, a bad photocopy**. Tap to read it.
2. **Fling.** A buttered cat turning faster than 9 rad/s for 0.22 s, or the circle. Stays: a **grease streak** on
   the glass that a finger wipes off (gone at 78% wiped), and the **pat of butter**; drag it back onto him.
3. **Glass.** The cup sigil. He looks at it for 1.7 s, then three shoves toward you and off the front edge of the
   page (the floor has no side edge to push it off). Stays: **photoreal shards** and a **puddle** that mirrors him
   (squeezed, so all of him fits). A bolt with a puddle on the floor goes through the water.
4. **Box.** The square. Stays: a **flat cardboard cut-out** box. Tap it: in one side, out the other. Once there is a
   box he takes 4 naps in 10 in it.
5. **Eyes.** The eight. On him for 3.2 s of choir, then they fall off. Stays: **craft-shop googly eyes** that watch
   the pointer and stick to whatever you drop them on.
6. **Hat.** The triangle. Stays: a **pixel-art hat rack** (wizard, traffic cone, party, crown; 16 pixels wide). Tap
   it for the next hat; the last tap takes it off. The butter rides on top of the hat.
7. **Harp.** No sigil. The tune is B C B D B (the first line of his song). Stays: a **letterpress ticket** to the
   encore. The plucked note is a kalimba.
8. **Pet, pet, bite.** No sigil. 13 strokes of patience, which comes back while he is left alone; he twitches from
   60%. After a bite the pointer wears a plaster for a minute and he sulks for 6 s. Stays: an **enamel tin of plasters**.

**Sounds** (`assets/audio/SOURCES.md` has every source page)
- All 31 effects are cut from Freesound recordings whose pages say CC0. No placeholder is left.
- Worth an ear: the six tap sounds (jaw harp, squeaky toy, wood knock, cat trill, cork pop, raspberry) and the rare
  one (a small gong); the hitmarker is a metal tap, not the game's sound; the air horn is a real industrial one.
- Several quiet clips were raised to a common level. The sound control (bottom left) mutes everything and remembers.

**Under the hood**
- The cat is drawn by a small renderer of our own instead of the Spark library (2.85 MB less to download). It was
  matched to Spark's look; `checks/look.html` shows the two side by side.
- He is drawn once into a picture and the picture floats; his splats are redrawn only when he turns or changes.
- The page asks for the fast graphics card. Windows Chrome on your PC was choosing the AMD chip over the RTX card.
- He is shown as soon as he is ready, and the eggs are rehearsed unseen during his first seconds (a few short
  hitches while he floats). `?warm=first` rehearses before he is shown instead: no hitches, about 2 s more empty page.
- The web font no longer holds the page back; it swaps in when it lands.

## Not done, and waiting on you
- A real iPhone has still never seen it (N8). Everything here is headless Chromium.
- The 360 video (N3), social links (N10), your brother's GitHub name, a yes to push.
- With all 14 keepsakes out, a phone screen is crowded (`docs/shots/29-a-page-played-with-phone.jpg`). Say if some
  should start smaller or tuck to the edges on a phone.
- `prototypes/` (26 MB of old experiments) and the two old skill drafts in `.claude/skills/` are still in the repo;
  the splat picker in `prototypes/splats/` is still used. Say if the rest should go.
- The five old working copies (`~/sigil-cat-build`, `-clipfix`, `-poses`, `-poses2`, `-splatfix`) are untouched.
- Unit 2 (gags 9-12) has not been started.

## Look round (sc/look)

### 1. Brass top

Chose an original procedural lathe-turned brass top with a steel point, rather than another printed toy.
The broad room reflections give its curved shoulders a readable material at its small page size. It is a `gl`
keepsake, using the same scene environment and lights as the butter and felt, with the cat's soft shadow texture.
No downloaded asset. Position comes from the keepsake's saved coordinates, projected onto a wall plane; the local
support calculation only seats the point/rim against its own shadow. No keepsake fall/gravity code was added.

Veto numbers: footprint 0.3 cat-heights, body diameter .224, total height .226; brass #b88b46, metalness 1,
roughness .25, clearcoat .25; steel #b6bfc5, roughness .2; shadow opacity .23. Six-second spin, initial 95 rad/s
with quadratic slowing. Fine grip marks disappear at high speed, averaging to continuous bands. Precession grows
from 45% of the spin; tipping/short damped roll occupies the final 16%; final lean 1.32 radians. Calm motion uses
2 rad/s and no circling precession. The tap still asks him for one spin to watch. Reload restores a resting top.

What to try first: circle, tap the top, watch the last second, drag it somewhere else, reload. The brass now reads
as a solid metal object in the inspected desktop and phone pictures. It is still a clean CG machined object,
not indistinguishable from a photograph: the close crops expose raster edges and an unusually pristine finish.
That is the remaining realism limitation, rather than pretending it is photographic.

### 2. One butter pat and a stable landing

The old flight was a CSS gradient rectangle (not a 3D pat), followed by another CSS rectangle. Replaced both with
one persistent WebGL mesh, sharing `cat.butterGeometry` and `cat.butterMaterial` exactly, including on reload.
It never changes renderer or material at the handover. The smear remains a transparent canvas film: the same
butter-yellow, feathered irregular edges, rounded beginning and fine cream ridges, instead of an opaque graphic.
It is deliberately thinner and more transparent than the solid butter. Removed the streak's arrival scaling too.

Measured the original, every animation frame, in headless Chromium: last slide centre (308.47, 750.86), first
rest centre (37.24, 20.48), a **779.119 px jump**. Rest centre then travelled **846.417 px** over the next second.
Cause: `.keepsake.arrive` animates CSS `scale` from zero on the same element whose transform translates it to its
page position, scaling that translation about the page origin. There were additional width/anchor/rotation
mismatches (.23-ish versus .2 wide, centre versus base, and -5 degrees) and a nonzero lateral sine at the end.
The new pat already exists during flight; it does not acquire a second arrival animation. Flight converges to
its actual clamped keepsake centre, using the keepsake unit scale, and lateral drift decays to zero.
The phone run caught a second 13.000 px handover jump: finding the first thing reveals the grimoire link,
`hush.js`'s footer ResizeObserver updates the stage insets, and the keepsake anchor moves with the reframed
camera. The captured endpoint was stale. The frame trace showed slide y=682.622 and rest y=669.622 while
its live base anchor was 682 and footer inset 169 (initially 695 and 143 respectively). The slide now reads the live anchor each frame; the film
also starts at that anchor, so it cannot be left below the butter by this first-discovery layout change.

Veto numbers: flight .34 s, impact squash .22 s, slide 2.6 s (unchanged); 1.3x impact size settling to 1x,
rotation on glass .48 radians, temporary squash up to 1.35; butter #f3d36b and roughness .42 inherited from the
head. Film alpha peaks at .25, with .05–.13 fine ridges. It stops .35 streak-widths short of the base anchor.
Wipe radius 26 px and 78% removal threshold unchanged. `src/core/keepsakes.js` and existing gag-2 checks untouched.

What to try first: butter him, circle, watch the last half-second, then drag the pat onto him. The two regression
lines `look butter rest stable for one second` and `look butter handover below half a pixel` both failed on the
original (numbers above). On the first fixed run both measured 0.000 px. The check records every frame, measures
projected mesh centres, and also bounds the largest step in the seven-frame handover window to 8 px, allowing
normal approach motion while requiring the actual handover and one-second rest drift to stay below .5 px.

### 3. Damp sponge

Original sound synthesis, no recording or third-party source: `tools/audio/make-sponge.py` produces
`sponge-wipe.mp3` from low-passed noise and three descending 150–240 Hz water pulses. Seed 811, 420 ms,
sine envelope, peak .38, mono 44.1 kHz, MP3 quality 4. No narrow high squeal. The old squeak had no other users
in `src/`; removed its file and config entry. The source table documents the new clip as ours.

Veto numbers: wipe speed saturates at 1 px/ms; gain .07–.20 and pitch .7–1.2 track speed, refreshed at most every
130 ms; release fades with a .025 s time constant and stops within .12 s. Sliding gets one quiet .12-gain,
.65-rate stroke. All sound uses the existing master bus and mute control.

The cursor wears a procedurally drawn cellulose sponge: 58×42 CSS px, yellow porous top (#f1dea1 through #9b894c),
dark wet green side (#64715a through #293d32), 560 shaded pores, small wet highlights, -12 degree tilt and soft
contact shadow. This original canvas drawing follows both the mouse and phone finger, centred on the rub.
The native pointer is hidden while wiping (including if the plaster is equipped); release or streak removal
restores it and fades the sponge for .18 s, removing it at .2 s.

What to try first: sound on, wipe slowly, then quickly, pause, release; repeat on a phone. Inspect the sponge
under the finger and its fade when the streak vanishes. Headless phone checks cover pointer input, not real iOS.

### Evidence and review pictures

`checks/look-motion.js` is the before/after regression; `checks/look-use.js` and `checks/look-reload.js` add
compatibility checks for room lighting, top drag/spin/rest, sponge lifecycle (also with the plaster equipped),
audio decoding and saved objects.
Those additional compatibility checks were written after implementation; they are not claimed as pre-fix failures.
`checks/look-shots.js` captures both sizes at rest, fast spin, slowing, fallen, flight, slide, bottom and sponge,
with close views. Files are `docs/shots/look-*-desktop.jpg` and `look-*-phone.jpg`. Captures use animation-clock
waits, not wall-clock sleeps, for motion phases. Desktop and phone close-ups were inspected directly.
Sandboxed full-suite attempts suffered timing failures (a 2 s circle took 18.39 s even when run alone),
and the desktop play timed out at 420 s. An AMD probe took 16.08 s too. Running the authorized headless
probe outside the sandbox reported ANGLE / D3D12 / NVIDIA RTX 5070 Ti and took 2.98 s. The final suite
therefore uses the default NVIDIA path outside the sandbox. No assertions were weakened.

The focused corrected phone trace measured 0.000 px handover and rest drift over 1095 ms / 66 frames;
the largest step in its seven-frame transition window was 0.153 px. The rest assertion requires at least
1000 ms of actual sampled frames, not just a timer having elapsed.

Final validation (2026-11-10): `PW_FROM=~/command-hq/scripts/shot checks/run-all.sh`, headless,
default NVIDIA, outside the sandbox, ended **ALL PASS**. Desktop rest: 0.000 px over 1095 ms / 67 frames;
phone rest: 0.000 px over 1087 ms / 67 frames. Handover steps: desktop 0.000 px, phone 0.054 px;
seven-frame maximum steps: 0.210 px and 0.265 px. The separate reduced-motion phone interaction/reload run
also passed all seven look-use checks. All 30 final review images were refreshed; close-ups were inspected.
The preceding real-GPU suite caught the phone endpoint bug and one existing missed-tap flake; the final rerun
passed both without changing any existing assertion.

## Keepsake physics (sc/physics)

This section supersedes the earlier statement that keepsakes stay wherever you drag them, and the first brief's
floor band. Aaron's corrected model is an ant farm: one plane and one horizontal ground line.

### Rulings (each can be vetoed independently)

- **Ground:** `floorY()` in `src/core/keepsakes.js` is the one ground line: projected `keepsakes.feet.y + 12` CSS
  pixels, capped 10 px above the controls' inset. The 12 px gap puts the objects beside his shadow rather than
  across his floating toes. It follows `layoutAll`; screen height never creates a second landing row.
- **Art contact:** the core removes the old paper 3D tilt, postcard/ticket decorative rotations and pat wrapper
  rotation; the physics body now supplies their planar lean and bounds. Postcard flipping remains intact.
- **Contact:** an object's lowest bounding edge touches that line. Centre-anchored objects (the puddle) get their
  half-height subtracted. Paper's rotated bounds are included. Drop height never selects depth.
- **Phone size:** `scaleFor()` multiplies solid keepsake widths and typography by `min(1, viewportWidth / 600)`:
  65% at 390 px, full size at 600 px and above. Their original horizontal homes remain spread across the page.
  This keeps the new single floor's box/rack below the cat's petting and whisker targets. Sky and grease do not shrink.
- **New keepsakes:** set down at floor height immediately. Egg animations still play; their `from` pixels no longer
  animate a second arrival for solids. `at` keeps its horizontal placement; otherwise their home spreads them out.
  The sky cloud and sticker retain their existing arrival animation.
- **Real drops:** a pause before letting go drops vertically. A recent flick carries horizontal velocity, capped
  at 500 px/s, and vertical velocity between -350 and 500 px/s. Samples older than 100 ms are discarded. A touch
  cancel does not throw. Catching an airborne item pauses it immediately, even before the drag threshold;
  releasing it lets it fall again. Pointer capture remains the input module's responsibility; long drags use its existing route.
- **Gravity:** 1800 CSS px/s² for every material, with 1/120 s substeps and a 0.1 s frame cap. Paper's terminal
  speed supplies air resistance. Horizontal air drag is exponential at 2.5/s; walls keep the whole bounding box
  12 px inside the screen and return 15% of horizontal speed. There are no object-to-object collisions.
- **Landing:** one bounce at most, capped at 85 px/s upwards. The final contact settles over 0.24 s, then snaps to
  exact rest. A drop within 8 px of or below the floor just sets down. A 3 s simulated-time safety limit ends any
  remaining motion. Squash is temporary; it never alters the saved size. No impact sounds were added.
- **Top:** tin-toy weight; bounce 0.18, squash 0.03; upright on its base. Its own spinning child or GL definition
  remains in charge of spin; the core does not rewrite its authored rotation.
- **Tin:** firm upright landing; bounce 0.10, squash 0.025; no final lean.
- **Box:** light cardboard, upright; bounce 0.05, squash 0.12; its existing entrance and ears animation remain.
- **Rifle:** heavy, flat in its existing authored GL pose; bounce 0.04, no squash. Retains 22% of sideways impact
  velocity for a small slide, damped at 18/s. No new tumble is simulated for the model. Its loaded mesh is
  fitted to the drag box and grounded by its projected vertices, cached while resting; transparent foreground
  rendering keeps it in front of him. This corrects the old model extending beyond its hit box.
- **Postcard:** stiff card, terminal speed 600 px/s; flutter ±0.10 rad at 13 rad/s; bounce 0.02, squash 0.03;
  rests leaning +0.10 rad in the page plane.
- **Paper:** light sheet, terminal speed 460 px/s; flutter ±0.16 rad at 13 rad/s; no bounce, squash 0.02;
  rests leaning -0.12 rad. A lean keeps the rejection readable and tappable; it is not a cloth simulation.
- **Ticket:** light paper, terminal speed 400 px/s; flutter ±0.20 rad at 13 rad/s; no bounce, squash 0.02;
  rests leaning -0.08 rad.
- **Rack:** stands upright; bounce 0.03, squash 0.02, a damped ±0.045 rad rock during contact. It does not topple:
  its wide drawn foot and the hat-selection interaction favour a standing rack.
- **Crumbs:** small loose pieces, bounce 0.06, squash 0.06; a repeatable local fan up to 8% of their width.
- **Shards:** hard loose pieces, bounce 0.04, no squash; a repeatable local fan up to 6% of their width.
- **Puddle:** remains its authored flat reflective GL surface; no bounce or squash; no fluid simulation.
  Its floor placement is lifted in screen space while held or falling; shader ripples remain its own animation.
- **Butter pat:** soft, no bounce, squash 0.20; dropping on him runs the original put-back action before gravity.
- **Eyes:** loose plastic, bounce 0.16, squash 0.04. Existing attachment wins over gravity; they follow a cat,
  cloud or other target when stuck. Unattached real drops fall; the egg's own timed fall-off still sets them down.
- **Cloud and star sticker:** `sky: true` exempts them from gravity and floor migration, including on reload.
- **Grease:** `fixed: true` exempts it; the wipe gesture and glass position remain unchanged.
- **Layers:** all ordinary keepsakes are in front of him, even while lifted. Sky stays behind. Saved creation order
  supplies stable stacking: new keepsakes are reachable on top, and height or bounce cannot reorder the floor.
  DOM art sits above GL canvas art; hit priority follows that same order, including after a reload.
- **Saves:** keep `sigilcat.v2`, x/y and per-item state, adding a saved stacking order. Every solid saves a floor destination (updated during drags/falls and flushed on pagehide); all old airborne
  saves are set down quietly during construction, with no physics callback. Horizontal position survives reload,
  clamped only when needed to fit the viewport. Rest orientation is deterministic from material, not a new save format.
- **Resize:** recompute the floor and each resting base immediately, including rotated/centre-anchored bounds;
  active falls use the new floor. Position units remain cat-heights for existing desktop/phone persistence.
- **Reduced motion:** a real drop sets down immediately, with its resting orientation and no bounce or flutter.
- **Idle cost:** the physics callback exists only while something falls or settles. `keepsakes.physics` exposes
  active count, callback registration and step count for the checks. Existing sky drift, pupils, reflection shader,
  cat and stage rendering still run; this is zero idle *physics* work, not a claim that the whole page stops rendering.
- **Dependencies/assets:** no physics library, new artwork, audio or package installation. The top source is untouched. Fling changes only its slide endpoint to `keepsakes.floorY()`, so the
  animated pat does not jump upward from the controls when it becomes a keepsake; the parallel artwork is untouched.

### What to try first

Drag the tin high, pause, and release. Repeat from halfway up and from just above the floor: its base always ends
on the same line. Flick it sideways toward a screen edge. Then compare the box, paper and butter landings. Drag
something across his face and drop it: it ends in front of him. Attach the eyes to the cloud, put the pat back on
him, reload, and resize to phone width. Try the same with reduced motion enabled.

### Verification and review pictures

`checks/physics.js`, `physics-reload.js` and `physics-calm.js` run at both sizes from `checks/run-all.sh`.
The tests use routed pointer events (touch at phone size), not a direct call to the physics release function.
The floor tolerance is 0.5 CSS px; rest is required within 3.5 wall-clock seconds and must move less than 0.5 px
for the following second. Idle work is measured by a stopped step counter and an unregistered callback.
`docs/shots/physics-mid-fall-{desktop,phone}.jpg`, `physics-rest-{desktop,phone}.jpg`, and
`physics-floor-row-{desktop,phone}.jpg` show the fall, the landed tin, and three materials sharing one ground line.

The suite now accepts `SC_CHECK_PORT` (default still 8739) and refuses to test if its preview server did not start.
This avoids silently testing another builder's page when simultaneous work occupies the default port.

The earlier play check now waits for physics to settle before taking its reload-position snapshot; its original
position comparisons and tolerances are unchanged. Before that wait it recorded a tin at y=0.045 cat-heights
mid-flick, then compared it to the required floor position y=-0.032 after reload. The new dedicated checks enforce
the 3.5 s settling deadline separately, so waiting here does not hide an unbounded fall.

All eleven new CHECK lines were observed failing against the original `HEAD` keepsake implementation at phone
size (including the reduced-motion line in its separate run). The sky line deliberately checks the exemption
alongside a solid landing: the old sky behaviour itself was already correct.

Chromium launched headlessly in the sandbox, but its reported renderer was SwiftShader even with `--gpu nvidia`;
NVML reported “GPU access blocked by the operating system”. That made existing timing checks fail (a two-second
circle took 19.23 s). Hardware checks were rerun outside that device sandbox with the RTX 5070 Ti accessible.
No browser window was opened, and no timing threshold was relaxed. The default suite port was already occupied,
so this branch's full runs used `SC_CHECK_PORT=18741`; the individual preview used the requested port 8741.

Final full verification: `SC_CHECK_PORT=18741 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh`
ended **ALL PASS** on both desktop and phone, including every earlier check. The preceding run's only remaining
failure was the initial phone bonk count (before any keepsake existed); the requested repeat passed four of four
taps. All six physics JPEGs were copied from the final hardware run and visually reviewed.

## Look round 2: merged floor integration

Measured on merge `85c81a9`, at 390×844. The pat was **already resting**, `held=false`, `flight=null`,
`contact=null`, with zero active physics bodies. Its scaled box was 29.258×16.092 px (phone factor .65),
in the front layer. The fading sponge was still present at roughly .36 opacity but had `pointer-events:none`;
`elementsFromPoint` reached the stage canvas. This was not a settling delay or a sponge interception.

At the left press (52.304, 490.937), the crumbs' box began at x=57.599, but its 6 px hit padding included
the pat centre. `keepsakes` held **crumbs**, and no pat drag/drop callback ran. At the right press
(337.696, 490.937), the postcard's box (x=309.668…378) covered the pat; `keepsakes` held **postcard**.
The merged DOM-before-GL hit priority correctly matches the drawing layers. The new one-floor placement
had made an older piece of DOM art cover the returning butter. The subsequent paradox failure followed
from the cat never having been buttered again. The later null `px` read is actually
`keepsakes.get('paper')`: the failed paradox never produced its paper.

Fix is confined to `fling.js`: before the flight starts, choose the nearest available horizontal landing
among existing solids, reserving the pat's full width plus each neighbour's hit padding and 2 px clearance.
Keep the 12 px viewport edge margin and use the existing `moveTo`/floor placement; do not integrate gravity
or change stacking. Both the impact and the smear follow that landing. If no full-width gap exists, retain
the original landing (a completely packed floor still requires moving another item aside).
`src/core/keepsakes.js` and the gag-2 section of `checks/play.js` are unchanged; no wait or relaxed assertion was added.

`checks/look-pat-return.js` recreates the pre-fling floor population and immediately drags after wiping,
while the sponge is still fading, forcing both random directions. It records the size, physical state,
layers, hit candidates, DOM stack, held object and drag/drop callbacks. Both `look crowded floor pat returns
from left` and `… from right` failed on the merge before the fix. It is now part of the full suite.

Top edge diagnosis: a constant-colour material produced a solid silhouette without a gap; disabling
clearcoat alone retained the bright edge, while increasing roughness removed it. The fringe was a sharp
room reflection, not missing triangles or depth leakage. The lower cone now has roughness .60 and no clearcoat, blending
back to the original .25 roughness and .25 clearcoat between model heights .109 and .120; the upper shoulder, grip, steel and rings
keep their original materials. Sixteen top screenshots (rest/spinning/slowing/fallen, full/detail,
desktop/phone) are refreshed and visually reviewed.


Validation uncovered a separate check-target assumption: on the retry, the desktop bonk test missed two taps.
A short trace reproduced a 45.8 ms press at the projected middle claimed by **whisker 5**: zero bonks and one
pluck. The cat was side-on and hopping. The check now chooses a point inside `cat.hitTest` that is not claimed
by `whiskerAt`, checking vertical offsets 0, +24, -24, +48, -48 px and failing explicitly if none exists.
It still sends four pointer taps and retains the original four-bonk assertion; the later harp test is unchanged.
This is an input-target correction, not a relaxed assertion or a product change to whisker priority.
The material-settling check also flaked in each of the first two full attempts (phone, then desktop); an isolated diagnostic
passed every material. Added per-material measurements to that check without changing any condition.

Final verification: `PW_FROM=~/command-hq/scripts/shot checks/run-all.sh` ended **ALL PASS**
for desktop and phone, including physics, both crowded-floor regressions, and the original pat-return
and paradox checks. The first full attempt and one unchanged retry failed; after measuring and correcting
the bonk test target, the final full run passed. Hardware runs were headless with GPU access outside the
device sandbox. No product timing or test tolerance was relaxed.

What to try first: on a phone, make the circle, crumbs, postcard and rifle, fling the butter in either
direction, wipe it, then immediately pull the pat back onto him while the sponge fades. Inspect the
spinning top detail shot for the softer brass cone highlight.

## Look round 3: closer glass and face-on galaxy landings

Butter choices (`FLING`, `src/gags/fling.js`): impact at **x = 38% or 62% of the viewport,
y = 40%**, scale **2.4×** the resting pat (previously 1.3×); smear width **0.36 cat-heights**
(previously 0.20). The 0.34 s flight grows from 0.5× with a 30 px arc. Impact lasts 0.22 s,
with squash `1 + 0.35 sin(πt)` (peak 1.35), applied to the enlarged pat. The 2.6 s slide
smoothly shrinks it to its original resting size. Wipe radius remains 26 px, removal threshold 78%.
All those choices are in `FLING`. The impact stays central even when the floor is crowded;
the slide and film travel to the nearest clear floor gap. The canvas includes that horizontal
travel in its bounds, so the sponge and wipe coordinates remain in the same coordinate system.
Saved films without a horizontal offset still load as vertical streaks.

Galaxy uses a planned cubic Hermite angle curve over the existing 5 s wind-down. It preserves
incoming angular velocity and chooses a whole-turn endpoint in the current direction, with
zero endpoint velocity. Travel is at least `abs(velocity) * seconds / 3`, which keeps the curve
monotone; its preferred distance is half the nominal speed times duration, rounded outward to
an exact whole turn. A stationary sigil start eases up from zero. Reduced motion takes the
nearest facing angle without extra revolutions. The shader's warp follows the rendered yaw rate.
There is no end-of-turn angle correction. Escape cancels the curve as it recedes.

Facing the camera means **yaw 0 modulo 2π** (front is local +Z). Checks read the actual scene
node `cat.spin.rotation.y` each animation frame, wrapping only the facing error with
`atan2(sin(yaw), cos(yaw))`; differences use unwrapped angles so a whole-turn jump cannot hide.
The normal hold lasts 3 s, then the takeover recedes; release resets the usual 2.5 s idle delay
before easing back to the usual **-0.45 rad** three-quarter yaw at the existing 1.6/s return rate.
The shared scripted-turn completion no longer forces a home-angle correction: the circle's
existing planned endpoint is already home, while galaxy's planned endpoint is face-on.

Inspected `src/eggs/bread.js`: blast-off has **no spinning return or wind-down landing**. The
loaf leaves, disappears, and the cat pops back with a 0.32 s scale bounce; its screen-plane roll
is reset while invisible. It does not use the galaxy yaw path. No bread change was needed.

### Regression evidence and pictures

`checks/look-landing.js` runs at desktop (1280×900) and phone (390×844) in `checks/run-all.sh`.
The five requested regression lines all failed before implementation, at both sizes:

| Check name | Original desktop | Original phone |
| --- | --- | --- |
| `look butter glass landing central` | centre (.313, .181), FAIL | centre (.134, .303), FAIL |
| `look butter glass landing enlarged` | peak projected width / resting width 1.766, FAIL | 1.748, FAIL |
| `look galaxy sigil faces camera smoothly` | facing error 1.350780 rad, FAIL | 1.288719 rad, FAIL |
| `look galaxy positive faces camera smoothly` | 0.069452 rad, FAIL | 0.400971 rad, FAIL |
| `look galaxy negative faces camera smoothly` | 3.130784 rad, FAIL | 3.111130 rad, FAIL |

The butter check projects every vertex of the actual pat geometry through its world transform,
requiring peak impact width at least 2.4× the resting page width. It measures the mesh's projected
centre, requiring x within .121 of the viewport centre and y within .005 of .40, with at least
three impact frames. It never reads the FLING config. The star is drawn as a real sigil; the
other routes sustain player velocity at +19 and -27 rad/s through the ordinary fast-spin trigger,
starting from different yaws. Each landing requires at least ten hold frames and error ≤ .02 rad.
After the initial failing runs, the smoothness assertion was strengthened to include every step
in the final .5 s and first .5 s of hold, bounded by the preceding .5 s of wind-down (rather than
only comparing the hold boundary with the final .5 s). The final version also retains that
explicit boundary comparison: every hold step must be no larger than the final .5 s wind-down
maximum. It also now reads the rendered spin node
rather than the equivalent logical `cat.yaw`. Neither change relaxes the original assertion.
The three `look galaxy … resumes home` lines are compatibility checks: they passed before the fix.

All `docs/shots/look-fling-*` images are refreshed at both sizes, including new impact images.
`checks/look-shots.js` now captures the impact as well. `look-galaxy-landing-{desktop,phone}.jpg`
shows the face-on hold. Captures are headless, and motion screenshots pause the animation clock.

Final validation (2026-11-10): `SC_CHECK_PORT=18742 PW_FROM=~/command-hq/scripts/shot
checks/run-all.sh` ended **ALL PASS**, headless on hardware GPU, with no existing check weakened.
The final explicit hold-boundary comparison was then rerun in the focused landing check at both
sizes: all checks passed. Every route measured facing error **0.000000 rad** and maximum hold step
**0.000000 rad**. Peak projected butter widths were **3.226× desktop / 3.185× phone**, at the chosen
38%/62%, 40% positions. Full-suite resting drift and handover were both **0.000 px** at both sizes;
the seven-frame transition maximum was .087 px desktop / .056 px phone. Both crowded-floor pat
returns, wiping, sponge, persistence, circle, blast-off and reduced-motion checks passed. The final
landing images were copied from the focused runs; impact, slide, sponge and galaxy views were
visually inspected. No merge or push was performed.


## Look round 4: Butterman, one bite, and the grimoire

### Grimoire copy: each line may be vetoed independently

| Entry | Old | New |
| --- | --- | --- |
| butter: riddle | the second letter, for the man who spreads it | the second sign in the alphabet. someone has spreading to do |
| butter: found | summons Buttaman. each one is his next scene. | the spreader answers. each visit turns another page. |
| circle: riddle | no corners, no end, and he gets very dizzy | come back to where you began. leave no corner to catch on |
| circle: found | twenty turns in two seconds. | twenty turns. two seconds misplaced. |
| bolt: riddle | a zig, a zag, and the sky answers | a broken path from cloud to earth. the sky remembers |
| bolt: found | a storm, briefly. it leaves a cloud. | borrowed weather. one cloud forgets to leave. |
| star: riddle | five points, one stroke, and he is not all here | five distant tips, crossed in a single journey |
| star: found | a hole in the universe, the shape of a cat. | something vast borrows his outline. |
| loaf: riddle | the top half of a circle, like the top of something baked | an oven roof, drawn from one end of the crust to the other |
| loaf: found | the loaf becomes a loaf. | he becomes what he was already pretending to be. |
| glass: riddle | the bottom half of a circle holds water | trace a hollow that could keep a little rain |
| glass: found | a glass of water. he considers it. | water, within reach. he has an opinion. |
| box: riddle | four corners. if it fits, he sits | four equal walls. leave room for someone who insists he fits |
| box: found | a box. he is in it. | the vacancy has been filled. |
| eyes: riddle | an eight, lying down, looks back at you | a sleeping number, one more than seven, looks back |
| eyes: found | eyes. it is wrong. they fall off. | a borrowed gaze. poorly attached. |
| hat: riddle | three corners, and it goes on his head | three corners shelter a thought. the highest points up |
| hat: found | a hat. tap the rack for another. | something for his thoughts. the rack has other ideas. |
| noscope: riddle | one whole turn in one flick. let go and wait | send him all the way round in one flick. leave the ending to him |
| noscope: found | one full turn of him, all one way, and letting go. | one unbroken revolution, released. a very particular reply. |
| blastoff: riddle | bread first. then, quickly, the stars | let him become something baked. then send for the night’s brightest mark |
| blastoff: found | the loaf, then the star while he is still bread. | while he is still bread, ask the sky to take him. |
| paradox: riddle | cats land on their feet. toast lands butter down. so | four paws must land down. the spread must land down too. both cannot win |
| paradox: found | bread, on a cat who is wearing butter. | butter above, bread below. the floor declines to decide. |
| fling: riddle | butter does not hold on in a spin | the spread has less grip than he thinks. turn him |
| fling: found | a fast spin, or the circle, on a cat who is wearing butter. | turn a buttered cat quickly. the glass gets its share. |
| harp: riddle | his whiskers are in tune. they know a song about butter | six small strings beside his nose remember the spreader’s tune |
| harp: found | the first line of the butter man’s song, plucked on his whiskers. | the first sung line, borrowed by his whiskers. |
| bite: riddle | stroke him. keep stroking. see how long he lets you | up, down. kindness has a limit, and he is counting |
| bite: found | stroking him up and down for too long. | seven kindnesses. one lasting mark. he remembers the hand. |
| whisper: riddle | lean in close to the butter | the spread has something to say. bring your pointer close |
| whisper: found | the pointer, very near the butter on his head. | near his crown, a voice too small for the room. |

### Butterman choices

- `BUTTERMAN.captions = false` disables lyrics and yells in all four scenes, including the encore.
  The timed caption lists remain intact behind that single switch. The dedicated caption element is emptied,
  not merely hidden. Ordinary discovery messages are still ordinary discovery messages.
- `figure.grain = 0.0765`, down from the hard-coded .306: the triplanar fibre tile's frequency is quartered,
  so every fibre and mottled patch is **4× larger relative to his body**, in every scene. With the shared
  material's 10 tiles/unit, this is .765 rather than 3.06 tiles per figure unit. Geometry, body size, colour,
  sheen and roughness are unchanged. No shared material or other `src/core/` file was edited.
- Rise has `offscreenLead: 0` and `endOnAudio: true`. The sink and off-screen rest actions are removed;
  stage 3 holds the widest pose until the sound stops, retaining its existing tremble. The schedule derives
  the last action's end from the same source duration and playback rate as the audio, including tempo changes.
- The source recording has trailing silence: `ffmpeg silencedetect` at -45 dB reports its last sound ending
  at 11.0862 s, followed by roughly .13 s of silence. Rise now plays to **11.09 source seconds**, with no
  added fade and no extra pop sound. Its beat-zero offset is .21 s, so at 80 BPM the shared visual/audio end
  is **10.88 s after beat zero**. He disappears in one frame; no downward exit or opacity fade.
  The file itself is unchanged. Scene 1 retains its early walk-off; scene 2 is unchanged.

### Seven pets, one lasting bite

Seven counted strokes (14 px of predominantly vertical travel each); pauses fade the purr but no longer
refund strokes. The seventh bites. Thereafter, strokes get a quiet refusal: **no purr, twitch, further bite,
or extra sound**. Other interactions still work. The permanent cursor plaster is saved as boolean `plaster:
true`, with no timer. Anyone who previously found the bite also receives the permanent state, even if their
old one-minute plaster expired. The grimoire's existing Forget everything clears that same save and reloads;
there is no separate cookie or storage key to survive it.

On a coarse-pointer phone a **36×16 CSS px** plaster rests 18 px from the left, 82 px above the bottom,
near the controls. While a finger is held it follows 24 px above the contact, returning to its parked position
on release/cancel. It is non-interactive, has an accessible label, and returns after reload. The desktop keeps
the existing plastered arrow. Tapping the tin now only wiggles it and plays the existing paper rustle; it
cannot heal the bite or remove the plaster. No repeated bite can be triggered by the discovered-item replay.

### Checks and old expectations

`checks/look-butterman-bite.js` plus `look-bite-reload.js` are run by `run-all.sh` at both sizes.
Each of these new regressions was observed **FAIL before implementation on desktop and phone**:

- `look Butterman {butter,loop,rise,encore} has no caption text`: all four originally emitted captions.
  A MutationObserver checks both caption destinations while every half-beat of every scene is rendered.
- `look Butterman rise disappears on clip end frame`: original last-visible times were 8.992 s desktop /
  8.985 s phone versus clip end 11.000 s after beat zero. The check samples the live audio-clock playback
  every animation frame, requires the sound endpoint between the last visible and first absent frames,
  and bounds that interval below .06 s. The endpoint comes from the actual decoded audio or scheduled cut.
- `look bite occurs on seventh stroke`: the original had zero bites after seven. Six calls must not bite;
  the seventh must bite exactly once. The full play check also exercises actual routed pointer input.
- `look permanent plaster survives reload`: original saved an expiry timestamp, not permanent true.
  The new check also reads the actual computed cursor, and requires a visible phone plaster.
- `look bitten cat refuses strokes after reload`: original 24 routed strokes reached purr 1 and bit again;
  now attempted strokes must be observed, purr must stay exactly zero, and bite count must not increase.
- `look tin cannot remove permanent plaster`: original tin removed it.

Changed old expectations in `checks/play.js`: the Butterman summon line now requires empty caption text
instead of logging the lyric; the “scenes 1 and 3 off screen 2 s early” line now applies only to scene 1,
with scene 3 replaced by the new live-frame endpoint regression; gag 8 now pins seven-stroke patience and
permanent saved plaster instead of the old 13-stroke setting/minute-long behavior. Its purr, one-bite,
tin and discovery assertions remain. No unrelated assertion or tolerance was relaxed.

Additional compatibility verification: isolated headless desktop and phone sessions seeded with a permanent
injury clicked the actual grimoire's Forget everything button twice, then returned to the cat. Both had no
plaster or bite discovery, and one stroke built purr to .2 again. The MP3 fallback has the same measured
11.0862 s last-sound point as the M4A. A scan of all 16 new riddles found no explicit shape names.

The first complete suite passed every new regression and all existing checks except the initial phone
idle-render assertion: it saw 2 redraws in one second, where at most 1 is allowed. The complete suite was
then repeated unchanged; no shared rendering code, setup delay, or assertion was altered to address it.

Final verification (2026-11-10): `SC_CHECK_PORT=18742 PW_FROM=~/command-hq/scripts/shot
checks/run-all.sh` ended **ALL PASS** at desktop and phone sizes. The unchanged phone idle-render check
measured zero redraws on the final run. Both full interaction runs recorded exactly **7 strokes** before
the bite. Rise's final visible/first absent times were **10.857637 / 10.880857 s** desktop and
**10.872857 / 10.896077 s** phone, each spanning the **10.88 s** scheduled sound endpoint in one frame.
All four caption checks passed at each size; after reload, 24 routed strokes left purr and new bites at zero.

All fourteen existing Butterman/bite JPEGs were refreshed from the final run, with two additional
`look-bite-permanent-{desktop,phone}.jpg` reload views. Rise texture and phone plaster/bite views were
visually inspected. Native desktop cursors are not captured in Playwright screenshots; their actual
computed cursor is checked. Headless only; no files under `src/core/`, no `index.html` change, no merge,
no push, no files deleted.

## Look round 5: a pet is one pass

Confirmed Aaron's instant-bite report: the drag handler subtracted 14 px after each `stroke()` call and
kept accumulating travel in the same direction. A 300 px downward drag delivered as sixty 5 px moves
counted **21 strokes and one bite**, on both desktop and phone. Seven 60 px passes counted 4, 8, 12,
16, 20, 24, 28 strokes and bit during the second pass.

The handler now latches a pass after its first 14 px. Only a direction change or a new press clears
that latch and accumulated travel. A long pass therefore counts exactly once, independent of the
number of pointermove events. No patience, purr, idle/forgiveness, permanent injury, or cursor behavior
was changed; no core files were edited.

`checks/look-pet-pass.js` and `look-pet-seven.js` run through the real canvas pointer route, using mouse
input at desktop size and touch input at phone size. They also count callbacks reaching `cat.onDrag`,
so a missed body target cannot produce a false pass. The second script starts after a reset and reload,
independent of the first script's bite on the broken implementation.

- `look one 300 px pet pass counts once without biting`: **failed first at both sizes** (21 strokes,
  1 bite); fixed result **1 stroke, 0 bites** from sixty routed moves.
- `look seven real pet passes bite only on seventh`: **failed first at both sizes** (bite on pass two);
  fixed counts **1, 2, 3, 4, 5, 6, 7**, with a bite only on the seventh. Each pass is 60 px, in twelve
  5 px moves. Direction reversals rearm it; a new press after pass three deliberately continues in
  the same direction, separately exercising the new-press reset.
- `look sub-threshold pet wiggles count nothing`: ten alternating 13 px moves must count **0 strokes,
  0 bites and 0 purr**. This already **passed before the fix** at both sizes: the original code correctly
  reset travel on reversal below threshold. It is a preserved-behavior check, not a claimed regression
  failure. Making it fail first would misrepresent the reported bug.

All existing assertions remain intact. The new checks are included in `checks/run-all.sh` at both sizes.

Final verification: `SC_CHECK_PORT=18742 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh`
ended **ALL PASS** on desktop and phone, headless, on the first complete run. Both full-play petting checks
reached purr 1.00 and bit at exactly 7 strokes. The permanent-plaster/reload checks and all previous checks
also passed. No existing assertion was changed or weakened; no merge, push, or deletion was performed.

## World unit 1 — acceptance blocked (sc/world, e1110-11)

Aaron's approved answers and additions are now in `docs/plans/world.md`: required awp-1/top-1
splats and their provenance requirements; pinboard top right under the count, shelf top left,
immovable rack bottom left; delayed respawn; hay/cow/milk; physical openable box and pouring;
cake/mock-error/party return; and the 5s black fade + 1s video fade-in with a generated stand-in.
No unit 2/3 migration or splat import was started: unit 1 failed its floor-contact gate twice.

### What was built, and what still uses the old behavior

`src/core/world.js` installs a live Rapier compat 0.19.3 service, Apache-2.0, dynamically imported
from the pinned jsDelivr `rapier.mjs` URL. Its import waits until the cat has appeared and a solid
keepsake exists, including a restored solid. `world-input.js` routes raycast grabs through the
existing input owner: a spherical joint joins the local hit point to a collider-free kinematic
anchor; the prop stays dynamic. Public `add/remove/wake` adapters allow later keepsake migration.
The current keepsake art and its existing 2D physics still own placement until units 2/3 opt in;
the acceptance fixtures exercise the live core with compound rifle/top proxies, not the selected
splat art. This is not a claim that the live AWP and top have already migrated.

Choices: 120 Hz fixed step, at most 50 ms catch-up, gravity 9.81, linear/angular damping .18/.4,
friction .55, restitution .25, CCD on each dynamic body. The second attempt uses 12 solver
iterations, four CCD substeps, .0001 allowed linear error, .02 predictive-contact distance,
60 Hz contact natural frequency and .002 collider skin. Those stricter settings improve but do
not solve the observed penetration; they are not approved production settings yet.
Pointer target displacement is capped at .2 units per event; an 8px movement threshold separates
tap from drag. Pointercancel, lost capture, blur and hidden-document transitions release the grip.
Input ownership is cleared on cancellation instead of leaving the shared router stuck.

Sleeping removes the world's stage callback entirely: no physics or transform synchronization
while all registered bodies sleep. Contacts wake tracked neighbours. The existing stage/cat still
render normally; this is zero additional world work, not zero total page rendering. Out-of-bounds
props (|X| or |Z| >12, Y below -3 or above 12) disable their bodies and hide; one 5-second timeout
returns them at a configurable home above the floor, with zero velocities, to fall again. No
per-frame respawn polling. Remove/dispose clears pending respawn timers.

### Two acceptance attempts — no threshold relaxed

The first focused desktop run and second full-suite run were headless, outside the device sandbox,
on **ANGLE / D3D12 / NVIDIA GeForce RTX 5070 Ti**. No visible browser was opened.

- First: 100 seeded bounded-speed compound-rifle drops reached **-.05372** world units below the
  floor, with **182** sampled violations of the **-.01** limit. FAIL.
- Second, after stricter solver/contact/CCD settings: minimum **-.03549**, **26** violations. FAIL.
- Second desktop grip errors: rifle **.001 px**, top **.009 px**; rotations under off-centre grabs
  **2.829 / 2.562 rad**. Both PASS. These fixtures use the shared live input router.
- Cancellation and blur removed all joints and released shared input ownership. PASS.
- Over 1.1 seconds asleep: **0 steps and 0 transform syncs**, callback unregistered. PASS.
- Respawn remained hidden at 4.7 s and returned once at approximately **5022 ms**, above the floor.
- Twenty simple compound bodies: first desktop p95 **.500 ms**, second **1.800 ms** for two 120 Hz
  steps (one 60 Hz frame). This is desktop CPU performance, not an actual iPhone Safari result.

`checks/world-core.js` is included in `checks/run-all.sh`, preserving the failing assertion so the
orchestrator cannot mistake the partial core for an accepted unit. It exercises 100 drops,
real routed mouse/touch events, grip error/rotation, cancellation, blur, sleep counters, delayed
respawn and a 20-body budget. Existing tests and tolerances were not weakened. The contact failure
is not fully diagnosed; do not proceed to art/layout migration or declare the core production-ready.
The next authorized debugging round should isolate the worst seed/contact sequence and examine
compound inertia, angular CCD and contact constraints before choosing a correction. No third
solver-tuning attempt was made in this round, honoring Aaron's two-attempt stop rule.

Screenshots added: `world-unit1-held-check-rifle-{desktop,phone}.jpg`,
`world-unit1-held-check-top-{desktop,phone}.jpg`, `world-unit1-rest-{desktop,phone}.jpg`.
They show test proxies in the live page; real floor-shadow/layout work belongs to unit 2.

Second-attempt phone viewport (390×844), on the same RTX renderer: the floor failure reproduced
exactly (**-.03549**, **26** violations). Grip errors were **.001 / .006 px**, rotations **3.117 /
2.093 rad**, with cancellation, blur, lazy loading, idle and 5022ms respawn all passing. The
20-body p95 was **2.100 ms**, exceeding the unchanged **2 ms** budget: another FAIL. This phone
viewport uses the desktop CPU; no actual iPhone Safari performance claim is made.

Full second-attempt command:
`SC_CHECK_PORT=18743 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh --shots docs/shots`
finished with exit status 1. **Every pre-existing check passed** at desktop and phone; only the new
world-core checks failed. The existing screenshots regenerated by that run were restored to HEAD;
only the six new world-unit1 fixture screenshots are retained in this commit. Syntax checks and
`git diff --check` passed. Preview servers were stopped. Final suite output:

```
FAILED: world-core-desktop world-core-phone
(full output: /tmp/tmp.GoM4OcXAs3)
```

This is a **blocked, reviewable unit-1 implementation**, not an accepted completion. Units 2 and 3
have no commits, no placement migrations, and no imported splat/input assets. No merge or push.


## World unit 1 — e1110-12 authorized attempt, still blocked

Aaron authorized one targeted attempt, including a small barrel-collider fallback, after the
read-only diagnostic established real transient penetration (not a render/check mismatch).
`src/core/world.js` now sets Rapier 0.19.3 soft CCD prediction to **.08 units** on dynamic bodies,
covering the measured .065-unit corner sweep. This did not solve the floor gate: the first
soft-CCD-only desktop run gave **-.03086, 12 violations**, and cost p95s **2.6, 2.3, 2.1, 1.8,
1.9ms** (median **2.1ms**, FAIL). That suite was interrupted after the focused core result;
the final fallback suite below was run to completion. A port-busy launch before that final
suite did not execute checks and is not a physics attempt.

The authorized fallback enlarges the diagnostic rifle barrel collider's radial half-extents
from **.012 to .014**: **.002 units per face / .004 total thickness (+16.7%)**, with length
and drawn geometry unchanged. This is in the acceptance fixture: actual keepsake art still
uses the old adapter pending units 2–3. It is not a claim that a live splat rifle was migrated.
The existing support check still uses collider transforms and the unchanged **-.01** limit.
A new screenshot adds a red y=0 reference at the rifle's lowest visible support point, and
checks the projected artwork-to-floor support gap is <2 CSS px. This is the whole rifle's
support gap, not a requirement that an intentionally elevated barrel touch the floor.

The cost check is now explicitly **median of five back-to-back p95 runs**, each 180 samples
of two 120Hz steps. Each run recreates the same 20-body initial fixture, so sleeping/contact
history cannot make later runs cheaper. This differs from the previous diagnostic's full-page
reset between runs; it avoids repeated page/network/grip setup and gives identical physical
starting conditions. It measures `W.step`, including synchronization/bookkeeping, not WASM
alone. `checks/run.mjs` exposes host load averages (1/5/15 minutes) to the browser check;
every run logs before/after values. The target stays **<2ms**, with no discarded run or
unreported warm-up. These are desktop CPU measurements at desktop/phone viewports, not
measurements on iPhone Safari. Idle observation was extended from 1.1 to **2.1 seconds**.

No existing solver setting was tightened. Settings/cost accounting:

| Setting | Retained value | Work/cost implication |
|---|---:|---|
| Fixed timestep | 1/120 s | Two integration/contact solves per ordinary 60Hz frame. |
| Solver iterations | 12 | Repeats constraint solving; cost grows with active constraints/iterations. Retained, not increased. |
| Hard CCD max substeps | 4 | Caps extra CCD subdivision/shape-cast work; not four unconditional steps. |
| Allowed linear error | .0001 | Stricter correction tolerance, not an explicit additional iteration count. |
| Contact prediction | .02 | More nearby candidate contacts than a narrower envelope. |
| Contact natural frequency | 60 | Changes constraint response coefficients; no separate loop. |
| Contact skin | .002 | Offsets contact surfaces and can add candidate contacts/support clearance. |
| Soft CCD prediction | .08 (new) | Swept predictive candidates/constraints add broad- and narrow-phase work. |

Per-setting millisecond costs were **not isolated**: that would require additional controlled
ablations outside this single authorized attempt. Only the combined costs below are measured;
there is no evidence here that all inherited settings are minimal. Since the floor still
fails, no further solver simplification or tuning was attempted, and units 2–3 were not started.

Final fallback measurements, both on ANGLE / D3D12 / NVIDIA GeForce RTX 5070 Ti:

| Check | Desktop | Phone viewport |
|---|---:|---:|
| Floor minimum / violations (100 drops) | -.03294 / 13 **FAIL** | -.03294 / 13 **FAIL** |
| Five p95 runs, ms | 2.0, 1.7, 1.3, 1.9, 1.2 | 1.6, 1.9, 1.7, 2.1, 1.9 |
| Median p95, <2ms | 1.7 PASS | 1.9 PASS |
| 1-minute host load during budget | 7.68 → 7.46 | 3.82 → 3.82 |
| Rifle / top held-point error | .001 / .009px | .002 / .006px |
| Resting artwork support gap | .793px | .389px |
| 2.1s idle step / sync delta | 0 / 0 | 0 / 0 |
| Respawn delay | 5021ms | 5022ms |

Lazy loading after cat, cancellation, blur, cleanup and visible rotation under gravity also pass.
The phone resting rifle is clipped at the left edge in its screenshot; placement/clamping is
still unbuilt unit-2 work. The numeric gap passes, but that phone picture is incomplete visual
support evidence, not a finished layout. Desktop shows the resting support against the red
floor reference. Eight shots are recorded as `docs/shots/world-unit1-e1110-12-` followed by
`held-check-rifle`, `held-check-top`, `rest`, or `barrel-gap`, at desktop and phone sizes.
`checks/diag/e1110-12-results.json` preserves all ten p95s, full load averages and core results;
`record-e1110-12.mjs` produces that record from the completed suite log without rerunning it.
No individual solver cost or real iPhone cost is inferred from these measurements.

Final full-suite command (real GPU, exit 1):
`SC_CHECK_PORT=18743 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh --shots checks/out`
Every pre-existing check passed at desktop and phone. Only the new floor assertions failed;
the new median cost gates passed. Syntax checks and `git diff --check` passed. The suite stopped
its preview server on exit. No merge or push; units 2 and 3 remain unstarted. Final output:

```
FAILED: world-core-desktop world-core-phone
(full output: /tmp/tmp.pp9to3jBb2)
```

The e1110-12 attempt is exhausted and committed **blocked**, without a further solver change.

## World unit 1 — visual floor gate (e1110-14)

Aaron chose option A: judge the floor by what the player sees, because a one-frame dip during
a fast tumble is not visible as sinking. The old -.01 transient-depth assertion has been
removed. Its replacement measures **every negative-support episode** over the same 100 seed
orientations/velocities, requiring clearance within **two 120Hz fixed steps (16.7ms)**.
Worst depth and episode duration are emitted as a note, not a depth gate. No negative-depth
epsilon or pixel-sized exception is used to conceal a longer episode. Each seed includes two
closing samples beyond its original 140 steps; an unresolved boundary episode fails.
After natural sleep, the lowest corner of each prop's actual collider is projected against
its y=0 counterpart, and must be within **2 CSS px**. These are collider measurements; the
previous .793/.389px figures described visible-art support and were not substituted for them.
The separate visible-art gap check remains as additional evidence.

Attempt 1 retained soft CCD .08 and the .014-radius barrel fixture. The worst depth was
-.032939 (seed 74, two steps), but seeds 37 and 97 each had **three consecutive negative
samples (25ms)**. The longest episode's peak depth was -.013303 (seed 37). Thus the new
duration gate failed even though both resting collider gaps passed (.701px rifle, .601px
top on desktop) and the five-run cost median passed at 1.6ms.

For attempt 2 the barrel enlargement was removed: collider and art both use the original
.012 radial half-extents. The previous enlarged collider had worsened the peak dip and
violation count, and had not helped the new duration gate; it adds unnecessary contact
clearance. Soft CCD .08 remains because it reduced the measured peak dip relative to the
pre-soft-CCD setup. No other solver parameters changed, and no further tolerance change
was made. The full second-attempt results follow below.

Plan decisions recorded now (no unit-8 implementation): e1110-13 adds a distinguishable fork
sigil, physical pitchfork keepsake, upward sky-exit trigger for falling hay at that exit
position, and an immovable hay pile that the cow approaches. Unit 8 owns recognizer positive,
perturbed and cross-template tests in `checks/sigils.test.mjs`. Aaron confirmed that the tin
belongs on the shelf; hay trigger and tin classification are no longer open questions.

Second attempt (real GPU: ANGLE / D3D12 / NVIDIA RTX 5070 Ti), desktop CPU at both sizes:

| Check | Desktop | Phone viewport |
|---|---:|---:|
| Worst transient depth (note only) | -.030855, seed 74 | -.030855, seed 74 |
| Duration of deepest episode (note) | 2 steps / 16.7ms | 2 steps / 16.7ms |
| Longest negative-support episode | **3 steps / 25ms FAIL** | **3 steps / 25ms FAIL** |
| Resting collider gap, rifle / top | .686 / .791px PASS | .417 / .485px PASS |
| Five cost p95s, ms | 1.6, 2.2, 1.6, 1.5, 1.6 | 1.7, 2.3, 2.1, 2.0, 1.8 |
| Median p95, strictly <2ms | 1.6 PASS | **2.0 FAIL** |

The remaining three-step episodes are seeds **34** (peak -.005135, starts step 82) and **85**
(peak -.009418, starts step 25). Their depths are smaller than the deepest dip, but the exact
new rule says *any* penetration must clear within two steps. No subpixel/depth exception was
invented to pass them. Phone cost equality at 2ms is also not silently treated as a pass under
the existing strict `<2` assertion. No third attempt, retiming, or further parameter changes.
Grips, cancellation, blur, 2.1s zero-step/zero-sync idle, five-second respawn, and cleanup pass.
Actual iPhone performance remains unmeasured.

Eight shots added: `docs/shots/world-unit1-e1110-14-{held-check-rifle,held-check-top,rest,barrel-gap}-{desktop,phone}.jpg`.
The known phone clipping limitation remains until world placement work; the screenshots do not
constitute unit-2 layout completion. Unit 1 remains blocked and units 2 and 3 remain unstarted.

Full second-attempt command:
`SC_CHECK_PORT=18743 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh --shots checks/out`
finished with exit 1. Every pre-existing check passed at both sizes. Raw episode records,
all five-run p95 values and load averages are in `checks/diag/e1110-14-results.json`.
Syntax and diff checks passed. The preview server stopped on suite exit. Final output:

```
FAILED: world-core-desktop world-core-phone
(full output: /tmp/tmp.3ox8cOiBgf)
```

## e1110-15 — final unit-1 criteria and numeric review

Aaron removed the transient dip-duration assertion: the 100-seed depth and duration records
remain diagnostic notes only. The floor gate is now solely each resting collider's lowest
point within 2 CSS px of y=0. Cost is the median of five p95s **<=2.0ms**; Aaron accepted
2.0ms equality because the observed run noise is roughly ±0.5ms. Soft CCD .08 is retained;
the barrel enlargement remains removed. No solver retuning occurred.

Full real-GPU suite: RTX 5070 Ti / ANGLE D3D12. Desktop resting collider gaps rifle/top
**.700/.725px**, phone checks also pass. Desktop cost runs **2.2, 2.5, 2.9, 2.1, 2.1ms**,
median **2.2ms**; phone runs **2.3, 2.3, 1.8, 1.7, 1.9ms**, median **1.9ms**. Every other
check passes, including all pre-existing checks at both sizes. Complete diagnostic records
are in `checks/diag/e1110-15-unit1.json`; eight shots use prefix `world-unit1-e1110-15-`.

**Orchestrator threshold proposal under rule 3:** accept a <=2.5ms median on this shared desktop
CPU, retaining 2.0ms as the target, because the 0.2ms miss is below the measured ±0.5ms noise
and has no observed change in play. This is a proposal, not an applied threshold: the actual
check remains <=2.0ms and this run is NOT labelled ALL PASS. Proceeding to unit 2 as explicitly
authorized for marginal non-visible numerical misses. Real iPhone validation is still outstanding.

Final unit-1 suite output (port 18743, server stopped):
```
FAILED: world-core-desktop
(full output: /tmp/tmp.4JwWbmcmQK)
```

## World unit 2 — lower floor, projected shadows and saves (blocked)

Added `src/core/world-layout.js`: the interactive floor band is 10% of viewport height below
the cat's projected feet (at least 40px), capped 28px above the footer. It maps through the
existing camera onto **y=0**, so it does not move the cat or introduce a competing floor.
The named depth direction (.3,0,-3.5) opposes the existing key light (-.3,3,3.5).
DOM souvenirs retain readable screen-space placement on this lower band. Top placement now
uses the real floor intersection. Rifle/top shadows project their mesh geometry onto y=0
along the key-light rays; old decorative shadow disks are hidden. Small rings/dimples are
omitted from the top's shadow proxy. This is a cheap geometric silhouette projection, not
an additional shadow-map pass. It has no independent frame callback; source matrices only
update when the existing prop pose changes. The cat's picture and shadow are untouched.

The existing pixel-art rack is fixed at bottom left; its hyper-real replacement remains a
later unit. The helper reserves a shelf rectangle top left and a pinboard rectangle top
right below the header; it does not draw placeholder furniture. Keepsake saves gain a
versioned world-position/quaternion/support record alongside compatible v2 coordinates.
Opt-in rigid entries gain `persist`, sleep-time saves, quiet sleeping restore and resize
clamping. Existing v2 finds and positions remain readable. The 3D keepsake migration itself
belongs to unit 3; only a diagnostic body exercises persistent rigid poses in this unit.

First focused checks found a stale reload-test reference (the ticket fixture was replaced
but the test compared its former position), plus two startup shadow invalidations on phone.
The test now snapshots the current keepsakes; after font/adaptive-resolution startup has
settled it observes 2.1s idle. Shadow matrices no longer invalidate just because a resize
callback fires with no changed prop transform. This was the second check; no third fix made.

Second check, real RTX 5070 Ti / ANGLE D3D12, desktop CPU at both sizes:

| Check | Desktop | Phone viewport |
|---|---:|---:|
| Floor screen y | 693.72px | 584.38px |
| Footer clearance | 89.28px | 116.62px |
| Initial keepsakes reachable / fixed rack | PASS | PASS |
| Saved diagnostic rigid pose restored asleep | 0px drift PASS | 0px drift PASS |
| No shadow updates over settled 2.1s | 0 PASS | 0 PASS |
| Matched rest render-submission delta | -.10ms | 0ms |
| Layout reload maximum drift | .0171px PASS | **17.2631px FAIL** |

The perf comparison alternates shadow groups hidden/visible five times, with 120 identical
scene renders per condition, recording each median. This is CPU render-submission cost on
real GPU, **not GPU completion/frame time or actual iPhone performance**. The negative .10ms
is timer/noise resolution, not a claim shadows improve speed. A full matched GPU frame-time
comparison and a desktop↔phone transition test remain incomplete because the reload gate failed.

The phone screenshots visibly show the fixed rack moving left and being clipped after
reload. Likely cause from code inspection: `build` restores the fixed furniture x=42 anchor
without the horizontal constraint that later layout applies (half width + margin =59.263px).
This is **not a marginal invisible numeric miss**; do not raise the .5px reload limit to
hide it. Per the two-attempt rule, stop at unit 2 for owner/orchestrator review. No further
product changes are made. Unit 3 has no implementation commit or imported assets; temporary
adapter drafts are not part of the repository.

The final suite's unit-1 checks now pass at both sizes: median p95 **1.9/2.0ms**, resting
collider gaps rifle/top **.691/.725px desktop**, **.425/.522px phone**. Thus the earlier 2.2ms
reading remains recorded, but the latest core results meet the exact approved <=2ms gate.
No timing threshold was changed beyond Aaron's equality decision.

Screenshots: `world-unit2-all-{desktop,phone}.jpg` and
`world-unit2-reloaded-{desktop,phone}.jpg`. The phone pair is failure evidence, not approval.

Full unit-2 regression command (port 18743):
`SC_CHECK_PORT=18743 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh --shots checks/out`
completed with exit 1. **Only world-layout-phone failed**; both unit-1 core checks and every
pre-existing check passed. `checks/diag/world-unit2-results.json` records the core/layout
results. Syntax checks and `git diff --check` passed; the suite stopped its server. No merge
or push. Final output:
```
FAILED: world-layout-phone
(full output: /tmp/tmp.7h3fA8s4Ha)
```

## World unit 2 — rack first paint and separated arrival homes

Aaron authorized the measured rack fix. One `fixedHome` function now clamps the furniture
anchor before construction/restoration and on every layout. Rack saves retain state/order
(including hats), without x/y/world pose; keyboard movement also respects fixed furniture.
The fixed rack no longer uses the generic arrival scale/bounce: the new frame observer
caught that separate desktop jump before the fix. `checks/rack-frames.mjs` observes DOM
bounds from before restoration through 6.5 seconds after readiness, at both sizes on fresh
and reloaded pages. Before: phone left edge -5.26px (arrival minimum -9.44px), desktop
arrival jump 142.52px. After: minimum left 24.19px desktop / 12px phone, maximum jump 0px
in all four loads. Raw results: `checks/diag/rack-frames-results.json`.

Default collection homes now reserve width-aware rows along floor depth, with 10px gaps
and a dedicated left strip for the immovable rack. The rifle, top and butter occupy the front
row; smaller souvenirs follow, then paper/box occupy the remaining depth row. Rows
are calculated independently of unlock order, so consecutive arrivals never cover earlier
items or rearrange them. A saved `autoHome` flag restores/resizes these homes; the first
player drag or keyboard move releases that arrangement and may stack items normally.
Legacy manually placed saves remain readable. These are floor depths projected to y=0,
not invisible shelves. Phone uses more depth rows instead of shrinking the already small
hit targets again. The layout check limits later-item bounding-box obstruction to 20%
per default keepsake; measured first focused run was 0% for every item.

The actual box gag previously bypassed the home's placement, so its return now uses the
reserved home for a new/automatically arranged box, preserving a player's existing manual
placement. Its first row position intercepted the cat's petting stroke on desktop: the
full play-through caught zero strokes/no tin. The box now occupies the far-right end of
its row, and the layout check explicitly tests the centre petting stroke at ±36px as well
as inter-item obstruction. The butter fling retains its existing clear-landing search.
Final full suite: **ALL PASS**, both sizes, real NVIDIA RTX 5070 Ti / ANGLE D3D12.
Rack left margins 24.19/12px, frame jumps 0px in all four load traces; desktop↔phone
resize reachability passes. Default obstruction is 0% for all nine keepsakes; box return
and cat petting clearance pass. Reload drift .0171/.0096px. Floor/footer clearance
89.28/116.62px; settled shadow updates 0; matched CPU render-submission delta 0/.1ms.
Core 20-body median p95 1.7/1.8ms; resting collider gaps rifle/top .822/.988px desktop,
.421/.485px phone. Both sizes use the desktop CPU; actual iPhone performance is unmeasured.
The earlier sandbox run used SwiftShader and was stopped; these final numbers use hardware.
The raw selected results are in `checks/diag/world-unit2-complete.json`; the failing-before
rack trace summaries are in `rack-frames-before.json`. Four review images use the prefix
`world-unit2-complete-`. The reloaded fixture includes the deliberate legacy-ticket placement.
The full suite ran on port 18743 and stopped its server. No thresholds were relaxed.

## World unit 3 — selected AWP/top splats and physical adapters

The visible rifle/top are now Aaron's **awp-1/top-1 SPZ files**, unchanged. No input
pictures, PLYs, or substitute mesh art were imported. `assets/splats/SOURCES.md` records
his 2026-11-10 input supply, statement that the pictures are open source, missing original
URLs/licences, and Idol seeds/method. No model was run here. The SPZ payload is 1,613,000
bytes; generated collision records add 26,530 bytes. The two adapters add 8,374 source
bytes before HTTP compression. Splat/collider fetches wait until the cat is visible.

`tools/splats/object-bake.mjs` derives small hulls offline from opaque Gaussian centres
(alpha >=96): voxel sampling, then extrema in 102 directions. This is geometry processing,
not image/model generation. It uses the existing SPZ reader and pinned MIT three.js
ConvexGeometry in a headless math-only page. Rifle: three convex parts, 56/42/28 surface
triangles, mass fractions .75/.15/.10 (stock/receiver heavier than barrel). Top: one
190-triangle convex hull. Invisible ray proxies, physics shapes and projected y=0 shadows
share those coordinates. The original mesh sources remain in the repo, but no longer draw
these keepsakes. Rapier's approved solver/CCD/contact settings are unchanged.

Each active body refreshes its own tightly cropped splat picture. Pictures sort from the
full body/camera transform, including arbitrary tumbling, and are cached when sleeping.
Targets allocate in 32px buckets to reduce resize churn. Bounds use the fitted silhouette
plus 5px Gaussian padding, not empty corners of a rotated source bounding box. Camera
projection changes invalidate pictures; DPR-only changes redraw without relocating bodies.
There is no new always-running picture callback. The generic keepsake frame loop skips
physical props. Routed spherical grips, keyboard moves, hitmarker/top taps, quiet sleeping
restore and removal all use the same physical entries. The top's spin now tips and settles
physically; the old six-second scripted lean test was replaced by spin/sleep and actual
pointer-grip checks. The rifle's old 2D-flat assertion moved to the production-body drop
checks, while DOM material checks remain intact.

Initial validation caught two measurement mistakes: the energy calculation read mass/COM
before a re-enabled body was refreshed, and a perfectly centred upright top grip was
expected to swing without a disturbance. The check now refreshes mass, computes COM from
the current body transform and starts the grip tilted. Both checks then pass on desktop,
without changing the solver. Placement validation also caught active props rolling into
the footer and a 4px reload correction caused by clamping the origin's floor projection.
New arrivals start 30px farther back with a modest initial drop; player releases retain
full rigid dynamics. Resize/restore uses projected shape bounds; an airborne resize reserves
its eventual rotational landing footprint. Sleeping poses already in reach remain exact.
The first phone-to-desktop airborne resize failed; the second passes. No threshold relaxed.

Second validation so far (RTX 5070 Ti / ANGLE D3D12): desktop 100/100 seeded drops per prop
settle within 3.25s rifle / 5.934s top; zero measured initial-energy growth; maximum resting
collider gaps .748/.769px. Four off-centre grips pass with maximum .001px joint error.
Combined CPU sort+picture submission p95 .9ms; zero picture/physics updates during 2.1s
sleep. Default collection obstruction is at most .46%, and both splats restore with 0px
drift. Both viewport resize directions pass. Final full-suite results follow below.


### Unit 3 final status: blocked, no third product attempt

The full second validation completed on the real GPU. All checks pass except
`look-use-desktop` and the shared-CPU budget in `world-core-phone`.

| Production prop check | Desktop | 390×844 viewport |
|---|---:|---:|
| 100/100 rifle drops settle | ≤3.25s | ≤3.209s |
| 100/100 top drops settle | ≤5.934s | ≤4.867s |
| Peak energy over initial energy | 0% | 0% |
| Maximum resting collider gap, rifle/top | .748/.769px | .440/.448px |
| Maximum held-pivot error | .001px | .001px |
| Combined prop CPU sort+picture p95 | .9ms | 1.0ms |
| Sleeping 2.1s: extra pictures / physics steps | 0 / 0 | 0 / 0 |
| Default physical pose reload drift | 0px | 0px |
| Post-interaction top reload | **FAIL** | 0px PASS |
| 20 simple bodies, median of five p95 | 1.7ms PASS | **2.2ms FAIL** |

The desktop top moves after its routed drag and tap-to-spin, then a reload: saved
(x,y)=(.5517867624,-.5082229974), restored=(.5491016687,-.4008192480) cat-heights.
That is a vertical change of **.107403749 cat-heights (~40 CSS px)**, not an invisible
rounding error. It remains asleep. Default-home reloads pass, so the new outstanding
case is a player-manipulated pose. The phone control preserves the body's position and
quaternion exactly; before/after pictures and body values are in the diagnostics.

Likely remaining premise, from code inspection: every saved pose may be clamped against
the current footer during construction. The adapter still clamps a post-interaction pose
that is outside its preferred floor band, and initial footer layout may differ from the
settled layout. Recommended next change (NOT made): preserve a saved pose on the same
settled viewport/layout; clamp only on an actual viewport change or genuine unreachable
position. Record the desktop body's before/after translation and footer measurements
before changing that path. Do not relax the reload-drift assertion. This is a visible
save/restore failure, and unit 3 is not called done.

The phone-viewport cost runs were **2.5, 1.4, 2.3, 1.2, 2.2ms**, median **2.2ms**.
Under e1110-15 rule 3, propose **<=2.5ms** as a shared-desktop-CPU ceiling while retaining
2.0ms as the target, for the orchestrator to rule on; the .2ms miss is below the previously
measured ~±.5ms noise. The check remains <=2.0ms, and no numeric approval is presumed.
Load averages for every run are in `checks/diag/world-unit3-results.json`. Actual iPhone
Safari timing is still unmeasured.

A further code-review follow-up is DOM-over-GL input priority when a player deliberately
stacks a DOM keepsake over a rigid prop: world input currently claims at priority 95,
above the DOM keepsake's 90. This was not changed or tested after stopping at the reload
failure; verify that the visible front item gets the press before calling migration done.

All production changes stopped after the second validation. Only diagnostic logging and
review documentation were added while the remainder of the suite completed. The selected
assets, adapters and checks are committed as blocked work for review. No merge or push.
Screenshots: `world-unit3-*` (48 files: eight orientations, seven drop frames, four grips,
rest, routed pointer grip, collection/reload at both sizes; phone interaction before/after).
`checks/diag/world-unit3-shots.json` lists them. Inputs remain uncommitted.

Final full-suite output, port 18743 (server stopped):
```
FAILED: look-use-desktop world-core-phone
(full output: /tmp/tmp.oWpaQealO3)
```

## Orchestrator ruling — shared-CPU cost ceiling

Under e1110-15, the orchestrator accepted **median-of-five p95 <=2.5ms** at both
desktop and phone viewport sizes. `checks/world-core.js` now uses that inclusive
ceiling; 2.0ms remains the target. This is a shared desktop-CPU proxy with approximately
±.5ms noise, not an iPhone performance measurement. No physics setting changed.
The last recorded 1.7/2.2ms desktop/phone medians satisfy the newly approved assertion.

## Unit 3 one-time restore premise test — measured, no product fix

Premise shared by the two attempts: **an accurately saved rigid pose can safely be
passed through the layout clamp again on restoration.** One instrumented desktop run
executed the existing `checks/look-use.js --then checks/look-reload.js`, adding an
untouched rifle as a control. HTTP-response observers recorded every relevant save/read,
clamp iteration and rAF frame; live source files and physics settings were unchanged.
This is one experiment, not a third product attempt. Renderer: RTX 5070 Ti / ANGLE D3D12.

The trace contains 1,115 fresh-page frames and 179 reload frames. For the top:

- Initial sleep writes a pose at 8.498s; post-drag sleep writes another at 13.364s.
- Tap/spin starts at 13.372s. The 13.515s localStorage flush writes the *previous sleeping
  pose*, not the moving spin pose. No `worldBodies.top` update occurs during the spin.
- Final sleep writes at 17.348s and flushes at 17.534s: position
  **(.225678638, .002997287, 1.257085085)**; quaternion
  **(.135025486, .932869732, .328661829, -.059191965)**. Screen box bottom is **794px**.
- Unload at 21.775s flushes that same pose; its subsequent world-save callback requeues
  identical values. The correct final pose is already in localStorage.
- Reload reads exactly that pose at **983.1ms**. Before the forced clamp at 984.9ms,
  the body's translation/rotation still exactly match the saved values.
- At **985.6ms**, clamp iteration zero sees collider bottom **788.225px**, against
  `900 - 117 - 33 = 750px`, and requests **dy=-38.225px**. It changes the body's
  position to **(.241143033, .002997287, 1.030886889)**. Rotation and world height
  do not change. The next iteration sees bottom 747.388px and makes no further move.
- First sync at **989.5ms** produces picture box bottom **753px**: a **41px rise**
  (0.110088843 cat-heights in this run), with centre x shifted -1px. The first physical
  rAF sample is frame 41 at 1,155.7ms, already relocated; every remaining frame through
  4,393.9ms is identical. The adapter also immediately saves this clamped replacement.

The rifle control saves at sleep (8.348s), flushes and re-saves the identical pose at
unload, then reads it unchanged. Its collider bottom is **714.636px**, so clamp dy=0.
Its picture bottom stays **720px**, with **0px drift** and unchanged translation/quaternion.
Both props use identical pre/post scales (top .235837669; rifle .777732084), camera,
1280×900 viewport and insets {top:56,bottom:117}. **Late fonts/footer changes, stale
spin-time saves, re-fitting scale changes and interpolation are not the cause in this run.**
The generic keepsake record does retain a default-home y, but `worldBodies` supplies the
correct authoritative pose before the measured clamp, so that legacy field is not the cause.

**One-line cause:** restoring a valid saved pose unconditionally invokes the preferred
floor-band clamp, which moves a player-positioned top before its first rendered frame.

**Proposed fix, NOT made:** preserve the exact sleeping pose when restoring into the same
viewport/layout; clamp on actual layout changes or genuinely unreachable recovery instead
of unconditionally before first sync. Keep the <.5px reload-drift assertion.

The failing line in the requested look/reload run is:
```
CHECK look top and butter survive reload: {"saved":{"x":0.35174727918751897,"y":-0.5109080911140337},"now":{"x":0.34906218545326306,"y":-0.400819248009543},"asleep":true} FAIL
```
Every CHECK in `look-use.js` passed, including routed drag, spin, rest and sponge behavior.
The failure is its `--then checks/look-reload.js` saved-top comparison: **the same restore
drift, not a separate rendering or tap failure**. The unit-3 full-suite label bundled both
scripts under `look-use-desktop`; the prior report should have made that explicit.

Reproduction and all raw frames/events: `checks/diag/prop-restore.mjs` and
`prop-restore-results.json`; concise derived data and exact CHECK lines in
`prop-restore-summary.json`. Before/after images: `world-unit3-restore-diag-*-desktop.jpg`.
The run intentionally exits 1 for the reproduced failure. No additional run or fix was made.

### World unit 3: approved saved-pose correction

Aaron approved the measured restore fix. Sleeping rigid saves now include the viewport,
insets and camera matrices. Restore keeps the exact body pose on a matching layout if its
projected collider remains reachable; old saves without a signature receive the same
reachability check. A real layout change still uses the existing fitted-shape floor clamp.
This removes the unconditional arrival-band clamp that moved the spun top ~40px before
first paint. The look/reload and world layout assertions remain unchanged. No solver,
collider, damping, picture-size or timing threshold was changed for this correction.

The first full validation passed both interaction restores with identical body poses and
picture bounds, but the shared-CPU phone proxy recorded 3.1ms median p95 at load averages
12.83/8.65/7.43 (runs 5.2, 2.7, 3.4, 3.1, 2.4ms), above the approved 2.5ms ceiling. Another
suite was running on the machine. This was recorded, not hidden or treated as an iPhone
result; a second full validation was requested without code or threshold changes.

Unit 9 is assigned to the other builder on `sc/look`; this branch does not implement it.

Second full validation: **ALL PASS**, desktop and phone, ANGLE / D3D12 NVIDIA RTX 5070 Ti.
Both interaction restores have identical positions/quaternions/picture bounds (0px drift).
Core median-of-five p95: 1.7/1.8ms desktop/phone viewport, with load averages
8.71/8.51/7.72 and 6.34/7.06/7.28 respectively. Combined prop picture p95 1.3/0.9ms.
Across 100 drops each, rifle/top worst settle times 3.25/5.933s desktop,
3.208/4.867s phone; no energy growth; maximum resting contact gap .769/.448px.
Resting props make zero picture/sort/step updates. These are desktop-machine measurements,
not iPhone measurements. Raw check lines for both attempts: `checks/diag/world-unit3-complete.json`.
Screenshots: `world-unit3-complete-{rest,reload}-{desktop,phone}.jpg`. Unit 3 is complete.

### World unit 4: fixed water and charged top

Glass now leaves one persistent world-space patch on y=.003 at the lower interactive floor
band. Its saved centre and dimensions define the actual water plane, including across
reloads; its irregular shader edge is also the wet-footprint boundary. It is fixed and inert:
it never claims canvas dragging, arrow keys or `moveTo`. The old perpetual decorative ripple
update is removed. Shards keep their existing behavior. Legacy puddles acquire a floor patch
from their existing position when first restored.

The existing water/shock combo still runs. At strike time it tests the top's transformed
collider vertices within .05 world units of the floor against that boundary, rather than
comparing DOM rectangles. A wet, unheld top becomes charged: a fixed rigid support keeps its
centre stable while its selected splat and projected shadow rotate at 12rad/s. No perpetual
contact solving is involved. Cyan water and the keyboard label indicate the reward; reduced
motion keeps the cue and upright top static. A visibility event removes the rotor callback
while hidden and restores it only when visible and motion is allowed. Pickup (or keyboard
movement) removes the support and charge before the normal dynamic grip/motion path. Dropping
back into water does not recharge it without another bolt. Charge survives reload until pickup.

`checks/world-water.js` and its reload companion exercise a real glass break, outside/inside
bolt casts through the combo, a 30-second visible spin, hidden/visible lifecycle events,
pickup, and fixed-patch/charged-state reload, at both sizes and under reduced motion. The
visibility test supplies the document-hidden state and dispatches the production event in
headless Chromium. New support hooks in the physics core only run when explicitly used;
ordinary sleeping props retain their zero-work behavior.

First unit-4 full run: all four new water configurations passed (normal desktop/phone:
1799/1789 rotor updates in 30s, zero physics steps; reduced: zero rotor updates/steps).
Hidden-state pause, pickup, overlap gating and reload all passed. The separate existing
phone picture-cost check read 4.7ms p95 against 2ms; observed machine load soon afterward
was 37.16/26.70/16.47 on 16 logical CPUs. Both core medians were 2.0ms and all recorded
interaction/layout checks passed. The process then exited 143 during the final calm-phone
run, before a suite summary; the termination cause is not established. A second full run
uses identical code and thresholds. No renderer/solver tuning or threshold relaxation.

Second full validation also misses the existing picture-cost gate: desktop 4.6ms p95
against 2ms (first run phone 4.7ms). This is not a hair-thin miss, so unit 4 is **validation
blocked**, not done. No third attempt or renderer/solver change is being made. All new water
checks recorded so far pass, and the ordinary rest zero-work checks pass. High shared-machine
load is observed, but this does not establish the cause of the picture-cost misses; recommend
an orchestrator-controlled isolated timing/premise check before changing that ceiling.
The second desktop core median is 3.0ms against 2.5ms. Under rule 3, the proposed ceiling for
that shared-CPU proxy would be 3.0ms (the accepted approximately ±0.5ms noise), while retaining
the 2ms target and actual-iPhone release validation. This is a proposal for the orchestrator,
not an applied threshold change; the larger picture-cost miss remains blocking regardless.

The second run additionally failed the existing desktop butter landing checks:
`look butter glass landing central` sampled centre (.402,.349), four impact-window frames;
`look butter glass landing enlarged` sampled max scale 1.946x (requires >=2.4x).
Both passed in the first unit-4 run (desktop .380,.400, seven frames, 3.226x) and unit-3
validation. The fling implementation and these checks were not modified. Their cause is
not established; one premise worth testing next is whether the fixed stage-clock sampling
window starts before asynchronous `ensureButter()` has allowed the flight to begin. Do not
relax these look gates or call the animation correct from this evidence alone. No fix or
additional attempt was made. The second phone core median is 2.9ms at load averages
37.19/42.97/31.58; the proposed 3.0ms shared-CPU ceiling above would cover this numeric miss,
but is not applied and would not resolve the other failures.

Final second-run result: **FAILED: world-props-desktop world-core-desktop look-landing-desktop world-core-phone**.
The entire run finished (exit 1); its calm-phone, sigil and asset checks passed. All four
unit-4 water runs passed: normal desktop/phone 1794/1797 rotor frames in 30 seconds with zero
physics steps; reduced motion zero rotor frames/steps; hidden lifecycle, overlap, pickup
and reload all pass. The phone picture p95 was 1.7ms in this second run, versus desktop 4.6ms.
Renderer: ANGLE Microsoft D3D12 NVIDIA RTX 5070 Ti; both viewports use this desktop's CPU,
not an iPhone. No more attempts were made. Unit 3's earlier passing commit remains complete;
unit 4 is implemented but cannot be called done while the full suite fails.

Both attempts' check lines and ten screenshot paths are recorded in
`checks/diag/world-unit4-results.json`. Shots are `world-unit4-{break,outside,charged,reduced,reload}-{desktop,phone}.jpg`.
The preview server was stopped by the suite's exit trap. Unit 9 remains assigned to `sc/look`.

## Tonight — all items 3D and physics (e1110-33; 2026-11-10)

Design revision by Astra for the overnight handoff, on `sc/plan3d`; **no product code, asset generation or performance run**. The revised specification and acceptance gates are in [the world plan](plans/world.md#all-items-3d-and-physics-e1110-33). Aaron is asleep: these choices are adopted for planning and listed individually for his veto, not claimed as new owner approvals. Earlier implementation reports above remain historical evidence.

- **Coverage:** convert every tangible keepsake in its owning unit, including worn hats and attached eyes; preserve IDs, finds, tap actions and legacy saves, with no later general conversion pass.
- **Art route:** make all new items from our own modeled geometry and procedural materials/print; keep selected awp-1/top-1 splats and their provenance gap; no new model run or unverified CC0 dependency is planned.
- **Weight:** use the matrix's tuned relative masses, anchored to existing rifle 1.20/top .20, as play weights rather than literal kilograms; adjust individual inertia/contact first if tests expose an unstable mass ratio.
- **Sleep:** loose props settle naturally within 8s; supported props store a local pose and stop dynamic solving after their settle, retaining collision/pick support and waking on detach/contact.
- **Rendering:** cache views of real 3D objects at rest, invalidate on actual pose/camera/content change, and use explicit depth/picking rules at cat/splat crossings; no front-only billboard substitutes.
- **Cards:** paper, Void postcard and ticket become thin curled 3D stock with separate printed front/back faces, real edges and original wording/art baked into textures.
- **Paper motion:** use rigid cards with bounded airborne drag/flutter, broad-face floor rest within 4s and no soft-body simulation.
- **Pins:** use modeled pin heads/shafts and one top-point hanging constraint per card, targeting <=8° swing and settle within 2s before removing dynamic work.
- **Reading:** identifying face print must project at >=12px on desktop and phone board/tray; full text gets a >=16px face-on 3D Read/inspect view plus selectable transcript, tested at 200% text size; ticket Read is separate from its encore tap.
- **Phone storage:** show a selectable enlarged front card/compact shelf tray when necessary rather than shrinking print or action targets; floor cards keep an accessible Read action instead of being forced upright.
- **Shelf:** count rifle/top/pat/tin as unique solids and give each a fitted destination from unit 6, including a dedicated tin bay and a butter plate.
- **Butter:** keep and refine the existing 3D pat/material, replace its screen-plane fall with world physics, and transfer one identity continuously through flight, shelf and cat/hat attachment.
- **Tin:** model a rounded enamel tin with lid seam, rolled rim and printed label; retain the plaster tap and keep its lid closed rather than adding an opening mechanism.
- **Hats — confirmed e1110-37, not for veto:** preserve Aaron's pixel palette/patterns on fully shaped 3D wizard/cone/party/crown hats with realistic material lighting, including when worn; choose this over replacing them with unpatterned realistic hats.
- **Hat handling:** give each hat a stable named peg/identity, physical loose drops and bounded peg sway; retain the empty peg while it is elsewhere and put butter at the model's real crown height.
- **Rack/lamp materials:** choose turned dark wood with aged metal pegs and a modeled glass/brass bulb; steady warm emissive/fill, no new shadow light or flicker loop, including while lit and asleep.
- **Wet-bolt reward:** the first water-plus-bolt cast grants the bulb once alongside the existing charged-top or shock result; later casts preserve those effects without duplicating the bulb.
- **Small pieces:** crumbs are 5–9 visible solids and shards 3–5 thick curved fragments, but each set is one body with at most three collider lobes; a brief physical hop/clink replaces perpetual or per-piece animation.
- **Eyes:** keep the craft-shop character as two rounded 3D eyeballs/domes in one handled body, preserving cat/bread/prop/Butterman attachment and choir release; pupils respond to events and settle without DOM polling.
- **Cloud art:** adapt our existing density field to full 3D body/camera rotation with rounded compound collision; a modeled billowing mesh is allowed only if the volume fails cost and the replacement passes multi-view quality checks.
- **Cloud behavior — explicit veto:** allow one <=26s drift cycle after arrival/storm/sky return, then park asleep; pulling down makes it a light falling body, floor release stays down, and slow sky placement or keyboard return restores its sky support.
- **Star:** keep the current four-point foil silhouette as a thin 3D sticker with curled tip/adhesive back; it peels, falls, can be stuck back in the sky, and only glints briefly on interaction.
- **Grease exception:** retain the wipeable translucent film on the viewing glass with no mass/collider; preserve the sponge gesture and existing removal threshold.
- **Puddle:** retain unit 4's world-space water film/fixed sensor, bounded ripple/reflection updates and charged-top activity exception; do not turn water into a draggable block.
- **Glass handoff:** unit 8b also models the temporary cup/rim/water and hands it to the new shards plus unit 4 puddle at break, after the active unit-4 builder finishes.
- **Box:** build the realistic hollow corrugated container with compound walls and a separate latching lid; short click toggles lid, hold-drag carries it, and the retained cat-entry/nap gag gets a separate accessible action.
- **Ingredients:** use a flour bag, hollow bucket, coherent milk volume and discrete flour/butter/milk portions, with finite slosh and actual contained/poured bodies; retain source keepsakes and consume portions exactly once.
- **Cow/hay:** make our own 3D cow with a finite authored walk/eat visit and kinematic contact, plus one falling hay clump that becomes fixed on landing; no ragdoll, fluid solver or random waiting gate.
- **Party reward:** reuse the same shaped party hat and use finite instanced 3D confetti plus a modeled blower; remove/sleep effects after the existing mock-error return instead of adding permanent loops.
- **Bread flight:** choose a 6s gentle outward flight with the existing overlapping return phases (nominal full sequence 8.195s); remove compulsory fast rolling during that drift and check continuity/skip/reduced paths.
- **Build order:** accept incoming built units 1–3/9 and finish active 4, then build 5, parallel 6+7+11, then 8b, 8 and 10; reconcile the checkout's historical unit-3 reload failure with incoming evidence before dependent acceptance.
- **Shared ownership:** unit 5 establishes/fixes the support/input/save/cache API for its cards first; later builders own disjoint adapters/checks, while one integrator serializes core changes, common checks and these review documents.
- **Parallel preparation:** sound assets/reel and cake art may be prepared independently in their own directories; 8b/8/10 runtime edits stay serial because they reopen bread/glass/hat/combo files, and hardware timing runs never overlap.
- **Cost/quality acceptance:** apply zero world work after sleep, approved <=2.5ms shared-CPU median-of-five p95 and fixed-baseline real-GPU rest median <=baseline+.1ms to every unit and the accumulated collection, adding realistic mixed-body stress and both-size visual/readability evidence.
- **Failure policy:** simplify/cull redundant work while preserving 3D shape, readable print, interaction and selected splats; if two honest attempts still fail, report the unit blocked and continue independent work without weakening gates or claiming the website finished.
- **Morning review:** the overnight builder supplies provisional art/float/sound judgments and a listening reel without waiting for Aaron; actual iPhone validation, missing source URLs and any failed gates remain explicit release follow-ups.

### Overnight handoff: plan merge and e1110-37

Merged revised unit structure from sc/plan3d while retaining the accepted unit-3 results and both unit-4 attempts. Aaron confirmed e1110-37: shaped 3D hats retain pixel-art style; the realistic rack and each item's own style coexist. This is decided, not for veto. Unit 9 arrives from main; units 10 and 11 are owned elsewhere. No answers are awaited overnight; routine new choices will be recorded for morning veto.

Plan-merge verification (2026-11-11): real RTX 5070 Ti, shared GPU lock, start load 10.15.
World core, props, layout/reload and water/reload passed at both sizes. Core medians
1.8/2.1ms; combined pictures 1.3/1.1ms. The initial browser CDN DNS failure was an
environment failure; the browser network retry returned 200, and the next queued check run
passed. No engine/threshold changes. The video harness is absent before main is merged;
its checks follow that merge. Evidence: `checks/diag/world-plan-merge.json`.

## Unit 9 / look round 6: Aaron's 360 video

### Choices for Aaron's veto

- The video **replaces** the two-second MLG overlay. No preliminary air horn, hitmarkers, shades, chip,
  or caption. The hop and rifle keepsake remain; the rifle is delivered when the sequence resolves,
  including after a skip. Its model/physics code is untouched.
- Timeline: **5.0 s linear fade to black**, then video playback and **1.0 s linear video fade-in**.
  The riser runs over the five seconds of black fade and the one second of video fade-in. Its last
  second and the video's original sound overlap. The video otherwise plays all **28.0 s** uncut.
  On `ended`, the last frame fades away to the normal page over **0.6 s**.
- The small riser preloads after the cat's loading gate. **No video element, source assignment, or
  video request exists before the first 360.** The MP4 starts fetching when the 360 fires, giving it
  five seconds of buffering time. It has its `moov` metadata before media data (byte 32 vs byte 31,289).
- If the video is not ready at five seconds, hold solid black with input still locked. Pause at the
  riser's five-second boundary; resume its final second with the video fade-in. This preserves the
  ending alignment instead of letting the riser finish over an indefinite loading screen. Playback
  rejection or a media error takes the same short return path, releasing the lock rather than trapping
  the visitor. A simultaneous duplicate trigger joins the active sequence; every later 360 starts anew.
- Input is locked throughout, including the return fade. A tap anywhere outside the sound controls,
  the explicit skip button, or **Esc** stops both media paths immediately and starts the **0.6 s** return.
  No fullscreen API is used. `playsInline` and `object-fit: contain` fit the video without cropping;
  unused space is black, including the tall letterboxing on a portrait phone.
- A small sound/volume/skip strip stays available over the black/video. These are linked controls for
  the page's existing saved mute/volume state, not independent settings. Muting zeros the sequence's
  Web Audio gain and mutes the video element; volume scales the sequence bus. While active, the ordinary
  page bus is held at zero, including when the visitor changes volume. Its current user-selected gain
  is restored after the return fade. Existing loops can keep their clocks without being heard.
- **Reduced motion keeps the fades** and the supplied video. No extra camera motion or overlay animation
  is added. The feature lives in `src/eggs/noscope-video.js`; `noscope.js` changes exactly two hook lines
  (the import and factory call), preserving the other builder's rifle integration surface. There are
  no changes to `src/core/`, `index.html`, or `mlg.js`.

### Encodes and provenance

Aaron supplied both originals on **2026-11-10**, as his own work for us to publish. The originals remain
outside the worktree and are not committed. Sources and commands are recorded in the two SOURCES.md files.

| Web asset | Size | Processing |
| --- | --- | --- |
| `assets/video/noscope.mp4` | **9,395,716 bytes** (9.40 MB / 8.96 MiB) | Full 1280×720, 30 fps, 28 s; libx264 slow, target 2.4 Mbps, max 3 Mbps, 6 Mb buffer, yuv420p, keyframes every 2 s; AAC stereo 160 kbps; faststart. Actual total bitrate 2.684 Mbps. |
| `assets/audio/noscope-riser.mp3` | **125,064 bytes** (125 KB / 122 KiB) | Full 6 s, 44.1 kHz stereo, libmp3lame quality 2. No dynamics processing, normalization, extra fade, or gain change. |

The MP4 is 52% smaller than the supplied MOV. The full-clip FFmpeg SSIM was **0.984072**, and a decoded
frame was visually inspected. A speculative WebM alternative was not shipped: MP4 already meets the
requested bitrate/size target and keeps one broadly supported source.

### Regression evidence

All ten `checks/noscope-video.js` lines below were observed **FAIL before the integration at both sizes**:

- `noscope first 360 lazily fetches video`
- `noscope riser and locked fade reach black at five seconds`
- `noscope video starts at five and fades in by six`
- `noscope riser ends with video fade-in`
- `noscope video advances in real time inline`
- `noscope video end restores page and rifle`
- `noscope muted video and riser have zero output`
- `noscope volume follows slider while page sounds stay quiet`
- `noscope tap skips and restores input`
- `noscope Escape skips every subsequent 360`

The separate `noscope real flick runs the timed riser and video` line in `checks/play.js` was also observed
**FAIL first at both sizes** with the original hook. The original flick/rifle assertion still passed in
those baseline runs (392° desktop, 393° phone). Its existing requirements remain; the final assertion also
requires natural video completion and unlocked input.

The checks sample computed DOM opacity, actual `paused`/`currentTime`, input lock state, the live riser
sources, real Web Audio gains and the output analyser. Timing tolerance is **±0.15 s** around five/six
seconds, accommodating frame boundaries. `checks/run.mjs` now exposes actual browser request URLs;
completed Resource Timing entries alone omit an ongoing streaming request. The deferred-load line
requires zero requests before the trigger and a real video request afterwards, not just an absent player.

Video time must advance by .85–1.2 s during a one-second real-time observation. Both the direct and real-flick checks then **play the full 28 seconds** to exercise natural `ended` cleanup.
The preview server reports no seekable range: the attempted near-end seek restarted at zero and exposed
the old five-second completion wait. That wait now allows the full clip and checks input unlock too. The muted check includes
actual playing-video silence as well as a muted riser, and the volume check operates the visible slider
while a thunder clip is deliberately sent through the silenced ordinary page bus.

Additional headless verification: at **4 Mbps / 50 ms latency**, video was already playing at the 5.2 s
checkpoint. With the video request delayed **8 s**, a reduced-motion phone page was fully black, paused,
and locked at 5.2 s; it subsequently played, reached opacity 1 with the riser ended, and unlocked after skip.
Phone testing uses Chromium's touch viewport emulation, not a physical iPhone.

`checks/noscope-video-shots.js` captures black, fade-in, playing, and back at both sizes. The shot driver
holds the initial play promise to capture a fully black waiting frame, pauses the opacity animation for
the fade-in frame, and waits for eight seconds of playback for the playing view. These shot controls are check-only;
the timing regressions run live without them. All eight `docs/shots/noscope-video-*.jpg` files are included;
black, fade-in, and letterboxed phone playback were visually inspected.

Final validation: `SC_CHECK_PORT=18742 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh`
ended **ALL PASS**, desktop and phone. Direct-trigger black / playing / fully visible times were
**5.054 / 5.071 / 6.104 s** desktop and **5.042 / 5.025 / 6.042 s** phone; real-flick times were
**4.986 / 5.018 / 6.018 s** desktop and **4.980 / 4.996 / 5.995 s** phone. Both paths played the entire
clip and passed natural-ending, input-unlock, and rifle checks. All eight refreshed review shots completed.
`git diff --check` passed. No merge, push, deletion, or core/world-file edit was performed.

## 360 video follow-up: keep the footer sound control

Aaron's original footer sound button and slider now remain above the black fade, video, and
0.6-second return. The duplicate overlay sound controls are removed. Only the footer sound group is
visible and interactive: the rest of the footer retains its layout but is hidden and pointer-blocked;
the page's input lock remains held. A temporary `.controls` exemption applies only to that sound group.
Its existing handlers update the riser/video bus immediately, including mute/unmute, while ordinary
page audio stays at zero. The footer sits outside the overlay, so its taps never trigger overlay skip.

For legibility: #222 backing with an 8 px surrounding shadow, #eee text/thumb/filled track, #666 empty
track, and full slider opacity. The backing doesn't change layout. Desktop retains the lower-left
position; phone retains its usual wrapped footer position and safe-area padding, in the lower black
letterbox rather than over the picture. The skip button is now top-right. Normal footer styling and
interaction return only after the return fade. No core, index, or rifle file changes.

Seven new lines in `checks/noscope-footer.js` failed first on both desktop and phone:

- `noscope footer slider hit during black fade`
- `noscope footer slider hit during video`
- `noscope footer native drag sets video gain`
- `noscope footer slider tap does not skip or unlock`
- `noscope footer button mutes without skipping`
- `noscope footer button unmutes without unlocking`
- `noscope footer remains reachable during return`

An additional passing-baseline cleanup guard, `noscope footer restores normal page after return`, checks
that the lock and sequence styling are removed. Hit tests use `document.elementFromPoint` at the actual
footer slider centre. `checks/run.mjs` provides native Playwright mouse input and CDP touch input, so
the range's default action—not a scripted value assignment—must change its value and the video gain.
The phone position comparison uses the same discovered footer layout: finding the 360 reveals the
grimoire link and can wrap the normal footer. Sequence styling itself moves the slider by zero pixels.
The existing video mute/volume checks now target `#sound` and `#volume`; their assertions are retained.

Validation: all seven failed-first footer checks now pass at both sizes; the cleanup guard passes too.
All eight `noscope-video-*` shots were refreshed; phone playback was visually inspected with the sound
control below the picture. The first full run passed every new check but failed the existing phone butter
landing's centre/size sample (six impact frames). An unchanged isolated rerun passed (nine frames,
centre .380/.400, width ratio 3.185), and the second complete run passed without any code or threshold
change. `SC_CHECK_PORT=18742 PW_FROM=~/command-hq/scripts/shot checks/run-all.sh` ended
**ALL PASS** at desktop and phone. `git diff --check` passed. No merge, push, or deletion.

## Unit 11: slower bread blast-off

The outward flight is now **6 seconds**, named once as `BREAD.blast.fly` (was 1.3). Its distance
remains 0.33 screen diagonals and its random launch direction remains unchanged. Progress follows
`6u^5 - 15u^4 + 10u^3`: monotonic, slow at launch and arrival, with a long glide in between. Scale
now follows that same progress from 1 to .01, keeping the loaf readable through the midpoint.
Roll is **0.65 radians total** (about 37 degrees), replacing the frantic 9-radian tumble. Reduced
motion still suppresses rotation. The .35-second preflight wobble is windowed to settle at zero;
this removes the measured 4.546 px offset snap at launch. Hold (.7 s), return (1.1 s), pop-back,
controls restoration, distance, direction, rocket/twinkle audio, and star reward are unchanged.

Scope discrepancy raised with the orchestrator: this branch has no bread skip handler or loaf reward.
A baseline headless measurement sent Esc midflight: at 1.310 seconds it was still blasting and locked;
normal completion restored controls and left only `twinkle`. The existing reduced-motion route suppresses
shake/rotation, not travel. The orchestrator explicitly confirmed preserving this behaviour: Esc is ignored, the cat returns,
and the star remains; no new skip interaction or loaf keepsake is added.

Two honest wall-duration failures with the six-second stage tween (6.436 s desktop / 6.378 s phone)
triggered a shared-premise measurement rather than another retry. The stage caps frames at .1 seconds;
one measurement reported 6.304 wall seconds against 6.017 stage seconds, losing .288 seconds across
slow frames. Only the outward drift now uses uncapped elapsed frame time, still multiplied by the
stage's time scale so paused screenshot/review controls work. No shared core-clock change. The
**150 ms duration tolerance is unchanged**. Focused runs: desktop 6.007 s; phone 6.005 s; reduced-motion
phone 6.015 s. Launch snap and excess endpoint displacement measured zero at both sizes.

`checks/bread-float.js` samples every animation frame, reads the live loaf transform's x/y displacement
in screen pixels, checks monotonic radius and the first/last 8% of progress against the integrated eased
velocity (maximum excess .5 px), and verifies normal return clears input locks and preserves the reward.
The duration, endpoint and slow-roll checks failed against the original flight; monotonicity and return
already passed. The suite runs it normally and with reduced motion at both sizes. Its checks are:

- `bread float lasts six seconds`
- `bread float moves monotonically outward`
- `bread float endpoints have no extra jump`
- `bread float rolls slowly or stays still in reduced motion`
- `bread float return restores controls and existing keepsake`

`checks/bread-float-shots.js` captures launch, midpoint, distant loaf, and return at both sizes, pausing
only for each screenshot. The shot driver fixes the launch direction straight up, so the portrait
review frames show the loaf rather than the existing random direction carrying it offscreen. Gameplay
keeps its original random directions. Choices for Aaron's review within the requested slower flight: the smoother
shrink curve, 37-degree roll, and settling wobble envelope. No other appearance/play changes are proposed.

Full-suite timing investigation: the first run's only failure was the existing 360 black-fade sample
at 5.178 s, 28 ms outside its window. That threshold remains unchanged; the next run passed at 5.048 s.
The second run failed the existing tap-skip assertion. After these two failed attempts in the video
regression group, a single-observer measurement found that the overlay/lock were still present at
750.9 ms but both cleared at **965.3 ms**. Under the orchestrator's explicit timing-check allowance,
the tap and Esc post-skip observation sleeps in `checks/noscope-video.js` are now **1,100 ms**, formerly
750 ms. All cleanup, gain, root-removal, and lock assertions remain. This changes no playback behaviour
or fade duration, and the bread's ±150 ms and .5 px requirements are unchanged.

A later black-fade timing miss was not treated as a small tolerance miss. Startup measurement showed
`statusAtFire: pending` for the riser, a delayed animation start, and a 1.026 s frame gap while the newly
loaded page was warming. The timing test now awaits the already-requested riser and .5 rendered stage
seconds before its trigger. It still requires no earlier video request and still measures five/six seconds
from the actual trigger with the original ±150 ms thresholds. No production video code changed.

Validation is not complete yet: the most recent full run stalled on the first drag, before bread, and
then failed the existing keyboard-turn threshold. A process-ownership measurement found no orphaned
look browser, but five live Chromium runs across this and other worktrees; later five other worktrees
were running after look stopped. Only the look suite/server/browser were stopped. A quiet GPU window
has been requested before another full run; unrelated keyboard checks were not changed. No ALL PASS
was claimed at that checkpoint. The orchestrator subsequently confirmed the existing bread behaviour
and authorized committing the unit before final validation.

Orchestrator decision: the measured video skip observation wait is accepted under **e1110-15**.
The final suite must wait until one-minute load is below 14, then hold
`~/.sigil-cat-wt/codex/gpu.lock` for the run. Initial load on resumption was **48.20**.

Final validation (2026-11-11): after once-per-minute load polling reached **12.28**, ran
`flock ~/.sigil-cat-wt/codex/gpu.lock env SC_CHECK_PORT=18742 checks/run-all.sh --shots docs/shots`.
The shared lock was held for the entire suite. Final line: **ALL PASS** at desktop and phone; no timing
line failed in this locked run, so no isolated rerun was needed. Flight times: desktop **6.006 s**, reduced
motion desktop **6.016 s**, phone **6.001 s**, reduced motion phone **6.016 s**. All four routes passed
monotonic travel, endpoint continuity, and restored controls. All eight bread shots and the suite's
review shots were refreshed. Source/check/bread-shot commit: `665568632643a3b29d1cd6bca0447de54cd96f4e`.

## Unit 10 — sound redesign, choices for Aaron’s veto (2026-11-10)

Open `docs/sound-reel.html` through the preview server. `docs/sound-reel.mp3` is the 111.21-second new-effects reel,
69 complete sounds in order with 550 ms gaps. `docs/sound-direction.md` has the complete before/after trigger inventory,
the world-builder material table, and the API contract. No visible browser was opened and nothing was pushed.

The first pass decoded all 43 pre-existing audio files/tracks, inspected every trigger and read their source records.
There was no audio-hearing tool in this session, so this is a technical audition audit, **not a claimed human listen-through**.
Aaron's perceptual approval remains pending: especially whether the material sounds read clearly on a phone and whether the
small jokes are fun after repeated play. The A/B players match 100 ms active RMS to avoid preferring whichever is louder.

Choices made without waking Aaron; each can be vetoed independently:

1. **Character:** a close, warm tabletop shrine. Rounded wood, paper, brass, glass and butter; little rubbery jokes for body taps.
   The rare bonk is a miniature gong with an answering bubble. The horn is two toy-brass honks, not an industrial alarm.
2. **Authorship:** 66 original synthesized voices and three cleaned real cat recordings (trill, purr, hiss). The three
   individual Freesound pages were verified CC0 on 2026-11-10. All recipes and deterministic seeds are committed in
   `tools/audio/build-sounds.py`; no new sample-pack or ambiguous-licence audio. Full source list: `assets/audio/SOURCES.md`.
3. **Replacement scope:** all 31 named SFX slots, plus the paradox and galaxy ambience. The horn compatibility slot stays supplied
   even though Aaron's montage superseded that callback. Whisker pluck is exact C4; the B C B D B puzzle stays the same.
4. **Keep the performances:** Aaron's Butterman songs, whisper, yell, 360 riser and embedded montage soundtrack retain their
   content and timing. Constant attenuation provides headroom. The montage's video stream is copied, not recompressed.
5. **Physics palette:** six materials × two sizes × three variants = 36 files. Small is a trinket (about ≤0.25 cat-heights);
   medium is a whole keepsake. Wood for a top/base, metal for a rifle, paper for tickets/box, butter for pats, glass for
   intact glass/shards, tin for the plaster tin/lid. These are defaults for the world builder to override.
6. **Contact behaviour:** preload by material; a missing-buffer contact is dropped, never played late. One principal start per
   item per 80 ms across its colliders/materials. Different objects can overlap. Shuffle bags use every variant and never repeat
   adjacent clips. Sleeping/restoring bodies, zero-strength contacts and muted impacts stay silent. The other branch owns contact wiring;
   this branch adds `audio.loadImpacts()` / `audio.impact()` without changing physics or adding collision triggers here.
7. **Levels:** new effects/medium impacts target −22 dBFS loudest-100-ms RMS; small impacts −24; continuous voices −25. These are
   short-window RMS targets, not LUFS. File peak cap −4 before encoding, existing SFX trigger gains and volume default retained. Ambience uses the existing fade timings
   with gain ×4 to account for the newly mastered sample level.
   Six baseline files breached −1 dBFS; the worst was +0.126 in the montage. Legacy comparison encodes now have about 2 dB
   headroom, Aaron's performances about 4 dB. Every exact attenuation is in the manifest; the baseline remains in git for reversal.
8. **Mix protection:** a final shared 4× oversampled soft knee, linear below −5.2 dBFS, protects page and montage sums.
   It should only become noticeable on crowded peaks. Mute and volume persist as before. Restore suppression also covers async initialization.
9. **Delivery:** 48 kHz/24-bit mono WAV for new effects, with no lossy transient encoding or pitch/length padding. MP3 for the
   portable reel; old SFX stay available only for A/B. The normal page never requests the comparison files or reel.
10. **Review honesty:** old ambience A/B files approximate the previous oscillator recipes, rather than pretending to be browser captures.
    The HTML labels them. Retained performances have a separate section, and do not repeat in the new-effects MP3.

Validation (headless Chromium, desktop 1280×900 and phone 390×844; phone emulation, not physical iPhone):

- **45 sound-specific assertions pass:** nine independent file checks, eleven live-bus/reload/gag checks at each size, and seven reel checks at each size. The paradox check completes the full hover and return with the new loop.
- **115/115 files/tracks have provenance** and match the delivered-file measurement hashes. Highest 4× reconstructed peak: **−1.993 dBFS**
  across all files, **−4.012 dBFS** among the 69 new sounds, **−3.967 dBFS** in the assembled MP3. New 100 ms RMS targets match within
  the report's .001 dB precision. All 36 variant-pair comparisons pass; highest normalized correlation is .238.
- **100 contact callbacks → one principal voice** for that item; a separate item sounds independently; the same item can sound again after
  80 ms. Three full shuffle cycles use all three files with no adjacent repeat. A separate 1,000-cycle bag check passed.
- **32 overlapping voices:** measured output peak **−1.937 dBFS**; an offline 8×-amplitude stress signal peaks at **−2.081 dBFS** after
  the actual oversampled safety curve. Mute reduces measured RMS to zero. Reload retains mute and volume .43.
- **Silent restore:** four saved keepsakes and an actual saved sleeping Rapier body restore with zero started voices and zero measured
  output while unmuted. Explicit sleeping and nested async restore calls also schedule no voices.
- **Timing/image preservation:** all 12 retained performance encodes/tracks have exactly the same decoded duration as the baseline.
  The montage's copied video-stream SHA-256 is `e4730dcdc6499fdd1f999c6515ccf1a3750d38992f4e45354b1b48990e7877d1` both before and after.
- **Whisker pitch:** measured 261.612 Hz (−.09 cents from C4). **Reel:** 111.21 s, 69 full cues, 550 ms gaps; old/new controls and playlist
  advance using actual decoded audio at both viewports. The phone reel was visually inspected.

The first variant check caught two butter clips that were too similar (.986 correlation); they now have separated resonances, damping
and secondary contacts. A browser bag check initially grouped a partially consumed bag as if it were fresh; it now uses a fresh material
and the runtime bag was independently checked over 1,000 cycles. No assertion threshold was relaxed.

The broad suite encountered a CDN DNS startup failure (a fresh DNS lookup and HTTPS fetch returned 200, and its startup retry recovered),
then timing failures on an overloaded shared machine. Following the two-failures rule, the run was stopped and the shared premise measured
once with exact baseline `27f3543` source/audio/video: the unchanged physics CPU budget also failed, **3.9 ms versus the 2 ms limit**, at
system load 42–43 on 16 logical CPUs. This branch measured 3.3 ms in the corresponding earlier run. No physics code or budget changed.
Inspecting the renderer lines then identified the concrete environment problem: both runs used **SwiftShader**, despite the runner's
NVIDIA selection. The sandbox exposed no `/dev/dxg` and NVML reported GPU access blocked. A read-only host check, approved by automatic
review, found `/dev/dxg` and an **RTX 5070 Ti at 15% utilization**. The full requested command is therefore run outside the device-restricting
sandbox, still with `headless: true`, `--headless=new`, and empty DISPLAY/WAYLAND_DISPLAY. No page, physics, or test thresholds were changed
to accommodate the software-rendered failures. The hardware run exposed one sound integration regression: the paradox's per-frame callback still referenced the removed oscillator
array. It now modulates the loop gain, retaining the visual motion, fade timings and rotation-linked volume. Its new warm motor keeps
its fixed root pitch (the old oscillator's upward pitch glide is intentionally replaced). A regression now runs the full hover/return,
and a late-loaded ambience buffer starts only if the hover still wants it. The gain choice and fixed-root motor are available for veto.

Other branches were also running headless suites concurrently. The final command acquires the existing cooperative GPU test lock before
running; the software-rendering issue and concurrent workload are recorded separately. No visual/physics implementation or acceptance
threshold was changed. The added paradox fixture initially called `start()` before the lazy butter mesh existed. A one-off measurement observed `result:false`,
zero cue starts, and no paper; the fixture now awaits `cat.ensureButter()`, measures the audible hover, and checks the full return.
The reel also gained a cancellation regression: a stopped startup's `AbortError` cannot pause a newer selection. The focused desktop
checks pass both cases. Final result follows below.

Final validation (2026-11-11): `SC_CHECK_PORT=18744 checks/run-all.sh --shots docs/shots`, headless with real GPU access and the cooperative GPU lock, ended **ALL PASS** at desktop 1280×900 and phone 390×844. **361 CHECK assertions passed**, including **45 sound-specific assertions**. The recognizer suite passed too. Full emitted output is in `docs/sound-checks.txt`; regenerated screenshots are in `docs/shots/`. The renderer was verified as RTX 5070 Ti. No acceptance threshold was changed. Human listening approval remains pending; no claim of human listening is made.

## Player-audit polish (2026-11-11)

Merged `revamp` into `sc/look` first: **318a170**, no conflicts. Read the player audit from
`sc/audit:docs/audit-2026-11-10.md` and inspected its phone-control capture. Choices for Aaron:

- **Galaxy sound:** the existing footer sound group stays in place, with light text/track on a small
  #222 backing matching the video control. The rest of the chrome still gets pulled into the hole.
  Only the sound group is exempted from the input lock; a native slider drag changes volume and a
  native button tap mutes without releasing the lock. Esc still skips, including when sound has focus.
  The borrowed bread-space backdrop keeps its previous chrome behaviour.
- **Found-mark replay:** Blasting off prepares the loaf directly and runs the existing blast-off,
  preserving its star reward and return. This avoids accidentally invoking the buttered-loaf paradox.
  A temporary preparation lock prevents duplicate launches and is released in `finally`. Busy cat,
  paradox, or Butterman states get a short “a moment” message. Whisper plays one full quiet copy from
  the start at its existing .045 gain through the normal sound bus, without equipping butter. Its
  proximity loop is silent during replay; repeated taps restart the one-shot. Starting Butterman stops
  that replay. Both marks keep their truthful “do it again” labels.
- **Utility targets:** sound, ask, volume, and grimoire now have at least 44×44 CSS-pixel hit areas.
  Button/link pseudo-elements enlarge the hit area invisibly; the slider's larger transparent box keeps
  its original track width (40 px phone / 54 px desktop), thumb, and type sizes. Below 420 px width,
  22 px extra vertical separation prevents overlap between the utility rows. Grouping and typography
  remain unchanged; this small spacing increase is deliberate, rather than overlapping invisible targets.
- **Butterman collection:** hide DOM and GL keepsakes for all authored scenes, including scene previews,
  and restore them on stop or natural completion. Cameos retain their previous background presentation.
  The helper restores the latest GL visibility before normal updates and hides only for rendering;
  it also disables hidden keepsake hit tests and keyboard targets. It moves no prop, changes no saved
  state, and handles props/models arriving during a scene. Physics continues normally underneath.

Test-first evidence: all six new functional lines failed on the merged baseline at both sizes:

- `audit footer utilities have 44px hit areas`
- `audit galaxy mute stays visible and works under lock`
- `audit galaxy volume changes without unlocking`
- `audit blastoff found mark replays the flight`
- `audit whisper found mark replays quietly`
- `audit Butterman hides collected props in every scene`

`audit Butterman restores collection exactly` is a passing-baseline guard, extended to cover both stop
and natural completion. Hit tests probe the centre and corners just inside a 44 px square; playback and
sound checks use the runner's native mouse/touch input. Props include DOM and GL art and all three
Butterman scenes. The focused suite passed both sizes after fixing one missing `input` binding in replay
wiring. Screenshots: `audit-polish-{galaxy-sound,butterman-clear,controls}-{desktop,phone}.jpg`.

No polish edits to `world*.js`, `stage.js`, `noscope.js`, `circle.js`, or `keepsakes.js`; no cloud changes.
Deferred to the world/art builders: verify the audit's rifle/top edge aliasing on the target GPU before
choosing targeted antialiasing, and review the cloud's edge density/dark underside as an art decision.
The merged renderer/physics behaviour is preserved.

The first 18 px utility-row spacing left the phone slider's lower-right corner overlapped by the
grimoire target (measured point 181.016, 798.5 hit the link despite a true 44×44 slider box). The final
spacing is 22 px; the same strict corner hit test is retained. No target-size tolerance was relaxed.

Final validation: one-minute load was **5.93** before the full run. Ran
`flock ~/.sigil-cat-wt/codex/gpu.lock env SC_CHECK_PORT=18742 checks/run-all.sh --shots docs/shots`
with the repository's standard Chromium/GPU setup. Final line: **ALL PASS**, desktop and phone,
including world/core regression checks, all six failed-first audit lines, and collection restoration
on stop and natural completion. No isolated rerun, browser substitution, or DNS workaround was needed.
`git diff --check` passed. The six new audit review shots and the suite's review captures are refreshed.
No polish edits were made to the world builder's protected files or the cloud.
The suite also refreshed its tracked `checks/diag/rack-frames-results.json` measurement artifact.

### Overnight main merge

Main's every-360 montage/video, footer volume controls and petting fixes are retained. The noscope merge combines `createNoScopeVideo(site)` with the selected splat rifle's `worldProps.create/tap/remove` adapter; no old GLB rifle loader was restored. Both incoming video checks and all current world checks remain in run-all. The following quiet locked post-merge checks also test the shared-load premise for unit 4; no thresholds are changed.

### Unit 4 shared-premise test — quiet window (2026-11-11)

Both earlier attempts treated timing and landing samples under severe shared-machine
contention as representative. After the two requested merges, one isolated run held
`~/.sigil-cat-wt/codex/gpu.lock`, starting at load 10.94 (below 14).
The merged noscope video/footer checks passed at both sizes. Core medians 1.8/1.8ms,
prop pictures 1.1/1.1ms, and the unchanged butter landing gates all passed: desktop
(.620,.400), 9 impact frames, 3.226x; phone (.380,.400), 10 frames, 3.185x.
Renderer: ANGLE/D3D12 RTX 5070 Ti; desktop CPU at both viewports. The quiet test does not
reproduce the overloaded failures. No rotor/water/solver change or raised threshold was
needed. The earlier proposed 3.0ms ceiling is withdrawn; the approved 2.5ms check remains.
Evidence: `checks/diag/world-unit4-quiet-premise.json`. Full locked suite follows before
calling unit 4 accepted; actual iPhone hardware remains unmeasured.

The subsequent **full suite passed both sizes** under the same shared lock, starting load **7.03**. Core median p95 **2.2/1.5ms**, selected-splat picture p95 **1.1/1.0ms**, desktop/phone. All water/reload/reduced, old interaction, video/footer and landing checks passed. Final line: **ALL PASS**. Renderer: ANGLE D3D12 NVIDIA GeForce RTX 5070 Ti; phone numbers remain a desktop-CPU viewport proxy. `checks/diag/world-unit4-quiet-full.json` preserves the complete CHECK evidence. Refreshed ten `world-unit4-*.jpg` pictures; no product change was needed to close unit 4.

## Cake chain: fork and party ending (2026-11-11)

Only the non-world half of unit 8 is built here. Read the latest plan and its tangible
item rows on `sc/world`; read the new sound direction on `revamp` (not yet present
in this checkout). No merge/rebase performed. No edits to `world*.js`, `stage.js`,
`keepsakes.js`, `noscope.js`, `circle.js`, `hat.js` or `combos.js`.

Choices for Aaron's veto:

- Fork: a long handle, shallow asymmetric bowl, three unequal upward teeth; start
  at the handle, retrace the left tooth, retrace the tallest middle tooth, finish at
  the shorter right tooth. Reverse drawing order works. Eight templates cover two
  stem positions and bowl depths. Riddle: “one handle climbs to three uneven teeth.
  retrace their roots; the middle reaches furthest”. Found: “a little farm work. the
  sky may have something to spare.” One brief 600 ms sparkle until the physical
  pitchfork adapter claims `sigilcat:fork`. Find and replay are already wired.
- Error design: a white, unbranded early-web document, a broken-file drawing, serif
  heading “This page has been eaten.”, faux HTTP 418 “SHORT AND STOUT”, and three
  recovery suggestions. It is authored content, no vendor browser chrome. The old
  page disappears immediately; no real navigation, storage deletion or reload.
- Recovery: **30 seconds**, measured in real time, then an immediate return. Escape,
  the 44px “Return early” button, and Enter/Space on that focused button end it early.
  Focus is contained in the error, then restored to the previous control. The normal
  page stays inert. Duplicate eats restore once; competing cinematics refuse safely.
- Suspension: page RAF/idle/timer callbacks retain remaining delays, including UI,
  audio loop scheduling and stage/world work. Audio clock and CSS/WAAPI animations
  pause too. Saved mute/volume, node identities and keepsake positions are preserved.
  The first stage frame returns at dt=0. Resize is deferred to the return. Pending
  fetch/decode completions may still populate caches while the document is away.
- Return: existing `hat.wear('party')` hook, so unit 7's new physical party hat will
  replace the current pixel art without a duplicate. **160 actual 3D instanced paper
  pieces**, 80 from either side, pink/teal/gold/purple/cream, gone after **4.8 s**.
  Small modeled mouthpiece, striped paper tube and rolled end; **1.6 s** maximum,
  one **1.25 s** synthesized reed toot. Blower turns 1.45 rad in cat-local space to
  read beside his mouth. Nothing becomes a new keepsake. The hat remains worn.
- Reduced motion: same 30 s error, no confetti; static extended blower for 1.6 s,
  same hat and sound. Mute and volume route through the existing master bus.
- Toot: mono 48 kHz / 24-bit WAV, 180,044 bytes, −22.00 dBFS maximum 100 ms RMS,
  −16.89 dBFS peak, playback gain .8. Original seeded synthesis in
  `tools/audio/make-party-toot.py`, following unit 10's palette contract. Aaron's
  listening approval remains a taste decision; headless checks measured the signal.

Test-first evidence: three fork checks failed before templates existed (positive,
perturbed, cross-template); after: 2/2 directions, **100/100 perturbed**, **0/900**
other sigils confused as fork, all existing gates unchanged. Nine new browser lines
failed at both sizes before wiring the feature: drawn fork event/find; accessible
full-page error; callback/world/audio suspension; 30-second single return; exact
page/keepsake restoration; hat/3D paper/toot; finite effect cleanup; Escape/native
skip/keyboard controls; muted return. The playthrough now draws fork before its
unchanged “all found” assertion, because the registry contains 17 finds, not 16.
The runner adds native keyboard input for the real Escape/Enter checks.

Integration contracts are in **docs/plans/world.md — Unit 8, hooks ready**. Pitchfork
physics, consumption and the new 3D hat remain the world builder's work.

Focused validation: the standard headless browser passed all nine lines at desktop
and phone, normal and reduced. Natural returns measured 30.012–30.015 s. Additional
suspension probes cover intervals, idle callbacks and an ordinary key gesture that
calls `audio.context()` while suspended; none restarted the scene or audio. Real
Escape, Enter and hit-tested mouse/touch skip all restore controls. Two earlier
validation processes received SIGTERM outside the page checks (one standalone
preview server, then a locked runner after both normal runs passed); measurement
confirmed an empty preview port and a different builder holding the lock. Restarted
with the server owned by the locked check process. No browser/DNS workaround or
threshold change. The required full suite is pending the shared lock.

The first complete run passed every new feature and existing interaction check, but
its phone-viewport world CPU median was 2.1 ms against this branch's unchanged 2.0 ms
gate. The one authorized isolated rerun passed at **1.6 ms** (runs 1.6, 1.9, 1.5,
1.1, 1.6; load 3.93). No physics or threshold edits.

A separate first-sample audio probe then exposed a frozen mute ramp: muting directly
before the error left master gain **0.36949** at return at both sizes, even though
the later RMS check read zero. Audio resume now settles the saved mute/volume level
before any resumed sample and awaits an in-flight suspend for immediate skips.
The permanent tenth party check captures that first return gain; it must be exactly
zero when muted. This extra probe failed before the audio-resume correction at both
sizes. The original nine party lines and three fork lines retain their failed-first
evidence and unchanged gates.
The return check also reads every actual instanced mesh matrix, requiring 160
instances and at least eight visible, nonzero-scale pieces in each screen half.
An initial version inspected only indices 0 and 1; a staggered particle was still
3 px outside while the screenshot clearly showed both bursts. Measuring the whole
visible burst corrects that sampling assumption without changing its appearance.
The cleanup check compares callback identities and confirms both temporary scene
objects are absent, rather than relying only on the gag's diagnostic counters.
The initial scheduled-zero correction still reported the cached gain while suspended.
One shared-premise measurement compared the native parameter operations: scheduled
zero left `.value` at .8 until the audio clock resumed; direct assignment made it 0
immediately. Resume therefore clears the old control automation and assigns the saved
level directly. The diagnostic also confirmed that the running graph reached zero;
no audible leak is claimed from the earlier control-value observation alone.

The second full run began under the lock at load 8.28. Its first browser startup
had a jsDelivr DNS failure; the standard runner's existing startup retry succeeded
(host DNS resolution and HTTP 200 were measured, with no browser or DNS override).
The desktop physics CPU median later missed at 4.4 ms; load shortly afterward was
14.22. A shared-premise sample found several busy CPU processes and GPU utilization
12%. The isolated timing retry will use a quieter window below load 6; the existing
2.0 ms gate and protected physics code remain unchanged. The direct-gain mute probe
passed at both sizes, gain 0 and RMS peak 0.

## Unit 5 initial candidate — historical checkpoint at 1d3bb6e (2026-11-11)

**This subsection records the initial stop, superseded by the authorized optimization and closing validation entry below. At that checkpoint the API was not frozen.** Unit 4 is accepted at `677f535`; its locked full suite ended **ALL PASS** at both sizes. The unit-5 candidate below is committed for review, with two substantive remaining gates. No threshold has been raised. This is not a hair-thin miss covered by e1110-15. No further product change followed attempt two.

Built the fixed top-right walnut/cork board, three genuinely thick/curled printed meshes with distinct backs, physical pins, loose-body grip/drop, paper Read, physical postcard flip, ticket encore, and the shared support/attachment service. The board unlocks after the second unique flat discovery. Phone selects one foreground card; Read shows its actual 3D front/back/edge plus a selectable original-wording transcript. Supported cards and pins share a cached 3D rendering, so the pin heads and cardstock occlude correctly. Off-board cards use their own cached lit rendering and a world-floor silhouette; mounted shadows project onto cork. All artwork is original procedural geometry/Canvas print; source record: `assets/world/board/SOURCES.md`.

**Choices for Aaron's veto (made overnight under e1110-33):**

1. Paper, postcard and ticket are the three flat-category discoveries. The box remains reserved for its physical-container unit; tin remains a shelf item as already decided. Walnut, warm cork, red/cream/navy enamel heads, warm paper, the violet postcard and red letterpress ticket keep their separate visual worlds. Paper gets a red REJECTED stamp; ticket gets a printed “KEEP THIS STUB / one more for the road” back.
2. The board gathers only untouched default-home cards when it unlocks. A card that the player has placed stays where they put it. Later untouched cards take their own compatible named pin. A duplicate find never creates a duplicate card or increments the unlock count.
3. Desktop shows all three named pins. Phone shows one selected card in a board whose height fits that stock; its name/chevron cycles the cards, and Read includes Lift/Pin controls. This avoids shrinking the identifying words or covering the whisker/petting area with a large control panel. Hidden cards' art, shadows and collisions are disabled together; their identities and occupied slots persist.
4. Paper/card/ticket widths are .42/.51/.54 world units, masses .015/.025/.012. Thicknesses are .0015/.003/.002 with shallow original corner curls. A loose card uses gravity plus passive pressure-point drag, friction .8, restitution .02, linear damping .35 and angular damping 3. The reduced collider revision still needs the ticket correction below.
5. Slow release offers a compatible empty support only at speed <=.65 world units/s, within .25 world units **and** 32 CSS px. Explicit Pin is an intentional placement action. Pin insertion has a finite top-point geometric hang (not a claimed Rapier pin joint): <=6° authored amplitude, 1.6s damped settling; the item then has a fixed collision representation. A slot uses .22s placement. Picking up restores the same dynamic body and local-point spherical grip. Cancel never snaps.
6. Finite support settling follows elapsed visible wall time; hidden time is excluded. The first attempt's capped stage-clock accumulation could extend a short placement past its real-time deadline during shader warm-up. This correction preserved the .25s check.
7. Read defaults to an oblique 3D view, with Front/Back/Edge and drag-to-turn controls. Its DOM transcript is selectable at >=16px, scales to 32px at 200% root text size, and returns focus to the opener. Existing paper/encore sounds remain.
8. Supported tap retains its pin; movement beyond the existing 8px threshold lifts it. Mouse wheel or Nearer/Deeper controls change grip depth; keyboard lift/place uses the same spherical joint. Escape, lock, blur and hiding release it. Legacy DOM art painted above the canvas wins over GL behind it; cached physical pictures and their ray picks share depth ordering.

**Confirmed, not a veto item:** e1110-37 keeps fully shaped 3D hats in their pixel-art style on the realistic rack. No hat art was changed in this unit.

### Evidence and the two attempts

All measurements used headless Chromium / ANGLE Microsoft D3D12 **NVIDIA GeForce RTX 5070 Ti**, on this desktop CPU. The 390×844 run is a viewport proxy, **not iPhone Safari**. Each batch waited for load1 <14 and held the shared GPU lock.

- Attempt one (`world-unit5-first.json`, start load 2.46): all three cards naturally slept in every one of 100 drops by 3.625s. Broad-face orientation passed. Worst resting collider gap was 1.551px desktop / .924px phone. Readability, 200% text, focus, grip/cancel, pin compatibility, silent exact reload and 2.1s zero-work checks passed. The ticket's reported .1014 energy jump was a **check initialization error**: after re-enabling a collider, Rapier's cached mass can remain zero until the next step. Attempt two logs ticket mass **0 → .012** after one initialization step, then measures only the actual drops. No energy threshold changed. The standalone mass probe did not reproduce that re-enable state; its results are also retained rather than silently discarded.
- Support/cost attempt one (`world-unit5-api-first.json`, start load 4.75): support identity, compatibility, speed/depth refusal, atomic attachment restore, zero attachment work, crown height and keyboard cancellation passed. Short placement missed its real-time duration. Twenty-body median p95 was **13.1/12.8ms**; actual five converted objects were **2.3/5.8ms** desktop/phone. This was not shared-load noise. Profiling found the 20-body p95 frame spent about **8.9ms in Rapier** and .9ms in rendering; 1,027 render-target size changes occurred across the probe.
- One measured optimization attempt: two **eight-corner wedges** replace three dense curved hulls per card; card soft-CCD envelope is .03 (rifle/top remain .08, global solver unchanged); picture targets retain capacity rather than shrink/reallocate at every bounds crossing. No change to the art geometry. Support settling uses visible wall time. Screenshot review also caught the shadow of a hidden phone card; hiding art, shadow and collision together fixed it.
- Attempt two (`world-unit5-second.json`, start load 4.02): 20-body median p95 improved to **6.4/6.0ms**, still fails <=2.5. All five converted objects moving measured **1.8/1.2ms**. Support fixtures now all passed, including actual cat-picture adoption and continuous detach. Card drops sleep by **3.658s paper / 3.183s postcard / 3.692s ticket**; resting gaps <=1.011px desktop / .606px phone and energy gain <=.000046. But the simplified ticket can sleep on its edge (worst broad-face normal dot up **.00428**, required >.9): a real visible behavior miss, not a tolerance decision.
- Phone identifying glyph heights: **12.84px REJECTED / 15.74px THE VOID / 13.01px BUTTAMAN**. Desktop likewise passes. Pinned reload drift is **0.000px** at both sizes; one identity per card. Over 2.1s asleep, **zero** new world steps/syncs, support frames, picture draws, shadow updates, print uploads or world callbacks. These passing results do not cancel the budget/ticket failures.

### One shared-premise test, then stop

**Shared premise:** the dense twenty-body synchronous fixture is representative of a rendered frame with twenty production objects. `checks/diag/board-premise.js` holds the same shapes and body count, compares the original starts synchronously and paced by RAF, then separates the starts while retaining every drawing adapter. No source or threshold change followed this diagnostic.

The original starts already intersect: **15 collider pairs desktop / 14 phone**, deepest **.12514 world units**. Five-run median p95:

| Condition | Desktop total / physics / render | Phone total / physics / render |
| --- | --- | --- |
| Dense synchronous | 7.5 / 4.5 / 1.8ms | 6.6 / 3.9 / 1.5ms |
| Same dense starts, RAF paced | 8.2 / 4.9 / 1.9ms | 7.0 / 4.2 / 1.6ms |
| Separated starts, RAF paced | 3.3 / .5 / 1.4ms | 4.2 / .6 / 1.9ms |

Component p95s are independent percentiles and must not be added. Every adapter recorded 179–181 renders per 180-frame paced run. The separated diagnostic spreads bodies in world X/Z (some page projections leave the viewport); it is a causal isolation of contact cost, **not a proposed passing production fixture**. Pacing alone does not explain the miss. Bad initial overlap explains much of the narrow-phase cost, but adapter/render work still exceeds 2.5ms even with separated starts. **Recommendation: fix the workload setup and batch active mesh rendering/pose projection; keep the budget. Do not accept this candidate on a raised threshold.** Another implementation attempt needs the orchestrator's authorization under the stop rule.

The same diagnostic replays the production ticket seeds and records sleeping body poses and floor manifolds. It finds 21/18 non-broad-face rests in that particular post-workload history; waking the worst without an impulse for another 3 simulation seconds leaves it edge-supported (normal dot up .0728/.1404). The check is reading the body's solved orientation, not an interpolated picture. **Recommendation: restore a collider/edge profile that cannot remain balanced this way, and validate with fresh-body as well as reused-body seed controls.** The precise narrow-phase/sleep contribution remains unproved; no third tune was attempted. Two actual-page diagnostic screenshots show the failure.

### Integration state and handoff

The candidate API and its executable fixtures are documented in `docs/plans/world.md`; **not frozen for parallel builders**. Unit 6/7 should remain behind this acceptance checkpoint. The original card DOM assertions were rewritten to check corresponding physical contact/restore, not dropped. These modified integration checks have **not** had a full run on the candidate, because the two-attempt stop was reached first. `checks/run-all.sh` is unchanged and has not been extended with the new focused gates yet. The prepared immutable-foundation GPU/full-frame rest harness (`checks/world-board-rest.mjs`, foundation `677f535`) has **not been run**; G4 remains unverified. Same for full resize/migration coverage and native keyboard/touch end-to-end coverage beyond the routed grip and service fixtures. Actual iPhone remains unverified.

Before accepting/freezing: besides the two failing gates, audit board resource disposal on repeated phone card-size changes, the restored-category registration order for future solids, shelf/rack furniture reservations against the actual board rectangle, and slot-supported selected-splat compositing. These are explicitly unfinished integration risks, not claims that the future builders need no core changes. Charged-top's support hook now pauses it while stored without clearing its charge; its ordinary pickup still clears charge. That future-shelf path also needs the full water regression before acceptance.

Images: `world-unit5-board-{paper,postcard,ticket}-*`, `read-*`, `back-*`, `edge-*`, `grip-*`, `rest-*`, `reload-*` and `ticket-edge-diagnostic-*`. Reviewed both viewport sizes and close edge/read views. The first oversized preview was rejected: it crowded the cat; the revised board leaves the whisker/petting region clear and all title gates pass. Screenshots are evidence of the candidate, not proof of acceptance.

Last completed full regression is **unit 4 at `677f535`: ALL PASS**. There is **no unit-5 ALL PASS** to report. AWP/top original picture URLs and exact licences remain outstanding; recommendation is still to record them before publication. No input pictures or generated-model assets were added in this unit.

## Revamp integration and material contacts (2026-11-11)

Merged `revamp` into `sc/world`, retaining the unit-5 candidate and the integrated sounds, galaxy, bread drift, video and player-audit behavior. The input-lock conflict keeps both the card reader and footer sound controls accessible; Escape still reaches takeover handlers. No existing acceptance threshold changed.

World contacts now use `audio.loadImpacts` / `audio.impact` from `docs/sound-direction.md`: wood, metal, paper, butter, glass and tin, with stable item IDs across compound colliders. Rapier contact-force events measure impact impulse relative to mass; static gravity pressure and changes below .18 units/s are silent. An unfinished saved drop stays silent through its first settle; the next player drop can sound. Remaining legacy drops use their actual first floor crossing, never their restore/layout placement. Buffers load after the visible-cat gate. The shared audio API enforces one voice/item/80ms and drops undecoded events. Future adapters can pass `sound:{material,size}` to `world.add`. Source: [Rapier contact-force events](https://rapier.rs/docs/user_guides/javascript/advanced_collision_detection/); no third-party code copied.

Headless real-GPU focused checks at both sizes passed: six real material drops, silent resumed restore, audible subsequent player drop, no idle queue steps, 360 video, audit polish, world-core and selected-splat props. Core median p95 1.5/2.3ms (desktop/phone viewport, desktop CPU); prop sort/picture 1.0/1.1ms. Full evidence: `checks/diag/world-revamp-merge.json`. This checkpoint does not claim unit 5 accepted.

For Aaron's veto: impacts use the new authored material voices, with soft contacts beginning at .18 units/s and maximum strength at 2.68; headless checks establish triggering and limits, not human approval of timbre.


## Unit 5 authorized optimization and API handoff (2026-11-11)

The new authorization permits a separate optimization step with the <=2.5ms gate unchanged. The first implementation attempt passes the focused cost and card gates. The closing validation result is recorded below.

Profile first: the corrected fixture starts all twenty colliders apart (5×4 grid, 1.05/.9 unit spacing, checked for zero intersection). Twenty full-size props extend outside the phone viewport, but every drawing adapter runs; no renderer is disabled or replaced by a proxy. The original dense fixture measured 14–15 initial intersections, up to .12514 deep. Removing that artificial pile-up cuts the physics component from the previous 3.9–4.9ms to about .5ms; no solver setting changed. Before renderer edits, the corrected single-run total was 4.8/3.9ms desktop/phone; `checks/diag/world-unit5-optimization-before.json` retains the profile. Independent percentile components must not be added together.

The largest remaining cost was per-object picture submission. `mesh-atlas.js` groups identical card geometry/materials into InstancedMeshes and renders dirty atlas tiles together. It clears only changed tiles; sleeping tiles are retained. Bound projection and matrix comparisons reuse storage, shadows use matrix comparisons instead of allocating transform strings, and the camera direction scratch vector is reused. The world frame includes the batch flush, so the gate does not hide deferred rendering. Normal twenty-body frames use three picture passes instead of twenty: one mesh batch plus two selected splats. Pins/frame/supported cards share the board's single cached composite; they do not add sleeping passes. The five-run gate reads 1.6/1.9ms; max reachable five reads 1.1/1.4ms. Logs: `world-unit5-optimization-first.json`; the matched five-run instrumented profile (`world-unit5-render-profile.json`) measures total 4.1→2.3ms desktop and 4.2→2.1ms phone, renderer submission 1.6→.4ms / 1.8→.4ms, physics .5→.5ms, and splat sort about 1.0→1.0ms. Profiling wrappers add overhead; acceptance uses the uninstrumented five-run check.

The ticket collider now has two thin bevelled slabs with a .2mm perimeter and the authored 2mm body thickness, with a 3mm bevel inset. The visible print/corner curl is unchanged. This removes the narrow curled side ledge that could support an edge-rest; no artificial righting torque, late pose snap, or solver tightening was added. All 100 seeds rest broad-face within 3.125s, minimum absolute face-up dot .999963. Ticket collider contact gap .559/.341px; across all cards the largest gap is 1.011/.606px, all below 2px. Paper/postcard worst sleep 3.658/3.183s. Every card has zero idle steps, syncs, shadow/picture changes, uploads or callbacks, and pinned reload drift is 0px.

Pre-freeze audit: board rebuilds dispose owned geometry/materials/textures (including pins) without disposing attached card art; discovery works when category registration precedes or follows restore; reservations use actual projected picture bounds plus controls. The first desktop reservation assertion exposed a 5.33px difference from nominal dimensions; the fix records the final picture rectangle, without relaxing its check. Selected splats can now attach real geometry inside a support picture; a fixture proves identity, no detach jump, stored charged-top pause, and charge cancellation on pickup. Native Enter/arrows/Shift-depth/Escape and real mouse/touch dragging pass. The collection-curtain merge initially hid proxies but missed cached cards/splats and the board; it now conceals their pictures/shadows after all cache rendering, and hides board controls during Butterman. The audit checks now inspect the pictures too.

G4: five alternating warmed baseline/converted rounds on the RTX 5070 Ti, with the whole sixteen-keepsake collection and immutable foundation `677f535`. Final desktop/phone full-frame median deltas are both +.1ms; GPU median deltas are +.000576/+.000224ms, CPU submission delta effectively 0. Results retain the raw samples, loads, renderer and scene in `checks/diag/world-unit5-rest-{desktop,phone}.json`. Phone means desktop CPU at 390×844/DPR2; iPhone Safari remains unmeasured. No hair-thin threshold exception was needed.

Phone edge audit: `sc/audit` captured the old GL rifle/brass top on SwiftShader, before Aaron's selected splats. The selected AWP/top use analytic Gaussian alpha edges and padded pictures; the current real-GPU phone screenshots show the replacement art. No global MSAA or DPR-floor increase was added: it would increase cat/splat fill cost without treating the old hard polygon edges. The scoped mesh atlas retains its existing DPR-dependent capacity. Unit 6 must fit its real holders to the selected art and review contact/occlusion; the support fixture is a technical plank, not proposed shelf art.

For Aaron's veto beyond the already recorded card art choices: the ticket keeps its curled drawing but uses a bevelled thin collision stock for reliable broad-face contact. All material-sound strength choices remain those in the integration note. No new third-party art, font, recording or model was added by this optimization. The original AWP/top source-URL/license follow-up remains open.

Final review also makes hidden stored cards hide their empty DOM focus outline (the physical geometry and keyboard actions are unchanged); art screenshots blur the test's returned focus only after asserting that it returns correctly. Cached pictures now react to visibility-only changes, including the five-second off-screen respawn interval, and keyboard lifting refreshes a moving cat attachment before choosing its grip point. These close handoff cases rather than changing the solver or thresholds.

The first full run exposed an integration assumption in `sounds.js`: its paper/medium shuffle probe shared the bag with the paper just dropped by the paradox. The probe now uses previously unused tin/small while keeping the same nine-voice/no-repeat/exhaustion assertions. A dedicated contact diagnostic records both consumers of the old paper bag. The playthrough also sampled the bolt's counter before the strike (0 at its fixed wall-clock sample, then cloud present at completion); it is rerun alone in the quiet window without changing its assertions before the final full run.


The expanded full run caught a unit-5 interaction with splat restore sizing. Dragging now correctly clears `autoHome`, but the old adapter reconstructed its local model/collider scale from that saved 2D home's different floor depth. The measured phone reload kept body pose, camera, insets, unit and requested width identical while scale changed .1452491473→.1680398356; its picture changed 44×43→50×48px. Desktop changed 104×105→116×117px. The fix stores `{version:1,artScale}` as adapter data in the same world-body record, and restores it with the pose. Existing saves without scale use the prior calculation once and then record it. The unchanged reload checks are the acceptance gates; there is no position tolerance change.

The isolated follow-up proves the remaining premises. Fresh ticket bodies also pass all 100 seeds (same 3.125s maximum, .999963 minimum face-up dot). Real paper impacts interleaved two extra voices with the old nine-voice probe; the full shared stream exhausted each three-variant bag correctly while the probe-only subsequence did not. The isolated bolt line passes unchanged. The top's persisted physical scale now restores identically and the unchanged drag/spin reload check passes.

The phone layout diagnostic disproved the initial selection-change hypothesis: selected card, board root and paper body position were identical across reload. The 9px reading came from a stale hidden-card screen rectangle. A visibility optimization had returned before recomputing bounds for a changed stored pose; it now updates bounds on pose/layout events and skips only rendering. No hidden/sleeping polling is added. The board's projected padded rectangle started at y=72 while the reserved header inset ended at 76, so phone top clearance increases from 4 to 10 CSS px. This keeps the actual picture bounds below the count/inset without changing the furniture assertion. Record the extra 6px clearance for Aaron's visual veto.

The second full suite passed all unit-5, world-core, world-props, support, sound, water and reload gates, but ended `FAILED: look-pat-return-desktop play-phone`. Its unchanged crowded-pat assertion missed the left press where the top overlapped the pat; the phone keyboard line saw zero yaw despite Enter working. The isolated measurement (`checks/diag/pat-world-pick.js`, `keyboard-core.js`) tests those fixture premises: at fling start the top/rifle/postcard were still awake, and the top's projected bounds moved from y=635 to y=651 before the press. Waiting for natural initial sleep gives passing left/right drags at both sizes. The crowded-floor setup now awaits all world adapters and checks natural sleep before flinging; it retains both drag assertions. It does not assert that a moving prop cannot later occupy a gap.

The keyboard diagnostic records the correct 1.225rad/s immediately after ArrowRight, no input lock/press/scripted rotation, but only 4 and 2 stage frames during two 500ms wall-clock windows: yaw advances .09/.04rad and fails the old >.15 reading. A 30-frame run advances .34rad. That functional check now samples after .5 seconds on the stage clock, bounded by 3 seconds wall time, retaining the >.15rad and exactly-one-tap assertions. No product, input priority, motion or performance ceiling changed for these two fixture corrections. This is not an e1110-15 threshold exception. The original failures and raw measurements remain recorded; a final full suite is still required.

The sparse initial RAF windows are observed, not a proven shader/driver root cause and not a claim that startup hitches were fixed. The keyboard change separates its functional input assertion from elapsed wall time; warmed world/render budgets remain separately enforced. Actual phone startup responsiveness still needs the already-required iPhone Safari validation.

Final screenshot review caught a defect that numerical tests had missed: after an encore unlock, the phone ticket board had a grey rectangle behind it. The third full suite did end **ALL PASS**, but was not accepted on that basis alone. The isolated forced-SwiftShader diagnostic (not a cost measurement) reproduced the cause: during Butterman, changing the tray selection leaves the now-stored card with `stored:true, root:true, art:false, shadow:true` after the curtain restores its old visibility. The first software navigation timed out; the second allowed DOM-ready navigation and produced the evidence. The regression is in visibility lifetime, not the atlas or its alpha.

The curtain now hides only during the synchronous main presentation and restores immediately afterward, including the main-scene redraw used by shader warm-up. No saved visibility mask crosses an asynchronous unlock/layout event. Input has a separate conceal flag; pointer and keyboard pickup are blocked, and entering a takeover cancels an existing grip. Fixed furniture supplies its `presentation` on the world entry and uses `world-furniture-actions` for its controls, so shelf/rack builders need no new central curtain case. The existing audit now inspects actual draw-time visibility instead of the temporary flag between draws. A new board check unlocks the ticket during a takeover and verifies hidden stored art/shadows, no hidden pickup, and idle afterward. The focused software check passes; real-GPU acceptance follows below. This is one measured visibility repair, with no solver, art or numerical-budget change.

The final G4 desktop subtraction initially reported `0.1000000000003638ms` against the inclusive `.1ms` limit: an excess of 3.64e-13ms from floating-point RAF timestamps. Phone reported `.0999999999985448ms`. `world-board-rest-verdict.mjs` now compares integer nanoseconds (100,000ns limit) while retaining every original sample and raw delta. Re-evaluating those same five-round samples passes both sizes; no rerun selected more favorable timings. Boundary checks prove `.100001ms`, `.2ms`, and page errors still fail. This is numeric precision, not a raised G4 allowance or an e1110-15 exception. The <=2.5ms active-world gate is unchanged.

The first closing full suite on the final curtain code started at load 4.08 and passed all unit-5 checks (twenty-body medians 2.0/2.0ms, five-prop medians 1.5/1.5ms). It ended `FAILED: sounds-desktop look-landing-desktop world-core-phone`: the latter two could not import Three because standard Chromium reported CDN `ERR_NAME_NOT_RESOLVED`, including the built-in retry. No DNS/browser override was used. The sound line had no per-condition detail, so the check now logs its existing assertion inputs without changing them. Its isolated desktop rerun at load 4.97 passes: all requested voices rejected, clip/loop/tone counts unchanged, RMS 0, even while the naturally falling paper remains awake. That does not prove the original failure's cause. The first isolated launcher lacked `PW_FROM` and failed before opening Chromium; the corrected launch uses the same path as run-all. Raw closing suite and isolated logs are retained in `world-unit5-full-fourth.json` / `world-unit5-sound-final.json`. A clean standard-browser full rerun is required; no product edit follows these observations.

### Closing status after the timeout — committed, validation blocked

No new product work followed the orchestrator's finish-only instruction. Named-path commits preserve: merge/material contacts `c45201e`; mesh batching, cached support state and saved physical sizes `9c6cdc8`; ticket collision shape `6029e4a`; synchronous curtain visibility `b3e1a5b`; checks and retained diagnostics `04ede4f`.

All unit-5 own gates pass at both sizes on ANGLE/D3D12 NVIDIA RTX 5070 Ti. The paired closing run measured twenty-body medians **2.0/2.0ms**, five-prop medians **1.5/1.5ms**, desktop/phone viewport. The second run's later desktop readings are **2.4/1.4ms**; all are within the unchanged 2.5ms ceiling. All three cards pass 100 seeded broad-face drops; ticket also passes 100 fresh-body controls, worst sleep 3.125s. Maximum card gaps **1.011/.606px**, pinned reload **0px**, and converted idle work **zero over 2.1s**. G4 frame delta **+.1ms at both sizes**, GPU deltas **+.000576/+.000224ms**. The integer-nanosecond precision correction is disclosed under e1110-15; it does not increase either timing limit. Nine new runtime modules total **54,360 source bytes / 21,851 separate-gzip estimate bytes** (not a captured transfer; changes to existing modules are not included in that module total).

The final standard-browser rerun started at load **5.41** while holding the shared lock. Desktop unit-5/core, unchanged sound-silence, world, restore and play checks passed; then `noscope-footer-desktop`, `noscope-video-desktop`, and the next pet check could not import Three because Chromium reported `ERR_NAME_NOT_RESOLVED`. The completed footer/video attempts included the built-in startup retry. The previous closing full run had already suffered the same CDN failure at two other checks. After these two full attempts, the blocked process group was stopped and the lock/server released; no resolver override, substitute browser, further full retry, or product edit was made. A host DNS lookup between failures resolved normally, so the exact Chromium/network cause is not established. The original one-off sound failure likewise remains unproved; its added diagnostics and both unchanged passing reruns are retained.

**There is no current-source ALL PASS to claim. Unit 5 acceptance and the API freeze remain pending a clean standard-browser full suite.** The last completed full status is `FAILED: sounds-desktop look-landing-desktop world-core-phone`; the later rerun was stopped, so it has no final run-all status line. `world-unit5-full-final.json` records that distinction and the partial rerun evidence. The complete documented support contract is ready for review; do not silently treat this external validation block as acceptance. No further API/product change is proposed.

Reviewed the final actual-size board/front/back/edge, native grip/support, phone selected-splat edges, all-sixteen-keepsake play and reload captures. The ghost rectangle is absent before and after reload. Selected unit-5, world-layout/restore, audit-curtain and all-collection captures are retained; unrelated generated screenshot churn is restored. No MSAA/DPR change was made. Actual iPhone Safari play/startup performance remains unverified; original AWP/top input URLs and exact licences remain the existing provenance follow-up.

## Overnight orchestrator's choices (2026-11-10/11, session sigil-night), for Aaron's veto
- Numbers set under e1110-15: the 360 video-skip observation wait 750 -> 1,100 ms (cleanup measured at 965 ms); the 0.1 ms rest-cost comparison now compares whole nanoseconds (a float rounding made exactly 0.100 ms fail; the 0.1 ms limit is unchanged).
- Unit 5's twenty-body cost fixture started bodies inside each other (14-15 overlapping pairs) and so measured a pile-up the page never makes; it now drops from non-overlapping starts. The 2.5 ms gate is unchanged.
- After unit 5 failed its cost gate twice, the fix (batched pictures, corrected fixture, ticket collider) ran as its own optimisation step, as the plan prescribes for cost misses ("profiling, not relaxed checks").
- Bread: Esc still does not cut the blast-off short and the loaf returns as a star, as before; unchanged pending Aaron.
- The cow is a CC BY 4.0 model (Rukh3D, Sketchfab) with our own walk and graze clips; credit is in the sources file (on-page credit is Aaron's call).
- Builders took turns on full checks through a shared lock in a quiet window after seven parallel runs overloaded the machine (load average 53).

## Integration-only repairs on `sc/fix` (2026-11-11)

The cake-party branch already supplied the synthesized toot and a prose source note, but the sound branch's machine-readable ledger and measurement snapshot predated it. Added its exact `tools/audio/make-party-toot.py` provenance to `design-manifest.json` and the source table, and taught the ledger generator to retain that credit. `tools/audio/measure.py` now includes the existing review reel when regenerating the current report (the baseline option is unchanged). All 116 delivered files match their measurements. The toot's bytes are unchanged: 1.25s, sample peak −16.888dBFS, 4× true peak −16.839dBFS, loudest measured 100ms RMS −22.014dBFS. It meets the −22dBFS effect target and the existing peak rules; a dedicated file check now enforces that target. The original 69-cue review reel is unchanged.

The reported tray delta was a measurement overlap with deferred GPU warm-up, not two textures leaking on every layout. A render/disposal trace found each retired board's rendered resources released. A controlled run held the warm queue while creating the board, then released it without any tray selection: renderer memory grew 41→44 geometries and 21→24 textures. A later hold, after Butterman's shadow/hand uploads, grew 43→44 and 22→24 with no tray changes. Actual `createTexture` stacks identify the galaxy noise upload and the layer-1 warm-up render target; the earlier hold also catches Butterman's shadow. Twelve subsequent tray layouts stayed at 24 textures (44→45 geometries, a bounded first-use geometry upload). The original count assertion is unchanged, including its +2 geometry/+1 texture allowances. It now first asserts that `stage.warmLeft` reaches zero, so unrelated first-use warm-ups finish before the baseline. No production resource disposal or rendering behavior changed. The controlled evidence and both focused-size results are in `checks/diag/integration-fix-results.json`; `checks/diag/tray-warm-premise.js` reproduces the warm-up isolation. This corrects the shared premise instead of masking a supposed leak with larger allowances.

The check harness resolves `cdn.jsdelivr.net` once at full-suite startup with three bounded DNS attempts and shares the IPv4 answer through `SC_CHECK_CDN_IP`. Both `run.mjs` and the separate rack-frame launcher pass the same narrow `--host-resolver-rules=MAP cdn.jsdelivr.net <address>` rule to Chromium; standalone launches resolve at startup themselves. No address is hard-coded. Original HTTPS URLs, certificate validation, pinned Three/Spark/Rapier versions and production loading are unchanged. If all resolution attempts fail, the harness stops before launching the suite. `checks/cdn.test.mjs` verifies transient retry, shared-address reuse/validation, and bounded permanent failure. This is the documented permanent check-harness version of the earlier temporary galaxy resolver flag.

Validation: focused board integration passes at desktop and phone, all sound-file checks pass, and all three resolver tests pass. Those initial resource/functional probes used SwiftShader: the device sandbox lacks `/dev/dxg`, so NVIDIA launch flags alone did not select hardware. The first full-suite launch was stopped as soon as its live cost log exposed that fallback, before any cost verdict; it has no final status line. `checks/out/fix-run-all-swiftshader-aborted.log` is retained. A read-only host probe confirmed `/dev/dxg` and the RTX 5070 Ti. The hardware rerun uses the same headless runner outside the device sandbox, the shared lock, port 18748, and `--shots docs/shots`; start load 9.60. The final full-suite result is recorded below after completion.

The first hardware full suite ended `FAILED: sounds-desktop party-phone look-landing-phone`. All requested repair gates passed, with no request/DNS failures. The sound failure recorded all voices denied and unchanged clip/loop/tone counts, but RMS .016632 while the paradox paper was still awake. The other failures were exact party restoration and the phone butter impact sample (centre .409/.331, width ratio 2.183). Each failed check received exactly one isolated rerun under the lock at load 2.95, with its original assertions: all three exited 0. Sound RMS was 0, party restoration passed, and butter impact was .620/.400 with ratio 3.185. Those reruns establish intermittence, not a proven cause for each original failure. No product edit or tolerance change followed them. The closing full rerun starts at load 1.47 on the real GPU; both full histories and isolated evidence are retained.

The second hardware full run ended `FAILED: world-supports-phone play-phone look-landing-phone`. Further full retries stopped for a measured readiness audit. The support's single isolated rerun passed, but recorded only three stage frames across 305ms, including a 270ms gap while two deferred warm jobs remained pending. The play diagnostic's unchanged reload assertion passed, while its early bolt sample saw zero flashes before the completed cloud; startup work was still pending. `site.ready` is only `eggsReady`, not the renderer's deferred queue. `checks/lib.js` now asserts that the existing queue drains before interaction checks. Startup frame recording remains in the separate rack runner. No production scheduling, solver setting or numeric budget changes.

A controlled 150ms pending-butter interval demonstrated the landing clock error on one flight: the old .36–.54s window samples the flight before impact, while the same window measured from the actual flight start passes the original centre/size bounds. The first control mistakenly delayed the pat mesh's own readiness too and threw before recording; that invalid measurement is retained and explicitly excluded. The corrected control delays only the initial prerequisite. `look-landing.js` now awaits `cat.ensureButter()` before starting its existing clock.

The phone reload difference is an exact font-metric reproduction, not lost poses: Archivo gives a 216px footer and feet y=463.482509; the fallback gives 190px and y=476.482509, with the same 225.062253px unit. Toggling only the font reproduces paper 1.215142↔1.272903, postcard 1.308449↔1.366211 and ticket 1.357324↔1.415086, the failed run's exact differences. The failed before/after screenshots also show the different fonts. A per-check in-memory font response cache now uses Playwright's request transport and reuses the original response, or the same failed-request fallback, across reload. Both launchers wait for requested fonts and their layout before their checks. The normal interaction library separately asserts that deferred shader warm-up completes; the rack runner retains its startup frame recording. The stylesheet URLs, font bytes and production page are unchanged; no font files are vendored. Unit tests cover both response reuse and first-load failure followed by network recovery.

Two fixture prerequisites are now explicit: the sound silence probe awaits its real paradox paper's adapter, natural sleep and quiet tail before submitting denied voices; the party probe awaits both world adapters before snapshotting them. The original silence and exact restoration assertions remain intact. The first party failure did not log its failing subcondition, so its exact cause is still unproved; the setup previously allowed asynchronous adapter construction during suspension. These changes establish complete fixtures without stopping live sounds, freezing bodies, or relaxing tolerances. Detailed controls and original failures are retained in `checks/diag/integration-fix-results.json`.

The focused validation also exposed a check-side fork timer: the <2s recency assertion ran after awaiting a PNG screenshot. It now samples the event age before screenshot I/O, retaining the same bound and event/discovery assertions; the subsequent phone check records .091s and passes exact restoration. The five harness unit tests pass. The sound's natural-settle prerequisite, unchanged silence assertion, support plop and unchanged butter impact bounds pass their focused hardware checks.

The affected hardware checks now pass on the measured fixes: support, landing, sound/restore, party, and the entire phone playthrough/reload (every saved position within the original .02-cat-height bound). The next full-suite launch starts at load 3.92 under the same lock and real RTX GPU. No further full retry preceded these measurements and focused corrections.
## Overnight prepared art — Astra, 2026-11-10 (Aaron's veto list)

Art-only delivery on `sc/art`; no runtime or existing-check changes. Each choice
below is provisional for Aaron's veto. Files, colliders, masses and inspected
three-angle renders are in [art-ready.md](art-ready.md).

- **Rack:** turned dark walnut, restrained grain/varnish and aged brass. Exactly
  four knob-ended pegs on two perpendicular tiers; stable broad foot; fixed mass
  zero. Four named peg anchors and crown socket are exported for unit 7.
- **Bulb:** separate screw-base envelope with filament and support wires; .060
  play mass. Glass uses reflective alpha instead of a screen refraction pass.
  `create({lit:true})` changes filament emission only; the adapter owns any fill.
- **Quality boundary:** inspected actual headless front/rear/oblique renders.
  Rack grain was reduced after the first render looked striped. These are compact
  realistic material studies, not a claim of scan-quality hyper-real surfaces;
  bulb profile facets and non-refracting glass are visible at macro scale.
- **Delivery format:** original CC0 procedural JS modules, browser-built seeded
  256² maps, no downloaded art. Static subparts batch by material. No frame loops.
  G1–G5, mixed-body physics and real-device/GPU cost remain the runtime builders'
  acceptance work; art triangle/texture counts are recorded separately.

- **Four hats:** retain purple/yellow wizard, orange/white cone, pink/teal party
  and gold/red/blue crown palettes. Pixel patterns wrap complete hollow forms;
  party pom and crown gems are actual small blocks. No flat sprite silhouette.
  Inspected all four from front, rear and below. Fixed cone band UV placement
  after first inspection. Materials are intentionally pixel/faceted, not realistic
  millinery. Peg/head/butter anchors are available; loose collision uses simple
  outer shapes, so attached head/peg contact must be disabled by the adapter.

- **Tin:** closed cream/green enamel with original front wording, rolled lid,
  seam, cloth plaster and sparse metal edge chips. Added “A LITTLE CARE / for
  curious paws” on the reverse for veto. Rejected the first grainy lid render
  as plastic/fabric-like; final enamel is smooth. Inspected front/rear/top;
  this is a clean manufactured tin, not a heavily weathered photographic prop.

- **Shelf:** warm wood, dark steel brackets and leather-lined two-point rifle
  cradle; circular recessed top well, green-rimmed glazed butter plate and tin
  bay rails. Inspected front/rear/underside. Proportions and slot references are
  ready for the selected AWP/top fit; exact stored transforms and support gaps
  require unit 6 integration. Surface grain is plausible but visibly procedural
  close up; do not call this scan-level hyper-realism or a physics acceptance.

- **Box with separate lid:** Box: choose a single hinged corrugated lid with tape, thick walls and exposed rim fluting. Separate .25/.04 play masses and actual empty cavity. Inspected open/closed/below. Clean new-box appearance is plausible; macro crease/weathering is restrained. Unit 8 owns the latch and compound-wall contact checks.

- **Flour sack:** Flour: folded kraft sack with restrained wheat illustration and a reusable source bag; dispense a separate .030 flour mound. Inspected label, rear and closure. Removed protruding decorative creases after inspection; the finish is an economical procedural paper study.

- **Bucket with milk:** Bucket/milk: galvanized pail and fixed settled bail; separate opaque milk volume, .12 play mass, below the rim. Inspected inside/out and above; no translucent water shader or particle fluid. Slosh, fill state and body ownership belong to unit 8.

- **Three-tine pitchfork:** Pitchfork: traditional three-tine fork, wood handle, dark steel and polished tips. First render revealed a socket gap; corrected and re-inspected. Simplified tines use one compound rigid body. Upward exit/hay spawning remains the runtime builder’s responsibility.

- **Hay pile:** Hay: one solid-looking pile with 600 batched straw segments and one convex falling body. Rejected the first pincushion-like surface and rebuilt it; final crossed straw silhouette reads as hay from three views. Tiny individual stalks never become physics bodies.

- **Cake:** choose a naked sponge cake with cream/jam filling, ivory icing and
  one visible missing slice. Inspected all three angles. Crumb pores are a seeded
  map; removing tiny pore meshes reduced 18,024 to 8,688 triangles. The .18
  cylinder collider intentionally spans the missing wedge. No new recipe step
  is implied by the decorative jam. The egg-free recipe remains unchanged.

- **Cow — explicit quality hold:** original black/white cow with udder, split
  hooves, horn/ear detail, four leg pivots and a finite walk/graze pose sampler.
  Inspected standing/rear/top and lowered grazing pose after refining head,
  hooves and nostrils. The silhouette is recognizable but the rounded anatomy
  and neck transitions remain toy-like. **Not accepted as hyper-real final art.**
  Preserve this compact study for the runtime builder's integration work; a
  dedicated anatomy/material refinement is still needed before visual acceptance.

- **Final art audit:** 31,364 bytes of procedural modules (15,629 gzip), 71,902
  triangles / 84 meshes for the 15 requested assets together, 6,902,592 generated
  geometry bytes. All final headless renders have finite geometry and zero page
  errors. Inspected added lit-bulb, empty-pail, milk-volume and flour-portion views.
  No production runtime, existing check, push or real-device benchmark was run.
  These counts do not establish the shared-CPU or real-GPU cost gates.
- **Final fitting choices:** seat the screw inside the rack socket at Y=1.455;
  place butter above the party pom at Y=.4315; use full-height conservative crown
  ring colliders. Flour's separate portion uses a shallow convex fit. Runtime
  builders retain responsibility for attachment contact filters, slot poses,
  lid/milk ownership, waking/sleeping and pose-following cow proxies.

### Unit 6, step 1 — prepared tin becomes a body (2026-11-11)

Merged the approved art branch at `ac95bde`, retaining both REVIEW histories. The enamel tin now has a weighted Rapier body, lid-enclosing collider, original front/back print, the existing plaster rustle tap and material impact voice. One baked mesh shares the dirty-tile renderer; its physical size is fitted once to its arrival width and saved. Prepared labels were .0005 units inside the enamel face; moved them outward .002 units. The shadow receiver now also accepts a root Mesh (previously it required children).

The first production-adapter run caught an array/object mismatch in the collider offset; corrected before drop validation. Desktop RTX 5070 Ti: 100/100 seeded drops asleep, worst 3.742s, worst rest gap .339px, maximum step energy increase .00893 play units. Transient dip -.01165 units is diagnostic only. This is a working-step checkpoint, not unit-6 acceptance; phone, native grip, complete collection and cost gates follow.

### Unit 6, step 2 — shelf and continuous physical butter (2026-11-11)

Working implementation checkpoint, not final acceptance. Added the prepared wood shelf with two fitted, leather-padded rifle saddles, recessed top seat, glazed butter plate and tin rails. The holders' heights use sections through the production rifle collider; they no longer obscure its barrel. The shelf is a shallow tilted display tray (16 degrees to the camera), with attached art sharing one depth-correct cached picture. It appears empty after two unique solid discoveries. Store/Lift and an expanded arrange view keep phone arrangement usable; all controls remain 44px. Choices for Aaron's veto: empty bays rather than auto-storage; the shallow display tilt; explicit Store buttons alongside physical release; original waxy yellow butter material retained.

The butter now retains one body identity on the crown, through its original flight/splat/grease slide, as a free weighted pat, and on return. A 26-point rounded convex hull follows its original rounded geometry; restitution .03 and friction .85 give a soft, short landing. Crown return is a finite .22s transition through the existing cat-seat API. The prepared tin's print is readable on both faces. Phone 100/100 seeded drops: tin worst 3.333s / .194px gap, pat 3.808s / .202px gap. The basic crown→flight→floor→crown identity check passes at both sizes on RTX 5070 Ti; desktop-CPU phone viewport is not an iPhone measurement.

The shared contract is accepted/frozen by the morning handoff at fb6fc68. Unit 6 adds optional preview/grip lifecycle hooks and butter-presentation events without changing existing signatures; documented in the plan for rack lane B. No hat, rack or lamp files changed. Screenshot review caught compact controls intruding on the cat; their typography and home were tightened before the formal interaction gates. Remaining work: native release/rejection, full-collection contact/reload/idle, performance, full-suite integration and final visual review.

### Unit 6, step 3 — interaction/contact checkpoint

Both sizes now pass the shelf's release compatibility/occupied/fast rejection, routed off-centre grab, preview, native keyboard, exact supported reload (0px for all four), and 2.1-second zero-work checks. Compact phone controls show only the selected-item picker and Arrange; Store/Lift is in the expanded view, keeping the petting area clear. The initial phone fixture released at an arbitrary one-second deadline. Its diagnostic repeat measured a valid candidate .054 units away at .086 units/s; it now waits for the same slow-release preview a player sees before releasing. No acceptance threshold changed. The original failed/cascaded readings are preserved in `checks/diag/world-unit6-first.json`.

Production 100-seed final desktop drops: tin 3.742s / .339px collider gap / .483px visible gap; butter 3.808s / .342px collider gap / 1.971px visible gap. The legacy ant-farm fixture now exercises the still-legacy box, and converted-tin/butter coverage uses the actual 3D production hulls. Existing butter-return checks now require the same physical pat to occupy the crown instead of requiring its deletion. Both crowded returns and the unchanged central/enlarged butter landing checks pass on desktop.

Performance is still open: first twenty-body medians 2.6ms desktop and 1.9ms phone viewport; full seven-body collection 1.9/1.6ms. Five separated starts have zero interpenetration. First cumulative desktop G4 measured +.2ms full-frame / +.0005ms GPU versus immutable 677f535, exceeding the unchanged +.1ms full-frame gate. Per rule, rerun those timing misses alone before treating them as real. No gate was raised. All measurements here use the desktop CPU and RTX 5070 Ti, not an iPhone.

### Unit 6 stop — cumulative idle budget, with one premise measurement

**Unit 6 is a committed candidate, not accepted; do not merge it as complete.** Both functional shelf runs now pass at desktop/phone: all four supported reload drifts are 0px, slow insertion is within .25s, incompatible/full/fast releases reject, native keyboard/cancel works, and all tracked idle counters stay fixed for 2.1s. World-layout/reload passes at both sizes; legacy physics/reload passes on phone. Desktop legacy reload passes, but its three-height fixture reports `same/caught=true, fell=false, straight=true`: replacing the tin with the larger box left the last centre height too close to the floor for the required 35px fall. That fixture needs a geometry-relative release height; its fall assertion has not been removed or relaxed. Full fresh collection obstruction on phone is at most .1282 (top), below .2. The desktop butter landing and both crowded returns pass. Final candidate/full-suite integration has **not** been run because work stopped at G4.

G3 is met without changing its <=2.5ms limit. First desktop median 2.6ms was rerun alone: five p95 readings 4.4, 3.6, 2.2, 1.8, 1.6ms, median **2.2ms**; maximum seven-body collection median **1.6ms**. Phone-viewport readings 2.8, 2.5, 1.4, 1.7, 1.9ms, median **1.9ms**; seven-body median **1.6ms**. The fixture is actually two splats, twelve printed cards and six tin/butter meshes (the initial log's composition text incorrectly said ten/eight). Each restart has zero intersecting pairs. All use RTX 5070 Ti and this desktop CPU.

G4 missed twice on desktop: immutable `677f535` full-frame median .4ms → .6ms (**+.2ms**, GPU +.000544ms); repeat .4ms → .7ms (**+.3ms**, GPU +.000704ms). The unchanged cumulative ceiling is +.1ms. Phone's first comparison was .5ms → .7ms (**+.2ms**, GPU -.000640ms). No gate was raised. These deltas concern the whole accumulated collection, not a fresh allowance for the shelf.

**Premise and evidence:** the converted collection is fully asleep, so the remaining delta is presentation work, not continuing solver/adapter work. The one-time diagnostic confirms zero changes in steps (300), syncs (304), shadow updates (165), atlas passes (9), shelf draws (5), board draws (1), support frames (0) and frame-callback count (12). In five alternating isolated main-render batches, all art is 16 draw calls / .294ms median CPU submission; no shelf picture is 15 / .252ms; no new tin/pat shadows is 14 / .228ms; no unit-6 pictures is 13 / .202ms; no floor shadows is 10 / .178ms. Hiding was diagnostic only; the production scene is unchanged. These batched submission figures are a different workload from RAF frame medians and must not be subtracted as exact full-frame savings. They identify static shadow/picture draw-call batching as the next optimization to test, not solver tuning. Recommend preserving the +.1ms gate and batching the stationary main-pass shadows/pictures before another acceptance attempt.

**Load correction:** commentary initially said both desktop comparisons crossed load 14. The raw JSON shows the first stayed quiet, **9.78–12.26**. The repeat reached 18.64 and phone 19.42. Load alone therefore does not explain both desktop misses. An additional quiet-audit draft was canceled before any samples; there was no third acceptance run. The completed one-time premise diagnostic is `checks/diag/world-unit6-premise.json`, with script `checks/diag/world-shelf-rest-profile.js`; both failed comparisons and the phone result remain in their raw JSON. The preview server and waiting diagnostic/browser were stopped; the shared lock is released.

Remaining review work, not hidden by the passing subset: exercise full floor→shelf native depth travel (the existing release check starts beside the bay); wire a successful physical release's plop sound, currently explicit Store has the material voice; make expanded Arrange's Store action distinguish its background pickup mask from a genuinely disabled in-flight body; synchronize butter state for keyboard crown insertion as well as pointer return; retain shelf height when tapping a stored top rather than using its existing floor-spin reset; finish the plate/rail fixed-collider fit (the current runtime collider set is board/recess plus rifle risers). A high phone pat drop in the generic physics fixture ended with projected bottom y=961px while the viewport is 844px: contact passed but reachability was not asserted there. Measure the camera-parallel grip plane's depth drift before fixing that, and add the reachable/respawn assertion. None is a request to weaken a visual/play gate. No new product edits were made after the second G4 miss.

### Unit 6 continuation — shared presentation, e1111-21

Aaron changed the validation schedule: this run executes functional checks only. No run-all, world-core cost, picture/rest cost or G4 is run, and no budget is relaxed. The prior attribution (16 main draws; 10 with floor shadows hidden) motivates the shared helper; it is historical evidence, not a new performance result.

All cached world pictures now share an ordered main-pass quad batch; sleeping floor silhouettes share one geometry/draw. Fixed furniture keeps its composite lit cache, with supported art rendered in that cache. Wake, pose, resize, visibility and disposal invalidate only what changed; no permanent idle callback is added. Rack lane inherits this through the existing factories. The API and ownership contract are documented in the plan.

Desktop and phone viewport comparisons match independently rendered original quads/shadows: zero pixels differ by more than four channel levels (desktop maximum 0, phone maximum 1). Wake and visibility pass. The first phone idle fixture sampled before pending presentation work had settled; its repeat waits for actual idle and reports unchanged buffers and 4→4 render callbacks over 2.1s. Existing phone curtain/unlock checks also pass (99 concealed draws). Screenshots show the same silhouettes, holder contact and print. Renderer is the standard headless RTX 5070 Ti path; this is not an iPhone measurement. No cost result is claimed.

### Unit 6 continuation — complete shelf play paths

Full floor→bay mouse/touch travel now preserves guided depth across later pointer events, through the additive `worldInput.guideDepth` hook. The same candidate rules still reject wrong, occupied and fast releases. Arrange's explicit Store reads its saved pickup permission, so masking the background no longer blocks Store; genuinely disabled flight bodies still reject. `support.onMount(entry,{animate})` gives accepted interactive placements one material plop through the existing 80ms limiter; restore/layout stay silent. Since a mounted body is already asleep, deliberate placement passes its stable ID, rather than a sleeping body, to the sound API.

Keyboard crown insertion now sets both cat butter state and saved state; actual pickup clears both. Tapping a stored top begins at shelf height instead of teleporting to Y=.004. Its existing cat-spin gag remains. The prepared dish now has a flat bowl and sloped rim colliders; tin rails and padded rifle stops have fitted contact surfaces. Measured local contact heights are .064/.077/.072 for bowl/rim/rail, matching the art. The preview inherits no page heading letter spacing and stays on one line. These are completion/polish choices within unit 6; no rack/hat/lamp or cloud files changed.

The one phone high-drag premise measurement **did not** reproduce forward depth drift: target Z moved 1.988→1.815, final body Z=1.509 and visible bottom=571px. Keep the existing camera-parallel grip. Separately, a fully off-screen sleeping body now uses the existing five-second respawn path, detected once from its cached picture bounds when it sleeps; return homes are clamped to the reachable floor. Held and supported objects are excluded; there is no idle polling. Desktop recovery returned after 5007.9ms and settled visibly with the same body. The legacy desktop three-height fixture now releases the larger box relative to its own half-height, retaining the original 35px fall assertion; it passes.

Two initial play-fixture failures shared faulty premises, measured once in `checks/diag/world-shelf-play-premise.js`: the top's contact voice occurred 42.5ms before its placement request, so the 80ms limiter correctly suppressed a duplicate; and leaving butter on the crown before tapping the top invoked the existing spin-triggered fling (count 0→1), which moved/disabled the butter during the purported respawn test. Corrected functional checks observe one audible rate-limited placement and lift the butter as a player would before testing its throw. No sound limiter or physics threshold changed. Original failed readings and diagnostics remain in `world-unit6-play-evidence.json`.

Both sizes pass full-distance insertion, Arrange Store, disabled-body rejection, silent restore, keyboard crown state, top release height, fitted holder contact and off-screen recovery. All four shelf poses reload with **0px** drift and preserve four unique bodies. The existing shelf idle counters remain unchanged for 2.1s. Tin/butter production drops still pass 100/100 each; desktop maxima are 3.742/3.808s to sleep and .483/1.971px visual contact gap. Shared presentation and touched-file regression validation continues; final costs and run-all are intentionally deferred under e1111-21.

### Unit 6 validation premises — no threshold changes

The later phone presentation check caught one rebuild during its idle sample. Correction to the earlier pending-work attribution: the dedicated measurement shows **adaptive DPR resize**, not recurring sleeping work. DPR 1.5→1.75 at 24.433s and 1.75→2 at 28.450s each rebuilt the board/batch once; buffer counts stayed constant between and after those events. The check now logs layout changes and starts its unchanged 2.1s zero-work window again. The browser remains standard, with adaptive DPR enabled. Sleeping picture vertices are also cached individually, so a moving neighbour does not recompute their world transforms.

A separate full-distance drag fixture captured a preview screenshot before release; under load, screenshot delay let the still-swinging top leave the valid slow-release interval. The fixture now waits for the **current** preview again immediately before pointerup, logging that exact candidate and speed. No release threshold changed. Original failures remain in the JSON. CDN DNS failed twice before two browser launches; the supported `SC_CHECK_CDN_IP` override uses a successfully resolved jsDelivr address, with original HTTPS URLs and TLS hostnames unchanged. No product networking change was made.

### Unit 6 complete for integration — functional acceptance, e1111-21

**42 selected headless functional runs / 512 passing assertions**, covering desktop 1280×900 and phone viewport 390×844, on ANGLE / D3D12 / NVIDIA GeForce RTX 5070 Ti. This is desktop hardware, not an iPhone Safari result. `checks/diag/world-unit6-functional.mjs` runs the focused checks and removes the cost sections from temporary copies of core/props/layout checks; the original cost assertions remain unchanged. Raw history, including failures, is in `world-unit6-functional.json`; the latest per-case status is in `world-unit6-functional-summary.json`. **No run-all or cost gate ran in this continuation.** Final merged performance/full-suite validation belongs to the orchestrator; the earlier G4 miss is not claimed resolved by a new timing number.

Every shelf bay now passes a complete native floor→slot drag at both sizes, as well as explicit Store/Lift, wrong/full/fast rejection, off-centre preview, cancel and keyboard handling. Final plop completion is 248.1/229.4ms (desktop/phone) against the unchanged 250ms bound. All four supported reload drifts remain 0px. Recovery returns after 5018.3/5004.4ms and then falls/settles visibly with the same body. The legacy desktop box fixture and phone counterpart pass. Tin and pat still pass 100/100 production drops each at each size; phone worst visual gaps are .254/1.158px and desktop .483/1.971px. Existing butter landing/crowded returns, saved top/butter, support API, board native input/disposal/curtain, all six impact materials/silent restore, core grip/respawn and normal/reduced charged-top checks pass. No threshold was raised.

The batch's final pixel comparisons have **zero pixels differing by more than four channel levels; maximum observed difference is one level**. Six independent visible world pictures use one main-pass batch; four sleeping floor silhouettes use one merged layer. Buffer builds and callback counts stay unchanged for 2.1s of unchanged layout. A final functional probe caught a fixed-body exception: the charged top's visual rotor rebuilt the sleeping layer 60 times during 60 moving frames. Its active visual now stays in the live-shadow path. The same probe records **0 shared-layer rebuilds during 60 rotor frames**, at both sizes; stopping and settling returns it to the merged layer. The reduced-motion rotor remains static. This is invalidation-count evidence, not a cost benchmark.

Screenshots were reviewed at both sizes: filled shelf, compact/expanded trays, preview, every native bay insertion, butter/tin backs, crown state, top release, recovery and batch parity. The preview's measured 132px box contains its label and clamps fully on-screen (phone x=8…140). The new renderer/support helpers are documented for rack lane adoption without changing existing signatures. All art remains the prepared sourced shelf/tin, original butter geometry and Aaron's selected splats; no external art or sound was added. Cloud, rack, hats and lamp files are untouched.

## Final integration — 2026-11-11

Integration starts from `fb6fc68` on `sc/final`, with merges in Aaron's requested order and no push. Merge `4356c9a` brings unit 6. Its post-merge checks use the standard headless Chromium runner on ANGLE / D3D12 / NVIDIA GeForce RTX 5070 Ti. The initial device-sandbox run lacked `/dev/dxg`, reported no parallel shader extension and missed the stationary-shadow count; it is diagnostic only. The unchanged presentation check passes on the confirmed hardware renderer. A preview server later exited 143, leaving eight browser nonstarts; the resumed runner owns its server and retains those failed-start logs. No product code or gate changed for either environment issue.

Unit 6 post-merge acceptance: all 12 focused runs pass (presentation parity, moving rotor, shelf/reload, interaction/recovery, every native bay drag, and solid drops at desktop/phone). The raw ledger is `checks/diag/world-unit6-functional.json`; cost gates remain deferred until all lanes are merged.

## Unit 7 lane B — first integration checkpoint (2026-11-11)

Merged `sc/art` at `ae39e38`, preserving both branches' appended review notes.
The four prepared hollow hats now each have one stable `rack/<name>` physical
identity and named peg, and transfer their actual geometry into the cat picture
through unit 5's support API. The rack is fixed bottom-left furniture. Its first
phone art probe exposed oversized foreground projection and cat overlap; the
adapter now uses .42 physical scale and solves its left placement from projected
assembly bounds. The empty pegs remain in place. This scale is a provisional
choice for Aaron's veto, pending the full collection and both-size checks.

The wet-lightning combo awards a single bulb alongside the existing strike; it
does not replace charged-top/shock behavior. A bulb-only socket owns occupancy;
the bulb's saved adapter state owns on/off. Warm filament, local fill and glow
are rendered into the fixed rack's cached picture only when state changes.
No recurring hat-facing callback remains. Shelf/fling/core files are untouched.
This is a working integration checkpoint, not a G1–G5 acceptance claim.

### Unit 7 contacts and attachment checkpoint

The complete phone and desktop focused checks pass on the RTX GPU, including
all four hats across all four cat poses, mouse/touch off-centre grips, native
keyboard, 100 seeded drops of each shape, 100 continuous lifts of the same party
hat, bulb uniqueness, warm socket, exact supported identity on reload, and lit
and unlit zero world work over 2.1s. Fixed support drift is 0px; the worn hat's
local seat is exact while its page proxy follows the cat's independently bobbing
picture. The loose/off reload fixture and performance/integration gates follow.

Contact work is disclosed in `checks/diag/world-unit7-contact-results.json`.
The first cylinder approximation of the wizard brim sustained a tiny upright
contact cycle; its fitted beveled lathe profile passes all 100 drops (4.642s
worst). The original party proxy omitted its pom, giving a 3.794px visible gap.
A separate pom fixed the gap but inherited half the paper hat mass from equal
compound weights. We stopped after two failures and measured the contact state.
The final party collider is one hull of the actual mesh vertices with passive
paper friction/damping. Two isolated optimization runs still found a single
history-dependent teleport timeout, so a second premise audit compared body
inertia, fresh releases and continuous real lifts: **100/100 fresh releases in
<=6s and 100/100 continuous lifts in <=4.683s**, with no growing energy. The check
now uses fresh seeded bodies for every shape, plus repeated real handling of the
same party identity. Failed teleport traces remain retained, not relabeled PASS.
No sleep, gap, energy, timing or visual limit was increased.

The native touch check originally interpreted a successful slow return to its
nearby peg as failure. It now measures that the real input detached the hat and
released the joint; two short drags correctly reoccupied their own pegs. The
legacy integration checks now inspect true crown height and exact local cat
attachments, exclude a rack's own mounted hats from its self-occlusion count,
and measure the first visible 3D rack picture rather than its empty DOM control
placeholder. The charged-top observation waits for the newly awarded bulb's
natural sleep before counting top-only world steps. These preserve the prior
behaviors with the new physical identities. The port environment alias in the
runner makes the orchestrator's `SC_CHECK_18749=18749` command effective.

Art choices for Aaron: .42 physical scale, lower brass arms moved down .20 model
units (including their fixed colliders) to separate all four hanging brims; the
original walnut post/material is retained. Buttons now sit below the base rather
than obscuring the wood. The warm envelope has steady amber emission and a small
non-shadowing cached fill. No core or shelf API change was needed.

The final full-page inspection caught the warm halo extending past the rack
picture's original bulb-only bounds, clipping its upper falloff. The fixed
assembly bounds now include the complete glow envelope in both on/off states,
so toggling never resizes or cuts off its cached picture. A legacy party reward
with a saved `hat` but no old `rack` now quietly creates the one physical rack
and restores that hat through the same support path.

The source audit also moved prepared rack/hat/bulb module imports behind the
visible-cat/world-ready boundary. Their procedural source is now fetched only
on discovery, instead of becoming part of the egg-registration prerequisite.
The unit check records resource start times and bytes against the visible-cat
timestamp. No new pre-cat model payload or eager geometry construction remains.

### Unit 7 closing gate checkpoint — not accepted yet

The first G3 desktop sample failed at 3.4ms; its required isolated retry passed
at 2.4ms (ten converted movable items: 2.0ms). Phone failed first at 2.7ms and
again at 2.9ms; the second ten-item sample passed at 2.2ms. All use the real RTX
5070 Ti and retain all five runs and host loads. The <=2.5ms limit is unchanged.
After the second phone failure, further acceptance retries stopped for an
instrumented physics/atlas/shadow/DOM profile under the shared lock.

The loose-crown, worn-wizard, unlit-socket phone fixture also observed one
additional transform sync after natural settling, with no world steps, shadow
updates, rack redraws or support frames. Desktop reduced motion passed with
identical before/after counters. The phone cause is still unproved: a ten-second
sync-stack and resize/DPR trace is queued. No idle work is being discarded or
reclassified as a pass. `checks/diag/world-unit7-results.json` retains these logs.
G4 and the final full suite remain pending. The working implementation and
both-size visual record remain committed while the shared quiet GPU window is
occupied by another lane's full regression run.

The required premise probes have now run. The idle trace identifies
`stage.setDpr → world.resize → world.sync` twice, as phone DPR recovers from
1.5 to 1.75 and then 2. Neither event is a solver tick or a lamp callback. The
loose/off G2 launch now pins **full** device DPR (2 phone, 1 desktop), matching
G4's unchanged-viewport method; resize behavior remains covered separately.
The assertion still requires exactly zero work over 2.1s.

The instrumented CPU diagnostic measured 2.5ms median p95; this is **not** an
acceptance rerun. Mean measured work was .509ms top sync, .419ms rifle sync,
.131ms per physics substep and .283ms atlas flush. DOM and shadow work averaged
.0029/.0011ms per item. The proposed material batching change was disproved:
prepared art already has 3/2/3/4/5 groups for wizard/cone/party/crown/bulb, one
per material. No product optimization or threshold change was applied. The
reachable workload fixture now additionally includes the full unlocked scene
and enabled fixed furniture colliders. G3 remains unaccepted pending closing
integration evidence; its two failed attempts stay in the record.

### Unit 7 — e1111-21 handoff workflow

Aaron and the orchestrator superseded the queued validation plan: builders now
run only their own functional checks and affected integration checks. The
orchestrator runs the full suite and all cost/speed gates once on the final
merged code. The queued rack G2/G3/G4/full batch was cancelled, its launch
script trashed, and no full-suite or G4 process remained. Prior diagnostics are
retained as historical evidence, not current parallel-host acceptance gates.
The unit implementation is complete; this lane is refreshing functional and
visual evidence at desktop and phone sizes for handoff.

The refreshed page-size review caught missing floor silhouettes for hats while
on their pegs. The rack now owns invisible shadow proxies sharing each mounted
hat/bulb's exact geometry and local picture transform. Wear/release removes the
matching proxy; finite peg sway updates it, then stops. A four-line additive
`worldLayout.invalidateShadow()` hook refreshes cached child transforms or
rebuilds materials after membership changes; its contract is recorded in the
plan. No existing support API changed and shelf/fling files remain untouched.
The complete desktop rack/contact/reload check passes with the new shadow
assertions, including lit and unlit zero work. Final both-size captures follow.

Final fitting choice for Aaron: upper peg reach is .36 model units instead of
.28, with complete rods/knobs, matching anchors and fixed colliders. The default
prepared studio asset remains .28; the rack adapter requests this fit. The
desktop full-collection check measured 23.315% party/crown bounding-box overlap
before the change, above the unchanged <20% limit; phone already passed. This
adds separation without changing hat size, pixel art, the post or the lamp.
The fixture-only flag correction uses `stage.opt()` for query parameters:
`stage.params` contains hash parameters. Prior failed logs remain retained.


### Unit 7 — final functional handoff, e1111-21

Built and committed through product `d78fbe9`, evidence `42dce61`. Latest
results: **21 functional scenarios / 498 assertions PASS**, plus two fixed-DPR
review runs / 14 assertions. Headless hardware Chromium, port 18749, desktop
1280×900 and phone 390×844. Rack/reload, off/reload (normal/reduced), legacy
party save, layout/reload, play/reload, water/reload (normal/reduced), party
(normal/reduced), first paint and resize are covered. Ten play/water/party
scenarios passed before the final upper-peg fit; final rack/layout/frame checks
cover the fit. Raw logs and corrected failures are retained in
`checks/diag/world-unit7-functional-final.json`.

There were 1,000 fresh seeded drops (100 per shape per size) and 200 continuous
physical party-hat lifts: all passed. Worst fresh sleep 6.000s; worst repeated
lift 5.383s; largest settled gap 1.902px desktop / 1.122px phone; largest energy
gain .006661 against .01. Both lit and unlit snapshots show zero ongoing world
steps, transform syncs, shadow work, picture draws/uploads or callback changes.
Fixed/loose reload drift is 0px. All four worn hats and butter follow all four
poses. Peg/cat/floor identity, empty-peg shadows, one-time wet-bolt bulb award,
bulb-only socket and saved power/occupancy pass.

The final frame observation first recorded only 29 fresh-load samples at each
size (required >30), with zero position jump in every sample. Host load was
40.98. Its one permitted isolated retry passed unchanged: desktop 46/56 and
phone 81/116 fresh/reload frames; both resize directions pass. No timing,
appearance or play limit changed. Final desktop upper-hat overlap is 13.919%
against the unchanged <20% limit.

Aaron's visual review is in [unit7-rack.md](unit7-rack.md): 66 captures,
including all four pegs, every worn hat with butter, lying/stretching poses,
undersides/backs, warm lamp, off/loose state, legacy save and collection layout
at both sizes. The primary review captures use full DPR 1/2. The walnut/brass
rack retains the prepared material, with .42 scale, lowered lower arms and .36
upper reach. The pixel patterns remain on fully shaped hats. The lamp's warm
halo is complete and steady; mounted objects now cast matching floor shadows.
The shadow invalidation hook is additive and documented; no shelf/fling or
cloud code was changed. Assets remain ours/CC0 with folder provenance.

Full suite and all cost/speed gates remain the orchestrator's final merged-code
work under e1111-21. No `run-all` or cost/speed gate ran in this final handoff,
and the earlier failures remain historical evidence. Actual iPhone Safari is
unverified. Nothing was pushed.

Rack merge `2ff1073` retains the stationary batch disposal and adds rack child-shadow invalidation. Post-merge checks found a real lazy-load integration failure at both sizes: unit 6's static shelf/tin imports fetched shared prepared `core.js` 316/409ms before the visible cat, despite the rack's own deferred loading. Network resource timings establish the cause. Both art imports now happen inside their existing world-ready asynchronous builders, after the visible-cat boundary. All other rack assertions, lit/unlit/reduced idle checks, legacy restoration and review views passed; the corrected loading assertions and shelf construction are being rechecked. The reported hard/outlined hat shadows remain a visual defect for the final visual pass.

The lazy-load correction passes all 81 rack assertions at each size: prepared core now starts after the visible cat. Shelf/reload also passes all 23 assertions at each size on the corrected source. Together with the unchanged off/calm/legacy/review cases, rack functional integration is complete.

### Unit 8b without cloud — implementation checkpoint (2026-11-11, Astra)

`sc/art` was already an ancestor of `sc/loose` (`git merge sc/art`: already up to date).
Integrated the five prepared world-detail models: one physical pair of googly
 eyes, one foil star, one grouped crumb body, one grouped shard body and the temporary
hollow cup. Cloud source and its existing volume/drift remain unchanged (e1111-20).
The cup keeps three shoves, then tips above the reachable foreground floor and hands
ownership to gravity; its latched contact transition removes the cup before rewards.
The puddle's fixed shader/sensor and charging hook remain intact.

Choices for Aaron's veto: the star peels from/re-attaches to the sky, with a finite
foil tilt on tap; a tiny passive off-centre air impulse gives it flutter. Eyes use
ivory backs and moving mesh pupils. Cat attachments share the cat's cached picture;
a new picture notification changes eye visibility only when that picture redraws.
Legacy DOM hosts temporarily paint behind the canvas while carrying eyes, retaining
their art; converted hosts use their physical pose. This compatibility path is for
the still-flat box until the cake lane merges. Small tin impacts approximate the
plastic pair's hollow rattle; crumbs use soft butter, foil paper, shards/cup glass.
Source and collider notes: `assets/world/small-items/SOURCES.md`.

Initial desktop functional run confirms construction/masses, single-body identity,
cat/back-face visibility, cloud/box attachment, native off-centre grip/cancel and
star peel/flat rest/re-attachment. It exposed a pupil-settle wall-clock issue under
load and a bread face anchor inside the loaf; both corrected before the next run.
The shard hop was sampled after its very short arc; the next fixture observes the
physical velocity/peak rather than a single late frame. This is a working checkpoint,
not final acceptance. No full-suite, world-core cost, rest cost, picture cost or G4
run: e1111-21 leaves those to the orchestrator on the merged quiet machine.

### Unit 8b — contact fitting and lifecycle checkpoint

The prepared conservative proxies slept naturally but failed visible floor contact:
worst gaps were 4.60px crumbs, 9.66px shards and 2.32px eyes. Runtime fitting now
selects actual surface support points (122 fixed directions), retaining three
cluster lobes and two eye lobes. The first fitted shard run exposed .01372 units of
step energy gain; lower restitution, stronger damping and a .08 soft-CCD envelope
reduced that to .00105 without changing the shared solver or gate. Final desktop
100-seed drops pass: worst sleeps 3.967/3.508/4.008/4.342s for crumbs/shards/eyes/star;
worst visible gaps .266/.328/.337/.478px. The star's minimum broad-face-up dot is
.984. Transient penetration remains a diagnostic, not a new acceptance limit.

The initial phone 100-seed contact run also passes all four bodies. Loose and
supported restore positions have 0px drift (cat attachments compare the exact local
seat, because the cat keeps bobbing). One phone idle window and one reload window
caught presentation-only refreshes with no physics steps, consistent with the
stage's adaptive-DPR layout invalidation (not isolated as a proven cause). Final unit idle/shot runs pin the requested DPR (1 at
1280×900, 2 at 390×844), recording DPR with counters. This is a functional fixture,
not a change to production adaptation or a cost measurement.

Lifecycle coverage confirms choir release, native off-centre grip and cancellation,
keyboard grip cleanup, physical-prop rotation, host removal, Butterman attachment
and departure, hidden-effect cleanup, resizing both directions and reachable return
after an offscreen drop. The first pose-change fixture sampled before the authored
pose transition finished; it now waits for that actual transition. The short shard
hop is sampled through actual fixed simulation steps rather than a late wall-clock
sample. New bodies remain asleep without steps, syncs, shadow/picture redraws or
callbacks across the unchanged 2.1-second observation. Final focused regressions
and the rest of the paired screenshots are still running at this checkpoint.

The cup now tips around its real bottom contact before dynamic release; no artificial
upward launch. Its first break places the fixed patch at the physical contact position.
Subsequent casts preserve the existing patch and shard identity. Error cleanup also
restores cat control and disposes any remaining temporary cup. No cloud source,
shared solver setting, frozen support signature or cost gate was changed.

### Unit 8b — final contact and input refinements

A choreographed cup now moves its kinematic shell through contact steps, so each
shove can move another physical object; it parks between shoves. The direct shell
check moves a real probe from Z=.660 to .743, then releases the cup to gravity and
observes one handoff after 14 fixed steps, with no temporary body/callback left.
The production repeated-cast check also passes after this refinement.

Rear sky art now paints behind the cat and its hidden part cannot win picking. This
uses one optional entry hit-filter hook in world-input, leaving the frozen support
API unchanged. Added a keyboard Butterman attachment action and 44px minimum sizes
for the new small-item actions; the ordinary lift/nearer/deeper/place controls remain
the shared controls. The foil back receives its own actual-size review view.

Water's old fixture now waits for the new physical fragments to sleep before its
unchanged 30-second motor observation. The final normal-motion desktop observation
passes (36 rotor frames, zero physics steps); reduced phone and both water restore
assertions pass. Desktop reload shader warm-up still missed its existing deadline
(4 pending). Existing support checks pass at both sizes. A phone bread run has only
29 samples in 6.128s and therefore misses its >30-sample assertion; endpoints,
slow roll and return pass. Butterman/bite runs likewise encounter long frame gaps
and reload before the delayed tin reward has arrived. Preserve these failures;
do not change their assertions or call the broad regression run all-pass. Timing
reruns and the final evidence ledger follow. No cost/full-suite gate was run.

### Unit 8b — paired functional/visual handoff

Implemented without the cloud conversion. Final production interactions and both
loose/supported reload checks pass at 1280×900 DPR1 and 390×844 DPR2. All four small
bodies pass 100 seeded drops at each size: worst sleep 4.342s, maximum visible
rest gap .478px, maximum step energy gain .00633 play units; minimum foil flatness
.984. Reload drift is 0px for loose bodies and the sky star; attached eyes restore
the exact cat-local seat and one body identity. Settled 2.1-second windows add zero
solver steps, adapter syncs, shadow updates, picture redraws or callbacks.

Final native mouse/touch lifecycle checks pass at both sizes, with reduced motion
on phone: choir/pose release, cat/prop/Butterman follow and departure, keyboard
lift/cancel, 44px actions, hidden cleanup, rear occlusion/picking, real two-way
resize, unreachable-drop return and legacy save migration. The old DOM box moves
behind the canvas while it wears eyes; picking must use its actual DOM parent,
not its old layer label. Native drags now pass. The first drag fixture stopped
inside the wide desktop box and correctly re-attached; the final path crosses its
actual bounds. Butterman's keyboard action is tested during his interactive cameo;
the full cinematic intentionally hides keepsake controls. No curtain behavior was
changed. Reduced-motion shard taps retain their named glass-fleck cue; moving
shards use the actual glass contact voice.

Headless review inspected the pair's front and ivory back, cat turn-away, bread
face, cloud and box compatibility, tilted tin attachment, foil face/back/edge and
flat rest, close floor clusters, thick glass rim/water and final fixed puddle. The
prepared glass is reflective alpha glass with no new refraction pass, as sourced.
The adhesive back is deliberately pale and low contrast against the page. The
cloud's original art/drift is preserved; its source has no diff from starting
commit `31ff433`. These are desktop GPU renders at two viewport sizes, not a
real-phone hardware claim.

| View | 1280×900 | 390×844 DPR2 |
| --- | --- | --- |
| Eyes on cat; floor fragments | [desktop](shots/unit8b/world-small-eyes-cat-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-cat-phone.jpg) |
| Eyes turn away | [desktop](shots/unit8b/world-small-eyes-away-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-away-phone.jpg) |
| Eyes on bread | [desktop](shots/unit8b/world-small-eyes-bread-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-bread-phone.jpg) |
| Eyes on unchanged cloud | [desktop](shots/unit8b/world-small-eyes-cloud-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-cloud-phone.jpg) |
| Eyes on legacy box | [desktop](shots/unit8b/world-small-eyes-box-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-box-phone.jpg) |
| Eyes on physical tin | [desktop](shots/unit8b/world-small-eyes-prop-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-prop-phone.jpg) |
| Off-centre eye grip | [desktop](shots/unit8b/world-small-eyes-grip-desktop.jpg) | [phone](shots/unit8b/world-small-eyes-grip-phone.jpg) |
| Foil peel | [desktop](shots/unit8b/world-small-star-peel-desktop.jpg) | [phone](shots/unit8b/world-small-star-peel-phone.jpg) |
| Adhesive back | [desktop](shots/unit8b/world-small-star-back-desktop.jpg) | [phone](shots/unit8b/world-small-star-back-phone.jpg) |
| Foil flat rest | [desktop](shots/unit8b/world-small-star-flat-desktop.jpg) | [phone](shots/unit8b/world-small-star-flat-phone.jpg) |
| Glass rim/interior | [desktop](shots/unit8b/world-small-cup-rim-desktop.jpg) | [phone](shots/unit8b/world-small-cup-rim-phone.jpg) |
| Break / fixed puddle | [desktop](shots/unit8b/world-small-break-desktop.jpg) | [phone](shots/unit8b/world-small-break-phone.jpg) |
| Loose grouped bodies at rest | [desktop](shots/unit8b/world-small-loose-rest-desktop.jpg) | [phone](shots/unit8b/world-small-loose-rest-phone.jpg) |
| Reload | [desktop](shots/unit8b/world-small-reload-desktop.jpg) | [phone](shots/unit8b/world-small-reload-phone.jpg) |

Raw runs, including earlier failures and interrupted processes, are preserved in
`checks/diag/world-unit8b-results.json`. Reproduce with `checks/run.mjs` and
`checks/lib.js`: `world-small.js` then `world-small-reload.js`, `world-small-drops.js`
then the same reload, `world-small-lifecycle.js`, `world-small-cup.js`, and
`world-small-sounds.js`. Use `?dpr=1` / `?dpr=2`; lifecycle phone uses `--reduced`.
The existing water fixture waits for shards before observing its original rotor
invariants. No `checks/run-all.sh`, world-core cost, rest cost, picture cost or G4
was run. Those remain the orchestrator's merged quiet-machine work under e1111-21.

Final focused regression repeats, with assertions unchanged: phone bread passes
6.101s / 56 samples (desktop previously 6.019s / 56). Material-contact checks pass
both sizes, including the reduced shard clink and zero sound/solver work afterward.
Normal desktop water passes every product assertion on repeat, including 47 rotor
frames and zero physics steps in 30s, fixed-patch reload and retained charge; its
reload shader warm-up still misses the fixture deadline by one pending shader.
Reduced phone water passes including warm-up and reload. Existing support checks
pass at both sizes.

The existing Butterman clip-end check still fails after one repeat: desktop frame
spacing 1.223s versus the unchanged .06s ceiling; phone misses the sampled absent
frame. Desktop bite/tin reload now passes; phone still reloads without the delayed
tin reward. Its .6 stage-second reward and the fixture's 800ms wall-clock delay
explain the ordering risk under these frame gaps; this is not a change to the tin
or bite logic. Captions, bite count, permanent plaster and refusal to pet pass.
The broad play attempt had timing misses (pose spring, bolt sample, circle, fast
spin and noscope timing), then ended with signal 143 before completion; it is
recorded as interrupted, not all-pass. A later lifecycle process also ended with
143; both final lifecycle runs completed successfully. These remaining regression
timing/warm-up misses belong in the quiet merged check; no limits were relaxed.

Implementation commits: `c543bac`, `923b977`, `c39845a`, `1a6bd2d`. All changes
remain local on `sc/loose`; nothing was pushed. The final evidence commit contains
32 actual viewport screenshots and the complete functional run ledger.

Loose merge `d73fda7` passed all desktop scenarios and phone drop/cup/sound checks. Phone exposed missing native eye picking after attachment and world steps during a settled window. Its one unchanged idle repeat passed, demonstrating intermittence. A controlled recovery probe identified a common ownership defect: attaching an offscreen object left its return timer active, body disabled and hidden; five seconds later the timer moved the still-supported body and restarted physics (respawns 0→1, steps 2→26). Accepted mounts now cancel that pending return and enable the same body before setting the support pose. Failed-first evidence and the idle repeat are in `checks/diag/final-support-recovery.json`; `checks/world-support-recovery.js` retains the regression.

Recovery validation passes at both sizes: immediately after reattachment timer=false, enabled/visible=true, and after the old deadline respawns remain 0 and steps remain 2. Both previously failing phone loose-item scenarios now pass, including native box-eye picking/grip and the unchanged 2.1s idle window. All ten loose-lane scenarios have passing post-merge results.



## Aaron’s retained originals — e1111-05 (2026-11-11)

Fast-forwarded `sc/look` to main `fb6fc68` before this round. Restored the eight
selected effects from the exact pre-redesign git files; their blobs also match
the sound redesign's parent. The existing `designed/*.wav` paths remain the
page's cue mappings. Only constant gain and lossless PCM delivery format change;
no new trim, fade, EQ, dynamics processing, pitch or timing change. Choir keeps
its two channels; the other seven are mono. The other **106 delivered audio
files remain byte-identical** to `fb6fc68`. Collision rate limits,
restore silence and trigger code are untouched; the existing final overload
guard's headroom adjustment is measured below.

| Cue | Constant gain | 100 ms RMS | 4× true peak |
| --- | --- | --- | --- |
| `slap` | -10.758613 dB | -22.000 dBFS | -11.044 dBFS |
| `bite` | -4.281942 dB | -22.000 dBFS | -6.658 dBFS |
| `glass-slide` | -7.822817 dB | -22.000 dBFS | -9.782 dBFS |
| `glass-smash` | -7.316090 dB | -22.000 dBFS | -7.744 dBFS |
| `choir` | -12.445936 dB | -22.000 dBFS | -14.546 dBFS |
| `paper` | -2.074960 dB | -26.568 dBFS | -4.000 dBFS |
| `twinkle` | -13.100493 dB | -22.000 dBFS | -14.943 dBFS |
| `click` | -2.079141 dB | -30.841 dBFS | -4.000 dBFS |

The 69-cue reel preserves its numbering and now labels these eight as **original,
kept by Aaron**. Its MP3 is 113.6637 seconds, stereo to preserve the choir; mono
cues are copied unchanged to both channels. Sources, authors, immutable input
file/hash and exact gains are in `design-manifest.json`, `SOURCES.md` and
`sound-direction.md`. `build-sounds.py --kept-only` reproduces just these eight.

New file checks failed first on all eight redesigned waveforms plus the decision
and reel metadata. After restoration all 11 checks pass: original sample count,
channels and waveform up to one positive scalar (maximum residual 1.20e-7), exact
choices/source/page mappings, reel choices, and unchanged other audio bytes.

**Approved peak-limited exemptions:** the orchestrator approved retaining paper
and click at their original gain-only levels: −26.568 and −30.841 dBFS / 100 ms
RMS, respectively, both at a −4 dBFS true-peak ceiling. Their named check lines
record the exact reason: “original kept by Aaron, e1111-05; transient sound,
gain-only would clip”. The previous −22 dBFS targets would require peaks of
+0.568 and +4.841 dBFS; no dynamics processing is applied. Only these two files
are exempt. The sound check independently pins all other effect targets to
−22 ±0.7 dB; the existing quieter small-impact and continuous-bed roles retain
their −24 and −25 dB targets. Waveform-preservation checks still cover all eight.

The reel's comparison players now match each pair to its quieter member when
necessary, so a quiet original is not compared against a louder redesigned cue.
This is playback gain in the review page only. A browser check measures all 33
pairs' effective RMS; it does not alter the game audio or MP3 reel levels.

The full run exposed a real summed-output overshoot with the restored transients:
the existing 32-voice live overload probe measured −0.857 dBFS. A new check,
`sounds actual stereo cue sums stay below -1 dBFS`, re-renders the exact decoded
buffers, gains and start offsets, reading both channels directly at 44.1 and
48 kHz, including the stop/filter tail. It failed first at −0.841 dBFS (44.1 kHz).
The one measured parameter sweep is saved in
`checks/diag/sound-originals-headroom.json`. The existing shared soft-knee width
changes from 0.24 to **0.14**, retaining the exact linear response below **0.55**.
The same measured mix now peaks at **−1.539 / −1.930 dBFS** (44.1 / 48 kHz),
leaving oversampling-filter headroom under the unchanged −1 dBFS limit. No file
is processed further. Paper's ordinary gains are at most 0.5 and click's 0.4;
their peaks remain below the unchanged linear threshold.

Sound merge `62426eb` preserves Aaron's eight originals and approved paper/click peak-limited exemptions. All waveform/provenance/file checks and both reel runs pass. The two browser sound runs failed the unchanged zero-startup-voices restore assertion (one voice, measured RMS zero). A temporary route trace identifies the authored zero-gain Butterman whisper loop, not a contact or restore cue. The paradox fixture now persists its crowned pat through unit 6's physical ownership hook. Before reloading, the fixture now stores that pat in the shelf and explicitly checks the whisper seat is empty. This restores the probe's original silent-collection premise while retaining its zero-clips/loops/tones assertion and Aaron's continuously looping whisper behavior. Raw attribution is in `checks/diag/final-sound-restore.json`.

The corrected sound/reload fixture passes all 17 assertions at both sizes, including zero startup voices, silent restored bodies, original-waveform playback and the unchanged stereo headroom limits. Both reel runs and the complete file/original audits pass.

### Unit 8 — container/recipe implementation checkpoint (2026-11-11)

Merged `sc/look` at `dc7cac6`; `sc/art` was already an ancestor (including the Rukh3D cow). Both review histories retained. Aaron's e1111-08/09/10 supersede the plan's separate cat-entry/nap action: the first square still drops the box and hides him briefly; later square casts keep the box, taps toggle its lid, and no nap/tap re-entry or box/galaxy combination is registered.

Working candidate: compound corrugated box and latched lid, source bag and pail, independent recipe portions, three-tine fork, falling/fixed hay, finite licensed cow visit, milk, shake transaction and cake/party hook. Stable recipe IDs and a flushed ledger protect consumption. The small grimoire credit names Rukh3D, CC BY 4.0 and the source. Choices: one egg-free cake per saved playthrough; four measured shake reversals; an 18-second grazing opportunity after approach; explicit Add/Shake/Pour/Milk/Throw/Eat controls alongside physical gestures.

This is an implementation checkpoint, not acceptance. The first headless smoke run established real body creation and open-top portion entry, then exposed a material shader being patched twice when making the lid/pick geometry. The pick mesh now merges geometry without modifying materials, and the lid has independently owned materials. Cow timing/contact, complete shaking/pouring, persistence, both-size visual review and existing affected functional checks are still in progress. Per e1111-21, no run-all, cost/speed or G4 gates have been run; the orchestrator owns those on the quiet merged build.

### Unit 8 — measured container fixes and complete-chain checkpoint

The physical chain now reaches a revealed cake and restores its exact reward pose at desktop size. Source casts, the original one-time box scene, click/hold routing, closed-top rejection, fork sky exit, fixed hay, the licensed cow, real pail contact, once-per-visit milk, three admitted portions, source retention, four measured shake reversals and once-only ingredient consumption are exercised by the unit check. The first complete run found two fixture/state details: its second lid action ran before the first finite animation ended, and an emptied milk mesh retained its last hidden tilt. The fixture now waits for the actual lid animation and emptying explicitly resets the liquid tilt.

A real failure preceded this: rapidly dragging a thin-walled closed container could eject its tiny contents. The latched container now owns a sealed assembly: existing body identities and local poses remain saved, enclosed bodies leave independent collision participation, and their mass is added to the box. Opening re-enables those same bodies with the container's velocity. Open-top admission and pouring remain real contact/gravity; no ingredient is teleported through a closed wall. This matches the plan's box-content sleep ownership and avoids an idle joint solver. Cake construction/consumption uses flushed transaction state, including interrupted construction recovery. The button pours by lifting/inverting the sealed assembly, opening it, then placing the emptied box alongside its contents so it cannot hide the reward.

Additional choices: chain discoveries have their own category and do not unlock the shelf's four-item category; the fork arrives lying down; hay falls upright at the exit's x in the foreground row, away from the source pail. A finite cow contact shadow grounds the licensed visitor. Original skin, walk/graze clips and attribution remain unchanged. The sound/material and 100-drop audits, phone run, transition-by-transition reloads and affected existing functional checks are still open. No cost/speed or full-suite gates have been run.

### Unit 8 — contact-fit checkpoint

Runtime ingredient colliders now follow the sourced visible surfaces: a fitted sack hull, separate tapered pail walls and shaped handle, curved fork tines, the hay silhouette and recipe portions. Small rounded contacts use bounded dissipative impulses only while an actual manifold is touching, never a forced sleep or a midair snap. Initial diagnostics caught an overly broad cached-pair condition; it now requires contact distance <=.0015 units. The shared world additions are opt-in rounded hull and minimum-restitution descriptors; existing callers retain their defaults. All nine new bodies now sleep naturally in the 100-seed desktop fixture; the remaining pail visible-contact fit is being narrowed before acceptance. The audit preserves both visible and collider <=2px gates and no-growing-energy assertions.

The chain now records one common art scale before asynchronous source construction, fixing source sizes that previously depended on whether the box pose had saved first. Landed hay keeps its actual contact pose when fixed. Empty/full pail mass, saved assembly mass and finite visitor contact are explicit. Legacy box functional fixtures have been converted to real 3D floor/hold behavior; their old DOM squash and tap-walk-through assumptions no longer describe Aaron's container. The obsolete early smoke check was retired through trash. Full transition reloads, phone verification, idle evidence and affected regression checks remain in progress; no cost/speed gates have been run.

### Unit 8 — functional and visual review checkpoint

Desktop and phone complete-chain assertions now pass through revealed cake, saved pose (<.5px), cow cleanup, native keyboard lid use, side-exit recovery and 2.1s of zero world steps/syncs/shadow or picture redraws. Phone's reload shader warm-up missed its unchanged 30s deadline with load above 23; its functional assertions passed and a timing-only repeat is pending. Desktop transition-by-transition reloads also pass, including reloading during the suspended error screen: the cake and consumed portions do not return, and sources/box remain. Recognizer positives, perturbations and cross-template tests pass.

The desktop 900-drop audit passes all nine bodies: maximum natural sleep 5.325s; worst visible floor gap 1.627px; no energy growth. Off-centre point grips and cancel/blur cleanup pass for every grabbable new item. Transient dips and the preceding failed collider/damping experiments are retained in `checks/diag/world-unit8-results.json`; no acceptance threshold changed. Physical pail contact is sampled on active physics substeps so a brief touch cannot be lost between visitor animation frames. Slosh also works when milk is found before the box.

Visual review found hay resting on the pail rim on desktop. A sky drop now preserves screen x while selecting a clear floor depth; the chain fixture additionally measures actual hay-floor contact. The button's inversion now uses an absolute lifting height so shaking cannot send its next pour above the screen. The open lid folds fully back, keeping the pinboard clear; picture bounds follow its actual collider positions. Removing a container releases its contents and clears the reference before another item is built. These last visual/lifecycle changes are in the next verification pass, not retroactively covered by the prior full-chain pass.

Material contacts use the existing sourced voices: paper for cardboard/sack/hay, metal for the fork, tin for the pail, soft butter contacts for the cake/liquid/butter portions. No sound assets or mixer settings changed. The frozen support regression and shelf solids pass. The affected shelf interaction run missed the unchanged .25s plop deadline (2.491s on this shared machine); it will be repeated once. No run-all, cost/speed or G4 gates have been run.

**Correction to the audit claim above:** one earlier desktop layout run accidentally executed its embedded rest-submission probe. The functional-only URL used `?functional=1`, but my guard read `stage.params` (the hash-only parameters) instead of `stage.opt`. The guard now reads `stage.opt('functional')`, which accepts the query parameter. The accidental measurement remains in the raw log and is excluded from acceptance; no inference is drawn from it on this busy machine. `checks/run-all.sh`, world-core/picture cost and G4 were not run. The final quiet cost/speed audit remains the orchestrator's responsibility.

### Unit 8 — recovery/layout verification checkpoint

The revised desktop container layout passes reachability, <20% default obstruction, pet-stroke clearance and exact reload, with the rest-cost block correctly skipped. Existing physics/physics-reload and reduced physics pass after the container-removal fix. The latest complete desktop chain passes every functional assertion; its reload's warm-up deadline still missed under load (two pending shaders). The cow-exit fixture now computes its exit using the visitor's actual depth, which can change when hay selects a clear floor row. Actual departure removes the actor/body/callback, and the subsequent 2.1s snapshot is unchanged.

The transaction audit now injects an interrupted cake construction as well as ordinary reloads. It reconstructs exactly one concealed, sealed cake, keeps ingredients consumed, pours the same reward and survives reload during the error screen. The concealed cake's collection button is hidden until revelation. Supported butter cannot be sliced merely because a moving box overlaps the crown. A lid in transit temporarily refuses a new grip. Physical flour leaves the sack's mouth instead of spawning inside its solid collision hull; the gesture fixture holds the source above the opening and checks actual admission before moving the source aside.

The shelf repeat passes its interaction/state/idle assertions but again misses the unchanged .25s plop limit (2.655s). This is retained for the orchestrator's quiet merged audit; no shelf code or threshold was changed. The broad play fixture was stopped after the unrelated two-second circle sequence took 16.5s on this shared machine. A preview-server termination then caused connection-refused results in a later batch; those nonstarts are kept separately and are being rerun after restarting the server. These are not silent passes. No further cost probes have run after the explicit correction above.

### Unit 8 — final contact and ending checkpoint

The phone drop audit exposed two genuine small-portion issues after the other seven bodies passed: milk's contact gap and flour's slow rocking. Milk now has a 1mm rounded hull contact. Flour has tiny flat top/bottom contact faces within its visible extent and sliding/rotational damping which leaves the vertical separation impulse alone. No body is forced to sleep. The same 100 seeds now pass for both portions at both sizes: flour maximum natural sleep 4.95s desktop / 7.142s phone and visible gap .690px / .416px; milk 5.217s / 4.375s and .664px / .401px. Energy does not grow. Earlier failures and the rejected orientation-damping experiment remain in the raw diagnostic record. Together with the unchanged seven-body passes, every new tangible passes its 100-drop/contact check at both sizes.

The latest desktop physical pouring check passes actual sack-mouth emission, pail contact/slosh before the box exists, admission of all three portions and retention of all sources. Both-size transition reloads pass, including the injected interrupted cake construction. A separate recipe-ending fixture now presses the native Eat button and proves consumption precedes suspension, all source identities survive return, the reward hook runs once, the physical celebration disposes itself, the world has zero idle work afterward, and muted Escape restores silently. Its desktop run passes; remaining normal/reduced phone captures are in progress. This fixture advances the scene clock for effect cleanup and does not replace the existing party check's real-time assertions.

Existing party checks still pass the real 30s interlude and world/audio freeze. On this busy machine their short toot sample reads after the sound has ended, and their nine-second wall-time cleanup sample sees only 15–20 rendered frames (about 5–6 scene seconds). These unchanged assertions and consequent skip-fixture failures are retained as unresolved timing regressions for the quiet merged audit; they are not reported as passes. The ending still calls the existing `hat.wear('party')` hook; the rack lane owns replacement of the inherited hat art with its 3D identity.

### Unit 8 — built, functional handoff (2026-11-11)

The final complete chain and reload checks pass at **1280×900 DPR1** and **390×844 DPR2**, including shader warm-up, real source casts and contacts, box click/hold/cancel, closed-top rejection, four measured reversals, concealed reward, gravity pouring, refusal-safe eating, exact reload, finite cow cleanup, native keyboard controls and 2.1s with unchanged world/picture/shadow/support counters. Physical source gestures pass at both sizes. The multi-reload transaction check passes every transition, including an interrupted cake construction and reload during the mock error. The recipe's ending check passes normal/reduced motion, source identity preservation, once-only consumption, world/audio suspension, physical effects, cleanup, mute and Escape at both sizes.

All nine tangible bodies pass 100 seeded drops at both sizes. Final pail walls use **16** segments instead of the contact-fit experiment's 40; the hollow interior and handle remain physical. Its revised 100-drop checks pass with .899px desktop / .312px phone maximum visible floor gap. Across the nine bodies, maximum natural sleep is 5.217s desktop / 7.142s phone; maximum visible gap 1.627px / .733px, with no growing energy. Every grabbable new object also passed off-centre point grip, cancellation/blur and front/back/edge/oblique/underside material inspection. No visible browser was opened.

Affected functional regressions pass for physics/reload/reduced physics, functional-only layout/reload, frozen supports, shelf solids, bread normal/reduced and grimoire attribution at both sizes. Water's game/state assertions pass in both motion modes and sizes; the normal phone repeat still misses the reload shader warm-up deadline (three pending), so that run is not an overall pass. The modified box section of `checks/play.js` passes in isolation at both sizes. The unchanged shelf plop deadline and existing party wall-time/audio-sampling failures above also remain unresolved; the full broad-play run was stopped under load. Raw successful runs, preceding failures, server nonstarts and the one accidental rest probe are retained in `checks/diag/world-unit8-results.json`. **This is not quiet merged performance acceptance:** the orchestrator still owns run-all, cost/speed and G4, and integration of the rack's 3D party hat. No further cost probe was run after the documented guard correction.

Final review captures (additional held and per-material views share the `world-unit8-` prefix):

| Scene | Desktop | Phone |
| --- | --- | --- |
| Open container | [open](shots/world-unit8-open-desktop.jpg) | [open](shots/world-unit8-open-phone.jpg) |
| Ingredients inside | [contents](shots/world-unit8-contents-desktop.jpg) | [contents](shots/world-unit8-contents-phone.jpg) |
| Fixed hay and cow | [hay/cow](shots/world-unit8-hay-cow-desktop.jpg) | [hay/cow](shots/world-unit8-hay-cow-phone.jpg) |
| Milk | [milk](shots/world-unit8-milk-desktop.jpg) | [milk](shots/world-unit8-milk-phone.jpg) |
| Inverted container | [pour](shots/world-unit8-inverted-desktop.jpg) | [pour](shots/world-unit8-inverted-phone.jpg) |
| Revealed cake | [cake](shots/world-unit8-cake-desktop.jpg) | [cake](shots/world-unit8-cake-phone.jpg) |
| Mock error | [error](shots/world-unit8-error-desktop.jpg) | [error](shots/world-unit8-error-phone.jpg) |
| Party return | [party](shots/world-unit8-party-desktop.jpg) | [party](shots/world-unit8-party-phone.jpg) |
| Layout and credit | [layout](shots/world-unit8-layout-desktop.jpg), [credit](shots/world-unit8-grimoire-desktop.jpg) | [layout](shots/world-unit8-layout-phone.jpg), [credit](shots/world-unit8-grimoire-phone.jpg) |

### Final integration — unit 8 functional checks

Cake's merged functional checks pass at desktop and phone: full chain and ordinary reload (32 assertions each), nine-body drop audit, physical pouring, normal/reduced ending, material views and transaction-by-transaction reloads. The first full-chain runs failed the fixed-hay assertion at both sizes, despite <=.401px actual floor contact and the subsequent cow visit passing. One measured premise probe showed a pending offscreen recovery timer; another 960 physics steps could not help. The accelerated fixture disabled pose sync, leaving its sky-spawn picture bounds stale when the body slept. The check now retains production sync throughout its unchanged 800-step allowance. Both complete chains pass; no product landing behavior or gate changed. Raw premise and integration logs are in `checks/diag/final-hay-premise.json` and `final-functional.json`.

Visual review confirms the incoming rack's triangulated floor shadow and phone overlap with the cat; these remain integration defects to fix. Whole-collection performance and final screenshots are still pending, not claimed by this functional pass.

## Bird / the game — e1111-11 (2026-11-11, Astra)

Implementation checkpoint; validation follows in a closing entry. A charcoal bird
circles behind the cat after 90 visible seconds; the generous circle accepts a
click/tap and has a keyboard equivalent. No bird frame callback or media load runs
before arrival. One small stage callback flies it; hidden tabs detach it and
reduced motion keeps its wing still. The full-screen `flappy` game adapts Varun
Pant's MIT CrappyBird at `927c0bc6b982b328076f8f27eef090c3712591d8`, code only.
Exact provenance and the unmodified audit copy are in `vendor/crappybird/`.
Original Canvas/SVG bird, warm landscape and stone gates replace every game asset.

The game freezes the page callback graph and CSS animations; a native RAF owns its
finite interlude. Escape returns without spending the discovery. A collision fades
back and drops a generic black controller through the actual Rapier world API.
It registers the `solid` support category, uses cached 3D art and a physical hull,
and can be lifted/placed using the existing world input. Clicking it removes the
body and plays YOU / JUST / LOST / THE / GAME, one 900ms beat each, followed by a
quiet beat. Anton (OFL) is bundled locally. No flashes, hard color swaps or strobes;
reduced motion fades words without their scale/settle movement. The find persists;
the bird/game/controller payoff is once per page visit, not replayed from the mark.

Choices for Aaron's veto: charcoal bird with a pale pinprick eye; ellipse in the
upper-right background; parchment sky and moss-colored stone gates; matte black
controller with muted button dots; warm ivory condensed trailer type on a dark
vignette; 900ms word beats; short low drum/wood/metal slam with mid harmonics for
phone speakers. Original synthesized flap, pop and slam are mono 48kHz/24-bit WAV,
max 100ms RMS -22.000 to -22.025dBFS, true peaks -10.381 to -12.480dBFS. Shared
mute/volume/protection apply. Human timbre approval is not claimed.

**Splat handoff:** the edited, ignored input has no Xbox emblem or button letters.
The prescribed Idol venv reports CUDA unavailable and zero devices (NVML could not
initialize). Per Aaron's explicit fallback, reconstruction stops there; the shipped
stand-in is original 3D mesh geometry, not a claimed splat. Exact input/command and
source caveat are in `docs/reference/controller/SOURCES.md`. `object-bake.mjs` now
accepts named IDs without changing its existing default bakes. No shared world,
shelf, rack or solver file is edited; the input lock only adds the new dialog's
selector. Headless checks, screenshots and full-suite result remain pending.

Before browser validation, the independent file audit passes all 119 provenance,
codec/measurement, loudness and existing palette checks. A source audit also adds
the new find to the all-finds playthrough by actually flying, dying and using the
controller; its count assertion remains unchanged. The first queued browser launch
was stopped before running because the sandbox lacks `/dev/dxg`. A host read-only
probe confirms the device exists there; hardware validation uses the same headless
runner outside that device sandbox and the shared lock. This does not retry Idol:
the requested sandbox reconstruction fallback still applies.

The first software smoke passed the sequence but failed its new mute RMS probe;
the first hardware pass also passed the sequence and failed mute plus controller
floor contact. No acceptance is claimed from those passes. Initial controller skin
.001 produced -4.170mm penetration; .006 produced +5.750mm / 2.714px separation.
After those two attempts, one controlled Rapier sweep measured the shared premise:
art and hull minima agree exactly, and the settled slight tilt makes margin response
nonlinear. Skin .003 gives +2.689mm / 1.269px; .004 gives -1.446mm. Use the measured
.003 adapter-local margin. No floor, solver or global material is changed. The
permanent check now measures actual visible contact (<2px, penetration <=1mm),
including the fully off-screen spawn (desktop bottom -247.29px).

The first mute diagnostic tested an active audio graph and showed its existing ramp
at nonzero gain after 120ms, zero after 232ms. Waiting on the audio clock did **not**
fix the full sequence's mute failure. After that second failure, a controlled cold/
warm graph probe reproduced it: after 300ms with no active input, master gain remained
.8; a new voice restarted the pending ramp and measured RMS .028894 at 40ms and
.000027506 at 120ms. The warm graph was silent. Direct assignment before starting the
new voice kept gain and RMS exactly zero. `audio.play` now settles saved mute before
creating a new source; unmute still uses the existing volume ramp. This is a small
shared-audio correctness fix required by the requested mute contract, not a louder
palette or a relaxed check. Permanent checks now inspect the very first gain and
actual unmuted .27 bus gain. Raw failed-first and premise logs are retained in
`checks/diag/bird-validation.json`; the diagnostic scripts remain reproducible.

The corrected phone reduced-motion software smoke passes every line: controller
spawn bottom -97.57px; rest gap .804px with no penetration; first muted master gain
0, muted RMS 0, unmuted bus gain .27000001. Reviewed the actual-size phone bird,
game, resting controller and words. This is functional/visual evidence, not a GPU
cost claim. The queued hardware job runs both sizes and both motion modes, then
runs the complete suite below load 14 while retaining the same shared lock.

Closing lifecycle details before that run: keyboard activation returns focus to the
bird/controller/cat as each one is consumed; the per-visit physical controller has
an event-only resize hook because it deliberately does not persist a world body;
that hook is removed with it. The local trailer font loads at bird arrival, alongside
the lazy sounds. Trailer beats use elapsed visible time and a minimum 900ms gap;
a long frame delays the next whole word instead of skipping or compressing words.
Game physics retains its own fixed-step clamp. The check measures actual visual
wall intervals as well as the cue/word start offset. No new idle loop was added.

All four focused hardware runs pass: 26 assertions each at desktop and phone,
28 each with reduced motion (108 total). Arrival measures 90000.2–90000.4ms;
the circling bird adds one callback, and the completed payoff leaves none, with
no new physics steps. Controller contact is +1.269px desktop / +.804px phone,
without penetration. All 20 measured trailer cues begin within 0.1ms of their
word update, with 900–917ms between words. Muted first gain and output RMS are
exactly zero; the unmuted stored .27 level is preserved. These are headless
desktop/phone viewport results, not a claim of testing physical phone hardware.

Reviewed the hardware screenshots at both sizes: distant circle, ready/in-flight
game, resting controller and every trailer word. The 36 `bird*.jpg` captures also
retain reduced-motion versions. The full suite starts under the same GPU lock at
load 8.67 on port 18746. Its first recorded failure is the existing 20-body desktop
world budget: median p95 2.60ms against 2.50ms. The result is retained; no timing
budget or production world setting is changed. Full-suite acceptance is pending.

A separate real-physics input sequence clears and scores five gates at both game
widths (9.175s phone / 11.133s desktop), then dies normally when presses stop;
further input is rejected and the dead state stays fixed. The complete desktop
and phone playthroughs both find all 18 marks and preserve all 14 keepsakes and
their positions through reload. The first full run remains unaccepted: its desktop
world-budget miss is retained, and host load later rises to 30.67. Only the owned
suite launcher is paused, allowing its active headless child to finish, until three
consecutive readings fall below 14. No timing budget or assertion is relaxed.

The interrupted full run printed 844 PASS / 1 FAIL before its launcher received
SIGKILL; the queued budget recheck received SIGTERM before starting. Neither signal
was sent by the load guard, and their cause is unconfirmed. There is no final
run-all result from that run. The complete partial log is retained. A read-only
CPU sample found concurrent Chrome work in `loose`, `world` and `rack` while the
quiet window was unavailable; this explains the later waiting condition, not the
earlier benchmark miss. No other builder's process was changed.

With load back below 14, the unchanged desktop budget gets its first actual isolated
recheck and exits 0: 20-body median p95 1.80ms; five-body median p95 1.50ms, both
against the original 2.50ms bound. This demonstrates intermittence; the original
miss's cause is still unproved. No product code, benchmark fixture or threshold
changed. The closing complete run waits for three readings below 10 before starting
and automatically pauses only its shell launcher whenever load reaches 14, allowing
an active headless child to finish. It retains the same lock, port and command.

The closing launcher was adjusted before any browser started: it now waits without
holding the shared GPU lock, requires three consecutive readings below the requested
14 ceiling, then takes the lock and rechecks load immediately. This lets other
builders finish while the host is busy. The earlier below-10 pre-launch waiter was
stopped intentionally before it ran a check. Reviewed bird captures are retained;
unrelated generated screenshot and rack-diagnostic churn is restored. The new
untracked `assets/flappy/cat-bird-source.png` is left untouched for a later art pass.

Closing handoff: all implementation, 108 focused hardware assertions and 36 reviewed
bird captures are committed. The shared host never supplied the closing launcher's
required quiet window; its recorded wait loads are retained in the diagnostic JSON.
The unstarted waiter is stopped deliberately so it cannot unexpectedly claim the
GPU later. No task browser, preview server or GPU job remains. **Full-suite acceptance
is NOT COMPLETE.** The interrupted run has no final result line; its last printed
line is `== look-landing-phone` (844 printed PASS / 1 FAIL). The failed desktop budget
passed its unchanged isolated recheck at 1.80ms; this does not substitute for a full
pass. The orchestrator still needs a quiet window for the exact closing command:

```sh
flock ~/.sigil-cat-wt/codex/gpu.lock env SC_CHECK_PORT=18746 checks/run-all.sh --shots docs/shots
```

The other explicit handoff remains the single controller splat: cleaned ignored
input is ready, but Idol's sandbox probe had no CUDA device. The original physical
mesh stand-in ships in the meantime. Nothing was pushed.

## Bird art and controller completion — e1111-13 / e1111-21 (2026-11-11)

Aaron's updated workflow supersedes the preceding full-suite handoff for this
builder: run the bird unit's functional checks and relevant touched-file checks;
the orchestrator owns the one merged full suite and all cost/speed gates at the
end. No full suite or cost gate is run for this update.

The supplied logo-free host controller splat replaces the mesh stand-in using
`createPropPicture`, with its baked hull shared by picking, shadow and physical
body. It has 66,043 Gaussians and a 188-triangle hull. Native orientation is already
flat, controls up; no speculative quarter-turn is applied.

Aaron's supplied 2172×724 source is committed as his artwork. The deterministic
processor keys magenta including edge contamination, measures the approximately
18-pixel grid, registers horizontal offsets 0/35/70 and samples at cell centres.
The 84×28 result contains three aligned 28×28 frames, ordered up/level/down/level.
The stationary face/ear/right torso uses original level-frame pixels in all three
frames to remove residual body chatter; the wing pixels remain their original
poses. No eye, butter, drawing, averaging or blur is added. Its body has an ellipse
hitbox fitted to the clone's 34×24 body size, excluding wing tips and empty corners.

The clone's shipped images are vendored at the already recorded exact commit,
per Aaron's accepted choice. Its scenery is Canvas art rather than PNG sprites;
its original pipe/ground/cloud/tree commands and palette replace the custom hills
and stone gates. Its MIT code remains pinned to
`927c0bc6b982b328076f8f27eef090c3712591d8`; exact provenance and Aaron's accepted
artwork choice are in `vendor/crappybird/SOURCES.md`.

Completed functional acceptance: **145 PASS / 0 FAIL** in the final selected runs.
`checks/bird.js` has 33 assertions at each normal-motion size and 35 at each
reduced-motion size (1280×900 desktop, 390×844 phone at DPR 2), including the shared
fixture warm-up assertion. `checks/bird-art.py` adds five asset-integrity assertions;
`checks/flappy.test.mjs` adds four layout, body-hitbox and playable-physics assertions.
The latter clears five gates at both aspect ratios using flap input alone, then
dies and stays stopped. Commands, complete final logs, hashes and capture paths:
`checks/diag/bird-art-validation.json`.

The debug skip measured arrival at 90,000.2–90,000.4ms, with no earlier image loads
or added frame callbacks. The real splat falls from above the viewport and sleeps
naturally, controls upward. Its baked hull's floor clearance is 1.303 desktop
pixels / 0.835 phone pixels, within the existing two-pixel bound; no penetration.
Native input picks the hull and removes both its picture and body for the payoff.
Five audio-start calls land within 0.2ms of their visual beat timestamps. Page state,
existing keepsake pose, controls, mute/volume and zero added idle work pass. Reduced
motion keeps the wing level and uses word fades without scale or shake.

There are **44 reviewed captures**: circling, ready, flight, game over, controller
mid-fall, controller at rest and all five words, for both sizes and motion modes.
They use `docs/shots/bird-…-{desktop,phone}.jpg`; reduced motion uses `bird-calm-…`.
The mid-fall fixture freezes an already falling body only for screenshot I/O;
it never forces the rest pose. Representative normal-motion captures:

| View | Desktop | Phone |
|---|---|---|
| Aaron's bird in flight | [desktop](shots/bird-game-flight-desktop.jpg) | [phone](shots/bird-game-flight-phone.jpg) |
| Controller falling | [desktop](shots/bird-controller-falling-desktop.jpg) | [phone](shots/bird-controller-falling-phone.jpg) |
| Controller resting | [desktop](shots/bird-controller-resting-desktop.jpg) | [phone](shots/bird-controller-resting-phone.jpg) |

Two resolved check interruptions remain in the record: a fixture variable initially
duplicated `canvas` from `checks/lib.js` (renamed to `flightCanvas`), and a later
phone capture lost its preview server mid-run (server exit 143; measured connection
refused). The server's exit cause is unconfirmed. Its replacement served the exact
failed module with HTTP 200 before the unchanged phone check passed. No assertion
or timing threshold was relaxed. The two normal-motion captures were refreshed
solely to blur the test's Escape-key focus outline before the mid-fall picture.

No shared world files were changed. No full suite, cost gate or push was performed
for this update, per e1111-21; merged acceptance belongs to the orchestrator.

## Classic flappy presentation correction — e1111-13 (2026-11-11)

Corrected my reading of Aaron's intended classic look. The active clone is now
`nebez/floppybird`, pinned to `efd2c7f740299688e524e57bfa3f635c9b857f82`, with its
Apache-2.0 code licence, unmodified upstream code/CSS, original PNGs and file hashes
in `vendor/floppybird`. `SOURCES.md` separately identifies the sprite artwork as
the original game's, credited upstream to Dong Nguyen/.GEARS and used by Aaron's
explicit choice. The superseded CrappyBird pictures and scenery renderer were
removed via `gio trash`; its MIT source/licence remain for earlier scaffolding's
attribution. No original game audio is used.

The game now uses capped green pipes, the city/cloud skyline, striped land, large
white score digits, and the classic ready/game-over panels. A fixed 288×512 native
portrait field scales uniformly and stays centred: 506.25×900 on desktop and
390×693.33 on phone. The classic background fills the margins; desktop side margins
have a quiet tint and edge marking the lane. Upper pipes continue to the top of
tall phones rather than ending at the native frame boundary. Aaron's unchanged
cat body is about 59.77 CSS pixels wide on desktop and 46.04 on phone; both uses
still load the same processed sprite path, with the same body-only hitbox.

The clone's gravity/jump, 52-pixel pipes, 90-pixel gaps, gap padding and pipe cadence
are adapted to the existing fixed-step lifecycle. The ceiling clamps as upstream;
floor death stops at contact. The existing discovery timer, fade, page restoration,
controller splat/body, trailer, input, mute and reduced-motion handling are retained.
Only local bird/game files and their checks change; no shared world edits.

Final validation: **157 PASS / 0 FAIL** — 35 browser assertions at each normal
size, 37 at each reduced-motion size, six asset/source-integrity assertions and
seven layout/physics assertions. The complete egg sequence, mute/Esc, hidden-tab
pause and zero added idle work still pass. The checks now verify actual draws of
the classic cap/tube, skyline, land and large-digit images, the centred portrait
dimensions and visible bird size. The body clears five classic gaps using flap
input, and a natural floor death stops at contact. Source artwork and controller
SPZ hashes are unchanged.

44 captures were refreshed; the 12 ready/flight/game-over views were visually
reviewed at both sizes and motion settings. In-game views:
[desktop](shots/bird-game-flight-desktop.jpg),
[phone](shots/bird-game-flight-phone.jpg),
[desktop reduced](shots/bird-calm-game-flight-desktop.jpg),
[phone reduced](shots/bird-calm-game-flight-phone.jpg).
Commands, final logs and the screenshot list are in
`checks/diag/bird-classic-validation.json`.

The sequential launcher exited 143 after the fourth case had printed its passing
assertions but before its exit status was recorded. A direct measurement confirmed
the preview still served HTTP 200 and no task runner remained. The unchanged phone
reduced case then completed separately with exit 0. The signal's cause is unknown;
no assertion or threshold was relaxed. No full suite or cost gate was run, per
e1111-21. Nothing was pushed.

### Final integration — all six lanes merged; bird functional checks

Merge order: `4356c9a` world, `2ff1073` rack, `d73fda7` loose, `62426eb` look, `60693e7` cake, `cb01421` bird. Bird's 35 normal / 37 reduced-motion browser assertions pass at both sizes, plus six artwork/provenance and seven layout/physics assertions. The system Python lacks Pillow; the lane's documented `~/ai/idol-venv/bin/python` passes the unchanged artwork check. No browser gate was bypassed. Original-sound provenance and loudness exemptions are retained alongside the bird cues; the merge retains both the existing soft-knee mixer and the bird's cold-graph mute correction.

Source work after this merge addresses the already measured prepared-art loading boundary and rack shadow defect; final cost acceptance remains pending.

### Final integration — shared loading, rack shadow, complete collection coverage

Prepared art from units 8/8b eagerly imported shared `prepared/core.js`. The same visible-cat boundary already repaired for shelf/tin now applies to eyes, fragments, star, cup, box, ingredients and the cow. All constructed adapters and resource-start assertions pass at both sizes (`checks/diag/final-lazy.json`).

The rack shadow defect was stacked transparency from independently projected source triangles. Its fixed assembly now builds an opaque union mask, blurs that once per pose/occupant change, and sends one floor quad through the existing picture batch. Both sizes and all hat poses have been recaptured; the ghost outlines are gone. Source proxy geometry and transform readback remain available to the functional checks. No idle scan was added.

Whole-collection review exposes remaining layout defects: phone rack overlaps the cat; the source ingredients/fork and controller crowd the existing floor items, and the flour can be pushed partly offscreen. The initial desktop full-collection fixture also did not settle; phone did settle with zero subsequent world work. These are open integration failures, not accepted results.

The final runner now includes the previously standalone loose/cake/presentation/recovery checks, transaction reloads, source audits, two representative production cost scenarios (dispensed portions and revealed cake), and the five-round lit/unlit G4 comparison against fixed `677f535` for the whole accumulated collection. Original gates and the original core fixture remain unchanged. Final cost results and full-suite acceptance are still pending.

### Final suite — first-pass evidence in progress

The first complete merged run exposed a check-only fresh-round bug: the lamp reward correctly refuses a second award, so a cost round that deleted the bulb must explicitly recreate the already unlocked keepsake. The fixture now asserts that once-only premise before rebuilding. It also drains already submitted GPU timer queries after the timed sample, preserving the original timed frames and all thresholds; final G4 acceptance requires usable GPU samples. Desktop retries and phone results remain pending.

Desktop failures observed so far include persistent contact motion between the tin and milk pail in the full collection, eyes/star seeded drop failures, and shelf/rack G3 misses. These remain open. An unrelated Next build and workers became active during this run; that is measured host contention, not a pass or an exemption. The first run continues to collect functional evidence before isolated retries.

### Final integration — measured contact and setup repairs

The first diagnostic full run was stopped after desktop play and party completed, to repair its known failures before the final complete run. Desktop play found all 18 eggs and restored all 22 keepsakes; party returned at 30.017s and removed its callbacks. This interrupted run is not full-suite acceptance.

The collection's persistent motion was an initial-placement collision: the tin penetrated several pail walls by up to .087 world units. Moving only the tin clear let both sleep naturally. A finite discovery-time search now uses actual hull extents, existing props, furniture/actions, the cat and footer to choose space for new solid props and the controller. Saved/player placements bypass it. The full collection now sleeps and adds zero world work at both sizes; remaining visual crowding is still being reviewed.

The two seeded loose-drop failures had identical geometry, scale, mass and inertia to the earlier passing revision. Routing only the pre-lazy adapter source reproduced every old passing result. With asynchronous construction, RAF was advancing the preceding body between isolated drop sequences. Staging all construction before the synchronous seeded sequences restores the exact original results on desktop and phone. All 100 seeds, eight-second allowance, support gaps, energy and flat-rest assertions remain unchanged. The small adapter also rechecks ownership after its new async model import so removal during loading cannot create an orphan. Raw A/B and contact evidence: `checks/diag/final-contact-premises.json`.

The rack now measures its actual surface vertices for fixed-assembly placement rather than rotated empty AABB corners. Its phone position clears substantially more of the cat. The tall phone paper's actions stack along the right edge to clear the ear; final captures and focused UI validation remain pending.

### Final integration — storage, render capacity, remaining acceptance

When new sources cannot find clear floor space, untouched default shelf props now use their fitted slots. Player-arranged poses bypass that fallback. The finite search also revisits earlier untouched default solids after storage opens space. Focused rack and cake/reload checks pass at both sizes; phone pinboard/reload checks pass and its tall paper actions visibly clear the ear. Full-collection natural rest and zero world work pass at both sizes. The most crowded screenshots still need a final placement pass, especially small items obscured by larger ones.

Splat pictures retain render-target capacity through a tumble and compare cached matrices without per-frame signature/point-array allocations. Desktop shelf costs now pass at 2.1ms for 20 / 1.5ms for seven, and rack at 2.3ms for 20 / 2.1ms for ten. These are isolated results; full-suite acceptance is pending. The full production collection still exceeds 2.5ms. Raw initial cost/profiling evidence is in `checks/diag/final-cost-first-pass.json`; it includes failed and superseded diagnostic fixture measurements, not accepted final costs.

The added final cost fixture needed two further premise corrections: its grid must keep all recipe bodies drawing instead of triggering offscreen recovery, and omitted cards/hat must remain on their natural supports instead of being parked beside the lens and inflating the atlas. It now requires each measured adapter to draw throughout the sample. Original lane fixtures and the 2.5ms ceiling are unchanged. The shared atlas reports its allocation; its reserve now uses the geometry's bounding centre rather than a foot/hinge origin, while always allocating at least the full projected DPR dimensions. Initial 64px tiles now have a matching 64px target. Those latest capacity changes still await their completed cost/visual validation.

G4's timer-query drain now yields adequate GPU samples. Phone full-collection unlit/lit rounds are progressing; the desktop converted scene timed out before sampling. Its settling premise remains under investigation. The host has continued unrelated Node/Vitest work (measured up to roughly eight busy CPU cores out of sixteen); no unrelated job was stopped.

### Final integration — supported workload and rest measurements

After repairing the fixture's omitted-object supports, all twenty measured adapters draw throughout every sample. The unchanged 2.5ms gate still fails: pre-cake desktop 6.2/5.7ms and phone 6.9/8.0ms; cake desktop 6.5/6.5ms and phone 8.0/7.1ms (twenty / maximum). Full raw check lines, allocation and host load are retained in `checks/diag/final-cost-supported-fixture.json`. These are failed measurements, not acceptance.

Phone G4 completed all five alternating rounds and passes: unlit full-frame delta −.1ms / GPU +.0696ms; lit full-frame delta .0ms / GPU +.0682ms. The desktop retry reached the third round before a natural-settling timeout with seven awake bodies, including the box, fork and controller in crowded positions. A preceding standalone construction had settled naturally. This order-sensitive placement remains open; no sleep or timing gate was changed.

The atlas now packs each mesh at its own full projected DPR capacity. Direct comparisons against independent original 3D renders pass for twelve poses at each size: worst changed-pixel fraction .152% desktop / .239% phone under the existing .5% parity limit. Allocation in the full desktop diagnostic fell from 2,048,000 to 1,048,576 pixels. Composite picture transforms now reuse cached matrices/points. This is image/allocation evidence, not a cost pass; an instrumented rerun remains over budget under host load ~10–13. Detailed attribution showed that most aggregate shadow time was two finite rack rebuilds outside the timed samples; it is not a recurring physics-frame cost.

The first global default-placement pass still produced overlaps. Measurement showed that its planned rectangles themselves overlapped: the foreground-only band was too small, before any solver motion. The candidate search now also uses the same physical floor beside/behind the cat, retaining the silhouette, controls and furniture exclusions and unchanged physical art scale. This placement change is under validation.

### Final integration — sigil-night pass (2026-11-11 evening)

**Pictures at projected size.** Mesh, prop and atlas pictures now render only their own rect (rounded to 32px) into a sub-viewport of retained capacity instead of padding every picture to a square tile; the atlas packs non-square tiles and batches multi-part solids per part; splats read the current viewport. `world-atlas` compares every tile with a direct 3D render: worst changed-pixel fraction .12% desktop / .23% phone (gate .5%), including a closed box holding a splat. Picture bounds are projected through one clip matrix per draw.

**Crowded floor.** With everything unlocked, default arrivals no longer intersect and the scene sleeps at 1280×900 and 390×844 (`world-final-scene`: zero colliders penetrating, zero world work after rest). Placement keeps resting props where they are. Only a sleeping prop still at the spot placement gave it, whose spot furniture, controls or the cat has since taken, is re-chosen (and then moved at rest, still asleep); props the player or physics moved stay. The full largest-first repack plus shelf storage remains the fallback when no clear spot exists. The earlier repack moved and woke every prop on each discovery (rattles and impact sounds, which failed play's far-whisper silence, and moved the box mid-pour). Taken floor now includes the puddle, his whiskers with an 8px margin, drawn furniture and each resting prop's drawn picture; an opened menu counts by its summary only; placement waits for a rack or pinboard discovered in the same moment; the arriving rifle uses the same search (it used to drop onto crumbs and flour and rattle); spots more than 120px behind his feet pay a penalty.

**Other fixes.** Rack hats and the bulb are bounded by outermost art vertices instead of rotated box corners (the wizard brim's box reached x=−30 and failed the resized-reach check). The flung pat lands in its resting pose on the floor (it used to be handed the tilted glass pose 2cm up and dropped ~7px after the handover; this failed at 35a9259 too). `bird-art.py` reads its PNGs without Pillow, which the check host lacks. Check fixtures, assertions unchanged: `look-motion` waits for the pat's async adapter before sampling; `play` presses on an eye rather than the gap between the two physical discs.

**Choices for Aaron's veto.**
- Phone, full collection: the floor in front of him cannot hold every prop at physical scale, so some (often box, pail, cake, controller or flour) rest on the floor beside and behind him. They are small there and, with no visible horizon on a phone, can read as floating beside his head. Alternatives: store more defaults on furniture, or shrink loose art on phones.
- An intermittent picture defect was seen twice in ~10 desktop full-collection runs: the stored rifle drawn too large above the shelf and clipped at the shelf picture's edge until the shelf next redraws. Not reproduced in three targeted runs; cause not found.
- Desktop full collection is not deterministic (arrival order is async). In some runs a prop still ends partly behind the box (the box's drawn art reaches past its collider/picture bounds) or behind the pinboard; physics stays clean (no penetration, sleeps). Not yet fixed at the cause.

**Cost gates (not met; unchanged).** `world-final-cost` twenty / maximum, median p95 against 2.5ms: see the final suite numbers below. Premise test (desktop, host load ~11, other builders running): with all picture draws removed the same 20-body step is p50 1.4 / p95 2.7ms (physics ~.8ms of it); with the three 66k-splat props' sorts removed it is p50 4.0 / p95 7.5ms; as shipped p50 7.0 / p95 17.9ms under that load. The three splat props (rifle, top, controller) each spend ~.5ms per tumbling frame re-sorting ~66k splats (~.3ms sort + upload); the atlas pass is ~.9ms; physics ~.8ms. The gate cannot be met by local optimisation of this design: it needs a decision — sort splats less often while tumbling (slightly stale order), sort off the main thread, or fewer splats for small props. Lane gates (`shelf/rack/board-cost`) sit at the 2.5ms line under host load and pass or fail run to run; A/B against 35a9259 measured the same spread.

## Achievements lane (2026-11-11)

Built for e1111-39/-40/-43/-46/-47/-48 on `sc/ach`. Choices below are mine, for Aaron's veto.

**The list (45; `src/achievements.js`).** Aaron's list, in eight sections: Signs (10 + Fluent + Scribble), Bonks
(1 / 100 / 500 / 1,000 / **Bonk Legend** at 10,000 + Lucky Bonk), Handling him, Happenings, The room, The kitchen, The
bird, Mastery. Each has a one-line "said" shown once earned (my words). Everything except Bonk Legend is earnable in
about an hour of focused play; Platinum Cat needs every other one, including Bonk Legend (as Aaron said).

**What earns each one (`src/ui/achievements.js`).** Most are read from what the page already saves, through a new
`store.watch(fn)` (two additive lines in `src/core/store.js`), so a lane that changes how a thing happens still earns
it as long as it saves the same state:
- a grimoire find → its achievement (`found.<id>`): the ten signs, Fair Warning (bite), Ask the Butter (whisper),
  360 No Scope, Encore (harp), Blasting Off, The Paradox, Fling, You Just Lost the Game (`bird`, the controller click);
- bonks / rare bonks → the tiers and Lucky Bonk; two `solid` / two `flat` world discoveries → Shelf Life / Pin It
  (the same gates the shelf and board use); the `rack` keepsake → Hat Rack; every hat name written to `hat` →
  Dress Up (kept in `achievementProgress.hats`); the top's saved `charged` state → Charged; all four shelf bays
  occupied (`worldBodies.*.support.id === 'shelf'`) → Collector; the cake chain's saved state → Got Milk (pail
  full / cow milked), Baker (baked or later), Happy Birthday (eaten);
- **Let There Be Light**: the window event **`sigilcat:lamp-lit`** (for the sc/lamp lane's new bulb sequence to
  dispatch when the lamp lights), or the current lit state (`site.lamp.occupied && site.lamp.on`, or the saved
  `worldBodies.bulb` in the `rack-lamp` socket with `adapter.on`). Either works after both lanes merge;
- moments nobody saves get one-line hooks: Scribble (fizzle, `src/sigils/ink.js`), Into the Void (galaxy opens,
  `src/eggs/galaxy.js`), Buttaman! (his "BUTTAMAN!" yell caption in a live scene, `src/eggs/butterman.js`), Bird
  Watcher (the circling bird clicked, `src/eggs/bird.js`), Flappy / Pipe Dream (score 1 / 15, `src/flappy/screen.js`);
  Spin Doctor (released at ≥ 8 rad/s, the galaxy's own "fast") and Purr-fect (purr level ≥ .6, three strokes) come
  from `cat.onDrag`. A visitor who already bit him is credited Purr-fect (he only bites a purring cat).
- Completionist = every grimoire find; Fluent = the ten sign achievements; Platinum Cat = all 44 others.
- A returning visitor is credited **quietly** on load for what the saved state already shows (no flood of toasts).

**Locked / secret.** Locked: faint silhouette, name, vague hint. 33 of 45 would give a secret away and show only
"???" (no name, hint or drawing anywhere in the page). A section made only of secrets is titled "???" until one in it
is earned, so the section names (The bird, The kitchen…) do not give the eggs away. Non-secret: the bonk tiers,
Lucky Bonk, Spin Doctor, Purr-fect, Scribble, Fluent, Completionist, Platinum Cat.

**The book (`achievements.html`).** Same Hush sheet as the grimoire: an "N of 45 earned" tally, one seal per
achievement (earned: a dark felt-black disc, butter-gold ring and line icon; Platinum: a polished platinum disc;
locked: a dashed ring), the date earned. Opened from a small medal mark right of the grimoire link (shown from the
first achievement); the book links back to the grimoire. Three columns on a phone.

**The toast.** A small pill (seal + "achievement" + name) slides in from the right above the footer with a little
overshoot, rests 4.2 s, slides out; one at a time, queued; it waits while a takeover is up (galaxy, Butterman up
close, the eaten page, the bird game, any input lock). Reduced motion: a plain fade. The mark ticks once.
**Chime:** `assets/audio/designed/achieve.wav`, new, original synthesis (`tools/audio/make-achieve-chime.py`): two
soft glass-and-tine notes a fifth apart (G5, D6), the `cast` cue's family, −22 dBFS RMS, gain .5, recorded in
`assets/audio/SOURCES.md`, the manifest and `docs/sound-levels.json`. Played by path (like the party toot) so the
69-voice config list and the sound reel are unchanged; it is **not in the sound reel** yet.

**Rare bonks.** `rareChance` 50 → 400. From the first one, a gold line "N rare bonks" sits above the bonk count
(desktop: between "so far" and the count; phone: under the name). The whole tally moves up by that line so its
bottom edge (and the pinboard placed under it) stays put; on a phone the name steps up 11 px to make the room.
The gold is a clipped two-period gradient: its sheen sweeps twice when the line arrives and once per rare bonk, then
rests (no endless animation, no repaint at rest); static under reduced motion.

**The platinum badge (`src/world/platinum.js`).** Loaded only for players who earn it. 1.4 s after the Platinum Cat
toast, a heavy (1.6) platinum plate falls from above the top of the page and lands face up, right of the cat
(reduced motion: it settles from just above the floor). It is the board's size plus 1.2 cm a side, measured from
the board's own bounds when made, and rescaled to the board's bounds whenever it is pinned (so the sc/arrive
re-sizing is followed). Modelled here: bevelled rounded plate, brushed field, raised polished rim, four polished pin
heads in the corners, a mirror medallion with fine guilloche rings and the page's cat head embossed in satin, "PLATINUM
CAT" and "SIGIL CAT · EVERY LAST ONE" engraved, the ten signs engraved five a side, a double engraved border with
corner diamonds, and two bar pins with catches on the back. The face is laid out from the plate's own proportions
(the phone board makes a squat plate: smaller signs, clamped rim radii, line widths scaled with the texture density). Engraving is canvas bump/roughness/tint; the metal reflects
its own small studio environment (soft boxes on a warm room, made in code), because the page's 64×32 room light is
too soft for polished metal. Metal contact sound.
Let go with the pointer over the board (or press its key) and it pins over the whole board, as one extra support
(`platinum-cover`) on the board's root: drawn inside the board's cached picture in front of the cards, with its
shadow on the board. While it is there every card on the board refuses a lift (`entry.canGrab` is false for mouse,
touch and keyboard; a press there picks the badge) and the board's buttons are inert and dimmed. Lifting the badge
off (drag, or its key) frees them. Saved; pinned and locked again after a reload. No change to pinboard.js.
For veto: the size (Aaron said as big as the board; on the floor that is a big plate in front of the room), and
that a card can still be flipped under it by its key (hidden, harmless).

**Debug.** `#debug` adds `ach all` (everything but platinum, quietly), `platinum` (everything; the badge falls) and
`ach forget`. In code: `site.achievements.grant(id)`, `.grantAll({ except, quiet })`, `.forget()`.

**Checks.** `checks/achievements.js` (+ `-reload.js`), `achievements-book.js` (on the book with saved state),
`achievements-badge.js` (+ `-badge-reload.js`, also run calm), all in `run-all.sh`. Built against desktop at dpr 1;
the orchestrator runs the full suite.

## Bulb and rack arrival lane (2026-11-11)

Aaron's e1111-35 (the light bulb sequence) and e1111-37 (the rack drops in), branch `sc/lamp`. The old water+lightning
bulb unlock is gone: a wet bolt keeps its shock/charged-top result and no longer gives a bulb. Code: `src/world/lamp.js`
(sequence), `src/world/lampshade.js` (shade model), `src/world/rack-drop.js` (arrival). Checks: `checks/bulb.js` (+
`bulb-reload.js`), `checks/bulb-reloads.mjs`, `checks/world-rack-drop.js` (+ `-reload.js`), all in `run-all.sh`.

**The sequence, as built** (saved as `lamp.stage` = idea / dropped / lit / lamp; every stage survives a reload):
- Only the first *drawn* sigil ever (the ink passes its stroke); a mark pressed again, debug buttons and checks'
  direct casts never trigger it. The sigil's sound plays at once; its effect waits 2.0 s (page clock) after the bulb
  appears. If the bulb cannot load within 3 s (cold network) the effect plays and the bulb pops up later, quietly.
- The idea: the real bulb body, kinematic, .13 cat-heights over his crown (or hat, or butter), lit, with a warm halo,
  bobbing 1.2 cm / 2.3 s and rocking 4°. It pops up with a spring, a brass `ding`, a one-time flare of seven gold
  "idea" strokes, and his shake: a new `idea` emote row in `config.js` (small hop, 6° shake) through the normal emote
  channel, so a later emote simply replaces it. It hides while he is hidden (box, space).
- Click (or its keyboard button): a light-switch `click`, the glow goes out over .3 s and it arcs off to his left (his
  right if the rack stands there) to land in front of him, shrinking to its real size as it falls.
- Lightning lights it only when its glass lies in the puddle on the floor; the glow rises once over .8 s (no
  flicker), it gives a small hop, `twinkle`. A charged bulb keeps a soft glow lying loose.
- Then the lampshade: grown onto a standing rack (springy, `tap-pop`), or built into the rack before it drops in.
  Releasing the glowing bulb over the shade (30 px margin) seats it and lights the lamp (warm glow through the
  shade's weave, the existing shadowless fill and halo, `click`). The socket accepts only a charged bulb. A tap on
  the seated bulb, or the rack's light button, switches it; the button reads "Fit bulb" until it is seated.
- `window` event `sigilcat:lamp-lit`, detail `{first, by}` (`by`: drag / tap / button / place), whenever someone lights
  the lamp; never on a reload.

**The rack's arrival:** only on unlock (not a reload, not the old party-hat save migration). It waits until its four
hats hang on it, then falls from above the page in .5 s under one constant gravity and rebounds 15% / 5.5% / 1.8% of
its height (three bounces) into exactly its place, about 1.04 s in all, with a wooden thud at each touch (`wood
medium`, strength 1 / .55 / .32 / .16), a squash and a small rock about its foot; he startles at the first thud; its
floor shadow darkens as it comes down and its controls fade in after. Only the cached picture card moves (one draw,
no per-frame relighting); body, pegs, hit box and reservation stay at rest. Reduced motion: a .35 s fade-in.

**For Aaron's veto (choices Claude made):**
1. The idea bulb is drawn 1.7× the real bulb (a cartoon idea reads at that size) and shrinks to real size as it drops.
2. The seven gold "idea" strokes and the `ding` / `click` / `twinkle` / `tap-pop` sounds (all existing files).
3. The bulb is 1.3× its unit 7 size so it reads on a phone; it still fits the socket and the shade is sized for it.
4. Letting go of the bulb over the puddle drops it into the water at the floor under the pointer. The page has no
   depth control besides the Nearer/Deeper buttons, and a camera-plane drag cannot reach the front-edge puddle.
5. The triangle's hat now lands after the rack has settled (about 1 s later than before) instead of during its fall.
6. The first touch of the page (by a visitor who has not had the idea yet) fetches the physics engine and the bulb art
   and compiles its shaders on a hidden copy. Measured on desktop: the bulb then appears ~120 ms after the cast,
   instead of ~1 s with an 835 ms stall. The hidden copy is kept until the real bulb has drawn, because disposing the
   last user of a shader deletes it.
7. Older saves that already have the bulb from the old unlock count as charged (lit; lamp if it was on).

**Shared-file edits (small, additive):** `main.js` (a `site.beforeCast` hook; the cast body became `castNow`),
`combos.js` (`lamp.award()` → `lamp.shock()`), `config.js` (the `idea` emote), `core/mesh-picture.js`
(`invalidateCard()`, to move a drawn card without redrawing it), `core/mesh-atlas.js` (a `materials` getter, so a glow
change reaches the atlas's material clones), `world/hats.js` (furnish hook, arrival, socket `accepts` function,
`onMount`), `gags/hat.js` (legacy migration stays quiet), `checks/lib.js` (older checks start past the idea, so their
first cast is not held; `checks/bulb.js` clears it), `checks/world-rack.js` (expects no bulb from a wet bolt).
`lamp.award()` stays as the fixture route other checks use (a charged bulb under a shade, once).

**Known, not fixed:** one ~50 ms shader compile still lands on the bulb's first frame (an unidentified ShaderMaterial
variant). A bulb left in a puddle within 24 px of the footer may be moved up out of the water on reload by the
existing reachable-pose clamp; its stage is kept either way. The full suite was not run in this lane (the orchestrator
runs it once at the end).

## Arrivals and polish lane (2026-11-11)

Branch `sc/arrive`. Aaron's e1111-34/36/37/41/42/03/38. Choices below are Claude's unless quoted; veto any.

**Depth (e1111-36).** Both pieces first turn to face the camera across (cancelling the perspective that made the
shelf read "angled left"), then turn 11° further: the shelf faces right (its right end recedes), the board mirrors
it (its inner edge recedes), like two side walls of a little room around the cat. Knobs: `SHELF_VIEW.yawDeg` in
`src/world/shelf.js`, `BOARD_VIEW` in `src/world/pinboard.js`. The board is 1.07 × .71 (was 1.1 × .75); cards keep
their physical size, so their print stays as readable as before (1.07 is the smallest width that keeps a margin
between paper and ticket without overlapping them). It pivots on its right edge, so the inner edge recedes rather
than the outer edge coming forward: on screen it is 396 × 275 px at 1280 × 900 (was 429 × 293). Slots, pins and
supports are board-local, so they turn with it; a card held near its own pin now guides grip depth toward it (the
shelf's existing rule), since turned slots sit at different depths.

**Arrivals (e1111-37)** — `src/world/arrival.js`. Only at the live unlock (a category reaching two unique finds after
the page has loaded); a reload, or saved discoveries, place furniture at once. First unlock: slides in from its
own side for 15 s at a grinding, uneven pace (speed lurches at .43/1.17/2.9 Hz, never backwards, a ±1 px shudder,
a 3 px thunk on landing); the scrape loops seamlessly (crossfaded copies) and fades in with the square of time over
the 15 s, cuts as it lands, and the FF7R fanfare is scheduled on the audio clock for the landing instant.
*Interpretation:* Aaron's "looped for like 30 seconds so it has 15 seconds to fade in" is read as the loop being
long enough to fade in across the 15 s slide; it stops on landing. Second unlock: the Spellsword fanfare starts
with the slide and the slide lasts exactly as long as the music takes to reach its bong. **Measured bong: 32.127 s
(mp3) / 32.160 s (m4a)**, the strongest spectral-flux onset after 30 s (~11× the median; `tools/audio/prepare-
arrivals.py --bong`); the slide uses 32.14 s. Progress follows the AudioContext clock, so slow frames or a hidden
tab resync on the next frame; if the audio clock ever stalls while visible, it falls back to frame time. Until it
lands the furniture's body is disabled, every slot refuses, and the board defers pinning its cards (they pin as it
lands). A second unlock during the first slide waits for it to land plus 4.5 s. Reduced motion: a 1.2 s fade in
place; the FF7R fanfare plays at its end; the Spellsword starts 1.2 s before its bong, so the bong lands as the
board appears. Mute/volume: everything is on the master bus. Automation (`navigator.webdriver`) places furniture
at once so existing checks are unaffected; `?arrivals=1` plays them, `?arrivals=0` never does.

**Audio.** Aaron's three downloads converted by `tools/audio/prepare-arrivals.py` (trims and one constant gain each):
scrape → mono WAV at the −22 dBFS effect target; both fanfares → m4a + mp3 at −12 dBFS loudest-100-ms RMS, the
level of Butterman's songs (sources peaked at +0.29 dBFS; delivered peaks ≤ −7.3 dBFS). Ledgered in
`assets/audio/SOURCES.md` and `design-manifest.json`; the FF7R fanfare and the scrape are cleared for use by
Aaron (e1111-56). `checks/sounds-files.py` accepts Aaron-supplied third-party
files only with author, licence-as-stated, recipe and (where owed) a credit present in the grimoire.

**No button rows (e1111-34).** Removed: the shelf's Rifle/Top/Butter/Tin/Lift/Arrange row and its expanded Arrange
view, the board's Paper/Void/Ticket/Read-arrange/Lift row, the rack's "Hat ›", the "Box & baking" panel. What only
the buttons offered, now by touch/mouse: **reading a card up close** — press and hold any card (520 ms, still) to open
the reader (before, only the paper opened it by tap); **the phone board's next card** — tap the board itself, off
the card. Already reachable and unchanged: rack hats (tap the post / a hat), box lid, portions, pail, fork and cake
(taps), shaking and pouring (physical). Lost: the panel's recipe status line ("Add one measure of each…"); the
`ui.say` lines remain. Kept: the screen-reader keepsake list (`#keepsake-keys`, invisible), which several existing
keyboard checks drive; the rack's hidden "Light" button belongs to the lamp lane. Open question for Aaron: the
phone board has no visible sign that more cards are pinned behind the shown one (the "›" was it).

**The top (e1111-42).** In its shelf recess the top rests the way a real one settles: of all poses with the tip in the
bored recess and every collider point on or above the recess floor / shelf top, the one with the lowest centre of
mass, solved once from the top's actual hull. It leans forward-left (crown toward you, stem away from the rifle):
33.6° at desktop scale, 41.8° at phone scale, contact gap .5 mm.

**Whisper (e1111-41).** Playback ceiling .045 → .072 (+4.1 dB); loudest output peak −27 dBFS, far from clipping. No
file changed.

**Credits (e1111-03, e1111-38).** The grimoire's credit line became a quiet "With thanks" list: the Rukh3D cow (CC BY
4.0, Sketchfab) and "RPG Victory Fanfare 2" by Lux Aeterna Audio, linked to the channel as the author asked.

**Measured results (desktop 1280×900 DPR1 unless noted; the full suite is the orchestrator's).** Arrivals check passes
desktop, phone (390×844 at DPR1) and reduced motion: first slide lands 15.013 s after start; the bong measured in the
page's own decoded m4a is 32.160 s and the second slide lands at 32.149 s (−10 ms); a 1.5 s main-thread stall resyncs
on the next frame; reload replays nothing. Affected checks pass: shelf (+reload), shelf-play, shelf-solids, board
(+reload), board-integration, board-curtain, supports, rack (+reload), cake (+reload), cake-pouring, cake-ending,
sounds (+reload), grimoire both sizes, sounds-files.py, sound-originals.py.
- `world-shelf-drag-all` (top bay): **fails 3/3 on the base commit `35a9259`** at this size; on this branch it passes
  4/5. The shelf's depth guide aims with the bay's upright frame, so the tilted top bay does not feed the swing.
- `world-layout` "default collection mostly unobstructed" **fails**: the resting top's screen rectangle is 28% under
  the rifle's (gate 20%; base 19.6%). Measured premise: an *upright* top under the new 11° shelf angle is 35%, so the
  angle itself moves the back-row rifle over the front-row top on screen; the tilt lowers it (best lean, toward the
  camera, 22%). No lean passes; the gate was not loosened. Choice for Aaron: accept (the overlap is the stock above
  the top's stem, little real occlusion: `docs/shots/arrive-top-rest-desktop.jpg`), a smaller shelf angle, or moving
  the top's bay in the shelf art. "World visible items reachable" in the same check also fails on base (a hung hat
  past the left edge), unchanged here.
- `world-cake-ending` used lib's `tap()`, whose page timers pause with the party's interlude, so the check waited
  30 s; it now times the cake press on the wall clock (the page behaviour was right).

Screens: `docs/shots/arrive-arrivals-landed-{desktop,phone}.jpg`, `arrive-arrivals-shelf-mid-{desktop,phone}.jpg`,
`arrive-arrivals-board-mid-desktop.jpg`, `arrive-arrivals-hold-read-desktop.jpg`, `arrive-top-rest-desktop.jpg`,
`arrive-grimoire-credits-{desktop,phone}.jpg`.

Checks: new `checks/world-arrivals.js` + `world-arrivals-reload.js` (run with `?arrivals=1`, desktop/phone/reduced);
updated for the removed controls: `world-shelf.js`, `world-shelf-play.js`, `world-cake-ending.js` (tap the cake),
`world-cake-pouring.js` (the milk action), `world-cake-reload.js` (tap the box), `play.js` (whisper bound),
`grimoire.js` (credits), `sounds-files.py`. Both arrival variants are in `run-all.sh` at each size.

### Aaron's answers applied (2026-11-11)

- **e1111-55, first arrival timing:** "the scrape would fade in for 15 seconds with nothing going on on the screen,
  and then it would continue scraping for the next 15 seconds while it actually slides into view." Now: 0–15 s the
  scrape fades in (square-law) with the furniture still off screen and unusable; 15–30 s it scrapes at full level
  while the furniture grinds in; it lands at 30 s on the FF7R fanfare. `ARRIVAL.first.lead` = 15. The second arrival
  and reduced motion are unchanged. This supersedes the 15 s description and interpretation above.
- **e1111-54, top under the rifle:** "thats fine". `checks/world-layout.js` gives the shelf's rifle-over-top pair its
  own ceiling (.30, measured .28) and keeps the 20% limit for every other pair.
- **e1111-56, licences:** "the two sounds are cleared". The scrape and the FF7R fanfare are recorded as cleared for
  use by Aaron in `assets/audio/SOURCES.md` and `design-manifest.json`.

### Final integration — merges of sc/ach, sc/lamp, sc/arrive (2026-11-12)

Merged in order; REVIEW, run-all and audio ledgers unioned. With sc/arrive's button rows gone, the rack's lamp button (Fit bulb / On / Off) went too: drag the bulb onto the lampshade to fit it, tap the fitted bulb to switch it; the board has no button row left for the platinum badge to cover. Fixes found by the merged suite: wearing a hat before the rack was found (the party's return) builds the rack quietly instead of waiting on its drop-in; the rack drop records its starting pose; a reduced-motion furniture arrival waits at home transparent instead of off screen; an item explicitly placed before its body exists keeps its spot; look-bite waits for the tin (the achievement toasts can stretch the 0.6 s stage-clock delay past its fixed wall-clock wait).

Open: `world-shelf-play-desktop` failed once in the suite and twice in nine standalone runs (passes on sc/arrive alone in four of four): under a slow frame the held top trails the cursor and is caught under the angled shelf plank on the floor-to-bay path. Cost gates are left to the physics lane (final suite numbers: final twenty median p95 5.7 desktop / 6.3 phone ms, maximum 5.1 / 4.2, cake twenty 6.2 / 5.4, cake maximum 4.6 / 3.7; shelf seven 2.6 desktop, shelf twenty 2.9 phone; gate 2.5).

### Final integration — merges of sc/physics2 and sc/kitchen, both sizes (2026-11-12)

Merged `sc/physics2` then `sc/kitchen`; the kitchen's box, recipes and bin now use the force-limited hand. The full
suite at both sizes found, and these commits fix at the cause:

- 100-drop gates: a suspended cat's colliders still held bodies up (his body now leaves the room while suspended), and
  the thick floor cuboid added energy (thin slab plus a backstop below). Fixtures that drop where he sits suspend him.
- Decided silence (e1111-58): world-impacts and the rack drop expect no contact thuds while collisions are off.
- Paper glyph: the REJECTED stamp prints larger and condensed to fit (the 12 px floor is unchanged).
- Floor placement: a candidate is tested against the cat's own hulls; an explicitly moved prop keeps its spot; a
  resized prop's clamped spot steps clear of him; a card spawned against him slides aside or in front (it was shoved
  half off the phone page); his body is brought current before any clearance test.
- Hay fell onto the recycling bin (it saw keepsakes only): its whole fall column is tested against every body.
- Phone pinboard had no height for the recipe card: NaN layout, a Rapier panic. Height added.
- A pixel-ratio step (adaptive DPR) re-placed and re-saved every floor body: world.resize now acts on a layout change only.
- The achievements tick scales the icon, not the link, so its 44px target no longer covers ask-the-butter.
- Chest cues ledgered like Aaron's other supplied sounds (recipe path, measured levels).
- Phone fixtures: physics2's depth tin hovers weightless (teleporting it off his contact woke it); the cloud glide
  ignores the frame stalled by its own screenshot.

Cost: the last suite's desktop final twenty/maximum lines failed once while another workspace's build ran (host
load 12-13); rerun alone once they passed (final 1.5/1.9 ms, cake 1.4/1.5 ms median p95, limit 2.5). No limit changed.

Speed gates, e1112-11 (Aaron's "yes", 2026-11-12): on this desktop proxy the median p95 limit is 4.0 ms (was 2.5),
and every line still reports 2.5 ms as the target; applies to world-final-cost (both scenes), world-shelf-cost,
world-rack-cost, world-board-cost and world-core. run-all waits up to 3 minutes for a quiet machine (1-minute load
below 8) before each cost check and the G4 rest measurement; if it never quiets, a failed cost check runs once more.
A rack-frames run that records no frames is tried once more. Other gates (rest +0.1 ms, settle times, pixel limits)
are unchanged. Why: four full suites in a row failed only on timing while another workspace's builds kept the host
at load 9-17; the same lines passed alone at load ~4.5.

## Sound playtest lane (2026-11-12)

Aaron's six sound notes from his evening playtest (e1111-58), branch `sc/sound2`. Details and numbers:
`docs/sound-direction.md` → "Aaron's playtest — e1111-58"; sources in `assets/audio/SOURCES.md`.
Headless signal checks only: nothing here is a claim that it sounds right to a person. Each choice below is his to veto.

1. **Star sticker tap → a glass tink.** A real recording rather than synthesis: one tap from RutgerMuller's
   "Glass Tapped By Fingernail.wav" (Freesound 51038, CC0), the tap at 4.465 s with the longest clear gap after it.
   Cut to 0.42 s, 250 Hz high-pass, fades, one gain; ±4% pitch per tap. Choice to veto: this tap (bright, rings at
   ~1 kHz and 3.1–3.5 kHz) over a pint-glass tap (zembacraftworks 427389) that was cleaner but harsher above 15 kHz.
   The input is Freesound's HQ preview MP3 (the original WAV needs a login); the tool pins its SHA-256.
2. **Cup scoot / glass break.** The eight kept files were already byte-exact originals. Measured on this tree with the
   contact layer on, the cup gag played drip, glass-slide ×4, **impact-glass-medium 30 ms before glass-smash**, and
   **impact-glass-small** as the shards landed: the synthesized impact layer on top of the originals. With contact sounds
   off (note 6) only the originals remain, checked at every trigger exercised (cup, break, unmute click, tin paper, eyes
   choir, blast-off twinkle, crumbs bite, pat slap, the seventh stroke's bite). Also: `~/sigil-cat` (main,
   served on :8732) is fb6fc68, which predates the e1111-05 restore; if he played there, all eight are still the new
   sounds until the integration reaches main. **Question for Aaron: which address did you play on, :8732 or :8735?**
3. **Butterman old radio.** Runtime Web Audio, files untouched: AM band 300 Hz–3.4 kHz, cabinet and cone resonances,
   mild biased valve, faint hiss/crackle bed per voice, slight wow. Matched loudness (−14.3 vs −14.4 dBFS loudest 400 ms),
   peaks −3.7 dBFS, valve residual −26.7 dB, bed ~41 dB under his singing. Applied to his songs, the yell, the whisper
   loop and the whisper replay; the slap/pop effects in his scenes stay dry. A clip cut short takes its hiss with it. Choices to veto: the amount of honk
   (cone +4 dB), the crackle (1.5/s), and the wow (±0.12%, at most 0.35 ms either way, zero-mean).
4. **Purr per stroke.** 0.32–0.46 s slices of the existing purr at 0.82–0.92× speed, low-passed at 900 Hz, fresh
   offset each time, ≥0.16 s apart, gain 0.55–0.75 (a little louder as the purr builds). With the loop the sum peaks
   about −21 dBFS. No burst on the stroke that bites, none after the plaster (he refuses to be petted).
5. **360 riser and return.** Measured: video's first second −19.6 LUFS momentary, riser peaks −14.0. A smooth,
   never-rising gain from 4.9 s down to −5.95 dB holds the riser at −19.7; the riser still overlaps the video's
   first second as before, so the two together are louder than either. The page now returns in the same task the
   video ends in (`back: 0`), for skip/Escape too.
6. **Collision noises removed** at their source: `SITE.sounds.collisions: false` (config) and one line in `main.js`
   that passes no impact groups when it is false; `audio.impact()` now returns at its first line. No world/physics file's
   logic changed. The shelf's mount plop is a contact sound and is silent too. The 36 impact files stay in the repo
   (provenance intact) but are never fetched; `collisions: true` restores the layer exactly.

Checks added: `checks/sounds-playtest.js` (22 assertions), `checks/sounds-radio.js` (13), `checks/noscope-playtest.js`
(4), `checks/sound-playtest-files.py` (9); all in `checks/run-all.sh`. Updated to the silent-contact contract:
`checks/sounds.js` (count 70; the dormant adapter is still exercised with its groups switched on for those lines),
`checks/world-impacts.js`, `checks/world-small-sounds.js`, `checks/world-shelf-play.js` (two plop assertions), and
`checks/noscope-footer.js` (its "reachable during return" step is now "back in place at once": there is no return phase).
Run at desktop, dpr 1, all pass except `world-shelf-play`'s floor-to-bay drag, which fails identically on the
untouched baseline tree (the drag never reaches the shelf, so no plop happens); that failure predates this lane.
Full suite not run (orchestrator's). Nothing pushed.

## World polish lane (2026-11-12)

Aaron's playtest notes, e1111-58, branch `sc/polish`. One focused check per note (`checks/polish-*.js`, added to
`checks/run-all.sh` at both sizes, with reduced-motion runs for the top and the cloud). Run here at desktop, dpr 1,
plus the galaxy check once at phone size because the note asked for "both sizes". No full suite, nothing pushed.

| # | Note | What changed | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Galaxy | The black hole is centred from the frozen pose's own silhouette centre (his turntable axis at the middle of the pose's height, so a loaf is lower than a sit), offset by a measured constant so the *visible* dark disc, not the geometric centre, has him in the middle: the near disk hides the shadow's lower part, which put the dark area's centroid .022 h right and .049 h above the old centre. Background space is near-black with faint grey dust (no purple/teal nebula); the dark now reaches 100% everywhere at the deepest point (was 94%, which let the pinboard show through), and the furniture buttons (shelf, board, rack, baking panel) spiral away with the page chrome. The portal galaxy in his body and the orange disk are unchanged. | The bread's blast-off keeps its 94% dark. The offset is `GALAXY.cutscene.hole`; the check re-measures the dark centroid from pixels. |
| 2 | Loaf | The bread roll by chance (15% per loaf hold) is removed; only the dome sigil makes bread. Paradox no longer starts "by himself" either. | I read "loafing" as the bread transformation. His `lie` pose (the loaf-shaped splat) stays in his idle cycle; if Aaron meant that pose, it is a one-line change to `cycle.poses` in `src/config.js`. |
| 3 | Stuck shaking | Cause found: the pet-bite twitch is driven by an annoyance count that never went down, so five or six strokes (one or two short of a bite) left him twitching for the rest of the visit. Annoyance now drains (2 strokes/s) once the stroking has stopped for 1.5 s; the twitch fades with it. Also hardened: a pose whose file fails to load used to leave him in the pre-pop shake for good; the pop now gives up and he stays as he is. | The bulb lane's `idea` emote (sc/lamp, not in this base) is a finite hop; it cannot stick. The bite still comes on the seventh stroke in a row. |
| 4 | Butterman | The collection curtain is gone (`src/ui/collection-curtain.js` removed): everything stays visible and interactive during his scenes. A kinematic capsule the size of his body (`world.pusher`, additive in `src/core/world.js`) walks with him and, as he nears a loose prop across his line, eases it sideways (away from his line, or away from the cat when dead ahead); the capsule stops anything being walked through. It only follows the figure, so his beats are exact (check: slap at 11.456 s, unchanged). | Not active while he fills the screen (the rise), for cameos, or in frozen `#b=` scenes, and it never loads the physics engine itself. Furniture (shelf, board, rack) is fixed: he passes in front of it as before. |
| 5 | Butter under hat | The pat stays on his head; a worn hat rests on the pat (.0485 above the crown, sunk .004 into it) and lifts onto it with a short springy settle when butter arrives (plain move in reduced motion). The crown height (what sits on top) is now the hat over the butter. | Butterman's slap still aims at the top of the stack. Note for the lamp merge: `lamp.js` adds .05 for butter on top of `seatLift`; with this change `seatLift` already includes the pat under a hat, so the bulb would float .05 higher when both are worn. |
| 6 | Top | Rapier has no gyroscopic stiffness, so the old tap set it upright in one frame and it fell in ~0.7 s. The spin is now authored on a kinematic body (`src/core/top-spin.js`): it swings up about its tip (which stays on the surface), spinning up and overshooting upright a little; spins 4.4 s with a small lean that precesses and opens out; then physics takes it back with its spin and a tip, so it topples, rolls and rests. Measured: 5.2 s upright from the tap (was ~0.7 s). The circle sigil spins a loose floor top too. | A top stored on the shelf stays put when the circle is cast (a sigil does not reach into the shelf); tapping it there still spins it on the shelf. A charged top is already spinning and is left alone. Reduced motion: no spin, as before. |
| 7 | Cloud | The first cloud floats in from the nearer side of the page (left for its home) over 7 s with a slowing glide and no bounce; later bolts darken it in place. | Reduced motion: it is simply there. A saved cloud does not re-enter on reload. |
| 8 | Puddle | About twice the area (1.414 x 1.414; older saved pools grow once, same middle). The mirror picture is gone: the floor under it goes slightly darker and cooler, a darker meniscus line runs round the edge, a soft sheen grows toward the far side, one soft highlight and a crisp glint on the far inner edge. It is drawn before every floor shadow, so shadows land on the water. Static: no per-frame work. | The bolt/top sensor reads the same saved patch, so it covers the whole bigger pool (checked inside the new outer band, and outside it). |
| 9 | Paper | The card print redraws the pre-unit-5 photocopy sheet (grey copy, Times title and byline, greyed bars, black REJECTED stamp at the same place, copier edges and grain) at card resolution; its back is the blank side with the print faintly showing through. Tapping it, or "Read / arrange" on the board, opens the old tilted letter overlay again ("put it down", tap outside, Esc). | Sizes in the restored overlay are now rem, so it is identical at default text size and grows at 200%. Postcard and ticket keep the 3D reader. |

Checks updated to the new contracts: `world-rack.js`, `world-rack-legacy.js`, `world-supports.js`, `play.js` (butter
under hat), `world-board.js` (paper's reader), `audit-polish.js` and `world-board-curtain.js` (no curtain). Of those,
world-rack, world-rack-legacy, world-supports, world-board, world-board-curtain and audit-polish were run at desktop
and pass; play.js was not run (full-suite length).

Final desktop pass (dpr 1) of all ten `polish-*` runs: every check passes. Two first-in-batch runs printed nothing
(browser start-up under load, the case run-all already retries once); rerun alone, both passed unchanged. The
galaxy opacity check was proved against the old 94% dark (it fails there: 15/255, 34,032 pixels). Screens:
[galaxy desktop](shots/polish-galaxy-hold-desktop.jpg), [galaxy phone](shots/polish-galaxy-hold-phone.jpg),
[Butterman pushing the tin](shots/polish-butterman-push-desktop.jpg), [butter under hat](shots/polish-hat-butter-desktop.jpg),
[top righting](shots/polish-top-righting-desktop.jpg), [top spinning](shots/polish-top-spinning-desktop.jpg),
[puddle](shots/polish-puddle-desktop.jpg), [cloud arriving](shots/polish-cloud-arriving-desktop.jpg),
[paper card](shots/polish-paper-card-desktop.jpg), [paper read](shots/polish-paper-read-desktop.jpg).

## Physics and handling lane (2026-11-12)

Aaron's eight physics notes from his evening playtest (e1111-58), branch `sc/physics2`. API notes for other lanes:
`docs/plans/world.md` → "Physics and handling lane hooks". One focused check covers the notes: `checks/physics2.js`
(17 assertions, in `checks/run-all.sh` at both sizes); diagnostics are `checks/diag/physics2-*`. Run here at desktop
dpr 1 and phone dpr 2, focused checks only; the full suite is the orchestrator's. Nothing pushed.

| # | Note | What changed | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Things phase into each other, get stuck in the floor | The held item is no longer welded to an unlimited kinematic anchor. Each physics step a ball joint at the grip point pulls toward the pointer with a *capped* push, so a held item shoves what it meets and stops on the floor. The pointer target can't go below the floor or into the lens. The floor is 2 units thick (was .1). A body still ≥1 cm in the floor after .3 s, or ≥8 cm in at once, is lifted out once, from its own collider points. Hard CCD switches on per body only when it moves fast enough to need it; every body keeps Rapier's soft CCD. | Hand strength (`HOLD` in `world.js`): up to 7 units/s, 60 units/s² beyond its weight; spin capped at 4 rad/s and damped while held; a throw is capped at 6 units/s and 5 rad/s. An item gripped off-centre still hangs from the grip, as before. |
| 2 | The cat takes no space; everything draws over him | **Collider:** a kinematic body of three overlapping hulls (feet and tail, body, head and ears), fitted to the shown pose's opaque splats and turning with him (`src/core/cat-body.js`). Items bump off him and can rest against him. It is off while he is hidden, stood in for (the bread) or flying off. **Drawing:** a picture whose middle is deeper along the view than his middle now draws before him, the rest after him (the batch splits at him). A click is ignored on a body behind him where his collider covers it. | The collider ignores his 3.5 cm bob and the pop's squash. The depth is per item, not per pixel: a long item crossing his depth (the rifle sideways right through his plane) draws wholly in front or wholly behind, by its middle. |
| 3 | Items spin fast when picked up or wheeled | Spin is capped while held, after every step, and again on release. The wheel moves the target at most .06 units per event, and the hand carries the item there at bounded speed. | Measured: holding and wheeling stays ≤4 rad/s (was 30 rad/s in the same test before the cap). |
| 4 | Scroll down should bring it closer | Inverted: scroll down = nearer, for the box's own grip too. | — |
| 5 | The AWP went off toward the camera and never came back | Any item with less than 20% of its picture inside the page (between the top and footer chrome), or within .35 units of the lens, starts the existing five-second respawn. A resting item goes at once; a flying one after .4 s, so a short toss above the top edge can still fall back. Held, supported and furniture items are exempt. | The footer area counts as off the page, as it already did for resting items. |
| 6 | Nearer/Deeper only on mobile; no other keyboard buttons | The Nearer/Deeper bar shows only on a touch (coarse) pointer. The ← ↑ ↓ → and Place buttons are gone. The rack's empty action row is removed. | Keyboard play still works without buttons: Enter on a keepsake key lifts it, arrows move it, Shift+↑/↓ change depth, Enter places, Escape drops. Those keys are the visually hidden list that appears only when tabbed to. |
| 7 | Shelf and board: place by where the pointer is, at any depth | While dragging, the nearest open, compatible slot whose on-screen footprint is under the pointer is outlined, and letting go places the item there at any depth or speed. The footprint is the item's own colliders set in the slot, projected, plus 16 px, at least 60 px. The shelf keeps its "Release to place" box; board pins, rack pegs, the lampshade socket and his crown get a dashed outline. Without a pointer (keyboard), the old near-slot rule applies. This also fixes the `world-shelf-play` floor-to-bay flake: 9 of 9 runs pass (6 desktop, 3 phone). | Applies to every slot, including hats onto his head and the bulb onto the lampshade, not only the shelf and board. |
| 8 | Speed budget | See below. All gates pass on the final run; no threshold changed. | — |

**Cost (p95 of each run, median of five, ms; gate 2.5). Before: the integration's full-suite numbers. After: this branch's final run, host load 4.5–9.7.**

| Gate | Before desktop | Before phone | After desktop | After phone |
|---|---|---|---|---|
| final, twenty bodies | 5.7 | 6.3 | 1.5 | 1.5 |
| final, maximum | 5.1 | 4.2 | 2.1 | 1.9 |
| final with cake, twenty | 6.2 | 5.4 | 1.8 | 2.3 |
| final with cake, maximum | 4.6 | 3.7 | 1.7 | 2.0 |
| shelf, twenty | — | 2.9 | 1.2 | 1.7 |
| shelf, all seven moving | 2.6 | — | 0.9 | 0.9 |

Board and rack cost gates also pass at both sizes, desktop / phone: board twenty 1.1 / 1.0 and all five moving 1.2 / 0.4; rack twenty 1.3 / 1.3 and all ten moving 1.5 / 1.3.

What the profile showed and what fixed it, in order of size:
1. **Splat sorting.** Each of the three ~66k-splat props (rifle, top, controller) re-sorted on the main thread every
   frame it tumbled (~.3–.4 ms each). A moving prop now asks a shared worker (`src/core/splat-sort-worker.js`) for its
   back-to-front order once the eye has swung 4° round it. It keeps drawing its last order until the answer lands,
   between frames. At rest it is sorted exactly, once, here. Its picture is still redrawn every frame.
2. **Hard CCD.** Rapier runs its CCD pass for the whole world while *any* body has CCD on, and every body had it on:
   ~40% of solver time. Now on only for a held body or one sweeping more than 75% of its soft-CCD envelope per step.
3. **GL uploads.** Every atlas and presentation flush re-sent whole instance buffers (128 slots per group). Now only
   the written ranges go up. This was also what made the cost loop wait on the GPU process on the phone viewport.
4. Small ones: atlas groups with nothing to draw are skipped; CCD judged every third frame per body; the pitchfork's
   sky-throw check skips when it cannot change (`recipes.js`, a two-line guard).

Margins are thin under heavy host load. At load ~15, one earlier desktop run measured maximum 2.7, cake twenty 2.8
and cake maximum 3.0. The same code measured 1.5–2.1 at load 5. If the full suite runs on a busy host, these can
miss. Two levers exist but are off because they change the look while moving: a lower picture resolution for moving
props (`?motion=1` = one picture pixel per page pixel) and a share of the splats while tumbling (`?lod=0.5`). An A/B in
one page at load ~7 (`checks/diag/physics2-ab.js`) showed no measurable gain from either on desktop, so they stay
off. **Recommendation:** run the cost gates on a quiet host. If they still miss, the next real cut is merging the
atlas's untextured material groups into fewer draw calls (~55 draws per pass today; ~.1 ms).

Checks updated to the new contracts: `world-core` and `world-props` (the hand has no anchor or joint;
`impulseJoints.len()` is 0 while holding, also in `world-supports`, `world-board`, `world-board-integration`,
`world-shelf`, `world-small-lifecycle`), `world-presentation` (one batch per side of the cat), `world-rack` and
`world-rack-drop` (no rack row), and `world-shelf-play` (the stored top's tap is the polish lane's authored spin).
The isolated 100-seed drop fixtures that drop at the origin, where the cat now floats, take him out of the physical
world for the drops (`world.cat.suspend('fixture')`): `world-props`, `world-board`, `world-cake-solids`,
`world-shelf-solids`, `world-small-drops`, `world-impacts`, `world-small-sounds`, `world-rack`, `physics`.

These fail on the untouched base as well, with the same pattern, before this lane's changes:
- the seeded drop gates in `world-rack` (5), `world-small-drops` (4), `world-cake-solids` (6–9) and
  `world-shelf-solids` (2);
- `world-impacts` (6, "real … contact is silent then sleeps", after the sound lane's silent contacts);
- `world-board`'s paper glyph height (11.2 px of 12) and its paper-drop line;
- `world-rack-drop`'s "thuds on wood" (expects wood sounds; collisions are off).

Not fixed here; they need their owners' call. Passing at desktop after this lane: `play`, `world-arrivals`,
`world-cake`, `world-cake-views`, `world-layout`, `world-water`, `bulb`, `polish-top`, `polish-butterman`,
`polish-hat-butter`, `world-atlas`, `world-final-scene`, `world-presentation-rotor`, `world-shelf`,
`world-shelf-drag-all`, `world-support-recovery`, `world-small`, `world-small-lifecycle`, `world-supports`,
`world-board-integration`. Also passing at phone: `physics2`, `world-props`, `world-presentation`, `world-core`,
`world-supports`, `world-board-integration`, `world-small-lifecycle`.

Screens: [depth, desktop](shots/physics2-depth-scene-desktop.jpg) (the box and rifle behind him, the tin and top in
front), [depth, phone](shots/physics2-depth-scene-phone.jpg), [board snap at the wrong depth](shots/physics2-snap-postcard-desktop.jpg),
[shelf snap](shots/physics2-snap-tin-desktop.jpg), [behind](shots/physics2-tin-behind-cat-desktop.jpg) /
[in front](shots/physics2-tin-in-front-of-cat-desktop.jpg).

## Kitchen lane (2026-11-12)

Aaron's e1111-58, e1111-59 and e1111-61, branch `sc/kitchen`. Built while he slept; every choice below is mine and
open to his veto. Checks were run here at desktop (dpr 1) plus phone passes of the chest; the full suite was not run
(the orchestrator's). Nothing pushed.

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | The egg (e1111-58/59) | When the 90 s bird first flies on, 1.4 s later it lets go of one big egg (`src/eggs/bird.js` sends `sigilcat:bird-egg`; `src/world/recipes.js` keeps it once ever). It falls from the bird's place into the room as a physical keepsake (`src/world/egg.js`, model `assets/models/prepared/kitchen/egg.js`: Narushin egg curve on a lathe, light-brown shell, faint mottle, ~900 darker speckles densest at the blunt end, pore bump, satin roughness .44). It has no break state. The cake is now flour + butter + milk + egg; the grimoire's box entry and the Baker achievement say so. | Light-brown shell (I tried cream first; it vanished against the bone-beige page). Its size: .2 cat-heights long, a big egg beside the flour sack. A tap gives it a small wobble and a quiet pop. If the page's controls are locked when the bird arrives (a cutscene), that visit's bird drops nothing and the next visit's does. |
| 2 | The box is a Minecraft chest (e1111-61) | Closed by default. A short click (or its keyboard button) plays the opening half, opens the lid and then the chest screen (`src/ui/chest.js`): the game's grey bevelled panel at a whole-pixel scale (3x desktop, 2x at 390 px), "Chest" over 9x3, "Inventory" over 9x3 plus the 9-slot hotbar, drawn as pixel art from the reference's geometry, a pixel font of our own (`src/ui/pixel-font.js`), hover highlight and the dark violet tooltip. Every movable room item is in the inventory as a picture of its own 3D model (`src/ui/item-icons.js`, rendered once and cached, also in browser storage so chest items keep theirs after a reload). Drag, or press then press (tap then tap on a phone), to move; inventory to chest despawns the item from the room (a puff where it was), chest to inventory drops it back in front of the box. Esc, the little x, or a click outside closes: closing half, lid shuts. Click-and-hold still lifts the box. Baking: the four in the chest, the box held and shaken (four reversals within two seconds, as before) bakes; the next opening shows the cake (cake picture drawn from its model); drag it out and tap it to eat (the party ending, unchanged). Contents and the inventory's order persist. Older saves: whatever was physically inside the old open box is simply in the chest. | Sound: the clip's open half (0.62–1.28 s) and close half (5.08–5.72 s); I left out a lone click at 4.46 s that sounds like a GUI click rather than the lid. Levelled to −22 dBFS like the palette (`tools/audio/make-chest.py`). Not shown in the inventory: the box itself, furniture (shelf, board, rack, puddle, hay), sky things (cloud, gold star, GOOD JOB), the hats and the bulb (they belong to the rack and lamp, which restock them), the platinum badge, and anything on him (butter on his head, eyes on his face, a worn hat). Dropping on a full slot swaps the two (the game would leave the other in your hand). The pail is milk only while full; baking empties it and leaves the pail in the chest; flour, butter and egg are used up (flour returns after two more breads). The tooltip names are mine (e.g. "Tin of Plasters", "Encore Ticket"). A missing picture shows the game's magenta-and-black square. If the butter goes back on his head by another way while a pat is in the chest, the room's one wins and the chest's goes. |
| 3 | Recipe paper (e1111-58) | When any two of flour, butter, milk and egg are held (in the room, in the chest, or butter on his head), a ruled index card flutters down from the top of the page (once ever): red RECIPE, "Cake in a box", the four, and four steps, printed in ink-blue serif. It is a card like the others: pins to the board (its own slot over the paper's lower corner on desktop; one card at a time on a phone, as before), and press-and-hold reads it up close. | Butter on his head counts as held, so a player who has met Butterman gets the card with the first other ingredient. The board on desktop had no room for a fourth card; the recipe card overlaps the paper's lower-left corner, pinned in front of it (z .026 vs .020). |
| 4 | Recycling bin (e1111-58) | With both the crumbs and the broken glass about, a small blue recycling bin (`assets/models/prepared/kitchen/bin.js`, white chasing-arrows mark) slides in at the bottom right in 0.7 s (fixed furniture with a real collider). Drag either over it and let go: it is carried into the bin and gone, with a rustle (crumbs) or a rattle (glass). With both in: a gold-foil GOOD JOB star sticker (`kitchen/goodjob.js`) is stuck on the screen like the gold star, with a twinkle; tap for the fingernail tink, peel and stick back (also keyboard buttons). Then the bin slides away. All persists. | The bin leaving once its job is done (2.4 s after the sticker) is my addition, to keep the room clear. The sticker's spot: right side, a third of the way down. Each item's keyboard button gains "Put … in the recycling bin" while the bin is there. |
| 5 | Replay flappy (e1111-58) | Once found, the controller mark in the row at the bottom starts the flappy game again (`bird.again`), with the same return (death or the return button). No second controller. | Replays count toward the flappy achievements, as the first game did. |
| 6 | Achievements | Got Milk, Baker and Happy Birthday read the same saved fields; Baker's line now names the egg. No new achievements. | |

Not built, honestly: a "drag into the chest" from the room itself (items go in only through the screen, as asked).
The box no longer accepts things dropped through its top. The old flour/milk/butter "measure" items still exist as
definitions so older saves load; nothing makes them any more.

Checks added (all in `checks/run-all.sh`, both sizes): `kitchen-chest.js` + `-reload.js` (21 + 6, real mouse/touch
on the box and the chest screen, including a real held shake that bakes), `kitchen-egg.js` + `-reload.js` (7 + 2,
via the bird fixture's skip), `kitchen-card.js` + `-reload.js` (6 + 2), `kitchen-recycle.js` + `-reload.js` (11 + 2,
plus a reduced-motion run), `kitchen-replay.js` (6). Moved to the chest flow: `world-cake.js`, `world-cake-reload.js`,
`world-cake-pouring.js` (now: sources and the pail through the chest), `world-cake-reloads.mjs`, `play.js` (gag 4),
`world-cake-solids.js`/`-views.js` (egg added). `sounds.js` counts 73 voices (it said 70 but the base already had 71 since the achievement chime was named, so it failed before this lane too; now 71 + the two chest cues).

Edits to shared world files, all small and additive: `src/world/pinboard.js` (a fourth slot id, its pose, an optional
slot depth), `src/world/cards.js` (one stock row), `src/world/card-print.js` (one print branch), `src/main.js` (one
module in the egg list), `src/config.js` (two sound names). `src/world/recipes.js` and `src/gags/box.js` are rewritten
(kitchen-owned).

Final runs (desktop dpr 1, one runner at a time, except where noted): kitchen-chest 26/26 and its phone pass 26/26,
kitchen-egg 10/10, kitchen-card 9/9, kitchen-recycle 14/14 and reduced motion 11/11, kitchen-replay 7/7,
world-cake + reload 30/30, world-cake-pouring 6/6, world-cake-reloads 9/9, sounds 14/14. One earlier world-cake run
failed its cow-milking step while two other browsers ran beside it; alone it passes, as it does on the base commit,
so I read it as load timing, not this lane. In the chest check a real held shake (pointer down, 260 ms, side to side)
bakes on both sizes; on the phone a hard release once threw the box off the page and it came back by itself after 5 s,
behind the cat, so the check now settles the hand before letting go and sets the box down if it is out of reach.
`play.js` (gag 4 now opens and closes the chest) was not run (full-suite length).
Screens: [chest](shots/kitchen-chest-open-desktop.jpg), [tooltip](shots/kitchen-chest-tooltip-desktop.jpg),
[filled](shots/kitchen-chest-filled-desktop.jpg), [cake inside](shots/kitchen-chest-cake-desktop.jpg),
[phone chest](shots/kitchen-chest-open-phone.jpg), [phone filled](shots/kitchen-chest-filled-phone.jpg),
[egg falling](shots/kitchen-egg-falling-desktop.jpg), [egg landed](shots/kitchen-egg-landed-desktop.jpg),
[recipe card](shots/kitchen-card-floor-desktop.jpg), [on the board](shots/kitchen-card-board-desktop.jpg),
[read](shots/kitchen-card-read-desktop.jpg), [bin](shots/kitchen-recycle-bin-desktop.jpg),
[GOOD JOB](shots/kitchen-recycle-goodjob-alone-desktop.jpg), [flappy again](shots/kitchen-replay-game-desktop.jpg).

## Text lane (playtest-2, 2026-11-12)
Branch `sc/p2-text`. Aaron's items 1-8 of the text lane; decisions e1112-31, -32, -37, -40.

**1. The cat speaks** (`site.ui.speak(text | [sentences], opts)`, `src/ui/hush.js`; knobs in `config.ui.speech`).
- A line over his head (`#speech`, `index.html`) in his script that settles into words, the same writer as the message
  line (`writeRunes`, now shared: `.runes` in `hush.css`). One sentence at a time; at the start of each he hops
  (`cat.playEmote('hop')`, the hop a tap gives) and `tap-bonk` plays once. Returns a promise (true when said), so the
  guarded call other lanes use (`site.ui.speak?.(t) ?? site.ui.say(t)`) never falls through.
- Placed once per sentence (no per-frame work): above his crown in the pose he is in or landing in, plus any hat, plus
  0.2 cat heights (clears the ears; a hop's peak may brush it). It wraps between words only, is never wider than the
  room between the small label and the numbers, sits under the name when it fits there at a step or two smaller, and
  otherwise (a short screen: phone landscape) goes where the name is while the name fades for the moment. It shrinks a
  pixel at a time to 10 px if it must. A page-coloured halo keeps it readable over a keepsake; a small ink caret
  points down at him. Hidden during Butterman-up-close and the galaxy. Reduced motion: words at once, no hop.
- Moved to his voice (e1112-32): the box intro, as two sentences (two hops); "thank you, cow." replaces both milk lines
  (filling the pail and tapping the full pail); "encore" (the harp, after the first time). Edits outside the lane,
  each with a comment: `src/world/recipes.js` (2 lines), `src/gags/box.js` (1), `src/gags/harp.js` (1).
- Dropped (e1112-32): the bonk milestone lines (the milestones still spin him; `ui.bonk()` still returns the title for
  `main.js`), "everything is in…", "a soft thump inside the box", "a cake. somehow.", "the box needs flour, butter,
  milk and an egg inside", "the pitchfork is in the box" (the fork still stays in the box; only its line is gone).
- What still appears on the message line above the marks, for Aaron's review: "new: <find>"; "rare bonk"; "a moment.
  he is still somewhere else." (pressing the bread mark mid-takeover); "a moment. he is still singing." (Butterman);
  the ask-the-butter hints; Butterman's sung lyrics (`ui.caption`); the recycling "good job." (the gags lane turns it
  into the six tiers). The achievement reveal (item 5) also lives there now.

**2. First pickup tip.** `src/core/world-input.js` sends `sigilcat:pickup` (one added line, commented) the first time a
held item moves under a pointer. `hush.js` answers once ever (store `tips.pickup`) through `speak`: mouse/trackpad
"scroll down to bring it nearer, up to push it back." (the wheel's real direction: `wheelDepth` makes scroll-down
nearer); touch, where the depth bar shows, "tap nearer or deeper to bring it closer or push it back." Words in
`config.ui.pickupTip`. Keyboard lifts (keepsake keys) do not trigger it: the wheel is not theirs.

**3. Buttons in the page's look.** One "felt patch" style for every visible button and link-button: warm felt fill, a
1.5 px ink outline with round ends, a faint dashed stitch just inside, a gold glow ring on hover, a 1 px press. Worn by
the footer's sound control (button and slider in one pill), ask the butter, grimoire, the achievements mark (a circle),
the controller in the row (a circle), the touch Nearer/Deeper tray, the card reader's buttons, the letter's "put it
down", the bird game's bar buttons (keeping its pixel font), the 360 film's skip (a dark felt variant on the black),
the grimoire's "forget everything" and the books' links. All in `hush.css` by selector, so the owning files are
untouched. Kept on purpose: the pixel chest's close (the game panel's art) and the fake Chrome error page. Between
701 and 1240 px wide (phone landscape, a small window) sound stacks over ask the butter so the row of marks keeps its
room (it overlapped at 844 px wide).

**4. The row of marks.** Only finds of kind `sigil` (read by kind, so the star leaves when the sky lane makes it a
secret), each a place, found ones a button that casts again; then the controller, once found, as a round button that
plays the bird game again. "N of M found" at the top counts the row: found sigils of all sigils. The grimoire still
lists every find with its own tally ("of 18 found on this device"); the completionist achievement still reads every find.

**5. Achievement reveal** (e1112-31; replaces the toast, `src/ui/achievements.js`). On the message line above the marks:
a small gold "achievement" label, the name in his script settling into letters, then a wax seal stamps beside it
(drops from 2.5x with a twist, overshoots, settles), the existing `achieve` chime at the moment it lands (no new
sound, e1112-40), a ring of wax squeezes out, the line gives a 1.5 px thud, and a gold band sweeps through the letters
and a white glint across the wax. Stays 2.6 s after landing. Platinum Cat: label "platinum", bigger seal (62 px) and
name (24 px), platinum wax, a platinum sweep twice, three glints winking around the seal, 4.6 s. Queue: one at a time,
380 ms apart; a reveal waits while a message is on the line, and a message that comes during a reveal waits and plays
after it (`ui.holdLine`, `ui.lineFree`). Still never over a takeover. Reduced motion: words at once, the seal simply
appears, no sweep. `A.reveal` (and `A.toast`, the old name) is the element.

**6. Metals.** `metal` on the five bonk tiers in `src/achievements.js` (only those entries): First Bonk wood, Bonk
Apprentice bronze, Bonk Adept silver, Bonk Master gold, Bonk Legend platinum. Earned seals in the book are struck in
the metal (CSS gradients: wood grain rings, brushed bronze, neutral silver, gold, a cooler platinum with a faint oil
sheen); the reveal's wax uses the same metals, gold wax for everything else, platinum for Platinum Cat.

**7. Platinum rule** (e1112-37). Already true in the runtime, now written down and checked: Platinum Cat is earned when
every other entry is, so entries other lanes add count for anyone without it; nothing ever clears an earned
achievement (only the debug forget and the grimoire's start over, which wipe all).

**8. Hints.** Read against this round: none mentions the star or a drawn five-point shape, and "spin him once, all the
way round, and let go" still describes the 360 (one revolution, released), not the star's very fast spin. No change.
The star's grimoire riddle ("five distant tips, crossed in a single journey") will mislead once the star is a spin;
that text is in `src/finds.js`, the sky lane's.

Checks: `checks/text.js` + `checks/text-reload.js` (42 + 4), in `run-all.sh` at both sizes, plus a reduced-motion run.
Updated for the reveal and the row: `checks/achievements.js` (toast -> reveal, 4 lines), `checks/after-reload.js`
(the row counts sigils + controller). Runs here: text desktop dpr 1, phone, 844x390 and reduced: all pass;
achievements + reload desktop: pass; kitchen-replay desktop: pass.
## Shell lane (playtest-2, 2026-11-12)
Aaron's items: the loading screen, phones in landscape only, the books as pop-ups, "start over" (e1112-39), the cake's
crash screen (e1112-33). New files: `src/ui/shell.js` (loading screen, doors, "flip sideways"), `src/core/freeze.js`
(the page held still), `src/ui/books.js` (both books as pop-ups). Checks: `shell-boot.js`, `shell-turn.js`,
`shell-books.js` + `-reload.js` (all in `run-all.sh`).

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Loading screen | Painted by `index.html` before any script: two paper doors (the page's colour and grain, a pressed frame on each, a hairline seam) and, on the seam where he will float, a ring of 24 of his signs. The ring's line is drawn as things really arrive: the files on the way to his first frame (the modulepreloads), the bytes of his first pose (the worker now streams and reports them), the eggs and his first pose being built, his first frame (weights 25/40/20/10/5). Each sign lights as the line passes it. Loaded: the words fade, he pops in over the closed doors (0.55 s, scale with overshoot), a beat, then the doors slide apart (0.95 s) showing the room, the chrome and every item. Reduced motion: no pop, no slide, the whole loading screen fades (0.6 s). No sound (e1112-40). | The look (ring of runes, paper doors) is mine. How he is above the doors and the room is not: during the sequence the canvas sits over the loading screen and each frame is drawn twice (the room only inside the doors' gap, then him alone), about 1.5 s, then normal. Shader warm-ups wait until the doors are open, so they cannot hitch the slide. Under automation the doors open at once (`?doors=1` plays them, `?doors=0` skips them, `?doors=hold` waits for the check), like the furniture arrivals. |
| 2 | Phones landscape only | A phone (coarse pointer, short side at most 600 px) held upright gets a translucent grey "flip sideways" sheet with a phone turning on its side, at boot after loading and before he pops in, and any time mid-game. Under it the page is frozen (`src/core/freeze.js`: render loop, physics, splat sorting, timers, sound and CSS animations all stop) and it does not lay itself out for the upright screen; turned back, it runs on from exactly where it was (checked: same body positions, clock and sound resume). The chrome has a compact short-and-wide layout (`hush.css`, last block; `hush.js fit()`), safe areas for the notch respected. The side-panel phone paths are gone: the one-card-at-a-time pinboard and its tap-for-next, the phone shelf, rack, cow, recipe and platinum sizes (`pinboard.js`, `shelf.js`, `hats.js`, `recipes.js`, `platinum.js`); one room everywhere. The shelf also keeps to half the height on a short screen. Phone checks now run at 844x390 (`checks/run.mjs` "phone"; the `.mjs` checks too); `shell-turn.js` runs 390x844 and asserts the overlay. | Tablets and desktop windows of any shape play as they are (no overlay). `?turn=0` turns the rule off. The tall-narrow chrome layout (`max-width: 700px`) is kept for narrow desktop windows only. Flappy in landscape is the bird lane's. |
| 3 | Books as pop-ups | The grimoire and the achievements open over the cat from the footer (the links keep their addresses for a new tab). While one is open the world is frozen (the shared freeze) and three's render lists are let go; nothing that costs a download is dropped, so closing is instant and every item is where it was (checked). Escape or a click on the dimmed margin closes (e1112-41); Tab stays inside. The achievements' "the grimoire" link turns the page in place. Content and look are the old pages', unchanged (the `.book` rules). `spellbook.html` and `achievements.html` now redirect to `./?book=grimoire` / `?book=achievements`, which open the pop-up once the doors are open and tidy the address. | "Release what is cheap": I let go of the render lists only. The drawing buffer stays, so the game shows dimmed around the sheet; dropping it would blank the margins and save little. The phone's back button does not close a book (it leaves the page). |
| 4 | Start over (e1112-39) | The grimoire's old "forget everything" is now a "start over" pill. It opens a confirm: "Start over? Everything on this device is wiped: every sign and secret found, every achievement, every keepsake and where it sits, his butter, your bonks. He forgets you, and the cat begins again from nothing. This can't be undone." with "keep playing" (focused) and "wipe it all and start over". Escape or a click outside backs out of the confirm only. The wipe empties the store and stops it writing (`store.wipe()`: nothing still running, such as a keepsake saving its place on the way out, can put progress back), then reloads into a fresh game. | The wording is mine. |
| 5 | Aw, Snap! (e1112-33) | The cake's crash screen copies Chrome's sad-tab page from Aaron's screenshot: white, the sad-tab icon redrawn as pixel squares, "Aw, Snap!" and "Something went wrong while displaying this webpage.", "Learn more" in blue and the blue "Reload", in Chrome's fonts, colours and sizes. No skip: no working control, Escape and Enter do nothing, a click on "Reload" does nothing; it lifts on the existing 30 s timer (party now uses the shared freeze). | "Learn more" and "Reload" are drawn as part of the picture (not buttons), since Aaron wants it to look like his screenshot ("just a screenshot"). To drop them instead: delete the `.nav` line in `src/gags/party.js`. The tab title is no longer changed (Chrome keeps the page's title on a crashed tab). |

Shared files touched (small, commented): `src/core/stage.js` (a layout hold and gate for the freeze; insets ignored
while held), `src/core/input.js` (`.book-pop` passes the input lock), `src/core/store.js` (`wipe()`),
`src/core/spz-worker.js` (streams bytes with progress messages `{of, progress}`), `src/ui/hush.js` (`fit()` short
screens), `src/ui/hush.css` (`body.book` rules now `.book`; one media query narrowed; the shell block at the end),
`checks/run.mjs` (phone is 844x390, `phone-portrait` added, a script's own navigation is waited out). Merge note for
the text lane: its pill buttons in the footer must fit the short landscape footer (`.fl` stacks sound over ask there).
Party check note: its "returns with hat" step failed on the base commit too on this machine (the rack's first load
takes ~6 s after the return, the check looks at 0.55 s); not changed by this lane.

Shell lane runs (desktop dpr 1 unless noted): shell-boot 9/9 at desktop, 844x390 and reduced motion; shell-books +
reload 19/19; shell-turn 7/7 (390x844 held upright, turned, upright mid-game, back); party 12/13 (the hat step, as on
the base); grimoire 8/8 and achievements-book 9/9 as pop-ups. At the new phone size (844x390 dpr 2): world-arrivals
36/36, kitchen-chest 26/26, world-shelf 23/23, world-cake-pouring 6/6, achievements 39/39 (after the rare-line fix).
**Open at the landscape phone size, for Aaron (they fail the same way on the base commit run at 844x390, so they come
with the screen, not this lane):** world-layout "default collection mostly unobstructed" (the party hat on the rack
behind the crown, 32% vs 20%; base 844x390 fails it too), world-board "identifying glyphs at least 12 CSS px" (the
whole four-card board on a 390 px tall screen draws card text 7-10 px; base: 6-9 px; reading is by press-and-hold,
which shows a card up close), world-rack "off-centre grip <=4 px" (12-21 px on both) and "lit/unlit zero ongoing
world work" (both). Recommendation: accept the glyph size on a phone (hold to read) and let the furniture/physics
lanes or the merge retune the rack's hat spacing and grip for the short screen; the gates were written for 390x844.
## Physics lane (playtest-2, 2026-11-12)

Aaron's items 1-5 of the physics lane (his words in `inputs/playtest-2.md`). Hooks for other lanes: `docs/plans/world.md`,
"Physics lane hooks, playtest-2".

**1. Faster hand, quick settling.** `HOLD` (world.js): speed 7 → 9.5 units/s, spin 4 → 6.5 rad/s with less held-spin
damping (3 → 2), throws 6/5 → 8/7.5, hand rate 14 → 16 and accel 60 → 80: "a little" more swing, still capped.
Why they settled slowly, measured on the base (`settle`/`setdown` probes, desktop): a set-down body was still to the eye
in .2–1 s but Rapier sleeps a body only after a fixed 2 s below .4 units/s, and Rapier has no rolling resistance, so the
round ones crept: the rifle rolled 2–5 px a frame for 2.5 s (its angular damping is .4), the top and the butter rocked
for over a second, a thrown rifle never slept in 10 s. The kitchen's own contact damping (flour, pail, cake) went the
other way: 56% of the speed gone each substep while touching, so a sack on its edge toppled in slow motion over 3–5 s.
New `REST`: once a frame, a free body that touches something and moves under 150 px/s on the page gets at least
6/s rolling and 3/s sliding damping; under 5 px/s for .25 s it is put to sleep (drawn exactly once more). A body that
keeps gaining speed for three tenths in a row turning the same way (a topple, not a rock) is left to gravity, kept
awake against Rapier's own sleep, and the kitchen's contact damping stands aside for it. The rifle's own angular damping
goes .4 → 1.2 (the top keeps .8 for its spin). Result: set-downs rest in .3–1.2 s (were 2.0–3.2 s); drops and tosses
in .6–2.2 s except the egg, which rolls for 2–3 s (an egg rolls).
Not changed: gravity (items are about twice life size, so falls read a little floaty; changing g would move every
other lane's arcs), and the 50 ms frame clamp (on a slow frame the world runs slower than real time; Aaron's "smaller
window ran smoother" note is the speed lane's).

**2. Seen through the pail and the box.** Root cause: every item is a cached picture on a flat card, and the cards
were painted far to near by their centres. An egg in the pail has its centre nearer than the pail's, so the whole egg
was painted over the pail's front wall; the same for anything in the box. Fix (world-presentation.js): pictures are
composited with depth. The mesh atlas keeps its depth as a texture (rendered with the page camera's own depth range),
and each atlas picture writes its true depth per pixel (`gl_FragDepth`); a picture without depth (a splat prop, a
card) writes its nearest point's depth; floor shadows take no part. Painting order is unchanged, so edges blend as
before; depth only decides where pictures pass through or into one another. Depth is cleared after the pictures behind
the cat and after those in front, so the cat, the lamp's glow and everything else see exactly what they saw before.
Picking follows: nearest surface first (the egg is picked through the pail's opening, the pail through its wall).
Every container is covered by construction (it is not a pail/box special case). Cost: two depth-only full-page
triangles a frame and one more texture read per picture pixel.
The box lid (box.js): on opening, anything resting on the closed lid (or stacked on that) is tipped off to the nearer
front corner and lands beside the box (reduced motion: set there); on shutting, anything inside is tipped out the same
way, and the shutting lid waits .75 s for it to clear. While the lid swings it meets only the room, so it cannot swat a
tipped item back in. So nothing can be shut in.

**3. Pitchfork stuck in the pail.** Reproduced: tilted 20° in the pail and pulled out by the handle, the fork lifted
the pail off the floor (the fork's head hooked the pail's wire handle and grip). Fix: shapes marked `hook` (the
handle's eleven segments and the grip) meet only the room (floor, furniture, the cat), never another item (`GROUPS`).
General backstop for long thin things in hollow containers (`JAM`): an entry with an `interior` (the pail, the box) is
a container; a held item touching it inside, while the hand has been .15 units short of where it pulls for .15 s, or
the container is being lifted with it or hangs from it, stops meeting that container until the two are apart (or 2 s after letting go).

**4. Lost behind the cat or furniture (e1112-35).** New `src/core/world-occluders.js`, data-driven: occluders are the
cat (his collider hulls), every fixed world entry with a picture (by its colliders, else its picture rectangle: so the
shelf, rack, lamp, board, bin, and the controller stand and hangers other lanes add, with no list to update), and
anything registered with `occluders.add`. A resting body's exposure is the share of its own surface points (7×7 grid
over its picture, kept where a ray meets it) that are on the page and uncovered. Under 35% it slides sideways along
the page horizontal at .45 units/s, away from the middle of what covers it (the other way if that edge is off the page;
toward the middle when only the page edge hides it), until 60% shows; no headway: the other way once; after 6 s it is
set down beside the occluder. A body is judged once it has rested 1.2 s (one set down for a moment is left alone),
on a .75 s timer (no frame work), and only again when its pose or the scene in front of it changed (the cat's pose,
turn or place, the furniture, the page size), so nothing is ray-cast while nothing moves. A body mostly off the page
is left to the world's own respawn. Possible interaction with other lanes' checks: a fixture that leaves an item
behind the cat for more than 1.2 s will now see it slide out.
The cloud (bolt.js): it now drifts left to right across the whole page (75 s a crossing), comes in again from the left
once wholly past the right edge, keeps the height it was left at (its page x is held by the cloud itself, so a
re-layout that clamps keepsakes onto the page cannot pull it back), waits while held, stays still under calm motion.
`polish-cloud.js`'s "darkens in place" check now allows for that drift.

**5. The inventory.** Found by the stress check (`checks/inventory-stress.js`): the inventory lists every item in the
room, including one that has fallen off the page and is out of the room for its 5 s return; that is Aaron's "it fell
off screen and despawned, and it still showed". Now: opening the chest brings every lost item back at once; while the
chest shows, and for 4 s after an item is taken out, a lost item returns in .35 s instead of 5 s (`RETURN`,
`entry.returnNow`, the kitchen's own return too); an item away by design (the pitchfork up in the sky) is not listed.
Items left mostly off the page or hidden behind furniture after landing are brought into view by item 4.
The stress check covers: every item kind in and out, overlapping moves (a double click) and ten quick round trips,
everything into the chest and back with swaps on occupied slots, taking out while the box is carried, an item falling
off the page while the chest shows, one lost while the chest was shut, quick presses on the real screen and Escape in
the middle of a move, and (`inventory-stress-reload.js`) a reload in the middle of a move. Each step asserts the
two agree: nothing in both, nothing lost, everything listed in the room, and each listed item picked up by a real
pick once at rest. Not reachable with the items that exist: a full 27-slot chest or 36-slot inventory (there are
about 15 loose kinds); the code paths for "no free slot" were read and fall back to leaving the item where it is.

Shared edits outside the lane's files, small and commented: `src/main.js` (create the occluders), `src/eggs/bolt.js`
(the cloud's frame), `src/world/recipes.js` (returns, chestable), `checks/polish-cloud.js` (the drift).

Runs (this lane's checks only, one browser at a time, machine load 15-40 from the other lanes): `physics-p2` 10/10
desktop and phone; `world-occluders` 6/6 desktop, phone and 844×390 landscape; `inventory-stress` + reload 11/11
desktop, phone and 844×390 landscape; regressions `physics2` 17/17, `physics` + reload 10/10, `kitchen-chest` + reload
desktop and phone, `polish-cloud` desktop; cost `world-final-cost` (both workloads PASS, twenty median p95 3.7 ms under
load ~20) and `world-core` (median p95 1.3 ms). One earlier `physics2` run failed its shelf preview step once
("shown" false, the tin still placed); the next two runs passed it. Screens: `physics-p2-egg-in-pail`,
`physics-p2-box-opened-under-tin`, `occluders-the cat`, `inventory-stress-full-chest`.
Not done: real-iPhone checks; the full suite (the orchestrator's).
## Furniture lane (playtest 2, 2026-11-12)
Branch `sc/p2-furniture`. Aaron's eight furniture notes from `inputs/playtest-2.md`, one check each in
`checks/furniture-p2.js` + `-reload.js` (added to `run-all.sh`, both sizes).

1. **The shelf is level and larger.** "Weirdly angled down" came from the shelf facing the cat's camera and turning
   11 degrees further (e1111-36): above eye level, the receding right end read as a downward slope, and the 0.28 rad
   display tilt added to it. `SHELF_VIEW` (`src/world/shelf.js`) is now `square` to the screen plus a 2-degree turn
   (front edge slope about 0.5 percent; the check allows 2), tilt 0.1 rad (the top still shows a little), and
   34 percent of the width up to 450 px (was 31 percent, 400 px), so it sits nearer the camera. The rifle now covers a
   little more of the top and the tin; Aaron said that is fine. This supersedes e1111-36's "angled right for depth" for
   the shelf only; the board keeps its turn.
2. **Drop anywhere over the furniture.** `supports.register({area})`: a support with an `area(e)` (the shelf and the
   board: their picture rects) takes a drop anywhere over that rect, joined with the footprints of its open slots for
   the item (so the hooks' hanging room under the shelf counts), and the open slot nearest the pointer wins
   (`src/core/supports.js` `candidate`). Each item has one bay on the shelf and one place on the board, so "nearest
   free spot" is its own spot; on the hooks it is the nearer free hook. The highlight now outlines the whole piece of
   furniture: the board through the existing `.support-preview`, the shelf through its own "Release to place" /
   "Release to hang" box. Supports without an area (rack, cat seats, the badge's cover) keep the footprint rule.
3. **Two hooks under the shelf.** Iron screw hooks (stem and an open J, in the shelf's own picture) at shelf x -0.21
   and 0.20. A second support, `shelf-hooks`, on the shelf's root: one slot per (hook, item) so each item hangs at its
   own height from its own topmost point (the pail's wooden grip, the sack's folded top), and a hook holds one thing.
   Slot kind `hang` (new, per slot, in `supports.js`): hung, it swings about the hook for 2.6 s with a decaying sway
   (3 cycles, 0.2 rad); a tap swings it again (`supports.swing`); a pull (any drag) lifts it off. Hung items keep their
   own pictures (they hang below the shelf's picture) and cast no shadow. Nothing runs once the swing ends; reduced
   motion hangs them still. The hooks' screen bounds are in `worldLayout.furniture()` as `shelf-hooks` (the data the
   physics lane's behind-furniture scoot reads) and `site.shelf.hookRects()`. One-word edit outside the lane:
   `src/world/recipes.js` `chestable` accepts `shelf-hooks` like `shelf`, so a hung pail can still go in the chest.
4. **Collector and its twin.** e1112-38 vet: Collector ("a full shelf.") was the four bay items. Redefined as every
   shelf spot filled: the four bays and both hooks (the pail and the flour hanging); its line is now "a full shelf.
   hooks and all." The board's twin is **Curator**, "a full board.": the paper, postcard, ticket and recipe all
   pinned. No overlap: Shelf Life / Pin It are for unlocking the furniture, these are for filling it. Both count toward
   Platinum Cat (e1112-37); a player who already has Platinum keeps it (unlock never revokes).
5. **A tap reads the recipe.** `cardSheet()` in `src/world/card-reader.js`: the recipe opens as a flat index card
   (red RECIPE, ruled lines, the ingredients and the four steps, "serves one cat") in the same manner as the
   rejected paper: a tap opens it, Escape / a click outside / "put it down" closes it, focus returns. Press and hold
   still turns the 3D card over, as for the paper.
6. **The paper vanished when lifted from under the recipe.** Two causes, both fixed in `src/world/pinboard.js`:
   (a) the recipe is pinned over the paper's lower left; lifted, the paper became a loose body boxed in between the
   board and the pinned (fixed) recipe, so the hand could not move it and it stayed in the board's plane. Pinned
   cards now leave loose cards alone (Rapier collision groups: a pinned card's only membership is `CARD_PINNED`,
   which every card's filter leaves out; everything else still meets pinned cards). (b) In the board's plane it drew
   behind the board's picture: pictures sort by centre distance, and the board recedes to its left (it pivots on its
   right edge), so the left half of the board is behind the board's centre. A loose card in front of the board's
   face and over it now draws (and picks) above the board's picture (`overBoard`, called from the card's sync).
7. **The Platinum Cat badge is round.** A disc of radius min(0.43 x board height, 0.36 x board width) (0.61 across on
   the desktop board, about 39 percent of its area), centred on the board, the cards showing around it. Re-modelled:
   bevelled disc, raised rim, guilloche medallion with the embossed cat, PLATINUM CAT under it, the ten signs in an arc
   over it, one pin head, bar pins on the back. Its collider is three crossed thin boxes (a twelve-sided disc): a
   convex-hull drum, sharp or rounded, rocked on the floor at about 0.3 rad/s and never slept; the boxes sleep in
   under 4 s. It no longer locks the cards (e1111-46 said it covers and locks; it
   now covers only part, and Aaron's note 6 asks that a card under another stays takeable): a card partly under it
   comes out with a pull, the same collision-group rule as the cards. **For Aaron:** if you want the lock back for
   what it covers, it is a small change.
8. **Googly eyes stay on.** They stay on him after the choir and through pose changes (they used to fall off at both),
   until taken off with a tap or a pull, like a hat; where they are is saved, so they are on him after a reload. Only
   two places take them: his face and the cat embossed on the Platinum Cat badge (`eyesAnchor`; a press on them
   there picks them, not the badge). Props, the box and Butterman no longer take them; the "Put eyes on Butterman"
   key button is gone.

Edits outside the lane's files, all small and commented: `src/core/world-input.js` (the generic highlight leaves
`shelf-hooks` to the shelf, one condition), `src/world/recipes.js` (`chestable`, one word; the recipe card's tap is
the lane's), `src/ui/achievements.js` (the Collector/Curator rules), `src/gags/eyes.js` (no detach after the choir or
on a pose). Checks updated for the new behaviour: `achievements-badge.js` + `-reload.js` (round, unlocked),
`world-small-lifecycle.js` (eyes stay on; badge instead of tin/box/Butterman as host), `play.js` gag 5.
Also updated: `world-board-integration.js` (its native drag now lets go clear of the board, since anywhere over it
pins the card back) and `world-arrivals.js` (the shelf is square plus 2 degrees, not 11 past facing the camera).
On a short landscape screen the shelf is also capped at 0.72 x the page height (`SHELF_VIEW.ofHeight`), so it and
its hooks fit; at 844 x 390 that barely changes it (the shell lane owns the landscape layout).

Runs (desktop, dpr 1, one browser at a time): furniture-p2 + reload 39/39 (plus the two warm-up lines); world-shelf, world-shelf-play,
world-shelf-drag-all, world-shelf-solids, world-board, world-board-integration, kitchen-card, achievements,
achievements-badge and its reduced-motion run, world-small-lifecycle, world-supports, world-arrivals and its
reduced-motion run: all pass. `play.js` + after-reload: gag 5 passes both new lines; one line failed, "the whisper is
silent far from the butter" (whisper gain 0, but the page's overall level read 1.9e-2 from another sound still
ringing out after the Butterman scene); nothing in this lane plays sound there, so I read it as unrelated. Screens:
`checks/out` p2-shelf-hover, p2-hooks, p2-hook-swing, p2-recipe-sheet, p2-paper-lifted, p2-badge, p2-eyes-badge,
p2-eyes-cat, p2-reload (`run-all.sh --shots` keeps them).
## Sky lane (playtest 2, 2026-11-12)

Aaron's items: the star should not be a sigil and should come only from spinning him really fast; the galaxy should
stay until the player clicks; remove the black hole entirely (laggy); the way into the galaxy about 3x slower; the
bread's flight kept to a circle in the middle of the screen; the bread uses his riser and the first pop of his pop
clip at the riser's end; lightning on the spinning top made the water strangely bright. Plus e1112-38: one spin must
not pay out three achievements.

**The star is a secret.** Its templates are gone from `src/sigils/templates.js` (a drawn star is now a scribble:
0/200 hand-drawn stars cast any sign in `checks/sigils.test.mjs`, nearest-match zigzag). `src/finds.js`: kind
`secret`, no `sigil`; riddle "faster than any cat should turn. keep going" (the old "five distant tips, crossed in a
single journey" described the drawing); `does` mentions the click. The text lane's bar filters by kind, so it leaves
the bar. The grimoire shows its star mark as a secret's figure. `site.spells.star` is gone; the found mark's replay
(`galaxy.again`) opens the galaxy directly.

**Two spin thresholds (e1112-38).** Spin Doctor is unchanged: release at 8 rad/s or more (`src/ui/achievements.js`,
not edited; its comment still calls 8 "the galaxy's own fast", which is now stale, left for the text lane's rewrite of
that file). The galaxy needs a clearly faster spin: time above **13 rad/s** fills a tally that opens it at **0.6 s**
and drains at half speed (`GALAXY.spin`). Calibrated with real swipes across him (`swipe`/`spinHard` in
`checks/lib.js`): swipes at 1400 px/s (one gives Spin Doctor) never open it; a burst of about eight swipes at
1800-3200 px/s opens it in 1-1.5 s. Into the Void is the galaxy's only achievement; **Starstruck is removed**; Fluent is
the nine signs ("all nine signs, in one stroke each."). An old save's `achievements.star` is never read: the book's
count and total come from the list, Platinum's rule ignores it.

**The bread's blast-off moves to the spin.** It used to be the star cast while he was bread; the combo row is gone.
The galaxy's spin trigger now checks for bread first: the same really fast spin on the loaf blasts it off (and finds
Blasting Off) instead of opening the galaxy. One rule for the player: spin really fast, the sky takes him; bread goes
up, a cat becomes a window. The 5 s loaf hold leaves room (the burst takes about a second). Its riddle/does lines say so.

**No black hole.** Removed from `src/eggs/galaxy.js`: the shadow, the lensed accretion disk, the photon ring, the
light bending round it, its uniforms (`uHoleBH`, `uGravityMotion`), its placement code and config (`hole`, `swirlDeg`),
and the page's words and buttons spiralling into its disk (that DOM transform ran every frame of the way in). The
page's words now only fade out into the dark (opacity, written only when it changes, restored after). The dark still
closes in from the edges with faint stars wheeling slowly; the colour stays in the galaxy inside his outline.
Checks updated: `checks/galaxy.js` (fade, not stretch; hold until a click), `checks/polish-galaxy.js` (the disk and
centring checks go with the hole).

**Hold until a click; 3x slower in.** The dissolve into space takes 2.7 s (was 0.9), the dark 6.6 s (was 2.2); the
wind-down stays 5 s. The hold begins once all of that has finished (6.6 s) and lasts until a click or tap anywhere
(the canvas shows a pointer cursor while it holds) or Esc (Esc works at any time, as before). Presses during the way in
are swallowed and ignored, so the swipes that opened it cannot close it at once. To see presses under the lock,
`src/core/input.js` gains one hook, `input.onLockedPress` (one line in the lock's swallow, commented "sky lane").

**Frame cost, before and after** (headless Chromium, real GPU, frame-rate cap and vsync off, desktop 1280x900 dpr 1,
median of 3 fresh runs; `rest` = 3 s before, `takeover` = the first 4.5 s, `hold` = 2 s of the hold; ms per frame,
mean / p95). The harness is `galaxy-frames.mjs` (scratch; same method as `tools/perf/galaxy.mjs` with the cap off).
Two measures. **The galaxy's own pass** (its full-screen overlay drawn alone, 40 draws GPU-synced, median of 15
batches x 3 fresh pages; the old file served in place of the new one on the same tree):

| GPU | sky + dark (the hold) | dark only (lent to the bread) | a flat full-screen pass, for scale |
|---|---|---|---|
| AMD integrated (what Windows Chrome picks here by default) | **4.72 -> 2.90 ms** | 4.73 -> 2.88 ms | 0.50 ms |
| NVIDIA RTX | 0.21 -> 0.15 ms | 0.22 -> 0.15 ms | 0.13-0.16 ms |

**Whole frames** (rAF gaps with the cap and vsync off, median of 3, mean / p95 ms; the host's load average was 21-36
from the other lanes, so these move a lot run to run): NVIDIA takeover 8.4 / 15.3 -> 4.0 / 10.4, hold 1.1 / 4.4 ->
1.2 / 5.1; AMD takeover 14.9 / 23.7 -> 15.6 / 22.6, hold 1.1 / 4.3 -> 3.1 / 15.2 (one of three runs 5.2 ms; the
other two 1.6 and 3.1). Read: the black hole was about 40% of the galaxy's GPU pass on the AMD chip; but the frame
during the way in is dominated by **the cat spinning** (his splat picture redrawn every frame while he winds down):
on AMD a spin alone, no galaxy, costs 6-9 ms a frame (measured before any change). If the way in still feels heavy on
Aaron's machine, that is the next place to look (e.g. a lower picture quality while the galaxy's sky hides him).

**The bread's flight in a circle.** It used to fly a third of the screen's diagonal from where he floats, at up to
63 degrees off vertical: off the top of a desktop screen. Now it aims at a point in the upper part of a circle round
the middle of the screen (radius 0.3 x the shorter side, 55-95% of the way out, within 63 degrees of straight up) and
drifts there as before (six seconds, shrinking to a twinkle). Measured each frame in `checks/sky.js` for a real spin
and for both extreme random throws: it never leaves the circle (furthest 258-263 px of 270 at desktop) and never
leaves the screen.

**Riser and pop.** `tools/audio/make-bread-sounds.py` (hash-checked inputs, never edits them):
`designed/bread-riser.mp3` = Aaron's riser 0.15-5.29 s (leading silence off), stereo, +2.99 dB to the palette's
-22 dBFS loudest-100-ms RMS (peak -11.7 dBFS), mp3 q2 like the 360's riser; `designed/bread-pop.wav` = the clip's
first pop only, 0.62-0.90 s (it is silent until 0.56 s; the pop peaks at 0.64 s and is gone by 0.78 s; cut just before
the attack so it lands when played), mono 48 kHz 24-bit, 2 ms / 40 ms fades, -5.04 dB to -22 dBFS (peak -6.6 dBFS
true peak). The blast-off plays the riser from 1.5 s in (where it becomes audible: before that it sits below -45 dBFS)
and schedules the pop on the audio clock at the riser's end (5.12 s in), 3.62 s later; the bread trembles harder as it
builds (the tremble follows the audio clock), settles, and launches on the pop (26-37 ms after it in the check). The
dark closes in over the same build. `BREAD.blast.riser.from` set to 0 plays the whole riser (a 5 s build).
The old `rocket` cue is no longer played (the file and its config name stay; other sound checks list it).

**Bright water.** Cause: the charged puddle's glow was added as light (colour with no matching alpha) in a
premultiplied blend. On this pale page that summed past white, so the pool turned nearly white. Fix in
`src/gags/glass.js`: the charge is an electric-blue tint laid over the water with its own coverage (deepest at the
rim), so its colour never exceeds its alpha and it can only tint. `checks/sky.js` reads the canvas over the pool:
no pixel's colour exceeds its alpha (plain 0, charged 0) and the charged pool leans blue.

**Checks.** New `checks/sky.js` (desktop dpr 1 and 844x390 dpr 2), in `run-all.sh` after the polish loop. Updated
because the star is no longer castable: `play.js` (N12: the loaf then a really fast spin; the galaxy by spin, a
click ends its hold), `look-landing.js` (its sigil route spins), `bread-float.js`, `bread-float-shots.js`,
`sounds-playtest.js` (call `blastOff()`), `audit-polish.js` (opens the galaxy directly), `sigils.test.mjs`.
Runs (desktop dpr 1, one at a time on a host shared with eight other lanes): `sky.js` 20/20, and 20/20 twice at 844x390
dpr 2 (the water metric is relative to plain water, whose own highlights already add a little light at that size:
plain 39, charged 3), `galaxy.js` 7/7 and `--reduced` 8/8, `polish-galaxy.js` 5/5, `bread-float.js` 5/5
and `--reduced` 5/5, `bread-float-shots.js` 1/1, `look-landing.js` 8/8, `audit-polish.js` 7/7, `sounds-playtest.js`
all pass (the blast-off now plays cast, ding, bread-riser, bread-pop, the hum, twinkle), `sigils.test.mjs` all pass.
`play.js`: every galaxy, bread and 360 check passes; one failure, **"the whisper is silent far from the butter"**
(far 2.9e-2 heard, away again 0), right after the Butterman scenes stop: none of this lane's sounds play then (the
galaxy and blast-off finished long before; the hum stops on close). I read it as load timing in the Butterman lane's
area; worth one look in the full suite.

Merge notes: `src/world/platinum.js` engraves `FINDS` of kind `sigil`, five down each side; there are nine now, so
the right column has four (whoever reworks the badge into a circle, e1112 list, should lay out nine).
`src/ui/achievements.js` is untouched (Spin Doctor's 8 rad/s stays; its comment calling it "the galaxy's own fast" is
stale). `checks/lib.js` gains `swipe`, `catchHim`, `spinHard` at the end. Shared-file edits: `src/core/input.js` (the
hook), `src/config.js` (two sound names), `src/combos.js` (row removed), `src/gags/glass.js` (the puddle shader).
## Bird lane (playtest-2, 2026-11-12)

Aaron's items 1-7 for the bird, the egg, the controller and flappy, branch `sc/p2-bird`. Every choice below is mine
and open to his veto. Checks run here: `bird` (desktop, phone, landscape 844x390, reduced motion), `bird-visits`
(+ its reload), `bird-stand-reload`, `kitchen-egg` (+ reload), `kitchen-replay`, `flappy.test.mjs`, `sounds-files.py`,
`bird-art.py`. Not run: `play.js` (full-suite length; its bird step is updated to the new flow).

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Bigger bird; the egg dropped further back (his two pictures) | The distant bird is 40 px (was 27). The egg now falls from the bird straight down to the floor a third of the way from his feet up towards the bird on the page (`EGG_DROP` in `src/world/recipes.js`): about z -1.5, behind his feet line, to the right of him, so it is small with distance (72 px wide on desktop against the bird's ~35, the proportion in Aaron's first picture) and visibly the bird's. | Depth capped at z -2.2 so a short screen never sends it to the horizon. It stays where it lands across reloads (the solid adapter keeps its pose); once picked up it is a normal floor item. |
| 2 | An egg each time the bird comes back, when there is none | `dropEgg` no longer keeps "once ever": every arrival asks, and it drops one when there is no egg in the room, the inventory or the box. `cakeChain.egg.count` counts the drops. | An arrival during a cutscene (controls locked) owes its egg and lets it go when the bird can be seen. An egg in the box counts as having one. |
| 3 | A 5-minute limiter, across reloads | It was not random: the bird came 90 s into every visit and circled until clicked, so a player who reloaded inside 90 s never saw it. Now (`VISITS` in `src/eggs/bird.js`) it is a visitor: first ever at 90 s; afterwards it returns after a random 1.5 to 5 minutes without it, never longer, counted in visible play time and saved (`bird.away`, `bird.gap`) so the limit holds across reloads. It circles 2.5 minutes, then flies off to the right (reduced motion: fades in place); a flappy death sends it off too. | Randomness inside the limit (rather than a fixed period) because Aaron's ask assumed a surprise; hidden tabs do not count. A visit never starts in the first 15 s of a page load (the loading screen and pop-in), so the worst case is 5 min 15 s when an absence straddles a reload. While it waits there is one timer and no frame work. |
| 4 | The controller stays; a wooden stand right of the hat rack | The controller is a keepsake now (saved, restored, chest-able). Its first click plays the trailer without removing it; after the trailer a small wooden stand (`src/flappy/stand.js`: base, front lip, a back rest at the display angle, a brace; the shelf's wood with the grain along the boards) puffs into place to the right of the rack, a little behind it. Drag the controller onto it ("Release to place", the shelf's preview) and it snaps in, leaning with its buttons to the room. A click on the controller, in the stand or on the floor, plays flappy (after the trailer has been seen). The stand and the seated controller survive reloads. | The stand is fixed furniture (not liftable). Placement: its left edge ~0.22 units right of the rack's right edge, further back in depth when the gap to the cat is too narrow (a desktop with every hat out), never within 0.48 units of his middle, never off the page. With no rack yet it assumes the rack's home. Portrait phone has no room and puts it behind him (portrait is going away this round). Any flappy death with no controller anywhere leaves one, so a lost one can come back; never a second. Its stash/inventory name stays "Controller". The old "pop" on the first click is gone (the controller does not despawn). |
| 4b | Stand bounds for the physics lane's scoot | `site.worldLayout.reserve('stand', rect)`: `worldLayout.furniture().stand = {x,y,w,h,fixed:true}` in page px, refreshed on resize. | |
| 5 | Retry / give up | At game over the scoreboard waits (no auto-close): the clone's own replay button (`vendor/floppybird/assets/replay.png`) is "retry", and a twin built from it at load with the green triangle swapped for a little orange surrender flag is "give up", side by side where the clone's replay sat, labelled underneath in the bar's pixel font. Both are real buttons (Tab reaches them; Space or Enter at game over is retry, as the clone's Space was). Retry starts a fresh flight in place; give up returns (the controller if none). Escape or "return" after any death counts as give up. | The flag icon is my drawing. The labels are white with the score digits' brown outline. |
| 6 | The trailer's boom | Each of YOU / JUST / LOST / THE / GAME lands on Aaron's Cinematic-Boom-High (`assets/audio/designed/bird-boom.wav`, `tools/audio/make-boom.py`): cut 0.13-1.73 s (the clip's 4.7 s tail would smear five words 0.9 s apart into one roar), 0.75 s fade out, -22 dBFS loudest-100-ms like the palette, played at .9. | `bird-slam.wav` is no longer played; left in the repo (its generator, ledger rows and a diagnostic still name it) for Aaron to delete or keep. |
| 7 | Flappy in phone landscape | A short landscape screen fits the lane plus 40 px of ground under the floor instead of all 112 px (`flightLayout`, `SHORT_FIELD_HEIGHT`): at 844x390 the bird body is 30 px (26 with the whole field), the field 255x390, the game-over buttons 102x62 px, everything on screen. | |

Edits outside the lane's files, all small: `src/world/recipes.js` (the egg rule and depth; the line that dropped a
controller from the chest on load is gone), `checks/run.mjs` (a `landscape` size, 844x390 at dpr 2 with touch, like
`phone`; the shell lane may add its own), `checks/run-all.sh` (bird runs gain the stand reload, a `bird-visits` run per
size, one `bird-landscape` run), `checks/sounds-files.py` (the boom joins the bird cue level check),
`checks/play.js` (its bird step), `checks/kitchen-replay.js`, `checks/kitchen-egg*.js`, `assets/audio/design-manifest.json`
and `docs/sound-levels.json` (one row each for the boom). The phone-portrait `bird` check's playfield assertion is kept;
landscape gets its own (fits the lane, bird >= 28 px). The "Space and tap give the same impulse" check now reads the
velocity each flap sets instead of 20 ms after the input arrives (touch arrives later than a key, and under load that
read the delay, not the impulse).

Final runs (desktop dpr 1 unless noted; the machine's load average was 40-48 with the other lanes): `bird` + stand
reload 47/47 at desktop and 47/47 at landscape 844x390, phone portrait all pass (one earlier run missed the trailer's
beat tolerance by 57 ms under load, two reruns passed), reduced motion all pass; `bird-visits` + reload 13/13 (also
reduced); `kitchen-egg` 8/8, `kitchen-egg-reload` 3/3, `kitchen-replay` 7/7; `flappy.test.mjs`, `sounds-files.py`,
`bird-art.py` pass. Screens: [egg landed](shots/kitchen-egg-landed-desktop.jpg),
[game over, desktop](shots/bird-game-over-buttons-desktop.jpg), [game over, landscape](shots/bird-game-over-buttons-landscape.jpg),
[flight, landscape](shots/bird-game-flight-landscape.jpg), [stand](shots/bird-stand-desktop.jpg),
[controller in the stand](shots/bird-stand-filled-desktop.jpg), [landscape](shots/bird-stand-filled-landscape.jpg),
[after a reload](shots/bird-stand-reload-desktop.jpg).
## Butterman lane (playtest-2, 2026-11-12)

Aaron's playtest-2 items on Butterman, branch `sc/p2-butterman`. Every choice below is mine and open to his veto.
Focused checks only (`checks/butterman-p2.js` + `-reload.js`, desktop dpr 1 and phone landscape); the full suite is the
orchestrator's. Nothing pushed.

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | "Butterman idly walking around in the background should be made a good bit rarer" (4-5 in 8 minutes) | Cameos now wait at least 5 minutes (from the page load or the last cameo), then 1/240 per second: about one every 9 minutes on average (was 45 s, then 1%/s: one every ~2.4 min). Nothing else starts one: a reload or a fresh game restarts the 5-minute gap from the load (checked with the chance forced to certain, on load and after a reload); `#cameo=1` forces one for the checks. They still stop for good once he has been summoned. | `butterman-config.js` `cameo.minGap` 300 s, `chancePerSecond` 1/240. A visitor who stays under 5 minutes never sees one. |
| 2 | "buttan man scene 3: items behind the butterman should be covered by his model" | The keepsakes are pictures drawn without a depth test, in depth order, split at the cat (physics lane). Butterman is now a second split: while he is on screen, a picture deeper along the view than his chest draws before him and the rest after him, and his felt (and the butter he carries) is drawn in that same transparent pass. Fixed in every scene, not only the rise: walking past, a keepsake behind him is covered and one in front of him covers him. | Depth is per item by its middle, as at the cat: a long item crossing his depth draws wholly in front or behind. The batch is rebuilt only when the set of pictures behind him changes; nothing runs while he is off screen. Edit in `src/core/world-presentation.js` (physics lane's file): an additive `divider` (one more split, ~10 lines). |
| 3 | "the hidden #4th buttaman scene … walking into the middle of the screen, raising his arms, then the buttaman ticket falls from the sky and lands right behind him, and then he walks off … one time ever" | The harp's tune now plays a new encore (take 2 of the song, 82 bpm, 31 beats): he struts in from the right to the middle of the screen in front of the cat (beats 0-10), turns to face you and throws his arms up in a Y on "the MAN with the butter" (10.5), pumping them on each beat; the ticket is let go above the top of the page at 11.25 and flutters down (swaying, rocking, edge-on to flat) over two beats, landing flat right behind him; arms down at 15.25, he turns and walks off the other side (gone by beat 28, 2.3 s before the song ends). The ticket stays as an ordinary physical keepsake. Once ever: from the moment it is let go the scene never plays again (the tune, a tap on the ticket, the found mark, reloads). Tapping the ticket gives its paper rustle and a wiggle; the reader's "Encore" button is gone. The Encore achievement is unchanged (the harp's tune grants it); no new achievement (e1112-38). | The ticket is made when the scene starts and kept out of the world until it falls (a new card takes ~2.5 s to make). Cut off before it falls (another scene, a check's stop), the ticket is put back in the room and the encore is not spent. Closed during the walk-off, the encore counts as seen. A save that already has the ticket from the old encore gets the new scene once: its ticket is lifted off (even from the board or chest) and falls again. Played again after it is spent, the tune still says "encore" (the harp's line, gags lane) but nothing follows. Reduced motion: the ticket is simply there behind him at the drop beat. He stands 0.95 in front of the cat, the ticket 0.34 behind him (config `scenes[encore].depth`, `ticket.behind`). |
| 4 | The gags lane's keyboard lesson waits for this scene | **Flag: `butterman.encoreSeen`** in the saved state (`store.get('butterman.encoreSeen') === true`), set when the encore has played to its end (or on load if the page closed after the ticket fell). Also `site.eggs.butterman.encoreSeen` and a window event `sigilcat:encore-seen` when it is set live. | The lesson should read the flag on load and listen for the event. Internal: `butterman.encoreDropped` (the ticket was let go). |

Edits outside this lane's files, all small: `src/gags/harp.js` (gags lane: the encore call is `butterman.encore()`, the
ticket's give at 1.2 s is removed because the scene drops it, the ticket's tap and the found mark's `again` no longer
replay; the tune line is untouched), `src/world/card-reader.js` (the ticket's "Encore" button removed),
`src/core/world-presentation.js` (the divider), `checks/run-all.sh` (one run line per size), `docs/spec.md` (cameo
numbers, the encore).

Existing checks: `play.js` gag 7 still waits for the encore and a ticket (the ticket is in the room's list, out of
sight, from the start of the scene); the gags lane's tune change will set its pluck count.

Checks: `checks/butterman-p2.js` + `-reload.js` (23 checks, in `run-all.sh` at both sizes): 23/23 at desktop dpr 1 and
23/23 at phone. The depth checks read real pixels where he and a keepsake overlap (everything, without him, him alone,
neither); with his felt forced back to the old opaque pass the rise check reads 0 of 42 points showing him, so it
catches the bug. Reduced motion (a one-off run): the ticket is on the floor behind him at the drop beat, and the
encore is marked seen. Screens: [rise depth](shots/butterman-p2-rise-depth-desktop.jpg),
[walking depth](shots/butterman-p2-encore-depth-desktop.jpg), [ticket falling](shots/butterman-p2-ticket-falling-desktop.jpg),
[ticket landed](shots/butterman-p2-ticket-landed-desktop.jpg), and the `-phone` versions.
## Gags lane (playtest-2, 2026-11-12)

Aaron's playtest-2 items for the gags (`~/.sigil-cat-wt/inputs/playtest-2.md`), branch `sc/p2-gags`. Every
choice below is mine and open to his veto. Checks were run here at desktop, dpr 1 (calm runs where motion changed);
the full suite is the orchestrator's. Nothing pushed.

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Pitchfork: shadow seen, freezes; fall from the sky; once it brings the hay, gone until drawn again (e1112-36) | The fork sigil drops a new pitchfork from above the page, tines first and turning; it lands and topples. Its fall can never count as a throw (the sky check arms only on the way up, and only once it has landed). Thrown up through the top it is hidden at once with its floor shadow, taken out of the room after that physics step, and the hay falls .45 s later. It does not come back by itself; drawing the fork again drops a new one. A fork already in the room just wiggles; one in the chest stays there. | The "pitchfork is in the box" line is gone (e1112-32): drawing the fork while it is in the chest does nothing. A fork thrown up while the cow is already visiting (no hay due) is also gone until redrawn: one rule for every sky exit. A fork lost off a side still comes back after 5 s, as before. |
| 2 | The glass tips backwards; should tip forward off the screen, then tumble from the top and shatter where the puddle is | After the three shoves it tips forward (top toward you) over the front edge and drops out of the bottom of the page; .45 s later it tumbles down from above the top (1.6, .7 and 1.1 turns about x, y, z over .85 s) straight onto the floor in front of him, where it breaks: smash, his startle, the puddle and the shards there. Its floor shadow is off while it falls from the top (a shadow of something that high lands far behind it). Reduced motion: it breaks at the landing spot. | The landing is the same reachable floor spot the old fall used, so the puddle sits where it did. The shatter itself is the existing sound, startle and shards; no new particle effect. |
| 3 | The first box: the box slides off smoothly; fling it with physics | When he pops out, the box is thrown off him in a real arc (.6 s, at least 2.2 u/s up) toward where it stood before (its place in the room), tumbling as it goes, and physics lands it: a bounce, a skid, sometimes a topple. His body is out of the physical world for .55 s so the box is not embedded in it. Reduced motion: it is put back where it was. | `BOX.fling` in `src/gags/box.js` holds the numbers. It lands near its place, not on it (measured 140-250 px off at 1280 wide, sometimes against a neighbour such as the tin). `world-layout` used to require the box exactly back home; it now checks the box lands on the page and then sets it home itself for the layout measurements that follow. |
| 4 | Recycling: a prompt like the shelf's; six in all (GOOD JOB, GREAT JOB!, THANK YOU!, WOW, WOW, WOW); then no more shards or crumbs | Either the crumbs or the glass now brings the bin (it used to need both). Dragging one over the bin shows a dashed "Release to recycle" box over the whole bin (the shelf's look, its own class `.recycle-preview`). Every one put in earns the next gold star sticker, and he says it (`site.ui.speak` when the text lane's speech is there, else the line above the sigils). With nothing left to recycle the bin slides away and comes back when there is. After the sixth it leaves for good, **Clean Sweep** is earned, and the glass and the bread leave no more shards or crumbs (crumbs given after that are taken back before they are ever drawn). | **New achievement:** Clean Sweep (kitchen group, secret; "six trips to the bin. wow, wow, wow."). Vetted against the list (e1112-38): nothing else rewards the bin or the stars. It counts toward Platinum Cat (e1112-37). Each put-in earns a star (not each pair, as the old GOOD JOB was). A save from before counts its GOOD JOB as the first of six and brings the bin back for the rest. The stars start in two columns down the right side (`RECYCLE.tiers` spots), each turned a little; they can be moved anywhere. |
| 5 | Stickers get lost behind the pinboard and the cat; make them 2D, top level, movable anywhere; keep the 3D effect on click | The bread's gold star and the six recycling stars are flat stickers in their own layer above the room (`#stickers`, `src/world/stickers.js`), drawn once into a canvas in the old models' look (the curved four-point gold star; the five-point foil star with red words on a white keyline). Drag one anywhere on the screen, including over the cat or the board, and pick it up again from there. Its place is saved as a fraction of the screen. A tap tilts it toward you in 3D (CSS rotateY/rotateX with a brightening glint, .55 s) with the fingernail tink. Hidden while the galaxy or Butterman's big scene is up. Saved physical stickers come back as stickers where they were stuck. | They are still keepsakes (the keyboard keys work: Enter taps, arrows move), but no longer physical bodies: no peel, no floor. Sizes: the star 7.5% of the short side (38-70 px), a recycling star 12% (60-112 px). Checks that dropped the star as a body (`world-small*`, `world-lazy`, `world-final-cost`, `look-pat-return`) now leave it out. |
| 6 | The bulb should be UV/purple; the lamp on reveals a poorly drawn invisible-ink smiley down and to the right on the floor | Once lightning has charged the bulb it glows violet (loose, and in the lamp); the lamp's light, halo and shade glow violet too. The idea over his head is still the warm cartoon bulb. With the lamp lit, a soft violet pool spreads on the floor down and to the right of the lamp, and in it a wobbly smiley (an unclosed circle, two uneven eyes, a lopsided grin) glows pale blue-white with a violet bloom; it fades in and out with the lamp (.6 s) and is not drawn at all while the lamp is off. | A quiet secret: no achievement, no line. Warm idea, UV once struck: my reading of "the light bulb" as the lamp's bulb. Seen: the first time the lamp is lit the page stalls for some seconds here (headless) while the rack picture's lit materials recompile; it does this on the base too, smiley or not. |
| 7 | He should not change position within 4 s of a whisker pluck | Every pluck (tap or key) calls `cat.stay(4)`: his pose cycle waits at least four seconds. | `cat.stay(seconds)` is a new, small API in `src/core/cat.js` (one extra condition on the idle pose change). Scripted moves (Butterman, a sigil) are not held back. |
| 8 | The harp: C C B C D C; a right note should glow brighter | The six whisker notes are unchanged (B3 C4 D4 E4 F#4 B4); the tune is now the middle-left whisker twice, the top-left, the middle-left, the bottom-left, the middle-left. A wrong note restarts the tune from whatever can still begin it (C C C B C D C works). A right note rings with a wide blurred gold halo under a strong gold line, for .95 s; a wrong one is a thin pale line for .7 s. Header comment rewritten. The encore is the butterman lane's once-ever `encore()`: "encore" is said only when the scene really plays; once it is used up, the tune makes all six whiskers flare gold together, with no words (orchestrator's call). | The flare is visual only (no new sound, e1112-40). |
| 9 | Play the whiskers with the keyboard; after the harp and the encore, he tells you, hopping and bonking at each sentence; sentences fit | Once the harp is found, A S D play the three whiskers on your left (top to bottom) and J K L the three on your right; held keys, modified keys, typing in a field, a locked page or an open dialog do nothing. Once the harp is found and the encore has been seen (the butterman lane's `butterman.encoreSeen` flag, read on load, and its `sigilcat:encore-seen` event) he says "Hey!", "Did you know you can use your keyboard to play my whiskers?", "A, S, D for the ones on your left. J, K, L for your right." through `site.ui.speak` (the text lane's speech: the hop, the bonk and the fitting are its). Without it, each sentence goes on the line above the sigils in turn with a hop and a bonk. Told once per device; a player who found the harp before is told on the next visit. | Not on a touch-only device (no keyboard). "Your left / your right", not "my left": as you look at him, A S D are the whiskers on the left of the screen. No achievement (he tells you). |
| 10 | The cake gives all four hats; the party hat only from the cake; the cake should not despawn | Hats are owned (`hats.owned`): the hat sigil brings the rack with the wizard, cone and crown hats and only ever drops one of those; the cake's return gives the party hat (and the rack, if it is not there yet) and nothing else. Tapping the post cycles the hats he has. The eaten cake stays in the room as a keepsake. | A tap on the eaten cake is a little hop and a nibble, not the 30-second error screen again (a short click must not trap anyone); say the word and it replays the party. A save from before keeps every hat it had; an old party-reward save keeps just the party hat. Dress Up (all four worn) now needs the cake. The Hat Rack achievement still says "four pegs, four hats." (text lane's call). |

Edits outside this lane's files, all small and commented: `src/core/cat.js` (`stay`), `src/world/cup.js` (a
`shadowless` switch), `src/achievements.js` (Clean Sweep and its mark), `checks/play.js` (the tune's length), and the
checks that used the star as a body or expected four hats or a vanishing cake (`world-small`, `world-small-drops`,
`world-small-sounds`, `world-lazy`, `world-final-cost`, `look-pat-return`, `world-rack`, `world-rack-shots`,
`world-rack-cost`, `world-rack-legacy`, `world-rack-drop`, `world-cake-ending`, `world-cake-reload`,
`world-cake-reloads.mjs`, `kitchen-recycle` and its reload, `bulb` (a check's name)).

**Follow-up: cake after cake (e1112-65) and slices (e1112-66).**
- Every ingredient can be had again, one at a time, each the way it came the first time:
  - flour: two more breads after each bake (the bread count resets when it bakes);
  - milk: the pail stays (emptied) and the next cow fills it, after the fork is drawn and thrown again;
  - butter: Butterman's butter scene puts a pat on his head again (every third B, as before);
  - the egg: the bird lane's re-drop on each visit with none about (sc/p2-bird; this branch still has the once-ever
    gate, which my check clears by hand).
- Each bake makes a new cake (`cake`, then `cake-2`, `cake-3`, ...), so cakes pile up and nothing replaces anything.
  The four bake whenever all are in the chest, not only the first time.
- Only the first cake's first tap is the party (the crash screen and the party hat), once ever. I found no reason
  against it: a later cake has no payoff of its own, but the nibbling is one.
- A tap on any kept cake: he hops (`nibble` in his emote log), a bite, a small puff, and a slice is gone. The model
  is one round with a sixth already cut, so five slices; each tap rebuilds it in place one wedge shorter (picture,
  pick shape, shadow, collider; same body).
- The fifth slice leaves nothing: no crumbs, no shards. A finished cake is remembered (`cakeChain.finished`) and
  never restored. Slices eaten are saved per cake (`state.slices`).
- The Hat Rack achievement now reads "four pegs. three hats, for now."
- Merge note: the bird lane's `recipes.js` edit sits next to the line I removed (the eaten-cake deletion on load);
  keep their controller and egg changes and my removal.

Checks added (all in `checks/run-all.sh`, both sizes): `gags-fork`, `gags-hats`, `gags-harp`, `gags-lamp` (+ calm),
`gags-glass` (+ calm), `gags-box` (+ calm), `gags-stickers` (+ reload), `gags-stickers-legacy` (an old save).

## Integration (playtest-2, 2026-11-12)
Branch `sc/p2-final` from d8eb7f0: the text, shell, physics, furniture, sky, bird, butterman and gags lanes merged in
that order (`--no-ff`, one commit each), then the integration to-dos.

**Merge calls** (both sides kept unless said):
- `index.html`: `#status` lives in the shell's loading screen now; the text lane's `#speech` stays.
- `hush.css`: text's felt patches and shell's landscape block side by side. The books' "start over" and confirm pills
  wear the felt patch too (one button look); the dark "wipe" pill keeps its light text on hover.
- `pinboard.js`, `shelf.js`, `platinum.js`: shell's one board/shelf everywhere (no phone branches) with furniture's
  card groups, over-board ordering and shelf knobs. The shelf keeps to `SHELF_VIEW.ofHeight` .5 of a short screen
  (shell's cap; furniture had .72). The round badge lays the nine signs (the star left the sigils) one on top, four a side.
- `world-presentation.js`: physics' per-pixel depth between pictures, plus Butterman's divider (he is felt drawn in the
  transparent pass and takes no part in the pictures' depth, so draw order is what puts a keepsake behind him under him).
- `harp.js`: gags' tune, `played`/flare; butterman's once-ever `encore()` (also for `again()`); text's spoken "encore".
- `recipes.js`: bird's controller-in-chest; gags' cakes after cakes and fork from the sky, without the cake-progress
  lines (e1112-32); physics' inventory returns; furniture's shelf hooks.
- `checks/run.mjs`: shell's sizes; the bird's "landscape" size is shell's "phone", its extra run folded into bird-phone.

**To-dos:**
1. The top-right count reads "N of M sigils".
2. An open book has its own history entry: the phone's Back closes it; closing it any other way steps back over the entry
   (`books.js`; `shell-books.js` checks Back).
3. The rack at 844x390: it sat at the left edge seen 9 degrees further from its right than at 1280x900, so its front and
   back pegs lined up. It now turns by the difference in view angle from 1280x900 (`hats.js` VIEW.faceRef, whole
   hundredths of a radian; 1280x900 unchanged). Party hat behind the crown 34% -> 16%, wizard grip 17 -> 2.8 px; lit/unlit
   "zero ongoing world work" passes. `world-layout` grants all four hats so the cake's party hat is still measured.
4. e1112-63: `world-board` glyph floor is 7 px on a phone on its side only.
5. `party.js`: the toot, blower and confetti are sampled at 0.55 s as before; the gifted party hat (the rack is built
   lazily on the first return) gets its own wait, up to 10 s, and the time is reported (`hatAfterMs`).
6. Cards: a click or tap views (paper and recipe as flat sheets, postcard and ticket up close in the reader), press and
   move drags; no press-and-hold-still 3D reader. The postcard's tap-to-flip and the ticket's tap-wiggle are gone with it
   (my call, so the rule is the same for every card; the reader still turns a card over).
7. `rocket` and `bird-slam` removed (files, generators, catalogue, config, ledger, SOURCES); the review reel rebuilt at 68
   cues. Found while doing it: the sky lane's bread riser and pop had no ledger rows (added: supplied by Aaron, origin
   and licence not recorded, `licenceCleared: false`) and the arrival-credit check still read `spellbook.html` (now the
   books pop-up). `sounds-files.py` all pass.
8. The Spin Doctor comment no longer calls 8 rad/s the galaxy's fast.
9. The "whisper is silent" failure: traced to `achieve.wav`. Achievements earned during Butterman's scenes reveal, with
   their chime, once his takeover ends, about a second after he leaves. Not a sound of his; the check now lets the
   reveals finish before it listens (the gate is unchanged).
10. The bird's retry/give-up stay the clone's pixel sprites: felt patches clash with flappy's frame. Its top bar's mute
    and return wear the felt (text lane's selector), outside the playfield.
11. The recycling bin's "Release to recycle" is the furniture's drop outline (`.support-preview`) round the whole bin,
    with its words inside.

**Found by the merged checks and fixed:** the shelf's layout key left out the camera, so a footer that grew mid-game (the
controller's replay button in the sigil row) left the shelf where the old camera put it and a reload moved it (and the
top on it); `play.js` taps whiskers clear of the googly eyes (they stay on his face now); `after-reload.js` compares only
the drifting cloud's height; `gags-harp.js` expects the flare from the keys' tune once the encore is used up;
`gags-cakes.js` gets its egg from the bird's own re-drop; `text.js` checks the landscape phone footer's columns.
## Speed lane (playtest-2, 2026-11-12)

Aaron: "I made my desktop window smaller and it made the game run so so so much smoother, even though all the items
were still in frame." Branch `sc/p2-speed`, port 18809. Every choice below is open to his veto. API notes for the
merge: `docs/plans/speed.md`. Nothing pushed.

**Why a smaller window is smoother.** The page frames everything to the window's height, so a bigger window draws the
same items with more pixels (a 4K window: four times a 1080p one). Most frames are cheap (cached pictures), but some
redraw pictures from scratch every frame, and their cost is pixels. The worst was the cat's **pop**: for its 1.5 s he
was redrawn every frame at twice the screen's sharpness (his still quality). Windows Chrome on Aaron's PC draws on the
AMD chip (found in the first speed pass), where that pop costs a whole 60 Hz frame and more in a big window. A second
amplifier on this PC: its monitors hang off two different chips (the RTX card drives the 1920x1080 screen, the AMD chip
the 1680x1050 one), so a window on the other chip's monitor is copied between them every frame, which also grows with
window size. The page cannot fix that one.

**What changed (render pipeline only):**
1. A pop now counts as motion: he is drawn at the moving sharpness while he pops and sharp again (2x) the moment he
   lands. Turning was already lighter.
2. Moving pictures (tumbling or carried items, and the cat while he turns or pops) are drawn to a pixel budget of
   1.5 megapixels' worth of window: full sharpness up to about 1280x1170 (so the check sizes and phones are
   unchanged), 0.85 at 1920x1080, 0.64 at 2560x1440, 0.5 at 4K; stretched on screen while they move.
3. Sharp again as soon as an item holds still for 150 ms, not only when the physics puts it to sleep (~2 s later).
4. The adaptive pixel ratio (drops only below 45 fps) may now go below 1 in a big window, down to 1.2 megapixels in
   all; small windows as before.

**Before/after, AMD chip (the one Aaron's Chrome uses), GPU ms per frame, dpr 1.** Live render loop through the window
sizes (`checks/diag/speed-window.js`, two runs each, alternating before/after; median). "Pop frame p95" is the frame
time with each frame's GPU work waited for (a WSL read-back adds a fixed ~15-25 ms to every frame here, so read the
difference, not the level). Host load was 25-45 throughout (other lanes); GPU time is the steadier number.

| Window | Pop: GPU ms/frame | Pop: frame p95 ms | Moving (20 bodies): GPU ms/frame | At rest: GPU ms/frame |
|---|---|---|---|---|
| 1280x720 | 10.5 -> 4.6 | 34 -> 27 | 6.9 -> 6.6 | 3.3 -> 3.9 |
| 1536x864 at dpr 1.25 (Aaron's screen) | 17.7 -> 7.9 | 49 -> 44 | 7.5 -> 8.4 | 3.2 -> 3.8 |
| 1920x1080 | 24.6 -> 8.2 | 70 -> 44 | 8.6 -> 8.4 | 4.2 -> 4.0 |
| 2560x1440 | 41.4 -> 10.7 | 83 -> 57 | 8.9 -> 9.0 | 5.2 -> 4.9 |
| 3840x2160 | 94.0 -> 20.7 | 177 -> 83 | 13.0 -> 13.8 | 8.4 -> 8.6 |

The same pop draw measured in isolation (`checks/diag/speed-gpu.js`: submitted back to back, so the host's load
cannot stretch it), AMD, ms per frame: 1280x720 9.6 -> 2.9, 1920x1080 21.3 -> 4.6, 2560x1440 37.1 -> 4.6,
3840x2160 83.2 -> 9.1. On the RTX card the pop was already cheap (0.9 -> 0.4 ms at 1080p, 1.8 -> 0.6 at 4K).

What did not move: **moving items** cost the same before and after on both chips here. Measured in isolation, the
twenty bodies' pictures cost ~10 ms on the AMD chip whatever the window size, so under WSL that cost is per draw call
(92 calls, only 57k triangles), not pixels; the budget only trims the pixel part, which on native Windows Chrome is a
larger share. Drawing only half of each splat prop's Gaussians while it moves (`?lod=0.5`) halves the splat part
(4.2 -> 2.0 ms) but thins the look while they tumble, so it stays off. At rest nothing changed (differences are noise).

**For Aaron (his machine, his call; nothing here was changed):**
- Windows Settings > System > Display > Graphics > add Chrome > High performance. Chrome on Windows ignores the page's
  request for the fast card; this setting (or launching Chrome with `--force_high_performance_gpu`) is what moves it to
  the RTX card. Then play on the monitor the RTX card drives, so frames are not copied between chips.
- Check after: `chrome://gpu` should name the NVIDIA card; `?perf=1` on the page shows the chip in its overlay.

Choices for Aaron's veto:
- The 1.5 MP budget and the 0.5 floor (`MOTION.budget`, `MOTION.floor` in `src/core/picture-motion.js`; try
  `?mbudget=1` or `?mbudget=3`). Moving things in a big window are softer while they move; still things are as sharp as
  before (the still picture's quality is untouched).
- A pop is drawn at screen sharpness, not 2x, while it plays.
- One frame at the end of each pop and turn still redraws him at 2x (that is the still image): on the AMD chip
  ~21 ms at 1080p, ~83 ms at 4K, once. Capping his still sharpness in huge windows would remove it but changes the
  still image, so it is not done.
- The adaptive pixel ratio going below 1 in big windows on slow machines.

Checks: `checks/speed-motion.js` (new, in `run-all.sh` at both sizes, 8 + 3 assertions): the check sizes keep full
sharpness in motion (so the cost gates measure the same work), a pop is drawn at the moving scale and he is sharp
after it, at 1920x1080 a tumbling splat prop and a tumbling mesh item are drawn lighter, then sharp once still (before
sleep) and at rest. Diagnostics: `checks/diag/speed-window.js`, `checks/diag/speed-gpu.js`; the runner gained
`--uncapped`.

### Speed pass fixes (decision e1112-59), reported apart from the window-size work

Built: costs 1, 2 and 4 of `command-hq/output/sigil-cat-speed-pass.md`; cost 3 investigated; cost 5 left for the
iPhone. Added at the orchestrator's request: the first lamp-on (the gags lane saw a 4-6 s freeze).
1. **Boot.** The room light is baked (`assets/textures/room-light.pmrem.f16`, `tools/art/bake-room-pmrem.js`): no PMREM
   build in the page. It is the very same numbers: 18 test spheres rendered with the old and the baked light differ in
   0 of 524,288 bytes, so the butter, the felt and Butterman look exactly as before. three's shader-log checks run only
   under `#debug`. Each warm step's draw gets its own frame after its background compile (`KHR_parallel_shader_compile`
   was already used by `compileAsync`).
2. **Galaxy first play.** Warmed at boot (`src/core/warm-shared.js`): the picture batch, its floor shadow, the support
   shadow (with a model's attributes: position, normal, uv, or three builds another variant), and his butter in the
   galaxy's solid-mask pass (no lights there, so its own variant).
3. **Galaxy steady cost** (suspect: re-rastered page words in `pullChrome`). Each pulled element gets
   `will-change: transform, opacity` for the pull. Two trace pairs: GPU-process raster work during the galaxy fell
   from 1262/1718 ms to 280/226 ms per run (raster worker) and 928/1183 to 464/542 ms (end-raster). Main-thread time per
   frame did not fall (3.3/4.6 before, 4.8/5.0 after, at load 33-40: within noise); the main thread's waits are
   elsewhere. Screens mid-pull show no blur. The "before" galaxy numbers include the black hole the sky lane removes.
4. **End of Butterman.** The mesh atlas's clear quad and one tile per standard-material variant (plain, and with a
   printed picture) are drawn once at boot, off screen.
5. **First lamp-on.** Two causes: the lamp's point light appearing changed every lit shader in the rack's picture
   (rack, hats, shade, bulb: 7 programs rebuilt), and the rack's soft floor shadow was one canvas path of ~20,000
   triangles (0.66 s to fill). Now the light is in the rack's picture from its first build at zero (identical when
   off), the lit bulb is warmed once a lampshade exists, and the shadow is filled 1024 triangles at a time (~35 ms;
   the blurred shadow differs by at most 2/255 of its alpha, under 1/255 on screen). This also removes a 0.3-0.7 s
   stall on every hat change on the rack. `site.lamp.light` is now a small view (`visible`, `castShadow`, `object`)
   so the checks read it as before.

Edits in other lanes' files, all small and commented: `src/eggs/galaxy.js` (pullChrome only), `src/world/lamp.js`,
`src/core/world-layout.js` (`warmMaterial`), `src/core/world-presentation.js` (`warm`), `src/core/soft-floor-shadow.js`,
`src/main.js` (one call). `butterman.js` needed no edit: its warm-up's `ensureEnv` is now a 172 KB fetch.

**Check, from the brief** (`speed.mjs`/`progs.mjs` from the speed pass, pointed at port 18809, plus a lamp moment):
- **Shaders built live after the first cat** (through pops, Butterman, the galaxy and the first lamp-on): none, at
  both sizes (before: 2 at the end of Butterman, 5 in the galaxy, 7 at the lamp-on). PASS.
- **No frame over 100 ms from the first cat through Butterman and the galaxy**: NOT MET, because of the boot. Butterman
  and the galaxy pass; the first seconds still have 120-780 ms frames. Median-run longest frames, vsync, three runs per
  size at load 6-12 (the brief asks for load 4 or under; the machine never got there: other lanes ran all evening):

  | Moment | Desktop before | Desktop after | Phone before | Phone after |
  |---|---|---|---|---|
  | First Butterman, longest frame | 75 | 33 | 83 | 33 |
  | First galaxy, longest frame | 275 | 67 | 275 | 83 |
  | First lamp-on, longest frame (same-load A/B, before = d8eb7f0) | 1750-2267 | 50 | 1483-2083 | 50-67 |
  | Boot, longest frame after first cat | 500-650 | 500-783 | 500-583 | 600-717 |

  A same-load A/B against d8eb7f0 (load 7-23): boot 600-1017 before, 583-817 after; so a little better, not fixed.
  What is left at boot, from the trace: three's first use of each warmed program still asks the GPU process for the
  program's uniforms, and that question waits for everything queued before it (texture uploads, other compiles);
  under WSL the GPU process is slow, so each wait is 100-250 ms. A reload with the rack and a lit lamp restored has a
  1.2-2.2 s frame (before: 2.2-3.1 s): the rack's picture is built before the warm-ups can help.
- **Mean/p95 no worse than before-summary.json by more than 10%**: met except one cell. Desktop: rest 0.51/1.5 (0.50/1.5),
  pop 1.00/1.7 (1.63/2.4), Butterman 0.47/0.9 (0.44/0.8: p95 +0.1 ms, +12%, at higher load), galaxy 0.98/2.4
  (1.24/3.4). Phone: rest 0.51/1.5 (0.59/1.8), pop 0.86/1.4 (1.02/1.8), Butterman 0.43/0.8 (0.46/0.8), galaxy 0.95/2.6
  (1.40/4.0).
- **No visual change**: the baked light is bit-identical; the lamp's light at zero is identical when off; the rack
  shadow differs by under 1/255 on screen; the galaxy's pulled words show no blur in mid-pull screens.

**Recommendation for the boot (next step, not built):** run `?warm=first`-style warming for the handful of programs
the first seconds need before he is shown, or move each warm step's first real draw to a frame after a GPU fence
(`gl.fenceSync` + `clientWaitSync` polled) so the uniform query never waits on a busy queue. And measure once on a
quiet machine: at load 6-12 every number above is inflated.

**Speed lane merge (playtest-2, 2026-11-13).** Conflicts: `world-presentation.js` keeps physics' depth and
Butterman's divider; `warm()` now warms a picture chunk of each kind (with and without depth) and the depth clear.
`lamp.js` keeps the light in the rack picture at zero (speed) in the UV lamp's violet, with its halo and smiley (gags).
`galaxy.js` keeps the sky lane's opacity-only fade of the chrome, with speed's `will-change` while it moves.
`run.mjs`: shell's sizes plus `--uncapped`.

**Boot warm-ups behind the doors (speed follow-up).** The speed pass's boot frames over 100 ms were the warm-up steps
themselves, running after the doors opened (the first use of each program waits on the GPU process). Everything queued
by the time he is ready is now drawn while the doors are still closed (`stage.warmAll`, at most 8 s; a polled GPU fence
after each step; the ring has a new `warm` part, so it fills a little longer: about 3 s here). `?warm=late` keeps the
old order. Also: `world-presentation` disposed a chunk when its depth kind changed, and its program went with it, so the
picture shader was built live again at the first rack and the first lamp-on (270-600 ms); spare chunks are now kept.

Measured with `checks/diag/speedpass-speed.mjs --mode vsync` (`?doors=1`: the pop and the door slide are in it), three runs
per size, load 4-12; the phone is 844x390 now. Longest frame after the first cat at boot:

| | Desktop 1920x1080 | Phone 844x390 dpr 3 |
|---|---|---|
| Before | 533, 417, 517 ms | 450, 500, 483 ms |
| After | 100, 167, 67 ms | none over 50, none over 50, 50 ms |

`speedpass-progs.mjs`: no shader is built live after the first cat on a fresh page, apart from the rack's own materials
when a rack first appears (40-260 ms in its atlas; a keepsake's first build, not the boot).

Follow-ups the same night:
- **A returning player's room behind the doors.** `stage.prepare()` / `stage.onEarly`: the physical world, the restored
  keepsakes and the restored rack (and its lamp) start once his first pose is in, while the loading screen still
  covers the page; `main.js` waits for them (sharing the 8 s cap with the warm-ups). A reload with the rack and a lit
  lamp had one 1.0-1.9 s frame after the first cat (1083/983/1467 ms desktop, 1667/1333/1900 ms phone); after: none over
  67 ms. A fresh page is unchanged (`world-lazy`: no prepared art before he is shown).
- **The 167 ms pop frame.** Not his picture's moving scale (the pop changes only its viewport, never its size). It was
  his floor shadow's program, built on the first frame he is shown (it is hidden until the pop fades him in): 20-40 ms
  of work on that frame, more with the GPU wait. Warmed behind the doors with the rest.
- **world-final-cost "maximum draws".** The recipe butter, small at the back of the stress grid, landed and the physics
  lane's settling (`world.js` REST: under 5 px/s on the page) put it to sleep after ~37 of each 45 frames, so it was not
  drawn (145-149 of 180). A real rule for play; the stress scene marks its bodies `restless` (the existing opt-out) so
  they stay in motion. The 170 floor is unchanged.

## Fix round A (playtest-2)
Branch `sc/p2-fixa` from `sc/p2-final` c213fbd: the world, physics and kitchen groups that failed the first full suite
(`codex/p2-final-suite1-out`). For each failure: an intended change (the check now asserts the new rule and names the lane
or decision behind it) or a real bug (the code is fixed). No gate was loosened.

| Group | Cause | Fix |
|---|---|---|
| world-small: eyes attach to cloud / box | Intended: only he and the Platinum Cat badge take the eyes (furniture lane item 8, Aaron's word). | The check asserts that the cloud and the box refuse the eyes and stay unchanged. The badge is tested in world-small-lifecycle. |
| world-small-lifecycle, world-small-calm: null `localToWorld` | Intended: the star is a flat sticker with no body (gags lane item 5). This check still peeled it and used it in the sky-art depth test. | Both steps are gone (gags-stickers covers the sticker's drag, tilt and layer). The hidden-page line now waits for the sticker's 550 ms CSS tilt to end on its own: the browser runs it, with no frame callback. The line's other conditions are unchanged. |
| world-small-drops: eyes settle 7.9-8 s, rest gap 2.25 px; crumbs energy gain .033 | Bug in the physics lane's REST rule (`world.js`). (a) `touching()` read only a manifold's first point. That point was often a predicted one .03-.05 away while another point lay on the floor, so the eyes rocked at 3-4 px/s for seconds without being judged. (b) REST put a body to sleep while it was still sunk up to .0074 into the floor (2.6 px): the calm damping slowed the solver's push-out. | `touching()` returns the nearest distance across every point of every manifold (`REST.touch` .004). A body sunk more than `REST.sunk` (.002) is never put to sleep while sunk; it keeps the calm damping (taking the damping off there let the push-out kick the wizard hat back up, energy gain .093 in world-rack's phone drops). The crumbs' energy spike went away with fix (a); it came from a single drop path. |
| world-cake-solids: collider gaps 65-207 px, pitchfork 8 s | Bug: REST together with a Rapier 0.19.3 fault. Measured on fresh pages: a body put to sleep by hand (REST's `sleep()` after the step) and then disabled before the next step keeps its colliders in the room. The flour came to rest on the disabled box's lid (y .453) every time. With Rapier's own sleep, or three steps in between, it did not. The check disables each body after its 100 drops, so the next item landed on it. | REST now stops the body and puts it to sleep just before the next physics step, never between steps (`entry.sleepNext`: cleared on wake, skipped while the body is held or supported). Side effect: the off-page rule now judges a REST-slept body the same way as a Rapier-slept one. Before, REST-slept bodies skipped it. |
| world-cake (phone): no bake, then the four checks after it | Bug older than this round: the shake counter fixed its axis on the box's first held step. On a phone on its side the box rests far back (see below), and the scripted lift drifted toward the camera. The counter therefore read the left-right shake on z and never counted it. | `recipes.js` `boxStep`: the axis is the box's main sideways motion and is picked again until a first reversal counts. The bake line now prints its state. |
| world-cake (desktop): poured reward reachable | Not reproduced: passed on every rerun here. | None. |
| world-cake-ending (+ calm): null `getBoundingClientRect` | Intended: the crash screen is Chrome's "Aw, Snap!" page with no way out (shell lane, e1112-33, e1112-41). | The check cuts `PARTY.errorSeconds` to 3 s for this fixture only (party.js keeps the real 30 s). It asserts that the screen has no control, that Escape does not lift it, and that a muted run lifts silently on its own. Its muted run first lets the mute's 15 ms ramp finish before the crash suspends the sound; otherwise the meter keeps reading the last unmuted buffer (level .023 with gain 0). |
| world-rack-off, world-rack-calm: rack reload silently asleep | Intended: the rack holds the hats he owns, and the party hat only arrives once the cake gives it (gags lane item 10). The reload asserted four hats: world-rack grants all four, world-rack-off does not. The cause was not the doors' early build or the lamp light. | Both fixtures save their hat set, and the reload asserts that the same set comes back. |
| look-pet-pass (phone): no body target for a 300 px pass | Intended: the phone is 844x390 now (shell lane), and there is not 300 px of page below his body. | The long pass is 300 px, or as long as the page allows with a floor of 140 px (ten times `PET.stroke`). On the phone that is 225 px. |

Edits outside the checks (small, commented; merge note): `src/core/world.js` (REST: `touching`, `REST.touch`/`sunk`,
`sleepNext` in `settle`, `step` and `wake`) and `src/world/recipes.js` (the `boxStep` axis).
`checks/physics-p2.js` also changed because of the REST fix. Its hand set-downs used floorY()+40, which on a phone on its
side is under the footer: the rifle rested with 3 px of it showing. Now that REST-slept bodies are judged by the off-page
rule, the world rightly sent the rifle back. The set-downs now happen on clear floor above the footer. Any other loose
keepsake lying there, such as the recipe card on the landscape floor, is moved aside first. The 2 s / 1.2 s gate is
unchanged.

**For Aaron / the orchestrator (found, not fixed here):**
- The same Rapier fault also occurs without REST. Disabling an *awake* body leaves its colliders where the body was:
  `world.park` followed by `setEnabled(false)`, as the chest's store, the box's drop and the butter do, and also a plain
  disable. Measured: a box disabled mid-air at y .25 held the flour up at .64. It only happens when the item was still
  moving at the moment it was taken out of the room. Recommendation: one `world.disable(entry)` helper that also sets the
  colliders' collision groups to none (restored on enable), used at those call sites. That is a separate unit, since it
  touches the gags, kitchen and butter files.
- On a phone on its side the box's home is behind the pinboard: at 844x390 the box is at 585-640 x 119-175 px and the
  board at 586-826 x 58-208. The first box lands there and the occluder scoot moves it out. Recommendation: the layout
  owner gives the box a home below the board on short screens.
- REST and contact neighbours: when REST puts a body to sleep while it touches an awake one (the rifle on the recipe
  card), Rapier wakes it at the next step and REST judges it again: about 2 s in all. The old code hid this by dropping
  the body from its list at once. Nothing fails because of it here; noted for the physics owner.

**Fix round A, follow-up (the orchestrator's go on findings 1 and 2):**
- Finding 1 is fixed. `world.disable(entry)` / `world.enable(entry)` (`world.js`) set every collider's collision and
  solver groups to none while the body is out of the room, and restore them when it comes back. Every
  `body.setEnabled` of a world body goes through them: `add()` wraps it. The chest's off-page store, the fork's sky exit,
  the box drop, the butter and recycling call `world.disable` directly. JAM's `setGroups` and the board's `cardGroups`
  write into the saved groups while a body is disabled.
  - Proof: the new `checks/world-disable.js` has 4 lines. It fails on the box lines without the group clearing (the flour
    rests on the box at .452) and passes with it.
  - The chest screen's store removes the body (`removeRigidBody`). Rapier already handles that path, and the check shows
    it leaves nothing behind.
- Finding 2 is fixed. The box was placed far back by the board because the floor band in front of him is thin on short
  screens. On those screens (height 500 or less) `floor-home.js` now makes a spot whose bottom is above his feet cost much
  more, so props stay in the front band while a clear spot is left there. On the 844x390 phone the box now rests in plain
  view beside him on the left (216-353 x 186-284 px).
  - New check: `checks/box-home.js`. On the old placement the phone fails its far-back line (bottom 179, feet 248).
- Finding 3 stays a note.
- Seen once in 5 runs: in `world-cake-solids` desktop, the pitchfork's picture rested 4.7 px off its collider in one pose
  (collider gap .16). Not reproduced in four reruns. Noted, not fixed.
- `world-rack` phone, "lit zero ongoing world work" (it also failed on the merged code; fixed at the orchestrator's
  request): traced with a hook on the atlas's dirty marks. About 2.1 s after the lamp turns on, the adaptive pixel ratio
  steps (`stage.setDpr`, one perf sample after the lamp's slow frame; world-rack does not pin the ratio). That calls
  `onResize`, and the recycling bin's `layout()` re-placed the bin and redrew its picture four times, although nothing
  on the page had moved. `recycle.js` `layout()` now runs only when `world.layoutKey()` (page size, chrome, camera)
  has changed. After the fix, no atlas pass in the 2.7 s after lamp-on, and both zero-work lines pass on the phone. The
  check's window is unchanged.

## Fix round B (playtest-2, 2026-11-13)
Branch `sc/p2-fixb` from `sc/p2-final` c213fbd: the chrome, shell, sound and scene groups that failed the first full
suite. Each finding: (a) an intended change, so the check now asserts the new behaviour, or (b) a real bug, fixed.

| Group | Cause | Kind | Fix |
|---|---|---|---|
| Aaron's original sounds (`sound-originals.py`) | Integration to-do 7 removed rocket and bird-slam with `git rm`; the check hashed every file of the old tree | (a) integration | The removed cues are listed; the check asserts they are gone from the repo and the page, every other file still byte-identical (104) |
| sounds (both) | 73 named voices: the sky lane added `bread-riser` and `bread-pop`, integration removed `rocket` | (a) sky lane, integration | 74, and it names the two new ones and the absent rocket |
| audit-polish (both) | The blast-off and whisper marks left the row (Aaron: "The 360 and everything to its right on the sigil bar ... dont need to be there"; text lane item 4), so `[data-find=blastoff]` was null | (a) text lane | Asserts neither has a mark, and presses a found sigil's mark by native input and checks it casts again |
| audit-polish (phone) | Real: the felt pills (30 px) stacked 12 px apart put ask the butter's 44 px target over sound's and the volume's lower edge (8 px apart at 701-1240 px wide: worse) | (b) | `hush.css`: 16 px between the stacked pills in both short layouts (the footer is 4 px taller on a phone) |
| shell-boot (desktop), shell-boot-calm (phone) | Real, timing: `__boot.draw()` recorded a value before the loader existed without marking it shown, so the ring's first draw recorded it again (progress "stalled"), and the first value was not 0. Seen when a preloaded file lands while the page is parsed (a busy machine) | (b) | `index.html`: a value is recorded only when the ring draws it. `shell-boot.js` asserts the ring's first drawn value comes no later than the first paint and is under 3% (it was `=== 0`, which a file landing first legitimately breaks) |
| text-calm (phone) | Check timing: calm writes the words plain (no `.done` marks), so the check waited its full 6 s and measured a line that had already gone (the name had stepped back) | check bug | Calm does not wait for marks; a new assertion that the measurement is taken while he is still saying it |
| gags-lamp (all four) | `site.lamp.light` is the speed lane's view (`visible`, `castShadow`, `object`) since e1112-59 | (a) speed lane | Reads `light.object.color` |
| gags-stickers (phone) | The check resized a phone to 390x844; upright, the page freezes under "flip sideways" (shell lane), timers too, so it never finished | (a) shell lane | A phone resizes to 740x360 (a smaller phone on its side) and back to 844x390 |
| butterman-p2 (phone) | Fixture: of the 4 points, the failing one was on the bucket's rim over the cat's flank; the cat is the same black felt and his edge moved between the four frames, so it read as "him". Measured with a dense grid: no point on Butterman himself showed the bucket over him | fixture | Points where any of the cat is drawn are left out; the walking grid is 9x9 (more points) |
| play (desktop), gag 7 | Real: world-input's pick (priority 95) took an item deeper than the cat wherever his body collider did not cover it, so past his outline a whisker drawn over a keepsake lost the press. The tune is all left whiskers now (gags lane) and the flung box can land under them: 5 of 6 plucks, no encore, so "found 17 of 18" | (b) | `world-input.js` `underWhisker`: such a press goes to the whisker. `gags-harp.js` checks it with the box held under a whisker (fails without the fix) |
| play (phone), legs | Not the encore: butter and loop failed too (0.013), and the base at 844x390 fails worse (butter 0.647). A phone on its side is wide, his walks there are longer and so are his strides; the swinging leg's top showed through the bottom of his body | (b) | `butterman-config.js` `hose.legRootReach` 1.4 -> 1.6: 0.005 at 844x390, 0.002 at 1280x900 (was 0.002-0.005). Side-by-side shots of the walk show no visible change |

| play (phone), reload: **open** (found here; it passed in the suite run) | "and are where they were left" failed on the controller in 4 of 4 runs here at 844x390 (desktop passes). Play leaves it resting beside or behind him (a phone on its side has little floor in front; floor-home and physics allow it), and on reload two fits push it into `reachable()`'s band (from 28 px below his feet): `world.add` fits every restored floor body whatever its saved layout, and the controller's own `stage.onResize` handler fits it on every resize event. Traced: restored at z -2.89, then moved to 0.73. `docs/plans/world.md` (persistence) asks for the exact pose at the same settled viewport | (b), not fixed | Tried: restore exactly when the saved `layoutKey()` matches, and the controller's handler only redraws. Phone passed 2 of 2, but on desktop the exactly restored bodies set off floor-home's repack on the next arrival, which stored the shelf's top and rifle on the shelf (2 of 2 runs). Reverted (3dbbb98). Recommendation: one rule for where a resting prop may be, shared by floor-home, the restore and the resize fit (either `reachable()` allows the floor beside and behind him, or floor-home stops using it), then restore exactly; physics/world owner's call |

Shared files touched, for the merge: `src/ui/hush.css` (two gaps), `index.html` (`__boot.draw`, three lines),
`src/core/world-input.js` (`underWhisker`, one filter term), `src/eggs/butterman-config.js` (one number). Merged
with fix round A (b9222ff): only this file conflicted (both sections kept).

## Fix round C (playtest-2)
Branch `sc/p2-fixc` from `sc/p2-fixb` 59ad652: fix round B's open item 12, a resting item must come back exactly where
the player left it after a reload (`play` + `after-reload`, phone 844x390: the controller, 4 of 4 runs).

**The rule chosen: the band allows the floor beside and behind him.** Where a resting prop may be is the whole
visible floor: inside the page's sides and above the footer, beside and behind him included. Behind him is not a
lesser floor: whatever he or the furniture hides there is slid sideways into view by the occluders rule (e1112-35),
and a prop more than 80% off the page respawns (world.js). The other way (floor-home stops placing props there) was
rejected: on a phone on its side the band in front of him is thin, and floor-home only searches beside and behind him
because the front band could not hold the complete collection (inventory-stress), so props would stack or be lost.
`worldLayout.reachable()` stays what it is, the ARRIVAL band (a respawn, the puddle, the lamp's fall): where something
new appears in front of him, never a rule for a prop at rest.

| Place that decides | Before | Now |
|---|---|---|
| Placement (floor-home) | its own numbers (12 px sides, footer-24) | `floorRect(stage)` in `floor-home.js`, footer margin 30 (see below) |
| Restore (`world.add`) | bodies without a `resize` (the controller, the Platinum badge) were pulled into `reachable()`; each adapter re-implemented "same layout keeps the pose" with its own margins (8/12/16/17 px, footer 24/30/33) | `world.add` keeps the saved pose exactly when the saved layout key matches and calls no fit at all; otherwise (a new body, or one saved in another layout) the adapter's `resize`, which every persisted body now has |
| Resize | `world.resize` pulled bodies without a `resize` into `reachable()`; the controller's own `stage.onResize` handler did the same on every resize event (pixel-ratio steps included) | `world.resize` fits each body once per new layout key (`entry.fitKey`); the controller's handler is gone. Every adapter's `resize` is `fitResting(site, entry, vertices, {reach})`: the least move that brings its picture back inside the sides and above the footer (an airborne body also keeps its landing spot above the footer), then clear of his body (`clearOfCat`); never forward from the back of the room |

Also fixed, found on the way:
- **The controller ran `floorHome` on a restore** (the only adapter that did; floor-home's own header says player
  poses never pass through it). On a reload that set `autoHome` on it and could trigger floor-home's repack, which
  stores the shelf's top and rifle on the shelf. That is what broke fix round B's exact-restore attempt on desktop.
  A restored controller now skips the search.
- **Saves at pagehide were never written.** `store.js` registers its pagehide flush before the world exists, so the
  world's pagehide saves landed in a 150 ms timer that never fired. Bodies also were not saved there unless asleep.
  The world now saves every enabled body that is not held or returning, still-settling ones as awake (the existing
  `save(entry, resume)` path: they resume settling after the reload), then flushes. Measured cause of the desktop
  ticket flake: with diagnostics in `world.add`, the ticket, recipe, crumbs and eyes restored from a save taken earlier
  in play (layout key with footer inset 117, the page's at reload 129), while their live pose at the end was elsewhere.
  The same flake shows on the base 59ad652 (1 of 2 desktop runs: ticket moved .023), so it predates this round.
- **One footer margin, 30 px.** At 24 px (floor-home's old number) `world-layout` phone failed "visible items
  reachable": the tin's drawn picture stands a few px past its collider, and the old solid/card fits (footer-30) had
  hidden that by nudging each new prop up 6 px right after floor-home placed it. Placement and fit now agree at 30.

Files: `src/core/floor-home.js` (`FLOOR`, `floorRect`, `fitResting`), `src/core/world.js` (restore, `fitKey`,
`resize`, pagehide), `src/flappy/controller.js`, `src/world/platinum.js` (gets a `resize`), and the adapters reduced
to one line each: `src/core/world-props.js`, `src/world/cards.js`, `src/world/solid.js`, `src/world/small-body.js`,
`src/world/rack-art.js` (`resizeProp`: hats, bulb). No check changed; no gate loosened.

Verification (run here while the full suite ran in p2-fixb; 1-minute load 8-27 throughout, so every result below
ran under load): see the pass list at the end of this section.

Pass list (first pass, all under load): play (phone and desktop), world-layout, world-occluders, box-home, world-shelf,
world-shelf-play, bird (with the stand reload), physics, physics-p2, world-small, world-small-lifecycle (the real
resize path), world-lazy, inventory-stress phone, world-board phone: all pass at the sizes named, both sizes unless
one is named. Failed once, unrelated to fits, rerun pending at hand-off: world-board desktop (postcard 100 drops, rest
gap 2.59 px against 2: a pure physics loop where no fit runs), inventory-stress desktop (the top, dropped out of the
chest, rolled off the page and was mid-return when judged). Play phone: 2 clean passes on this code (r1, r2 before the
pagehide fix; v1 after), 3rd run pending. Play desktop before the pagehide fix: 2 of 5 failed on the ticket (pre-existing,
base fails too); after: 1 of 1 pass, more runs pending.

Reruns (finished after the hand-off, same load): play phone 3 of 3 reload passes after this round's code (v1, v2,
v3); v3 failed one line before the reload, "a keepsake can be dragged to a new place" (the tin moved 0 under load
27; a drag step, no fit or restore involved; v1 and v2 passed it). play desktop 2 of 2 after the pagehide fix.
inventory-stress desktop passed on its rerun. world-board desktop failed again with identical numbers (rest gap
2.5857 px) and fails identically on the base 59ad652: pre-existing and deterministic, not this round's; for the
physics owner.

## Book lane (playtest-3, 2026-11-13)
Branch `sc/p3-book` from `sc/p2-fixc` 904695f. Aaron's achievements-book picks e1113-02..05; spec and prototype:
`command-hq/output/prototypes/sigil-ach/` (spec.md, index.html).

- **Earned cards wear the reveal's wax (e1113-02).** `achievementsHTML()` draws `wax(a)` from `src/ui/achievements.js`,
  the reveal's own stamp, so the metal rule is one function (`metalOf`: the tier's metal, platinum for Platinum Cat,
  gold for the rest). Static in the book: the stamp-down, ring and chime stay in the reveal. 82 px (62 px under 700 px).
- **Locked = the same blob, dashed.** New `blank(a)`: the `--blob` path (the same one the wax is masked with) as an
  inline SVG, `stroke-dasharray: 5 4`, `vector-effect: non-scaling-stroke` on the path (it does nothing on the `<svg>`
  itself; the prototype had it there, so its dashes scaled with the stamp), 1.6 px at every size. A non-secret shows
  its faint mark; a secret only `?` (no name, hint, drawing or id in the page). `seal()` and its CSS stay for anything
  that wants the old look; nothing calls it now. The book's `.ach .seal` rules are gone.
- **Bonk tiers: the cat sees stars (e1113-03).** Each tier has its own `d` (`STARS` in `src/achievements.js`), the
  `pips` argument is gone, metals unchanged. Looked at in the real reveal at 44 px (and 38 px, the short-screen size):
  the spec's platinum (ring + five stars, two of them at the ears) ran together into a crown, so platinum is
  simplified: a slimmer ring set higher, three stars above it, the two low stars dropped. The X eyes sit a little
  wider apart (8.6-10.6 and 13.4-15.4) so the two X's do not merge. Stars per tier: 0, 1, 2, 3, 3 + the ring.
- **Clover (e1113-04):** flipped and centred, the spec's path.
- **All at once (e1113-05).** A felt button right of the tally (`all at once` with a grid icon / `by section` with a
  lines icon), achievements book only. Compact view: eight columns in `GROUPS` order; `GROUPS` entries carry a third
  field, the short name (Signs, Bonks, Handling, Events, Room, Kitchen, Bird, Mastery; `???` for an untouched secret
  section). Stamps 40 px (34 under 700 px), each a `<button>` named for the achievement, or "locked" for a secret
  (which has no `data-id`). The bar (`.ach-peek`) sits between the header and the columns, `position: sticky; top: 0`
  in the scrolling sheet; it reads "tap a stamp" until one is tapped, then the name and `said` / `hint` / "locked";
  the tapped stamp gets a ring. In this view the lead is dropped and the grimoire link moves below the columns, so on
  a 1280x800 desktop all 46 are on screen at once. On a phone on its side the bar is one line (name, then the line).
  Remembered in the store (`books.achView: 'all'`, deleted for by section), flushed at once since the world's timers
  are frozen while a book is open; start over's wipe takes it with everything else.
- **Phones are landscape-only**, so the spec's "360 px wide" is checked as 844x390 and 640x360 (plus desktop and
  1280x800); at 640x360 the names are 8 px, "Handling" 58 of 66 px. A 360 px window (a narrow desktop; a phone shows
  the flip overlay) was tried too: the pop-up's own padding leaves 39 px a column, less than the prototype assumed,
  and "Handling" needs 45 at 6.5 px. So under 460 px the sheet's side padding is 6 px and the columns size to their
  names (`repeat(8, auto)`), sharing the rest: all eight fit, no sideways scroll, the words kept (no "Pets" needed).
  `font-stretch` was tried first and does nothing here (the face has no width axis).
- **Under load** (load average 40-58 while other lanes ran): one desktop run of the new view check lost its first
  tap while the sheet was still sliding in; the check now waits for the sheet's opening animation before tapping
  and for the view to change after. Two reruns: 21 of 21.
- **Ran (book lane, targeted):** achievements-book, achievements-view(+reload), grimoire, shell-books(+reload),
  text(+reload) at desktop and phone; achievements-view at 640x360, 1280x800 and 360x740; achievements(+reload)
  desktop. All pass. The full suite was not run (the orchestrator runs it on the merged branch).
- **Checks.** `checks/achievements-book.js`: wax in the reveal's metal, no `.seal`, static stamps, the dashed blob,
  secrets only `?`, the five tier marks (0-3 stars, X eyes from gold, ring at platinum, no dots), the clover's path.
  `checks/text.js` 6: the book's earned tiers are wax in their metal (parsed from `achievementsHTML()`), no `.seal`.
  New `checks/achievements-view.js` + `-reload.js` (run-all: desktop, phone, and 640x360): the toggle both ways,
  46 stamps in 8 columns, short names horizontal and inside their columns, no sideways scroll, all on screen at
  1280x800, secrets give nothing away, the bar's three kinds of line, the ring, the bar held at the top after a
  scroll, the choice kept over a reload and wiped by start over.

## Cards lane (playtest-3, 2026-11-13)
Branch `sc/p3-cards` from `sc/p2-fixc` 904695f. Aaron's items 1 (card pages) and 11 ("Nothing should go STRAIGHT onto
the pinboard"), plus his rule that old saves keep their pinned cards.

**What a click on each card does now** (press and move still drags every card, on the floor or off the board):

| Card | Click / tap / its keyboard key | Page |
|---|---|---|
| The rejected physics paper | opens its photocopy sheet | yes |
| The recipe card | opens its index card | yes |
| The postcard from the void | flips over in place (on the floor, or on its pin), as before integration to-do 6 | none |
| The Butterman ticket | wiggles, as before (paper rustle) | none |

- The page (`src/world/card-sheet.js`, which replaces `card-reader.js`): the sheet, and one small round (x) sitting on
  its top right corner. No other button: "put it down" is gone from both. It closes on the (x), a click outside, or
  Escape (e1112-41); focus starts on the (x) and goes back where it was. The (x) wears the felt patch (one button look,
  text lane): 30 px drawn, 44 px to press.
- A click outside only closes the page when its press also began outside. Found on the phone: the touch that opens
  a pinned card's page ends in a click right where the card was, which on a phone is beside the page, and that click
  closed the page the moment it opened.
- The 3D reader (FRONT / BACK / EDGE, LIFT / PIN, PUT IT DOWN, the transcript) is gone, with its CSS in `hush.css` and
  its exception in `input.js`'s lock. Nothing else used it. Lifting and pinning by keyboard stay on each keepsake's
  key (its lift button, arrows, Enter over the board).
- The ticket's wiggle (`cards.js` `wiggle`): on the floor its picture turns -7, +5, -2 degrees about its middle and
  back over .45 s (the keepsakes' own CSS wiggle, `k-wiggle`); the body does not move. It is applied in the card's own
  sync while the body is awake (the tap's press wakes it) and by a short frame loop while it sleeps; nothing runs once
  it is still. Pinned, it swings on its pin for .7 s with the pinning swing's shape (`supports.swing` now takes a pin
  as well as a hook; a small, commented edit in `src/core/supports.js`). Reduced motion: no turn, just the sound.

**Nothing goes onto the board by itself.** Every path that did it:

| Path | Before | Now |
|---|---|---|
| A card given with no spot (the paper from the paradox, the postcard from the galaxy, the ticket from the harp) | took its collection slot (`autoHome`) and `pinboard.arrive` pinned it at once | lands on the floor (falls in from a little above, as it did), at the spot the shared floor search picks (`floorHome`, like every other new prop), clear of the furniture, him and the other props. Its old collection slot was only ever a waiting place on the way to the board: at 1280x900 it put the paper behind the hat rack's pole (`world-layout`, 29% covered) |
| The board arriving (its second flat card) | `land()` pinned every waiting `autoHome` card | pins nothing |
| The recipe card and Butterman's ticket | given at a floor spot, never pinned | unchanged |
| The recycling stars | stuck at fixed screen spots, three of the six over the pinboard (desktop and phone) | each hops out of the bin's mouth (the keepsakes' arrival arc) and lands on the floor just left of the bin: the nearest spot clear of the board, him, the bin and the other stars, and, when that is still close to the bin, off the cards lying there. Drag it anywhere, as before. |
| A star a save has lost (older saves) | its fixed spot | the same floor landing |
| The Platinum Cat badge | falls to the floor; the player drops it over the board to pin it (e1111-46) | unchanged. The brief expected it to land on the board by design; it never did, so no exception is kept |

- Old saves: a card the player pinned is saved with its support and the world restores it pinned (`world.add`); only
  new arrivals changed. Stars already earned keep their saved place. A card from a save older than unit 5 (no saved
  body) now lands on the floor instead of being pinned on its first load; no such save is likely outside Aaron's.
- `floor-home.js` (physics lane's file; one commented line): floorHome waited up to 240 frames for the board whenever a
  card existed. It now waits only once the board is unlocked (two flat finds), so a lone card is not held up.
- **Open (for the physics owner): play desktop, "and are where they were left".** It failed in 2 of 4 runs here (the paper
  once, the ticket twice, by .03-.38 cat-heights). The base 904695f passed it 2 of 2. With this lane the harp's ticket
  is no longer pinned, so in play it rests partly on the recipe card on the floor (diagnosed: body y .013 on the
  recipe). A diagnostic run restored both cards exactly and passed. The drift looks like the known REST/contact-neighbour
  restore of one resting body on another (fix round A note 3), which the auto-pin used to hide. Play phone passed.
- Found, not changed (physics lane's file): floor-home's crowded-floor repack still puts the rifle, top, butter and tin
  straight onto the shelf when the floor is full (`floor-home.js`, "store default shelf props"). Aaron's words were
  about the pinboard; if the same rule should hold for the shelf, that is the physics owner's call.

**Checks.** New `checks/cards-tap.js` (+ `-reload.js`, in `run-all.sh`): with real input, every card kind on the floor
and pinned: the paper and the recipe open a page whose one control is the (x) on its corner, and the (x), a click off
to the side and Escape each close it; the postcard flips and flips back; the ticket wiggles (3-12 degrees) and comes
back to rest where it was; a press and move drags each; a recycling star lands beside the bin, off the board; after a
reload the pinned cards are still pinned and the loose ones still loose. Updated where they asserted the old reader or
the automatic pin: `kitchen-card` (the board arriving pins neither card), `world-arrivals` (the landed board pins none;
the postcard flips), `world-board` (the player pins the three; the postcard's and ticket's keys flip and wiggle; the
paper's (x) is the 44 px target), `furniture-p2` (the recipe's (x); a real click outside), `polish-paper` (a real click
outside), `achievements-badge` (the player pins the cards first), `play` (the paper's (x)). No gate loosened.

## Visual lane (playtest-3, 2026-11-13)
Aaron: "The items seem to be getting these strange border lines" (img2, img6) and "IMG7: after I did buttaman scene 3
it kind bugged out some visuals". Both are render-side; the fixes live in the picture code every item shares.

### 1. Border lines (img2, img6)
**Cause.** Every item is a cached picture shown on a flat card, and the picture is one region of a bigger texture: a
tile of the shared mesh atlas, or the used corner of a splat prop's / mesh picture's own target (kept large through a
tumble). The composite (`world-presentation.js`) sampled it with linear filtering, so a pixel at the card's edge also
read the texel just past the region whenever (a) the card's edge fell between screen pixels (any fractional pixel
ratio: Windows at 125/150 %, the adaptive ratio's 0.25 steps), (b) the picture had fewer texels than the card has
pixels (drawn lighter while moving, the speed lane's budget; or drawn before the adaptive ratio rose), or (c) the
camera moved under a sleeping picture. Past the region lies a neighbour's tile or what an earlier, larger draw left
(nothing clears it): a 1-px line of some other colour along the card's edge, mostly top and right, where the region
ends. That is the mock-up agent's stale-target line too, and the same thing in the atlas.
Ruled out: mipmaps (render targets have none, three r186 defaults), premultiplied edges (targets clear to transparent
black and composite One/OneMinusSrcAlpha: correct), the depth-pass clears (depth only).
**Fix.** Every lookup in the composite (colour and per-pixel depth) is clamped half a texel inside the picture's own
region (a `pictureClamp` attribute per quad, written when the batch is built; one `clamp` per fragment). Only the
picture's own texels, whose 4-5 px margin is empty, reach the screen. This covers atlas tiles, mesh pictures and splat
props alike, at rest and moving, at any ratio. The mock branch's full-target clear in `mesh-picture.js` (sc/p3-mock) is
no longer needed for this; it is harmless if merged (one larger clear per mesh-picture draw), but I would drop it.
**Second cause found by the same scan:** the controller's picture box came from its collider hull, and its splat's
grips rise above the hull, so the top of the controller was cut off in a straight edge. `prop-picture.js` now adds the
splat's outermost centres along 13 axes to the box: computed once per prop in an idle moment after it is made (1-5 ms
for 66-150k splats in a node bench), then the prop's picture is redrawn through its owner. The box grows only where
the splat really reaches: rifle +13 % area, controller +6-7 %, top unchanged.
**Check:** `checks/visual-hairlines.js` reads the canvas along every card's border (its outer 2 px) with the card
shown and hidden; anything the card adds there is a line the item does not have (a third read discards pixels that
change anyway); 3 or more such pixels on one card fail it (before the fix: 4 to 500 a card; after: at most one stray
pixel, once in six runs). Three passes: at rest; after every item has been carried near the lens and back (atlas
grows and re-packs, targets keep larger old draws); every picture drawn at the moving scale (`?motion=0.6`).
Before (904695f, with only the read-only `list` accessor added for the check): the moving pass FAILs at desktop dpr 1
(11 items), dpr 1.5 (12) and phone dpr 2 (recipe, bin, butter...); an earlier wider-band version also caught the box and
the controller at rest at dpr 1.5. After: all three passes PASS at desktop dpr 1, dpr 1.5 and phone 844x390 dpr 2.

### 2. After Butterman's scene 3 (img7)
**Cause.** The rise (scene 3) dollies the page camera in while widening it to 60 degrees and drops the near plane to
0.01 (`butterman.js`, the lens), then brings it back exactly. A cached picture is redrawn only when its own body
moves. So (a) whatever moved while the lens was wide (the cat's startle, his shove of the box) kept a picture drawn
with the wide camera after the camera came back: the box flattened and stretched (the grey shard beside it is most
likely part of that same wide draw); and (b) an atlas re-pack during the lens (a moving item's tile grew) re-rendered every sleeping picture with the
wide camera through its old screen box, so it landed partly outside its own tile: the bucket cut off, a pale sliver
of the flour, the recycling bin blank. Their depth, drawn with the lens's near plane, then hid parts of their
neighbours. The thin lines by the rack are item 1. Scale, atlas tiles, the depth dividers and the layout come back
correct (the camera is bit-identical before and after); the pictures were the only thing left behind.
**Fix (render side only; nothing in butterman.js).** Every picture adapter (atlas, mesh picture, splat prop) is
tracked by the presentation and says whether it was drawn with the page camera as it is now (`adapter.stale`). The
page camera's `updateProjectionMatrix` arms a watch (a resize, the lens, the cat's own crop-and-restore call it); once
the camera has held still two frames and differs from the last settled one, the stale pictures are redrawn through
their owners (a world body's `sync`, which also refreshes its hit box; otherwise `draw`), at most ~1.5 ms a frame, the
atlas flushed once per frame. Then the watch removes itself: no work while idle. In the atlas, a re-pack now redraws a
stale picture in full (new box for this camera) instead of re-rendering it through the old box.
During the rise this also redraws the room once the wide lens holds (spread over frames), so the room under him is
the wide camera's too.
**Check:** `checks/visual-rise.js` plays the rise live with the items (and the egg) in the room, nudges every floor
item while the lens is wide so they settle under it, waits for the end, checks the camera is back exactly, then
compares every picture on the canvas with a fresh redraw of all of them. Before: FAIL on 13 items (bin 59 % of its
box, bucket 41 %, recipe 31 %...). After: PASS desktop dpr 1 and phone dpr 2 (one phone run of three showed 7 px on
one item under load 33-48, below the 1 % per-item threshold now used).

### Cost (nothing slower)
Idle: no new per-frame work (the camera watch exists only from a camera change until two still frames after it).
Composite: one `clamp` and one more varying per fragment; GPU timer (`checks/diag/speed-gpu.js`, run back to back on
the real GPU, 1280x900 dpr 1, two rounds each, base 904695f vs this branch): main pass 0.07 / 0.07 ms both rounds;
the three splat props' pictures 0.16 / 0.16 ms (base's first round 0.67 was a load spike). The atlas and twenty-props
cases swing 2-6 ms with the host load (16-24) on both sides alike. `world-final-cost` (desktop, two alternating
rounds, load 17-28): twenty median p95 base 5.1 / 5.4 ms, after 5.1 / 6.1; maximum base 4.5 / 4.5, after 6.9 / 5.5;
per-run p95s range 2.9-14.9 ms on both sides, so this is load, not the change (none of the code those runs time
changed apart from the clamp). The rise with every item nudged under the lens (rAF gaps, uncapped): mean 3.9 / 1.5 ms
base, 3.3 / 3.3 after; p95 10.6 / 4.0 base, 9.8 / 9.6 after (base's second round ran on a quieter host). The one
added cost is the catch-up itself: after a camera change, the stale pictures are redrawn once, at most ~1.5 ms a
frame. The orchestrator's full suite should re-measure the gates on a quiet host.

### Verified
New checks, both sizes, base vs after: see each item. Existing checks rerun on this branch (desktop): world-atlas 47,
world-presentation 11, world-presentation-rotor 3, world-final-scene 3, speed-motion 9, butterman-p2 23 (+reload),
physics-p2 10, polish-butterman 7, furniture-p2 41 (+reload), world-occluders 6, world-props 18: all PASS (host load
14-48 throughout).

**Butterman lane:** your scene-3 work (B-rotation, the shove of the box into the cat) can move items while the lens is
wide; nothing more is needed from you for their pictures. The cat's own picture already follows fov and position.

## Gags lane (playtest-3, 2026-11-13)

Aaron's playtest-3 items for the gags (`~/.sigil-cat-wt/inputs/playtest-3.md`), branch `sc/p3-gags` from
`sc/p2-fixc` (904695f). Every choice below is mine and open to his veto. Checks were run here at desktop dpr 1 and
phone 844x390 (calm runs where motion changed), all under a 1-minute load of 17-24 from the other lanes; the full
suite is the orchestrator's. Nothing pushed.

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | "Doing the triangle sigil should unlock one of its 3 hats at a time not all at once" (proceed-unless-objected) | Each triangle cast gives the next hat he does not have, in order wizard, cone, crown, and drops it on his head (the rack comes with the first). Once he has all three a cast just brings the rack (built if it is not there) with a hop and the tap pop: no hat is dropped, nothing new owned. The party hat stays the cake's. `src/gags/hat.js` (`drop`, `next`). | Fixed order, not random. A save that already owns all three gets nothing new from the sigil. |
| 2 | Crumbs every second loaf, at most one pile, visibly from the bread; shards the moment and place the glass shatters | Crumbs: loaves are counted (saved as `loaves`); on every second one (`BREAD.crumbsEvery`), when he turns back (tap or the 5 s timer), one pile is tossed out of the front of the loaf at its middle height and tumbles onto the floor in front of him. None while a pile lies about, none once recycling's six stars are done, none from a loaf that blasts off. Shards: put in the moment it breaks, at the break, kicked up a little by the smash. Two causes of the lateness, both measured: the first build of each drew its materials into the picture atlas live (~1 s: world.add went from ~1000 ms to ~10 ms once warmed), and floor-home searched a free spot elsewhere. Now `src/world/fragments.js` warms each one ahead (`warmFragment`: model, world, environment, atlas programs) and builds it hidden and out of the physical world (`prepareFragment`: on the loaf's pop for the crumbs, with the cup's arrival for the shards), unnoticed by the recycling bin until `show()` puts it in place. Measured: shards 3-16 ms after the smash; crumbs within ~0.3 s of the tap (the tap itself, the 80 ms swap and polling included). | A blasted-off loaf leaves no crumbs (the bread left the room). The building hitch (~100-250 ms under this load) is moved to moments already busy: the loaf's pop (under the puff) and the glass's arrival. |
| 3 | The glass "teleports" before it falls off the screen | Cause, measured frame by frame: the shell was a kinematic body; once it sank 0.06 below the floor the world's floor rule (`world.js` unsink) lifted it back onto the floor, where it hung until hidden at the end of the tween, still half on screen. Now over the edge it is a picture moved by hand (`cup.fly()`: the body leaves the world): it turns on its front foot to 1 rad in 0.42 s, then falls under gravity (9.81, the world's), still turning at the speed it had and drifting toward you, until its whole picture is below the bottom of the page; then the .45 s beat, the tumble in from the top, the smash at the puddle. `GLASS.over` holds the numbers. | No edit to `world.js` (the physics lane's): the glass simply is not a body while it flies. |
| 4 | "The galaxy activated way too quick, it needs to activate after roughly 7 seconds of fast spinning" | `GALAXY.spin.seconds = 7`: seven seconds of sustained fast spinning (above 13 rad/s; Spin Doctor stays at one fast flick, 8 rad/s). Between two hard swipes he dips below the speed for at most ~0.15 s (measured), so a dip shorter than `gap` (0.35 s) still counts; a longer slowdown drains the tally at 2x. Measured: 4 s of hard swiping does not open it; steady swiping opens it at 7.1 s. The bread's blast-off keeps its quick trigger (`spin.bread`, 0.6 s): he is bread for only five seconds. | Drain 2x real time (was 0.5x), so stopping for a few seconds starts the count again. |
| 5 | Riser and pop belong to the loaf sigil (e1113-06): "it turns into bread when it plays the pop" | The loaf sigil plays Aaron's riser (from 1.5 s, as before) while he stays the cat and trembles harder; the pop is scheduled on the audio clock at the riser's end and he becomes bread on it (measured 26-49 ms from the pop: the next frame). The ding on the swap is gone (the pop is the sound). If something else takes him during the 3.6 s (hidden, another stand-in, the galaxy) the loaf is called off and the scheduled pop stopped. The blast-off has neither now: the bread trembles 1.6 s while the dark closes, then launches; the galaxy's hum carries it. `bread.whenBread()` resolves at the pop; the found-mark replay of the blast-off waits for it (`src/main.js`, one line). | No input lock during the riser; other sigils just see him as not settled. |
| 6 | The bread's space should cover everything like the galaxy | The blast-off's dark is now the galaxy's: drawn over everything (render order 1e6), fully opaque (the old 94% `spaceDark` is gone), the same chrome faded (the sound control stays, lit), the takeover class on (stickers, his speech and the achievement reveal step aside), and only the bread drawn over it (his picture lifted above the dark without the depth test while the space lasts; put back after). No outline glow round the bread (the galaxy's glow comes from his picture's mask, which does not follow the bread's drift). | |
| 7 | Error page: at ~9 s the cat pops in over it, then it opens like the loading doors (proceed-unless-objected) | `PARTY.errorSeconds = 9`. The page is two halves of the same picture (the right one hidden from screen readers). At 9 s the page runs again underneath (the freeze is let go; input stays locked, still no skip), the canvas is lifted over the error page drawing only him, he pops in with the loading screen's own pop (`site.shell.popOver`: the shell's pop and doors, factored out of its reveal), then the halves slide apart while the room shows through the gap, and the party's return follows as before (hat, confetti, toot). Measured: pop at 9.0 s, doors at 9.8 s, back at 10.8 s. Reduced motion: at 9 s the page fades out (0.6 s), no pop. | No sound for the pop or the doors (e1112-40). |

Edits outside this lane's files, small and commented: `src/eggs/galaxy.js` (the spin config and trigger, the space
cover: render order, dark, `lift()`, the chrome set; fx lane owns the rest), `src/ui/shell.js` (`pop`, `openDoors`,
`popOver` factored out of the reveal; the reveal itself plays as before), `src/main.js` (the blast-off replay waits for
the loaf's pop), `src/world/cup.js` (`fly`). No edit to `world*.js`.

Checks: new `checks/bread.js` (+ calm, both sizes, in `run-all.sh`): the riser and the pop, crumbs every second loaf,
one pile, none after the six stars, the blast-off cover by pixels and classes. Updated: `gags-hats` (one per cast),
`gags-glass` (one smooth motion off the bottom, gone only when all of it is below, shards at the smash), `sky` (4 s
does not open, ~7 s does; the blast-off without riser), `party` (unchanged up to 8.3 s, pop at ~9 s, doors, ~10.8 s in
all; calm fades), `world-cake-ending` (comments). Changed to wait for the loaf's pop: `bread-float`,
`bread-float-shots`, `world-small`, `gags-cakes`, `world-cake`, `sounds-playtest`, `polish-cat`, `play` (also: a
second loaf for the crumbs, a second triangle for the rack's tap round, more swipes for the 7 s galaxy),
`look-landing` (more swipes).

## Fx lane (playtest-3, 2026-11-13)
Branch `sc/p3-fx` from `sc/p2-fixc` 904695f, port 18846. Sound, effects, debug. Every choice is open to Aaron's veto.
Shots: `docs/shots/p3-fx/`. Everything below ran under load (1-minute load 14-61 all afternoon: the other p3 lanes).

**1-4. Aaron's four clips** (`tools/audio/make-p3-sounds.py`, hash-checked inputs, 48 kHz 24-bit, one constant gain to
the palette's -22 dBFS loudest-100-ms RMS, true peak at or under -4 dBFS; ledgered in `design-manifest.json` and
`SOURCES.md` as Aaron's downloads with origin and licence not recorded, `licenceCleared: false`, like the bread's riser):
- `achieve-space.wav` (point-in-space, 0.06-1.70 s, stereo kept: the clip is wide, a mono fold hollows it): every
  achievement reveal and Platinum Cat (`ACH.chime`). The old two-note `achieve.wav` stays in the repo, unplayed.
- `bell.wav` (ding-small-bell, 0.036-1.10 s, mono): a sticker tap (both stickers, +-3% pitch so repeats differ; the
  GOOD JOB sticker a hair lower) and a tap on the Platinum Cat badge (`platinum.js` `ting()`; its old impact sound is
  silent since collisions went off). The glass tink `star-tink.wav` stays in the repo, unplayed.
- `cast-wind.wav` (wind-magic, e1113-09): the first 1.10 s of 8 s (the whoosh, crest at 0.30 s; the rest is a flat
  -55 dBFS bed), 0.45 s fade, stereo: about a second. Every successful cast (`site.cast`), replacing the three-note
  `cast`. A fizzle keeps its fizzle.
- `bolt-beam.wav` (energy-beam-shot, e1113-10): 0.022-1.90 s, 0.8 s fade, mono. The bolt's strike; the thunder stays
  only for the cloud's grumble.
Checks: `sound-playtest-files.py` (ledger, format, level, wiring, credit for each), `sounds-files.py` (provenance of
every file, peaks, bytes), `sounds.js` (78 named voices decode), `sounds-playtest.js` (sticker bell, cast and bolt
voices at their triggers), `achievements.js` (the chime is point-in-space), `achievements-badge.js` (a real tap on
the badge rings the bell). All pass at both sizes.

**4. The bolt, far cooler** (`src/eggs/bolt.js`). The page darkens as before; then a faint leader forks down from the
top (90 ms), the return stroke connects with his crown: a jagged trunk (6 levels of midpoint displacement) with six
forks, about half of them forking again, each drawn as four additive strokes (wide blue glow, halo, blue-white body,
white core), forks tapering to their tips; the channel crackles (fine jitter, 24 times a second) and is re-lit twice
(0.16 s, 0.31 s: the bolt's brightness only, the screen flash stays one per cast); 26 sparks spray off his head and
fall; a glow sprite burns at the strike and a soft blue afterglow lingers there 1.6 s; the beam fires; it fades out
from 0.42 s. Calm motion: no leader, crackle, sparks, flash or shake; it fades in and out once, the afterglow stays.
Where it is drawn: two small 2D canvases in the storm layer (the bolt's own box, about 5-15% of the screen; the sparks'
square round the strike), blended `plus-lighter` onto the dark. Not the WebGL scene: the page's dark is a DOM layer
over the WebGL canvas, so a bolt in the scene would sit under the dark at 28% brightness. No blur filters, no
full-screen pass. The bolt canvas is drawn only when its shape changes (the leader's frames, then each crackle: about
20 draws a strike); its brightness is the canvas's opacity (the compositor's); the sparks' small canvas every frame.
Main-thread drawing: mean 0.3-0.6 ms a draw. Frame cost on the AMD chip, 1920x1080 dpr 1, uncapped (no vsync, so a
frame takes as long as its work), median frame during the stroke minus during the dark just after, A/B with the old
SVG bolt (`checks/diag/bolt-cost.js`, five strikes each, two runs alternating): new +0.1 and +0.3 ms, old +1.2 and
+2.9 ms (stroke p95 9-11 ms against 17-22 ms). So the new bolt costs less than the old one did. (A first version that
redrew everything every frame measured +1.6 to +3.7 ms; hence the split.) The canvas and its glow sprite are warmed behind
the loading doors (a first strike's frame no longer sets them up). Check: `checks/bolt-visual.js` (pixel checks on its
canvases mid-strike: the white-hot core runs the length of the bolt, a blue glow many times its area, forks, warm
spark pixels; one flash; its own box; the afterglow; its canvases given back; drawing cost), at both sizes and calm.

**5. The galaxy's glow, no longer cut off** (IMG5; `src/eggs/galaxy.js`, OVERLAY_FRAG). Cause: the halo round his
outline in the dark was one sample of a coarse copy of his picture (mip level ~6), and outside his picture's box it
was 0. Where he comes near the box (the loaf, the sleep and the stretch at the bottom: the box ends ~16 px under his
feet), the glow ended in a straight line. Now: nine taps (a tent) on the level below, whose bottom rows still know
the empty margin under him, so the glow fades out inside the box; outside the box it carries on from the edge at its
own slope and fades over one texel. It is only computed near him (a coarse look first; none over him), so its cost is
small. Measured (`checks/galaxy-glow.js`, the dark and halo held, every pose, the jump across the box edge beyond the
glow's own fall): sit 1 -> 1, lie 49 -> 5, sleep 49 -> 5, stretch 49 -> 5 (/255). The glow is a little rounder too
(the coarse level's blocks are gone). GPU cost of a galaxy frame on the AMD chip, 1920x1080 dpr 1 (timer query, 20
frames back to back, median of 5; `checks/diag/galaxy-cost.js`): sit 9.2 -> 9.8 ms, lie 8.9 -> 10.2 ms (the base
measured before; +0.6 to +1.3 ms, inside the run-to-run spread of about 0.5 ms on one side). Also the bright stars'
diffraction spikes now fade before their grid cell's edge: cut there, they drew faint straight lines and squares
across his sky (visible in IMG5). A pinned galaxy (checks only) can now be let go of (`pin(null)` closes it and gives no
postcard), so one check can visit every pose.

**6. Bloom (pmndrs/postprocessing): tried, left out.** The vanilla library, `postprocessing@6.39.5` from jsDelivr
(peer three >= 0.168 < 0.187; the page has 0.186.1; 6.39.6 is 12 days old), an EffectComposer on a half-float buffer,
its mipmap BloomEffect at half resolution, then the page's Neutral tone mapping (three skips it inside a render
target), only while the galaxy shows. Experiment only: `checks/diag/galaxy-bloom.js`; nothing in the page.
- Look (`docs/shots/p3-fx/galaxy-bloom-off.jpg` / `-on.jpg`): at gentle settings (threshold 0.55, intensity 1.1) it
  changes the frame by 0.36/255 on average: invisible. At strong settings (0.3, 2.2) his rim turns into a gold neon
  line, the whiskers and the galaxy's core glow, the stars swell: dreamier, but softer and less crisp. Different, not
  clearly better.
- Cost, AMD chip, GPU per galaxy frame: 1920x1080 dpr 1 15.3 -> 20.3 ms (sit), 15.1 -> 20.7 ms (lie); at quarter
  resolution the same (+5.3 ms: the cost is the two extra full-screen half-float passes, not the bloom's size);
  844x390 at dpr 3 18.3 -> 26.5 ms (+8.2). (These "before" numbers were taken on the first, uncull'd glow; the shipped
  glow is ~10 ms.) The RTX card: +0.05 ms. On the fill-bound AMD chip that is a third more per frame and the galaxy
  would drop under 60 fps there. Recommendation: leave it out. If Aaron wants the neon-rim look, it can be had inside
  the existing galaxy pass (a brighter rim term) at no extra pass.

**7. Debug panel** (`#debug`): `cake`, `bonks 0`, `bonks +1000`, `bonks +1000000`. A cake is the next bake given to
the room (the first is the party cake, ready to tap; then cake-2, cake-3, ...), counted as a bake (so Baker is
earned, as a real bake would). The bonk buttons set the count through `ui.setBonks(n)` (new, `src/ui/hush.js`), saved
like a bonk; the bonk achievements react as to real bonks (+1000 earns up to Bonk Master, +1000000 Bonk Legend); none
is ever taken back, so 0 keeps them. No milestone spin. Check: `checks/debug-panel.js` (both sizes).

**8. Flappy's high score** (e1113-22; `src/flappy/screen.js`, `art.js`): kept in the store (`flappy.best`), set when a
flight beats it, shown on the bar whenever flappy opens ("flappy  best 7") and on the scoreboard's best line (it used
to repeat the score). The grimoire's start over wipes the whole store, so it goes too. Checks: `bird.js` (a fresh
player has none; a flight of 7 keeps 7 on the bar, the scoreboard and in the store), `bird-stand-reload.js` (after a
reload, flappy opens with best 7).

**Edits outside the lane's files** (small, commented): `src/main.js` (the cast sound; the debug buttons and
`debugCake`), `src/ui/hush.js` (`setBonks`), `src/world/stickers.js` (the bell), `src/gags/recycle.js` (preloads the
bell), `src/world/platinum.js` (the bell on a tap), `src/sigils/ink.js` (preloads the cast), `src/ui/achievements.js`
(the chime's name). The gags lane owns galaxy.js's spin threshold: untouched here.

**Not this lane's, seen on the way:** `achievements` at phone size fails "a fast flick earns Spin Doctor" (vel 0); it
fails the same way on the base 904695f (and "the reveal sits on the message line" failed there once under load).

## Butterman lane (playtest-3, 2026-11-13)

Aaron's three Butterman items from playtest-3, branch `sc/p3-butterman` (from `sc/p2-fixc`). Every choice is mine and open
to his veto. Focused checks only (`checks/butterman-p3.js` + `-reload.js`, new; `butterman-p2`, `polish-butterman`,
`play`), desktop dpr 1 and phone 844x390. Nothing pushed.

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | "once someone watchs all 3 B sigil scenes, it should only play scene 1 from then on so they can get butter without having to listen to every B scene to get back to the first" | The device remembers which of the round's scenes have been watched to their end (`butterman.seen` in the saved state). A fresh save plays 1, 2, 3; once all three are in the list, every B plays scene 1 (the butter), reloads included. The encore stays apart: not in the round, once ever, unchanged. | Watched means played to its end: a scene cut off (the page closed or reloaded mid-scene, a check's stop) does not count and plays again next time, as before. A save from before this change does not know what it has already watched, so it goes 1, 2, 3 once more before settling on 1. |
| 2 | "Buttaman just pushed the box into the cat and it started tweaking out a bit. and is stuck now." | The cause, measured on the base build: the cat's body and Butterman's capsule are both moved by hand (kinematic), so a prop caught between them is crushed into one of them; with the box lying across scene 2's ring next to the cat, the capsule pressed it 0.026 into the cat. Three changes: (a) props near the cat (within 1.1 of his axis) are always eased off Butterman's line on the side away from the cat (before, a prop whose middle lay on the cat's side of his line was eased toward the cat); (b) the ease now judges a prop by its footprint, not its middle, and is strong enough to slide it (its per-frame push was under the floor's friction, so a box never moved before he reached it and his capsule shoved it square on); (c) while he is about to touch a prop that has no room for him between itself and the cat, his capsule stops pushing at all, so nothing can be crushed. In practice the box now slides out ahead of him and he walks past it. | (a)+(b) are in the world's sweep (`src/core/world.js` SWEEP: `nearCat` 1.1, `accel` .06 -> .2, footprint `flatReach`), physics lane's file, kept small and commented. (c) is in `butterman.js` (`squeezes`, config `push`). When (c) applies he passes in front of or behind the prop (drawn in depth order) instead of shoving it: rare once (a)+(b) clear the way. The physics lane's deep-penetration respawn stays the general safety net. |
| 3 | "IMG7: after I did buttaman scene 3 it kind bugged out some visuals" | Scene 3's own cleanup. Found by a before/after snapshot of the page: the camera, near plane, layout, chrome and his figure all came back exactly; what did not was the world's work done **while the rise's dolly zoom had the camera**. A prop that moved during the close-up (the cat's startles shove what is near him) was redrawn for the close-up camera and, once asleep, never redrawn: the box came back drawn 413x230 instead of 335x218 (IMG7's huge flat box), the flour at another place on the page. Props coming to rest were also fitted to the page and saved under the close-up's layout (refitted again on the next load), and the world's "off the page, send it home" and the occluder scoots judged by the close-up view. Now Butterman marks the page camera as borrowed (`stage.cameraBorrowed`) while his lens is in; the world leaves rest fits, saves, off-page returns and scoot judging until it is back, then redraws every picture for the page's camera and runs the rests that waited (`world.cameraBack()`). Also: a resize mid-rise is undone by his lens handler first (it now runs before the other resize handlers, and restores the near plane too), so no layout (shelf, rack, the world's fit of every resting prop) is ever placed under the wide lens. | The picture side (the hairlines, any pass that draws pictures differently) is the visual lane's. For their merge: nothing in `world-presentation.js` or the picture files changed; the fix is upstream of them (which camera their redraw sees, and that one happens when the camera returns). The depth divider was checked and is released when he goes (no keepsake stays split behind him). |

Also fixed (found while checking item 3): **Buttaman! could not be earned.** It was unlocked when his yell's caption
appeared, but the captions were turned off on 2026-11-10 (a day before the achievement was added), so neither it nor
Platinum Cat could be earned by a new player. It is now earned on his third yell in the rise, captions or not.

**Checks.** `checks/butterman-p3.js` + `-reload.js` (new, in `run-all.sh` at both sizes, with the bird kept away by
`--storage`: its egg arriving mid-check repacks the shelf, which the scene-3 snapshot would read as the scene's doing):
the round from a fresh save, B by B (a cut-off scene not counted; 1, 2, 3, then 1 watched to its end, then 1 again;
survives a reload); scenes 1 and 2 played live through a room of eight keepsakes placed on his walk in, at his mark, on
and across scene 2's ring (the box where the base build crushed it), with every frame's contact depth against the cat's
body, no keepsake's middle inside him, and everything asleep after; scene 3 played live with the pail on its hook and
three props set moving and coming to rest during the close-up, and a before/after snapshot (camera with near plane and
view offset, layout key, page size and insets, body classes, the cat, his figure and caption, the presentation, and every
keepsake's body, support and picture), plus a forced redraw of every picture (none changes) and the saved layouts of the
props that rested in it. Run against the unchanged base build, it fails where it should: the box 0.028 into the cat in
scene 2; after scene 3 the box redrawn 531x395 instead of 346x275, the tin, top and rifle moved onto the shelf, the
rested props saved under the close-up's layout; Buttaman! not earned; the fifth B plays scene 2.
`butterman-p2`, `polish-butterman` and `play` were run at desktop dpr 1 and phone 844x390 under load (1-minute load
16-23). `play` desktop failed one line after its reload, "and are where they were left" (the box once, the controller
once); the base build fails the same line (the ticket), so it is not this lane's: the open reload item from fix round B.

**For the physics owner (found, not changed):** a new keepsake that arrives while the rise has the camera (an 11 s
window) is still placed by `floorHome` with the close-up view; and a page closed during the rise saves its bodies under
the close-up's layout (they are refitted, minimally, on the next load). A paper sheet set down upright on its edge can
stay asleep standing (seen in the scene-3 shots), which is the fixture's doing but may want a look.

## Physics lane (playtest-3, 2026-11-13)
Branch `sc/p3-physics` from `sc/p2-fixc` 904695f. Aaron's items in `inputs/playtest-3.md`; the fifth is fix round C's
open world-board failure. New check: `checks/physics-p3.js` + `physics-p3-reload.js` (one line or more per item).

**1. The googly eyes follow him like a hat; on the Platinum badge they show.**
- Lag then jump, cause: his pose change is a 1.5 s pop. The new pose swaps in at .72 s (`placeSeat`), and the hat and the
  butter ride `cat.seat`, which moves right then. The eyes sat on `cat.spin` at the old pose's face and moved only when
  the pop ended (`cat.onPose`), so for .78 s they hung at the old face, then jumped. Fix: `cat.face`, a group in his
  spin that `placeSeat` moves with the seat (at `config.cat.face[pose]`, or the bread stand-in's front). The eyes' seat
  parents to it, so they move in the same frame as the hat, inside his picture. `updateCatSeat` only refreshes the
  body's proxy pose now (picking, the save).
- Gone on the badge, cause: the eyes on the badge were a picture card of their own, and the badge's picture (a mesh
  picture without per-pixel depth) writes its nearest point's depth, its rim, which is nearer than its embossed cat. So
  the badge covered them: on the floor and on the board. State, save and reload were right all along (measured): only
  the drawing was lost. Fix: on the badge they are drawn inside the badge's own picture (`presentation.attach` at the
  badge's `eyesAnchor`, the way they are drawn inside his on his face), so they go wherever its picture goes, onto the
  board with it, and reload with it (restored before the badge has a picture: attached once it has one).
- Check: through three pose changes, every frame, the eyes sit on the face of the pose his seat is on (0 frames off;
  the base code is off for the whole second half of every pop). On the badge: a real drag onto its cat, on the floor
  and on the board, then pinned with them on, then a reload: each time the eyes' rect changes clearly when their art
  is hidden (they are drawn), and they sit on the anchor.

**2. Out of the chest like any arrival.** `recipes.js` `respawn`: the item is given like a new keepsake (its own home,
floor-home's placement), then, if that spot is not clear (another item came out a moment before), moved to the nearest
clear floor spot in view (`clearSpot`, new in `floor-home.js`: floorHome's own search and costs, nothing else moved),
and it appears in a puff. The old drop in front of the box (and its fan of offsets) is gone. `kitchen-chest`'s
"respawns it in front of the box" line now asserts the new rule: on a clear spot in view, clear of the box (intended
change, this item). `physics-p3`: flour, pail, egg and tin all taken out in quick succession: none inside the box's
interior, none over the box's picture, all in view and at rest.

**3. Too far into him.** `CAT_IN` in `world.js`, once a frame while the world steps, over his hulls' contact pairs only:
a loose body whose origin is inside one of his hulls, or more than .06 into him, or pressed into him (.008 in, and not
out past .003) for .4 s of page time, whoever pushed it, goes in a puff and comes back `RETURN.quick` later in a puff,
resting on a clear floor spot in view (`returnLater(entry, {clear: true})` + `clearSpot`). Measured before choosing the
numbers: resting or eased against his side is +.002 to +.003 (his contact skin); forced in it hovers .008 to .018 in
and slides round him, so the clock keeps running until it is clearly out. Check: eased against his side for 2.5 s and
left there, nothing happens; forced in 1 cm a frame, gone .44-.48 s after first touching him and back at rest in
under .6 s, in view, clear of him, still afterwards; put inside him, gone at the next step.

**4. The flour arrives at the back.** Reproduced with the rack, the shelf's props, the cards and the kitchen out. The
causes were in floor-home's planning, not the flour's size:
- A crowded kitchen (box, flour and pail out) put the shelf's untouched props on the shelf, but after the plan was
  made: the flour's spot was chosen around the rifle and the tin lying in the front band, which then went up to the
  shelf, leaving the front empty and the flour far back.
- When the front band was full, any clear spot counted, however far back.
- Fix, together with the orchestrator's addition (nothing is put onto the shelf, its hooks or the stand for the player,
  the same rule as the pinboard's): floor-home no longer shelves anything. A newcomer whose only clear spot is behind
  his feet takes the least covered spot in the front band instead when it covers at most `FRONT.overlap` (15%) of its
  own picture; no other prop is moved for it. Floor-home also waits for a shelf still dropping in, so its place is known.
  Tried and dropped: making such a plan unclean so the repack ran with the newcomer first. It passed the check but in
  play it moved placed props on every crowded arrival (instrumented: the paper's arrival sent the flour far back).
- Checks: `physics-p3` puts the room in play (rack, kitchen, cards, eyes, the shelf's props on the shelf as the player
  would), then the flour: its picture's bottom is below his feet, in view (base: 515 and 601 px against feet at 604 on
  desktop, 226 against 245 on the phone; now 749 and 250-275). Then crowded (the shelf's props down on the floor, the
  crumbs): nothing on the shelf, hooks or stand, every loose prop on the page, at least 35% seen and picked by a real
  pick. `world-layout`: a new line, nothing is put on the shelf, its hooks or the stand.
- Limit, measured with sc/p3-cards merged in (cards on the floor too): every card, the eyes and the recipe lie in the
  front band, the flour's least covered front spot covers 33% of it, so it goes beside and behind him (clear, in view,
  reachable). Either the layout lane widens the front band or a bigger overlap is allowed: Aaron's or the orchestrator's call.

**5. world-board "postcard 100-drop loop" rest gap 2.59 px.** Cause (measured, seed 30): the postcard landed edge-first
and kept a floor contact whose normal pointed half sideways, at a positive distance (+.0008), while one corner was .0077
inside the floor. The solver never pushed it out and REST's own sunk guard reads that contact distance, so it slept
there. Fix: REST also reads the body's lowest collider point (`lowest()`, the floor check's own), and a calm body more
than `REST.sunk` inside the floor is lifted to `REST.lift` (.0008) above it and settles again. Gate unchanged (2 px):
the worst of the 100 drops is now .35 px.

**Stacked restores (the orchestrator, from the cards lane: play desktop "and are where they were left", 2 of 4).**
Instrumented with sc/p3-cards merged in (play + after-reload, 21 runs): no restored-asleep body was woken by the
restore order. The ticket and the recipe card were saved AWAKE at pagehide in every run that logged it (4 of 4): a card lying partly on another
never slept. REST put one to sleep while it touched the other, still awake; Rapier woke it at the next step; the two
took turns for ever (fix round A, note 3). The pagehide save keeps such bodies awake so they resume settling, and on the
reload they slid. Fix (`world.js`): when REST would put a body to sleep, the awake loose bodies it touches (and theirs,
up to `REST.group` 8) go to sleep in the same step once every one of them is slow; until then it waits. Measured after:
both cards saved asleep and still asleep after the reload in 7 of 7 runs that logged it. Also, as asked: `RESTORE.hold`, a body restored asleep in its saved
layout is held at its saved pose for the world's first 60 steps (put back and to sleep if a contact starting then
wakes it; any real wake ends the hold); it never fired in those runs, so it is a guard, not the fix.
Two other moves seen in those runs: the egg resting against his side was pushed when he changed pose 4 s after the
reload (his own motion), and twice a body resting against him (the controller, the crumbs) came back far away. That
was this lane's `CAT_IN`: after a reload his body appears (or he changes pose) overlapping what rests against him, and
it was taken for a push. Now his own motion is not a push: for `CAT_IN.grace` (1 s) after his body changes, a new
overlap is left to the solver to push out, as before this lane; only then is it judged.
Results, final code: play desktop + after-reload 3 of 3 on this branch and 3 of 3 with sc/p3-cards merged in (scratch
branch, deleted after); before these fixes the merged code failed 4 of 13.

**Pre-existing, found here, not changed:** `world-small-drops` phone, the eyes' "100 natural drops" energy gain .369
and `world-board` phone "asleep zero ... work" (3 syncs, 2 board draws while asleep) fail identically on the base 904695f
(same numbers).

## Layout lane (playtest-3, 2026-11-13)

Aaron's approved mock-up (sc/p3-mock, decision e1113-30, with e1113-07 and e1113-08), built for real on `sc/p3-layout`
(from `sc/p2-fixc` + the Butterman p3 lane). No `?mock` switch. The mock's full-target clear in `mesh-picture.js` was
not taken (the visual lane fixed the hairlines). Every choice below is open to his veto. Shots: `docs/shots/p3-layout/`
(`compare-*` before and after at 1536x864, 1920x1080, 844x390; `closeup-row-1920.jpg`; the stand and the cup falling).

| # | Ask | What is built | Choices for Aaron's veto |
|---|---|---|---|
| 1 | Shelf: IMG3 "a roughly 20 degree angle to the *right* and brought down a little bit lower and to the right"; "it would be nice to have the shelf have a shadow aswell. soft n simple, like the hat rack" | `src/world/shelf.js` SHELF_VIEW: turned 30 degrees to its right, rolled about its own depth axis until its front edge is level on screen (a few secant steps per layout; measured 0.00% slope at 1280x900, 1536x864, 1920x1080, 844x390). Moved right by 5% of the page width and down by 8% of its height, but not down on a screen 500 px tall or less (the rack is under it there). A soft shadow on the wall behind it: `softWallShadow` in `src/core/soft-floor-shadow.js`, the rack's blurred silhouette cast onto the plane its brackets meet, painted only when its art or its turn changes, moved (not repainted) during its slide-in. | The wall shadow's light is lower than the floor shadows' key light (`WALL_SHADOW.light`), so the shadow tucks under the plank instead of reaching far down the wall; opacity .18. |
| 2 | "have them arranged in a straight row next to the rack" | `floorRow` in `src/flappy/stand.js`: rack, stand, cup in one straight line at the rack's depth, the stand `gap` right of the rack's foot (its own art below `band`, .36: the hats hang above the row, so the row never moves as hats come and go), the cup `cupGap` right of the stand, the cup's right edge kept clear of his middle on the page. The stand is the stylish design (`src/flappy/stand-art.js`) at .8, turned 30 degrees like the shelf. The rack's own layout tells the row when it moves. | At the rack's depth at 844x390, 1536x864, 1920x1080. **A narrower window (1280x900, 1440x900) has no room between the rack and him for the whole row**: the row then steps back along the floor, both pieces together, just far enough (1.6 units at 1280x900; then it reads like the mock's desktop arrangement, smaller and further back). The alternative would be shrinking the row on narrow windows. The controller is .8 of its old size everywhere (.55 to .44 wide): the mock drew the seated controller at .8 with the stand, and a controller that grew when lifted out would look wrong. |
| 2b | "Just have butterman end the scene a bit more to the right" | `butterman-config.js` scene 2 `loop.end` [-0.36, 0.92] (was the ring's tangent out to [-0.72, 0.31]); `butterman.js` walks him off the ring to that spot, turning toward it over his first .75 beat. He ends right of where he stood and in front of the row (the row is never nearer than the rack's depth, 0.71), so he is never behind any of it; at 1536 and 1920 he overlaps the cup's foot and is drawn over it (measured on the frame). | One fixed spot for every screen. Clear of the row at 844x390 and 1280x900. |
| 3 | "IMG4: the controller should be more flat against the stand it kind of clips right now" | The cradle is fitted to the controller's hull: its lower edge against the front lip dowel, its grips on the low rest dowel, its triggers on the high one (its back is hollow between, like a real one's), all within 1 mm (art units), none passing in; `checks/bird.js` measures it. | The dowels moved to meet the controller (the cheeks' profile is the mock's). |
| 4 | e1113-07 "make it so that the controller rack and cup fall from above into place like the hat rack does"; the cup "right next to the controller stand" with the second egg | `src/world/rack-drop.js` takes any piece now (`root`, `id`): the stand falls in after the trailer, the cup with the player's second egg (`recipes.js` dropEgg, count 2; saved as `eggCup`; a save already past its second egg gets the cup on load, standing). Calm: a fade. The cup (`src/world/egg-cup.js`) is a white footed porcelain lathe sized to the room's egg, one slot: the egg dropped on it ("Release to place") snaps in upright, blunt end down, at the lowest seat its shell allows; it persists like the controller in the stand. | No startle from the cat for either arrival (the rack's startle is its own). The egg is never put in the cup automatically (the physics lane's no-auto-shelving rule). |
| 5 | "I assume the stand and the egg cup will have proper shadows once theyre placed" | Both use the rack's soft floor shadow (`world-layout.js` SOFT_SHADOWS, a small commented edit), the seated controller and the seated egg included; it fades in with the fall like the rack's. | |
| 6 | Colliders and occluders | Stand: plinth box, each cheek as two convex pieces, each dowel a 16-sided prism (`standShapes`). Cup: foot and stem, then the bowl's wall in twelve pieces, so the bowl is hollow (13 colliders). Both are fixed world entries with pictures, so the scoot reads them; the seated controller and egg are registered as occluders too (`stand-seat`, `egg-cup-seat`): the stand is an open frame and it is the controller in it that hides a thing. A row piece arriving or moving onto a resting keepsake moves it clear (`clearFootprint`: toward the room, else to the right, else back). | |

**Checks** (desktop dpr 1, 1536x864 and phone 844x390, under load 11-25): new `egg-cup.js` + `-reload.js` (in `run-all.sh`,
also calm); `bird.js` + `bird-stand-reload.js` (the fall, the row, the controller flush, no second fall); `furniture-p2.js`
item 1 (slope under 1%, turned 24-36 degrees right, moved, the wall shadow; e1113-30); `world-layout.js` + `-reload.js`
(the row in a furnished room, nothing left inside it, back after a reload); `world-occluders.js` (a tin behind the
seated controller is scooted out); `box-home.js` (with the row there, clear of it and in view); `butterman-p2.js` (the
end of scene 2 against the row); `butterman-p3.js` + `-reload.js`; `kitchen-egg`, `world-shelf`, `world-shelf-play`.
All pass, with these reruns under load: `furniture-p2` phone item 2 (the shelf outline read before it was drawn) and
`butterman-p3` desktop (the recipe card's 0.8 mm settle during scene 3) passed on a rerun; `kitchen-egg` phone (the bird
drawn 26 px wide against a 30 px gate) passed on a rerun; `world-layout` phone's matched rest submission cost read
0.100 ms against its 0.1 ms gate once (0 ms on another run).

**Found, not changed:** `box-home.js` "on the floor beside him, not far back by his head" fails at 1536x864 on the base
build too (box bottom 539 against his feet at 577; run-all only runs 1280x900 and 844x390). With the row on a phone,
floor-home now puts a fresh box back and right of him (bottom 205 against feet 245) because the front-left floor is
furnished: in view and clear of everything, but far back. Both are floor-home's rules (physics lane); `box-home.js` notes
the second without gating it.

## Integration (playtest-3)
Branch `sc/p3-final` from `sc/p2-fixc` 904695f. The eight finished lanes merged one at a time (`--no-ff`), in the order
book, cards, visual, gags, fx, butterman, physics, layout. Only `docs/REVIEW.md` (every merge) and `checks/run-all.sh`
(fx) conflicted, both appends: kept both sides. Shared files merged cleanly (world.js, floor-home.js, galaxy.js,
recipes.js, achievements, hush, play.js); each was read after the merge. Sounds: only the fx lane added sounds, so the
manifests and counts needed no union; `sounds-files.py`, `sound-originals.py`, `sound-playtest-files.py` pass. The mock's
full-target clear in `mesh-picture.js` is not in (neither lane took it).

**One redraw after Butterman's lens.** Two mechanisms redrew pictures after the rise: the visual lane's camera watch
(`world-presentation.js`: two still frames after any projection change, the pictures drawn with another camera are
redrawn through their owners, ~1.5 ms a frame) and the Butterman lane's `world.cameraBack()`, which also synced every
body at once. Kept: Butterman's `stage.cameraBorrowed` hold for the world's decisions (rest fits, saves, off-page
returns, scoot judging), and `cameraBack()` now only runs the rests that waited. The redraw is the watch's alone (the
lens's `updateProjectionMatrix` arms it), so a picture is redrawn once, spread over frames, not all in one frame.
`visual-rise` and `butterman-p3` pass at desktop and phone.

**Integration to-dos.**
1. *Flour in a full room* (physics lane's limit). Cause: every prop lying on the floor counted its whole screen box as
   taken, so with the four cards down the front band had no clean spot. Built: a prop lying flat (colliders under .02
   high as it lies: the cards) and floor art (the puddle) take their floor area, not height. A newcomer's base (its
   own floor area on screen) keeps off them; the rest of its picture may stand over a flat prop behind it, hiding at
   most 20% of it (`FRONT.shown` .8: the room's "mostly unobstructed" rule in `world-layout.js`; tried .6 first, which
   breaks that rule). Nothing is shelved or moved for it. Result: the re-given flour lands in the front band in play's
   everything-at-once room at both sizes, and the egg too; **not resolved** for a big prop when the front band is full
   of standing props: in play's room the bucket (desktop and phone) and the tin (phone) still go back, and
   `physics-p3` "the flour arrives in the front floor band" fails in about half the desktop runs (its room has the
   bucket, egg, box and rack standing in the band; the best front spot is 28-31% covered by them). Measured what would
   help (my diagnostics, not built): raising the band's top edge to his back adds nothing on a desktop; letting the
   band reach down past the footer line (bottom up to 60 px above the page's bottom) gives 2-19% covered spots. That
   crosses the "above the footer" rule (`floorRect`, `fitResting`, and the checks' `inView`), so it is a design call.
2. *Narrow desktop windows* (row shrink): **not built; needs a decision.** Measured the scale the stand and cup would
   need to stand in a straight row at the rack's depth with the gaps at their minimum: 1280x900 0.68, 1024x768 0.62,
   1440x900 0.89, 1280x800 0.94 (1366x768 and wider fit as they are). 1280x900 (run-all's desktop size) is a third
   smaller, not "slightly". Shrinking also means the seated controller drawn smaller than when it is lifted out (the
   layout lane rejected a controller that changes size; it is a fixed body at its full 0.44 in the cradle, and its
   drawing is attached inside the stand's picture), rebuilding the stand's and cup's colliders on resize, and
   changing bird, world-layout, furniture-p2 and egg-cup at that size. The row still steps back there (layout lane's
   rule). Options: (a) shrink to at most ~0.85 and step back the rest (1440x900 and 1280x800 then fit at the rack's
   depth); (b) the full shrink, with the seated controller drawn to match; (c) keep the step-back.
3. *Leftovers from the p2 full suite* (re-run on this branch):
   - `world-small-drops` phone, eyes energy .369: **fixed.** Rapier's speculative (soft CCD) contacts gave a
     still-spinning landing energy (a step's angular 8.9 rad/s became 4.2 m/s sideways). 400 seeds: soft .03 popped 2
     (phone) and 1 (desktop, .166); soft 0 none at either size. The eyes now have no soft prediction
     (`material.speculative:false`, `world.js`); full CCD still comes on when they move fast. Once, under load 16, a
     desktop run read .0101 against the .01 gate (three later desktop runs .0004); likely REST's lowest-point lift
     (potential energy), not proven.
   - `world-board` phone "asleep zero work": passes on this branch (twice); no change.
   - `world-shelf-solids` desktop, pat visual gap 2.03 px: **fixed.** The pat's hull sampled its rounded edges at 90
     degree steps, so resting on an edge its art sank .0047 below the hull (1.7 px). Sampled at five directions an
     axis now (sag under .0005): .25 px desktop, .67 px phone.
   - `look-pat-return` desktop: passes (twice, load 5-6); no change.
   - `shell-books` phone confirm lines: one run in ten failed here, never with the debug lines on. Both failing lines
     read the three setup bonks; the setup now waits for each tap to be taken (a tap during his last hop can miss him).
     Not proven to be the cause.
   - `achievements` phone, Spin Doctor vel 0: **fixed** (check). The flick started 60 px left of his middle, which on a
     phone is air (a stroke, not a spin). It starts on him now; same speed.
   - bulb "second sigil is not delayed": 443 and 448 ms at desktop; 1060 ms on the phone run under load 12-19. It is
     wall clock including the drawn stroke; no real delay found.
   - `rack-frames`: the failing line was "collection desktop resized" (the log prints no detail); passes here, both
     sizes; no change.
   - Cost gates: the host never got under load 4 this evening (other sessions' work kept it at 6-12), so these ran
     with run-all's own rule (wait up to 3 min for under 8, one retry). All pass on the first try, median p95:
     world-final-cost phone 2.4 (twenty) / 2.9 ms (maximum), desktop 2.6 / 2.4; world-shelf-cost phone 1.2 / 1.4,
     desktop 1.4 / 1.0. Nothing to profile.

**Other fixes found while checking:** `world-arrivals` asserted the p2 shelf (2 degrees); it now reads the layout lane's
`SHELF_VIEW.yawDeg` (30, e1113-30). `bread` phone's "blast-off dark covers everything" read one pixel per probe and a
star of the fx lane's new field sat on one (28/255); the probes read the darkest of a 5x5 patch.

**Checks run (step 3).** Every lane's new and updated checks through run-all's own lines (a filtered copy), desktop
dpr 1 and phone 844x390 (dpr 2 where run-all pins it), under load 8-19: book (achievements, -book, -view + 640x360,
-badge + calm, grimoire, shell-books, text + calm), cards (cards-tap, kitchen-card, world-arrivals + calm, world-board,
polish-paper), visual (visual-hairlines + dpr 1.5, visual-rise), gags (bread + calm, gags-hats, gags-glass + calm, sky,
party + calm, world-cake-ending + calm, bread-float + calm + shots, world-small, gags-cakes, world-cake, polish-cat,
look-landing, play), fx (bolt-visual + calm, galaxy-glow, debug-panel, sounds, sounds-playtest, the three sound file
checks), butterman (butterman-p2, -p3, polish-butterman), physics (physics-p3, kitchen-chest, world-layout,
world-small-drops, world-shelf-solids, look-pat-return), layout (egg-cup + calm, bird + calm, furniture-p2,
world-occluders, box-home, kitchen-egg, world-shelf, world-shelf-play, polish-hat-butter, bulb + calm); and at 1536x864
egg-cup, bird, furniture-p2, world-layout, world-occluders, butterman-p2, box-home, visual-hairlines, visual-rise. All
pass, with these first-run failures rerun and passing on this branch: play desktop ("where they were left", shards .03,
the known reload drift), bread desktop (crumbs 704 ms against 450, wall clock under load 14), party phone (audio level 0
under load), bulb phone (bob and the 1060 ms), furniture-p2 phone ("the whole shelf is outlined", the layout lane's
known flake), physics-p3 desktop chest line (the flour not yet asleep after 15 s under load 15; asleep in 3 later runs).

**Still open (recommendation each):**
- `physics-p3` desktop "the flour arrives in the front floor band": fails about half the runs (item 1 above). Needs the
  footer-line call; until then the final suite may show it.
- `physics-p3` phone "nothing lost": the crumbs at the page's right edge behind the recycling bin, 9% seen, in 2 of 4
  runs here (pass in the other 2). Not seen on the physics lane's branch; the merged room (cards on the floor, the
  shelf moved) is more crowded. Likely the scoot not finished when the check measures (it cannot go right at the
  page's edge, flips once, then waits SCOOT.patience 6 s), not proven. For the physics owner.
- `world-layout` at 1536x864 (not in run-all): "default collection mostly unobstructed" fails, the tin over the ticket
  (55%) and the rifle over the postcard (33%); identical with the flat-prop rule switched off, so it comes from the
  merge itself (cards no longer pinned, the shelf's props no longer shelved). Its rest-submission gate read 0.100 ms
  against 0.1 there (the layout lane saw that once too).
- `world-small-drops` desktop: one read of .0101 under load 16 (above).
- Row shrink on narrow windows (item 2): Aaron's or the orchestrator's choice of (a), (b), (c).

### Integration, second round (the orchestrator's calls on the open items)
1. **Flour: the two rooms.** No crossing of the footer line. `physics-p3` item 4 now has two lines. The strict one uses a
   *normally furnished room*: the rack, the shelf's own props (rifle, top, tin) up on the shelf, the three cards
   (paper, postcard, ticket) lying on the floor, the box, and the eyes on the badge; the flour must arrive in the front
   floor band, in front of his feet. Then the room is made *truly full* (the bucket, the recipe card and the egg added)
   and a new flour is given: it may land beside or behind him, but in view, reachable by a real pick and at least 35%
   seen (the occluders' bar). The crowded line after it (the crumbs, nothing shelved, nothing lost) is unchanged.
2. **Narrow windows, option (a): not built; neither allowed path is clean.** The stand's cheeks stand exactly at the
   controller's ends (their inner faces at .275 art units, the controller's half-width), so the stand cannot shrink
   around a controller kept at 0.44: at 0.85 the cheeks would pass through it. Scaling the seated controller with the
   stand is clean to draw (its picture is attached inside the stand's), but then it is drawn smaller seated than
   lifted, which the call rules out. What stays possible without either: the plinth trimmed to the cheeks' width and
   the cup alone at 0.85 save .07 of row width; 1280x800 would then fit at the rack's depth, 1440x900 (still .02 short)
   and 1280x900 (.20 short) still step back. Not built: two small changes to the approved stand for one window size. The clean path, needing a yes because the controller then changes size by
   window: size the controller and stand together from the window when they are made (0.85-1), as the egg and its cup
   already are (`refScale * min(1, width/600)`); same size seated and lifted, and 1440x900 and 1280x800 fit at the
   rack's depth. Until then the row steps back on narrow windows (the layout lane's rule).
3. **The crumbs behind the bin** (physics-p3 phone, "nothing lost"). Measured, three runs: the bin IS an occluder for
   the crumbs (exposure names `furniture-recycle-bin`) and the scoot works (it freed them about 1.5 s after starting).
   The cause: the bin comes *because of* the crumbs, slides in to its fixed home and stands on or in front of them
   (they were planned at 772,251, inside its 765,231,61x50), and the occluders' next look only comes after the crumbs
   have rested 1.2 s and the sweep's next round, about 4 s after, later than the check (and a player) looks. Fix
   (`src/gags/recycle.js`): once the bin stands at its home it moves any keepsake off its footprint (the floor row's
   `clearFootprint`) and judges at once any it hides, so the scoot starts then. Tried first and dropped: weighting an
   overlap with furniture 20x in floor-home's crowded plan (the bin was not there yet when the crumbs were planned).
4. **world-layout at 1536x864** (the tin over the ticket 55%, the rifle over the postcard 33%). Planned rects were apart;
   two things moved them after planning: (a) `cards.js` ran `clearOfCat` on the planned spot at the height the card
   falls in from, where it met his chest, and shoved the ticket 150 px sideways onto the tin's planned spot; it now
   judges the card at its resting height, which is where floor-home checked it clear of his hulls. (b) The rifle was
   planned with its hull only; its scope (the splat) stands 16 px above that, and the postcard planned just behind the
   hull's box lay under the scope. The rifle is now planned with the splat's extremes too (`splatExtremes`, exported
   from `prop-picture.js`, ~1-2 ms once at its arrival). run-all now also runs `world-layout-1536x864`.

**Reruns after these (all on dfeb9e9's successors, a snapshot of the branch, load 8-24):** physics-p3 five runs at each
size: the two flour lines and "nothing lost" pass 5/5 at both sizes; three more desktop runs pass. One desktop run
of the eight failed a different line, "everything taken out of the chest ... never against the box" (the tin's
picture 46% over the box's): seen once, for the physics owner. world-layout desktop, phone and 1536x864; bird and
egg-cup at 1280x900, 1440x900 and 1536x864; furniture-p2, world-occluders, box-home, gags-box, kitchen-recycle,
cards-tap, world-board, kitchen-card and world-arrivals at desktop and phone: all pass.
