#!/usr/bin/env python3
"""Build the source ledger, brief, timed MP3 reel and its browser playlist."""
import json
import re
import subprocess
from pathlib import Path
import numpy as np
from catalogue import BASELINE, CUES, MATERIALS, CAT_SOURCES, KEPT_ORIGINALS, PEAK_LIMITED_ORIGINALS, PEAK_LIMIT_REASON
from measure import ROOT, decode, measure

def main():
    manifest_path = ROOT/'assets/audio/design-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    levels = json.loads((ROOT/'docs/sound-levels.json').read_text())
    baseline = json.loads((ROOT/'docs/sound-baseline.json').read_text())
    rows = manifest['sounds']
    original_sources = subprocess.check_output(['git', 'show', f'{BASELINE}:assets/audio/SOURCES.md'], cwd=ROOT, text=True)
    provenance = {}
    for line in original_sources.splitlines():
        cols = [v.strip() for v in line.split('|')]
        if len(cols) >= 7 and cols[1].endswith('.mp3') and (ROOT/'assets/audio/sfx'/cols[1]).is_file():   # (sfx/rocket.mp3 removed with its cue, playtest-2)
            name = cols[1]
            provenance['assets/audio/sfx/'+name] = {
                'source': cols[3].split(' (')[0], 'author': cols[4],
                'license': 'CC0-1.0' if 'Creative Commons 0' in cols[5] else 'Original synthesis — ours',
                'role': 'Legacy comparison only', 'baseline': BASELINE}
    for row in rows:
        provenance[row['file']] = {k: row[k] for k in ['source', 'license', 'author', 'selection', 'decision',
            'originalCommit', 'originalFile', 'originalSha256', 'levelCorrectionDb', 'channels',
            'loudnessExemption', 'nominalTargetRmsDbfs', 'peakCeilingDbfs'] if k in row}
        provenance[row['file']]['role'] = row['trigger']
    provenance['assets/audio/designed/party-toot.wav'] = {
        'source': 'tools/audio/make-party-toot.py', 'license': 'Original synthesis — ours',
        'role': 'Cake-party paper-reed blower; active RMS -22 dBFS'}
    for name in ['bird-flap', 'controller-pop']:
        provenance[f'assets/audio/designed/{name}.wav'] = {
            'source': 'tools/audio/make-bird.py', 'license': 'Original synthesis — Sigil Cat',
            'author': 'Sigil Cat'}
    for name in ['paradox-hum', 'galaxy-hum']:
        provenance[f'assets/audio/reference/{name}.wav'] = {
            'source': 'tools/audio/build-sounds.py', 'license': 'Original synthesis — ours',
            'role': 'Approximation of old procedural ambience; comparison only, not a browser capture'}
    retained = [
        ('theme-song-1', 'Buttaman_1.m4a', 'B sigil, butter scene, 74.17 bpm'),
        ('theme-song-3', 'butterman-scene2-new.m4a', 'B sigil, looping chant scene, 66.39 bpm'),
        ('theme-song-2', 'Buttaman_2.m4a', 'Whisker puzzle or ticket, encore, 82.04 bpm'),
        ('rise-yell', 'Buttaman_3.m4a', 'B sigil, rise scene, 80 bpm'),
        ('whisper', 'Buttaman_quiet.m4a', 'Approaching butter, one whispered line per approach'),
    ]
    review_retained = []
    for name, source, trigger in retained:
        for ext in ['m4a', 'mp3']:
            provenance[f'assets/audio/butterman/{name}.{ext}'] = {
                'source': source, 'author': 'Aaron', 'license': 'Original recording — supplied by Aaron for publication',
                'role': trigger, 'baseline': BASELINE}
        review_retained.append({'name': name, 'file': f'assets/audio/butterman/{name}.mp3', 'trigger': trigger})
    for file, source, trigger in [
        ('assets/audio/noscope-riser.mp3', 'noscope-riser.wav', '360 no-scope: six-second lead-in, last second overlaps video'),
        ('assets/video/noscope.mp4', 'noscope-video.mov', '360 no-scope montage, its embedded soundtrack'),
    ]:
        provenance[file] = {'source': source, 'author': 'Aaron', 'license': 'Original work — supplied by Aaron for publication', 'role': trigger, 'baseline': BASELINE}
        review_retained.append({'name': Path(file).stem, 'file': file, 'trigger': trigger})

    # A single full-length cue per row, 550 ms of silence between cues, 200 ms lead-in.
    # Keep the retained choir's stereo image. Mono cues are copied unchanged to both channels.
    chunks, cursor = [np.zeros((9600, 2), dtype='<f4')], .2
    for row in rows:
        path = ROOT/row['file']
        channels = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
            '-show_entries', 'stream=channels', '-of', 'csv=p=0', str(path)]))
        x = decode(path, mono=False).reshape(-1, channels)
        if channels == 1: x = np.repeat(x, 2, axis=1)
        assert x.shape[1] == 2
        row['reelSeconds'] = round(cursor, 4)
        chunks += [x, np.zeros((26400, 2), dtype='<f4')]
        cursor += len(x)/48000 + .55
    reel = ROOT/'docs/sound-reel.mp3'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', '-',
                    '-c:a', 'libmp3lame', '-q:a', '2', '-map_metadata', '-1', str(reel)], input=np.concatenate(chunks).astype('<f4').tobytes(), check=True)
    levels['docs/sound-reel.mp3'] = measure(reel)
    provenance['docs/sound-reel.mp3'] = {'source': 'tools/audio/build-review.py', 'license': 'Original synthesis + CC0-1.0 recordings; see constituent files', 'role': f'All {len(rows)} current cues in manifest order with .55 s gaps; stereo retained'}
    manifest.update(provenance=provenance, retained=review_retained)
    manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
    (ROOT/'docs/sound-levels.json').write_text(json.dumps(levels, indent=2)+'\n')
    (ROOT/'docs/sound-reel.json').write_text(json.dumps({'seconds': round(cursor, 4), 'sounds': rows, 'retained': review_retained, 'levels': levels}, indent=2)+'\n')

    header = '''# Sound direction — unit 10

A cosy, slightly absurd cat shrine: close enough to touch, with treasured objects and very small ceremonies.
Wood, folded paper, warm brass, glass, soft butter and tin; rounded attacks, short natural tails, occasional rubbery jokes.
Quiet by default; cat and Butterman stay alive and human, while the 360 joke earns its brief theatrical interruption.

## First pass: inventory and headless audition audit

Baseline commit `BASELINE`. Before replacement, every existing audio asset and the video's soundtrack was decoded end to end;
the trigger call sites and old processing/source ledger were inspected. `sound-baseline.json` records all 43 files' durations,
sample peaks, 4× reconstructed peaks, and loudest 100 ms RMS. Six exceeded −1 dBFS: whisper AAC, riser, fizzle, glass smash,
slap and the montage. The worst was +0.126 dBFS in the montage. Shared peak normalization had not made short noises,
long rings and continuous beds equally loud.

This is a headless technical audition pass, **not a claim of human listening or approval**. No audio-hearing tool was available.
This paragraph records the original technical pass; Aaron's subsequent listening decision is recorded below.
Old/new are loudness matched for comparison. The two old ambience examples are labelled approximations of their source oscillators;
all other old effect examples use the original committed recordings, with safety attenuation where needed.

## Aaron’s listening decision — e1111-05, 2026-11-11

Aaron listened to the reel and kept the originals for bite (#17), slap (#15), glass-slide (#19), glass-smash (#20),
choir (#23), paper (#26), twinkle (#29) and click (#31). Each is labelled **original, kept by Aaron** in the reel.
All other redesigned cues remain in use and their delivered audio bytes are unchanged.
These eight come from the immutable pre-redesign MP3s in the baseline above, decoded to 48 kHz / 24-bit PCM and
scaled by one constant gain toward the palette's −22 dBFS loudest-100-ms RMS target with −4 dBFS peak headroom.
Six meet that RMS target; the approved paper/click exemptions below preserve the two quieter transients at the peak ceiling.
No new trim, fade, EQ, compression, pitch or timing change. The choir remains stereo; the other seven remain mono.
The regenerated MP3 reel is stereo so it also preserves the choir; mono cues are copied unchanged to both channels.

## Every existing voice and trigger

The 31 named effect slots plus two procedural ambience voices are below. `audio.tone()` is an unused public helper, not an additional
page trigger. The old MLG horn is superseded by Aaron's montage, but its named slot is supplied for compatibility. Butterman footsteps
are disabled and would use `click`; his unused metronome settings do not create another audible source.

| Cue | Trigger today | Before | Direction now |
| --- | --- | --- | --- |
'''.replace('BASELINE', BASELINE)
    by_name = {row['name']: row for row in rows}
    header += '\n'.join(f'| `{name}` | {trigger} | {old} | {by_name[name]["direction"]} |' for name, trigger, old, direction in CUES)
    header += '\n\n### Kept originals: sources and exact level correction\n\n| Current file | Original source / author (CC0) | Constant gain | Channels | Measured RMS | 4× peak |\n| --- | --- | --- | --- | --- | --- |\n'
    for row in rows:
        if row['name'] in KEPT_ORIGINALS:
            measured = levels[row['file']]
            header += f'| `{row["file"]}` | [{row["author"]}]({row["source"]}) | {row["levelCorrectionDb"]:+.6f} dB | {row["channels"]} | {measured["activeRmsDbfs"]:.3f} dBFS | {measured["truePeakDbfs"]:.3f} dBFS |\n'
    header += '\n### Approved peak-limited RMS exemptions\n\n'
    header += '| File | Measured / approved 100 ms RMS | Peak ceiling | Reason |\n| --- | --- | --- | --- |\n'
    for name, target in PEAK_LIMITED_ORIGINALS.items():
        header += f'| `assets/audio/designed/{name}.wav` | {target:.3f} dBFS | −4 dBFS | {PEAK_LIMIT_REASON} |\n'
    header += ('\nThe orchestrator approved these two named exceptions: preserve the original waveforms with no dynamics processing. '
               'The −22 ±0.7 dB RMS target remains for every other effect; existing −24 dB small-impact and −25 dB continuous-bed roles are unchanged. '
               '`checks/sounds-files.py` independently decodes both files, checks their measured RMS and peak ceiling, and names the reason in each result. '
               'The gain-only waveform checks remain mandatory for all eight originals.\n')
    header += '\n\n### Aaron’s performances (retained, level corrected only)\n\n| File | Trigger | Source |\n| --- | --- | --- |\n'
    for name, source, trigger in retained:
        header += f'| `butterman/{name}.m4a` + `.mp3` | {trigger} | Aaron’s `{source}` |\n'
    header += '''| `noscope-riser.mp3` | Full 360: first five seconds to black; last second into video | Aaron’s `noscope-riser.wav` |
| `../video/noscope.mp4` audio track | Full 360 montage | Aaron’s `noscope-video.mov` |

The video images, all gag timing, melody/puzzle, probabilities, footsteps setting and animation remain as before.
The montage picture stream is copied bit for bit. Butterman files keep their full duration and existing landmarks; only constant gain changes.
The cat trill/purr/hiss derive from the three verified CC0 pages in `assets/audio/SOURCES.md`, band-shaped and levelled, not imitated.

## Physics handoff: materials and sizes

Each pattern below means the three distinct files ending `01.wav`, `02.wav`, `03.wav` in `assets/audio/impacts/`.
Variants change excitation, contact noise and resonant pitch; the shuffle bag exhausts all three before repeating and avoids adjacent repeats.
Small means a trinket (roughly ≤0.25 cat-heights); medium means a hand-sized keepsake (>0.25). Strength controls contact energy separately.

| Material | Small file pattern / use | Medium file pattern / use |
| --- | --- | --- |
| Wood | `impact-wood-small-0{1,2,3}.wav` — top, little wooden accessory | `impact-wood-medium-0{1,2,3}.wav` — wooden base or rack contact |
| Metal | `impact-metal-small-0{1,2,3}.wav` — solid hardware | `impact-metal-medium-0{1,2,3}.wav` — rifle body, solid metal prop |
| Paper | `impact-paper-small-0{1,2,3}.wav` — ticket, card, plaster wrapper | `impact-paper-medium-0{1,2,3}.wav` — folded paper, cardboard box |
| Soft butter | `impact-butter-small-0{1,2,3}.wav` — pat edge, crumbs | `impact-butter-medium-0{1,2,3}.wav` — whole pat landing |
| Glass | `impact-glass-small-0{1,2,3}.wav` — shard contact | `impact-glass-medium-0{1,2,3}.wav` — intact glass foot/rim; breaking still uses `glass-smash` |
| Tin | `impact-tin-small-0{1,2,3}.wav` — lid | `impact-tin-medium-0{1,2,3}.wav` — plaster tin, hollow sheet-metal prop |

```js
await audio.loadImpacts('tin'); // when the adapter introduces the item, after the cat loading gate
// Actual contact callbacks only; pass the same stable item ID for all its colliders.
audio.impact(item, { material: 'tin', size: 'medium', strength: .6,
                     sleeping: item.body.isSleeping(), restoring: false });
// Any synchronous or asynchronous restore work may also be scoped:
await audio.silenceDuring(async () => { /* reconstruct saved objects, without contacts */ });
```

The adapter is ready for the world builder on the other branch. This branch does not invent new collision triggers or change physics.
One principal voice per item per 80 ms across *all* its materials and colliders; different items may sound together. Quiet contacts with
strength ≤0, sleeping/restoring bodies and muted contacts are rejected. Missing buffers start loading but the event is dropped, never
replayed later. Ordinary musical/cinematic cues can still overlap as authored.

## Level and format contract

Palette audio is 48 kHz / 24-bit PCM WAV: fast to decode, no added lossy transient smearing or encoder delay. All is mono except the retained stereo choir. Headroom is built into the files.
The loudest 100 ms RMS target is −22 dBFS for effects and medium impacts, −24 for small impacts, −25 for continuous purr/ambience.
This short-window measure handles a 100 ms tick without treating its quiet tail as loudness; it is **not LUFS**. New peaks are capped at
−4 dBFS before encoding. Existing per-trigger gains, slider and persisted mute still apply. The final shared, 4× oversampled soft knee
is linear below −5.2 dBFS and catches crowded sums. Montage and page route through the same protection; their existing mute buses remain.
Restoring the original transients exposed oversampling-filter overshoot in the existing 32-voice overload check:
−0.841 dBFS on an offline stereo render at 44.1 kHz. The soft-knee width is now 0.14 (previously 0.24),
measuring −1.539 dBFS at 44.1 kHz and −1.930 dBFS at 48 kHz for that same scheduled mix.
The response below 0.55 is unchanged; this is the existing shared overload guard, with no processing added to the files.
Paper's largest normal trigger gain is 0.5 and click's is 0.4, so both remain below the unchanged linear threshold.
The original live peak check and a new direct stereo-output check retain the −1 dBFS limit;
the measured parameter sweep is in `checks/diag/sound-originals-headroom.json`.
`sound-levels.json` measures the actual delivered codecs at 4× rate as well as sample peaks. Legacy A/B sources are attenuated when needed;
Aaron’s recordings and montage reserve about 4 dB of peak headroom. See `correctionsDb` in the manifest for each exact gain adjustment.

## Rebuild and listen

Requirements: Python 3, numpy, FFmpeg (libmp3lame/AAC), and the baseline git object. No downloads or external recordings are needed.

```sh
python3 tools/audio/build-sounds.py
python3 tools/audio/measure.py
python3 tools/audio/build-review.py
python3 checks/sounds-files.py
```

`sound-reel.html` provides named reference/current controls, triggers, source links, a sequential playlist, and timestamps into `sound-reel.mp3`.
The MP3 contains all 68 current cues (including the eight kept originals) in the table/variant order with 550 ms gaps, no normalization between clips. The retained performances
have their own review section; they are not duplicated in the effects MP3. Normal page loads never fetch legacy A/B assets or the reel.
To rebuild only Aaron's eight selections, use `python3 tools/audio/build-sounds.py --kept-only` before the measurement/review steps above.
For perceptual approval: try headphones and a small phone speaker, then rapid cat taps, three drops of each material, sponge rubbing,
the whisker tune and a quiet-to-montage transition. All choices requiring Aaron’s taste are listed for veto in `REVIEW.md`.
'''
    (ROOT/'docs/sound-direction.md').write_text(header)

    sources = '''# Audio sources and licences — unit 10

Machine-readable ledger: `design-manifest.json` → `provenance` (every shipped audio file, the reel and embedded video audio).
New assets are original synthesis or CC0; Aaron's existing performances remain his supplied original work.
No unclear third-party licence is introduced. CC0 means https://creativecommons.org/publicdomain/zero/1.0/ .

## Current palette

Every file below is 48 kHz / 24-bit PCM, mono except the retained stereo choir. `tools/audio/build-sounds.py` regenerates it deterministically; recipe, seed and filters are
in that script. No sample pack is used. The three cat sources were checked on their individual Freesound pages on 2026-11-10;
all state Creative Commons 0. Their inputs are the already-committed trimmed clips, preserved in git at `BASELINE`.
Original synthesis is our own work, with no third-party recording. No licence claim is made on anyone else's behalf.
Decision e1111-05 retains eight historical CC0 effects as **original, kept by Aaron**. Those eight bypass the synthesis/mastering filters:
only one constant gain is applied to the exact pre-redesign clip. The original timeline, existing fades and channels are preserved.
Their exact baseline file, SHA-256 and gain are recorded in `design-manifest.json`.

| File under assets/audio | Exact source | Licence / author | Processing or role |
| --- | --- | --- | --- |
'''.replace('BASELINE', BASELINE)
    for row in rows:
        author = row.get('author', CAT_SOURCES.get(row['name'], ('Sigil Cat',))[0])
        gain = f'; constant gain {row["levelCorrectionDb"]:+.6f} dB' if row['name'] in KEPT_ORIGINALS else ''
        rms = f'active RMS {row["targetRmsDbfs"]} dBFS'
        if row['name'] in KEPT_ORIGINALS:
            rms = f'measured RMS {levels[row["file"]]["activeRmsDbfs"]:.3f} dBFS (approved target {row["targetRmsDbfs"]} dBFS)'
            if row.get('loudnessExemption'): rms += f'; {row["loudnessExemption"]}'
        sources += f'| `{row["file"].removeprefix("assets/audio/")}` | {row["source"]} | {row["license"]}; {author} | {row["direction"]}{gain}; {rms} |\n'
    sources += '\n## Comparison ambience and assembled reel\n\n'
    sources += '`reference/paradox-hum.wav` and `reference/galaxy-hum.wav`: original synthesis, ours; `tools/audio/build-sounds.py`, approximating the previous source oscillator recipes. No captured audio or external source.\n\n'
    sources += '`../../docs/sound-reel.mp3`: assembled by `tools/audio/build-review.py`, all 68 current files above in order, 550 ms silence between; original synthesis + CC0 recordings, stereo libmp3lame quality 2. The retained choir stays stereo; mono cues are copied unchanged to both channels.\n\n'
    sources += '## Aaron’s retained recordings\n\n| Files | Supplied original | Permission / use |\n| --- | --- | --- |\n'
    for name, source, trigger in retained:
        sources += f'| `butterman/{name}.m4a`, `butterman/{name}.mp3` | `{source}` | Aaron’s own recording, supplied for publication; {trigger} |\n'
    sources += '''
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

'''
    sources += original_sources
    sources += '''
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
'''
    sources += '''
## Bird / controller (e1111-11)

`designed/bird-flap.wav` and `designed/controller-pop.wav` are original synthesis from
`tools/audio/make-bird.py`. No recordings or sample packs. Seeded noise and descending oscillators; mono 48 kHz /
24-bit PCM. Decoded max 100 ms RMS: -22.000 and -22.001 dBFS; true peaks <= -10.381 dBFS. Runtime gains .55 and
.85 (death uses the pop at .55). Shared page mute, volume and protection. (The trailer slam, `bird-slam.wav`, was
removed in playtest-2: the bird lane's `bird-boom.wav` replaced it.) Human listening
approval remains Aaron's; signal checks establish levels, not taste.
Rebuild: `python3 tools/audio/make-bird.py`. Exact measurements/hashes are in
`docs/sound-levels.json`; the ledger generator preserves these two credits.
'''
    (ROOT/'assets/audio/SOURCES.md').write_text(sources)
    print(f'Reel {cursor:.2f} s, {len(rows)} cues; {len(provenance)} provenance entries; docs and sources written')

if __name__ == '__main__':
    main()
