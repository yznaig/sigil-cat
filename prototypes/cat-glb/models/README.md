# Models for the cat-glb prototype
Test models the GLB load-path prototype loads with `#model=models/<file>.glb`.
Where each came from, its license, and how it was compressed.

## quaternius-cat.glb

| Field | Value |
|---|---|
| What | "Cat" by Quaternius, a low-poly rigged cat (stand-in only, not the real cat) |
| Source | https://poly.pizza/m/qKICY6xla2 (file served from static.poly.pizza) |
| License | CC0 1.0 (Public Domain), as stated on the poly.pizza page, 2026-11-07 |
| Original | 238,672 bytes (238.7 KB) |
| Compressed | 52,976 bytes (53.0 KB), meshopt + quantization |
| Mesh | 1 skinned mesh, 2,448 triangles, 2,276 vertices, one 512x512 atlas texture (unused: the page swaps in its matte material) |
| Rig | `AnimalArmature` at 100x scale, 16 joints; head bone `Head` |
| Clips | Death, Headbutt, Idle (7 s), Idle_Eating (3 s), Jump_Loop, Jump_Start, Run, Walk; names carry an `AnimalArmature\|AnimalArmature\|AnimalArmature\|` prefix |

Compressed with:

```
npx @gltf-transform/cli optimize in.glb quaternius-cat.glb --compress meshopt --simplify false --flatten false --join false --instance false --palette false --texture-compress false
```

`prune` dropped the unskinned `*_end_end` leaf nodes; every joint and clip survived.
