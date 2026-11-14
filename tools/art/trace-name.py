"""Trace the four-character name out of Aaron's picture into clean vector outlines.
No original artwork exists (revamp brief, Decided 2), so: crop the name from docs/reference/name-mark-crop.png, enlarge
it, find the edge of the ink at half-way between ink and paper (marching squares, sub-pixel), drop the specks, thin
each outline to its corners and curves and write them as one SVG path of smooth curves.
Run from the repo root: python3 tools/art/trace-name.py   (needs numpy and ffmpeg) -> assets/art/name-mark.svg
"""
import subprocess, numpy as np, sys

SRC, OUT = 'docs/reference/name-mark-crop.png', 'assets/art/name-mark.svg'
CROP = (232, 0, 290, 110)      # x, y, w, h of the name in the picture
UP = 8                         # enlargement before tracing
TOL = 1.5                      # how far (enlarged px) the thinned outline may stray from the traced one
STRAIGHT = 11                  # a run this long (the mark is 100 tall) between kept points is drawn as a straight line

x, y, w, h = CROP
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', SRC, '-vf', f'crop={w}:{h}:{x}:{y},scale=iw*{UP}:ih*{UP}:flags=bicubic,format=gray',
                      '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
W, H = w * UP, h * UP
img = np.frombuffer(raw, np.uint8).reshape(H, W).astype(np.float32)
# a light blur so JPEG speckle does not notch the outline
k = np.array([1, 4, 6, 4, 1], np.float32); k /= k.sum()
for _ in range(5):
    img = np.apply_along_axis(lambda r: np.convolve(r, k, mode='same'), 1, img)
    img = np.apply_along_axis(lambda c: np.convolve(c, k, mode='same'), 0, img)
ink, paper = np.percentile(img, 2), np.percentile(img, 90)
level = (ink + paper) / 2
f = level - img                 # > 0 inside the ink

# marching squares. Every crossing of the ink's edge sits on one grid edge (named by that edge), and each cell joins
# its crossings in pairs; walking from crossing to crossing gives closed outlines.
inside = f > 0
pt, link = {}, {}
def cross(key, p, q, a, b):
    if key not in pt: t = a / (a - b); pt[key] = (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
    return key
def join(k1, k2): link.setdefault(k1, []).append(k2); link.setdefault(k2, []).append(k1)
ys, xs = np.nonzero((inside[:-1, :-1] != inside[:-1, 1:]) | (inside[:-1, :-1] != inside[1:, :-1]) | (inside[1:, 1:] != inside[:-1, 1:]) | (inside[1:, 1:] != inside[1:, :-1]))
for j, i in zip(ys.tolist(), xs.tolist()):
    a, b, c, d = f[j, i], f[j, i + 1], f[j + 1, i + 1], f[j + 1, i]      # top-left, top-right, bottom-right, bottom-left
    e = {}
    if (a > 0) != (b > 0): e['t'] = cross(('h', i, j), (i, j), (i + 1, j), a, b)
    if (b > 0) != (c > 0): e['r'] = cross(('v', i + 1, j), (i + 1, j), (i + 1, j + 1), b, c)
    if (d > 0) != (c > 0): e['b'] = cross(('h', i, j + 1), (i, j + 1), (i + 1, j + 1), d, c)
    if (a > 0) != (d > 0): e['l'] = cross(('v', i, j), (i, j), (i, j + 1), a, d)
    if len(e) == 2: join(*e.values())
    elif len(e) == 4:                                                    # a saddle: keep the ink joined through the middle
        if (a + b + c + d) > 0: pairs = [('t', 'r'), ('b', 'l')] if a <= 0 else [('t', 'l'), ('b', 'r')]
        else: pairs = [('t', 'l'), ('b', 'r')] if a <= 0 else [('t', 'r'), ('b', 'l')]
        for u, v in pairs: join(e[u], e[v])
loops, seen = [], set()
for start in list(link):
    if start in seen or len(link[start]) != 2: continue
    loop, prev, cur = [start], None, start
    while True:
        seen.add(cur)
        nxt = [k for k in link[cur] if k != prev]
        nxt = nxt[0] if nxt else None
        if nxt is None or nxt == start or nxt in seen: break
        loop.append(nxt); prev, cur = cur, nxt
    loops.append(np.array([pt[k] for k in loop]))
def area(p): return 0.5 * float(np.sum(p[:, 0] * np.roll(p[:, 1], -1) - np.roll(p[:, 0], -1) * p[:, 1]))
loops = [l for l in loops if abs(area(l)) > 40 * UP]
# the picture's "!!!" pokes into the bottom of the crop: drop outlines that touch the bottom edge
loops = [l for l in loops if l[:, 1].max() < H - 2]

def rdp(p, tol):
    if len(p) < 3: return p
    a, b = p[0], p[-1]; ab = b - a; n = np.hypot(*ab) or 1
    d = np.abs(ab[0] * (p[:, 1] - a[1]) - ab[1] * (p[:, 0] - a[0])) / n
    i = int(d.argmax())
    if d[i] <= tol: return np.array([a, b])
    return np.vstack([rdp(p[:i + 1], tol)[:-1], rdp(p[i:], tol)])
def simplify(loop):
    far = int(np.argmax(np.hypot(*(loop - loop[0]).T)))
    return np.vstack([rdp(loop[:far + 1], TOL)[:-1], rdp(np.vstack([loop[far:], loop[:1]]), TOL)[:-1]])
def path(p):
    # Long runs between kept points are straight lines; sharp turns stay corners; the rest is one smooth curve
    # through the points, leaving each straight run along its own direction.
    n = len(p)
    seg = [p[(i + 1) % n] - p[i] for i in range(n)]
    ln = [float(np.hypot(*v)) for v in seg]
    straight = [l > STRAIGHT for l in ln]
    def turn(i):
        u, v = seg[i - 1], seg[i]
        return abs(np.degrees(np.arctan2(u[0] * v[1] - u[1] * v[0], u @ v)))
    corner = [turn(i) > 42 for i in range(n)]
    def tangent(i, length):          # the direction the outline leaves vertex i in, scaled for a Bezier handle
        if corner[i]: return np.zeros(2)
        if straight[i]: d = seg[i]
        elif straight[i - 1]: d = seg[i - 1]
        else: d = p[(i + 1) % n] - p[i - 1]
        return d / (np.hypot(*d) or 1) * length / 3
    out = [f'M{p[0][0]:.1f} {p[0][1]:.1f}']
    for i in range(n):
        a, b, j = p[i], p[(i + 1) % n], (i + 1) % n
        if straight[i] or (corner[i] and corner[j]): out.append(f'L{b[0]:.1f} {b[1]:.1f}')
        else:
            c1, c2 = a + tangent(i, ln[i]), b - tangent(j, ln[i])
            out.append(f'C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {b[0]:.1f} {b[1]:.1f}')
    return ''.join(out) + 'Z'
simple = [simplify(l) for l in loops]
allp = np.vstack(simple); x0, y0 = allp.min(0) ; x1, y1 = allp.max(0)
S = 100 / (y1 - y0)             # the mark is 100 units tall
d = ''.join(path((s - [x0, y0]) * S) for s in simple)
vw = (x1 - x0) * S
svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.1f} 100" role="img" aria-label="Sigil Cat"><path fill="currentColor" fill-rule="evenodd" d="{d}"/></svg>\n'
import os; os.makedirs(os.path.dirname(OUT), exist_ok=True); open(OUT, 'w').write(svg)
print(f'{len(loops)} outlines, {sum(len(s) for s in simple)} points, viewBox 0 0 {vw:.1f} 100, {len(svg)} bytes -> {OUT}')
