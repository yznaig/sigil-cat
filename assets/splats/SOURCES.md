# Selected keepsake splats

Aaron selected **awp-1** and **top-1** for the live keepsakes (decision e1110-11).
Input pictures supplied by Aaron, **2026-11-10**. His statement: they are “open source
pictures.” **Original URLs and exact input licences are not recorded yet.** This records
the owner's statement, not independent licence verification. Ask Aaron for both original
URLs/licences before publication. No input picture is committed.

The sibling splat-picks session generated these candidates with Idol via `tools/splats/more.py`:
inputs flattened on white and squared to 1024px; synthetic mode, guidance 3.0;
AWP seed 52832 (`awp-a-flat.local.png`), top seed 47843 (`top-a-front.local.png`).
Standing orientation preserves the top's up axis; level orientation keeps the rifle's
barrel level and scope up. Candidates were baked to the site's SPZ format using the
existing splat tools. These are the selected SPZ files unchanged, copied from
`prototypes/splats/cands/` in the splat-picks worktree. No model was run during migration.

| File | Gaussian count | Bytes |
|---|---:|---:|
| awp-1.spz | 65,536 | 732,563 |
| top-1.spz | 66,432 | 880,437 |

The renderer and cached-picture adapter are our code. Collision proxies are generated
offline from these splats' opaque centres with `tools/splats/object-bake.mjs` (alpha >=96,
1/80-unit voxel samples and 102 directional extrema; 126 rifle / 190 top hull triangles);  they are not a second visible asset. Rapier compat
0.19.3 is Apache-2.0; three.js/ConvexGeometry 0.186.1 is MIT and uses the existing pinned
CDN importmap. No foreign site art, sounds or source code was copied for the adapters.

Dependency licences: [Rapier Apache-2.0](https://github.com/dimforge/rapier.js/blob/master/LICENSE), [three.js MIT](https://github.com/mrdoob/three.js/blob/r186/LICENSE).
