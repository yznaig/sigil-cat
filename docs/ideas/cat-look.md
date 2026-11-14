# Cat look and motion vibe
Aaron's direction for how the cat looks and moves (2026-11-07, decision e1107-44).
The look must match the brothers' reference sheet; the motion must feel springy, like early Mickey Mouse.

## Look
- Match the texture, vibe and shape of the reference sheet: `docs/reference/character-sheet.png` (cut views in `docs/reference/views/`). Rounds 1 and 2
  built from text only, before the sheet arrived, which is why both test cats miss.
- From the sheet: chibi build, head about half the height, tiny body, nub paws (no visible legs when sitting), soft rounded ears, three thick curved whiskers per side, no face, matte felt-like grain. Sigil Black #121212 on Bone Beige #F7EDE3, shadow black at 10–20%.
- The sheet's back view repeats the front (whiskers and all), so use front, 3/4 and side views as truth.
- Round 2's two cats (Blender, SDF) are judged lackluster and off-model.

## Motion: springy, rubber-hose cartoon
- Early-1930s Mickey Mouse / rubber-hose style: bouncy, elastic, squash and stretch, overshoot and settle,
  anticipation before moves, follow-through on ears and tail. Never stiff.
- Idea to test: the whole page bounces on one tempo, as 1930s cartoons did, so the cat's idle bob shares the BPM
  grid Butterman already uses.
- Today's clips are judged stiff.

## Shape quality (Aaron, 2026-11-07, e1107-49)
- No shapes clipping into each other, ever: not in poses, not mid-transition.
- Clean, smooth connections where the body bends and where paws and arms extend out of the body.
  Joints deform like soft vinyl or felt over a single body, not separate parts pushing through each other.

## Whiskers (Aaron, 2026-11-07)
- Whiskers stay smooth: clean solid strokes, no matte felt grain. Their own material, Sigil Black, smooth.
  The felt grain is for the body, ears, paws and tail only.

## Tail
- The tail has its own idle life: natural cat flicks and slow sways, at least while sitting, layered on top of
  whatever pose is playing.

## If a pose falls short: morph to a sculpted pose (Aaron's idea, 2026-11-07; held until the build's output is judged)
Some poses, the stretch above all, may need a different body shape rather than a bent skeleton: almost a
new model. Approach: make a pose mesh (AI-generated from the sheet's pose image, or sculpted in Blender), wrap
the base cat's mesh onto it (Blender shrinkwrap / surface deform), and save that as a blend shape (shape key).
The animation then morphs into and out of the pose shape while the skeleton handles the motion, so the topology
stays one mesh and nothing clips.

## Texture: foam, flat (Aaron, 2026-11-07, after seeing the built cat)
- More like a microphone windscreen / foam than fine felt, but as a flat pattern: no real pores or depth.
  A first try with bumped pores caught the light and shimmered at some angles, and Aaron rejected it.
- Options are live in prototypes/sigil-cat (Texture buttons, or `#tex=<key>`): Felt (first build), Soft foam,
  Fine foam, Sponge, Velvet, Plain matte. Patterns tint the lit colour only; only Felt has a bump.
  Side by side: prototypes/sigil-cat/compare-textures.png. Aaron picks one.
- Second pass (same day): Aaron picked Velvet as closest but said none felt like foam. The brother's pose sheets
  (docs/reference/poses/) show the real texture: soft charcoal with fine, curly, lighter fibres that show even in
  shade, like flocked foam. Added Flocked (now the default), Flocked fine and Flocked bold: Velvet plus fibre
  strokes added as light. Comparison: prototypes/sigil-cat/compare-flocked.png.
- Third pass: none of the procedural options read as felt, and procedural noise shimmers when the cat turns.
  The standard fix is a real image texture with mipmaps, so the body now uses the brother's own fibre pattern:
  build/make_fiber_tile.py cuts it from the loaf sheet (lighting removed, made seamless) into
  textures/fiber-tile.png, and the shader projects it from three sides (triplanar, since the mesh has no UVs)
  with mipmaps and anisotropic filtering. A 'soft' light rig (frontal, low contrast) matches the sheets' studio
  look. Presets: From the sheet (default), Sheet coarser, Sheet with the original light.
  Comparison: prototypes/sigil-cat/compare-sheet-texture.png.
- Fourth pass: Aaron liked From the sheet but wanted it foamier. Added three common soft-material tricks on top:
  wrap lighting (light soaks past the shadow line, a cheap stand-in for subsurface scattering), a gentle bump from
  the same mipmapped fibre image, and fuzz shells (see-through layers just above the surface that follow the
  skeleton and blend shapes, for a soft outline). Presets: Foamy (default), Foamy no fuzz, Foamy extra fuzz.
  Comparison: prototypes/sigil-cat/compare-foamy.png (sheet, From the sheet, Foamy no fuzz, Foamy, extra fuzz).
