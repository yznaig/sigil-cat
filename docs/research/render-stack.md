# Render stack
Which 3D stack runs the floating cat, and the recipe for making a matte-black cat look good, move well and stay fast on phones.
Research round 1, 2026-11-07. Every claim is backed in `sources.md`; the working proof is `prototypes/cat-viewer/index.html`.

## Recommendation

**Vanilla three.js, loaded with an importmap from jsDelivr, with no build step.** Use `WebGLRenderer`, a rigged GLB model, and the built-in `AnimationMixer`.

**Runner-up: Google `<model-viewer>`**, but only if the site ever shrinks to "show a cat, play a clip, spin it". It can crossfade clips, but it can't attach a butter mesh to the head, add a stick figure to the scene, or rotate the model (rather than the camera) freely. So it can't do this site as specced.

Why three.js wins here:

| Reason | Detail |
|---|---|
| No build is an official, maintained path | The three.js manual's "Import from a CDN" is exactly an importmap. A maintainer (Don McCurdy) says the project deliberately keeps that path working. The repo stays plain files the brother can edit in github.dev. |
| Everything we need is in the core | Crossfades, one-shot clips, `finished` and `loop` events, additive clips for emotes, raycasting, `Object3D.attach` for handing the butter from the stick figure's hand to the cat's head. |
| react-three-fiber fails the no-build test | It needs drei's 60+ dependencies, which McCurdy calls fragile without a bundler. A bundler would break the brother's web-editor workflow. drei's handy helpers are about 30 lines each in plain three.js. |
| Babylon.js is heavy for this | Its own docs say the CDN build is not for production. |
| Spline, PlayCanvas and Needle are editor-centric | The scene would live in a tool both brothers have to share, not in the repo. |
| Size is fine | About 420 KB gzipped as the manual loads it, about 196 KB with the minified-core remap below. GLTFLoader adds about 26 KB. |
| Longevity | About 118k stars, roughly monthly releases, and most practitioner knowledge is three.js-shaped. |

Stay on `WebGLRenderer`. The r187 manual still calls `WebGPURenderer` experimental and recommends WebGL for WebGL 2 apps.

### Pinning

The prototype pins **0.186.1** (released 2026-09-24). 0.187.0 came out on 2026-10-30, and the house rule is to pin a version at least two weeks old. Upgrade by find-and-replace of the version in one place.

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
```

Optional size cut, tested in Chromium only (not in Safari): point `three` at `three.module.min.js`, then add a third entry that remaps `.../build/three.core.js` to `.../build/three.core.min.js`. That saves about 225 KB gzipped. Don't add SRI hashes to jsDelivr's minified files, because jsDelivr generates them on the fly.

**Preview over HTTP, not `file://`.** Module imports, `fetch` of audio and GLB files all fail from a file URL. Use `python3 -m http.server` in the repo root. The README's "open index.html in a browser" step needs updating once the cat lands. (The prototype happens to load from `file://` because it has no local imports or assets; the real site will.)

## Page shape (from the brother's brief)

- **One page, and the cat is the page.** A full-window canvas with the cat floating in the middle. A soft blob shadow below him sells "floating". A footer of social links sits on top of the canvas (`position: fixed`, later in the DOM, so taps reach the links).
- Extra gags are Easter eggs on this page, not separate pages. The old trinket shelf goes away. Easter eggs can still live one-per-file (`eggs/butterman.js`), so two people can build without collisions.

## Matte black that still reads

A near-black object has almost no diffuse light. Its shape shows through **reflections, the bright edge at grazing angles, and a rim light**. The recipe the prototype uses:

- **Material:** `MeshPhysicalMaterial`, roughness about 0.6 to 0.8, metalness 0, plus **sheen** (a velvet edge glow at grazing angles, which reads as soft fur). One shared material: the stick figure reuses it so they look like the same stuff.
- **Color:** never pure `#000`. The prototype uses `#0d0d0f`. The render research suggests `#1c1c1e` (PBR guides floor dark albedo around sRGB 25 to 50). Check both on a phone.
- **Environment:** the built-in `RoomEnvironment` through `PMREMGenerator`, `scene.environmentIntensity` about 0.4 to 0.8. Without an environment map, black reads as a hole.
- **Lights:** a warm key light, **two strong back/rim lights** (one cool), and a weak hemisphere light. The rim lights do most of the work.
- **Tone mapping: Neutral, with AgX as the A/B option.** Checked by eye in the prototype (`#tone=agx`): Neutral keeps him black with crisp rims, while AgX lifts him to charcoal gray and shows more body form. Neutral is the default because the spec says matte black. The brothers should look at both on a real screen.
- **Shadows:** no shadow maps and no screen-space AO. AO only darkens indirect light, and there is almost none on a black surface. Ground him with a fake blob shadow (a plane with a radial-gradient texture) that shrinks and fades as he rises. Upgrade to the official contact-shadow technique only if a pose looks ungrounded.
- **Background:** light and warm (the prototype uses a cream radial gradient) so the black silhouette pops. A dark background would need a much stronger rim.

## Free rotation (any axis, mouse and touch)

> **Superseded 2026-11-07:** Aaron chose left-right only (decision e1107-36). The cat-viewer now spins around the vertical axis with `touch-action: pan-y`, flick inertia and an optional drift back to face front (`CONFIG.rotate.returnHome`). The touch and tap notes below still apply.

**Rotate the model, not the camera.** Put the cat inside a wrapper group and turn that group by quaternion from the drag. A horizontal drag turns him about the camera's up axis, and a vertical drag about the camera's right axis, both applied with `premultiply`.

- **Why not the stock controls:** TrackballControls and ArcballControls both move the camera (checked in the three.js source). The lights would then swing round with the view, and the rim light that makes a black cat readable would end up in front of him. OrbitControls is a turntable, not a tumble.
- **No gimbal lock.** Quaternions never flip. Adding to Euler `rotation.x/y` misbehaves once he's past upside-down.
- **The idle clips keep playing.** The mixer drives parts inside the model and never touches the wrapper group.
- **Flick inertia:** keep a smoothed angular velocity during the drag. After release, keep rotating and decay it with `exp(-damping * dt)` so it's frame-rate independent. If the pointer was held still for about 100 ms before release, don't fling.
- **Optional settle:** `slerp` back to a home orientation after a few idle seconds. The prototype has it off (`rotate.settle: 0`), because the brother asked for free tumbling. This is a feel question for him.
- **Runner-up:** ArcballControls has the best tumble feel of the stock controls (inertia, no-fling rule), but it moves the camera and brings gizmos, pan and zoom to switch off.

### Touch

- `touch-action: none` on the canvas only, so the browser doesn't steal the drag for scrolling or zooming. The page never scrolls, so nothing is lost.
- **Pointer Events** cover mouse, pen and touch with one code path. `setPointerCapture` keeps a drag alive when the finger slides off.
- Track only the first `pointerId` and ignore pinch.
- `html, body { height: 100%; overflow: hidden; overscroll-behavior: none }`. iOS Safari only partly honors `overscroll-behavior`, so a swipe that starts on the footer may still bounce a little. Harmless.

## Tap for a random sound

- **Tap vs drag:** a press is a tap only if it moves under 8 px **and** lasts under 450 ms. Anything else is a drag.
- **Handle the tap on `pointerup`.** The HTML spec counts `pointerup` as a user gesture for touch, but not touch `pointerdown`. So the very first tap can both unlock audio and play a sound.
- **Web Audio, not `<audio>`.** Decode each clip once into an `AudioBuffer`, then create a fresh `AudioBufferSourceNode` per play. It starts with almost no delay, overlapping taps are fine, and `playbackRate` gives a ±8% pitch wobble for variety. An `<audio>` element can't overlap itself and keeps pitch when sped up.
- **Shuffle bag:** play every sound once in random order before repeating, and never the same one twice in a row.
- **Formats:** MP3, mono, short (about 10 to 20 KB per second-long clip). Trim the start tightly. Opus only became safe in Safari from iOS 18.4.
- **Skip Howler.js.** Its last release was 2023 and the 25 lines of Web Audio above cover this page.
- **iPhone silent switch:** by default iOS mutes Web Audio when the ringer switch is on silent. `navigator.audioSession.type = 'playback'` overrides that (Safari-only). The research is split: the tap sounds are polite to leave muted, but Butterman's audio is the joke. Question for the brothers.
- **Hit-testing:** raycast an **invisible ellipsoid** riding on the body, not the detailed meshes. The raycaster ignores `.visible`, so a hidden mesh still gets hit. It's cheap, forgiving (a tap between the ears counts), and correct in any pose. three.js does raycast a skinned mesh's animated pose, but it caches the bounding sphere from the first pose and does the skinning maths on the CPU per tap.
- **Reaction:** a damped squash on a group above the mixer root (procedural, never fights the clips), plus an additive emote clip (see Emotes).

## Pose cycle (sit, lie, sleep, stretch)

Spec: `docs/ideas/cat-poses.md`. The prototype implements a small version of all of it.

- **A small hand-written state machine over mixer actions**, about 120 lines in the prototype. Phases: `hold` (a looping pose), `moving` (a transition clip), `oneshot` (stretch). Desktop pets use the same shape: Shimeji's weighted next-behavior lists and oneko.js's random nap timer.
  - **XState** would work without a build (about 15 KB gzipped), but four poses and six edges don't need statecharts. Revisit only if moods or nested behaviors appear.
  - **The config is one object:** each pose's hold range and next-pose weights, the list of transition clips, fade times and emote names. The prototype's `CONFIG.cycle` is the shape to keep.
- **Authored transition clips** for each pair in the spec (`sit_to_lie`, `lie_to_sleep`, ...), named `from_to_to`. Each transition's first frame equals the "from" hold's first frame, and its last frame equals the "to" hold's first frame. Then only a short blend is needed at each seam: 0.1 to 0.25 s.
  - **Authored clips beat crossfades** whenever the silhouette changes a lot, and on a featureless black cat the silhouette is the whole performance. A plain crossfade between two poses gives easing for free but "you lose intentional in-betweens" (David Rosen, GDC 2014).
  - Plain crossfades are fine for hold variants, emote entries and placeholders.
  - Never pass `warp = true` for a transition. It time-scales the clip, which is meant for syncing walk and run cycles.
- **Auto moves wait for the loop seam.** When a hold's random time runs out, the player waits for the hold clip's mixer `loop` event (the clip is back at frame 0) and then starts the transition. This is Unity's "Exit Time", done the way the official three.js `synchronizeCrossFade` example does it. No pop. A button press cuts in immediately with a slightly longer 0.35 s blend.
- **Routing:** a request with no direct clip (sleep → sit) goes through the graph by breadth-first search (sleep → lie → sit). A pair with no clip at all falls back to a plain crossfade.
- **Stretch is a one-shot that ends seated.** When it finishes, the player is already in the sit pose.
- **Random holds** within ranges plus weighted next-pose choice keep it from feeling looped. More, from game idle-animation practice:
  - Two or three variants per hold (`sit_a`, `sit_b`), all starting and ending on the same pose.
  - ±6% playback-rate jitter each time a hold starts. Never randomize a hold's start time, because frame 0 must meet the transition.
  - Always-on additive layers (breathing, tail sway) with periods that aren't multiples of each other, so the overall motion never repeats.
  - Keep distinctive moves out of the core loop (Jon Maine, Avalanche).
  - Emote cooldowns.
- **Root motion:** none needed. He floats in place, and three.js doesn't extract root motion anyway; maintainers recommend in-place clips with code moving the object. Keep the root bone free of translation keys.
  - The one real issue: lying shifts his mass away from the drag pivot. A per-pose `center` offset that the wrapper eases toward fixes that in code.

### Emotes

Two kinds of emote:
- **Additive overlays (`add_*`)**: a hop, a startle, an ear flick, layered over whatever pose is playing with `AnimationUtils.makeClipAdditive`. No crossfade fights the pose. This is the official `webgl_animation_skinning_additive_blending` pattern. The prototype's tap and butter reactions are this kind.
- **Full interrupts (`emote_*`)**: a big reaction (a wake-up startle, the Butterman reaction) that crossfades in from any pose, plays once, and ends on the first frame of a named `returnTo` pose.
  - Resolve per pose. Tapping him asleep wakes him into `lie`; the prototype does this with `tapWakes`.
  - A full emote that arrives mid-transition waits in a one-slot queue, so a limb is never cut mid-move.

**No per-bone masks.** three.js averages every action on a bone, so a head-only clip at full weight over a full-body pose gives a 50/50 head. Partial-body reactions must be additive.

**Naming for Blender:**
- Clips: `sit`, `lie`, `sleep`, `stretch`, `sit_to_lie`, ..., `add_hop`, `emote_wake`.
- Bones use underscores (`ear_L`). three.js strips dots from node names, so `ear.L` becomes `earL`.
- The player finds clips by name, so a real GLB drops in without code changes.

## Performance budget

| Item | Budget |
|---|---|
| Draw calls | 10 or fewer total (cat 1 to 2, butter 1, shadow 1, stick figure 1 to 2). The primitive placeholder uses 28; a real GLB is 1 to 2. |
| Cat mesh | 8 to 20k triangles, about 30 bones or fewer, 4 weights per vertex |
| Textures | none (flat black). Skip KTX2 and its 527 KB decoder. |
| GLB | cat at 500 KB or less with all clips; the Butterman figure loaded only when triggered |
| Pixel ratio | `min(devicePixelRatio, 2)`, optionally adaptive between 1 and 2 from measured FPS |
| Post-processing | none at launch |
| Lights | 2 to 3 directional, 1 hemisphere, the environment map; no shadow maps |

Checklist:

- Pause when hidden: `THREE.Timer` with `timer.connect(document)` (the prototype does this; `THREE.Clock` is deprecated in r186), plus stopping the loop when the canvas is offscreen.
- `skinnedMesh.frustumCulled = false` on the real cat, so a jump never culls him.
- `renderer.compileAsync(scene, camera)` after load, with the butter and stick figure already added (invisible), so their first appearance doesn't hitch.
- A `#debug` readout of `renderer.info` (calls, triangles) and frame time. The prototype has one.
- Headless screenshots run WebGL on SwiftShader, a CPU renderer, so frame times from `shot` are only a regression signal. Real numbers come from Windows Chrome on `localhost` and a real phone on the Pages URL.

## Model files

- **GLB only, compressed with meshopt, not Draco.** Meshopt compresses the animation keyframes too; Draco only does geometry. Its decoder is a 29 KB JS module with no wasm path to set up.
- `gltf-transform optimize in.glb out.glb --compress meshopt --simplify false --flatten false --join false --instance false --palette false --texture-compress false --prune false`. The defaults simplify the mesh and merge nodes, which would damage the hand-made silhouette, and prune deletes the empty `butter_socket` node (found in round 2's Blender trial; `--prune false` keeps it).
- Check every export with `gltf-transform inspect`, gltf.report, and the Khronos validator.
- Commit GLBs to the repo directly (no git-LFS; Pages won't serve LFS files).

## Butter state

**One cat model plus a separate butter mesh on a head socket, shown or hidden.** Not a second cat model: that would double the download and break the crossfade mid-animation.

- In Blender, add an Empty named `butter_socket` parented to the head bone. It follows every clip.
- At runtime: `cat.getObjectByName('butter_socket').add(butter); butter.visible = on`.
- For Butterman: the butter starts parented to the stick figure's hand. At the plop moment, `socket.attach(butter)` keeps its world position, then tween it to rest. The prototype adds a small drop-and-squash when butter appears, plus a startle emote.

## Open questions

1. **AgX or Neutral, `#0d0d0f` or `#1c1c1e`?** A by-eye call on a real screen. Use `#tone=agx` in the prototype to compare.
2. **Settle back upright** after a few idle seconds, stay where left, or slowly auto-spin? The code supports all three.
3. **Should a long drag wake him** when he's asleep? Should Butterman cut into a transition, or wait the 1 to 2 seconds for it to finish?
4. **iPhone silent switch:** stay muted for taps (polite), but play Butterman anyway?
5. **Tap on empty space:** nothing (current), or a quieter sound or a head turn toward the tap?
6. **Real-model look:** the free CC0 cats are blocky or lack a sit clip (see `sources.md`). The model research recommends building the cat in Blender (about 17 to 37 hobby hours). Does that fit the brothers' appetite, or should a paid AI base mesh speed it up?
