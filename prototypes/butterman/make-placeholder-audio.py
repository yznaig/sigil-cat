#!/usr/bin/env python3
"""Write the placeholder beeps Butterman plays until Aaron's real clips arrive.

Run from anywhere: python3 make-placeholder-audio.py
Writes audio/*.wav next to this script: 16 kHz mono 16-bit, each under 40 KB.
They exist only so the page's clip loading runs exactly as it will with real files.
"""
import math, os, random, struct, wave

RATE = 16000
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")
random.seed(7)


def write(name, samples, level=0.9):
    path = os.path.join(HERE, name)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        peak = max(1e-9, max(abs(s) for s in samples))
        w.writeframes(b"".join(struct.pack("<h", int(32000 * level * s / peak)) for s in samples))
    print(f"{name}: {os.path.getsize(path)} bytes, {len(samples) / RATE:.2f} s")


def env(t, dur, attack=0.01):
    return min(1.0, t / attack) * max(0.0, 1 - t / dur) ** 1.6


def tone(dur, freq_fn, wave_fn=math.sin, amp_fn=None):
    out, ph = [], 0.0
    for i in range(int(dur * RATE)):
        t = i / RATE
        ph += 2 * math.pi * freq_fn(t) / RATE
        out.append(wave_fn(ph) * (amp_fn(t) if amp_fn else env(t, dur)))
    return out


def saw(ph):
    return 2 * ((ph / (2 * math.pi)) % 1) - 1


def mix(*parts):
    n = max(len(p) for p in parts)
    return [sum(p[i] for p in parts if i < len(p)) for i in range(n)]


def at(offset, samples):
    return [0.0] * int(offset * RATE) + samples


# strut: a bouncy two-note bass vamp, four hits in a second ("bom-ba bom-ba")
strut = mix(*[at(i * 0.25, tone(0.22, lambda t, f=f: f * (1 - 0.15 * t), amp_fn=lambda t: env(t, 0.22, 0.005)))
              for i, f in enumerate([98, 147, 98, 196])])
write("strut.wav", strut)

# step: a short soft thump for each foot contact
write("step.wav", [s + 0.25 * (random.random() * 2 - 1) * env(i / RATE, 0.03, 0.001)
                   for i, s in enumerate(tone(0.07, lambda t: 140 - 600 * t, amp_fn=lambda t: env(t, 0.07, 0.002)))])

# up: a rising "whoop" as his hand goes up with the butter
write("up.wav", tone(0.28, lambda t: 300 + 1500 * (t / 0.28) ** 1.5, amp_fn=lambda t: 0.7 * env(t, 0.28, 0.02)))

# plop: the butter landing, a falling bloop
write("plop.wav", tone(0.32, lambda t: 620 * (1 - t / 0.32) ** 2 + 120, amp_fn=lambda t: env(t, 0.32, 0.004)))

# buttaman-1/2/3: the three rise stages. Three buzzy "syllables" (BUT-TA-MAAAN), each stage
# higher, longer and louder than the last, like yelling it louder each time.
for stage, (base, last, level) in enumerate([(196, 0.45, 0.55), (247, 0.55, 0.75), (311, 0.7, 0.98)], 1):
    syll = [(0.0, 0.14, base), (0.17, 0.14, base * 1.19), (0.34, last, base * 1.5)]
    clip = mix(*[at(o, tone(d, lambda t, f=f, d=d: f * (1 + 0.03 * stage * math.sin(t * 38)) * (1 + 0.1 * t / d),
                            wave_fn=saw, amp_fn=lambda t, d=d: env(t, d, 0.012))) for o, d, f in syll])
    write(f"buttaman-{stage}.wav", clip, level)

# sink: a quick falling whoosh as he drops back out of frame
write("sink.wav", [0.6 * (random.random() * 2 - 1) * env(i / RATE, 0.5, 0.05) + 0.5 * s
                   for i, s in enumerate(tone(0.5, lambda t: 500 - 700 * t, amp_fn=lambda t: env(t, 0.5, 0.02)))])

# exit: a slide whistle going down, for the walk-off
write("exit.wav", tone(0.8, lambda t: 1400 - 1000 * (t / 0.8) + 30 * math.sin(t * 40),
                       amp_fn=lambda t: 0.6 * env(t, 0.8, 0.05)))
