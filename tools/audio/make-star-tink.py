#!/usr/bin/env python3
"""The star sticker's tap: one fingernail tap on a drinking glass (Aaron's playtest, e1111-58).
Source: RutgerMuller, "Glass Tapped By Fingernail.wav", https://freesound.org/people/RutgerMuller/sounds/51038/ (CC0-1.0),
its Freesound HQ preview (the original download needs a login). One isolated tap is cut out; nothing is synthesized.
Unit-10 contract: mono 48 kHz / 24-bit WAV, peaks <= -4 dBFS (4x true peak). Like the kept paper/click originals it is
a sparse transient that reaches the peak ceiling before the -22 dBFS RMS target (it measures about -27).
  python3 tools/audio/make-star-tink.py [preview.mp3|-] [out.wav]   (- or nothing: download the preview)
Processing: cut 4 ms before the tap at ~4.46 s (the tap with the longest clear gap after it), 2 ms fade-in over that
lead, 0.42 s long with a 0.22 s cosine fade-out, a 2nd-order 250 Hz high-pass (handling rumble only; the glass rings
at 1.03, 3.1 and 3.5 kHz), one constant gain. No EQ, compression or pitch change."""
import hashlib, subprocess, sys, tempfile, urllib.request, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
URL = 'https://cdn.freesound.org/previews/51/51038_179538-hq.mp3'
SHA = '992b79c386d89d4ed586bf7070d2cca0d66a67c965b92adc6b56204133ae3ca0'  # the preview as fetched 2026-11-11
RATE, TAP_NEAR, LEAD, LENGTH, FADE, HP = 48000, 4.46, .004, .42, .22, 250.0
OUT = ROOT / 'assets/audio/designed/star-tink.wav'

def fetch():
    path = Path(tempfile.mkdtemp()) / '51038-hq.mp3'
    req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    path.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return path

src = Path(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] != '-' else fetch()
if len(sys.argv) > 2: OUT = Path(sys.argv[2]).resolve()      # a rebuild elsewhere (checks/sound-playtest-files.py)
digest = hashlib.sha256(src.read_bytes()).hexdigest()
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(src), '-ac', '1', '-ar', str(RATE),
                                           '-f', 'f32le', '-']), '<f4').astype(np.float64)
if digest != SHA: sys.exit(f'unexpected source {digest}; expected {SHA}')
# Onset: the loudest 1 ms within +-80 ms of TAP_NEAR, then back to where the envelope is 30 dB under it.
w = RATE // 1000
lo, hi = int((TAP_NEAR - .08) * RATE), int((TAP_NEAR + .08) * RATE)
env = 20 * np.log10(np.sqrt(np.convolve(x * x, np.ones(w) / w, 'same')) + 1e-9)
top = lo + int(np.argmax(env[lo:hi]))
onset = next(i for i in range(top, lo, -1) if env[i] < env[top] - 30)
start = onset - int(LEAD * RATE)
y = x[start:start + int(LENGTH * RATE)].copy()
# 2nd-order Butterworth high-pass (bilinear transform), run forward only: no pre-ring before the tap.
k = np.tan(np.pi * HP / RATE); q = 1 / np.sqrt(2); n = 1 / (1 + k / q + k * k)
b = [n, -2 * n, n]; a = [1, 2 * (k * k - 1) * n, (1 - k / q + k * k) * n]
z = np.zeros_like(y); x1 = x2 = y1 = y2 = 0.0
for i, v in enumerate(y):
    o = b[0] * v + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
    x2, x1, y2, y1 = x1, v, y1, o; z[i] = o
fi, fo = int(.002 * RATE), int(FADE * RATE)
z[:fi] *= .5 - .5 * np.cos(np.linspace(0, np.pi, fi))
z[-fo:] *= .5 + .5 * np.cos(np.linspace(0, np.pi, fo))
win = RATE // 10
s = np.r_[0., np.cumsum(z * z)]
rms = np.sqrt(np.max(s[win:] - s[:-win]) / win) if len(z) > win else np.sqrt(np.mean(z * z))
# Peak ceiling -4 dBFS on the 4x-oversampled (true) peak, as checks/sounds-files.py measures the delivered file.
up = np.fft.irfft(np.fft.rfft(z, 2 * len(z)), 8 * len(z)) * 4
gain = min(10 ** (-22 / 20) / rms, 10 ** (-4.05 / 20) / np.max(np.abs(up)))
pcm = np.clip(np.round(z * gain * 8388607), -8388608, 8388607).astype('<i4')
OUT.parent.mkdir(parents=True, exist_ok=True)
with wave.open(str(OUT), 'wb') as f:
    f.setnchannels(1); f.setsampwidth(3); f.setframerate(RATE)
    f.writeframes(b''.join(int(v).to_bytes(4, 'little', signed=True)[:3] for v in pcm))
print(f'{OUT}: source sha256 {digest}; onset {onset / RATE:.4f} s; {LENGTH} s; '
      f'gain {20 * np.log10(gain):.3f} dB; peak {20 * np.log10(np.max(np.abs(z)) * gain):.2f} dBFS; '
      f'max 100 ms RMS {20 * np.log10(rms * gain):.2f} dBFS')
