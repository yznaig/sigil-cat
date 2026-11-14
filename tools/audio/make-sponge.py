"""Original damp sponge synthesis. Python stdlib + ffmpeg; no recordings."""
import math, random, struct, subprocess, tempfile, wave
from pathlib import Path
rng=random.Random(811); rate=44100; duration=.42; low=0; slower=0; samples=[]
for i in range(int(rate*duration)):
 t=i/rate; low += .065*(rng.uniform(-1,1)-low); slower += .012*(low-slower)
 env=math.sin(math.pi*t/duration)**1.4
 bubbles=sum(math.sin(2*math.pi*(f*t-60*t*t))*math.exp(-((t-c)/.035)**2) for f,c in [(185,.09),(240,.21),(150,.32)])
 samples.append(env*(.55*(low-slower)+.035*bubbles))
peak=max(map(abs,samples)); samples=[s/peak*.38 for s in samples]
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'sponge.wav'
 with wave.open(str(p),'wb') as w:
  w.setparams((1,2,rate,0,'NONE','not compressed')); w.writeframes(b''.join(struct.pack('<h',round(s*32767)) for s in samples))
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(p),'-codec:a','libmp3lame','-q:a','4','assets/audio/sfx/sponge-wipe.mp3'],check=True)
