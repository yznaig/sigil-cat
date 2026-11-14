# Research sources
Ranked sources behind the floating-cat build: each with a link, why it's credible, and what to take from it.
Research round 1, 2026-11-07 (nine research agents; every claim checked at the source). Classic meme-site sources live in `nostalgia-ideas.md`.

**How it's ranked.** Within each topic, sources go from most to least authoritative:
1. the code or spec itself, and official docs
2. maintainers and named practitioners who show their work
3. useful but weaker sources (vendor blogs, young repos, aggregators), marked as such.

Star counts and dates were read from GitHub on 2026-11-07. Video briefs with timestamps are in `videos/`.

## 1. Render stack, lighting, performance

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | [three.js manual, Installation](https://threejs.org/manual/#en/installation) | Official docs | The importmap + CDN pattern, `three/addons/` mapping, and that you need a local server, not `file://`. |
| 2 | [three.js source and examples (mrdoob/three.js)](https://github.com/mrdoob/three.js) | The library itself; about 118k stars, pushed daily | `AnimationAction` (crossFade, clamp, `finished`/`loop` events), `Timer` (Page Visibility), `MeshPhysicalMaterial` sheen, controls source. |
| 3 | [Official examples: skinning blending](https://threejs.org/examples/#webgl_animation_skinning_blending), [additive blending](https://threejs.org/examples/#webgl_animation_skinning_additive_blending), [contact shadow](https://threejs.org/examples/#webgl_shadow_contact), [tone mapping](https://threejs.org/examples/#webgl_tonemapping), [sheen](https://threejs.org/examples/#webgl_loader_gltf_sheen) | Written and maintained by the core team | Crossfade helpers, `synchronizeCrossFade` on the loop event, additive layering, the contact-shadow technique, Neutral vs AgX side by side. |
| 4 | three.js manual: [Responsive](https://threejs.org/manual/#en/responsive), [Shadows](https://threejs.org/manual/#en/shadows), [WebGPURenderer](https://threejs.org/manual/#en/webgpurenderer) | Official docs | A 3× phone does 9× the pixel work, so cap DPR; fake blob shadows; WebGPURenderer is still experimental, so stay on WebGL. |
| 5 | [Don McCurdy, "Which R3F versions work without Node.js?"](https://discourse.threejs.org/t/which-r3f-versions-work-without-node-js/72876) | three.js maintainer, author of glTF-Transform | drei's 60+ dependencies make no-build fragile; three.js keeps the importmap path working on purpose. |
| 6 | [Don McCurdy on draw-call budgets](https://discourse.threejs.org/t/63960) | Maintainer | "< 100 draw calls and < 100,000 vertices" as a general budget; we aim far lower. |
| 7 | [Khronos PBR Neutral spec](https://github.com/KhronosGroup/ToneMapping/blob/main/PBR_Neutral/README.md) + [three.js PR #27668](https://github.com/mrdoob/three.js/pull/27668) | Written by the tone mapper's designer (Emmett Lalish, Khronos) | Neutral's toe crushes near-black to black, which is why AgX is the A/B option for a black cat. |
| 8 | [Adobe/Allegorithmic, The PBR Guide part 2](https://www.adobe.com/learn/substance-3d-designer/web/the-pbr-guide-part-2) | Industry-standard PBR reference (Wes McDermott) | Dark albedo floor around sRGB 30–50: never pure black. |
| 9 | [Racoon Artworks, PBR from rules to measurements](https://racoon-artworks.de/blog_PBRfromrulestomeasurements.php) | Practitioner with measured data | Counterpoint to #8: about sRGB 25 is defensible for a stylized black. |
| 10 | [model-viewer docs](https://modelviewer.dev/examples/lightingandenv/) + npm `@google/model-viewer` 4.4.0 | Official Google project | The runner-up: can crossfade and append animations, but has no API to attach meshes or add a second figure. |
| 11 | [R3F install without build tools](https://r3f.docs.pmnd.rs/getting-started/installation) | Official pmndrs docs | The esm.sh + htm path exists, but per #5 it's fragile. |
| 12 | [drei PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor) | Official pmndrs docs | The adaptive pixel-ratio algorithm and defaults, to port to plain three.js. |
| 13 | [Babylon.js advanced animation](https://doc.babylonjs.com/features/featuresDeepDive/animation/advanced_animations), [CDN page](https://doc.babylonjs.com/setup/frameworkPackages/CDN) | Official docs | Blending exists, but its own CDN page says "not for production". |
| 14 | [N8AO README](https://github.com/N8python/n8ao) | By the author; 504 stars | Why to skip screen-space AO here: it needs the `postprocessing` package, and there's nothing for it to darken on a black surface. |
| 15 | [Bruno Simon, Performance (Portfolio Devlog 13)](https://www.youtube.com/watch?v=EhZwt9P4GP4), brief in `videos/` | Author of Three.js Journey; shows the measurements | Cut draw calls (375 → 222), a low-quality preset for phones, a DPR cap of 2; device scoring was "not accurate". |
| 16 | [Discover three.js, Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) | Lewy Blue, author of the Discover three.js book | Still valid: cap DPR, few direct lights, toggle lights rather than add or remove them. **Partly stale (2018):** some APIs it names are gone. |
| 17 | [Utsubo, 100 three.js performance tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) | Studio blog by its CEO, Jocelyn Lecamus; cites the maintainers correctly. Lower rank: a studio's marketing blog. | Mobile shadow-map sizes, DPR cap. (This list is Utsubo's, not Lewy Blue's.) |

## 2. Free rotation, touch, tap sounds

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | three.js [`ArcballControls.js` / `TrackballControls.js`](https://github.com/mrdoob/three.js/tree/dev/examples/jsm/controls) | Official add-on source | Both move the **camera**, so the lights would swing round; Arcball's no-fling-after-120 ms rule is worth copying. |
| 2 | three.js [`Raycaster.js`, `Mesh.js`, `SkinnedMesh.js`](https://github.com/mrdoob/three.js/tree/dev/src/objects) | The engine source | Raycasting ignores `.visible` (a hidden collider still hits); skinned raycasts cache the first pose's bounding sphere. |
| 3 | [WHATWG HTML, activation-triggering input events](https://html.spec.whatwg.org/multipage/interaction.html#activation-triggering-input-event) | The normative spec | Touch `pointerup` counts as a user gesture, touch `pointerdown` doesn't, so handle taps on `pointerup`. |
| 4 | [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay) | The browser vendor's own policy | An `AudioContext` starts suspended; `resume()` after a gesture. |
| 5 | MDN: [AudioBufferSourceNode](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode), [touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action), [setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture), [AudioSession](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession) | The standard web reference | One-shot buffer sources; `touch-action: none` stops `pointercancel`; capture keeps drags alive; `audioSession` is Safari-only. |
| 6 | [WebKit bug 237322](https://bugs.webkit.org/show_bug.cgi?id=237322) | WebKit's tracker; comment by WebKit media engineer Jean-Yves Avenard | iOS mutes Web Audio on the silent switch; `navigator.audioSession.type = 'playback'` overrides it since iOS 17. |
| 7 | [caniuse data](https://github.com/Fyrd/caniuse) and MDN browser-compat-data | The standard compatibility datasets | Opus is only safe in Safari from iOS 18.4; `touch-action` is fully supported; `overscroll-behavior` is partial in Safari. |
| 8 | [howler.js repo](https://github.com/goldfire/howler.js) | First-party repo metadata | Last release 2023, so skip it; 25 lines of Web Audio cover this page. |
| 9 | [three.js forum, rotating an object by mouse drag (t/58468)](https://discourse.threejs.org/t/rotatable-object-with-right-click-drag/58468) | Working code from agargaro, author of three.ez | Euler deltas flip past 180°; rotate about camera axes with quaternions instead. Supporting evidence, not the authority. |

## 3. Pose cycle and animation state

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | three.js r186 [`src/animation/`](https://github.com/mrdoob/three.js/tree/r186/src/animation) (`AnimationAction`, `AnimationUtils`, `PropertyMixer`, `PropertyBinding`) | The code that runs | `warp` time-scales clips (don't use it on transitions); weights average per bone, so no masks; `makeClipAdditive` mutates the clip; dots are stripped from node names. |
| 2 | [Unity Manual, Animation Transitions](https://docs.unity3d.com/Manual/class-Transition.html) | The vendor docs for the most-used animation state machine | Exit Time (leave a looping state at a point in its loop) and Transition Offset, the ideas worth copying. |
| 3 | [Robert Nystrom, Game Programming Patterns: State](https://gameprogrammingpatterns.com/state.html) | A widely used book by a game-industry engineer, free online | When a small FSM is enough; a pushdown automaton for interrupts that return (our `returnTo`). |
| 4 | [David Rosen, Animation Bootcamp: An Indie Approach to Procedural Animation, GDC 2014](https://www.youtube.com/watch?v=LNidsMesxSE) ([GDC Vault](https://gdcvault.com/play/1020049)) | GDC talk by the author of Overgrowth; transcript checked | Procedural blends between poses give easing for free (≈7:55) but "you lose intentional in-betweens" (≈23:30), so author the transitions. |
| 5 | [three.js forum: root motion (t/5116)](https://discourse.threejs.org/t/5116) | Answers from maintainers Mugen87 and donmccurdy | No built-in root motion; keep clips in place and move the object in code. |
| 6 | [three.js forum: splitting clips by bone (t/62983)](https://discourse.threejs.org/t/62983) | Working code from long-time contributor trusktr | The `tracks.filter` masking recipe and its overlap caveat, the reason partial-body emotes go additive. |
| 7 | [adryd325/oneko.js](https://github.com/adryd325/oneko.js) | A widely embedded web cat pet (about 1.3k stars), readable source | A minimum idle time, then a random chance per tick to nap; a "tired" pose before sleep. |
| 8 | [Shimeji-Desktop behaviors.xml](https://github.com/DalekCraft2/Shimeji-Desktop) | Maintained fork of the desktop-pet lineage | The weighted `Frequency` + `NextBehaviorList` config shape; SitDown → LieDown is our graph. |
| 9 | [Edge/GamesRadar, "The deceptively complex art of just standing around"](https://gamesradar.com/deceptively-complex-art-doing-nothing-standing-around) (2015) | Named quotes from Jon Maine, animation director at Avalanche Studios | Keep distinctive moves out of core idles; use additive layers for variety. |
| 10 | [XState v5 delayed transitions](https://stately.ai/docs/delayed-transitions) | Official docs; bundle size measured from jsDelivr | It works with no build (about 15 KB gzipped), but four poses don't need it. |

## 4. Cat model, rig, clips, export

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | [Blender manual, glTF 2.0 exporter](https://docs.blender.org/manual/en/4.1/addons/import_export/scene_gltf2.html) (the 4.1 page; the current text, with 4.4+ option names, is in the [blender-manual source](https://projects.blender.org/blender/blender-manual), `manual/addons/scene_gltf2.rst`) and [KhronosGroup/glTF-Blender-IO docs](https://github.com/KhronosGroup/glTF-Blender-IO) | Official, current | The exact export settings. "Group by NLA Track" no longer exists. *Force keeping channel* stops still holds from being stripped. |
| 2 | [Blender manual, Rigify](https://docs.blender.org/manual/en/4.1/addons/rigging/rigify/basics.html) (4.1 page; Rigify is an extension in newer Blender) and [Pose Library](https://docs.blender.org/manual/en/latest/animation/armatures/posing/editing/pose_library.html) | Official | Built-in Basic Quadruped and Cat metarigs; pose assets for matching transition endpoints. |
| 3 | [glTF-Transform CLI](https://gltf-transform.dev/cli) ([repo](https://github.com/donmccurdy/glTF-Transform)) | By Don McCurdy (three.js glTF maintainer); 2.1k stars | Meshopt compresses animation, Draco doesn't; `optimize` defaults simplify, flatten and join, so turn them off for a rig. |
| 4 | three.js [`Skeleton.js`](https://github.com/mrdoob/three.js/blob/dev/src/objects/Skeleton.js) | Primary code | Bone matrices live in a float texture, so there's no practical bone cap. |
| 5 | [Don McCurdy: multiple animations from Blender (t/25900)](https://discourse.threejs.org/t/25900), [(t/26431)](https://discourse.threejs.org/t/26431) | Maintainer answers | Stash or push down each action; test in gltf-viewer. |
| 6 | [CGDive, Rigify Dog/Quadruped Rig](https://www.youtube.com/watch?v=bH0xkGflJ0k), brief in `videos/` | Long-running Blender rigging educator who shows every step and error | Fit the metarig, generate, bind; the bone-heat error fix; weight cleanup. |
| 7 | [Nik Bear Brown, Claude mascot via Blender MCP](https://www.youtube.com/watch?v=t9N0a1Uz1Tk), brief in `videos/` | A recorded run with independent read-back checks, failures shown | Claude is good at numeric setup and naming, weak at rigging: 23 minutes and 8 turns, ending in parenting, not skinning. |
| 8 | [MCP for Blender (ahujasid)](https://github.com/ahujasid/blender-mcp) and [Blender Lab MCP](https://projects.blender.org/lab/blender_mcp) | Primary repos (33.6k stars; the official Blender lab) | What they can do. Cautions: arbitrary Python execution, a curl-pipe-sh installer, telemetry. Use the manual `uvx` install. |
| 9 | [funwithtriangles/blender-to-threejs-export-guide](https://github.com/funwithtriangles/blender-to-threejs-export-guide) | Living community guide | Bone-parented meshes work; shape keys block "Apply Modifiers". |
| 10 | [Tripo rigging docs](https://developers.tripo3d.com/en/models/rig), [Meshy rigging](https://docs.meshy.ai/en/webapp/guides/3d-model/rigging) | Official vendor docs | Tripo auto-rigs quadrupeds; Meshy's four-legged rig ships a walk only; Meshy free = CC BY 4.0. |
| 11 | [Reallusion forum staff reply](https://forum.reallusion.com/523069) | Vendor staff | AccuRIG is biped-only. (Mixamo is humanoid-only per Adobe's FAQ, read via secondary guides because helpx refused the fetch.) |
| 12 | [Creative Bloq, model a cute cat in Blender](https://www.creativebloq.com/3d/heres-how-to-model-a-cute-cat-or-anything-else-in-blender-in-just-a-few-easy-steps) (Maciek Lazowski) | Trade publication walkthrough | A cube + subdivision + extruded legs and ears + a bezier tail is enough for a blockout. |

## 5. Free cat models (checked by parsing the files)

| # | Model | License (checked on the page) | Verdict |
|---|---|---|---|
| 1 | [Quaternius "Cat", poly.pizza](https://poly.pizza/m/qKICY6xla2) | CC0 | Day-1 pipeline test: 2,448 tris, 16 joints, idle, walk, run and jump clips, 239 KB. Blocky, with no sit clip. |
| 2 | [Quaternius Animal Pack Vol.2, OpenGameArt](https://opengameart.org/content/animated-animales-low-poly) | CC0 | Best low-poly cat silhouette, but FBX only, with idle and walk only. Needs conversion. |
| 3 | [J-Toastie "Cat", poly.pizza](https://poly.pizza/m/DJ9rpAhrh3) | CC-BY 3.0 (credit J-Toastie) | Slimmest cat shape, 22 joints, but an idle clip only. |
| 4 | [Khronos Fox](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox) | CC0 model, CC-BY 4.0 rig | Not a cat; a clean quadruped for testing crossfades. |
| — | [Kenney Cube Pets](https://kenney.nl/assets/cube-pets), [Sketchfab animated cats](https://sketchfab.com/search?q=cat&type=models&downloadable=true&animated=true), [Quaternius Ultimate Animal Pack](https://quaternius.com/packs/ultimateanimatedanimals.html) | CC0 / CC-BY / CC0 | Rejected: wrong look, login-gated, or no cat. |

**No free model is ship-ready.** None has a sit clip, and none has the smooth featureless look.

## 6. Butterman: figure, timeline, audio sync

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | [MDN AudioBufferSourceNode.start()](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start) | Mozilla's reference, tracks the spec | `start(when, offset, duration)`: sample-accurate scheduling with trims, so the files are never edited. |
| 2 | [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices) | Official guide | Resume inside the gesture; buffers give "more precision" for short clips. |
| 3 | [MDN AudioContext.outputLatency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency) | Official reference | Subtract it to stay in sync on Bluetooth headphones (Baseline 2025). |
| 4 | [GSAP licensing](https://gsap.com/licensing/) | The vendor's own license page | Free for commercial use with all plugins, GSDevTools included. |
| 5 | GSAP docs: [ticker](https://gsap.com/docs/v3/GSAP/gsap.ticker/), [timeline.time()](https://gsap.com/docs/v3/GSAP/Timeline/time()), [GSDevTools](https://gsap.com/docs/v3/Plugins/GSDevTools/) | Official | Lag smoothing (500 ms → 33 ms) is why the audio clock must drive the timeline; `time()` seeks. |
| 6 | Richard Williams, *The Animator's Survival Kit*, Walks ([CMU course handout](https://www.cs.cmu.edu/~15464-s13/handouts/Animators_Survival_Kit_walks.pdf)) | The standard animation text, by the animation director of *Roger Rabbit* | Walks "on twelves" (2 steps a second); the double-bounce strut for optimism. |
| 7 | [Alan Becker, Animating Walk Cycles](https://www.youtube.com/watch?v=2y6aVz0Acx0), brief in `videos/` | Creator of *Animator vs. Animation*, the best-known stick-figure animator | The proud walk: lean back, hold the contact pose, arms high and leading. |
| 8 | [lil-gui](https://github.com/georgealways/lil-gui) | The dat.gui successor that three.js ships | The `?tune` panel, bound straight to the config object. |
| 9 | [Theatre.js repo](https://github.com/theatre-js/theatre) | 12.9k stars, but frozen since 2024-04 | Best prior art for a visual timeline editor; don't depend on it. |
| 10 | [Tweakpane](https://github.com/cocopon/tweakpane) | 4.7k stars, active | The alternative panel: nicer-looking, heavier. |
| 11 | [Rive pricing](https://rive.app/pricing) | The vendor's page | Free exports play a Rive splash screen, one reason to skip it. |
| 12 | [anime.js engine.update()](https://animejs.com/documentation/engine/engine-methods/update) | Official | A manual tick is possible, so it would also work; GSAP was chosen for its named eases. |
| 13 | [t3ssel8r, Giving Personality to Procedural Animations using Math](https://www.youtube.com/watch?v=KPoeNZZ6H4s) | 3.1M views, works the maths on screen | Second-order spring dynamics, only if the figure ever reacts live. Optional. |

## 7. Building with Claude Code

| # | Source | Why credible | Take |
|---|---|---|---|
| 1 | [Claude Code best practices](https://code.claude.com/docs/en/best-practices) | Official Anthropic docs (the old engineering post redirects here) | Give Claude a check and ask for evidence; keep CLAUDE.md short; "interview me → SPEC.md", then a fresh session; `claude -w` worktrees. |
| 2 | [anthropics/skills: frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) (updated 2026-09-03) | Official Anthropic skill; repo has 188k stars | Write a design plan first; "spend your boldness in one place"; its list of generic tells (tracked all-caps labels, "A · B" strings, near-black standing in for black). |
| 3 | [Anthropic, Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) (2025-11-12) | Anthropic | Why AI sites converge on one safe look ("distributional convergence"), and how specific direction fixes it. |
| 4 | [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) | Official Anthropic docs | Description = what + when, in the user's words; body under 500 lines; validator loops; write evals first. |
| 5 | [anthropics/skills: webapp-testing](https://github.com/anthropics/skills) | Official Anthropic skill | A decision tree for testing; run helper scripts with `--help` and leave their source unread. |
| 6 | [anthropics/claude-plugins-official: playground](https://github.com/anthropics/claude-plugins-official) | Official marketplace (46k stars) | A sliders-plus-"copy config" tuning page, the model for Butterman's `?tune` panel. |
| 7 | [Claude Code with Chrome](https://code.claude.com/docs/en/chrome) | Official docs | Not supported in WSL, so `shot` stays the tool for looking at pages. |
| 8 | [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) | 4.1k stars, pushed 2026-10-19, targets r186 | The "Common Mistakes" format (wrong code → right code: why), copied into `add-cat-animation`. |
| 9 | [OneRedOak/claude-code-workflows: design-review](https://github.com/OneRedOak/claude-code-workflows) | 3.9k stars, pushed 2026-10; the repo behind the Ellis video | The "quick visual check" CLAUDE.md snippet and a design-review subagent. |
| 10 | [Patrick Ellis, Turn Claude Code into Your Own UI Designer](https://www.youtube.com/watch?v=xOO8Wt_i72s), brief in `videos/` (7/10) | The original, most-copied "give the agent eyes" loop, with public code | "We need a fixed spec or validator in order to iterate against." |
| 11 | [Meng To / DesignCode, Whole Claude Code workflow for a 3D website](https://www.youtube.com/watch?v=I96tdKCCI3g), brief in `videos/` (8/10) | Practitioner who published every prompt and his judge file; closest match to this project | References first; a fresh-judge scoring loop (4.6 → 8.05, mostly from lighting); adaptive resolution. The brief is built from his article; the transcript was rate-limited. |
| 12 | [achimala/dream-loop](https://github.com/achimala/dream-loop) | 1.8k stars, 2026-09 | Target image + same-camera capture + memoryless judge + stop rule. |
| 13 | [iart-ai/webgl-animation-skills](https://github.com/iart-ai/webgl-animation-skills) | 50 stars, MIT, a concrete runnable script. Weaker: young, one author. | The `?t=N` seek-and-screenshot harness for deterministic frames (our `#t=`). |
| 14 | [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills) | 976 stars, pushed 2026-10-22 | End each visual skill with a required evidence list; never approve from a single frame. |
| 15 | [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | Microsoft; 39k stars | Its README prefers the CLI for coding agents; accessibility snapshots are empty on a canvas. |
| 16 | [ChromeDevTools/chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | Google; 55k stars | Performance traces when a frame-time problem needs profiling. Turn usage statistics off. |
| 17 | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | Vercel Labs; 47k stars | `diff screenshot` for regressions; otherwise its accessibility-tree model is weak for canvas. |
| 18 | [DmitriyGolub/threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp) | 129 stars, MIT, CI | Scene inspection and frame capture with virtual time. Try it only if screenshots stop being enough. |
| 19 | [cth9191/blender-to-web](https://github.com/cth9191/blender-to-web) | 98 stars; sober, specific skill. Weaker: young, no license file. | Verify idle, hover, drag and paused states; say which behavior is in the GLB and which is browser code. |
| 20 | Chromium [SwiftShader doc](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md) + [Chrome blog, Web AI model testing](https://developer.chrome.com/blog/supercharge-web-ai-testing) | Chromium and Chrome teams; also tested locally | Headless WebGL is software rendering, so headless FPS is only a regression signal. |
| 21 | [Chrome DevTools remote debugging](https://developer.chrome.com/docs/devtools/remote-debugging) | Official | Android phone debugging over USB, with port forwarding that sidesteps WSL networking. |
| 22 | GitHub Docs: [publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site), [github.dev](https://docs.github.com/en/codespaces/the-githubdev-web-based-editor) | Official | Branch deploy vs Actions; a 404 page; github.dev has no terminal. |
| 23 | [rossjrw/pr-preview-action](https://github.com/rossjrw/pr-preview-action) | About 450 stars, v1 | PR previews need a branch deploy (`gh-pages`) and don't support fork PRs. |
| 24 | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | Official; 9.8k stars | `@claude` in PR comments for the brother. It bills API tokens. |
| 25 | [Nate Herk, Building Beautiful Websites with Claude Code](https://www.youtube.com/watch?v=86HM0RUWhCk), brief in `videos/` (5/10) | The creator Aaron asked about. Weaker: a beginner walkthrough. | One useful warning: screenshots of animated content send Claude into an over-fixing loop, so shoot frozen moments. |

**Considered and skipped:**
- Riley Brown's website videos: beginner product tours.
- Hype-titled "insane three.js with Opus" one-shots.
- Matt Pocock: no front-end video found, though his grill → spec → TDD skills match workflow steps 14–15.
- Bulk skill registries and one-star three.js skill clones.
- Three AI-3D-tool reviews the model research leaned on (a dev.to Meshy-vs-Tripo build log, a 5-tool test blog, a 13-task Claude-in-Blender review) are left out: their links couldn't be re-confirmed. Their conclusions (Tripo keeps detail better; auto-rigs still need hand fixes; Claude's topology and weights aren't production-ready) match the primary sources in section 4.
