# Model sources
> Third-party 3D models used by the site, with where each came from and its licence.
> One entry per file. Update this when a model is added, replaced or edited.

## awp.glb

- File: `assets/models/awp.glb`
- Source page: https://opengameart.org/content/low-poly-guns-pack (file `ultimate_gun_pack_by_quaternius.zip`, model `SniperRifle_3`, OBJ folder)
- Author: Quaternius (uploader of the page; the pack is his own work, "Ultimate Gun Pack", July 2019). Also at https://quaternius.itch.io/50-lowpoly-guns
- Licence, as stated on the page: `License(s): CC0` (public domain dedication, no attribution required). Page text: "This pack contains 40 different gun models. All in FBX, OBJ and Blend formats, free to use in personal and commercial projects."
- Credits line (optional, CC0 needs none; courtesy only): "Sniper rifle model: Ultimate Gun Pack by Quaternius (CC0)"
- What was done to the file: took `OBJ/SniperRifle_3.obj` + `.mtl` from the zip, converted to binary glTF with `npx obj2gltf -b` (flat colour materials from the MTL, no textures, no compression). No geometry edits, no recolouring. Barrel runs along +X (muzzle at +X), Y is up.

The look-round brass spinning top is original procedural geometry in `src/eggs/circle.js` (lathe profile,
steel point and concentric machining details), with no external model file or texture. The wipe sponge is an
original procedural canvas drawing in `src/gags/sponge.js`; its pores and shading use no external image.

## prepared/cow-real/cow.glb — Rukh3D dairy cow

- Source: [Farm Cow Animated Dairy cattle](https://sketchfab.com/3d-models/farm-cow-animated-dairy-cattle-0e780cb5ab6d457198ded7d4e191a03e)
  by [Rukh3D](https://sketchfab.com/rukh3d).
- Licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), checked
  2026-11-11 against the original model page's metadata, its embedded glTF credit
  and the original licence notice. Attribution is required; commercial use and
  adaptation are allowed. CC BY was explicitly permitted for this cow revision.
- Credit: “Farm Cow Animated Dairy cattle” by Rukh3D, CC BY 4.0; adapted for Sigil
  Cat with material corrections, cavity/hoof shading, repacking, bone aliases
  and newly authored walk/graze animations. Preserve the title/author/licence links.
- Source geometry, UVs, weights and skeleton retained; two original compressed
  JPEG maps embedded. Unused source animations removed. The delivered walk and
  graze are new, not clips supplied by the source author.
- Retrieved from an attributed public mirror at a fixed revision. Exact download
  URLs, hashes, licence evidence, source notice and rebuild instructions are in
  [the asset's source record](prepared/cow-real/SOURCES.md) and
  [provenance manifest](prepared/cow-real/source-provenance.json).
