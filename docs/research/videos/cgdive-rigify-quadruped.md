# CGDive — Rigify Dog/Quadruped Rig (Blender 4.0, ch. 5)
> Research brief of CGDive's 39-min Rigify quadruped lesson (uploaded 2024-01-12): https://www.youtube.com/watch?v=bH0xkGflJ0k
> Why it matters for sigil-cat: the most direct, credible walkthrough of rigging a four-legged animal with Blender's free built-in rigger.

**Credibility:** CGDive (Todor) runs a long-standing Blender rigging channel and the free CGDive Academy Rigify course; the video shows every step on screen, including the errors.

## Exec recap
Add a prebuilt animal metarig (Shift+A › Armature › Animals; the Wolf stands in for a dog; Basic Quadruped is the no-face option), scale it to the model, apply scale, align bones chain by chain in X-ray with X-symmetry, then Generate Rig. Bind with Ctrl+P › With Automatic Weights; fix the common "bone heat weighting" failure; then clean weights in Weight Paint mode. The generated rig ships with leg IK, foot/toe controls, a horizontal torso/hips/chest spine, a master tail control with lag, and tweak bones.

## Key highlights
- [00:01:19] Prep the mesh before rigging: straighten the tail, lift the ears. "It is easier to bend something than to unbend it."
- [00:01:40] No dog metarig; use Wolf. Scale the metarig to the model and Ctrl+A apply scale.
- [00:02:47] The #1 generate error: never disconnect the tail root (or neck) from the spine. Select the shared joint and move it as one.
- [00:04:13] Head bone placement affects automatic weights; with no face rig, place it so it covers the head.
- [00:06:37] Delete all face bones if you don't need a face; or use Basic Quadruped, which has no face and no finger bones (relevant for a featureless cat).
- [00:09:44] Breast/pelvis bones are support bones for automatic weights; delete them to cut bone count and paint by hand instead.
- [00:23:07] Generate. Errors are almost always a disconnected bone named in the error; snap it back (fixes "about 90%" of failures).
- [00:24:19] Bind with automatic weights; "bone heat weighting" error is common. Fix: scale rig+mesh ×100, parent with automatic weights, clear parent, reset scale, re-parent with Armature Deform.
- [00:25:53] Legs default to IK with foot and toe controls; optional pole targets.
- [00:28:36] Rigid parts (eyes, teeth) use Ctrl+P › With Empty Groups, then assign whole parts to one vertex group = rigid follow.
- [00:30:07] Thin attached parts (whiskers) get weights via a Data Transfer modifier from the body, then apply it.
- [00:32:20] Weight-paint cleanup: Auto Normalize on, subtract brush at low strength, then blur. Ears and shoulder bled into the skull/body.
- [00:37:37] Master tail control gives a lagging tail; [00:38:08] scaling a torso tweak bone slightly reads as breathing (idle loop idea).

## Takeaways for sigil-cat
1. Start from the **Basic Quadruped** (or Cat) metarig and delete the face; a featureless cat needs spine, neck/head, ears, tail, four legs.
2. Rigify gives a big control rig; for glTF export only the DEF- bones matter (export "Deformation Bones Only"). CGDive's separate "Game Rig Tools" video/add-on covers extracting a clean game rig.
3. Plan for weight painting on ears, shoulders and haunches; that's where a smooth low-poly cat will show problems.
4. The butter cube can be bound the way the eyes are: parent to the head bone (or a one-group rigid bind).
