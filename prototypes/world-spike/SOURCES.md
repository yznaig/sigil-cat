# World spike sources and reproduction

No model generation was run. No third-party art or sound was copied from prior-art sites.

- **Physics:** cannon-es **0.20.0**, MIT, imported from `https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js`. [License](https://github.com/pmndrs/cannon-es/blob/v0.20.0/LICENSE). The original implementation here follows the approach in the [MIT mousepick example](https://github.com/pmndrs/cannon-es/blob/master/examples/threejs_mousepick.html): body-local grab point, point constraint, collisionless pointer anchor, camera-facing drag plane. No example artwork copied.
- **Rendering:** three **0.186.1**, MIT, jsDelivr `build/three.module.js` and `examples/jsm/` via importmap. [License](https://github.com/mrdoob/three.js/blob/dev/LICENSE). GLTFLoader, ConvexGeometry and RoomEnvironment are three addons. No library is vendored or installed in this repo.
- **Rifle:** existing `assets/models/awp.glb`, Quaternius, CC0; [full provenance](../../assets/models/SOURCES.md). Same file, no edits. Six convex slices are derived at load time. This is an AWP-like rifle, not Valve's model.
- **Top:** original procedural geometry based on this site's lathe profile, simplified here for the physics experiment. No external texture. Room lighting is three's procedural RoomEnvironment, not a downloaded HDR image.
- **Comparison only:** `@dimforge/rapier3d-compat` **0.19.3**, Apache-2.0 ([license](https://github.com/dimforge/rapier.js/blob/master/LICENSE)), pinned `https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/rapier.mjs`; `jolt-physics` **0.30.0**, MIT ([license](https://github.com/jrouwe/JoltPhysics.js/blob/main/LICENSE)), pinned `https://cdn.jsdelivr.net/npm/jolt-physics@0.30.0/dist/jolt-physics.wasm-compat.js`. Loaded by the comparison tools (engines.html and research.mjs), never by the interactive spike on its own or the live page. The plan recommends Rapier for production based on the matched 20-prop benchmark; the interactive cannon spike remains the measured interaction study.

From repository root:

```
python3 tools/serve.py . 8743
PW_FROM=~/command-hq/scripts/shot node prototypes/world-spike/measure.mjs
PW_FROM=~/command-hq/scripts/shot node prototypes/world-spike/research.mjs
```

Stop the server after use. Both runners are headless, use the same NVIDIA/ANGLE environment as checks/run.mjs, and require the pre-existing external Playwright installation. No package.json or node_modules is required here. Inspect the reported renderer: phone size is not phone hardware or Safari. Run the two scripts sequentially for performance work.

`results.json` contains spike timing, idle counters, grab checks and response-body byte counts. `research-results.json` contains microbench timings and live prior-art network requests. CDN response-body bytes include transfer compression when provided; they exclude response headers. The plan separately records uncompressed bytes and reproducible gzip estimates. GPU submission timing is not GPU completion timing. rAF gaps include presentation/driver scheduling. Physics cost uses 240 fixed steps independently of rendering, so slow software rendering cannot omit the contact-heavy portion of the drop. Frame CPU and rAF timings come from a separate 2.5-second running-loop window. Grip/settling assertions and screenshots advance deterministic simulation time while preserving real browser pointer/touch input; they never force a body to sleep. The final scheduler check resumes the normal loop and observes zero work for 1.1 seconds. These checks establish physics/lifecycle correctness, not real-time smoothness on software.

`world-spike-drop-0..5-{desktop,phone}.jpg` are an ordered sequence at simulation times 0, .250, .458, .625, 1.000 and 4.000 seconds, produced with the fixed-step capture API. These are not a claim about wall-clock frame rate. Other screenshots use the running loop and real routed input.
