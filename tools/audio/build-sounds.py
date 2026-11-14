#!/usr/bin/env python3
"""Sigil Cat's tabletop orchestra. Python 3 + numpy + ffmpeg; no sample packs.

Run from any directory. Seeds derive from cue names, so variants are reproducible.
Sources retained in git at BASELINE supply the three real cat recordings, Aaron's
eight retained effects, legacy A/B clips and Aaron's performances. Other cues are synthesized here.
"""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
import numpy as np
from catalogue import BASELINE, CUES, MATERIALS, CAT_SOURCES, KEPT_ORIGINALS, PEAK_LIMITED_ORIGINALS, PEAK_LIMIT_REASON
from measure import ROOT, decode, active_rms, db, measure

SR = 48000
OUT = ROOT / 'assets/audio'
RNG = np.random.default_rng(10)

def seed(name):
    global RNG
    RNG = np.random.default_rng(int.from_bytes(hashlib.sha256(name.encode()).digest()[:8], 'little'))

def times(seconds):
    return np.arange(round(seconds * SR)) / SR

def fade(x, attack=.002, release=.035):
    x = x.copy()
    a, b = min(len(x), round(attack*SR)), min(len(x), round(release*SR))
    x[:a] *= np.linspace(0, 1, a)**2
    x[-b:] *= np.linspace(1, 0, b)**2
    return x

def noise(seconds, low=100, high=5000):
    # Smooth spectral slopes, rather than a hard brick-wall band that rings.
    x = RNG.normal(size=len(times(seconds)))
    f = np.fft.rfftfreq(len(x), 1/SR)
    shape = (1-np.exp(-(f/max(1, low))**4)) / np.sqrt(1+(f/high)**8)
    return np.fft.irfft(np.fft.rfft(x)*shape, len(x))

def modes(seconds, freqs, decays, amps=None):
    t = times(seconds)
    if amps is None:
        amps = [1/(i+1)**1.2 for i in range(len(freqs))]
    return sum(a*np.sin(2*np.pi*f*t)*np.exp(-t/d) for f, d, a in zip(freqs, decays, amps))

def bend(seconds, start, end, decay=.1, wobble=0):
    t = times(seconds)
    f = end + (start-end)*np.exp(-t/decay) + wobble*np.sin(2*np.pi*19*t)
    return np.sin(2*np.pi*np.cumsum(f)/SR)

def mix(seconds, *events):
    out = np.zeros(len(times(seconds)))
    for at, x, gain in events:
        start = round(at*SR)
        n = min(len(x), len(out)-start)
        if n > 0:
            out[start:start+n] += gain*x[:n]
    return out

def room(x, wet=.07):
    # A little tabletop air; never a long game-menu reverb.
    out = x.copy()
    for delay, gain in [(.019, wet), (.037, wet*.64), (.061, wet*.35)]:
        n = round(delay*SR)
        if n < len(x):
            out[n:] += gain*x[:-n]
    return out

def impact(material, size='small', variant=0):
    big = size == 'medium'
    duration = {'wood': .38, 'metal': .8, 'paper': .29, 'butter': .34, 'glass': .85, 'tin': .55}[material]*(1.3 if big else 1)
    t = times(duration)
    pitch = (RNG.uniform(.985, 1.015)*[.88, 1., 1.13][variant-1] if variant else RNG.uniform(.94, 1.06))*(.73 if big else 1)
    if material == 'wood':
        x = modes(duration, np.array([236, 541, 1130, 1980])*pitch, [.065, .043, .023, .013])
        x += noise(duration, 250, 4200)*np.exp(-t/.012)*.33
    elif material == 'metal':
        x = modes(duration, np.array([716, 1337, 2241, 3478, 4913])*pitch,
                  [.22, .15, .11, .07, .042], [1, .44, .27, .12, .04])
        x += noise(duration, 700, 6800)*np.exp(-t/.009)*.16
    elif material == 'paper':
        x = noise(duration, 350, 4300)*np.exp(-t/.04)
        x *= .6 + .4*np.sin(2*np.pi*RNG.uniform(54, 77)*t)**2
        x += .32*bend(duration, 190, 85)*np.exp(-t/.025)
        x += .26*noise(duration, 600, 3800)*np.exp(-((t-.074)/.023)**2)
    elif material == 'butter':
        x = bend(duration, 210*pitch, 64*pitch, .022)*np.exp(-t/.046)
        x += .38*noise(duration, 80, 1600)*np.exp(-t/.026)
        x += .16*bend(duration, 400, 130, .03)*np.exp(-((t-.059)/.023)**2)
    elif material == 'glass':
        x = modes(duration, np.array([1310, 2187, 3521, 5180])*pitch,
                  [.23, .15, .083, .04], [1, .34, .12, .04])
        x += .27*modes(duration, [310*pitch], [.017])
        x += .12*noise(duration, 900, 7200)*np.exp(-t/.006)
    else:  # tin: light hollow lid, with a rattling second contact
        x = modes(duration, np.array([367, 719, 1170, 2027])*pitch,
                  [.1, .08, .052, .025], [1, .56, .29, .1])
        x += .35*noise(duration, 450, 4800)*np.exp(-t/.025)
        x += .25*bend(duration, 620*pitch, 490*pitch, .04)*np.exp(-t/.095)
    x *= RNG.uniform(.92, 1.08, len(x))
    if variant:
        # Different contact damping and a different small secondary contact, as well
        # as different resonances/noise. These are not three copies at another rate.
        x *= np.exp(-t * [2.1, .6, 0][variant-1])
        n = round([.019, .033, .047][variant-1]*SR)
        x[n:] += [.07, .12, .09][variant-1]*x[:-n].copy()
    return fade(room(x, .04), .001, .045)

def tine(hz=261.625565, duration=1.35):
    t = times(duration)
    x = modes(duration, [hz, hz*2, hz*3, hz*5.98], [.4, .19, .08, .027], [1, .23, .06, .045])
    x += .17*modes(duration, [155, 361], [.03, .018])
    x += .035*noise(duration, 800, 4200)*np.exp(-t/.008)
    return fade(room(x))

def cue(name):
    if name in CAT_SOURCES:
        x = decode(OUT / f'sfx/{name}.mp3')
        f = np.fft.rfftfreq(len(x), 1/SR)
        lo, hi = (38, 2900) if name == 'purr' else (95, 5600)
        x = np.fft.irfft(np.fft.rfft(x)*(1-np.exp(-(f/lo)**4))/np.sqrt(1+(f/hi)**6), len(x))
        return fade(x, .006, .06)
    if name == 'tap-bonk':
        return mix(.43, (0, impact('wood'), 1), (.095, impact('wood'), .11))
    if name == 'tap-pop':
        t = times(.22)
        return fade(bend(.22, 700, 95, .012)*np.exp(-t/.034)+.13*noise(.22, 200, 2400)*np.exp(-t/.014))
    if name == 'tap-boing':
        t = times(.55)
        return fade(room(bend(.55, 470, 110, .09, 14)*np.exp(-t/.12)+.23*bend(.55, 940, 220, .06, 28)*np.exp(-t/.055)))
    if name == 'tap-squeak':
        t = times(.38)
        env = np.exp(-((t-.065)/.037)**2)+.62*np.exp(-((t-.185)/.045)**2)
        return fade(env*(bend(.38, 1380, 680, .15, 45)+.13*bend(.38, 2760, 1360, .15, 90)))
    if name == 'tap-blat':
        t = times(.35)
        f = bend(.35, 170, 93, .16, 5)
        return fade((f+.24*f**3)*np.exp(-t/.08)*(.5+.5*np.sin(2*np.pi*32*t)**2), .006)
    if name == 'tap-rare':
        x = modes(1.7, [196, 291, 493, 729, 1001], [.37, .35, .23, .16, .1])
        return mix(1.7, (0, fade(room(x, .15), .01, .2), 1), (.66, cue('drip'), .22))
    if name == 'cast':
        return mix(1.1, (0, tine(523.251), .65), (.075, tine(783.991), .56), (.155, tine(1046.502), .48))
    if name == 'fizzle':
        t = times(.52)
        x = noise(.52, 500, 4700)*np.exp(-t/.13)*(.3+.7*np.sin(2*np.pi*29*t)**4)
        x += .18*bend(.52, 420, 160, .07)*np.exp(-((t-.23)/.055)**2)
        return fade(x)
    if name == 'thunder':
        t = times(4.6)
        rumble = noise(4.6, 38, 460)*np.exp(-t/.86)*(1+.5*np.sin(2*np.pi*3.8*t))
        crack = noise(4.6, 350, 3400)*np.exp(-t/.022)*.45
        return fade(room(rumble+crack, .18), .003, .4)
    if name == 'whoosh':
        t = times(.65)
        return fade(noise(.65, 220, 2400)*np.sin(np.pi*t/.65)**2)
    if name == 'ding':
        return fade(room(modes(1.2, [1046.502, 2200, 3420], [.25, .12, .04], [1, .18, .05])))
    if name == 'airhorn':
        t = times(.83)
        env = np.exp(-((t-.13)/.07)**6) + .75*np.exp(-((t-.43)/.13)**6)
        x = sum(np.sin(2*np.pi*(f*t+.4*np.sin(2*np.pi*4*t)/20))/i**1.8 for f0 in [311.127, 391.995] for i in range(1, 7) for f in [f0*i])
        return fade(env*x)
    if name == 'hit':
        return mix(.16, (0, fade(impact('tin')[:round(.07*SR)], .001, .008), .7), (.021, impact('glass'), .22))
    if name == 'slap':
        return mix(.4, (0, impact('butter', 'medium'), 1), (.042, impact('paper'), .22))
    if name == 'bite':
        return mix(.3, (0, impact('paper'), 1), (.037, impact('wood'), .35), (.095, impact('paper'), .7))
    if name == 'glass-slide':
        t = times(.83)
        return fade(noise(.83, 400, 3400)*np.sin(np.pi*t/.83)**1.4*(.6+.4*np.sin(2*np.pi*47*t))+
                    .14*modes(.83, [1180, 1910], [.24, .12]), .016, .12)
    if name == 'glass-smash':
        events = [(0, impact('tin', 'medium'), .6)]
        events += [(float(at), impact('glass'), .35*np.exp(-at*3)) for at in [0, .037, .092, .155, .25, .34, .49, .66]]
        return mix(1.3, *events)
    if name == 'drip':
        t = times(.36)
        return fade(bend(.36, 510, 1150, .022)*np.exp(-t/.042)+.25*bend(.36, 260, 520, .035)*np.exp(-t/.065))
    if name == 'box-thud':
        return mix(.5, (0, impact('wood', 'medium'), .6), (.014, impact('paper', 'medium'), .9), (.087, impact('paper'), .3))
    if name == 'choir':
        t = times(2.1)
        x = np.zeros(len(t))
        for root in [261.626, 329.628, 391.995]:
            for detune in [.998, 1.003]:
                for h in range(1, 22):
                    hz = root*h*detune
                    vowel = .8*np.exp(-((hz-780)/270)**2)+.28*np.exp(-((hz-1180)/310)**2)+.12*np.exp(-((hz-2700)/420)**2)
                    phase = 2*np.pi*hz*t + .02*h*np.sin(2*np.pi*4.6*t)
                    x += np.sin(phase+RNG.uniform(0, 2*np.pi))*vowel/h
        return fade(room(x*np.sin(np.pi*t/2.1)**1.2, .14), .12, .28)
    if name == 'rattle':
        return mix(.34, *[(a, fade(impact('wood')[:round(.07*SR)], .001, .008), g) for a, g in [(0, .7), (.053, 1), (.13, .65), (.216, .3)]])
    if name == 'pluck':
        return tine()
    if name == 'paper':
        return mix(.44, (0, impact('paper'), 1), (.137, impact('paper'), .63))
    if name == 'splat':
        return mix(.56, (0, impact('butter', 'medium'), 1), (.038, impact('butter'), .55), (.081, impact('butter'), .3), (.16, impact('butter'), .12))
    if name == 'sponge-wipe':
        t = times(.46)
        x = noise(.46, 110, 1850)*np.sin(np.pi*t/.46)**1.3
        x += .13*bend(.46, 270, 130, .23)*sum(np.exp(-((t-c)/.025)**2) for c in [.10, .22, .34])
        return fade(x)
    if name == 'twinkle':
        return mix(.95, (0, tine(1567.982, .8), .65), (.11, tine(1318.51, .75), .4))
    if name == 'click':
        return mix(.12, (0, impact('wood'), .6), (.024, impact('paper'), .22))
    if name == 'paradox-hum':
        t = times(8)
        x = sum(a*np.sin(2*np.pi*f*t+.16*np.sin(2*np.pi*.5*t)) for f, a in [(98, 1), (98.625, .35), (147, .25), (196, .1)])
        return fade(x*(.86+.14*np.sin(2*np.pi*3*t))+.045*noise(8, 80, 700), .15, .15)
    if name == 'galaxy-hum':
        t = times(10)
        x = sum(a*np.sin(2*np.pi*f*t+.15*np.sin(2*np.pi*.2*t)) for f, a in [(55, 1), (82.5, .45), (110.2, .23)])
        x *= .8+.2*np.sin(2*np.pi*.1*t)
        x += .016*np.sin(2*np.pi*1318.5*t)*np.sin(np.pi*t/10)**2
        return fade(x, .3, .3)
    raise ValueError(name)

def master(x, target=-22):
    x = fade(x-np.mean(x), .001, .012)
    gain = min(10**(target/20)/active_rms(x), 10**(-4/20)/max(abs(x)))
    return x*gain

def wav(path, x, channels=1):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', str(channels), '-i', '-',
                    '-c:a', 'pcm_s24le', '-map_metadata', '-1', str(path)], input=x.astype('<f4').tobytes(), check=True)

def kept_original(name, path, target):
    # Decode the exact pre-redesign file, not the subsequently attenuated A/B MP3.
    rel = f'assets/audio/sfx/{name}.mp3'
    original = subprocess.check_output(['git', 'show', f'{BASELINE}:{rel}'], cwd=ROOT)
    cache = ROOT/'checks/out/audio-originals'/BASELINE/f'{name}.mp3'
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(original)
    channels = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'a:0',
        '-show_entries', 'stream=channels', '-of', 'csv=p=0', str(cache)]))
    x = decode(cache, mono=False)
    gain = min(10**(target/20)/active_rms(decode(cache)),
               10**(-4/20)/np.max(abs(decode(cache, 192000, mono=False))))
    # No fades, EQ, DC removal, limiting, trim, pitch or timing changes. Stereo stays stereo.
    wav(path, x*gain, channels)
    author, source = KEPT_ORIGINALS[name]
    return {'selection': 'original, kept by Aaron', 'decision': 'e1111-05',
            'source': source, 'author': author, 'license': 'CC0-1.0', 'channels': channels,
            'originalCommit': BASELINE, 'originalFile': rel,
            'originalSha256': hashlib.sha256(original).hexdigest(), 'levelCorrectionDb': round(db(gain), 9)}

def build_cue(name, trigger, old, direction):
    seed(name)
    target = -25 if name in ('purr', 'paradox-hum', 'galaxy-hum') else -22
    path = OUT/f'designed/{name}.wav'
    row = {'name': name, 'file': str(path.relative_to(ROOT)), 'trigger': trigger, 'direction': direction,
           'old': f'assets/audio/sfx/{name}.mp3' if name not in ('paradox-hum', 'galaxy-hum') else f'assets/audio/reference/{name}.wav',
           'source': CAT_SOURCES.get(name, ('Sigil Cat', 'tools/audio/build-sounds.py'))[1],
           'license': 'CC0-1.0' if name in CAT_SOURCES else 'Original synthesis — ours', 'targetRmsDbfs': target}
    if name in KEPT_ORIGINALS:
        row.update(kept_original(name, path, target))
        row['direction'] = f'original, kept by Aaron — {old}; constant gain only (e1111-05)'
        if name in PEAK_LIMITED_ORIGINALS:
            row.update(targetRmsDbfs=PEAK_LIMITED_ORIGINALS[name], nominalTargetRmsDbfs=target,
                       peakCeilingDbfs=-4, loudnessExemption=PEAK_LIMIT_REASON)
    else:
        wav(path, master(cue(name), target))
    return row

def restore_and_level_legacy():
    # Always work from the immutable original, never compound lossy re-encoding.
    baseline = json.loads((ROOT/'docs/sound-baseline.json').read_text())
    corrections = {}
    for rel, before in baseline.items():
        # Leave 2 dB of source headroom, more for the loud overlapping montage/riser.
        ceiling = -4 if ('noscope' in rel or '/butterman/' in rel) else -2
        adjustment = min(0, ceiling-before['truePeakDbfs'])
        original = subprocess.check_output(['git', 'show', f'{BASELINE}:{rel}'], cwd=ROOT)
        target = ROOT/rel
        if adjustment == 0:
            target.write_bytes(original)
            continue
        # AAC/MP3 add fresh overshoot: reserve .35 dB and measure the deliverable later.
        adjustment -= .35
        with tempfile.TemporaryDirectory() as temp:
            src = Path(temp)/target.name
            src.write_bytes(original)
            cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', f'volume={adjustment:.6f}dB']
            if target.suffix == '.mp4':
                cmd += ['-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart']
            elif target.suffix == '.m4a':
                cmd += ['-c:a', 'aac', '-b:a', '128k']
            else:
                cmd += ['-c:a', 'libmp3lame', '-q:a', '2']
            subprocess.run(cmd+[str(target)], check=True)
        corrections[rel] = round(adjustment, 6)
    return corrections

def main(kept_only=False):
    if kept_only:
        manifest_path = OUT/'design-manifest.json'
        manifest = json.loads(manifest_path.read_text())
        replacements = {r['name']: r for r in (build_cue(*cue_row) for cue_row in CUES if cue_row[0] in KEPT_ORIGINALS)}
        manifest['sounds'] = [replacements.get(r['name'], r) for r in manifest['sounds']]
        manifest['correctionsDb'].update({r['file']: r['levelCorrectionDb'] for r in replacements.values()})
        manifest_path.write_text(json.dumps(manifest, indent=2)+'\n')
        print('Restored Aaron’s eight originals; every other audio asset left untouched.')
        return
    corrections = restore_and_level_legacy()
    rows = []
    for cue_row in CUES:
        row = build_cue(*cue_row)
        rows.append(row)
        if row['name'] in KEPT_ORIGINALS: corrections[row['file']] = row['levelCorrectionDb']
    for material in MATERIALS:
        for size in ['small', 'medium']:
            for variant in range(1, 4):
                name = f'impact-{material}-{size}-{variant:02}'
                seed(name)
                path = OUT/f'impacts/{name}.wav'
                wav(path, master(impact(material, size, variant), -24 if size == 'small' else -22))
                rows.append({'name': name, 'file': str(path.relative_to(ROOT)), 'trigger': f'{size.title()} {material} contact; variant {variant}/3 (world adapter API)',
                             'direction': f'{material.title()} body/contact modes, independent excitation and decay',
                             'source': 'tools/audio/build-sounds.py', 'license': 'Original synthesis — ours',
                             'targetRmsDbfs': -24 if size == 'small' else -22})
    # The old procedural voices, printed for A/B review (4 s excerpts of sustained voices).
    for name in ['paradox-hum', 'galaxy-hum']:
        seed('old-'+name)
        t = times(4)
        if name == 'paradox-hum':
            x = sum(np.sin(2*np.pi*98*m*h*t)/h for m in [1, 1.006] for h in range(1, 32)) + np.sin(2*np.pi*147*t)
            cutoff = 520
        else:
            x = sum(np.sin(2*np.pi*f*t) for f in [55, 82.6, 110.4])
            cutoff = 320
        f = np.fft.rfftfreq(len(x), 1/SR)
        x = np.fft.irfft(np.fft.rfft(x)/np.sqrt(1+(f/cutoff)**4), len(x))
        wav(OUT/f'reference/{name}.wav', master(fade(x, .15, .3), -25))
    (OUT/'design-manifest.json').write_text(json.dumps({'baseline': BASELINE, 'sampleRate': SR, 'correctionsDb': corrections, 'sounds': rows}, indent=2)+'\n')
    print(f'Built {len(rows)} palette cues (8 originals kept); {len(corrections)} level corrections; 2 approximate old ambience excerpts.')

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--kept-only', action='store_true', help='Restore only e1111-05’s eight cues; leave every other asset untouched')
    main(parser.parse_args().kept_only)
