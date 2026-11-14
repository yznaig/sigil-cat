#!/usr/bin/env python3
"""Original achievement chime: two soft glass-and-tine notes a fifth apart (G5 then D6), the same family as `cast`
(three climbing glass-and-tine notes). Rounded attacks, a short natural tail, quiet. Unit-10 contract: mono
48k/24-bit WAV, max 100 ms RMS -22 dBFS, sample peak <= -4 dBFS. No external samples or dependencies.
Run from the repository root: python3 tools/audio/make-achieve-chime.py"""
import math, random, struct, wave
from pathlib import Path
RATE = 48000
SECONDS = 1.7
rng = random.Random(1111046)
n = int(RATE * SECONDS)
out = [0.0] * n

def note(at, f, gain):
    # A tine: a pure fundamental with a faint inharmonic overtone, plus a thin glass shimmer that dies first.
    start = int(at * RATE)
    for i in range(n - start):
        t = i / RATE
        attack = min(1, t / .006) ** 2
        body = math.sin(2 * math.pi * f * t) * math.exp(-t / .55)
        tine = .22 * math.sin(2 * math.pi * f * 3.93 * t + .4) * math.exp(-t / .09)
        glass = .10 * math.sin(2 * math.pi * f * 2.01 * t + 1.1) * math.exp(-t / .32)
        out[start + i] += gain * attack * (body + tine + glass)

note(0.000, 783.99, 1.0)     # G5
note(0.115, 1174.66, .78)    # D6
# a breath of felt under the first strike, so it is soft rather than electronic
lp = 0
for i in range(int(.05 * RATE)):
    lp = .9 * lp + .1 * rng.uniform(-1, 1)
    out[i] += .35 * lp * math.exp(-i / RATE / .012)
# gentle end fade
fade = int(.25 * RATE)
for i in range(fade):
    out[n - fade + i] *= (1 - i / fade) ** 2

win = int(RATE * .1); acc = 0; peak_rms = 0
for i, x in enumerate(out):
    acc += x * x
    if i >= win: acc -= out[i - win] ** 2
    if i >= win - 1: peak_rms = max(peak_rms, math.sqrt(max(0, acc) / win))
gain = min(10 ** (-22 / 20) / peak_rms, 10 ** (-4 / 20) / max(map(abs, out)))
path = Path('assets/audio/designed/achieve.wav'); path.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(path), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(3); w.setframerate(RATE)
    w.writeframes(b''.join(struct.pack('<i', round(x * gain * 8388607))[:3] for x in out))
print(f'{path}: {path.stat().st_size} bytes; {SECONDS}s, peak {20 * math.log10(max(map(abs, out)) * gain):.2f} dBFS, '
      f'max 100ms RMS {20 * math.log10(peak_rms * gain):.2f} dBFS')
