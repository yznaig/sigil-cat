# Audio sources and licences — unit 10

Machine-readable ledger: `design-manifest.json` → `provenance` (every shipped audio file, the reel and embedded video audio).
New assets are original synthesis or CC0; Aaron's existing performances remain his supplied original work.
No unclear third-party licence is introduced. CC0 means https://creativecommons.org/publicdomain/zero/1.0/ .

## Current palette

Every file below is 48 kHz / 24-bit PCM, mono except the retained stereo choir. `tools/audio/build-sounds.py` regenerates it deterministically; recipe, seed and filters are
in that script. No sample pack is used. The three cat sources were checked on their individual Freesound pages on 2026-11-10;
all state Creative Commons 0. Their inputs are the already-committed trimmed clips, preserved in git at `27f3543caf49ee21e5005f957a8cc89b5b14a4d4`.
Original synthesis is our own work, with no third-party recording. No licence claim is made on anyone else's behalf.
Decision e1111-05 retains eight historical CC0 effects as **original, kept by Aaron**. Those eight bypass the synthesis/mastering filters:
only one constant gain is applied to the exact pre-redesign clip. The original timeline, existing fades and channels are preserved.
Their exact baseline file, SHA-256 and gain are recorded in `design-manifest.json`.

| File under assets/audio | Exact source | Licence / author | Processing or role |
| --- | --- | --- | --- |
| `designed/tap-boing.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A rubber-band twong with a little wooden belly; active RMS -22 dBFS |
| `designed/tap-squeak.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Two felt-mouse squeaks, rounded and brief; active RMS -22 dBFS |
| `designed/tap-bonk.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A hollow maple bonk, with a tiny loose bead; active RMS -22 dBFS |
| `designed/tap-mrrp.wav` | https://freesound.org/people/MBPL/sounds/668825/ | CC0-1.0; MBPL | Keep the real cat: close, warm, gently filtered trill; active RMS -22 dBFS |
| `designed/tap-pop.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A little suction pop with a soft falling body; active RMS -22 dBFS |
| `designed/tap-blat.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | An embarrassed miniature bassoon flutter; active RMS -22 dBFS |
| `designed/tap-rare.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A tiny ceremonial gong followed by one ridiculous bubble; active RMS -22 dBFS |
| `designed/cast.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Three climbing glass-and-tine notes: C, G, high C; active RMS -22 dBFS |
| `designed/fizzle.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper sputter that folds into a question-mark chirrup; active RMS -22 dBFS |
| `designed/thunder.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A small theatrical storm: soft crack, rolling wooden low end; active RMS -22 dBFS |
| `designed/whoosh.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Felt brushing the air, a rising then falling breath; active RMS -22 dBFS |
| `designed/ding.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A small brass kitchen bell, one rounded strike; active RMS -22 dBFS |
| `designed/airhorn.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Two toy-brass honks: knowingly silly, never an alarm; active RMS -22 dBFS |
| `designed/hit.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Dry two-part mechanical tick with a glass fleck; active RMS -22 dBFS |
| `designed/slap.wav` | https://freesound.org/people/adviseme333/sounds/679391/ | CC0-1.0; adviseme333 | original, kept by Aaron — Wet towel; constant gain only (e1111-05); constant gain -10.758613 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/purr.wav` | https://freesound.org/people/aunrea/sounds/485373/ | CC0-1.0; aunrea | Keep the real breath and flutter; remove rumble and sharp room hiss; active RMS -25 dBFS |
| `designed/bite.wav` | https://freesound.org/people/qubodup/sounds/816237/ | CC0-1.0; qubodup | original, kept by Aaron — Toast crunch; constant gain only (e1111-05); constant gain -4.281942 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/hiss.wav` | https://freesound.org/people/aunrea/sounds/485952/ | CC0-1.0; aunrea | Keep the real cat warning, soften its high edge; active RMS -22 dBFS |
| `designed/glass-slide.wav` | https://freesound.org/people/jedg/sounds/505965/ | CC0-1.0; jedg | original, kept by Aaron — Glass scraping table; constant gain only (e1111-05); constant gain -7.822817 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/glass-smash.wav` | https://freesound.org/people/AlterKartoffelsack/sounds/465946/ | CC0-1.0; AlterKartoffelsack | original, kept by Aaron — Glass-breaking recording; constant gain only (e1111-05); constant gain -7.316090 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/drip.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A round water droplet and a small answering ripple; active RMS -22 dBFS |
| `designed/box-thud.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Cardboard cavity thump and a papery flap; active RMS -22 dBFS |
| `designed/choir.wav` | https://freesound.org/people/bone666138/sounds/274121/ | CC0-1.0; bone666138 | original, kept by Aaron — Human aah triad; constant gain only (e1111-05); constant gain -12.445936 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/rattle.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Three irregular plastic beads skittering inside googly eyes; active RMS -22 dBFS |
| `designed/pluck.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Precisely tuned C4 tine and a warm wooden soundboard; active RMS -22 dBFS |
| `designed/paper.wav` | https://freesound.org/people/BenjaminNelan/sounds/353125/ | CC0-1.0; BenjaminNelan | original, kept by Aaron — Paper rustle; constant gain only (e1111-05); constant gain -2.074960 dB; measured RMS -26.568 dBFS (approved target -26.568 dBFS); original kept by Aaron, e1111-05; transient sound, gain-only would clip |
| `designed/splat.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A broad soft butter splop and three sticky droplets; active RMS -22 dBFS |
| `designed/sponge-wipe.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Damp cellulose swish and quiet low water bubbles; active RMS -22 dBFS |
| `designed/twinkle.wav` | https://freesound.org/people/steffcaffrey/sounds/452379/ | CC0-1.0; steffcaffrey | original, kept by Aaron — Small bell; constant gain only (e1111-05); constant gain -13.100493 dB; measured RMS -22.000 dBFS (approved target -22 dBFS) |
| `designed/click.wav` | https://freesound.org/people/tbrook/sounds/348224/ | CC0-1.0; tbrook | original, kept by Aaron — Light switch; constant gain only (e1111-05); constant gain -2.079141 dB; measured RMS -30.841 dBFS (approved target -30.841 dBFS); original kept by Aaron, e1111-05; transient sound, gain-only would clip |
| `designed/paradox-hum.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | A warm wonky motor with a slow felt flutter; active RMS -25 dBFS |
| `designed/galaxy-hum.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Breathing low fifths with distant glass dust; active RMS -25 dBFS |
| `impacts/impact-wood-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-wood-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-wood-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-wood-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-wood-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-wood-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Wood body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-metal-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-metal-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-metal-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-metal-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-metal-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-metal-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Metal body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-paper-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-paper-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-paper-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-paper-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-paper-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-paper-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Paper body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-butter-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-butter-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-butter-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-butter-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-butter-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-butter-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Butter body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-glass-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-glass-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-glass-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-glass-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-glass-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-glass-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Glass body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-tin-small-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-tin-small-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-tin-small-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -24 dBFS |
| `impacts/impact-tin-medium-01.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-tin-medium-02.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -22 dBFS |
| `impacts/impact-tin-medium-03.wav` | tools/audio/build-sounds.py | Original synthesis — ours; Sigil Cat | Tin body/contact modes, independent excitation and decay; active RMS -22 dBFS |

## Comparison ambience and assembled reel

`reference/paradox-hum.wav` and `reference/galaxy-hum.wav`: original synthesis, ours; `tools/audio/build-sounds.py`, approximating the previous source oscillator recipes. No captured audio or external source.

`../../docs/sound-reel.mp3`: assembled by `tools/audio/build-review.py`, all 68 current files above in order, 550 ms silence between; original synthesis + CC0 recordings, stereo libmp3lame quality 2. The retained choir stays stereo; mono cues are copied unchanged to both channels.

## Aaron’s retained recordings

| Files | Supplied original | Permission / use |
| --- | --- | --- |
| `butterman/theme-song-1.m4a`, `butterman/theme-song-1.mp3` | `Buttaman_1.m4a` | Aaron’s own recording, supplied for publication; B sigil, butter scene, 74.17 bpm |
| `butterman/theme-song-3.m4a`, `butterman/theme-song-3.mp3` | `butterman-scene2-new.m4a` | Aaron’s own recording, supplied for publication; B sigil, looping chant scene, 66.39 bpm |
| `butterman/theme-song-2.m4a`, `butterman/theme-song-2.mp3` | `Buttaman_2.m4a` | Aaron’s own recording, supplied for publication; Whisker puzzle or ticket, encore, 82.04 bpm |
| `butterman/rise-yell.m4a`, `butterman/rise-yell.mp3` | `Buttaman_3.m4a` | Aaron’s own recording, supplied for publication; B sigil, rise scene, 80 bpm |
| `butterman/whisper.m4a`, `butterman/whisper.mp3` | `Buttaman_quiet.m4a` | Aaron’s own recording, supplied for publication; Approaching butter, one whispered line per approach |

The recordings are already in the baseline git object; `tools/audio/prepare-butterman-audio.py` documents their original preparation.
The unit-10 script starts from that immutable baseline and applies constant gain only, preserving timeline and full clip durations.
`butterman/analysis.json` and the older sections of `docs/audio.md` describe the pre-unit-10 measurements, not the delivered levels.
For current peaks use `docs/sound-levels.json`; for exact attenuation use `design-manifest.json` → `correctionsDb`.

`noscope-riser.mp3`: Aaron's original `noscope-riser.wav`, supplied for publication. Full six seconds and stereo retained; constant gain only.
`../video/noscope.mp4` audio: Aaron's `noscope-video.mov`, supplied as his own work; see `../video/SOURCES.md`. Only its audio is attenuated
and re-encoded to AAC 160k; video stream copied without recompression. The legacy note below describes the earlier encode.

## Legacy A/B sources (not loaded by the page)

The following historical ledger is retained verbatim for traceability. These files are now comparison/source material in `sfx/`.
Where reconstructed peaks exceeded −2 dBFS they received constant safety attenuation and a new MP3 encode from the baseline git object.
The riser and Butterman clips have a −4 dBFS target. No trims or time changes. Historical peak/size statements below refer to the old files.

# Sigil Cat sound effects: sources and licences
> Except for our synthesized `sponge-wipe.mp3`, every file in `sfx/` is cut from a Freesound.org sound whose own page states "Creative Commons 0" (CC0, public domain dedication), checked 2026-11-09.
> Processing for all files: Freesound HQ preview mp3 as source, leading silence trimmed to the onset, 5 ms fade-in, short fade-out, peak normalised to about -2 dBFS, 44.1 kHz, libmp3lame -q:a 4. Mono unless noted. "From" is the offset into the source before the onset trim.

| file | what it is | source page URL | author / uploader | licence as stated on the page | what was done |
|---|---|---|---|---|---|
| tap-boing.mp3 | jaw harp twang ("8.wav") | https://freesound.org/people/stomachache/sounds/29813/ | stomachache | Creative Commons 0 | from 0 s, 0.65 s kept, mono, levelled |
| tap-squeak.mp3 | dog squeaky toy, one squeak ("Squeaky Toy #1") | https://freesound.org/people/Breviceps/sounds/468443/ | Breviceps | Creative Commons 0 | from 0 s, 0.45 s kept, mono, levelled (+19 dB, source was quiet) |
| tap-bonk.mp3 | knock on hollow wood ("Hit Wood Hollow") | https://freesound.org/people/alegemaate/sounds/364704/ | alegemaate | Creative Commons 0 | from 0 s, whole 0.26 s file, mono, levelled |
| tap-mrrp.mp3 | short soft cat trill ("Cat trill 4") | https://freesound.org/people/MBPL/sounds/668825/ | MBPL | Creative Commons 0 | from 0 s, 0.74 s kept, mono, levelled |
| tap-pop.mp3 | cork-style pop (finger pulled from a hairbrush, "Popping Cork") | https://freesound.org/people/milcahrawr/sounds/622150/ | milcahrawr | Creative Commons 0 | from 0 s (0.1 s of silence trimmed), 0.28 s kept, mono, levelled |
| tap-blat.mp3 | cartoon raspberry / toot ("Raspberry.aif") | https://freesound.org/people/oldedgar/sounds/97979/ | oldedgar | Creative Commons 0 | from 0 s, 0.45 s kept, mono, levelled |
| tap-rare.mp3 | small gong, soft mallet hit ("Small Gong_Soft Hit_RAW") | https://freesound.org/people/cabled_mess/sounds/369428/ | cabled_mess | Creative Commons 0 | from 0 s, 1.8 s kept with 0.6 s fade-out, mono, levelled |
| cast.mp3 | magic wand glissando with glitter ("Magic Wand Glitter") | https://freesound.org/people/qubodup/sounds/211624/ | qubodup | Creative Commons 0 (page says "CC0 since 2026-06-06"; it is a mix of two other CC0 sounds, by urupin and vrodge) | from 0 s, 1.25 s kept with 0.4 s fade-out, mono, levelled |
| fizzle.mp3 | lit match dropped in water, hiss dying ("Match Sizzle 02") | https://freesound.org/people/squareal/sounds/237407/ | squareal | Creative Commons 0 | from 0 s, 0.7 s kept, mono, levelled |
| thunder.mp3 | close thunder strike with rumble ("Closeup Thunder Strike 01") | https://freesound.org/people/loganzsound/sounds/840628/ | loganzsound | Creative Commons 0 | from 0.5 s (crack lands about 20 ms in), 5.2 s kept with 1.8 s fade-out, STEREO, levelled |
| whoosh.mp3 | short mid-pitched whoosh ("whoosh_short_mid.wav") | https://freesound.org/people/DJT4NN3R/sounds/449996/ | DJT4NN3R | Creative Commons 0 | from 0 s (0.1 s of silence trimmed), 0.6 s kept, mono, levelled (+21 dB, source was quiet) |
| ding.mp3 | single desk-bell ring ("desk bell center.mp3") | https://freesound.org/people/tonmayster/sounds/685111/ | tonmayster | Creative Commons 0 | from 0 s (0.8 s of silence trimmed), 1.0 s kept with 0.4 s fade-out, mono, levelled |
| airhorn.mp3 | industrial air horn on an oil rig ("Industrial Air Horn") | https://freesound.org/people/mcpable/sounds/131930/ | mcpable | Creative Commons 0 | from 0 s (0.3 s of silence trimmed), 1.2 s kept with 0.12 s fade-out, mono, levelled |
| hit.mp3 | short tap on a metal surface ("Metal Tap"); stand-in hitmarker, not from any game | https://freesound.org/people/BenjaminNelan/sounds/410363/ | BenjaminNelan | Creative Commons 0 | from 0 s, 0.1 s kept (encoded file 0.13 s), mono, levelled |
| slap.mp3 | wet towel slapped on a leg ("wet thwack") | https://freesound.org/people/adviseme333/sounds/679391/ | adviseme333 | Creative Commons 0 | from 0 s (0.3 s of silence trimmed), 0.38 s kept, mono, levelled |
| purr.mp3 | male cat purring on a bed, shotgun mic ("Cat Purring") | https://freesound.org/people/aunrea/sounds/485373/ | aunrea | Creative Commons 0 | from 0.8 s, 7.0 s kept, 5 ms fade-in and 50 ms fade-out so it can be crossfade-looped, mono, levelled (+17.6 dB, source was quiet) |
| bite.mp3 | first bite of crispy toast ("Crunch") | https://freesound.org/people/qubodup/sounds/816237/ | qubodup | Creative Commons 0 | from 0 s, 0.36 s kept, mono, levelled |
| hiss.mp3 | male cat hissing ("Cat Hissing") | https://freesound.org/people/aunrea/sounds/485952/ | aunrea | Creative Commons 0 | from 0 s, 0.72 s kept, mono, levelled |
| glass-slide.mp3 | heavy glass sliding on a table ("Object Slide on table.wav", a 24 s file; the slide used is the one near 17.4 s) | https://freesound.org/people/jedg/sounds/505965/ | jedg | Creative Commons 0 | from 17.3 s, 1.55 s kept with 0.25 s fade-out, mono, levelled |
| glass-smash.mp3 | small glass breaking on the floor ("Glass Breaking") | https://freesound.org/people/AlterKartoffelsack/sounds/465946/ | AlterKartoffelsack | Creative Commons 0 | from 0.3 s (impact lands about 20 ms in), 1.5 s kept with 0.5 s fade-out, mono, levelled |
| drip.mp3 | one water plip, no reverb ("Drip 2 (dry) [plippy]") | https://freesound.org/people/magnuswaker/sounds/524216/ | magnuswaker | Creative Commons 0 | from 0 s, 0.5 s kept, mono, levelled |
| box-thud.mp3 | small cardboard box dropped on the floor ("Small cardboard box falling on mic"), first of two drops | https://freesound.org/people/cb9382/sounds/875202/ | cb9382 | Creative Commons 0 | from 0.3 s (thud at about 0.35 s in source), 0.55 s kept, mono, levelled |
| choir.mp3 | three-part "aah" triad sung and layered ("Choir of Voices - Single Chord") | https://freesound.org/people/bone666138/sounds/274121/ | bone666138 | Creative Commons 0 | from 0 s, 3.2 s kept with 0.9 s fade-out, STEREO, levelled |
| rattle.mp3 | plastic pillbox rattling with pills ("pillbox-rattle"), first rattle burst | https://freesound.org/people/otoinsa/sounds/761438/ | otoinsa | Creative Commons 0 | from 2.1 s, 0.5 s kept, mono, levelled |
| pluck.mp3 | kalimba, lowest tine ("Kalimba (C-note)"). Measured pitch: C4, about 264 Hz (roughly +16 cents above 261.6 Hz); uploader says C-major tuning | https://freesound.org/people/foochie_foochie/sounds/331047/ | foochie_foochie | Creative Commons 0 | from 0 s, 1.8 s kept with 0.7 s fade-out, mono, levelled |
| paper.mp3 | a sheet of paper rustling ("Paper Rustle") | https://freesound.org/people/BenjaminNelan/sounds/353125/ | BenjaminNelan | Creative Commons 0 | from 0 s (0.25 s of silence trimmed), 0.8 s kept, mono, levelled |
| splat.mp3 | washcloth dropped into water, wet splat ("Wet Splat 1.mp3") | https://freesound.org/people/nebulasnails/sounds/495118/ | nebulasnails | Creative Commons 0 | from 0 s (0.15 s of silence trimmed), 0.46 s kept, mono, levelled |
| twinkle.mp3 | small metal bell "ping" ("Small Bell #2") | https://freesound.org/people/steffcaffrey/sounds/452379/ | steffcaffrey | Creative Commons 0 | from 0 s, 1.0 s kept with 0.4 s fade-out, mono, levelled |
| click.mp3 | light switch click ("Switch Light 06.wav") | https://freesound.org/people/tbrook/sounds/348224/ | tbrook | Creative Commons 0 | from 0 s, 0.1 s kept (encoded file 0.13 s), mono, levelled |

| sponge-wipe.mp3 | soft damp sponge, filtered noise and descending water pulses | tools/audio/make-sponge.py (no external source) | Sigil Cat | original synthesis, ours | deterministic seed 811, 420 ms, low-pass noise with three 150–240 Hz pulses, sine envelope, peak 0.38, mono 44.1 kHz, libmp3lame quality 4 |

## Aaron's 360 riser (supplied 2026-11-10)

`noscope-riser.mp3`: made by Aaron, his own work supplied for us to publish. Source:
`noscope-riser.wav` (“original intro reverse reverb riser”), 6.0 s, stereo 44.1 kHz.
Encoded with `ffmpeg -i noscope-riser.wav -c:a libmp3lame -q:a 2 noscope-riser.mp3`.
125,064 bytes. Full duration and stereo kept; no normalization, dynamics compression, gain adjustment,
trimming, or added fade. The source's dynamics are preserved. Original WAV is outside the worktree
and is not committed. The montage's own sound is retained in `assets/video/noscope.mp4` (see its
SOURCES.md); the riser is separate and overlaps the montage's first second.

## Cake-chain party toot (2026-11-11)

| File under assets/audio | Exact source | Licence / author | Processing or role |
| --- | --- | --- | --- |
| `designed/party-toot.wav` | tools/audio/make-party-toot.py | Original synthesis — ours; Sigil Cat | Cake-party paper-reed blower; active RMS -22 dBFS |

`designed/party-toot.wav` is original synthesized audio, made for this project by
`tools/audio/make-party-toot.py`: a seeded breath-noise/reed voice with falling
pressure and a brief paper flutter. No recordings or third-party samples.
Mono 48 kHz, 24-bit PCM, 1.25 seconds, 180,044 bytes; peak −16.89 dBFS,
maximum 100 ms RMS −22.00 dBFS. Uses the unit-10 palette's documented format,
level target and ordinary `audio.load` / `audio.play` master-bus API documented in
`docs/sound-direction.md`.
Playback gain .8, persistent page mute/volume respected. Rebuild from the repository
root with `python3 tools/audio/make-party-toot.py`. Headless signal checks do not
replace Aaron's listening/taste approval.

## Bird / controller (e1111-11)

`designed/bird-flap.wav` and `designed/controller-pop.wav` are original synthesis from
`tools/audio/make-bird.py`. No recordings or sample packs. Seeded noise and descending oscillators; mono 48 kHz /
24-bit PCM. Decoded max 100 ms RMS: -22.000 and -22.001 dBFS; true peaks <= -10.381 dBFS. Runtime gains .55 and
.85 (death uses the pop at .55). Shared page mute, volume and protection. (The trailer slam, `bird-slam.wav`, was
removed in playtest-2: the bird lane's `bird-boom.wav` replaced it.) Human listening
approval remains Aaron's; signal checks establish levels, not taste.
Rebuild: `python3 tools/audio/make-bird.py`. Exact measurements/hashes are in
`docs/sound-levels.json`; the ledger generator preserves these two credits.

## Achievement chime (2026-11-11)

| File under assets/audio | Exact source | Licence / author | Processing or role |
| --- | --- | --- | --- |
| `designed/achieve.wav` | tools/audio/make-achieve-chime.py | Original synthesis — ours; Sigil Cat | Achievement toast chime: two soft glass-and-tine notes, G5 then D6; active RMS -22 dBFS |

`designed/achieve.wav` is original synthesized audio, made for this project by
`tools/audio/make-achieve-chime.py`: two tine notes a fifth apart (the `cast` cue's glass-and-tine family),
each a pure fundamental with a faint inharmonic overtone and a short glass shimmer, over a breath of felt
noise on the first strike. No recordings or third-party samples. Mono 48 kHz, 24-bit PCM, 1.7 seconds;
peak −14.59 dBFS, maximum 100 ms RMS −22.00 dBFS (the unit-10 palette's target). Played at gain .5 through
the page's master bus (mute and volume respected) when an achievement toast slides in (`src/ui/achievements.js`).
Rebuild from the repository root with `python3 tools/audio/make-achieve-chime.py`. Headless signal checks do not
replace Aaron's listening/taste approval.

## Furniture arrivals (e1111-37, 2026-11-11)

Three YouTube downloads supplied by Aaron for the shelf and pinboard arrivals (`src/world/arrival.js`). The originals
stay outside the repository; `tools/audio/prepare-arrivals.py <folder>` rebuilds these files from them with trims and
one constant gain each (no EQ, dynamics, pitch or time change). Measurements and hashes: `docs/sound-levels.json`;
ledger: `design-manifest.json` → `provenance`.

| Files under assets/audio | Supplied original | Author / licence | Processing and use |
| --- | --- | --- | --- |
| `arrivals/concrete-scrape-loop.wav` | `concrete-scrape-loop.mp3` (4.65 s), YouTube download supplied by Aaron | Uploader unknown. **Cleared for use by Aaron (e1111-56)** | mp3 padding trimmed (0.069–4.612 s), 3 ms edge fades, mono 48 kHz / 24-bit, −10.773 dB to −22 dBFS loudest-100-ms RMS. Loops seamlessly (crossfaded copies) under the first slide, fading in over 15 s |
| `arrivals/ff7r-victory-fanfare.m4a`, `.mp3` | `ff7r-victory-fanfare.mp3` (5.88 s), YouTube download supplied by Aaron | Final Fantasy VII Remake victory fanfare (Square Enix). **Cleared for use by Aaron (e1111-56)** | 0.64 s leading silence trimmed so it hits on the landing (0.64–4.80 s), stereo, −8.821 dB to −12 dBFS RMS (Butterman's songs' level). Plays as the first furniture lands |
| `arrivals/rpg-victory-fanfare-2.m4a`, `.mp3` | `fanfare-spellsword.m4a` (39.59 s), YouTube download supplied by Aaron | "RPG Victory Fanfare 2" by Lux Aeterna Audio, https://www.youtube.com/@LuxAeterna22878 . **Credit required** (the author's request: name the piece and link the channel); credited in the grimoire's acknowledgements | Whole file, untrimmed, stereo, −7.815 dB to −12 dBFS RMS. Starts with the second slide; its climactic bong is at 32.127 s (mp3) / 32.160 s (m4a) by spectral-flux onset, and the slide lasts 32.14 s |

The sources' own peaks reached +0.29 dBFS (clipped); the delivered files peak at −7.3 dBFS or lower. Headless
measurements only, not a listening approval. Licences: the scrape and the FF7R fanfare are cleared for use by Aaron (e1111-56, "the
two sounds are cleared"); the Lux Aeterna fanfare is free with the credit above.

## Sound playtest lane (e1111-58, 2026-11-12)

| File under assets/audio | Exact source | Licence / author | Processing or role |
| --- | --- | --- | --- |
| `designed/star-tink.wav` | https://freesound.org/people/RutgerMuller/sounds/51038/ ("Glass Tapped By Fingernail.wav") | CC0-1.0; RutgerMuller | One fingernail tap on a drinking glass; tapping the star sticker |

The Freesound page states Creative Commons 0 (checked 2026-11-11). The original download needs a login, so the
input is Freesound's public HQ preview of that sound, `https://cdn.freesound.org/previews/51/51038_179538-hq.mp3`
(SHA-256 `992b79c386d89d4ed586bf7070d2cca0d66a67c965b92adc6b56204133ae3ca0`; the tool refuses any other bytes).
The recording is 34 fingernail taps on one glass (Edirol R-1, Sennheiser ME66); `tools/audio/make-star-tink.py`
cuts out the tap at 4.465 s, the one with the longest clear gap after it: 4 ms lead with a 2 ms fade-in, 0.42 s,
a 2nd-order 250 Hz high-pass for handling rumble (the glass rings at about 1.03, 3.1, 3.5 and 4.7 kHz), a 0.22 s
cosine fade-out and one constant gain (+2.926 dB). Mono 48 kHz / 24-bit PCM. Like the kept paper/click originals it
is a sparse transient that meets the −4 dBFS (4× true) peak ceiling before the −22 dBFS RMS target: measured 100 ms
RMS −26.876 dBFS, true peak −4.047 dBFS. Played at gain 1 with ±4% rate per tap. Rebuild:
`python3 tools/audio/make-star-tink.py` (downloads the preview) or pass the preview's path.

No other audio file was added or changed. Butterman's radio, the per-stroke purr and the 360 riser cap are runtime
processing of the existing files (see `docs/sound-direction.md`); the 36 impact files stay in the repository but the
page no longer fetches or plays them (`SITE.sounds.collisions: false`).

## Kitchen lane (e1111-61, 2026-11-12)

| File under assets/audio | Supplied original | Author / licence | Processing and use |
| --- | --- | --- | --- |
| `designed/chest-open.wav` | `minecraft-chest.mp3` (6.32 s, "Minecraft Chest Opening/Closing Sound Effect Part 1"), YouTube download supplied by Aaron; first half | Minecraft (Mojang); uploader unknown. **Cleared for use by Aaron's choice (e1111-61)** | 0.62–1.28 s, mono 48 kHz / 24-bit, 5 ms / 20 ms fades, one constant gain +5.120 dB to −22 dBFS loudest-100-ms RMS (peak −11.6 dBFS). Opening the baking box |
| `designed/chest-close.wav` | the same file; second half | as above | 5.08–5.72 s (the creak and thud; the isolated click at 4.46 s is left out), same processing, +3.908 dB (peak −11.3 dBFS). Closing the baking box |

Input SHA-256 `891c4d0de90acecb271cd6028f1712d39fd569352c42ff98cc4eeee454079b51`; rebuild with
`python3 tools/audio/make-chest.py <path to minecraft-chest.mp3>` (it refuses other bytes). The input file itself is not
committed. Headless measurements only, not a listening approval.

## The bread's riser and pop (sky lane, playtest-2)

`designed/bread-riser.mp3` and `designed/bread-pop.wav` are cut by `tools/audio/make-bread-sounds.py` (hash-checked
inputs) from two clips Aaron supplied from his downloads, `riser-sound-effect.mp3` and `pop-sound-effect.mp3`, for the
bread's blast-off. Their origin and licence are not recorded (ledgered `licenceCleared: false`); confirm before publishing.

## Playtest 3's four clips (fx lane, 2026-11-13)

Four clips Aaron supplied from his downloads, cut and levelled by `tools/audio/make-p3-sounds.py` (hash-checked inputs;
48 kHz / 24-bit PCM, one constant gain to the palette's -22 dBFS loudest-100-ms RMS, true peak at or under -4 dBFS).
Their origin and licence are not recorded (ledgered `licenceCleared: false`, like the bread's riser); confirm before publishing.

| File under assets/audio | From Aaron's downloads | Cut | Role |
| --- | --- | --- | --- |
| `designed/achieve-space.wav` | point-in-space.mp3 ("freesound_community-point-in-space") | 0.06-1.70 s, stereo | Every achievement reveal (replaces `designed/achieve.wav`, kept unplayed) |
| `designed/bell.wav` | ding-small-bell.mp3 ("ding-small-bell-sfx") | 0.036-1.10 s, mono | Tapping a sticker (replaces the glass tink, kept unplayed); tapping the Platinum Cat badge |
| `designed/cast-wind.wav` | wind-magic.mp3 ("yodguard-wind-magic", e1113-09) | 0.00-1.10 s of 8 s, stereo | Every successful sigil cast (replaces `designed/cast.wav` at the cast) |
| `designed/bolt-beam.wav` | energy-beam-shot.mp3 ("short-energy-beam-shot", e1113-10) | 0.022-1.90 s, mono | The lightning bolt strike (the thunder stays for the cloud's grumble) |
