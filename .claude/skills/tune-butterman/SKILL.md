---
name: tune-butterman
description: Build, retime or re-sound the Butterman easter egg (stick figure struts over, butters the cat, yells "Buttaman!", leaves), keeping every beat's timing and audio trim in one config file and never editing the audio files. Use when Aaron drops in new audio clips, wants a beat earlier or later, swaps the beat order, or says the sound and motion are out of sync.
---

> **Stale after round 2 (2026-11-07):** Butterman is now three scenes on one BPM grid (decisions e1107-35, e1107-39, e1107-40), built in `prototypes/butterman/` with its config and tuning notes in that folder's README. Rewrite the config shape and steps below from that prototype before approving this skill.
>
> **DRAFT (2026-11-07), for Aaron to approve.** Design from research round 1: `docs/research/sources.md` (Butterman section) and `docs/ideas/butterman.md`. Nothing here is built yet. Step 1 builds the base once.

# Tune Butterman

Butterman is a **timeline locked to the audio clock**.
- **Audio:** each clip is decoded once and scheduled with `source.start(t0 + at + delay, trimStart, length)`, which is exact to the sample.
- **Motion:** a paused GSAP timeline is set from `audioCtx.currentTime - t0` every frame, so the figure can never drift from the sound, even after the tab was hidden.
- **The sidecar:** `eggs/butterman.config.js` holds every number. The audio files are never cut or edited; trims, delays and gains live in the config (a virtual edit). Re-recording a clip means re-tuning only that clip's `trimStart`.

## Steps

1. **Build the base (first time only).**
   - `eggs/butterman.js`: a stick figure of about 10 capsules and spheres in the 3D scene, using the cat's matte material.
   - The strut is procedural. Its phase comes from distance walked, so the feet don't slide. It holds each contact, with high knees, a lean back and arms leading the legs (Alan Becker's proud walk).
   - The butter starts in the figure's hand. At the beat's `hit` moment, call `socket.attach(butter)` on the cat's `butter_socket`.
   - For "pops up huge", the figure lunges to just in front of the camera, and a DOM caption "BUTTAMAN!" slams on top.
   - Pin `gsap@3.15.0`.
   - Load lil-gui (`three/addons/libs/lil-gui.module.min.js`) only when the page opens with `?tune`.
   *Done when* the button plays all four beats with placeholder sounds and the page returns to idle with the butter on.
2. **Drop in the clips.** Put Aaron's files in `assets/audio/` as he sent them, without editing them. Point each beat's `sound.file` at its clip. *Done when* every beat with a sound has a file that loads: no `FAILED` line from `shot`.
3. **Tune by ear in `?tune` mode.** Serve the site (`python3 -m http.server`), open `http://localhost:8000/?tune`, and adjust:
   - each beat's `at`, `dur` and `hit`
   - each sound's `delay`, `trimStart`, `trimEnd` and `gain`
   - the global `nudge`.
   Use **Play this beat** and **Loop beat** to focus on one beat. Use **Chain** after reordering beats, to re-pack the start times. Then **Copy config** and paste it over `eggs/butterman.config.js`.
   *Done when* Aaron says the beats land, and the pasted config is the only file that changed.
4. **Verify with fixed frames.** Shoot one frame per beat at a seek time: `shot "http://localhost:8000/?t=1.2" "...?t=2.95" "...?t=3.5" --mobile`. That is mid-strut, the plop `hit`, and the yell. Read each PNG. *Done when*:
   - the strut frame shows the figure mid-stride
   - the plop frame shows the butter leaving the hand or landing
   - the yell frame shows the figure filling the screen with the caption
   - `shot` printed no CONSOLE or PAGEERROR lines.
5. **Check on a phone.** Open the Pages URL and play it twice. *Done when* the sound plays on the first press (this is the audio-unlock check), and Bluetooth headphones (if used) still feel in sync. If they don't, raise `nudge`, not the per-beat times.

## Config shape

```js
export const BUTTERMAN = {
  nudge: 0.00,            // + = motion later than sound, for the whole gag
  beats: [                // array order is play order; swap butter and scream here
    { id: 'strut',  at: 0.00, dur: 2.40, sound: { file: 'assets/audio/strut.mp3', delay: 0, trimStart: 0.12, trimEnd: null, gain: 1 } },
    { id: 'butter', at: 2.40, dur: 0.90, hit: 0.55, sound: { file: 'assets/audio/plop.mp3', delay: 0.5, trimStart: 0.04, trimEnd: null, gain: 1 } },
    { id: 'scream', at: 3.30, dur: 1.60, sound: { file: 'assets/audio/buttaman.mp3', delay: 0.1, trimStart: 0, trimEnd: 1.45, gain: 1.2 } },
    { id: 'exit',   at: 4.90, dur: 1.80, sound: null },
  ],
  strut: { stride: 0.55, bounce: 0.06, lean: -0.18, kneeLift: 1.1, hipSwing: 0.55, armSwing: 0.9, armLead: 0.35, contactHold: 0.3 },
};
```

## Rules that keep it in sync

- Start the gag inside the button's click handler. Call `audioCtx.resume()` before any `await`, or phones stay silent.
- Never let GSAP run on its own clock for this. Its lag smoothing (a gap over 500 ms counts as 33 ms) puts motion behind the sound after any hitch.
- Subtract `audioCtx.outputLatency` where the browser reports it. `nudge` is the manual fallback.
- On iPhone, the ringer switch mutes Web Audio unless `navigator.audioSession.type = 'playback'` is set (Safari only; feature-detect it). The caption carries the joke for anyone still muted.
- With reduced motion set, skip the lunge and the bounce, and keep the caption, the butter and the audio.

## Evidence for the report

- the config diff
- the PNG paths from step 4, with what each shows
- the console-note result
- whether the phone check in step 5 passed.
