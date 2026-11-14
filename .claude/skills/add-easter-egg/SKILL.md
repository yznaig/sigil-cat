---
name: add-easter-egg
description: Add a gag, brainrot button, hidden trigger or retro trinket to the floating-cat page, in its own file, so the cat reacts and the page stays smooth. Use when either brother has a new joke or bit for the site, when an idea from docs/ideas or docs/research/nostalgia-ideas.md is picked to build, or when adding a button, key code, idle surprise or footer gadget.
---

> **DRAFT (2026-11-07), for Aaron to approve.** Replaces the old "add a trinket" flow: the site is now one page where the cat is the page (`docs/ideas/brother-brief.md`), and extra gags are Easter eggs on it.

# Add an Easter egg

An egg is **one file** in `eggs/` that exports `install(api)`. The cat page calls it once at load. Each egg's own state, timing and assets live in its own file, so two people can build eggs at the same time without touching the same lines.

`api` is the cat page's handle: `request(pose)`, `emote(name)`, `setButter(on)`, `playSound(name)`, `scene`, `cat`, `camera`, `onTap(fn)`, `onFrame(fn)`. It is `window.catViewer` in the prototype. If the egg needs something the handle doesn't offer, add it to the handle in one small, named change. Never reach into cat internals from the egg.

## Steps

1. **Pin the bit in writing.** Open or create `docs/ideas/<egg>.md` and fill in: the trigger, what happens beat by beat, what the cat does, the sound, and how it ends. If the idea came from `docs/research/nostalgia-ideas.md`, link the site that inspired it. *Done when* someone else could act it out from the file.
2. **Choose the trigger**, and keep it out of the way of the core page (drag to spin, tap the cat):
   - a button in the controls row
   - a key sequence
   - an idle timeout
   - N taps
   - a date or time
   - a URL hash.
   *Done when* the trigger can't fire by accident during a normal drag or tap.
3. **Build `eggs/<egg>.js`.**
   - Load heavy assets (meshes, audio) only when the egg first fires.
   - Reuse the cat's matte material for anything black, so it looks like the same stuff.
   - The cat reacts through `api.emote` or `api.request`, never by setting bone transforms directly.
   - Timing worth tuning goes in an exported config object at the top of the file, never in scattered literals.
   - Audio uses the page's Web Audio context and starts inside the triggering gesture.
   - Respect `prefers-reduced-motion`: drop big zooms and flashes, but keep the joke.
   - No flashing faster than 3 times a second.
   - The egg returns the page to normal: removes what it added and hands control back to the pose cycle.
   *Done when* the egg runs start to finish and the page is back to its idle state afterwards.
4. **Register it.** Add one line to the egg list in the page (for example `import('./eggs/<egg>.js')`). *Done when* that's the only shared-file change in the diff, apart from any handle addition from the paragraph above.
5. **Verify.** Serve the site (`python3 -m http.server`) and run the `shot` command with `--mobile`.
   - Fire the egg with `--js`, wait to a fixed moment, and shoot.
   - If the egg has a timeline, use its seek hook (for example `?t=` on the egg) for repeatable frames.
   - Shoot once before the trigger, once mid-gag, and once after it ends.
   - Read every PNG and the console notes.
   *Done when* the three frames show what step 1 describes, the after-frame matches the before-frame (apart from intended leftovers such as the butter), and `shot` printed no CONSOLE or PAGEERROR lines.
6. **Check it's smooth.** With `#debug`, note the draw calls and frame time before and during the egg. *Done when* the egg adds 5 draw calls or fewer while running and none after it ends. Real frame rates come from a phone on the Pages URL; headless numbers are a regression signal only.

## Evidence for the report

- the idea file
- the egg file and the one registration line
- the trigger
- the before, mid and after PNG paths, with what each shows
- the console-note result
- the draw-call numbers from step 6.
