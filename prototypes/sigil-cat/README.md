# Sigil Cat prototype
The real cat: built from the AI base mesh, rigged, springy rubber-hose clips with sculpted pose shapes, felt finish, springs and a tail idle in three.js.
Built 2026-11-07 (decisions e1107-49, e1107-64); loaf and sleep refit to the brother's pose sheets, creases and baked
AO added 2026-11-08 (e1107-64, e1107-71). How the cat is made: `build/README.md`.

## Run it
`python3 -m http.server` from the repo root, then open `http://localhost:8000/prototypes/sigil-cat/`.
Buttons: Sit, Loaf, Sleep, Stretch, Hop, Butter, Auto (the pose cycle runs by itself when Auto is on).
Drag to spin him, tap him. URL options are listed at the top of `index.html` (`#debug`, `?perf=1`, `#pose=sleep`,
`#t=1.9`, `#yaw=-90`, `#springs=0`, `#idle=0`, `#sheet=stretch`).

## Done check (from the brief)

| Check | Result |
|---|---|
| Loads the cleaned cat, under ~30k triangles and 2 MB, no page errors | **Pass.** 21,890 triangles, 0.92 MB GLB (normals kept exact, `build/compress_glb.mjs`; with `_AO` and the per-pose `_AOD0`/`_AOD1`), 2 draw calls; `run-all.sh` ALL PASS (2026-11-08, pose shapes) |
| Front and side next to the sheet's | **Pass.** `compare-front-side.png` |
| Full sit → loaf → sleep → stretch cycle with squash and stretch and secondary motion; tail idles while sitting | **Pass.** `checks/cycle.js` ran the cycle, the stretch one-shot, tail idle weight 0.98 while sitting with a flick inside 7 s, tap hop, tap-to-wake, butter, auto cycle |
| No clipping from 8 angles at sampled frames of every hold and transition, contact sheets saved | **Pass again (2026-11-08, sigil-cat-clipfix).** All 12 clips clean: every other frame in `check_clips.py`, and every frame in a scratch scan. No collapses (the lowest is `sleep_to_lie` at 98.4% of its volume) and no pops. `checks/contact/clip-check.json`, sheets in `checks/contact/` (the sheets before this repeated one stale sit image; fixed in `blender_util.render_to_array`). What fixed the five transitions: `build/README.md`, Lessons. The springs and tail idle add motion the clip check can't see (capped; `checks/springs/`, by eye). |
| Free-animation verdict | **Pass.** `docs/research/cat-animations.md`: no license-clean clip fits; hand-keyed |
| (e1107-64) Loaf, sleep and stretch next to the new pose sheets (front, side, 3/4); no transition pops or collapses | **Partial.** `compare-poses.png`. Loaf and sleep are wrapped onto smooth primitive blockouts (2026-11-08, e1108-04: round head, one dome, two paw balls, no fold lines; `compare-poses-closeup.png`; silhouette overlap front / side / 3/4, height-normalised, `anim_cat.py compare`: loaf 0.866 / 0.852 / 0.876, sleep 0.899 / 0.873 / 0.851; before, on AI meshes: loaf 0.86 / 0.85 / 0.87, sleep 0.83 / 0.86 / 0.81 (was 0.82 / 0.70 / 0.80); stretch 0.79 / 0.37 / 0.58, as before). The diagonal flank line Aaron still saw after the clip fix was the GLB compression clipping the shapes' normals (fixed: `build/compress_glb.mjs`). **Stretch is unchanged** (the previous build's skeleton bow): every fitted stretch read worse or clipped (`build/README.md`). No pops (no frame jumps 2.5x its neighbours) and no collapses (every clip keeps at least 96.4% of its volume). |
| (e1107-71) Crease definition and baked crease shadows | **Pass, subtle.** `compare-creases.png`: two round front paw balls with a notch between them and a crease to the chest, a chin/neck crease, ear bases, light haunch lines, and the sit tail no longer peeks out from the front (it curls up behind his back). `_AO` (0 = occluded) is on the body, not the whiskers, and survives gltf-transform as float32; under the current material the AO is faint (`#ao=0` to compare). |

## What to look at for the springy feel
1. **Loaf → Sit** (press Loaf, wait, press Sit): the squash down before he pushes up (anticipation), the stretch past
   sitting height and the settle (overshoot), ears and tail arriving last (follow-through).
2. **Sit → Stretch**: crouch, spring up, the bow with the tail hooking over, the pop back up, and the squashed landing that bounces into the sit.
3. **Tap him while he sits**: the hop overlay plus the jelly squash.
4. **Spin him hard and let go**: ears, whiskers and tail trail the turn and wobble to rest (the springs).
5. **Leave him sitting** with `#debug` on: the tail sways out and flicks every 2-6 s (the readout shows `FLICK`).

## Knobs (all in `CONFIG` near the top of `index.html`)

| Feel | Knob |
|---|---|
| Ear wobble | `springs.ears.freq` (higher = snappier), `.damping` (lower = more wobble), `.maxDeg` |
| Whisker jiggle | `springs.whiskers.*` (same three) |
| Tail follow-through | `springs.tail.freq` [base, tip], `.damping`, `.maxDeg`; `tailNoSink` keeps it off the floor and out of his body |
| Tail idle | `tailIdle.sway.deg` / `.period`, `tailIdle.flick.deg` / `.every` / `.dur` / `.double`, `tailIdle.poses` (how much per pose) |
| Float bob | `float.height`, `float.bpm` (120 = Butterman's tempo), `float.beats` per bob; `bpm: null` free-runs at `speed` |
| Felt look | `look.roughness`, `look.sheen`, `look.grain.scale` / `.bump` / `.tone`, `look.whiskerRoughness`, `look.shadowOpacity` |
| Pose cycle | `cycle.poses[*].hold` (seconds) and `.next` (weights), `cycle.rateJitter` |
| Clip-level springiness (squash depth, overshoot, timing) | baked in Blender: `build/anim_cat.py` → `CLIPS` (times and eases) and the pose tables; rebuild per `build/README.md` |

## Known gaps
- The stretch still doesn't match the sheet (shorter, head higher, less arched). A rubber-hose squash (smaller, lower
  head) was tried on 2026-11-08 and clipped through the front legs every time: see `build/README.md`, Lessons.
- The loaf's and sleep's tails reach round his side but not to the paws as on the sheets (the tail bones' length).
- In the sit the tail now curls up behind his back (the sheet never shows it; round a haunch it peeked out from the front).
  The cost: from the side it stands up behind him, so the sit's side overlap fell from 0.82 to 0.66.
- Emotes: hop and startle are clips. Wake reuses `sleep_to_lie` at 1.5× with a startle. Spin is a hop plus one turn of the whole cat.
- Real phone numbers are still to take with `?perf=1` on the iPhone (headless frame times mean nothing).
