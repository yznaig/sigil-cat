"""Decode actual deliverables, including codec overshoot. Python + numpy + ffmpeg."""
import hashlib
import json
import subprocess
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]

def decode(path, rate=48000, mono=True):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), '-vn']
    if mono:
        cmd += ['-ac', '1']
    return np.frombuffer(subprocess.check_output(cmd + ['-ar', str(rate), '-f', 'f32le', '-']), dtype='<f4')

def db(v):
    return float(20 * np.log10(max(float(v), 1e-10)))

def active_rms(x, rate=48000):
    # Loudest 100 ms window, stepped every 10 ms: meaningful even for short impacts.
    n = min(len(x), rate // 10)
    sums = np.r_[0., np.cumsum(np.asarray(x, dtype=np.float64) ** 2)]
    return float(np.sqrt(np.max((sums[n:] - sums[:-n])[::max(1, rate // 100)]) / n))

def measure(path):
    x = decode(path)
    # Four-times oversampling, with channels separate, catches intersample/codec peaks.
    up = decode(path, 192000, mono=False)
    return {'seconds': round(len(x) / 48000, 4),
            'peakDbfs': round(db(np.max(np.abs(decode(path, mono=False)))), 3),
            'truePeakDbfs': round(db(np.max(np.abs(up))), 3),
            'activeRmsDbfs': round(db(active_rms(x)), 3),
            'sha256': hashlib.sha256(Path(path).read_bytes()).hexdigest()}

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args()
    files = sorted(p for p in (ROOT / 'assets/audio').rglob('*') if p.suffix in ('.mp3', '.m4a', '.wav'))
    files += [ROOT / 'assets/video/noscope.mp4']
    if not args.baseline:
        files += [ROOT / 'docs/sound-reel.mp3']
    rows = {str(p.relative_to(ROOT)): measure(p) for p in files}
    out = ROOT / ('docs/sound-baseline.json' if args.baseline else 'docs/sound-levels.json')
    out.write_text(json.dumps(rows, indent=2) + '\n')
    print(f'{len(rows)} files decoded; highest true peak {max(r["truePeakDbfs"] for r in rows.values()):.3f} dBFS; {out.relative_to(ROOT)}')
    for p, r in rows.items():
        if r['truePeakDbfs'] >= -1:
            print(p, r['truePeakDbfs'])
