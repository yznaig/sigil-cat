"""pose_gen.py: AI pose meshes for the Sigil Cat's sculpted pose shapes, from the sheet's pose images.

One process, the pipeline loaded once, every pose and seed in a loop (RAM is shared with other work on this
machine). Refuses to start with less than MIN_AVAILABLE_GB available. Octree 256 is plenty for a wrap target.
Runs in the Hunyuan3D venv:
  HF_HUB_OFFLINE=1 ~/ai/hy3d-venv/bin/python pose_gen.py <crops dir> <out dir> pose:views[:seed,seed] ...
  e.g. sleep:front+left:1234,7 loaf:front+right+back:1234
  views: which cameras get an image. front -> <pose>-front.png, left/right -> <pose>-side.png (the sheet's side
  view, whose handedness is unknown, so try both), back -> <pose>-back.png.
Crops: <crops dir>/<pose>-<view>.png, square, cat centred (cut by make_crops.py from docs/reference/poses/).
"""
import sys, os, time, gc

MIN_AVAILABLE_GB = 18
FILE = dict(front="front", left="side", right="side", back="back")

def available_gb():
    for line in open("/proc/meminfo"):
        if line.startswith("MemAvailable:"):
            return int(line.split()[1]) / 2**20
    return 0

crops, out = sys.argv[1], sys.argv[2]
jobs = []
for spec in sys.argv[3:]:
    parts = spec.split(":")
    seeds = [int(s) for s in (parts[2] if len(parts) > 2 else "1234").split(",")]
    jobs += [(parts[0], parts[1], s) for s in seeds]
avail = available_gb()
print(f"available {avail:.1f} GB", flush=True)
if avail < MIN_AVAILABLE_GB:
    sys.exit(f"not starting: {avail:.1f} GB available, need {MIN_AVAILABLE_GB}")

import torch
from PIL import Image
from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline

rembg = BackgroundRemover()
pipe = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2mv", subfolder="hunyuan3d-dit-v2-mv")
gc.collect()
os.makedirs(out, exist_ok=True)
for pose, view, seed in jobs:
    t = time.time()
    if available_gb() < 2.5:   # the loaded pipeline itself takes ~13 GB; this only guards against other work growing
        print(f"stopping early: only {available_gb():.1f} GB available", flush=True)
        break
    imgs = {v: rembg(Image.open(os.path.join(crops, f"{pose}-{FILE[v]}.png")).convert("RGB")) for v in view.split("+")}
    mesh = pipe(image=imgs, num_inference_steps=50, octree_resolution=256, num_chunks=20000,
                generator=torch.manual_seed(seed), output_type="trimesh")[0]
    name = f"local-pose-{pose}-{view}-s{seed}"
    mesh.export(os.path.join(out, name + ".glb"))
    del mesh
    gc.collect(); torch.cuda.empty_cache()
    print(f"{name}: {time.time() - t:.0f}s, available now {available_gb():.1f} GB", flush=True)
