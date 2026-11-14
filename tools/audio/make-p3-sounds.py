#!/usr/bin/env python3
"""Playtest-3 sounds (fx lane, 2026-11-13): four clips Aaron supplied from his downloads, cut and levelled like the rest.

  python3 tools/audio/make-p3-sounds.py [<folder with the four mp3s>]   (default ../inputs/audio next to the worktree)

Aaron's words, and what each becomes (assets/audio/designed/):
  point-in-space.mp3 ("freesound_community-point-in-space": "the sound for achievements") -> achieve-space.wav
      0.06-1.70 s (silent before 0.06 s, gone by 1.70 s), its slow swell kept, stereo kept (it is wide: the two sides
      are anti-correlated, a mono fold would hollow it), 5 ms in / 0.35 s out.
  ding-small-bell.mp3 ("ding-small-bell-sfx": clicking a sticker, tapping the Platinum Cat award) -> bell.wav
      0.036-1.10 s (the strike lands at 0.039 s), mono (the file is dual mono), 2 ms in / 0.30 s out.
  wind-magic.mp3 ("yodguard-wind-magic", e1113-09: "a successful sigil cast") -> cast-wind.wav
      0.00-1.10 s of 8 s: the whoosh itself (crest 0.30 s); the rest is a flat -55 dBFS bed. Stereo kept, 10 ms in /
      0.45 s out: a short cast, about a second.
  energy-beam-shot.mp3 ("short-energy-beam-shot", e1113-10: the lightning bolt) -> bolt-beam.wav
      0.022-1.90 s (the shot lands at 0.025 s; its tail rings on to 2.9 s), mono (correlation .99), 2 ms in / 0.8 s out.
Every clip: 48 kHz, 24-bit PCM, one constant gain to the palette's -22 dBFS loudest-100-ms RMS, lowered if needed so
the 4x true peak stays at or under -4 dBFS. Inputs are hash-checked. Writes the four files, their rows in
assets/audio/design-manifest.json (provenance) and docs/sound-levels.json. Origin and licence of the four downloads are
not recorded: ledgered licenceCleared false, like the bread's riser; confirm before publishing."""
import hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import ROOT, measure

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '../inputs/audio'
CLIPS = [
    # out name, input, sha256, cut, channels, fade in, fade out, role, Aaron's name for it
    ('achieve-space', 'point-in-space.mp3', '6f69d23df2efc854671353d222dd20aa5eefd237f9ce8d23d4b8584464471269',
     (0.06, 1.70), 2, 0.005, 0.35, 'Every achievement reveal (and Platinum Cat)', 'freesound_community-point-in-space'),
    ('bell', 'ding-small-bell.mp3', '23042c7105076609d570970a379c420cb987d739e85345d69e5acfaea0868dc0',
     (0.036, 1.10), 1, 0.002, 0.30, 'Tapping a sticker; tapping the Platinum Cat badge', 'ding-small-bell-sfx'),
    ('cast-wind', 'wind-magic.mp3', '89942d6189ebbb95e4d67517b09121723bc9e4e89e950b4283cd6ada571fda3a',
     (0.00, 1.10), 2, 0.010, 0.45, 'Every successful sigil cast (e1113-09)', 'yodguard-wind-magic'),
    ('bolt-beam', 'energy-beam-shot.mp3', '9112dafdc637026a4696fa82265bac57b8769a8201a89b100442d693304bd1ba',
     (0.022, 1.90), 1, 0.002, 0.80, 'The lightning bolt striking (e1113-10)', 'short-energy-beam-shot'),
]

if __name__ == '__main__':
    manifest_path = ROOT / 'assets/audio/design-manifest.json'; manifest = json.loads(manifest_path.read_text())
    levels_path = ROOT / 'docs/sound-levels.json'; levels = json.loads(levels_path.read_text())
    for name, file, sha, (a, b), ch, fin, fout, role, aaron in CLIPS:
        src = SRC / file
        got = hashlib.sha256(src.read_bytes()).hexdigest()
        if got != sha: sys.exit(f'unexpected {file}: {got}')
        out = f'assets/audio/designed/{name}.wav'
        with tempfile.TemporaryDirectory() as tmp:
            raw = os.path.join(tmp, 'raw.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-ss', str(a), '-to', str(b), '-af',
                            f'afade=t=in:d={fin},afade=t=out:st={b - a - fout:.3f}:d={fout}', '-ac', str(ch), '-ar', '48000',
                            '-c:a', 'pcm_f32le', raw], check=True)
            r = measure(raw); gain = -22 - r['activeRmsDbfs']
            if r['truePeakDbfs'] + gain > -4: gain = -4 - r['truePeakDbfs']
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=%.6fdB' % gain, '-c:a', 'pcm_s24le',
                            '-ar', '48000', '-ac', str(ch), str(ROOT / out)], check=True)
        row = measure(ROOT / out)
        manifest['provenance'][out] = {
            'source': f'{file} ("{aaron}", supplied by Aaron from his downloads, playtest-3)',
            'suppliedBy': 'Aaron', 'author': "unknown (clip from Aaron's downloads)", 'licenceCleared': False,
            'license': "Supplied by Aaron for this use (playtest-3); the clip's origin and licence are not recorded",
            'inputSha256': sha, 'processing': 'tools/audio/make-p3-sounds.py',
            'steps': f'cut {a:.3f}-{b:.3f} s, {"stereo" if ch == 2 else "mono"} 48 kHz, {fin * 1000:.0f} ms fade in / {fout:.2f} s fade out, '
                     f'one constant gain {gain:+.6f} dB (-22 dBFS loudest-100-ms RMS, true peak at or under -4 dBFS)',
            'role': role}
        levels[out] = row
        print(f'{out}: gain {gain:+.3f} dB, {json.dumps(row)}')
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    levels_path.write_text(json.dumps(levels, indent=2) + '\n')
