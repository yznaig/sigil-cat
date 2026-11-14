// BUTTERMAN: the one config. Every scene, action, beat, clip and caption of the gag is here (docs/ideas/butterman.md).
//
// TEMPO. Every start, length and offset below is in BEATS. `bpm` is the gag's tempo; a scene with its own `bpm`
//   runs at that tempo instead (Aaron's two song takes are 10% apart, docs/audio.md). Change a bpm and that scene's
//   motion, footsteps, captions and clips retime together. `#bpm=150` in the URL sets every scene to 150.
//   A clip with a `bpm` (the tempo it was sung at) plays faster or slower to match its scene, so it stays in sync.
// SCENES: each B sigil plays ONE scene, the next in array order (Aaron, e1108-03: 1 butter, 2 loop, 3 rise, then
//   back to 1); `sequence` remembers which is next on this device. A scene marked `secret` is not in that round
//   (the encore, played by the whisker harp). A scene plays alone from its own beat 0, so
//   scene.start / gap only matter when several are laid back to back (buildSchedule(null), a debugging view).
//   scene.shift nudges it in whole beats. scene.length 'auto' = until its last action ends.
// ACTIONS play in order inside a scene. action.start 'auto' = right after the previous one; a number pins it (beats
//   from the scene's start). action.shift nudges it. action.length is whole beats.
//   action.fit (walks) true = his steps shrink so the walk spans exactly the screen it needs, however many beats.
//   A walk's step count is its length times strut.stepsPerBeat.
//   action.do is what it does (walk-in, hand-up, slap, walk-out, enter, loop, walk-to, stand, cross, rise, open, sink,
//   walk-mid, raise, walk-off, rest = off screen); don't rename those.
// AUDIO (action.audio, one clip per action):
//   file    one path, or the same clip as [m4a, mp3] (the first that decodes wins; iPhone plays m4a)
//   bpm     the tempo it was sung at (null = play at normal speed whatever the scene's tempo)
//   beat0   SECONDS into the file where its beat 0 is (the "BUT" of the first line); it lands on `offset`
//   offset  beats into the action where the clip's beat 0 lands (or 'hit' for the slap's hit beat)
//   endSeconds optional exact source-file end (seconds); rise trims its trailing silence at 11.09 s
//   beats   how many beats of the clip to play from its beat 0 (null = to the end); `fade` seconds of fade at the cut
//   landmarks [beat of the clip, SECONDS into the file] of each sung "BUT" (measured, docs/audio.md). With them the
//           scene follows the singing: its beat grid bends through Aaron's real beats (he drifts up to 0.18 s off a
//           straight tempo), so steps and the slap land on them. scene.followSinging: false = a straight grid.
//   gain    loudness (clips are levelled to -16 LUFS, so 1 is the same loudness on every clip)
// CAPTIONS: scene.captions [{ at (beats from the scene's start), hold (beats), text, style: 'lyric' | 'yell', size }].
// RISE STAGES are separate actions. Each stage's `lufs` (the yell's loudness during it, measured) sets how wide the
//   arms open and how hard the punch and the shake hit, scaled between `yell.quiet` and `yell.loud` (see `stage()`).
//   Give a stage `arms` / `intensity` by hand to override.
const SONG1 = ['assets/audio/butterman/theme-song-1.m4a', 'assets/audio/butterman/theme-song-1.mp3'];
const SONG2 = ['assets/audio/butterman/theme-song-2.m4a', 'assets/audio/butterman/theme-song-2.mp3'];
const SONG3 = ['assets/audio/butterman/theme-song-3.m4a', 'assets/audio/butterman/theme-song-3.mp3'];
const RISE = ['assets/audio/butterman/rise-yell.m4a', 'assets/audio/butterman/rise-yell.mp3'];
const WHISPER = ['assets/audio/butterman/whisper.m4a', 'assets/audio/butterman/whisper.mp3'];

// The yell's loudness -> each rise stage's arms (degrees from straight up) and intensity (0-1: punch and shake).
// quiet/loud are preset to the quietest and loudest stage; widen the range to make the stages closer together.
const YELL = { quiet: -17.0, loud: -11.4, arms: [28, 84] };
const stage = (lufs) => {
  const u = Math.min(1, Math.max(0, (lufs - YELL.quiet) / (YELL.loud - YELL.quiet)));
  return { lufs, intensity: +u.toFixed(3), arms: Math.round(YELL.arms[0] + (YELL.arms[1] - YELL.arms[0]) * u) };
};

export const BUTTERMAN = {
  bpm: 80,                  // default tempo for any scene without its own
  preroll: 0.75,            // SECONDS between the trigger and beat 0 (room for a clip's pickup before its beat 0)
  gap: 1,                   // beats between auto-packed scenes
  // SECONDS: he is fully off screen at least this long before a scene's clip ends (Aaron, e1109-04: "2-3 seconds
  // before"). Rounded to the nearest beat; the last walk is retimed to finish its exit by then (same steps per beat,
  // longer strides). A scene can set its own `offscreenLead`.
  offscreenLead: 2.5,
  nudge: 0.0,               // SECONDS; + = motion later than sound (Bluetooth headphones)
  captions: false,          // one switch for every lyric and yell, including the encore
  metronome: false,         // true = a quiet tick on every beat, to hear the grid
  metronomeGain: 0.12,
  // One scene per summon. storageKey: the next scene's index on this device; butterKey: the cat was buttered here
  // (he keeps it on later visits). Both sit beside the cameo flag in localStorage.
  // seenKey (playtest-3, Aaron: "once someone watchs all 3 B sigil scenes, it should only play scene 1 from then on so
  // they can get butter"): the round's scenes played to their end on this device; once it holds all three, every B
  // plays scene 1. A scene cut off (a reload, a check's stop) does not count. The encore is not in the round.
  sequence: { storageKey: 'butterman.next', butterKey: 'butterman.buttered', seenKey: 'butterman.seen' },   // paths in the page's saved state (src/core/store.js)
  // The encore plays once ever (playtest-2). seenKey: true once it has played through (or the page was reloaded after
  // the ticket fell): other modules wait on it (the gags lane's keyboard lesson); droppedKey: the ticket has been let
  // go (from then on it never plays again, even if the page closes before the end). An older save that already holds
  // the ticket from the old encore still gets this scene once: its ticket is lifted off and falls again.
  encore: { seenKey: 'butterman.encoreSeen', droppedKey: 'butterman.encoreDropped' },

  scenes: [
    { // 1. Butter: struts on through three "it's the butter man"s, hand up on "What's the BUT-ter man", holds the
      //    butter up through "doing over there", slaps it on "...MAN?", then struts off under the last four lines.
      id: 'butter', start: 'auto', shift: 0, length: 'auto', bpm: 74.17,
      from: 'right',                                   // the side he enters from (and leaves by)
      cat: { yaw: -0.2, pose: 'sit', pauseCycle: true }, // the cat sits still, turned this way, while he works
      actions: [
        { id: 'walk-in', do: 'walk-in', length: 11, easing: 'linear',
          fit: true,        // steps shrink so the walk spans exactly edge-to-cat: on screen for the whole song
          audio: { file: SONG1, bpm: 74.17, beat0: 0.56, offset: 0, beats: null, fade: 0.35, gain: 1,
            landmarks: [[0, 0.45], [4, 3.73], [8, 7.07], [11, 9.52], [16, 13.68], [20, 16.85], [24, 19.95], [28, 23.03]] } },
        { id: 'hand-up', do: 'hand-up', length: 3, easing: 'backOut',
          raise: 0.5 },     // beats for the butter to shoot up over his head (then it hangs there: the anticipation)
        // The slap is a jump (Aaron, e1108-10: no arm stretching): he crouches, springs up beside the cat's head, slaps
        // the butter down onto it at the top of the leap, on the hit, then drops back to his mark and lands squashed.
        { id: 'slap', do: 'slap', length: 1, easing: 'quadIn',
          hit: 0,           // beats into the action the butter lands (0 = on the beat: "...over there, MAN?")
          strike: 0.25,     // beats the downstroke takes, ending at the hit (the top of the leap)
          crouch: 0.75,     // beats of anticipation squash before he leaves the ground
          takeoff: 0.5,     // beats in the air before the hit (the climb); the leap's height is set by the cat's head
          land: 0.6,        // beats after the hit he lands back on his mark
          squash: 0.22,     // how far he squashes on the crouch and the landing (0.22 = a fifth shorter)
          stretch: 0.22,    // how far he stretches as he springs up
          over: 0.05,       // world units the leap peaks above the height it needs (the top of the arc hangs a moment)
          catStartle: { at: 'hit' },
          audio: { file: 'slap', offset: 'hit', gain: 0.8 } },   // a real wet slap (assets/audio/SOURCES.md)
        { id: 'walk-out', do: 'walk-out', length: 17, easing: 'linear', fit: true,
          turn: 1 },        // beats: the arm springs back and he about-faces, then the rest are steps away
      ],
      captions: [
        { at: 0, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 4, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 8, hold: 2.5, text: "it's the butter man", style: 'lyric' },
        { at: 10.5, hold: 5, text: "what's the butter man doing over there, MAN?", style: 'lyric' },
        { at: 16, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 20, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 24, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 28, hold: 3.5, text: "it's the butter man", style: 'lyric' },
      ],
    },
    { // 2. Loop (Aaron, 2026-11-09; it replaced the cross): he walks in to the middle of the room, goes once round the
      //    cat, walks out to open floor, turns to face you and stands quite still through the last of the chant. On
      //    the clip's last instant he is simply not there. The clip is sixteen "the butter man"s, two beats apart.
      //    Beats: in 0-10, round the cat 10-26, out to open floor 26-29, standing 29-32.21 (still from 29.5).
      id: 'loop', start: 'auto', shift: 0, length: 'auto', bpm: 66.39,
      offscreenLead: 0,                                // he does not walk off: he vanishes as the clip ends
      // The ring he walks round the cat. radius: world units (the sitting cat is 0.43 at his widest, so 0.53 clears him);
      // at: where on the ring he joins and leaves it, in radians (0 = to the cat's right as you look, PI/2 = in front
      // of him, PI = to his left); dir: 1 = he passes in front of the cat first, -1 = behind first; open: how far along
      // the ring's edge he walks on, out onto open floor (world units).
      // end (playtest-3, e1113-30, Aaron: "Just have butterman end the scene a bit more to the right"): the floor spot
      // [x, z] he walks to off the ring instead (open is then unused), out in front of the row of rack, controller
      // stand and egg cup (it stands at the rack's depth or behind it, z <= 0.71), so he is never hidden behind it and
      // is drawn in front of anything of it he overlaps; turn: beats he takes to turn from the ring toward it.
      loop: { radius: 0.53, at: 1.9, dir: 1, open: 0.58, end: [-0.36, 0.92], turn: 0.75 },
      cat: { yaw: -0.45, pose: 'sit', pauseCycle: true },   // the cat sits, facing his usual way, so the ring is clear of him
      actions: [
        { id: 'enter', do: 'enter', length: 10, easing: 'linear', fit: true,
          audio: { file: SONG3, bpm: 66.39, beat0: 0.368, offset: 0, beats: null, fade: 0.2, gain: 1,
            landmarks: [[0, 0.34], [2, 2.22], [4, 3.96], [6, 5.82], [8, 7.58], [10, 9.4], [12, 11.19], [14, 13.02], [16, 14.8], [18, 16.67],
              [20, 18.45], [22, 20.29], [24, 22.07], [26, 23.88], [28, 25.64], [30, 27.46]] } },
        { id: 'loop', do: 'loop', length: 16, easing: 'linear' },
        { id: 'walk-to', do: 'walk-to', length: 3, easing: 'linear' },
        // 3.21 beats: the clip runs 32.21 beats past its beat 0, and the scene ends exactly when it does. turn: beats
        // he takes to face you; after that he does not move at all. The small pop is the sound of him going.
        { id: 'stand', do: 'stand', length: 3.21, turn: 0.5, audio: { file: 'tap-pop', offset: 3.21, gain: 0.45 } },
      ],
      captions: Array.from({ length: 16 }, (_, i) => ({ at: i * 2 - 0.3, hold: 1.8, text: "it's the butter man", style: 'lyric' })),
    },
    { // 3. Rise: slowly rises up huge in front of the screen, then opens his arms in a Y, wider, widest.
      id: 'rise', start: 'auto', shift: 0, length: 'auto', bpm: 80,
      offscreenLead: 0, endOnAudio: true, // hold the widest pose until the last sound, then vanish
      fill: 1.05,                                      // how much of the screen he fills at full size (> 1: cropped, up close)
      // Close, not giant (Aaron, e1109-04): he is his own size, right at the lens. lens: the camera dollies in while
      // widening to `fov` degrees (the cat keeps his size; Butterman gets the wide-angle close-up look), over `ease`
      // beats at the start, and back after he's gone. lean: radians he leans in over the lens while he's up.
      lens: { fov: 60, ease: 3 }, lean: 0.3,
      drop: 1.95,           // his feet this far (his units) below the lens line: head and first-stage hands in frame
      actions: [
        { id: 'rise', do: 'rise', length: 6, easing: 'sineInOut',
          move: 6, arms: 12, intensity: 0,             // the climb ("It's... it's the butter"), hands up close together
          audio: { file: RISE, bpm: 80, beat0: 0.21, offset: 0, beats: null, endSeconds: 11.09, fade: 0, gain: 1.1 } },
        // the three pitch steps of "maaan" (283, 320, 380 Hz), 2 beats apart; each stage's loudness is measured
        { id: 'stage-1', do: 'open', length: 2, easing: 'backOut', move: 0.5, ...stage(-17.0), catStartle: { at: 0 } },
        { id: 'stage-2', do: 'open', length: 2, easing: 'backOut', move: 0.5, ...stage(-12.8), catStartle: { at: 0 } },
        { id: 'stage-3', do: 'open', length: 4.507, easing: 'backOut', move: 0.5, ...stage(-11.4), catStartle: { at: 0 } },
      ],
      captions: [
        { at: 6, hold: 1.9, text: 'BUTTAMAN!', style: 'yell', size: 1 },
        { at: 8, hold: 1.9, text: 'BUTTAMAN!!', style: 'yell', size: 1.2 },
        { at: 10, hold: 2.9, text: 'BUTTAMAAAN!!!', style: 'yell', size: 1.4 },
      ],
    },
    { // 4. The encore (playtest-2, Aaron: "buttaman walking into the middle of the screen, raising his arms, then the
      //    buttaman ticket falls from the sky and lands right behind him, and then he walks off, and the player should
      //    only be able to see the scene one time ever"). Not in the B's round: the whisker harp's tune plays it
      //    (src/gags/harp.js -> butterman.encore()), once ever on this device (`once`, C.encore). Take 2 of the song.
      //    Beats: in to the middle 0-10, turns to you and throws his arms up on "the MAN with the butter" (10.5), the
      //    ticket is let go above the page at 11.25 and lands behind him two beats later, arms down 15.25-16, then he
      //    turns and walks off the other side (gone by beat 28, offscreenLead).
      id: 'encore', secret: true, once: true, start: 'auto', shift: 0, length: 'auto', bpm: 82.04,
      from: 'right',        // the side he enters from; he leaves by the other
      depth: 0.95,          // world units in front of the cat where he stands (the middle of the screen, clear of the cat)
      // The ticket (the harp's keepsake, defined in src/gags/harp.js): let go `at` beats into the scene, high above the
      // top of the page, it flutters down over `fall` beats and lands lying flat `behind` world units behind him (toward
      // the cat). It stays: a physical keepsake like any other. Reduced motion: it is simply there, on the floor.
      ticket: { at: 11.25, fall: 2, behind: 0.34, sway: 0.09 },
      actions: [
        { id: 'walk-mid', do: 'walk-mid', length: 10, easing: 'linear', fit: true,
          audio: { file: SONG2, bpm: 82.04, beat0: 0.524, offset: 0, beats: null, fade: 0.35, gain: 1,
            landmarks: [[0, 0.44], [4, 3.45], [8, 6.44], [12, 9.32], [13, 10.04], [16, 12.24], [20, 15.19], [24, 18.1],
              [27, 20.26], [28, 20.96], [29, 21.7]] } },
        // turn: beats to face you; up: beats for the arms to fly up (a little overshoot); down: beats to bring them
        // down at the end; arms: degrees each arm opens from straight up (a Y); pump: degrees they pump on each beat
        { id: 'raise', do: 'raise', length: 6, turn: 0.5, up: 0.75, down: 0.75, arms: 34, pump: 6 },
        { id: 'walk-off', do: 'walk-off', length: 15, easing: 'linear', fit: true, turn: 0.75 },
      ],
      captions: [
        { at: 0, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 4, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 8, hold: 2.5, text: "it's the butter man", style: 'lyric' },
        { at: 10.5, hold: 4.5, text: 'the man with the butter, with the butter on him', style: 'lyric' },
        { at: 16, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 20, hold: 3.5, text: "it's the butter man", style: 'lyric' },
        { at: 24, hold: 2.4, text: "it's the butter man", style: 'lyric' },
        { at: 26.5, hold: 1.2, text: "it's the butter man", style: 'lyric' },
        { at: 27.7, hold: 3.3, text: 'the man with the butter, with the butter on him', style: 'lyric' },
      ],
    },
  ],
  // The rise stages' intensity drives these, between min (intensity 0) and max (intensity 1).
  yell: { punch: [0.03, 0.12], shake: [0.4, 1.8], ...YELL },

  // His voice through an old tabletop AM radio (Aaron, e1111-58): every song, the yell and the whisper. The effect is
  // processed live (src/core/audio.js RADIO); the recordings and every beat time stay exactly as measured.
  radio: true,

  // His push through the room (playtest-3: never a prop into the cat). He stops pushing while he is within `slack`
  // world units of a loose prop that has less than his own width (plus `slack`) between it and the cat, whose body is
  // `catRadius` from his axis at its widest (sitting, 0.43). Props near the cat are eased off his line away from the cat
  // (src/core/world.js SWEEP.nearCat).
  push: { catRadius: 0.45, slack: 0.06 },

  footsteps: { on: false, file: 'click', gain: 0.35 },   // off (Aaron, e1109-01); a tick per footfall (strut.stepsPerBeat per beat while walking)

  // Butter whisper (Aaron, 2026-11-09): while the cat wears butter his whispered song loops in silence, and can only
  // be heard with the pointer (or a held finger) very near the butter.
  whisper: {
    on: true,
    file: WHISPER,
    far: 150,               // screen px from the butter where it is still silent
    near: 26,               // and where it is at its loudest
    volume: 0.072,          // its loudest: about -23 dB under the songs; +4.1 dB on the old .045, "a smidge louder" (e1111-41)
    fade: 0.25,             // SECONDS for its loudness to follow the pointer
  },

  // Background cameos (e1107-40): now and then he struts in, tiny and far behind the cat, stands, and struts out.
  // They stop for good on this device once the visitor has summoned him.
  // Rarer (playtest-2, Aaron: "4-5 times" in 8 minutes; it was 45 s then 1%/s, one every ~2.4 min): at least minGap
  // after the last one, then chancePerSecond, so one about every minGap + 1/chancePerSecond = 9 minutes on average.
  // The gap runs from the page load or the end of the last cameo, so a reload never brings him sooner. Nothing else
  // starts a cameo (#cameo=1 forces one, for the checks).
  cameo: {
    on: true,
    chancePerSecond: 1 / 240,   // chance each second once minGap has passed (4 min on average after it)
    duration: 2,            // SECONDS he stands there (rounded to whole beats)
    minGap: 300,            // SECONDS between cameos (and after the page loads)
    scale: 0.55,            // of his normal size
    depth: -2.6,            // world units behind the cat
    from: 'left', stopAt: 0.62,   // stops this far from the centre toward his side (0 = centre, 1 = edge)
    storageKey: 'butterman.summoned',
  },

  // His look (Aaron's sheet, docs/reference/butterman-sheet.png, e1108-10): a felt tube man. A ball head about a third
  // of his height, a soft rounded body, arms and legs as plain round tubes of one even thickness with rounded ends
  // (no hands, no feet, no visible joints), the legs split from the body by a narrow gap. Sizes in figure units (2.2 tall).
  figure: {
    grain: 0.0765,          // quarter the old .306 frequency: fibres/patterns four times larger on his body
    height: 0.24,           // his height as a fraction of the cat's (e1108-10: half of v1's 0.48; the rise still fills the screen)
    reach: 0.45,            // how far beside the cat's head he stands for the jump (world units)
    standInFront: 0.28,     // and how far in front
    body: { width: 0.33, shoulders: 0.27, depth: 0.6 },   // body half-width at the hips and the shoulders; depth: front-to-back over width
    head: 0.34,             // head radius (a ball about a third of his height)
    arm: 0.09, leg: 0.15,   // tube radius of every arm and leg, the same from end to end (no taper), ends rounded
    legGap: 0.035,          // the gap between his legs
    legDepth: 1.1,          // legs a little deeper than wide (front to back), so they flow out of the body
    // Every limb is a hose of fixed length laid as one arc (src/butterman.js, hose()). slack: hose length over the
    // hidden arm (above 1, a straight arm still curves); yellSag: how far the raised arms sag (fraction of the
    // shoulder-to-hand gap); swoop: the sag slides toward the shoulder, so the hands flick up; wobble: the sag's
    // follow-through after each snap open; wave: the S-sway (radians) while he climbs.
    // legRoot: 0-1, how straight down a leg leaves his body (1 = straight down, then it bends into the stride; 0 = along
    // the leg, whose hidden top then swings out through his back); legRootReach: how far down before it bends.
    // legRootReach 1.6 (was 1.4; fix round B, playtest-2): a phone on its side is wide, so his walks there are long and
    // his strides with them; at 1.4 a swinging leg's top showed through the bottom of his body (0.013-0.014 at 844x390,
    // over play.js's 0.01). 1.6: 0.005 there, 0.002 at 1280x900 (was 0.002-0.005); the look is the same.
    hose: { slack: 1.0, legSlack: 0.985, yellSag: 0.2, swoop: 0.35, wobble: 0.16, wave: 0.32, legRoot: 1, legRootReach: 1.6 },
  },

  // The strut (from the prototype: Becker's proud walk, Williams' double bounce, a shoulder shrug each step).
  // stepsPerBeat: 2 since he went half size (e1108-10): the walks span the same ground in the same beats, so a half-size
  // man takes twice the steps, scurrying on every beat and off-beat, with the same gait as before.
  strut: {
    stepsPerBeat: 2,
    vault: 0.7,             // 0-1: how far the hips ride up over the planted foot (straighter legs, like the sheet's walk)
    stride: 0.62, bounce: 0.05, bounceShape: 'double', lean: 0.22, chinUp: 0.18, kneeLift: 1.0,
    armSwing: 0.85, armRaise: 0.25, armLead: 0.08, contactHold: 0.45, stance: 0.6,
    shrug: 0.07, shrugRoll: 0.12, turnToCamera: 0.35, blend: 0.5,
  },
  captionStyle: { slam: 0.25, fade: 0.35 },   // beats: yell captions slam in, every caption fades out
};
