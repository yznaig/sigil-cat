# Bird egg artwork

The original distant bird silhouette remains a missing-file fallback. The active
bird is Aaron's artwork (`assets/flappy/SOURCES.md`), processed without redrawing.
Game scenery and UI now use the pinned clone's shipped artwork, per Aaron's
accepted choice e1111-13 (`vendor/floppybird/SOURCES.md`). The custom landscape,
stone gates and controller mesh stand-in have been replaced.

Trailer type: **Anton Regular**, Vernon Adams, SIL Open Font License 1.1 (OFL.txt).
Source: https://github.com/google/fonts/tree/main/ofl/anton
Downloaded 2026-11-11; the delivered TTF is retained locally so the trailer never
depends on a font CDN. Anton's licence is independent of the flight code licences.

Selected controller splat and its baked hull: `docs/reference/controller/SOURCES.md`.
Sounds: `tools/audio/make-bird.py`, original synthesis; exact file hashes and levels
are in `docs/sound-levels.json`, provenance in `assets/audio/design-manifest.json`.
