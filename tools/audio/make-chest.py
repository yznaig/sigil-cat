#!/usr/bin/env python3
"""The chest's open and close cues (kitchen lane, e1111-61), cut from Aaron's supplied clip.

Input: minecraft-chest.mp3 (6.32 s, YouTube download supplied by Aaron): the first half is the chest opening, the
second half the chest closing. Cleared for use by Aaron's choice (e1111-61). Usage:
  python3 tools/audio/make-chest.py <path to minecraft-chest.mp3>
Each cue: downmixed to mono, 48 kHz, 5 ms fade in / 20 ms fade out, one constant gain to the palette's -22 dBFS
loudest-100-ms RMS (peak stays under -4 dBFS), 24-bit PCM. The close cue starts at the creak (5.08 s): the short
isolated click at 4.46 s is left out (it reads as a GUI click, not the lid)."""
import hashlib, math, struct, subprocess, sys, tempfile, os
SRC = sys.argv[1] if len(sys.argv) > 1 else '../inputs/audio/minecraft-chest.mp3'
SHA = '891c4d0de90acecb271cd6028f1712d39fd569352c42ff98cc4eeee454079b51'
OUT = os.path.join(os.path.dirname(__file__), '../../assets/audio/designed/')
CUES = [('chest-open', 0.62, 1.28), ('chest-close', 5.08, 5.72)]
def load(p):
    d = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return struct.unpack('%df' % (len(d) // 4), d)
def measure(x):
    w, best = 4800, 0
    for i in range(0, max(1, len(x) - w), 480):
        s = x[i:i + w]; best = max(best, math.sqrt(sum(v * v for v in s) / len(s)))
    return 20 * math.log10(best), 20 * math.log10(max(abs(v) for v in x))
if __name__ == '__main__':
    got = hashlib.sha256(open(SRC, 'rb').read()).hexdigest()
    if got != SHA: sys.exit(f'unexpected input {got}')
    with tempfile.TemporaryDirectory() as tmp:
        for name, a, b in CUES:
            raw = os.path.join(tmp, name + '.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-ss', str(a), '-to', str(b), '-af',
                            'afade=t=in:d=0.005,areverse,afade=t=in:d=0.02,areverse', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_f32le', raw], check=True)
            rms, peak = measure(load(raw)); gain = -22 - rms
            if peak + gain > -4: gain = -4 - peak
            out = os.path.join(OUT, name + '.wav')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=%.6fdB' % gain, '-c:a', 'pcm_s24le', '-ar', '48000', '-ac', '1', out], check=True)
            rms, peak = measure(load(out))
            print(f'{name}: {a:.2f}-{b:.2f} s, gain {gain:+.6f} dB, 100 ms RMS {rms:.3f} dBFS, peak {peak:.3f} dBFS')
