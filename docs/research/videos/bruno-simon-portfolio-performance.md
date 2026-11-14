# Bruno Simon — Performance (Portfolio Devlog 13)
> Research brief of Bruno Simon's 24-min devlog on optimising his three.js portfolio (uploaded 2026-02-02, ~6.5k views): https://www.youtube.com/watch?v=EhZwt9P4GP4
> Why it matters for sigil-cat: what a top three.js practitioner actually measures and cuts to keep a 3D page smooth on phones. No AI in it, but it's the bar for the cat page.

**Credibility:** Bruno Simon made the best-known three.js portfolio (bruno-simon.com) and teaches the Three.js Journey course. In this video he walks through the changes he made to a site that is live.

**Substance score: 8/10.** Dense, specific and honest about what failed (his custom sorting attempt). Low views reflect the niche, not the quality. Some of it is beyond a one-cat scene (physics sleeping, area culling).

## Exec recap
With features piling up, the landing ran at 70–80 FPS at 1080p on an M2 MacBook, which he called not good enough. His fixes: watch draw calls with three.js's new Inspector, instance repeated meshes, merge multi-material meshes using a one-pixel-per-colour **palette texture** (375 → 222 draw calls), lazy-load hidden DOM images, use cheaper blurs, halve texture sizes, cull and sleep off-screen work, disable sorting where overdraw is cheap, compress models (gltf-transform quantize) and textures (KTX2: ETC1S for small files, UASTC for quality), and use WebP for UI images. On phones, a user-agent check switches to a low-quality preset (smaller shadow map, cheaper bloom, no depth of field), with a manual toggle. He tried runtime adaptation and device scoring and rejected both as unreliable.

## Key highlights
- [00:00:00] Baseline was 70–80 FPS on a decent laptop, and "a bad frame rate really spoils the experience".
- [00:01:37] The three.js Inspector (debug UI showing performance, renders such as the shadow map) is his monitor.
- [00:02:34] InstancedMesh for repeated objects (BatchedMesh for shared material with different geometry).
- [00:03:12] (chapter) Palette texture: one material and one draw call per prop. Draw calls went 375 → 222, shadow-map passes included.
- [00:06:38] `loading="lazy"` on hidden HTML images.
- [00:13:34] Turned off three.js sorting. Less CPU, more overdraw.
- [00:16:33] gltf-transform quantize gave the biggest model-size win.
- [00:16:58] (chapter) PNG is a poor fit for 3D textures. Use KTX2 ETC1S or UASTC with mipmaps.
- [00:19:45] WebP for UI images.
- [00:22:05] Mobile check, then a low-quality preset. Device-capability scoring "not accurate", runtime auto-adapt "isn't safe".

## Takeaways for sigil-cat
1. A single matte-black cat is cheap. The cost will come from shadows, post-processing (bloom) and pixel ratio. Cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` and keep a low-quality preset for phones from day one.
2. Watch `renderer.info.render.calls` and `.triangles` in a debug overlay alongside FPS and frame time. Draw calls are the number Bruno optimised.
3. Run the cat GLB through gltf-transform (quantize, Draco or meshopt) before committing, so Pages serves a small file.
4. A plain "low/high" toggle the visitor can flip beats clever auto-detection.
