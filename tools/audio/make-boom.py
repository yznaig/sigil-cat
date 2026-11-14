#!/usr/bin/env python3
"""The trailer's boom (bird lane, playtest-2): "YOU JUST LOST THE GAME" lands each word on Aaron's cinematic boom.

Input: cinematic-boom-high.mp3 (4.91 s, "Cinematic-Boom-sound-effect-High", supplied by Aaron from his downloads).
Usage:  python3 tools/audio/make-boom.py <path to cinematic-boom-high.mp3>
Cut 0.13-1.73 s (the clip is silent before 0.14 s; its 4.7 s tail would smear five words 0.9 s apart into one roar),
downmixed to mono 48 kHz, 3 ms fade in, 0.75 s fade out, one constant gain to the palette's -22 dBFS loudest-100-ms
RMS (true peak kept at or under -4 dBFS), 24-bit PCM. Writes assets/audio/designed/bird-boom.wav and its rows in
assets/audio/design-manifest.json (provenance) and docs/sound-levels.json."""
import hashlib, json, os, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import ROOT, measure
SRC = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / '../inputs/audio/cinematic-boom-high.mp3')
SHA = '3e4dd0c10d053c9641bc3d035be666196594e05bc923150dde4ac830606af824'
A, B, FADE = 0.13, 1.73, 0.75
OUT = 'assets/audio/designed/bird-boom.wav'
if __name__ == '__main__':
    got = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
    if got != SHA: sys.exit(f'unexpected input {got}')
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'raw.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-ss', str(A), '-to', str(B), '-af',
                        f'afade=t=in:d=0.003,afade=t=out:st={B - A - FADE:.3f}:d={FADE}', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_f32le', raw], check=True)
        r = measure(raw); gain = -22 - r['activeRmsDbfs']
        if r['truePeakDbfs'] + gain > -4: gain = -4 - r['truePeakDbfs']
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=%.6fdB' % gain, '-c:a', 'pcm_s24le', '-ar', '48000', '-ac', '1', str(ROOT / OUT)], check=True)
    row = measure(ROOT / OUT)
    manifest_path = ROOT / 'assets/audio/design-manifest.json'; manifest = json.loads(manifest_path.read_text())
    manifest['provenance'][OUT] = {'source': 'cinematic-boom-high.mp3 ("Cinematic-Boom-sound-effect-High", supplied by Aaron from his downloads)',
        'author': 'unknown (download supplied by Aaron)', 'license': "Cleared for use by Aaron's choice (playtest-2, 2026-11-12)",
        'suppliedBy': 'Aaron', 'licenceCleared': True, 'inputSha256': SHA, 'processing': 'tools/audio/make-boom.py',
        'steps': f'cut {A:.2f}-{B:.2f} s, mono 48 kHz, 3 ms fade in / {FADE} s fade out, one constant gain {gain:+.6f} dB to -22 dBFS loudest-100-ms RMS',
        'role': 'Each word of the YOU JUST LOST THE GAME trailer'}
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    levels_path = ROOT / 'docs/sound-levels.json'; levels = json.loads(levels_path.read_text()); levels[OUT] = row
    levels_path.write_text(json.dumps(levels, indent=2) + '\n')
    print(f'{OUT}: gain {gain:+.3f} dB, {json.dumps(row)}')
