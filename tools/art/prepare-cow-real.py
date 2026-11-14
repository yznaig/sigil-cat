"""Repack Rukh3D's CC-BY-4.0 cow. Original source/skin/UV geometry retained.
Input: extracted glTF at /tmp/cow-source (or command-line argument).
Output: self-contained GLB, only live buffer views, 16-bit source indices.
"""
import json, struct, sys, hashlib, argparse
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--source',default='/tmp/cow-source');parser.add_argument('--motion');parser.add_argument('--colors');args=parser.parse_args();src=Path(args.source)
out=Path(__file__).resolve().parents[2]/'assets/models/prepared/cow-real'
g=json.loads((src/'scene.gltf').read_text());raw=(src/'scene.bin').read_bytes()
# Only the authored walk/graze are delivered; unused source combat clips are removed.
g['animations']=[]
# Mammal hide/eyes are dielectric, not the source export's .70/.56 metallic values.
for m in g['materials']:
 m['pbrMetallicRoughness']['metallicFactor']=0
 m['pbrMetallicRoughness']['roughnessFactor']=.84 if m['name']=='material' else .28
 m.pop('extensions',None)
g.pop('extensionsUsed',None);g.pop('extensionsRequired',None)
used=set()
for m in g['meshes']:
 for p in m['primitives']:used.update(p['attributes'].values());used.add(p['indices'])
for s in g['skins']:used.add(s['inverseBindMatrices'])
for a in g['animations']:
 for s in a['samplers']:used.update([s['input'],s['output']])
accmap={a:i for i,a in enumerate(sorted(used))};accessors=[g['accessors'][a] for a in sorted(used)]
for m in g['meshes']:
 for p in m['primitives']:p['attributes']={k:accmap[v] for k,v in p['attributes'].items()};p['indices']=accmap[p['indices']]
for s in g['skins']:s['inverseBindMatrices']=accmap[s['inverseBindMatrices']]
for a in g['animations']:
 for s in a['samplers']:s['input']=accmap[s['input']];s['output']=accmap[s['output']]
views=[];chunks=[];viewmap={}
def append(data,target=None):
 off=sum(map(len,chunks));chunks.append(data+b'\0'*((-len(data))%4));v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
 if target:v['target']=target
 views.append(v);return len(views)-1
for a in accessors:
 old=a['bufferView']
 if old not in viewmap:
  v=g['bufferViews'][old];off=v.get('byteOffset',0);new=append(raw[off:off+v['byteLength']],v.get('target'));viewmap[old]=new
  if 'byteStride' in v:views[new]['byteStride']=v['byteStride']
 a['bufferView']=viewmap[old]
for im in g['images']:
 data=(src/im.pop('uri')).read_bytes();im['bufferView']=append(data);im['mimeType']='image/jpeg'
if args.colors:
 colors=json.loads(Path(args.colors).read_text())
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   if g['materials'][p['material']]['name']!='material':continue
   assert accessors[p['attributes']['POSITION']]['count']==colors['vertices']
   p['attributes']['COLOR_0']=len(accessors)
   accessors.append({'bufferView':append(bytes(colors['colors']),34962),'componentType':5121,'normalized':True,'count':colors['vertices'],'type':'VEC3'})
if args.motion:
 for clip in json.loads(Path(args.motion).read_text()):
  def floats(values,kind,count,bounds=False):
   v=append(struct.pack('<'+'f'*len(values),*values));a={'bufferView':v,'componentType':5126,'count':count,'type':kind}
   if bounds:a.update(min=[min(values)],max=[max(values)])
   accessors.append(a);return len(accessors)-1
  time=floats(clip['times'],'SCALAR',len(clip['times']),True);animation={'name':clip['name'],'samplers':[],'channels':[]}
  for ch in clip['channels']:
   output=floats(ch['values'],'VEC4' if ch['path']=='rotation' else 'VEC3',len(clip['times']));sampler=len(animation['samplers']);animation['samplers'].append({'input':time,'output':output,'interpolation':'LINEAR'});animation['channels'].append({'sampler':sampler,'target':{'node':ch['node'],'path':ch['path']}})
  g['animations'].append(animation)
g['accessors']=accessors;g['bufferViews']=views;g['buffers']=[{'byteLength':sum(map(len,chunks))}]
g['asset']['generator']='Sigil Cat prepare-cow-real.py; source Sketchfab export'
g['asset']['extras']['modifications']='Repacked live buffers; embedded source JPEGs; corrected mammal material metalness/roughness; vertex cavity shading and hoof pigment. Geometry, UVs, weights and source rig preserved; unused source animations removed; original Sigil Cat walk and graze clips.'
data=json.dumps(g,separators=(',',':')).encode();data+=b' '*((-len(data))%4);binary=b''.join(chunks);glb=struct.pack('<III',0x46546c67,2,28+len(data)+len(binary))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(binary),0x004e4942)+binary
(out/'cow.glb').write_bytes(glb)
print(json.dumps({'bytes':len(glb),'sha256':hashlib.sha256(glb).hexdigest(),'clips':[a['name'] for a in g['animations']]}))
