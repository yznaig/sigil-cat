# Free cat animations
A check of free, license-clean animated cats, to see if any clip is worth retargeting onto the chibi cat or using as timing reference.
Dated 2026-11-07; research for the sigil-cat build, building on round 1 in `sources.md` and `cat-model.md`.

## Verdict
- **No clip wins for direct use.** No free CC0/CC-BY cat has sit, lie, curled sleep and stretch together on a rig we can open and legally ship.
- **Retargeting would fail anyway.** Every candidate is a realistic or low-poly quadruped with real legs. Our cat is a half-height head on a tiny body with nub paws. Limb lengths, root height and head weight don't map.
- **Hand-key in Blender** (our blockout already has all 10 clips with exact seams). Use the numbers below as the starting timing.
- **Best timing reference by name:** DreamNoms "Somali Cat" (sit, sit down, stand up; CC-BY) and the mcsteeg PSX cat (sit, sit loop, stretch; paid, not CC). Neither could be opened: Sketchfab downloads need a login, and the itch pack costs $4.99.
- **Real-cat timing data is thin.** I found only one measured number (yawn about 2 s). Stretch, sit-to-lie and tail-flick figures below are our estimates, not measurements.
- **Truebones is still unverified.** Their Terms of Use page returned only its title; do not commit their files.

## Candidates

| Candidate | License (as read) | Clips | Rig, shape | Value |
|---|---|---|---|---|
| [Quaternius "Cat"](https://poly.pizza/m/qKICY6xla2) (in repo) | CC0 | Idle 6.67 s, Idle_Eating 3.33 s, Walk 1.0 s, Run 0.67 s, Jump_Start 0.25 s, Jump_Loop 1.0 s, Headbutt 0.625 s, Death 0.875 s (parsed from the GLB) | 16 joints, blocky quadruped | Test asset only. Idle's tail has just 2 keys, so no tail timing to borrow. |
| [Quaternius "Cat" #2](https://poly.pizza/m/2f54vbV0In) | "Public Domain (CC0)" | Idle 2.0 s, Walk 0.42 s, Jump 0.42 s, Bite_Front 0.375 s, Dance 0.67 s, Yes/No ~1 s (parsed) | 4 joints, character-style | None. No sit, lie or tail. |
| [DreamNoms "Somali Cat Animated v1.2"](https://sketchfab.com/3d-models/somali-cat-animated-ver-12-e185c3fd92b64c32b4515a32b29252fc) | CC Attribution 4.0 (API) | idle, walk, sit, sit down, stand up (author's text) | ~3.9k verts, cartoon low-poly, Blender; bone count unknown | Timing reference for standing-to-sitting only, by watching the viewer. No lie, sleep or stretch. Download needs login, so not opened. |
| [DreamNoms "Tuxedo Cat Animated 2.0"](https://sketchfab.com/3d-models/tuxedo-cat-animated-20-783fcb78b55b4394a212c2b6392e1113) | CC Attribution 4.0 | 6 clips, names not listed | ~3.5k verts, low-poly | Unknown clips; check in viewer if curious. |
| [Diskette96 "Cute Little Kitty"](https://sketchfab.com/3d-models/cute-little-kitty-4f9683c841424010aaeb36b069025667) | CC Attribution 4.0 | 3 clips incl. sleeping | ~3.1k verts | Author says the sleep clip "look NOT good" after GLB export. Skip. |
| [Animal Animator "Sphynx Cat"](https://sketchfab.com/3d-models/sphynx-cat-rigged-animated-10-anims-0b86bde7a8b64fd7a459035b339a790f) | CC Attribution 4.0; "credit Sphynx Cat by https://animalanimator.com and include a link to the full model article" | Idle, Walk, Trot, Gallop, Climb, Swim, Leap, Stalk, Hiss, Pounce | 45-bone anatomical rig, 9-bone tail, realistic | Well-researched but no sit, lie, sleep or stretch. Only walk timing (below). |
| [mcsteeg "PSX Animals: Cats"](https://mcsteeg.itch.io/psx-animals-cats) | Paid, $4.99 minimum. "You may use this asset in your animation or game projects, both personally and commercially." / "DO NOT redistribute this asset as your own." | 2 idle, run, sit, sit loop, biscuit, scared, stretch, groom | Low-poly PSX quadruped; bones not stated | Closest clip list, but not CC and "redistribute" is unclear for a public repo. Buying is Aaron's call; it would still only be timing reference. |
| [LuizMelo "Pet Cats Pack"](https://luizmelo.itch.io/pet-cat-pack) | CC0: "This package can be used freely and commercially - CC0" | 2D sprites: Stretching 13 frames, Lying Down 8, Sitting 1, Sleeping 1+1, Idle 10, Itch 2 | 2D pixel art, 20x14 px | Frame-count ratios only (stretch is the longest action). Frame rate not given. |
| [WON "Stretching Cat"](https://sketchfab.com/3d-models/stretching-cat-a53d88c1dd8e4f84952b0923694901fa) | CC Attribution 4.0 | One stretch loop | Sketch-style, ~122k verts, not a rig | Can't retarget. Can watch for pose shapes. |
| [Tomcat94 "Cat Pilot"](https://opengameart.org/content/cat-pilot-rigged-animated) | CC0 | Walk, run, cheer, goggles | Character cat | No sit/lie/sleep/stretch. |
| Sketchfab CC0 cats | CC0 | None | | Searched animated + downloadable + CC0 (API, 2026-11-07): the only CC0 hit was a catfish. Every animated cat is CC-BY. Many "cartoon cat" hits are ripped game assets; avoid. |
| Round 1, still out | | | | J-Toastie cat (CC-BY, idle only), Quaternius Animal Pack (CC0, FBX, idle and walk), Kenney Cube Pets, Mixamo (humanoid only, Adobe terms), Truebones Zoo (cat has purr, lick, stretch-yawn, walk; terms unverified), paid packs. |

Not a free path: Sketchfab, Mixamo and Truebones all need accounts or payment to download, which this task excluded, so the clip names above are from page text, not opened files.

## Timing reference
Used in the Sigil Cat build (`prototypes/sigil-cat/`, 30 fps): sit_to_lie 1.4 s, lie_to_sit 1.27 s, lie_to_sleep 1.93 s, sleep_to_lie 1.33 s, stretch 3.73 s (wind-up 0.3 s, reach 0.75 s, held reach about 0.95 s, release and sit-down 1.0 s), holds 4 s (sit, lie) and 6 s (sleep), tail flick 0.34 s every 2-6 s, sway one per 3.2-4.6 s. (Round 2's blockout, `models/claude-blender-cat.glb`, was 24 fps: sit_to_lie 1.67 s, stretch 3.25 s.)

| Action | Number | Source |
|---|---|---|
| Yawn | about 1.97 s for cats | Gallup et al., Biology Letters (via PBS NewsHour), timed from online video |
| Stretch, total | about 3 s | Informal cat-care estimate; our blockout uses 3.25 s |
| Stretch, split for hand-keying | wind-up 0.4 s, reach down 0.5 s, hold 1.0-1.5 s with a small tremble, release 0.6 s | Our estimate, cartoon timing |
| Sit to lie | 1.2-1.7 s, plus a 0.2-0.3 s anticipation shift and a small settle bounce | Our estimate; matches the blockout |
| Lie to curled sleep | 1.5-2.0 s, slower than sit to lie | Our estimate |
| Tail flick | 6-10 frames (0.25-0.4 s) with overshoot; a flick every 2-6 s, random | Our estimate; no measured source found |
| Slow tail sway | one sway every 3-4 s | Our estimate |
| Walk stride (realistic cat) | 24 frames at 30 fps = 0.8 s; Quaternius walk 1.0 s | Animal Animator Sphynx article; GLB |
| Quick moves in other clips | Jump start 0.25 s, headbutt 0.625 s | Quaternius GLB |
| Rubber-hose pacing | Pose changes on twos (12 drawn poses per second at 24 fps) with squash and overshoot | Convention, not a source |

Gaps: no measured source for sit-to-lie, lie-to-curl or tail-flick duration turned up. If we want real numbers, film a real cat at 60 fps and count frames; that is cheaper than more searching.

## Credits
Nothing from this research is used. The Quaternius cat already in `prototypes/cat-glb/models/` is CC0 and needs no credit. If DreamNoms or Animal Animator material is ever used, the CC-BY credit must be added here, with the Sphynx wording quoted above.
