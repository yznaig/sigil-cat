# Revamp brief: rebuild Sigil Cat from the ground up
What the rebuild session builds, what it carries over, and the check it reports against. Written 2026-11-09 from
Aaron's answers (decisions e1109-12, e1109-17, e1109-20). Read `docs/spec.md` first; where the two differ, this wins.

## Read first
- `docs/spec.md`: every ask so far, by feature. Section 4 (N1-N12) is all in scope here.
- `docs/ideas/gags-round2.md`: the new gags and the combos that fall out of them.
- `demo/ui/shots/storybook-1-hush.png` and `ui-story.html?v=1`: the UI Aaron picked ("Hush").
- `docs/reference/name-mark-crop.png`: the four-character name. `docs/reference/storybook-vibe.png`: the mood.

## What Aaron wants, in his words
- "really polish this website and also optimize it a lot without dropping quality"
- "an experience where people can collect stuff in the background, like the [AWP] and the cloud, and fill up their page
  a little bit, all with interactive and unique stuff"
- "improve quality all around, from website useability, like a sound control, UI quality, Sound effects, etc."
- "any design should stay with a relatively blank background with the cat floating in the middle"
- "each item to kind of have its own style, kind of like this page is a bunch of different worlds meeting together
  strangely ... Style Transfer / Style Clashing"
- "The current page is kind of slow. and I have a good graphics card"

## Decided
1. **Rebuild, not patch.** The old site runs the rigged mesh cat, hidden, every frame to drive the splat cat. The new
   one is built around the splat cat alone.
   - Carry over: the five splats (`assets/splats/`), Aaron's Butterman audio with its measured beat timings
     (`assets/audio/butterman/`, `docs/audio.md`), Butterman's choreography and look, the galaxy shader's look, the
     one-stroke recognizer, the pose cycle and pop numbers Aaron tuned, the checks worth keeping.
   - Drop: the mesh cat and everything that exists only for it, the texture presets, the webring ("I dont even know
     what 'sigil ring' is supposed to be"), `#cat=mesh`.
2. **UI: Hush.** A near-blank warm page, the cat floating in the middle. The name is the four-character mark from
   Aaron's image, not the eight-sign line in the mock-up, and not under him. Placement (e1109-22, replaces the earlier
   "large, above him" reading): "no, smaller, like a title label, middle center at the top of the page". Small, centred
   at the top. No original artwork exists, so trace the four characters from `docs/reference/name-mark-crop.png` into
   clean vector shapes.
   The browser tab still says Sigil Cat. The bold numbers top right, a row of small marks for what is found, quiet
   text controls at the bottom. Messages arrive in his script and settle into words. The grimoire
   page follows the same look. The other demo skins (`ui-a` to `ui-e`, `demo/ui/`) are reference only; delete them
   once Hush is built.
3. **Collecting is the spine.** Every egg leaves a keepsake on the page that stays (remembered on the device) and can
   be played with. Keepsakes react to each other and to the eggs; combos come from that. A small table drives combos.
4. **Style clash.** Each keepsake is made in its own visual style, on purpose. The page and the cat stay quiet; the
   clash is the props. Claude picks a style per keepsake and lists them for Aaron's veto. He agreed to these as the
   register: the cloud as a real volumetric cloud, the glass as photoreal refracting glass, the box as a flat cardboard
   cut-out, the googly eyes as craft-shop plastic, the hat as pixel art, the physics paper as a bad photocopy, the
   trophy as a gold low-poly prize from a 90s console.
   - **The AWP:** Aaron: "im sure theres a free model on the internet somewhere". Look for a freely licensed model
     (CC0 or CC-BY) that reads as the CS:GO AWP, record its source and credit it; if none can be had with a licence
     that allows a public repo, build our own in that look. Never Valve's own files or skins.
   - Where a style needs a photo, use public-domain sources and write each one down.
   - Visitors can drag keepsakes to arrange their page; the layout is saved on the device.
   - The "!!!" above his head in Aaron's picture is his startle mark.
5. **The bolt** may flash the screen once per cast (this amends "nothing flashes"); never a strobe; no flash under
   `prefers-reduced-motion`. It should be a real storm moment: the page darkens, a branching bolt comes down on him,
   one flash and a small shake, real thunder (a CC0 recording).
6. **Butter whisper** is a vicinity effect on a silent loop (spec 3.5).
7. **Sound.** A sound control (mute and volume, remembered). Every placeholder sound replaced by a real recording
   (CC0, source recorded in the repo) or a properly designed one. The brothers' own recordings can replace any later.
8. **Butterman scene 2** gets the new choreography (spec N2) on Aaron's new clip: `~/sigil-cat-inbox/butterman-scene2-new.m4a`
   (29.7 s raw; run it through `tools/audio/prepare-butterman-audio.py`; keep that neutral file name, the upload's
   original name held a street address).
9. **Gags.** Unit 1 builds gags 1-8 of `gags-round2.md`; unit 2 builds 9-12; 13-16 wait for Aaron.
10. **No push.** Local commits on `revamp`, merged to local `main` when the check passes. Pushing is Aaron's word.

## Scope
**Unit 1 (the one-shot)**
- The new core: one render loop, the splat cat (poses, pop, buoy, spin, tap, hop), input routing, the audio bus,
  saved state, the egg and keepsake registry, the combo table.
- Hush UI, on desktop and phone, keyboard reachable, with a first-visit hint and reduced-motion versions.
- Every existing egg rebuilt on the new core: sigils and grimoire, Butterman (three scenes, cameos, butter, whisper),
  galaxy cutscene, loaf to bread, 360 no-scope, the bolt.
- Spec N1 (no shake loaf/sleep), N2 (scene 2), N4 (cloud, AWP; marks for the other eggs), N5 (grimoire hides unfound
  sigils: a riddle line, no shape), N6 (the O: 20 spins, never opens the galaxy), N7 (no long frames), N11 (half-circle
  loaf sigil), N12 (loaf + star blast-off).
- Gags 1-8: buttered cat paradox, butter fling, the glass, the box, googly eyes, the hat, whisker harp, pet-pet-bite.
- Real sounds throughout.

**Unit 2 (straight after, its own check):** gags 9-12 (yarn, the weather, everything orbits, the corner).

**Not in either:** the 360 video (waits on Aaron's file), social links, the iPhone pass, the push.

## Performance
Profile on Aaron's real GPU before designing the core, and again at the end. Suspects in the old build: the hidden mesh
cat animating every frame; Spark re-sorting the splats with a GPU read-back (the console warns of a ReadPixels stall);
a full-screen canvas at twice the pixel density. He turns only left and right and the poses are still, so the sort
order per pose depends on one angle: that is worth exploiting. Also found: on a phone a tall bottom bar clips his ears
(the view offset in the old framing); the new framing must not.

## Rules that still hold
- No build step: plain ES modules, relative paths, so the brother can edit on github.com.
- One file per egg; every tunable in a config object.
- localStorage always in try/catch. Nothing strobes. `prefers-reduced-motion` gets calmer versions.
- Public repo: every asset is ours, CC0, or licensed for it, with its source written down. No Valve files.
- Never open a visible browser window on Aaron's machine. Headless only (`shot`, the checks).
- Work in `~/sigil-cat-revamp` (branch `revamp`). Preview without caching: `python3 tools/serve.py . 8732`.
- Aaron is watching usage: one session, helpers only for clearly separate pieces.

## Done (unit 1), as a check
On `revamp`, merged to local `main`, not pushed:
1. A check script ends ALL PASS, desktop and phone sizes, covering: each sigil casts its spell; N1, N5, N6, N11, N12 as
   their done-lines in the spec say; each of gags 1-8 fires from its trigger and leaves its keepsake; keepsakes survive
   a reload; the sound control mutes everything and survives a reload; the whisper is silent far from the butter and
   audible near it.
2. Screenshots of the page at rest, mid-bolt, each egg and each gag, at desktop and phone size, with no console errors.
3. A before/after table from the same machine: time to first cat, bytes before first frame, frame time at rest, and
   the longest frame through the first bolt, Butterman and galaxy. Nothing worse than before; rest frame time better.
4. No file under `assets/audio/placeholder/` is referenced.
5. `docs/REVIEW.md` lists everything Claude invented (styles chosen per keepsake, sigil shapes, sounds and their
   sources, timings) for Aaron's veto, and what to try first.

## Waiting on Aaron (none of it blocks unit 1)
- The 360 video; social links; his brother's GitHub name; the bread image's source; a yes to push.
- Five old working copies (`~/sigil-cat-build`, `-clipfix`, `-poses`, `-poses2`, `-splatfix`) hold scratch git cannot
  restore. Leave them unless he says delete.

## Where this came from
The planning session is `9666fa7c` ("Fable revamp" in command-hq); the build history is session `4f2b456b` ("Goofy
widget website GitHub setup"). Both can be read with the read-sessions skill if a decision here is unclear.
