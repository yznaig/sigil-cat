#!/usr/bin/env python3
"""Independent decoded-file checks. Run by run-all; no device or browser required."""
import hashlib
import json
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'tools/audio'))
from measure import ROOT, measure, decode

manifest = json.loads((ROOT/'assets/audio/design-manifest.json').read_text())
ledger = manifest['provenance']
files = {str(p.relative_to(ROOT)) for p in (ROOT/'assets/audio').rglob('*') if p.suffix in ('.wav', '.mp3', '.m4a')}
files |= {'docs/sound-reel.mp3', 'assets/video/noscope.mp4'}
failed = []
def check(name, ok, detail=''):
    print(f'CHECK sounds {name}: {detail} {"PASS" if ok else "FAIL"}', flush=True)
    if not ok:
        failed.append(name)

check('every audio file has exact provenance', files == set(ledger), f'{len(files)} files / {len(ledger)} entries; missing {sorted(files-set(ledger))}')
valid = True
for file, row in ledger.items():
    source, license = row.get('source', ''), row.get('license', '')
    if license == 'CC0-1.0':
        valid &= bool(__import__('re').fullmatch(r'https://freesound.org/people/[^/]+/sounds/\d+/', source))
    elif license.startswith('Original synthesis'):
        valid &= (ROOT/source).is_file()
    elif row.get('suppliedBy') == 'Aaron':
        # Aaron's own picks of third-party music (e1111-37): named author, the licence stated as it stands, credit
        # recorded where one is owed, and the committed recipe that made the file.
        valid &= bool(row.get('author')) and row.get('licenceCleared') in (True, False) and bool(license) and (ROOT/row.get('processing', '')).is_file()
        valid &= 'credit' not in license.lower() or bool(row.get('credit'))
    else:
        valid &= row.get('author') == 'Aaron' and row.get('baseline') == manifest['baseline'] and 'supplied' in license
check('sources are original, explicit CC0, or Aaron-supplied with their licence stated', valid)
arrivals = sorted(f for f in files if f.startswith('assets/audio/arrivals/'))
# the grimoire is a pop-up now (shell lane, playtest-2): its credits are in src/ui/books.js
credit_ok = all('Lux Aeterna Audio' in (ROOT/'src/ui/books.js').read_text() for f in arrivals if ledger[f].get('credit'))
check('arrival sounds levelled, ledgered and credited', len(arrivals) == 5 and credit_ok and all(ledger[f].get('suppliedBy') == 'Aaron' for f in arrivals),
      f'{len(arrivals)} files; credit in grimoire {credit_ok}')

# Decode each delivered codec anew; do not trust stored analysis or source PCM peaks.
levels = {file: measure(ROOT/file) for file in sorted(files)}
peak, peak_file = max((r['truePeakDbfs'], p) for p, r in levels.items())
check('decoded sample and 4x true peaks below -1 dBFS', all(r['peakDbfs'] < -1 and r['truePeakDbfs'] < -1 for r in levels.values()), f'max {peak:.3f} dBFS ({peak_file})')
recorded = json.loads((ROOT/'docs/sound-levels.json').read_text())
check('measurement report matches delivered bytes', all(recorded.get(p) == row for p, row in levels.items()), f'{len(levels)} hashes and measurements')
# Only these two files are exempt from the effect RMS target, per Aaron's decision.
# Keep their measured sparse transients intact, with the same -4 dBFS peak ceiling.
peak_limited = {
    'assets/audio/designed/paper.wav': -26.568,
    'assets/audio/designed/click.wav': -30.841,
}
reason = 'original kept by Aaron, e1111-05; transient sound, gain-only would clip'
rows = {r['file']: r for r in manifest['sounds']}
for file, expected_rms in peak_limited.items():
    actual, row = levels[file], rows[file]
    check(f'peak-limited original {file}',
          abs(actual['activeRmsDbfs']-expected_rms) < .02 and abs(actual['truePeakDbfs']- -4) < .02
          and row['targetRmsDbfs'] == expected_rms and row.get('nominalTargetRmsDbfs') == -22
          and row.get('peakCeilingDbfs') == -4 and row.get('loudnessExemption') == reason,
          f'measured RMS {actual["activeRmsDbfs"]:.3f} dBFS; peak {actual["truePeakDbfs"]:.3f} dBFS; {reason}')

def role_target(row):
    # Existing quiet-bed/small-impact roles are unchanged; every other effect stays -22.
    if row['name'] in ('purr', 'paradox-hum', 'galaxy-hum'): return -25
    if row['file'].startswith('assets/audio/impacts/') and '-small-' in row['name']: return -24
    return -22

regular = [r for r in manifest['sounds'] if r['file'] not in peak_limited]
deviation = max(abs(levels[r['file']]['activeRmsDbfs']-role_target(r)) for r in regular)
check('palette sounds meet role loudness targets',
      deviation < .7 and all(r['targetRmsDbfs'] == role_target(r) and not r.get('loudnessExemption') for r in regular),
      f'{len(regular)} non-exempt cues, max 100 ms RMS deviation {deviation:.3f} dB; existing role targets unchanged')
party = levels['assets/audio/designed/party-toot.wav']
check('party toot meets effect loudness target', abs(party['activeRmsDbfs'] - -22) < .7,
      f'{party["activeRmsDbfs"]:.3f} dBFS active RMS; target -22 dBFS')
check('reference and current files exist and differ in encoded bytes', all(r.get('old') not in files or levels[r['old']]['sha256'] != levels[r['file']]['sha256'] for r in manifest['sounds']) and all(not r.get('old') or r['old'] in files for r in manifest['sounds']))
bird = [levels[f'assets/audio/designed/{name}.wav'] for name in ['bird-flap','controller-pop','bird-boom']]
check('bird cues meet effect target and peak headroom', all(abs(r['activeRmsDbfs'] + 22) < .7 and r['truePeakDbfs'] <= -4 for r in bird), str([(r['activeRmsDbfs'],r['truePeakDbfs']) for r in bird]))
distinct = True
for material in ['wood', 'metal', 'paper', 'butter', 'glass', 'tin']:
    for size in ['small', 'medium']:
        paths = [f'assets/audio/impacts/impact-{material}-{size}-{i:02}.wav' for i in range(1, 4)]
        waves = [decode(ROOT/p) for p in paths]
        for a, b in [(0,1),(0,2),(1,2)]:
            corr = abs(float(np.dot(waves[a],waves[b]) / np.sqrt(np.dot(waves[a],waves[a])*np.dot(waves[b],waves[b]))))
            distinct &= corr < .985
check('all 12 material-size groups have 3 distinct variants', distinct, '36 pair comparisons below .985 correlation')
x = decode(ROOT/'assets/audio/designed/pluck.wav')[:24000]
spec = abs(np.fft.rfft(x*np.hanning(len(x)), n=1048576))
k = np.argmax(spec)
hz = k*48000/1048576
cents = 1200*np.log2(hz/261.625565)
check('whisker reference remains C4', abs(cents) < 1, f'{hz:.3f} Hz, {cents:+.2f} cents')
reel = json.loads((ROOT/'docs/sound-reel.json').read_text())
check('reel includes all 68 current cues with gaps', len(reel['sounds']) == 68 and [r['file'] for r in reel['sounds']] == [r['file'] for r in manifest['sounds']] and abs(levels['docs/sound-reel.mp3']['seconds']-reel['seconds']) < .1, f'{reel["seconds"]:.2f} s')
sys.exit(bool(failed))
