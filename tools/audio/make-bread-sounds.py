#!/usr/bin/env python3
"""The bread blast-off's riser and pop (sky lane, playtest 2), cut from Aaron's two supplied clips.

Aaron: "The bread should use this Riser-Sound-Effect riser in my downloads, and then right at the end of the riser play
the first pop in this sound effect Pop-Sound-Effect (only the first 1 second of the audio for just the one pop)".
Usage:
  python3 tools/audio/make-bread-sounds.py <riser-sound-effect.mp3> <pop-sound-effect.mp3>
riser: 0.15-5.29 s (the leading silence off; it crests at 5.15 s and has died away by 5.27 s), stereo kept, 48 kHz,
       one constant gain to the palette's -22 dBFS loudest-100-ms RMS (peak stays under -4 dBFS), mp3 like the 360's
       riser (`ffmpeg -c:a libmp3lame -q:a 2`). RISER_END is where the page times the pop and the launch.
pop:   the first pop only, from the first second of the clip: 0.62-0.90 s (silence until 0.56 s, the pop peaks at
       0.64 s and is gone by 0.78 s; cut just before its attack so it lands when played), mono 48 kHz / 24-bit, 2 ms fade in / 40 ms fade out, the same gain rule."""
import hashlib, math, struct, subprocess, sys, tempfile, os
RISER, POP = (sys.argv[1:3] if len(sys.argv) > 2 else ('../inputs/audio/riser-sound-effect.mp3', '../inputs/audio/pop-sound-effect.mp3'))
SHA = {'riser': 'ddcd4703e54e3675182158fe1c15e8d7bf0fe87df5d15e3848d5c71875524ba1',
       'pop': 'a0441aa22955262949a43a104c215a90e5f04dac3909ebdf3fede14fca4cd94a'}
OUT = os.path.join(os.path.dirname(__file__), '../../assets/audio/designed/')
RISER_CUT, RISER_END, POP_CUT = (0.15, 5.29), 5.27, (0.62, 0.90)
def load(p, ch=1):
    d = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-ac', str(ch), '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return struct.unpack('%df' % (len(d) // 4), d)
def measure(p):
    x, w, best = load(p), 4800, 0
    sums = [0.0]
    for v in x: sums.append(sums[-1] + v * v)
    for i in range(0, max(1, len(x) - w), 480): best = max(best, math.sqrt((sums[i + w] - sums[i]) / w))
    return 20 * math.log10(best), 20 * math.log10(max(abs(v) for v in load(p, 2)))
def cut(src, a, b, fades, raw, ch):
    fin, fout = fades
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ss', str(a), '-to', str(b), '-af',
                    f'afade=t=in:d={fin},areverse,afade=t=in:d={fout},areverse', '-ac', str(ch), '-ar', '48000', '-c:a', 'pcm_f32le', raw], check=True)
def level(raw):
    rms, peak = measure(raw); gain = -22 - rms
    return min(gain, -4 - peak)
if __name__ == '__main__':
    for name, path in (('riser', RISER), ('pop', POP)):
        got = hashlib.sha256(open(path, 'rb').read()).hexdigest()
        if got != SHA[name]: sys.exit(f'unexpected {name} input {got}')
    with tempfile.TemporaryDirectory() as tmp:
        raw = os.path.join(tmp, 'riser.wav'); cut(RISER, *RISER_CUT, (0.005, 0.02), raw, 2); g = level(raw)
        out = os.path.join(OUT, 'bread-riser.mp3')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=%.6fdB' % g, '-c:a', 'libmp3lame', '-q:a', '2', '-ar', '48000', out], check=True)
        rms, peak = measure(out)
        print(f'bread-riser: {RISER_CUT[0]:.2f}-{RISER_CUT[1]:.2f} s (ends {RISER_END - RISER_CUT[0]:.2f} s in), gain {g:+.6f} dB, 100 ms RMS {rms:.3f} dBFS, peak {peak:.3f} dBFS')
        raw = os.path.join(tmp, 'pop.wav'); cut(POP, *POP_CUT, (0.002, 0.04), raw, 1); g = level(raw)
        out = os.path.join(OUT, 'bread-pop.wav')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw, '-af', 'volume=%.6fdB' % g, '-c:a', 'pcm_s24le', '-ar', '48000', '-ac', '1', out], check=True)
        rms, peak = measure(out)
        print(f'bread-pop: {POP_CUT[0]:.2f}-{POP_CUT[1]:.2f} s, gain {g:+.6f} dB, 100 ms RMS {rms:.3f} dBFS, peak {peak:.3f} dBFS')
