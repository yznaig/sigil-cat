"""Fetch the attributed, revision-pinned source into /tmp; verify every byte."""
import argparse, hashlib, json, urllib.request
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--output',default='/tmp/cow-source');args=parser.parse_args()
manifest=Path(__file__).resolve().parents[2]/'assets/models/prepared/cow-real/source-provenance.json'
for entry in json.loads(manifest.read_text())['sourceFiles']:
 target=Path(args.output)/entry['path']
 if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==entry['sha256']:
  print('verified',entry['path']);continue
 request=urllib.request.Request(entry['url'],headers={'User-Agent':'SigilCat-art/1.0'})
 with urllib.request.urlopen(request,timeout=90) as response:data=response.read()
 assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],entry['path']
 target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data);print('fetched',entry['path'])
