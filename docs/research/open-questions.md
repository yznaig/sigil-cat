# Open questions and gaps
What research rounds 1 and 2 left for Aaron and the brothers to decide, what they closed, and what still isn't covered.
Updated after round 2, 2026-11-07. Details live in `cat-model.md`, `nostalgia-shortlist.md`, `render-stack.md`, `workflow.md`, `sources.md` and the prototype READMEs.

## Decisions for Aaron and the brothers

1. **The cat model: go with Claude-scripted Blender?** Round 2 recommends it (`cat-model.md`).
   - $0, and the cat is entirely our own work, so there's no license question on a public repo.
   - About 8–12 Claude hours over 4–6 review rounds where the brothers art-direct.
   - The blockout already exists: `prototypes/cat-glb/index.html#model=models/claude-blender-cat.glb`. Watch it move first.
   - Runner-up: the procedural SDF cat in `prototypes/cat-sdf/` ($0, no Blender). Third: the $19.90 Indie Cat pack, whose clips are better on day one but which can't sit in a public repo without the seller's written OK.
2. **Run the local AI image-to-3D trial on your GPU?** Researched but not run: the permission classifier blocked cloning and running outside research code (Hunyuan3D, TRELLIS). Say yes and a session can install them in `~/ai/` venvs. It's not needed for the recommendation; it would only add a base-mesh option.
3. **The black.** Neutral tone mapping (crisp black with rims; the prototypes' default) or AgX (charcoal, more form)? And `#0d0d0f` or `#1c1c1e`? Compare `prototypes/cat-viewer/index.html#tone=agx` on the iPhone.
4. **Drift back to face front after a spin?** Built as `CONFIG.rotate.returnHome`, on by default (2.5 s idle, then eases to the three-quarter view). Keep it on, or off?
5. **Gestures on the cat page.** Two questions:
   - Sigils need `touch-action: none` and touches routed by where they land. Today `pan-y` hands vertical swipes to the browser, which cuts off any up-down stroke, and the page never scrolls anyway.
   - Should a drag *beside* the cat still spin him live, or draw a sigil? `nostalgia-shortlist.md` proposes: on the cat = spin, on empty space = sigil, a quick tap on empty space = Pointer Cat.
6. **Yell to summon Butterman:** OK that iPhone Safari asks for the microphone on every visit? (WebKit asks again after each reload.)
7. **Counter verb** for the footer odometer: bonked, petted or booped?
8. **Butterman staging** (`prototypes/butterman/README.md`):
   - The cross walks in front of the cat and their outlines merge. Cross behind or further forward (`depth`)?
   - At rise stage 3 his hands run off the screen edges. Keep or fit?
   - 120 bpm × 38 beats = 19 s. Right length?
   - Should the "BUTTAMAN!" caption always show?
9. **Butterman animation source:** the procedural beat-grid figure is built. Aaron's Mixamo picks ("Strut Walking", "Stable Sword Outward Slash", "Victory") slot in as the fallback; Aaron downloads them. The README says where they plug in.
10. **Footer:** which social accounts? Also, which friends' sites go in the 1999 web ring?
11. **Sounds to record:** about 14 short clips for the shortlist eggs, plus Butterman's clips (`nostalgia-shortlist.md`, "Needs from Aaron" lines).
12. **`@claude` in issue comments** for the brother: worth the API spend?
13. **Draft skills:** approve, edit or drop `add-cat-animation`, `add-easter-egg` and `tune-butterman` (`.claude/skills/`). Round 2 flagged what changed at the top of two of them; `tune-butterman` needs a rewrite from the prototype.
14. **three.js pin:** stay on 0.186.1, or move to 0.187.0 once it's two weeks old (after 2026-11-13)?
15. **Sleeping cat:** should a long drag wake him? (A tap already does: `emote_wake`.)

## Closed in round 2

| Was | Now | Where |
|---|---|---|
| How to get the real cat model | Claude-scripted Blender recommended, paid pack runner-up; prices, licenses, hours, evidence | `cat-model.md`, `blender-trial/` |
| iPhone silent switch | Taps respect it (`ambient`); Butterman forces `playback` for the gag (decision e1107-37) | cat-viewer, butterman |
| Butterman beat order | Three scenes on one BPM grid (e1107-35, e1107-39); cameos (e1107-40) | `prototypes/butterman/` |
| Rotation | Turntable, left-right only (e1107-36) | cat-viewer, cat-glb |
| PR previews | No PRs: the brother pushes straight to `main` (e1107-38) | `workflow.md` |
| Which phone | iPhone (e1107-38): no USB DevTools from Windows, so `?perf=1` is the tool | `workflow.md` |
| Can Butterman cut into a pose transition? | No: full emotes queue behind a transition and play when it lands (queue of 2, newest wins the last slot) | cat-viewer `CONFIG.cycle.queueMax` |
| Tap on empty space | Proposed as Pointer Cat in the shortlist; still Aaron's yes (item 5) | `nostalgia-shortlist.md` |

## Gaps closed in round 2

- **Butterman prototyped:** `prototypes/butterman/`. Three scenes, one config, whole-beat actions, placeholder WAVs loaded by path, and an `Object3D.attach` handoff. The two-tempo check passes.
- **GLB loaded:** `prototypes/cat-glb/` loads the CC0 Quaternius cat and the Blender cat via GLTFLoader + meshopt. The check proves two clips weighted mid-crossfade and butter drift 0.00000 in the head frame.
- **Full emotes:** `emote_*` interrupts that end on a named `returnTo` pose, a queue for emotes that arrive mid-transition, per-pose action maps and cooldowns. `checks/emotes.js` passes all 9.
- **`?perf=1` built:** fps, frame time, draw calls, triangles, pixel ratio, GPU and device on screen. An adaptive pixel ratio steps from 2 down to 1 under load (shown with `&burn=30&fakedpr=3`). It ignores the steady 30 fps cap of iPhone Low Power Mode.
- **Nostalgia sites retried:**
  - Exa got past YTMND's bot check.
  - Zombo's Wayback copy is Josh Levine's own HTML5 port.
  - Paper Toilet is HTML5 now and does refill: double-click an empty roll.
  - neal.fun, Badger and Orisinal were covered through creator interviews and their own sites.
- **Round-1 compress command fixed:** it deleted `butter_socket`. `--prune false` is now in `render-stack.md` and `workflow.md`.

## Gaps (still not done or not verified)

- **Nothing has run on a real phone or been heard.** Every check is headless (CPU WebGL). Next: open the three prototypes on the iPhone with `?perf=1` and listen, with the silent switch both ways.
- **The Blender cat hasn't been watched in motion** at full speed. Stills and checks only.
- **Paid packs' contents unverified.** Nothing was bought; clip lists are seller claims.
- **Local GPU image-to-3D not run** (item 2).
- **Sources still thin:**
  - The Fab EULA was quoted from Epic's forum paste, not the live text.
  - Adobe hasn't said how Mixamo applies to a public-repo GLB.
  - Hours for AI-mesh, paid-pack and clay-scan routes are estimates, not timings.
  - The Williams walk handout couldn't be OCR'd, so its tips came second-hand.
- **README still says "open index.html in a browser".** That breaks once the site loads modules, audio or a GLB; the fix is `python3 -m http.server`. It's left for the one-page restructure (`workflow.md`, Phase 0).
- **Headless console noise to ignore:** "GPU stall due to ReadPixels" (the screenshot reading pixels) and "KHR_parallel_shader_compile not supported" (SwiftShader).
