# Classic flight — e1111-13

- Repository: https://github.com/nebez/floppybird
- Exact commit: `efd2c7f740299688e524e57bfa3f635c9b857f82` (gh-pages).
- Code licence: **Apache-2.0**, copied unchanged in `LICENSE`.
- Code: https://github.com/nebez/floppybird/blob/efd2c7f740299688e524e57bfa3f635c9b857f82/js/main.js
- Layout: https://github.com/nebez/floppybird/blob/efd2c7f740299688e524e57bfa3f635c9b857f82/css/main.css
- Assets: https://github.com/nebez/floppybird/tree/efd2c7f740299688e524e57bfa3f635c9b857f82/assets

`js/main.js`, `css/main.css`, `README.md`, `LICENSE` and the PNG assets are unmodified
upstream files retained for source audit. Their SHA-256 digests are recorded in
`upstream-sha256.json`. The upstream scripts and styles are never loaded or executed.
No jQuery, Buzz, original audio, PSD files or title art is included in the runtime.

## Modifications

`src/flappy/physics.js` adapts `gameloop`, `updatePlayer`, `playerJump`, `updatePipes`
and score-after-clearing. The clone's gravity (0.25 per 60Hz frame), jump (-4.6),
52-pixel pipes, 90-pixel gap, 80-pixel gap padding and pipe speed/spacing are retained.
Changes: a fixed 120Hz step in seconds, a 288×512 portrait field with floor at 400,
body-only rotated ellipse collision for Aaron's art, an initial pipe just offscreen,
and the existing callback-owned page lifecycle. No global timers, cookies or replay
loop. Earlier module scaffolding came from Varun Pant's MIT CrappyBird; its original
source and licence remain in `vendor/crappybird` for attribution only.

`src/flappy/art.js` adapts the clone's CSS sprite placement and score helpers to
Canvas. The original pipe tubes/caps, skyline, land, large white digits, ready and
game-over panels and small scoreboard digits are used. Medals follow the upstream
10/20/30/40 thresholds. A fixed portrait field scales uniformly to fit the viewport;
classic sky/skyline/ground extend into the margins. Side margins have a subtle tint
and edge so the playable lane is clear. The player body remains the classic 34×24
size before scaling (about 60 CSS pixels wide at 1280×900, 46 at 390×844).

The existing 90-second discovery, page freeze/fade, death return, physical controller,
trailer, keyboard/touch input, reduced-motion handling and shared mute/volume stay
owned by Sigil Cat. Only the game's presentation and native gameplay coordinates change.

## Sprite artwork — Aaron's accepted choice

The sprite art is the **original Flappy Bird game's artwork**, credited upstream to
Dong Nguyen and .GEARS, not original art created by this clone's author. The upstream
README explicitly distinguishes this artwork from its code and does not claim
permission from the original creator. Aaron explicitly chose to use these classic
sprites in decision e1111-13, clarified by the orchestrator on 2026-11-11. The
Apache-2.0 code licence is not a claim that the original game's art has that licence.

Aaron's supplied winged cat replaces the player bird in-game and in the background:
`assets/flappy/SOURCES.md`. It is unchanged in this pass. The clone's bird PNG is only
the configured missing-file fallback; replay/ceiling PNGs are retained in the source
set but unused. All runtime sounds remain Sigil Cat's original synthesis, documented
in `tools/audio/make-bird.py`. The UI calls the game “flappy”.
