# Alan Becker — Animating Walk Cycles
> Research brief of Alan Becker's 4-min walk-cycle lesson (uploaded 2015-04-18, ~3.9M views): https://www.youtube.com/watch?v=2y6aVz0Acx0
> Why it matters for sigil-cat: the stick-figure walk vocabulary (four poses, arm offset, "proud" walk) behind Butterman's comic strut.

**Credibility:** Alan Becker made *Animator vs. Animation*, the best-known stick-figure animation series on YouTube, and teaches a paid stick-figure course on Bloop Animation; this lesson draws every pose on screen.

## Exec recap
A walk step is four poses: contact (foot touches down), down (lowest, just after contact), passing (other leg passes), up (highest, just after passing). Two poses read as walking; the up/down pair adds the bounce that keeps it from looking flat. Arms swing opposite to the legs. Personality comes from three dials: timing (which pose is held longest), position (lean, arm height) and offset (arms ahead of or behind the legs).

## Key highlights
- [00:00:30] Think of a step as two poses, contact and passing, then mirror them for the other foot.
- [00:00:55] Add down (right after contact) and up (right after passing). Without them the walk is flat, with no bounce.
- [00:01:21] A cycle slid across the screen looks "mechanical and slidy like a video game character". Plan where each step lands and space the steps evenly.
- [00:01:59] Arms are farthest apart on the down pose and closest on the passing pose, opposite the legs.
- [00:02:27] Personality dials: timing, position, offset. Sad walk: hunch forward, hold contact and down longer, flatten the up/down difference.
- [00:02:48] Happy, proud walk: lean the body back, give the contact pose more time, raise the arms, and push the arms two frames ahead of the legs, so he leads with his arms.
- [00:03:03] Relaxed walk: arms lag two frames behind and the body leans forward.

## Takeaways for sigil-cat
1. Butterman's strut is the "happy proud" recipe: lean back, high arms, arms leading the legs, a lingering contact pose.
2. In code, drive the leg phase from distance travelled, not from time, so planted feet never slide.
3. Use these four parameters for tuning: lean, bounce height, contact hold, arm lead.
