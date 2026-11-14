"""Original dairy anatomy implicit surface, marching tetrahedra -> compact skinned GLB.
Only numpy + Python standard library. No borrowed mesh or texture.
"""
import json, struct
from pathlib import Path
import numpy as np

OUT=Path(__file__).resolve().parents[2]/'assets/models/prepared/world-detail/cow-surface.glb'
step=.035
axes=[np.arange(a,b+step*.5,step) for a,b in [(-.77,1.25),(.34,1.35),(-.37,.37)]]
X,Y,Z=np.meshgrid(*axes,indexing='ij');P=np.stack([X,Y,Z],-1)

def loft(rows,origin=(0,0,0)):
    rows=np.array(rows,float);x,y,z=X-origin[0],Y-origin[1],Z-origin[2]
    i=np.clip(np.searchsorted(rows[:,0],x)-1,0,len(rows)-2);a,b=rows[i],rows[i+1]
    t=np.clip((x-a[...,0])/(b[...,0]-a[...,0]),0,1);t=t*t*(3-2*t)
    c=a+(b-a)*t[...,None];ry=(c[...,1]-c[...,2])/2;cy=(c[...,1]+c[...,2])/2
    d=(np.sqrt(((y-cy)/ry)**2+(z/c[...,3])**2)-1)*np.minimum(ry,c[...,3])
    return np.maximum(d,np.maximum(rows[0,0]-x,x-rows[-1,0]))

def capsule(a,b,ra,rb):
    a=np.array(a);b=np.array(b);v=b-a;t=np.clip(np.sum((P-a)*v,axis=-1)/np.dot(v,v),0,1)
    return np.linalg.norm(P-(a+t[...,None]*v),axis=-1)-(ra+(rb-ra)*t)

def union(a,b,k=.055):
    h=np.maximum(k-np.abs(a-b),0)/k
    return np.minimum(a,b)-h*h*k*.25

rows=[[-.69,1.04,.67,.05],[-.63,1.13,.57,.18],[-.53,1.18,.50,.235],[-.35,1.17,.43,.28],[-.12,1.16,.415,.305],[.10,1.165,.45,.278],[.29,1.18,.50,.232],[.43,1.19,.51,.19],[.54,1.10,.60,.12],[.59,1.03,.68,.025]]
D=loft(rows)
D=union(D,loft([[-.13,.19,-.20,.16],[0,.23,-.20,.16],[.13,.28,-.14,.12],[.27,.33,-.04,.095],[.37,.33,.06,.085]],(.43,.93,0)),.09)
D=union(D,loft([[-.02,-.09,-.21,.028],[.12,-.025,-.22,.033],[.25,.055,-.10,.028],[.34,.13,.075,.012]],(.43,.93,0)),.035)
D=union(D,loft([[-.07,.085,-.12,.065],[0,.105,-.13,.092],[.10,.07,-.13,.101],[.20,-.025,-.225,.070],[.30,-.12,-.285,.077],[.37,-.17,-.30,.089]],(.80,1.20,0)),.05)
hips=[]
for fore in [True,False]:
    for s in [1,-1]:
        hip=[.43,.91,s*.173] if fore else [-.52,.91,s*.205]
        knee=[.445,.39,s*.173] if fore else [-.405,.62,s*.205]
        hips.append((hip,knee))
        D=union(D,capsule(hip,knee,.068 if fore else .097,.027),.075)
# Fine, anatomical ridge suggestions; too subtle to become decorative ribs.
D -= .018*np.exp(-((X+.53)/.065)**2-((Y-1.10)/.07)**2-((np.abs(Z)-.18)/.075)**2)
D -= .012*np.exp(-((X-.40)/.045)**2-((Y-1.03)/.13)**2-((np.abs(Z)-.16)/.07)**2)
D += .002*np.sin(X*39)*np.exp(-((X+.02)/.42)**2)*np.exp(-((Y-.78)/.24)**2)
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
_,keep,inv=np.unique(np.round(p,6),axis=0,return_index=True,return_inverse=True);p=p[keep];n=n[keep];index=inv.astype(np.uint32)
# Cluster sub-voxel tetrahedron vertices, retaining averaged field normals.
_,groups=np.unique(np.round(p/.016),axis=0,return_inverse=True);cnt=np.bincount(groups);p2=np.zeros((len(cnt),3));n2=np.zeros_like(p2);np.add.at(p2,groups,p);np.add.at(n2,groups,n);p=p2/cnt[:,None];n=n2/np.maximum(np.linalg.norm(n2,axis=1)[:,None],1e-10);tri=groups[index].reshape(-1,3);tri=tri[(tri[:,0]!=tri[:,1])&(tri[:,0]!=tri[:,2])&(tri[:,1]!=tri[:,2])];index=tri.flatten().astype(np.uint32)
u=np.clip((p[:,0]+.69)/1.28,0,1);v=(np.arctan2(p[:,2]/.29,(p[:,1]-.80)/.36)%(2*np.pi))/(2*np.pi);uv=np.stack([u,v],1)
weights=np.zeros((len(p),4),np.float32);joints=np.zeros((len(p),4),np.uint16);weights[:,0]=1
def smoothstep(a,b,v):
    t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
for i,(hip,knee) in enumerate(hips):
    hip=np.array(hip);knee=np.array(knee);t=np.clip((hip[1]-p[:,1])/(hip[1]-knee[1]),0,1);cx=hip[0]+(knee[0]-hip[0])*t
    w=smoothstep(.84,.49,-p[:,1]+1.33)*np.exp(-((p[:,0]-cx)/.105)**4)*smoothstep(.09,.16,np.abs(p[:,2]))
    # Stronger weights at the end of each upper limb, zero inside the trunk.
    w=smoothstep(.86,.49,p[:,1])*np.exp(-((p[:,0]-cx)/.11)**4)*smoothstep(.09,.17,np.abs(p[:,2]))
    w*=((p[:,2]*hip[2])>0)
    sel=w>.005;weights[sel,0]=1-w[sel];weights[sel,1]=w[sel];joints[sel,1]=3+i
neck=smoothstep(.48,.74,p[:,0])*smoothstep(.65,.84,p[:,1]);head=smoothstep(.77,.94,p[:,0]);sel=neck>.001
weights[sel]=0;weights[sel,0]=1-neck[sel];weights[sel,1]=neck[sel]*(1-head[sel]);weights[sel,2]=neck[sel]*head[sel];joints[sel,1]=1;joints[sel,2]=2
# Split cylindrical UV seam vertices; interpolating 0 -> 1 across the face
# otherwise creates a conspicuous zigzag in the coat at the midline.
pp=p.tolist();nn=n.tolist();uu=uv.tolist();ww=weights.tolist();jj=joints.tolist();memo={}
tri=index.reshape(-1,3)
for row in tri:
    if np.ptp(uv[row,1])>.5:
        for k,vtx in enumerate(row.copy()):
            if uv[vtx,1]<.5:
                vtx=int(vtx)
                if vtx not in memo:
                    memo[vtx]=len(pp);pp.append(p[vtx].tolist());nn.append(n[vtx].tolist());uu.append([float(uv[vtx,0]),float(uv[vtx,1]+1)]);ww.append(weights[vtx].tolist());jj.append(joints[vtx].tolist())
                row[k]=memo[vtx]
p=np.array(pp);n=np.array(nn);uv=np.array(uu);weights=np.array(ww,np.float32);joints=np.array(jj,np.uint16);index=tri.flatten().astype(np.uint32)
buffers=[];views=[];accessors=[]
def add(a,component,type_,bounds=False):
    a=np.ascontiguousarray(a);offset=sum(len(b) for b in buffers);data=a.tobytes();data+=b'\0'*((-len(data))%4);buffers.append(data);views.append({'buffer':0,'byteOffset':offset,'byteLength':a.nbytes});ac={'bufferView':len(views)-1,'componentType':component,'count':len(a),'type':type_}
    if bounds:ac.update(min=a.min(0).tolist(),max=a.max(0).tolist())
    accessors.append(ac);return len(accessors)-1
pa=add(p.astype(np.float32),5126,'VEC3',True);na=add(n.astype(np.float32),5126,'VEC3');ua=add(uv.astype(np.float32),5126,'VEC2');ja=add(joints,5123,'VEC4');wa=add(weights,5126,'VEC4');ia=add(index,5125,'SCALAR')
origins=[[0,0,0],[.43,.93,0],[.80,1.20,0]]+[h for h,k in hips]
ibm=[]
for origin in origins:
    m=np.eye(4,dtype=np.float32);m[:3,3]=-np.array(origin);ibm.append(m.T.flatten())
ba=add(np.array(ibm),5126,'MAT4')
nodes=[{'name':'surface-root','children':[1,2,4,5,6,7,8]},{'name':'root'},{'name':'neck','translation':[.43,.93,0],'children':[3]},{'name':'head','translation':[.37,.27,0]}]
for name,(hip,knee) in zip(['front.L','front.R','rear.L','rear.R'],hips):nodes.append({'name':name,'translation':hip})
nodes.append({'name':'CowSkin','mesh':0,'skin':0})
gltf={'asset':{'version':'2.0','generator':'Sigil Cat original anatomy build-cow-surface.py'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,'skins':[{'inverseBindMatrices':ba,'joints':[1,2,3,4,5,6,7]}],'meshes':[{'primitives':[{'attributes':{'POSITION':pa,'NORMAL':na,'TEXCOORD_0':ua,'JOINTS_0':ja,'WEIGHTS_0':wa},'indices':ia}]}],'buffers':[{'byteLength':sum(len(b) for b in buffers)}],'bufferViews':views,'accessors':accessors}
j=json.dumps(gltf,separators=(',',':')).encode();j+=b' '*((-len(j))%4);b=b''.join(buffers);OUT.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(b))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(b),0x004e4942)+b)
print(json.dumps({'vertices':len(p),'triangles':len(index)//3,'bytes':OUT.stat().st_size}))
