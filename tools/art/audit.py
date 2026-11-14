"""Audit prepared-art handoff data, not the production runtime's cost gates.
Run after tools/art/render.mjs has rendered the full collection.
"""
import gzip
import json
from pathlib import Path

root = Path(__file__).resolve().parents[2]
names = ['rack', 'bulb', 'hats-wizard', 'hats-cone', 'hats-party',
         'hats-crown', 'tin', 'shelf', 'box', 'flour', 'bucket',
         'pitchfork', 'hay', 'cake', 'cow']
rows = []
for name in names:
    shot = root / 'docs/shots/art' / f'{name}.jpg'
    data = json.loads(shot.with_suffix('.json').read_text())
    assert shot.stat().st_size > 1000, name
    assert data['finite'] and not data['errors'], name
    assert data['triangles'] > 0 and data['meshes'] > 0, name
    assert data['physics']['mass'] >= 0, name
    for part in data['parts']:
        assert part['physics']['colliders'], (name, part['name'])
        for shape in part['physics']['colliders']:
            assert shape['type'] in ['box', 'sphere', 'cone', 'cylinder', 'capsule', 'convex'], shape
            if 'size' in shape:
                assert all(v > 0 for v in shape['size']), shape
            if 'radius' in shape:
                assert shape['radius'] > 0, shape
            if 'vertices' in shape:
                assert len(shape['vertices']) >= 4, shape
    rows.append({k: data[k] for k in ['name', 'variant', 'triangles', 'meshes', 'geometryBytes', 'textures']})

modules = sorted((root / 'assets/models/prepared').glob('*.js'))
out = {'scope': '15 requested assets; variants excluded from aggregate; no runtime cost gate claim',
       'allGeometryFinite': True, 'browserErrors': 0,
       'moduleBytes': sum(p.stat().st_size for p in modules),
       'moduleGzipBytes': sum(len(gzip.compress(p.read_bytes(), mtime=0)) for p in modules),
       'triangles': sum(r['triangles'] for r in rows),
       'geometryBytes': sum(r['geometryBytes'] for r in rows),
       'meshes': sum(r['meshes'] for r in rows), 'assets': rows}
(root / 'docs/shots/art/audit.json').write_text(json.dumps(out, indent=2) + '\n')
print(json.dumps({k: v for k, v in out.items() if k != 'assets'}, indent=2))
