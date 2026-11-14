# Aaron's flappy Sigil Cat — e1111-13

`cat-bird-source.png` is Aaron's own image-generator artwork, supplied by the
orchestrator on 2026-11-11 with explicit instructions to commit it as his art.
The original is retained byte-for-byte: 2172×724, three frames on magenta.
Aaron deliberately omitted the eye and butter; neither is added.

`cat-bird.png` is a deterministic derivative made by
`tools/sprites/prepare-cat-bird.py` (Pillow + NumPy, Idol venv):

- Key out magenta, including off-magenta edges; binary alpha and zero transparent RGB.
- Register the shared face/ear: translations (0,0), (35,0), (70,0) source pixels.
- Measure the source's slightly irregular staircase spacing and sample a single
  18.2-source-pixel grid at cell centres with nearest-neighbour sampling. No blur,
  new drawing or colour averaging.
- Pin the stationary face/ear/right torso to the level pose's original pixels;
  preserve each original wing pose. This prevents residual body chatter in the
  generated source without inventing pixels or features.

Output: **84×28**, three **28×28** frames in one row: up, level, down. Playback:
**0,1,2,1**. The shared pivot is (16,14.5), and an ellipse inside the body rectangle
(5,7,22,15) supplies collision bounds. The body fits the clone's 34×24 bird size;
wing tips and transparent corners are excluded from its hitbox. Runtime path and
layout are together in `src/flappy/config.js`; hashes and sampling coordinates are
in `cat-bird.frames.json`. Both the game and background visitor use this path.

Clone art and Canvas scenery: `vendor/floppybird/SOURCES.md`.
