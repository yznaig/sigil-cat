# Earlier flight scaffolding — retained attribution only

- Project: Varun Pant, CrappyBird (2014).
- Repository: https://github.com/varunpant/CrappyBird
- Exact commit: `927c0bc6b982b328076f8f27eef090c3712591d8`.
- Source: https://github.com/varunpant/CrappyBird/blob/927c0bc6b982b328076f8f27eef090c3712591d8/index.html
- Licence: MIT, reproduced unchanged in `LICENSE` from that commit's README.
- `upstream.js` is the unmodified inline script extracted from index.html, retained
  for audit only. It is never imported or executed by Sigil Cat.

The earlier fixed-step module scaffolding in `src/flappy/physics.js` was adapted from
this source. Its artwork and scenery renderer have been removed: they did not match
Aaron's intended classic look. Current gameplay constants and sprite presentation
come from nebez/floppybird; see `vendor/floppybird/SOURCES.md` for the exact commit,
Apache-2.0 code licence, modifications and separate original-game art provenance.
