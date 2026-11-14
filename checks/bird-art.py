"""Functional asset integrity, not a performance gate."""
from pathlib import Path
import hashlib,json
import numpy as np
import struct,zlib

class Image:
    """The few Pillow calls this check makes, for 8-bit non-interlaced RGB/RGBA
    PNGs (every file it reads). Pillow is not installed on the check host."""
    def __init__(self,pixels,mode):
        self.pixels,self.mode=pixels,mode;self.size=(pixels.shape[1],pixels.shape[0])
    def __array__(self,dtype=None,copy=None):
        return self.pixels if dtype is None else self.pixels.astype(dtype)
    def convert(self,mode):
        assert mode=='RGB';return Image(self.pixels[:,:,:3],'RGB')
    @staticmethod
    def open(path):
        data=Path(path).read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
        at,idat=8,b''
        while at<len(data):
            n,kind=struct.unpack('>I4s',data[at:at+8]);body=data[at+8:at+8+n];at+=12+n
            if kind==b'IHDR':w,h,depth,ctype,_,_,lace=struct.unpack('>IIBBBBB',body)
            elif kind==b'IDAT':idat+=body
        assert depth==8 and ctype in (2,6) and lace==0,(path,depth,ctype,lace)
        bpp=3 if ctype==2 else 4;stride=w*bpp;raw=zlib.decompress(idat)
        out=np.zeros((h,stride),np.uint8);prev=np.zeros(stride,np.int32)
        for y in range(h):
            f=raw[y*(stride+1)];line=np.frombuffer(raw,np.uint8,stride,y*(stride+1)+1).astype(np.int32)
            if f==0:cur=line
            elif f==2:cur=(line+prev)&255
            else:
                cur=line.copy();up=prev
                for x in range(stride):
                    a=cur[x-bpp] if x>=bpp else 0;b=up[x];c=up[x-bpp] if x>=bpp else 0
                    if f==1:pred=a
                    elif f==3:pred=(a+b)>>1
                    else:
                        pa,pb,pc=abs(b-c),abs(a-c),abs(a+b-2*c);pred=a if pa<=pb and pa<=pc else b if pb<=pc else c
                    cur[x]=(cur[x]+pred)&255
            out[y]=cur;prev=cur
        return Image(out.reshape(h,w,bpp),'RGB' if ctype==2 else 'RGBA')

source=Path('assets/flappy/cat-bird-source.png')
layout=json.loads(Path('assets/flappy/cat-bird.frames.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest()==layout['sourceSha256']
assert Image.open(source).size==tuple(layout['sourceSize'])
print('CHECK bird supplied source preserved byte-for-byte: PASS')
path=Path('assets/flappy/cat-bird.png');image=Image.open(path);pixels=np.asarray(image)
assert image.size==(84,28) and image.mode=='RGBA'
assert hashlib.sha256(path.read_bytes()).hexdigest()==layout['outputSha256']
assert set(np.unique(pixels[:,:,3]))=={0,255}
assert np.all(pixels[pixels[:,:,3]==0]==0)
p=pixels.astype(np.int16)
pink=(np.minimum(p[:,:,0],p[:,:,2])-p[:,:,1]>8)&(p[:,:,3]>0)
assert not pink.any()
print('CHECK bird binary alpha and clean key have zero pink fringe pixels: PASS')
regions=[pixels[:,n*28+15:(n+1)*28] for n in range(3)]
assert all(np.array_equal(regions[1],x) for x in regions)
assert not np.array_equal(pixels[:,:15],pixels[:,28:43])
assert not np.array_equal(pixels[:,28:43],pixels[:,56:71])
assert layout['order']==[0,1,2,1]
print('CHECK bird shared body stays identical while original wing poses differ: PASS')
original={tuple(c) for c in np.asarray(Image.open(source).convert('RGB')).reshape(-1,3)}
assert all(tuple(c[:3]) in original for c in pixels.reshape(-1,4) if c[3])
print('CHECK bird output uses only original source colours without blur or repaint: PASS')
assert hashlib.sha256(Path('assets/splats/controller-1.spz').read_bytes()).hexdigest()=='f66abb913861dd06a0e22fa9a2b69a359fe6dd0351a2b2e6a96c7445e9d84c8f'
hull=json.loads(Path('assets/splats/controller-1.colliders.json').read_text())
assert hull['source']=='controller-1.spz' and all(len(h)%9==0 and len(h)>36 for h in hull['hulls'])
print('CHECK bird selected controller splat is unchanged and has a baked hull: PASS')
root=Path('vendor/floppybird')
for name,digest in json.loads((root/'upstream-sha256.json').read_text()).items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
assert Image.open(root/'assets/pipe-up.png').size==(52,26)
assert Image.open(root/'assets/pipe-down.png').size==(52,26)
assert Image.open(root/'assets/font_big_0.png').size==(24,36)
print('CHECK bird classic sprites and Apache-2.0 upstream sources match their pinned hashes: PASS')
