#!/usr/bin/env python3
"""Aaron's e1111-13 art: deterministic key, grid recovery and body registration.
No generated/redrawn pixels. Run with the Idol venv (Pillow + NumPy).
"""
from pathlib import Path
import hashlib,json
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/flappy/cat-bird-source.png'
rgb=np.asarray(Image.open(SOURCE).convert('RGB'))
height,width,_=rgb.shape
assert width==height*3, (width,height)
frames=[rgb[:,n*height:(n+1)*height] for n in range(3)]
def foreground(a):
    p=a.astype(np.int16)
    return np.minimum(p[:,:,0],p[:,:,2])-p[:,:,1]<=8
masks=[foreground(a) for a in frames]
# The right face and ear, unlike the wing, occupy the same bounds in each pose.
right=[int(np.where(m)[1].max()) for m in masks]
top=[int(np.where(m)[0].min()) for m in masks]
offsets=[(right[0]-x,top[0]-y) for x,y in zip(right,top)]
aligned=[]
for mask,(dx,dy) in zip(masks,offsets):
    a=np.zeros_like(mask)
    a[dy:,dx:]=mask[:height-dy,:height-dx]
    aligned.append(a)
# Recover the repeated horizontal staircase spacing on the shared face.
# The generator's source grid is slightly irregular; use its strongest pitch,
# rounded to a fifth of a source pixel, for a single clean square output grid.
edge=sum(np.abs(np.diff(a[:,400:650].astype(float),axis=1)).sum(axis=0) for a in aligned)
pitches=np.arange(17.5,19,.01)
scores=[abs(np.sum(edge*np.exp(2j*np.pi*np.arange(len(edge))/pitch))) for pitch in pitches]
measured=float(pitches[int(np.argmax(scores))])
pitch=round(measured*5)/5
left=min(int(np.where(a)[1].min()) for a in aligned)
origin=(round(left-pitch/4),top[0])
size=28
sheet=np.zeros((size,size*3,4),dtype=np.uint8)
for n,(a,(dx,dy)) in enumerate(zip(frames,offsets)):
    # Nearest-neighbour point samples at cell centres, with no colour averaging.
    xs=np.rint(origin[0]+pitch*(np.arange(size)+.5)-dx).astype(int)
    ys=np.rint(origin[1]+pitch*(np.arange(size)+.5)-dy).astype(int)
    pixels=a[np.ix_(ys,xs)]
    mask=foreground(pixels)
    sheet[:,n*size:(n+1)*size,:3]=np.where(mask[:,:,None],pixels,0)
    sheet[:,n*size:(n+1)*size,3]=mask.astype(np.uint8)*255
# Keep the shared face/ear/right torso exactly still. These are untouched pixels
# from the level pose, not repainted art. All moving-wing pixels remain their own.
for n in (0,2): sheet[:,n*size+15:(n+1)*size]=sheet[:,size+15:2*size]
target=ROOT/'assets/flappy/cat-bird.png'
Image.fromarray(sheet).save(target)
layout={
    'source':'cat-bird-source.png','sourceSize':[width,height],
    'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
    'frameWidth':size,'frameHeight':size,'columns':3,'rows':1,
    'frames':['wings up','wings level','wings down'],'order':[0,1,2,1],
    'sourceTranslations':[list(v) for v in offsets],
    'measuredGridPitch':round(measured,3),'sampleGridPitch':pitch,'sampleOrigin':list(origin),
    'stationaryRegion':{'x':15,'y':0,'width':13,'height':28,'referenceFrame':1},
    'body':{'x':5,'y':7,'width':22,'height':15,'shape':'ellipse'},
    'pivot':[16,14.5],'fitBodyTo':[34,24],
    'key':'min(red, blue) - green > 8 => transparent; binary alpha; transparent RGB zeroed',
    'sampling':'nearest cell-centre samples only; no blur, quantization, drawing, eye or butter added',
    'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),
}
target.with_suffix('.frames.json').write_text(json.dumps(layout,indent=2)+'\n')
print(json.dumps({'source':layout['sourceSize'],'offsets':offsets,'pitch':pitch,'output':list(Image.open(target).size),'opaquePinkPixels':int(np.sum((sheet[:,:,3]>0)&~foreground(sheet[:,:,:3])))}))
