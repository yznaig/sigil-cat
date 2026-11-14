#!/usr/bin/env python3
"""Prepare Aaron's Butterman recordings for the web, and measure what the gag syncs to.

Usage: python3 tools/audio/prepare-butterman-audio.py <folder with the recordings>
A recording that is not in the folder is left as it is (its files and its numbers in analysis.json are kept), so one
new clip can be prepared on its own.

For each clip: trim leading/trailing silence, level it, encode .m4a (AAC, iPhone Safari) and .mp3 (fallback)
into assets/audio/butterman/, then write assets/audio/butterman/analysis.json: lengths, trims, loudness,
the fitted beat grid of each song, and the loudness of each rise stage. The originals are never edited.
Needs ffmpeg and numpy. The beat landmarks below were labelled by hand from a faster-whisper transcript.
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/audio/butterman'
SR = 48000

# name in repo <- recording. 'lufs' = level target; the whisper is levelled up here and turned down in config.
CLIPS = {
    'theme-song-1': {'src': 'Buttaman_1.m4a', 'lufs': -16, 'kbps': 96, 'role': 'scene 1 (butter): theme song, take 1'},
    'theme-song-2': {'src': 'Buttaman_2.m4a', 'lufs': -16, 'kbps': 96, 'role': 'the old scene 2 (cross), now the encore: theme song, take 2'},
    'theme-song-3': {'src': 'butterman-scene2-new.m4a', 'lufs': -16, 'kbps': 96, 'role': 'scene 2 (loop): the chant, sixteen "the butter man"s'},
    'rise-yell':    {'src': 'Buttaman_3.m4a', 'lufs': -16, 'kbps': 96, 'role': 'scene 3 (rise): the climbing BUTTAMAAAN'},
    'whisper':      {'src': 'Buttaman_quiet.m4a', 'lufs': -16, 'kbps': 64, 'role': 'butter whisper (pointer near the butter)'},
}
GATE_DB = -40          # a 50 ms window louder than this counts as sound when trimming
PAD = (0.06, 0.20)     # seconds of air kept before the first sound and after the last

# Beat landmarks (beat index, seconds in the ORIGINAL file): the stressed syllable of each sung line, or each
# pitch step of the yell. A straight-line fit through them gives the clip's tempo and where beat 0 falls.
LANDMARKS = {
    'theme-song-1': [(0, 1.34), (4, 4.62), (8, 7.96), (11, 10.41), (16, 14.57), (20, 17.74), (24, 20.84), (28, 23.92)],
    'theme-song-2': [(0, 1.78), (4, 4.79), (8, 7.78), (12, 10.66), (13, 11.38), (16, 13.58), (20, 16.53), (24, 19.44),
                     (27, 21.60), (28, 22.30), (29, 23.04)],
    # the "BUT" of each of the sixteen lines, two beats apart (the syllable's onset, read off the loudness envelope
    # 10 ms at a time; a faster-whisper transcript gave the line count)
    'theme-song-3': [(0, 0.58), (2, 2.46), (4, 4.20), (6, 6.06), (8, 7.82), (10, 9.64), (12, 11.43), (14, 13.26), (16, 15.04),
                     (18, 16.91), (20, 18.69), (22, 20.53), (24, 22.31), (26, 24.12), (28, 25.88), (30, 27.70)],
    # 'It's...' , 'It's the', 'BUT-ter', then the three pitch steps of 'maaan' (283, 320, 380 Hz)
    'rise-yell':    [(0, 1.05), (3, 3.30), (4, 4.05), (6, 5.55), (8, 7.05), (10, 8.55)],
}
# Rise stages: windows (seconds in the original) whose loudness drives the three arm openings.
RISE_STAGES = [(5.55, 7.05), (7.05, 8.55), (8.55, 10.05)]


def run(*cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def lufs(path, start=None, end=None):
    """Integrated loudness via ffmpeg's ebur128, optionally of one window."""
    cmd = ['ffmpeg', '-nostats', '-i', str(path)]
    if start is not None:
        cmd += ['-af', f'atrim={start}:{end},ebur128']
    else:
        cmd += ['-af', 'ebur128=peak=true']
    err = subprocess.run(cmd + ['-f', 'null', '-'], capture_output=True, text=True).stderr
    summary = err[err.rfind('Summary:'):]
    i = float(summary.split('I:')[1].split('LUFS')[0])
    peak = float(summary.split('Peak:')[1].split('dBFS')[0]) if 'Peak:' in summary else None
    return i, peak


def trim_points(x):
    hop = SR // 20
    n = len(x) // hop
    db = 20 * np.log10(np.sqrt((x[:n * hop].reshape(n, hop) ** 2).mean(1)) + 1e-9)
    loud = np.nonzero(db > GATE_DB)[0]
    start = max(0.0, loud[0] * hop / SR - PAD[0])
    end = min(len(x) / SR, (loud[-1] + 1) * hop / SR + PAD[1])
    return round(start, 3), round(end, 3)


def fit_grid(points, trim_start):
    b = np.array([p[0] for p in points], float)
    t = np.array([p[1] for p in points], float)
    k, c = np.polyfit(b, t, 1)
    res = t - (k * b + c)
    return {'bpm': round(60 / k, 2), 'beatSeconds': round(k, 4),
            'beat0InTrimmed': round(c - trim_start, 3),
            'residualsMs': [int(round(r * 1000)) for r in res],
            # per-landmark map for anyone who wants to warp motion to the singing exactly
            'landmarksInTrimmed': [[int(bi), round(ti - trim_start, 3)] for bi, ti in zip(b, t)]}


def main():
    src_dir = Path(sys.argv[1])
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'note': 'Generated by tools/audio/prepare-butterman-audio.py. Times in seconds; '
                      'InTrimmed = seconds into the encoded file.', 'clips': {}}
    old = json.loads((OUT / 'analysis.json').read_text())['clips'] if (OUT / 'analysis.json').exists() else {}
    for name, c in CLIPS.items():
        src = src_dir / c['src']
        if not src.exists():                      # not being redone: keep what is there
            if name in old: report['clips'][name] = old[name]
            print(name, 'kept (no recording in the folder)')
            continue
        x = decode(src)
        start, end = trim_points(x)
        i_lufs, peak = lufs(src)
        gain = c['lufs'] - i_lufs
        # level, short fades at the cuts, and a limiter so the levelled whisper can't clip
        af = (f'atrim={start}:{end},asetpts=PTS-STARTPTS,volume={gain:.2f}dB,'
              f'afade=t=in:d=0.01,afade=t=out:st={end - start - 0.08:.3f}:d=0.08,'
              'alimiter=limit=0.89:attack=5:release=60:level=false')
        for ext, codec in (('m4a', ['-c:a', 'aac', '-b:a', f"{c['kbps']}k", '-movflags', '+faststart']),
                           ('mp3', ['-c:a', 'libmp3lame', '-b:a', f"{c['kbps']}k"])):
            run('ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', af, '-ac', '1', '-ar', str(SR), *codec,
                '-map_metadata', '-1', str(OUT / f'{name}.{ext}'))
        out_m4a = OUT / f'{name}.m4a'
        o_lufs, o_peak = lufs(out_m4a)
        entry = {
            'source': c['src'], 'role': c['role'],
            'originalSeconds': round(len(x) / SR, 2), 'trimStart': start, 'trimEnd': end,
            'trimmedSeconds': round(end - start, 3),
            'trimmedOff': {'lead': start, 'tail': round(len(x) / SR - end, 3)},
            'original': {'lufs': i_lufs, 'peakDbfs': peak}, 'levelledBy': round(gain, 2),
            'encoded': {'lufs': o_lufs, 'peakDbfs': o_peak,
                        'm4aKB': round(out_m4a.stat().st_size / 1024), 'mp3KB': round((OUT / f'{name}.mp3').stat().st_size / 1024)},
        }
        if name in LANDMARKS:
            entry['grid'] = fit_grid(LANDMARKS[name], start)
        if name == 'rise-yell':
            entry['stages'] = []
            for a, b in RISE_STAGES:
                l, _ = lufs(src, a, b)
                entry['stages'].append({'fromInTrimmed': round(a - start, 3), 'toInTrimmed': round(b - start, 3),
                                        'lufs': l})
        report['clips'][name] = entry
        print(name, json.dumps(entry))
    (OUT / 'analysis.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
