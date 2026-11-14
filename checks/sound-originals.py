#!/usr/bin/env python3
"""e1111-05: the selected historical waveforms, with one constant gain only."""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools/audio'))
from measure import ROOT, decode

BASELINE = '27f3543caf49ee21e5005f957a8cc89b5b14a4d4'
BEFORE = 'fb6fc68'
EXPECTED = {
    'bite': ('qubodup', '816237'), 'slap': ('adviseme333', '679391'),
    'glass-slide': ('jedg', '505965'), 'glass-smash': ('AlterKartoffelsack', '465946'),
    'choir': ('bone666138', '274121'), 'paper': ('BenjaminNelan', '353125'),
    'twinkle': ('steffcaffrey', '452379'), 'click': ('tbrook', '348224'),
}
rows = {r['name']: r for r in json.loads((ROOT / 'assets/audio/design-manifest.json').read_text())['sounds']}
page_files = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {SITE} from './src/config.js'; console.log(JSON.stringify(SITE.sounds.files))"], cwd=ROOT))
cache = ROOT / 'checks/out/audio-originals' / BASELINE
cache.mkdir(parents=True, exist_ok=True)
failures = []
def check(name, ok, detail=''):
    print(f'CHECK originals {name}: {detail} {"PASS" if ok else "FAIL"}', flush=True)
    if not ok: failures.append(name)

def channels(path):
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=channels', '-of', 'csv=p=0', str(path)]))

for name, (author, sound_id) in EXPECTED.items():
    old = cache / f'{name}.mp3'
    old.write_bytes(subprocess.check_output(['git', 'show', f'{BASELINE}:assets/audio/sfx/{name}.mp3'], cwd=ROOT))
    current = ROOT / rows[name]['file']
    a, b = decode(old, mono=False).astype(np.float64), decode(current, mono=False).astype(np.float64)
    same_shape = a.shape == b.shape and channels(old) == channels(current)
    gain = float(np.dot(a, b) / np.dot(a, a)) if same_shape else 0
    error = float(np.max(abs(b - a * gain))) if same_shape else float('inf')
    check(f'{name} preserves the original waveform, duration and channels', same_shape and gain > 0 and error < 2e-7,
          f'gain {20*np.log10(gain):.6f} dB; max residual {error:.2e}' if gain > 0 else 'different waveform shape')

selected = {n for n, r in rows.items() if r.get('selection') == 'original, kept by Aaron'}
check('exactly Aaron’s eight choices carry the decision, source and page mapping', selected == set(EXPECTED) and all(
    rows[n].get('decision') == 'e1111-05' and rows[n]['source'] == f'https://freesound.org/people/{a}/sounds/{i}/'
    and rows[n]['license'] == 'CC0-1.0' and rows[n]['file'] == page_files[n] for n, (a, i) in EXPECTED.items()))
reel = json.loads((ROOT / 'docs/sound-reel.json').read_text())['sounds']
check('reel identifies the same eight originals', {r['name'] for r in reel if r.get('selection') == 'original, kept by Aaron'} == set(EXPECTED))
# Removed on purpose (integration, playtest-2, to-do 7: the unplayed rocket and bird-slam cues). They must be gone from
# the repo and the page; every other file stays byte-identical.
REMOVED = {'assets/audio/designed/rocket.wav', 'assets/audio/sfx/rocket.mp3', 'assets/audio/designed/bird-slam.wav'}
gone = [p for p in REMOVED if (ROOT / p).exists() or p in page_files.values()]
check('the removed rocket and bird-slam cues are gone from the repo and the page', not gone, f'still there {gone}')
changed, others = [], 0
for line in subprocess.check_output(['git', 'ls-tree', '-r', BEFORE, '--', 'assets/audio'], cwd=ROOT, text=True).splitlines():
    meta, path = line.split('\t')
    if Path(path).suffix not in ('.wav', '.mp3', '.m4a') or path in {rows[n]['file'] for n in EXPECTED} or path in REMOVED: continue
    others += 1
    actual = subprocess.check_output(['git', 'hash-object', path], cwd=ROOT, text=True).strip()
    if actual != meta.split()[2]: changed.append(path)
check('every other delivered audio file stays byte-identical', not changed, f'{others} files; changed {changed}')
sys.exit(bool(failures))
