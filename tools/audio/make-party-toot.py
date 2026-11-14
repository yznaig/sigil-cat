#!/usr/bin/env python3
"""Original small paper-reed birthday blower. Unit-10 contract: mono 48k/24-bit WAV,
max 100ms RMS -22dBFS; sample peak <=-4dBFS. No external samples/dependencies."""
import math, random, struct, wave
from pathlib import Path
RATE=48000
rng=random.Random(8112026)
samples=[];phase=0;noise=0
for i in range(int(RATE*1.25)):
    t=i/RATE
    # A breathy reed rises, holds, then loses pressure in a brief paper raspberry.
    f=370+46*(1-math.exp(-t*12))-125*max(0,(t-.82)/.43)**2+4*math.sin(t*32)
    phase+=2*math.pi*f/RATE
    env=min(1,t/.045)*min(1,max(0,(1.22-t)/.22))
    noise=.72*noise+.28*rng.uniform(-1,1)
    reed=sum(math.sin(phase*n)/n**1.4 for n in range(1,8))
    flutter=1-.23*max(0,(t-.8)/.45)*(1+math.sin(t*180))
    samples.append(env*(reed*.5*flutter+noise*.17))
win=int(RATE*.1); acc=0;peak_rms=0
for i,x in enumerate(samples):
    acc+=x*x
    if i>=win:acc-=samples[i-win]**2
    if i>=win-1:peak_rms=max(peak_rms,math.sqrt(max(0,acc)/win))
gain=min(10**(-22/20)/peak_rms,10**(-4/20)/max(map(abs,samples)))
path=Path('assets/audio/designed/party-toot.wav');path.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(path),'wb') as w:
    w.setnchannels(1);w.setsampwidth(3);w.setframerate(RATE)
    w.writeframes(b''.join(struct.pack('<i',round(x*gain*8388607))[:3] for x in samples))
print(f'{path}: {path.stat().st_size} bytes; 1.25s, peak {20*math.log10(max(map(abs,samples))*gain):.2f} dBFS, max 100ms RMS {20*math.log10(peak_rms*gain):.2f} dBFS')
