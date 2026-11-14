#!/usr/bin/env python3
"""Original bird flap and controller pop (the trailer slam was removed in playtest-2). No recordings or sample packs.
Mono 48 kHz / 24 bit; loudest 100 ms RMS -22 dBFS; peaks <= -4 dBFS.
Also updates the existing provenance ledger and independently decoded measurements.
"""
import json, math, random, struct, wave
from pathlib import Path
from measure import measure
RATE=48000
root=Path(__file__).resolve().parents[2]
rng=random.Random(111111)
def write(name,seconds,sample):
    samples=[sample(i/RATE)*min(1,i/(RATE*.003))*min(1,(seconds-i/RATE)/.045) for i in range(round(RATE*seconds))]
    win=4800;acc=0;peak_rms=0
    for i,x in enumerate(samples):
        acc+=x*x
        if i>=win: acc-=samples[i-win]**2
        if i>=win-1: peak_rms=max(peak_rms,math.sqrt(max(0,acc)/win))
    gain=min(10**(-22/20)/peak_rms,10**(-4/20)/max(map(abs,samples)))
    path=root/f'assets/audio/designed/{name}.wav'
    with wave.open(str(path),'wb') as w:
        w.setnchannels(1);w.setsampwidth(3);w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<i',round(x*gain*8388607))[:3] for x in samples))
    return str(path.relative_to(root)),measure(path)
rows=dict([write('bird-flap',.16,lambda t:math.sin(2*math.pi*(560*t-900*t*t))*math.exp(-t*30)+rng.uniform(-1,1)*.22*math.exp(-t*45)),
    write('controller-pop',.23,lambda t:math.sin(2*math.pi*(95*t+2.8*(1-math.exp(-t*45))))*math.exp(-t*24))])
manifest_path=root/'assets/audio/design-manifest.json';manifest=json.loads(manifest_path.read_text())
for path in rows: manifest['provenance'][path]={'source':'tools/audio/make-bird.py','license':'Original synthesis — Sigil Cat','author':'Sigil Cat'}
manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
levels_path=root/'docs/sound-levels.json';levels=json.loads(levels_path.read_text());levels.update(rows)
levels_path.write_text(json.dumps(levels,indent=2)+'\n')
print(json.dumps(rows,indent=2))
