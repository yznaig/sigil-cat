# Cat model: which path to the real cat
How to get the real rigged, animated matte-black cat, comparing every path round 2 could test or research, with prices, licenses, hours and evidence.
Research round 2, 2026-11-07. It replaces round 1's "build it in Blender, 17–37 hobby hours" (`render-stack.md`, `sources.md` §4–5). The proofs are in `blender-trial/`, `prototypes/cat-glb/` and `prototypes/cat-sdf/`.

## Recommendation

**Path: Claude scripts the cat in Blender, headless, with the brothers as art directors.** It costs $0, and every part of the cat is our own work, so there's no license question on a public repo. It takes **about 8–12 hours of Claude time over 4–6 review rounds** to get from today's blockout to a "good" cat. The human part is taste: looking at renders and saying "chunkier", "ears smaller", "slower stretch".

Evidence: round 2 actually ran it (`blender-trial/README.md`).
- **Time:** about 20 minutes of wall-clock, from downloading portable Blender 5.2.3 to a GLB playing in three.js.
- **Cat:** one watertight 12,694-triangle mesh, 27 named bones, and a `butter_socket`.
- **Clips:** all 10 from the pose spec, with seams checked numerically (first and last frames match the holds exactly).
- **File:** 279 KB after meshopt.
- **Look:** every pose reads as a cat in flat black (`blender-trial/preview-poses-silhouette.png`). It loads in `prototypes/cat-glb/index.html#model=models/claude-blender-cat.glb`, with crossfades and the butter riding the socket (the check passes).

What's weak today, and what the hours buy:
- **Motion is a blockout.** Transitions interpolate key poses, with no anticipation or follow-through, and paws slide and dip mid-move. Fix: IK paw planting plus about 30 minutes of polish per clip.
- **Small creases** at the neck in `sleep`, the flank and the belly. These show under grey light only; black hides most of it.
- **The design is generic,** more "Halloween cat" than vinyl toy. Proportions are about 30 numbers in `build_cat.py`, so redesigning is cheap.
- **Nobody has seen it move at full speed yet.** Open the GLB prototype and watch: it is the first thing to do.

**Runner-up: the procedural cat in code (SDF mesh), `prototypes/cat-sdf/`.** It's also $0 and all our own work, and it needs no Blender at all.
- **How it works:** the cat is one signed-distance shape of 32 primitives blended with smooth-min. The page turns it into one skinned mesh at load and auto-skins it to the cat-viewer's existing named parts.
- **What it reuses:** the whole round-1/2 pose, clip, emote, turntable and butter machinery, unchanged.
- **Measured:** 17.6k triangles, 15 bones, at most 3 weights per vertex, built in about 97 ms, 2 draw calls. All 9 checks pass. The silhouettes read as one seamless animal (`prototypes/cat-sdf/shots/poses-prim-mesh-ray.png`).
- **Why it's second:**
  - Its clips are authored as numbers in JavaScript, not in an animation tool. That's fine for holds and simple transitions, but polish like IK paw planting and anticipation is harder there than in Blender.
  - The sleep pose shows a crease at the neck.
- **Hours:** about 4–8 h of shape sculpting (best with a slider page), then the same motion polish as any path.
- **Ray mode** (raymarching the shape per pixel) looks the same and blends the sleep crease away, but it costs GPU on every frame. It's not worth it on phones.

The two paths can mix: sculpt the shape fast with the SDF sliders, then hand the proportions to `build_cat.py` for Blender's rigging and animation tools.

**Third: buy a ready-animated cat pack, but only with the seller's written OK.** The best fit is **Indie Cat "Low Poly Cats", Unity Asset Store, $19.90**:
- 10k triangles and 90 clips.
- The seller states that Stand, Sit, Lie and Sleep each have transitions "to and from any other stage".
- 364 favourites and 10 reviews.

Its clips would be better animated on day one than either blockout. What blocks it:
- **License.** Every marketplace license (Unity, Fab, CGTrader, Sketchfab, TurboSquid) bans letting visitors pull the model out. A GLB in a public GitHub repo, on a site whose whole point is the cat, fails on a strict read (clauses quoted below). Being non-commercial doesn't help.
- **Unconfirmed contents.** Stretch isn't confirmed, and the pack is Unity-only (FBX inside, needs extraction and export).
- **The look is theirs, not the brothers'.**

Only after emailing the seller (indiecatstudios@gmail.com) for a written yes for "hobby, non-commercial, GLB served from a public GitHub Pages site, footer notice forbidding extraction". Then it's a few hours' conversion (an estimate, unmeasured).

**Why not the others**, in one line each (details in the comparison):
- **AI image-to-3D:** gives a base mesh, not a cat. Clean-up, rig and all 10 clips are still ahead. Our scripted mesh is already cleaner than what practitioners report from these tools.
- **AI auto-riggers:** none ships the clips, and the research riggers output unnamed, arbitrary skeletons.
- **Motion from video:** out. Monocular animal fitting is jittery and slides; cleanup is the project.
- **Clay sculpt and phone scan:** charming, and the cat would really be theirs, but it replaces modelling only. Rig and clips are still needed, and featureless clay scans badly without a speckle trick.

## Comparison

| Path | Cash | Hours to a good cat | License for a public repo | Quality evidence | Verdict |
|---|---|---|---|---|---|
| **Claude-scripted Blender** | $0 | 8–12 Claude h + review rounds (measured: blockout in 20 min) | Our own work. Blender's GPL doesn't cover what you make with it. | Our run: 10 clips, seams exact, silhouettes read; motion unpolished | **Recommended** |
| Procedural SDF cat in code (mesh mode) | $0 | 4–8 h shape sculpting + motion polish in code (est.) | Our own work | Our run: 17.6k tris, 15 bones, 97 ms build, 2 draw calls, seamless; sleep-neck crease | **Runner-up** |
| Paid pack: Indie Cat Low Poly Cats | $19.90 | a few h conversion (est.) | Unity EULA 2.2.1(a) and FAQ: fails strictly; needs the seller's written OK | Seller claims, 364 favourites, 10 reviews; contents not opened | Third, with seller's written OK |
| Paid pack: Sneznyj Animated Cube Cats | $19.99 | ~1 h (GLB included) | Own license names web use but bans "a public repository" | Seller 22 days old, no ratings, "AI Assisted" | Blocky look; license blocks public repo |
| Paid pack: GiM Animalia Cat | $89.99–99.99 | a few h | Fab/Unity: same problem | All six sit/lie/sleep transitions named; no stretch; realistic | Too pricey for what it lacks |
| Paid pack: billl90 LowPoly Cats (CGTrader) | $25 | a few h | CGTrader 21A.3 requires blocking end-user access | begin/cycle/end clips; no stretch; ~3k tris | Same license wall |
| Truebones Zoo | $99+ | — | Contradictory text | Cat has only purr, lick, stretch-yawn, walk | Out for this cat |
| AI image-to-3D (Hunyuan3D 2.1, TRELLIS.2, Tripo, Meshy) + Rigify + hand clips | $0–20 | 30–60 h (est.; 20–40 h of it is clips) | TRELLIS.2 MIT (check DINOv3); Tripo free tier: Tripo keeps all rights; Meshy free = CC BY 4.0; Hunyuan 2.1 excludes EU/UK/S. Korea, incl. displaying output | Practitioner tests: fused limbs, holes on the hidden side, "not suitable for animation" without retopo | A base-mesh helper at best |
| AI auto-riggers (UniRig, SkinTokens, Puppeteer, MagicArticulate, RigAnything) | $0 | — | RigAnything research-only; RigNet GPL | Arbitrary, unnamed skeletons; no clips; several pin torch builds without sm_120 kernels | Out as the final rig |
| Tripo / Meshy / Anything World auto-rig + clips | $0–20 | — | as above | Tripo and Meshy quadruped = walk only; Anything World cat has lie-down only (sit/sleep "Canine Only") | Out |
| Motion from video (Wan 2.x video → SMAL fitting / MoCapAnything) | $0 | 12–20 h + heavy cleanup (est.) | varies; SuperAnimal weights non-commercial | Wan 2.2 failed "cat wakes and stretches"; SMAL fits jitter and skate (DogMo paper) | Out |
| Clay sculpt + phone scan (KIRI, Polycam, RealityScan) | $0 | 5–12 h to a riggable mesh (est.), then rig and clips as above | KIRI Basic: you own exports; Polycam free requires attribution | Polycam docs list featureless surfaces as unsupported; speckle the clay | Fun side quest, not a shortcut |
| Cascadeur | $8–19/mo Indie | — | Free tier exports `.casc` only, non-commercial | Quadruped support official, but quadruped AutoPosing is Pro ($33–49/mo) | Overkill for four poses |
| Accept the CC0 Quaternius cat | $0 | 0 | CC0 | Proven in `prototypes/cat-glb/` (crossfade and butter pass) | Blocky, no sit clip; test asset only |
| Procedural SDF cat (ray mode) | $0 | as above | Our own work | Same look, blends the crease; 1.6 fps headless vs 8.7 for mesh; about 1 GFLOP a frame at iPhone resolution | Not on phones |

Hours marked "est." are the researchers' estimates, not timings. The measured numbers come from our own runs: the Blender trial and the SDF prototype.

## The recommended path, step by step

1. **Look at it move.** Serve the repo (`python3 -m http.server`), then open `prototypes/cat-glb/index.html#model=models/claude-blender-cat.glb` on the laptop and on the iPhone. Judge the silhouette, size and feel. It's a blockout, so judge the shape, not the polish.
2. **Art-direct the shape.** The brothers give 3–5 notes (proportions, ears, tail, paws). Claude edits `build_cat.py`, re-renders the silhouette sheet in about 20 s, and repeats. Expect 1–2 h over 1–2 rounds.
3. **Motion pass.** IK paw planting during transitions, then baked to keys. Anticipation and overlap per clip; a second hold variant for `sit` and `lie`. Review with frame strips or a short video render. Expect 5–7 h over 2–3 rounds.
4. **Creases and the socket.** Weight fixes at the neck and chest. Seat `butter_socket` lower (in the prototype the butter perches at ear-tip height). About 1 h.
5. **Emote clips** as they're specced: `emote_wake`, `emote_flinch`, `emote_spin`, plus the nostalgia picks' clips. Each ends on frame 0 of its `returnTo` pose. About 30–60 min each.
6. **Export** with the round-1 flags **plus `--prune false`**. Without it, gltf-transform deletes `butter_socket`, an empty node (found in the trial). The draft skill `add-cat-animation` and `render-stack.md` need that flag added.

Optional: install the official Blender Lab MCP connector for the review rounds only. Then Aaron watches the live scene while Claude edits it. That's a nicer taste loop, not a needed one. It runs Python inside his Blender, so treat it as trusted local code.

Portable Blender lives in `~/opt/blender-5.2.3-linux-x64/`. It needs 4 Ubuntu libraries unpacked into `~/opt/blender-libs/` (`LD_LIBRARY_PATH`). No system install.

## License notes behind the paid option

Quoted from the primary texts (read 2026-11-07):

- **Unity Asset Store EULA** 2.2.1(a): an asset must be incorporated into a product "that has a purpose, features, and functions beyond the display ... of Assets ... such that the Asset does not comprise a substantial portion of the Licensed Product". FAQ: an asset isn't "incorporated" if the product "is designed to allow your end users to extract or download assets separately". (https://unity.com/legal/as-terms, https://assetstore.unity.com/browse/eula-faq)
- **Fab Standard License** 6(ii): Content must be "merely a component of the Project and not the primary focus of the Project". Quoted from Epic's forum paste, because the live EULA renders by script. (https://www.fab.com/eula)
- **CGTrader Royalty Free** 21A.3: "take all commercially reasonable measures to prevent the end user from gaining access to the Product". (https://www.cgtrader.com/pages/terms-and-conditions)
- **Sketchfab Standard** 2.2(b): may not make it available "as a stand-alone file", and 2.2(c)(ii) bars use where "the primary value ... lies with the Licensed Material itself". (https://sketchfab.com/licenses)
- **Sneznyj's own license:** web shipping allowed, but no "public repository". (https://sneznyj.com/license/)
- **Mixamo** (relevant to Butterman, not the cat): the FAQ allows "personal, commercial, and non-profit projects", but Adobe's licensing FAQ bans "free distribution of character or animation raw files". A public GLB is the grey area. (https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html, https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/td-p/13234775)

## Sources

| Source | Why credible | Take |
|---|---|---|
| `blender-trial/README.md`, `build_cat.py`, `anim_cat.py` | Our own measured run, with scripts that reproduce it | Timings, numbers, failures and fixes, including `--prune false` |
| `prototypes/cat-sdf/` README, checks and shots | Our own run | SDF mesh numbers, look comparison, ray-mode cost |
| `prototypes/cat-glb/` and its check | Our own run in three.js 0.186.1 | The GLB load path, crossfade weights mid-fade, butter drift 0.00000 in the socket frame |
| Store pages: Indie Cat "Low Poly Cats" (Unity Asset Store), Sneznyj "Animated Cube Cats" (itch.io, sneznyj.com), GiM "Animalia Cat" (Unity, Fab), billl90 "LowPoly Cats" (CGTrader) | The sellers' own words; clip lists are claims, not opened | Clips, triangle and bone counts, prices |
| License texts linked above | Primary legal documents | The public-repo problem |
| Tripo terms (tripo3d.ai/terms) 5.2.1, Meshy license docs, the Hunyuan3D 2.1 LICENSE file, TRELLIS.2 issue #22 (maintainer reply) | Vendor terms and a maintainer reply | Output rights per tool |
| Practitioner AI-mesh tests: Top3D retopology comparison (2026-01), note.com RTX 5060 Ti test (2026-11), Loraverse (2026-10), AssetHub Blender 5.1 retopo log, blenderartists Meshy rigging thread | People who show the meshes and the failures | Fused limbs, holes, "not suitable for animation" without retopo |
| [KhronosGroup/glTF-Blender-IO](https://github.com/KhronosGroup/glTF-Blender-IO) issues #2141, #2115, #2223 | Exporter maintainers' own replies, with repros | Rigify bendy bones don't export; deform-only can leak IK bones; weights capped at 4 |
| [Tripo rig presets](https://developers.tripo3d.com/en/models/rig), [Meshy rigging](https://docs.meshy.ai/en/webapp/guides/3d-model/rigging), Anything World animation list | Vendor docs | Quadruped clips are walk-only (Tripo, Meshy) and lie-down-only (Anything World cat) |
| UniRig, SkinTokens, Puppeteer, MagicArticulate, RigAnything repos and issues | Primary repos | Arbitrary skeletons; torch pins; licenses |
| [Polycam object mode](https://learn.poly.cam/hc/en-us/articles/27425185907348-How-to-Use-Object-Mode), [Apple WWDC23 Object Capture](https://developer.apple.com/videos/play/wwdc2023/10191/) | Vendor docs | Featureless objects scan badly |
| [Cascadeur plans](https://cascadeur.com/plans), [quadruped inbetweening](https://cascadeur.com/blog/view/cascadeur-2025-3-new-inbetweening-quadrupeds) | Vendor | Quadrupeds are supported, but exports and quadruped AutoPosing sit on paid tiers |
| [Blender MCP (ahujasid)](https://github.com/ahujasid/blender-mcp), [Blender Lab MCP](https://projects.blender.org/lab/blender_mcp) | Primary repos | What MCP adds; the no-auth socket caution |

## Not tested

- **Local image-to-3D on Aaron's GPU.** Hunyuan3D, TRELLIS and others were researched but not run: the permission classifier blocked cloning and running outside research code. If Aaron wants it run, he can say so (see `open-questions.md`). It wouldn't change the recommendation, since a generated mesh still needs the same rig and clips our scripted cat already has.
- **The Blender cat seen moving on a phone.** Every check so far is headless.
- **Paid packs' actual contents.** Nothing was bought.
