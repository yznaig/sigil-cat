# Workflow
How to build the floating-cat site with Claude Code, from the cat model to the live page, step by step.
**Written before the rebuild (the mesh-cat plan): phases 0-2 no longer match the code. Today's layout is in `README.md`, the check is `checks/run-all.sh`.** Research round 1, 2026-11-07. Why each step looks like this: `docs/research/sources.md`; stack choices: `docs/research/render-stack.md`.

## The one pattern

Every credible source does the same thing: **give Claude concrete references and a written spec, plus a check that passes or fails, and let it loop against that check.** Ask it for evidence (the screenshot, the command output), not a claim that it works. Every step below ends on a check.

## Phase 0: set up the repo (once)

1. **Restructure for one page.**
   - `index.html` becomes the cat page. The shelf (`trinkets.js`, `trinkets/`) retires.
   - Easter eggs go one per file in `eggs/` (`eggs/butterman.js` + `eggs/butterman.config.js`), so two people rarely edit the same file.
   - The cat code goes in `cat/`: `scene.js`, `pose-cycle.js`, `config.js`, `sounds.js`.
   - `assets/` holds `cat.glb` and the `audio/` and `sounds/` clips.
   - *Check:* the page loads from `python3 -m http.server` with no console errors.
2. **Start from the prototype.** `prototypes/cat-viewer/index.html` already has the renderer, lighting, turntable rotation (left-right only, decision e1107-36), tap-to-sound, pose cycle, emotes and butter. `prototypes/cat-glb/` has the GLB loader version. Split it into the modules above rather than rewriting it.
3. **Write `CLAUDE.md`** at the repo root, on one screen:
   - how to preview (`python3 -m http.server`, then `shot` on `localhost`)
   - the done check (next item)
   - the pinned three.js version and the "one importmap" rule
   - the file layout
   - "push only when asked"
   - a pointer to `docs/design/principles.md`
   - nothing Claude can read from the repo itself.
   *Check:* it fits on one screen.
4. **Add debug hooks to the page** (the prototype has all five):
   - `#debug`: on-screen readout of pose, draw calls, frame time
   - `#pose=sleep`: start in a pose
   - `#t=1.5`: freeze one moment, for repeatable screenshots
   - `window.catViewer`: a handle that test scripts drive
   - `?perf=1` (built in round 2): fps, average and worst frame time, draw calls, triangles, pixel ratio, GPU and device, plus what the adaptive pixel ratio did. Readable off an iPhone screenshot. `&dpr=1` pins the ratio; `&burn=12` fakes a slow phone on a laptop.
5. **Add `.nojekyll`** (stops GitHub's Jekyll step from dropping `_` files). Use only `./` relative paths, since the site lives under `/sigil-cat/`.

## Phase 1: design direction (before more code)

6. **Collect 3–6 references** in `docs/design/refs/`: a matte-black cat sculpture or figurine, a lighting reference, one or two sites whose feel you like. Concrete references beat adjectives. Meng To: "Copy one reference and you get a clone. Take one idea from two and you get a direction."
7. **Write `docs/design/principles.md`** using the plan step of Anthropic's `frontend-design` skill:
   - 4–6 named hex colors and one or two typefaces
   - the motion rule: "spend your boldness in one place", and here that place is the cat
   - a list of what to avoid.
   Then have Claude review the plan against the skill's list of generic tells, for example tracked all-caps labels, identical rounded cards, and near-black standing in for black.
   *Check:* every choice is named, and the review finds nothing generic.

## Phase 2: the cat model

The research recommends building the cat yourselves in Blender: no free or AI model fits the featureless look with sit, lie and sleep clips (details in `sources.md`). Estimate: 17–37 hobby hours, or 3–6 weekends. Do the first export round trip around hour 6.

8. **Day-1 test asset.** Load the CC0 Quaternius cat (poly.pizza/m/qKICY6xla2) into the page with GLTFLoader. This proves the loader, the mixer and phone performance before any art time is spent.
   *Check:* its clips crossfade in the page.
9. **Block out the shape.** Start from a subdivided cube, extrude the legs and ears, and add a curve for the tail.
   - Or generate a starting shape from a side-view silhouette with Tripo or Meshy, then remesh it to 6–12k triangles. Use AI only for the starting shape: its topology bends badly.
   - The brothers judge the silhouette. It's the whole product with a featureless black cat.
   *Check:* the black silhouette reads as a cat from the side, front and three-quarter view (render it black).
10. **Rig it.** Have Claude write a `bpy` script for a ~25–35-bone armature:
    - bones: `root`, `hips`, `spine_01–03`, `neck`, `head`, `ear_L/R`, `tail_01–06`, and three to four bones per leg. Use underscores, never dots: three.js strips dots from names, so `ear.L` becomes `earL`.
    - an Empty named `butter_socket` under `head`
    - bind with automatic weights, then fix the weights by hand (ears bleed into the skull, shoulders into the body)
    - put an edge loop at every bend.
    - Alternative: Rigify's Basic Quadruped metarig (built into Blender), if they want ready-made IK controls.
    - Claude can drive Blender through MCP for Blender (ahujasid), but credible runs show it's good at numeric setup and weak at shape and weights. Use the manual `uvx` install, not curl-pipe-sh.
    *Check:* every bone has a code-friendly name, and the cat bends without pinching.
11. **Author the clips**, one Action per clip, pushed down to its own NLA track, named exactly as the code calls them:
    - holds: `sit`, `lie`, `sleep`
    - one-shot: `stretch`
    - transitions: `sit_to_lie`, `sit_to_stretch`, `lie_to_stretch`, `lie_to_sleep`, `lie_to_sit`, `sleep_to_lie`
    - additive overlays: `add_hop`, `add_startle`
    - full emotes, which end on a named pose: `emote_wake`.
    Rules:
    - Make one pose asset per hold (`P_sit`, `P_lie`, `P_sleep`). Every clip touching a pose starts or ends on that asset, with every deform bone keyed on those frames.
    - Holds loop cleanly (last key = first key).
    - Everything stays in place: no root travel.
    - `add_*` clips start and end on their frame-0 pose, because the code makes them additive.
    - Give holds a Cycles F-curve modifier, so the loop seam is smooth.
    *Check:* the clips play in gltf-viewer.donmccurdy.com with no pops at the seams.
12. **Export** glTF Binary with the settings table in `docs/research/render-stack.md` → Model files, then compress:
    ```
    gltf-transform optimize cat.glb assets/cat.glb --compress meshopt \
      --simplify false --flatten false --join false --instance false --palette false --texture-compress false --prune false
    gltf-transform inspect assets/cat.glb
    ```
    The key Blender settings:
    - *Animation mode: Actions*
    - *Reset pose bones between actions* on
    - *Force keeping channel for armature/bones* on. Otherwise *Optimize Animation Size* strips a still hold's unmoving bones, and the crossfade leaves the previous pose on them.
    - *Export deformation bones only* on.
    *Check:* `inspect` lists every clip name, and the file is 500 KB or less.
13. **Swap it in.** In `cat/scene.js`, replace the primitive cat with the GLB and set `frustumCulled = false` on the skinned mesh. Parent the butter mesh to `butter_socket`. The pose-cycle player finds clips by name, so it needs no changes.
    *Check:* the `/add-cat-animation` skill's verification passes for every clip.

## Phase 3: features, each through the build loop

The build loop for each feature:

14. **Idea file.** Write `docs/ideas/<name>.md` (either brother; github.dev works).
15. **Spec.** Ask Claude: "Interview me until you could write the spec, then write it to `docs/specs/<name>.md`." The spec ends with a "done means" list: what's on screen, phone behavior, no console errors. Build it in a **fresh session**.
16. **Build in small files.** Ask for ambition outright ("be ambitious: reduced motion, phone layout, a little reaction").
17. **Screenshot loop.**
    - `shot http://localhost:8000/#debug --mobile`, then read the PNGs and the console notes, fix, and repeat.
    - **For animation, shoot fixed moments** (`#pose=sit&t=0`, `#t=1.5`), never one random frame. A still of a moving thing sends Claude into an over-fixing loop (Nate Herk's warning).
    - Interactions go through `shot --js` with synthetic pointer events and a results overlay. The prototype's checks show how.
    - Put each round in its own folder: `--out shots/r3/`.
    *Check:* the shots match the spec and the references, and the console notes are empty or explained.
18. **Optional scored polish for the cat's hero view.** A fresh-context judge subagent scores each screenshot against a target image with a rubric (silhouette, light, material), with a stop score and a round cap. This is Meng To's dream-loop pattern: 4.6 → 8.05, mostly from lighting. It's expensive, so use it once, for the cat.

The features:
- **Tap sounds.** Drop MP3s in `assets/sounds/` and list them in `CONFIG.sounds`.
- **Pose cycle tuning.** Hold ranges and weights live in `CONFIG.cycle`.
- **Butterman.** Use the `/tune-butterman` skill: a stick figure in the 3D scene, a GSAP timeline driven by the Web Audio clock, every beat in `eggs/butterman.config.js`, and a `?tune` panel with Copy config.
- **Footer links.** Plain anchors. Accounts are still to come from the brothers.
- **Nostalgia eggs.** Pick from `docs/research/nostalgia-ideas.md` and add them with the `/add-easter-egg` skill.

## Phase 4: check it's smooth

19. **Headless smoke check on every change.**
    - The page loads, and `shot` reports no CONSOLE error or PAGEERROR.
    - The canvas isn't blank: sample pixels where the cat should be, and check they're darker than the background.
    - `window.catViewer` drives a drag, a tap, a pose change and the butter.
    Headless Chrome renders WebGL on SwiftShader (a CPU renderer), so its frame times are a regression signal only.
20. **Real numbers.**
    - **Laptop:** open the page in Windows Chrome via `localhost` (WSL forwards it) with `?perf=1`.
    - **Phone: Aaron's is an iPhone** (decision e1107-38). Open the Pages URL with `?perf=1` in Safari and screenshot the readout. There is no USB DevTools route from Windows: Safari's Web Inspector needs a Mac, so the on-screen readout is the tool. Chrome on iPhone runs the same WebKit engine, so one browser test covers both.
    - iPhone gotchas to check each time:
      - **Low Power Mode** caps the page at 30 fps. The readout says "steady 30 fps: Low Power Mode?" and the adaptive pixel ratio ignores it. Test once with it off.
      - **Silent switch** (decision e1107-37): tap sounds stay quiet on silent; Butterman plays anyway. Check both switch positions.
      - **First tap** must make a sound (audio unlock), and a vertical swipe on the cat must not spin him.
    - Targets: frame time p95 at or under 16.7 ms on the laptop, and the phone holding about 30+ FPS. Since the adaptive ratio steps down on its own, also check it didn't settle below 1.5 on the iPhone (the `dpr` line); if it did, the scene is too heavy.
    - If the phone struggles, cap the pixel ratio lower, drop sheen, and simplify the mesh, in that order.

## Phase 5: ship

21. **No PRs, no preview builds** (decision e1107-38). The brother pushes straight to `main`; the live URL is the preview. Aaron's parallel Claude sessions each get a worktree (`claude -w <name>`) and a branch, then merge into `main` locally.
22. **Preview** = the live URL after a push. Pages caches files for 10 minutes, so add `?v=<date>` to changed script URLs, or hard-refresh. Before pushing, run the Phase 4 checks locally so a broken page is caught before it's live.
23. **Pull, then push when Aaron says so.** Always `git pull --rebase` before pushing, since the brother may have pushed to `main` in the meantime. Pages redeploys in about a minute.
    *Check:* the live URL shows the change after a hard refresh, with no console errors, on a laptop and a phone.

## Two-person setup

- **Brother:** writes idea files and small edits in **github.dev** (press `.` on the repo). It has no terminal and can't run code, but it can commit straight to `main`, which is how he ships (decision e1107-38). His best lever is taste and jokes: idea files that Aaron's sessions turn into builds.
- **`@claude` in issue comments** (claude-code-action) would let the brother ask Claude directly, but it bills API tokens. That's Aaron's call. (PR comments are moot now that he pushes to `main`.)
- **Collision defence:** one file per egg; append-only lists; small commits; pull before every session. Shared files (`index.html`, `cat/`) are edited by one person at a time: say so in the chat first, since there are no PRs to catch a clash.

## Project skills (drafts in `.claude/skills/`)

- `add-cat-animation`: add or replace a pose, transition or emote clip and verify it with fixed-moment screenshots.
- `add-easter-egg`: add a gag to the cat page as its own file, with a trigger, a reaction, and a smoke check.
- `tune-butterman`: build and tune the Butterman timeline, with all timing in one config and audio files never edited.

Each is a draft for Aaron to approve.
