"""Original closed cumulus surface: smooth lobe unions + deterministic billows.
Python/numpy only; no external meshes, photos, textures or volumetric pass.
"""
import json, struct
from pathlib import Path
import numpy as np
OUT=Path(__file__).resolve().parents[2]/'assets/models/prepared/world-detail/cloud-surface.glb'
step=.025
axes=[np.arange(a,b+step*.5,step) for a,b in [(-.56,.57),(-.06,.57),(-.37,.37)]]
X,Y,Z=np.meshgrid(*axes,indexing='ij');P=np.stack([X,Y,Z],-1)
def ellipsoid(c,r):
    return (np.linalg.norm((P-np.array(c))/np.array(r),axis=-1)-1)*min(r)
def union(a,b,k=.045):
    h=np.maximum(k-np.abs(a-b),0)/k
    return np.minimum(a,b)-h*h*k*.25
lobes=[([-.30,.15,0],[.19,.14,.17]),([-.12,.24,.015],[.23,.225,.215]),([.13,.20,.015],[.22,.18,.21]),([.32,.135,0],[.17,.125,.16])]
D=ellipsoid(*lobes[0])
for c,r in lobes[1:]:D=union(D,ellipsoid(c,r),.065)
# Satellite lobes overlap deeply: a continuous sculpted body, not separate balls.
for c,r in [([-.39,.19,.05],[.09,.085,.095]),([-.26,.28,.08],[.12,.12,.13]),([-.12,.395,-.015],[.12,.105,.13]),([.06,.32,.07],[.12,.12,.13]),([.23,.245,.05],[.115,.11,.13]),([.36,.19,-.04],[.09,.085,.09]),([-.20,.19,.17],[.115,.11,.09]),([.04,.15,.19],[.13,.105,.08]),([.23,.14,.15],[.10,.085,.08]),([-.26,.20,-.15],[.11,.11,.08]),([-.04,.31,-.16],[.11,.10,.09]),([.18,.20,-.16],[.11,.11,.09])]:D=union(D,ellipsoid(c,r),.035)
# Correlated surface perturbation gives small rolling cloudlets, never granular grit.
D += .005*np.sin(X*43+np.sin(Z*25))*np.sin(Y*38+Z*12)*np.sin(Z*37+X*8)
D += .002*np.sin(X*83+Y*29)*np.sin(Y*74-Z*22)*np.sin(Z*79)
# Broad, softly uneven storm base closes the underside.
base=.025+.012*np.sin(X*15)*np.cos(Z*13)+.005*np.cos(X*26)*np.sin(Z*29)
h=np.maximum(.045-np.abs(D-(base-Y)),0)/.045
D=np.maximum(D,base-Y)+h*h*.045*.25
G=np.stack(np.gradient(D,step,step,step),-1)
corners=np.array([[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]])
tets=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
edges=[(0,1),(1,2),(2,0),(0,3),(1,3),(2,3)]
table={1:[0,3,2],2:[0,1,4],3:[1,4,2,2,4,3],4:[1,2,5],5:[0,3,5,0,5,1],6:[0,2,5,0,5,4],7:[5,4,3],8:[3,4,5],9:[4,5,0,5,2,0],10:[1,5,0,5,3,0],11:[5,2,1],12:[3,4,2,2,4,1],13:[4,1,0],14:[2,3,0]}
shape=np.array(D.shape)-1
cell=np.stack(np.meshgrid(*[np.arange(v) for v in shape],indexing='ij'),-1).reshape(-1,3)
cs=cell[:,None,:]+corners[None,:,:]
vals=D[cs[:,:,0],cs[:,:,1],cs[:,:,2]]
active=(vals.min(1)<0)&(vals.max(1)>=0);cs=cs[active];vals=vals[active]
allp=[];alln=[]
for tet in tets:
    ids=cs[:,tet];v=vals[:,tet];pos=P[ids[:,:,0],ids[:,:,1],ids[:,:,2]];grad=G[ids[:,:,0],ids[:,:,1],ids[:,:,2]]
    codes=np.sum((v<0)*(1<<np.arange(4)),axis=1)
    for code,ee in table.items():
        mask=codes==code
        if not mask.any():continue
        vv=v[mask];pp=pos[mask];nn=grad[mask];outp=[];outn=[]
        for e in ee:
            a,b=edges[e];t=vv[:,a]/(vv[:,a]-vv[:,b]);outp.append(pp[:,a]+(pp[:,b]-pp[:,a])*t[:,None]);outn.append(nn[:,a]+(nn[:,b]-nn[:,a])*t[:,None])
        allp.append(np.stack(outp,1).reshape(-1,3));alln.append(np.stack(outn,1).reshape(-1,3))
p=np.concatenate(allp);n=np.concatenate(alln);n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-10)
# Orient triangles using the implicit field's outward gradient.
pp=p.reshape(-1,3,3);nn=n.reshape(-1,3,3);flip=np.sum(np.cross(pp[:,1]-pp[:,0],pp[:,2]-pp[:,0])*nn.mean(1),axis=1)<0
pp[flip]=pp[flip][:,[0,2,1]];nn[flip]=nn[flip][:,[0,2,1]]
p=pp.reshape(-1,3);n=nn.reshape(-1,3)
_,keep,inv=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);p=p[keep];n=n[keep];index=inv.astype(np.uint16)
tri=index.reshape(-1,3)
edges=np.sort(np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]),axis=1)
_,counts=np.unique(edges,axis=0,return_counts=True)
assert np.all(counts==2), 'Cloud must be a closed two-manifold surface'
buffers=[];views=[];accessors=[]
def add(a,component,type_,bounds=False):
    a=np.ascontiguousarray(a);offset=sum(len(b) for b in buffers);data=a.tobytes();data+=b'\0'*((-len(data))%4);buffers.append(data);views.append({'buffer':0,'byteOffset':offset,'byteLength':a.nbytes});ac={'bufferView':len(views)-1,'componentType':component,'count':len(a),'type':type_}
    if bounds:ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
    accessors.append(ac);return len(accessors)-1
pa=add(p.astype(np.float32),5126,'VEC3',True);na=add(n.astype(np.float32),5126,'VEC3');ia=add(index,5123,'SCALAR')
gltf={'asset':{'version':'2.0','generator':'Sigil Cat original build-cloud-surface.py'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'ClosedCumulus','mesh':0}],'meshes':[{'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na},'indices':ia}]}],'buffers':[{'byteLength':sum(len(b) for b in buffers)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);b=b''.join(buffers);OUT.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
print(json.dumps({'vertices':len(p),'triangles':len(index)//3,'bytes':OUT.stat().st_size}))
