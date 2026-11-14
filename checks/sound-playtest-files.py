#!/usr/bin/env python3
"""Aaron's sound playtest (e1111-58), file side: the star tink's provenance and exact rebuild, the 360 riser cap's
numbers, Butterman's recordings untouched, and collisions off in the page config. No browser needed."""
import hashlib, json, re, subprocess, sys, urllib.request, wave
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools/audio'))
from measure import ROOT, measure

failures = []
def check(name, ok, detail=''):
    print(f'CHECK playtest files {name}: {detail} {"PASS" if ok else "FAIL"}', flush=True)
    if not ok: failures.append(name)

TINK = 'assets/audio/designed/star-tink.wav'
manifest = json.loads((ROOT / 'assets/audio/design-manifest.json').read_text())
row = manifest['provenance'].get(TINK, {})
check('star tink is CC0 from its Freesound page', row.get('license') == 'CC0-1.0' and row.get('source') == 'https://freesound.org/people/RutgerMuller/sounds/51038/'
      and row.get('decision') == 'e1111-58' and 'RutgerMuller/sounds/51038' in (ROOT / 'assets/audio/SOURCES.md').read_text(), row.get('source', 'missing'))
with wave.open(str(ROOT / TINK)) as w:
    fmt = (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes() / w.getframerate())
level = measure(ROOT / TINK)
check('star tink is mono 48 kHz 24-bit, short, under the -4 dBFS true-peak ceiling', fmt[:3] == (1, 3, 48000) and fmt[3] < .5 and level['truePeakDbfs'] <= -4,
      f'{fmt}; true peak {level["truePeakDbfs"]} dBFS; 100 ms RMS {level["activeRmsDbfs"]} dBFS')
# Rebuild from the exact preview bytes and compare (skipped, not passed, when the network is unavailable).
cache = ROOT / 'checks/out/audio-playtest'; cache.mkdir(parents=True, exist_ok=True)
preview = cache / '51038-hq.mp3'
try:
    if not preview.exists():
        preview.write_bytes(urllib.request.urlopen(urllib.request.Request(row['fetched'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read())
    ok_src = hashlib.sha256(preview.read_bytes()).hexdigest() == row['fetchedSha256']
    subprocess.run([sys.executable, str(ROOT / 'tools/audio/make-star-tink.py'), str(preview), str(cache / 'star-tink.wav')], check=True, capture_output=True)
    same = (cache / 'star-tink.wav').read_bytes() == (ROOT / TINK).read_bytes()
    check('star tink rebuilds byte for byte from the recorded preview', ok_src and same, f'source hash {"matches" if ok_src else "differs"}; rebuild {"identical" if same else "differs"}')
except OSError as e:
    print(f'CHECK playtest files star tink rebuild: skipped, preview unreachable ({e})')

# The riser cap: the config's curve is the tool's measured output, and the capped riser stays at or under the video.
cap = json.loads(subprocess.check_output([sys.executable, str(ROOT / 'tools/audio/noscope-riser-cap.py')]))
src = (ROOT / 'src/eggs/noscope-video.js').read_text()
m = re.search(r'riserCap: \{ lufs: (-?[\d.]+), step: ([\d.]+), gainDb: \[([^\]]*)\] \}', src)
config = m and {'lufs': float(m[1]), 'step': float(m[2]), 'gainDb': [float(v) for v in m[3].split(',')]}
check('riser cap in the page equals the measured curve', bool(config) and config['lufs'] == cap['capLufs'] and config['step'] == cap['stepSeconds'] and config['gainDb'] == cap['gainDb'],
      f'cap {cap["capLufs"]} LUFS; {len(cap["gainDb"])} points')
v = cap['verify']
check('capped riser never exceeds the video opening loudness', v['riserMaxAfter'] <= v['videoOpeningMax'] + .05 and v['riserMaxBefore'] > v['videoOpeningMax'],
      f'riser {v["riserMaxBefore"]} -> {v["riserMaxAfter"]} LUFS momentary; video opening {v["videoOpeningMax"]} LUFS')
gains = cap['gainDb']
check('riser cap is a smooth, never-rising ramp (no pumping)', all(b <= a for a, b in zip(gains, gains[1:])) and all(abs(b - a) <= 1 for a, b in zip(gains, gains[1:])),
      f'first cut at {next(i for i, g in enumerate(gains) if g < 0) * cap["stepSeconds"]:.1f} s; deepest {min(gains)} dB')
check('the 360 returns at once (back: 0)', re.search(r'black: 5, in: 1, back: 0,', src) is not None)

# Butterman's radio is runtime processing: his recordings are the committed bytes from before this lane.
base = 'e36ff0a'   # the tree this lane started from
changed = [p for p in subprocess.check_output(['git', 'ls-files', 'assets/audio/butterman', 'assets/audio/noscope-riser.mp3'], cwd=ROOT, text=True).split()
           if subprocess.check_output(['git', 'hash-object', p], cwd=ROOT, text=True).strip() != subprocess.check_output(['git', 'rev-parse', f'{base}:{p}'], cwd=ROOT, text=True).strip()]
check('Butterman recordings and the riser are untouched', not changed, f'changed {changed}')
config_js = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {SITE} from './src/config.js'; console.log(JSON.stringify({c: SITE.sounds.collisions, tink: SITE.sounds.files['star-tink']}))"], cwd=ROOT))
check('collisions are off and the star tink is a named sound', config_js['c'] is False and config_js['tink'] == TINK)
# Playtest 3 (fx lane): Aaron's four clips from his downloads (tools/audio/make-p3-sounds.py), ledgered like the bread's
# riser (origin and licence not recorded: licenceCleared false), levelled to the palette, wired by name in the page.
P3 = {'achieve-space': 2, 'bell': 1, 'cast-wind': 2, 'bolt-beam': 1}
files_js = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
    "import {SITE} from './src/config.js'; console.log(JSON.stringify(SITE.sounds.files))"], cwd=ROOT))
for name, ch in P3.items():
    path = f'assets/audio/designed/{name}.wav'; row = manifest['provenance'].get(path, {}); lv = measure(ROOT / path)
    with wave.open(str(ROOT / path)) as w: fmt = (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes() / w.getframerate())
    check(f'playtest 3 {name}: Aaron\'s download, not cleared, hash-pinned input, its recipe', row.get('suppliedBy') == 'Aaron' and row.get('licenceCleared') is False
          and len(row.get('inputSha256', '')) == 64 and row.get('processing') == 'tools/audio/make-p3-sounds.py' and 'playtest-3' in row.get('source', ''), row.get('source', 'missing'))
    check(f'playtest 3 {name}: {ch}-channel 48 kHz 24-bit, -22 dBFS loudest 100 ms, true peak at or under -4 dBFS, named in the page',
          fmt[:3] == (ch, 3, 48000) and abs(lv['activeRmsDbfs'] + 22) < .05 and lv['truePeakDbfs'] <= -4 and files_js.get(name) == path,
          f'{fmt[0]} ch, {fmt[3]:.2f} s, RMS {lv["activeRmsDbfs"]}, peak {lv["truePeakDbfs"]}')
check('playtest 3 the four clips are credited in SOURCES.md', all(f'designed/{n}.wav' in (ROOT / 'assets/audio/SOURCES.md').read_text() for n in P3))
sys.exit(bool(failures))
