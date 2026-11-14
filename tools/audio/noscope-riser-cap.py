#!/usr/bin/env python3
"""The 360 riser's loudness cap (Aaron's playtest, e1111-58): the riser never gets louder than the video's opening.
Measures EBU R128 momentary loudness (400 ms, K-weighted, ffmpeg ebur128) of the montage's first second and of the
riser, then prints the riser's gain curve in dB at 0.1 s steps: 0 dB until the riser reaches the cap, then a
smooth, never-rising attenuation (cap minus the riser's centred 400 ms loudness), shifted until the re-measured riser
peaks just under the cap. The curve is copied into
NOSCOPE_VIDEO.riserCapDb (src/eggs/noscope-video.js); the riser file itself is untouched.
  python3 tools/audio/noscope-riser-cap.py            prints JSON {capLufs, stepSeconds, gainDb, verify}
`verify` re-measures the riser with the curve applied (linear interpolation, as setValueCurveAtTime does)."""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
RISER, VIDEO, STEP, OPENING = ROOT / 'assets/audio/noscope-riser.mp3', ROOT / 'assets/video/noscope.mp4', .1, 1.0

def momentary(args, data=None):
    out = subprocess.run(['ffmpeg', '-nostats', '-v', 'info', *args, '-vn', '-af', 'ebur128', '-f', 'null', '-'],
                         input=data, capture_output=True).stderr.decode()
    rows = re.findall(r't:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+|-inf|nan)', out)
    return [(float(t), float(m) if re.fullmatch(r'-?[\d.]+', m) else -120.0) for t, m in rows]

def decode(path):
    # Interleaved stereo, as the riser is: R128 sums channel powers, so a mono fold-down would read 3 dB low.
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '2', '-ar', '48000',
                                                  '-f', 'f32le', '-']), '<f4').astype(np.float64).reshape(-1, 2)

def apply(x, gains):
    t = np.arange(len(x)) / 48000
    return x * (10 ** (np.interp(t, np.arange(len(gains)) * STEP, gains) / 20))[:, None]

if __name__ == '__main__':
    video = [v for t, v in momentary(['-t', '1.4', '-i', str(VIDEO)]) if .4 - 1e-6 <= t <= OPENING + 1e-6]
    cap = round(max(video), 1)
    x = decode(RISER)
    seconds, measured = len(x) / 48000, momentary(['-i', str(RISER)])
    m = dict((round(t, 1), v) for t, v in measured)
    times = [round(i * STEP, 1) for i in range(int(seconds / STEP) + 1)]
    # Centred window: the 400 ms around t. Past the last window, hold its value.
    centred = [m.get(round(t + .2, 1), measured[-1][1] if t + .2 > measured[-1][0] else -120.0) for t in times]
    # A riser rises: once it is held down it stays held down (non-increasing gain), so the cap is a smooth ramp.
    base = list(np.minimum.accumulate([min(0.0, cap - v) for v in centred]))
    shift = 0.0
    for _ in range(12):
        gains = [round(g + shift, 2) if g < 0 else 0.0 for g in base]
        gains = [min(0.0, g) for g in gains]
        after = momentary(['-f', 'f32le', '-ar', '48000', '-ac', '2', '-i', '-'], apply(x, gains).astype('<f4').tobytes())
        excess = max(v for _, v in after) - (cap - .05)
        if abs(excess) < .05: break
        shift -= excess
    before = momentary(['-i', str(RISER)])
    json.dump({'capLufs': cap, 'stepSeconds': STEP, 'gainDb': gains,
               'verify': {'riserMaxBefore': max(v for _, v in before), 'riserMaxAfter': max(v for _, v in after),
                          'videoOpeningMax': cap}}, sys.stdout)
    print()
