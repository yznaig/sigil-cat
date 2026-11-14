#!/usr/bin/env python3
"""Furniture arrival sounds (e1111-37): convert Aaron's three downloads, level them, and find the Spellsword bong.

    python3 tools/audio/prepare-arrivals.py <folder with Aaron's downloads>    # writes assets/audio/arrivals/
    python3 tools/audio/prepare-arrivals.py --bong                             # only re-measure the bong

Constant gain and trims only (no EQ, dynamics or time change), the palette's way with supplied recordings:
- concrete-scrape-loop.mp3 -> concrete-scrape-loop.wav: mp3 padding trimmed for a clean loop, 3 ms edge fades,
  mono 48 kHz / 24-bit, loudest 100 ms RMS -22 dBFS (the effect target).
- ff7r-victory-fanfare.mp3 -> .m4a + .mp3: 0.64 s of leading silence trimmed so it hits on the landing, stereo,
  -12 dBFS loudest 100 ms RMS (Butterman's songs measure -11 to -12.6).
- fanfare-spellsword.m4a -> rpg-victory-fanfare-2.m4a + .mp3: whole file, untrimmed, -12 dBFS.
The sources' own peaks reach +0.29 dBFS; the levelled files peak at -7.3 dBFS or lower.
The bong: the final climactic hit is the strongest spectral-flux onset after 30 s (about twice its neighbours).
Its time in each delivered file is printed; src/world/arrival.js uses their mean.
"""
import subprocess
import sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parent))
from measure import ROOT, active_rms, db, decode, measure

OUT = ROOT / 'assets/audio/arrivals'
RATE = 48000


def dec(path, channels):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(channels), '-ar', str(RATE), '-f', 'f32le', '-'])
    return np.frombuffer(raw, '<f4').reshape(-1, channels).copy()


def write(path, a, args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE), '-ac', str(a.shape[1]), '-i', '-', *args, str(path)],
                   input=a.astype('<f4').tobytes(), check=True)


def level(src, channels, start, end, target, outs, fade):
    a = dec(src, channels)
    a = a[int(start * RATE):int(end * RATE) if end else len(a)]
    n = int(fade * RATE); ramp = np.linspace(0, 1, n)[:, None]; a[:n] *= ramp; a[-n:] *= ramp[::-1]
    probe = OUT / '.probe.wav'; write(probe, a, ['-c:a', 'pcm_f32le'])
    gain = 10 ** ((target - db(active_rms(decode(probe)))) / 20); probe.unlink()
    for name, args in outs:
        write(OUT / name, a * gain, args)
    print(f'{src.name}: trim {start}-{end} s, constant gain {20 * np.log10(gain):+.3f} dB')


def bong(path, after=30.0):
    m = decode(path); n, hop = 1024, 48; w = np.hanning(n)
    starts = np.arange(int(after * RATE), len(m) - n, hop)
    spec = np.log1p(np.abs(np.array([np.fft.rfft(m[s:s + n] * w) for s in starts])) * 20)
    flux = np.convolve(np.r_[0, np.maximum(0, np.diff(spec, axis=0)).sum(1)], np.ones(5) / 5, 'same')
    i = int(np.argmax(flux)); return (starts[i] + n / 2) / RATE, flux[i] / np.median(flux[flux > 0])


if __name__ == '__main__':
    if sys.argv[1:] != ['--bong']:
        src = Path(sys.argv[1]); OUT.mkdir(exist_ok=True)
        aac, mp3 = ['-c:a', 'aac', '-b:a', '192k'], ['-c:a', 'libmp3lame', '-q:a', '2']
        level(src / 'concrete-scrape-loop.mp3', 1, .069, 4.6116, -22, [('concrete-scrape-loop.wav', ['-c:a', 'pcm_s24le'])], .003)
        level(src / 'ff7r-victory-fanfare.mp3', 2, .64, 4.80, -12, [('ff7r-victory-fanfare.m4a', aac), ('ff7r-victory-fanfare.mp3', mp3)], .005)
        level(src / 'fanfare-spellsword.m4a', 2, 0, None, -12, [('rpg-victory-fanfare-2.m4a', aac), ('rpg-victory-fanfare-2.mp3', mp3)], .005)
        for f in sorted(OUT.iterdir()):
            print(f.name, measure(f))
    for name in ['rpg-victory-fanfare-2.m4a', 'rpg-victory-fanfare-2.mp3']:
        t, k = bong(OUT / name)
        print(f'bong {name}: {t:.3f} s (flux {k:.1f}x the median)')
