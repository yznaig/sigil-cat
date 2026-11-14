"""Make a splat cat solid (Aaron, 2026-11-09: no far whisker or background showing through the head).
Idol leaves the body part see-through. Rather than change any Gaussian he can see (the whiskers stay exactly as they
are), this adds a hidden opaque shell a little under the surface: voxelise the body, fill it, shrink it by DEPTH voxels,
and put one opaque felt-coloured Gaussian in each voxel of that shrunken body's outer layer. Whatever is behind the
body (the far whisker, the background) is then blocked; the surface in front is drawn as before.
Use: python solid.py <in.ply> <out.ply>   (also: from solid import solidify)
"""
import sys
import numpy as np
from plyfile import PlyData, PlyElement

GRID = 48        # voxels across his longest side
DEPTH = 3        # how far under the surface the shell sits, in voxels
CLOSE = 2        # voxels of growth that seal gaps in the surface before the fill (undone after)

def shift(m, axis, d):
    out = np.zeros_like(m)
    src = [slice(None)] * 3; dst = [slice(None)] * 3
    src[axis] = slice(0, -1) if d > 0 else slice(1, None)
    dst[axis] = slice(1, None) if d > 0 else slice(0, -1)
    out[tuple(dst)] = m[tuple(src)]
    return out

def erode(m):
    r = m.copy()
    for a in range(3):
        for d in (-1, 1): r &= shift(m, a, d)
    return r

def dilate(m):
    r = m.copy()
    for a in range(3):
        for d in (-1, 1): r |= shift(m, a, d)
    return r

def shell(xyz):
    """Centres of the shell voxels and the voxel size."""
    lo = xyz.min(0); size = np.ptp(xyz, 0).max() / GRID
    pad = CLOSE + 2                                     # room for the sealing to grow without touching the border
    idx = np.floor((xyz - lo) / size).astype(int) + pad
    occ = np.zeros(idx.max(0) + pad + 1, bool); occ[tuple(idx.T)] = True
    wall = occ
    for _ in range(CLOSE): wall = dilate(wall)          # seal gaps between surface Gaussians
    out = np.zeros_like(occ); out[0, :, :] = out[-1, :, :] = out[:, 0, :] = out[:, -1, :] = out[:, :, 0] = out[:, :, -1] = True
    out &= ~wall
    while True:                                         # flood the outside in from the grid's border
        grown = dilate(out) & ~wall
        if (grown == out).all(): break
        out = grown
    core = ~out
    for _ in range(DEPTH + CLOSE): core = erode(core)   # + CLOSE undoes the sealing
    layer = core & ~erode(core)
    return (np.argwhere(layer) - pad + 0.5) * size + lo, size

def solidify(src, dst):
    v = PlyData.read(src)['vertex'].data
    xyz = np.stack([v['x'], v['y'], v['z']], 1).astype(np.float64)
    a = 1 / (1 + np.exp(-v['opacity'].astype(np.float64)))
    centres, size = shell(xyz[a > 0.3])
    felt = np.median(np.stack([v['f_dc_0'], v['f_dc_1'], v['f_dc_2']], 1)[a > 0.5], 0)
    add = np.zeros(len(centres), v.dtype)
    add['x'], add['y'], add['z'] = centres.T
    for i in range(3): add[f'f_dc_{i}'] = felt[i]
    add['opacity'] = 8.0                                     # sigmoid(8) = 0.9997
    for i in range(3): add[f'scale_{i}'] = np.log(size * 0.6)
    add['rot_0'] = 1.0
    PlyData([PlyElement.describe(np.concatenate([v, add]), 'vertex')]).write(dst)
    return len(add)

if __name__ == '__main__':
    print('added', solidify(sys.argv[1], sys.argv[2]))
