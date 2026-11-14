---
name: add-cat-animation
description: Add or replace one of the cat's animation clips (a pose hold, a transition between poses, a one-shot like stretch, or an emote) and prove it plays without pops. Use when adding a new pose or emote, wiring a new clip from Blender into the pose cycle, changing hold times or next-pose weights, or when a pose change looks like it snaps.
---

> **Round 2 (2026-11-07):** full emotes now exist in the cat-viewer (`CONFIG.cycle.emotes` and `actions`, with a queue); `tapWakes` is gone (tap asleep → `emote_wake`). Compress with `--prune false` or `butter_socket` is deleted. Fold these into the steps below before approving.
>
> **DRAFT (2026-11-07), for Aaron to approve.** Written from research round 1 (`docs/research/render-stack.md`). Paths assume the planned layout in `docs/workflow.md`; until the split, the code lives in `prototypes/cat-viewer/index.html`.

# Add a cat animation

The cat's motion is a **pose cycle**: looping holds (`sit`, `lie`, `sleep`), one-shots (`stretch`), transition clips named `from_to_to`, additive overlays named `add_*`, and full emotes named `emote_*`. The player finds clips **by name** and reads every rule from `CONFIG.cycle`, so most changes are a clip plus a config line. The spec is `docs/ideas/cat-poses.md`.

## Steps

1. **Name the clip.** Pick its kind and name from the table. *Done when* the name follows the pattern exactly. The player depends on it.

   | Kind | Name | Loops | Rule |
   |---|---|---|---|
   | hold | `sit` | yes | last key equals first key |
   | one-shot | `stretch` | no | ends on the first frame of its `then` pose |
   | transition | `lie_to_sit` | no | first frame = `lie` frame 0; last frame = `sit` frame 0 |
   | additive overlay | `add_hop` | no | starts and ends on its frame-0 pose; made additive in code; for partial-body reactions (there are no per-bone masks) |
   | full emote | `emote_wake` | no | from any pose; ends on frame 0 of its `returnTo` pose |

2. **Get the clip into the model.**
   - **From Blender:** one Action per clip, pushed down to its own NLA track, in place (no root travel). Re-export and compress with the commands in `docs/workflow.md` step 12.
   - **Placeholder:** define the pose or the function in the poses section of the code and `bake()` it, as the existing clips do.
   *Done when* `gltf-transform inspect assets/cat.glb` (or the `clips` array) lists the new name.
3. **Wire it into `CONFIG.cycle`.**
   - A hold needs `poses.<name> = { hold: [min, max], next: { ... } }`, plus weights pointing to it from at least one other pose.
   - A transition needs its entry in `transitions`.
   - A one-shot needs `{ oneShot: true, then: '<pose>' }`.
   - An overlay needs a trigger in `emotes`, or a call to `emote('<name>')`.
   - A full emote needs a `returnTo` pose. The prototype's player doesn't have full emotes yet: add a phase that plays the clip once and then enters `returnTo`, queued while a transition is running.
   *Done when* every pose can still reach every other pose: `pathTo(a, b)` returns a route for each pair.
4. **Verify with fixed-moment screenshots.** Serve the site (`python3 -m http.server`), then run the `shot` command with the frames frozen:
   - `shot "http://localhost:8000/#debug&pose=<pose>&t=0" "...&t=<mid>" --mobile`
   - For a transition or emote, drive it with `--js`: call `catViewer.auto = false; catViewer.request('<pose>')` or `catViewer.emote('<name>')`, wait part-way, and print `catViewer.phase` and `catViewer.pose` into an overlay. `prototypes/cat-viewer/checks/pose-cycle.js` is a working example to pass with `--js "$(cat ...)"`.
   - Read every PNG. Judge the **silhouette** first: the cat is featureless black, so the outline is the whole pose.
   *Done when* each frame shows the intended pose, the debug readout shows the expected phase, and `shot` printed no CONSOLE or PAGEERROR lines.
5. **Watch it live once.** Screenshots can't show a pop. Open the page in a real browser with `#debug`, trigger the clip three times, and watch each seam. *Done when* no seam visibly snaps. If one does, the clip's first or last frame doesn't match the neighbouring hold's frame 0; fix the clip, not the fade time.

## Common mistakes

- `THREE.Clock` is deprecated (r183+). Use `THREE.Timer` with `timer.connect(document)` and `timer.update(now)` in the loop.
- Procedural motion (the bob, the tap squash) goes on groups **above** the mixer root, or runs **after** `mixer.update()`. Otherwise the clip overwrites it.
- `action.reset()` before replaying a one-shot. `crossFadeTo` changes timescale and weight, so reset both before reusing an action.
- One-shots need `setLoop(THREE.LoopOnce, 1)` and `clampWhenFinished = true`. Emotes are not clamped, so they release when done.
- A clip that doesn't key every bone leaves those bones where the previous clip put them. Key every bone on frame 0, or export with *Reset pose bones between actions*.
- Additive overlays: `THREE.AnimationUtils.makeClipAdditive(clip)` uses frame 0 as the reference, so the clip must end on its frame-0 pose too.
- Bone and node names use underscores. three.js strips dots from names, so `ear.L` binds as `earL` and tracks silently miss.
- Never `crossFadeTo(next, d, true)` (warp) into a transition clip, because it time-scales the clip.
- Blender's *Optimize Animation Size* drops unmoving bones from a still hold. Export with *Force keeping channel for armature / bones*.
- Imports come from `three/addons/...` through the importmap, never `three/examples/jsm/...`.

## Evidence for the report

- the clip name and kind
- the config lines changed
- the PNG paths from step 4, with one line on what each shows
- the console-note result
- whether the live seam check in step 5 passed.
