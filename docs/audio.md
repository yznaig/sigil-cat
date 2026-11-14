# Audio: Aaron's Butterman clips
Unit 10 level update: the performances and their sync landmarks are retained. The shipped encodes now have constant
attenuation for headroom, regenerated from baseline `27f3543` by `tools/audio/build-sounds.py`. The historical loudness
numbers below describe the previous encodes; current measurements are in `sound-levels.json` and exact changes in
`assets/audio/design-manifest.json` → `correctionsDb`. `theme-song-3` (`butterman-scene2-new.m4a`) is now the looping
second scene; `theme-song-2` is the secret encore. See `sound-direction.md` for the complete current inventory.

Old radio (Aaron, e1111-58): every one of his recordings plays through a runtime AM-radio chain (`RADIO` in
`src/core/audio.js`, `radio: true` in `butterman-config.js`). The files, every beat time below and every scheduled start
are unchanged; `checks/sounds-radio.js` measures that each clip starts exactly at its scheduled time and the chain adds
no measurable shift (the filters' group delay rounds to 0 samples in a cross-correlation against the dry song).

What each of Aaron's recordings drives, how they were measured, and how the gag is synced to them.
Regenerate the files and numbers with `python3 tools/audio/prepare-butterman-audio.py <folder with the originals>`.

## The clips
Mapping is **Aaron's** (relayed by command-hq-66, 2026-11-08 ~00:00), and the transcript agrees with it.

| Clip (assets/audio/butterman/) | Recorded as | Length → trimmed | Peak dBFS | Integrated LUFS | What it drives | Confidence |
|---|---|---|---|---|---|---|
| `theme-song-1` | Buttaman_1 | 27.03 → 26.14 s (0.89 s lead, 0 s tail) | −0.5 | −15.3 | Scene 1 (butter): his theme song, take 1. Sung at ~74.2 bpm. | Aaron's word |
| `theme-song-2` | Buttaman_2 | 26.50 → 23.21 s (1.34 s lead, 1.95 s tail) | −0.5 | −14.5 | Scene 2 (cross): theme song, take 2. Sung at ~82.0 bpm. | Aaron's word |
| `rise-yell` | Buttaman_3 | 13.78 → 11.21 s (0.84 s lead, 1.73 s tail) | −0.5 | −14.2 | Scene 3 (rise): "It's… it's the butter maaan!", climbing. Lands on an 80 bpm grid. | Aaron's word |
| `whisper` | Buttaman_quiet | 41.62 → 41.18 s (0.44 s lead, 0 s tail) | −1.7 | −27.6 | Butter whisper: the theme song whispered, one line per approach. | Aaron's word |

- Each clip ships as `.m4a` (AAC, plays on iPhone Safari) and `.mp3` (fallback), mono 48 kHz, 135–340 KB each.
- Levelled to −16 LUFS so the config gains mean the same thing on every clip. The whisper is levelled up too
  (+11.6 dB, limited) and turned down in config instead, so its quietness is one number to tune.
- Clip 1 has no tail trim: Aaron's last "man" is still ringing when the recording stops. A 80 ms fade covers the cut.
- `analysis.json` beside the clips holds every number on this page.

## What the transcript says (faster-whisper small.en, words checked against the loudness envelope)
- **Take 1:** "It's the butter man" ×3 · "What's the butter man doing over there, man?" · "It's the butter man" ×4.
- **Take 2:** "It's the butter man" ×3 · "It's the man with the butter, with the butter on him" · "It's the butter man" ×3 ·
  (rushed) "It's the butter man, it's the man with the butter, with the butter on him."
- **Rise:** "It's…" (pause) "It's the butter maaaan!" The "maaan" climbs in three pitch steps, about 283 → 320 → 380 Hz,
  at 1.5 s apart, and gets louder at each step.
- **Whisper:** the song again, whispered: "It's the butter man" lines, a "hey hey hey", and "What's the butter man doing over there".

## Tempo: fitted from the sung beats
Unaccompanied singing has no click, so the tempo comes from a straight-line fit through the stressed syllable of each line
(the "BUT" of butter; for the rise, its three pitch steps). Residuals are how far Aaron drifts off that grid.

| Clip | bpm | Beat 0 ("BUT" of the first line) in the trimmed file | Drift (ms, per landmark) |
|---|---|---|---|
| theme-song-1 | 74.17 | 0.56 s | −110, −66, +38, +61, +176, +110, −26, −182 (slows mid-song, then rushes) |
| theme-song-2 | 82.04 | 0.52 s | −84, +1, +65, +20, +8, +14, +39, +23, −11, −42, −33 |
| rise-yell | 80.00 | 0.21 s ("It's…") | 0 on all six (pitch steps at beats 6, 8, 10) |

The two takes of the song are 10% apart in tempo, so one global bpm can't put his steps on both. Each scene therefore
carries its own `bpm` (the gag's `bpm` stays the default for any scene without one). Every length is still a whole
number of that scene's beats, and changing a scene's bpm still retimes the whole scene together.

## The rise: three stages from the yell's loudness
| Stage | Window in rise-yell (trimmed) | Pitch | LUFS | Scaled 0–1 | Arms (° from straight up) |
|---|---|---|---|---|---|
| 1, the Y | 4.71–6.21 s | ~283 Hz | −17.0 | 0.00 | 28 |
| 2, wider | 6.21–7.71 s | ~320 Hz | −12.8 | 0.75 | 70 |
| 3, widest (climax) | 7.71–9.21 s | ~380 Hz | −11.4 | 1.00 | 84 |
Each stage starts on its pitch step. Its loudness is scaled between the config's `quiet` and `loud` (preset to the
quietest and loudest stage) and sets the arm spread, the scale punch and the screen shake between their configured
minimum and maximum. Louder yell = wider arms, bigger punch, stronger shake.

## Readings considered
- The brief offered two guesses: (a) one clip per scene with the rise's stages inside clip 3, or (b) clips 1/2/3 as
  three yells of rising intensity. Aaron settled it: 1 and 2 are his sung theme song, 3 is the climbing yell. That is
  close to (a). Reading (b) is not wired: the songs are 23–26 s of singing, not single yells, so it would not play well.

## One scene per B (Aaron, e1108-03)
Each B sigil plays one scene, the next in order: 1 butter (26 s), 2 cross (23 s), 3 rise (11 s), then back to 1.
- **Progress per device:** the next scene's index is in localStorage `butterman.next`, beside the cameo flag
  (`butterman.summoned`). It moves on when a scene finishes, so a scene cut off by closing the page plays again.
- **Each scene stands alone:** it starts at its own beat 0 with its own clip from the clip's start (0.75 s preroll for the
  pickup), Butterman walks or rises on and leaves, the cat pauses only for that scene, and the footer fades only in the rise.
- **Butter:** once the butter scene has slapped it on, the cat keeps it, also on later visits (`butterman.buttered`).
  The butter scene again (the 4th B) leaves it on: he brings a fresh pat and slaps it on top.
- **A B mid-scene does nothing.** Cameos stop after the first summon, as before.
- **#debug:** "BM 1 butter", "BM 2 cross", "BM 3 rise" play a scene (and move progress on like a B); "BM reset" sets
  the next B back to scene 1. The panel shows the scene, what's next, and the timeline.

## How the gag is synced (src/butterman-config.js)
Every scene plays its whole clip (Aaron: "faithfully sync them to the audio lengths"): 26 s, 23 s and 11 s, one per B.
`node checks/butterman-audio.mjs` checks every number below against `analysis.json`.

| Scene | bpm | Beats | Clip | What lands where (scene beats; song beat 0 = the first "BUT", on scene beat 0) |
|---|---|---|---|---|
| butter | 74.17 | 32 (25.9 s) | theme-song-1, whole | walk-in 0–11 · hand up on "What's the **BUT**-ter man" (11), held through "doing over there" · slap on "…**MAN**?" (14) · walk-out 15–29 under the last four lines, off screen by 29 (`offscreenLead`, 2.4 s before the clip ends) |
| cross | 82.04 | 31 (22.7 s) | theme-song-2, whole | one walk across, edge to edge, beats 0–28; off screen 2.3 s before the clip ends |
| rise | 80 | 15 (11.25 s) | rise-yell, whole | climb 0–6 ("It's… it's the butter") · Y on pitch step 1 (6) · wider on step 2 (8) · widest on the climax (10) · sink 11–12 · gone 12–15 while "maaan" rings out (2.6 s) |

- **Follow the singing.** Each song clip lists its measured `landmarks` (sung beats). The scene's beat grid bends
  through them, so steps, the slap and its plop land on Aaron's actual beats, not on an average tempo that drifts up to
  0.18 s. The bend is pinned to zero at each scene's ends. It switches off when a scene runs at another tempo than
  sung (then the clip is rate-shifted instead). `scene.followSinging: false` turns it off.
- **Fit walks.** With a whole song per walk he takes up to 31 steps, so `fit: true` shrinks his steps to span exactly
  the ground the walk needs, and he is on screen for the whole song on any screen shape. Without it he'd walk far
  off-screen and leave the stage empty for about 10 s.
- **Rise.** Stage `lufs` → arms and intensity through `stage()` and `YELL` at the top of the config: 28°, 70°, 84°;
  intensity 0, 0.75, 1 (punch and shake between `yell.punch` and `yell.shake`).
- **Whisper.** One whispered line per approach, in order, cut at the gaps in the recording (`whisper.lines`). The line
  plays out (≤3.5 s) even if the pointer leaves; it re-arms after the pointer leaves the radius. Volume −30 dB under
  the songs. It uses the tap sounds' audio session, so the iPhone silent switch mutes it; only the gag forces playback (e1107-37).
- **Checking it:** `#debug&b=13.9` freezes the butter scene at a beat (`&bmscene=cross` or `rise` for the others); the debug panel shows the action, the scene's beat,
  the follow bend in ms, and each playing clip with its position in the file and its offset. `#bmsheet=butter`
  (or `cross`, `rise`) draws a contact sheet.

## Fine-tuning (all in src/butterman-config.js)
- A clip early or late against the motion: its `audio.beat0` (seconds; + = the clip plays earlier) or `audio.offset`
  (beats). Whole gag against Bluetooth lag: `nudge`.
- Shorter scenes: set a song's `audio.beats` (e.g. `15.6` ends take 1 after "…doing over there, man?", with a `fade`) and shorten the
  walks to match; clean cut points (song beats, in the gaps between lines) are 15.6, 18.9 and 22.7 for take 1, and 15.0, 19.1 and 22.9 for take 2.
- Where the slap lands: the lengths of `walk-in` and `hand-up` (the slap is on beat walk-in + hand-up).
- Rise spread: `YELL.arms` (min, max degrees) and `YELL.quiet` / `YELL.loud`.
- Whisper: `whisper.volume` (0.032 = −30 dB), `radius` (px), `cooldown` (s).
