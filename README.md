# Sigil Cat

A small black felt cat floating in the middle of one page. Spin him, bonk him, find his secrets.
The full spec (what the site is for, what exists, what's still wanted): [docs/spec.md](docs/spec.md).
Live at **https://yznaig.github.io/sigil-cat/**

## Run it on your computer

The page loads modules, the cat and sounds, so it needs a little local web server (opening the file directly won't work):

```
git clone https://github.com/yznaig/sigil-cat.git
cd sigil-cat
python3 tools/serve.py . 8732
```

Then open http://localhost:8732/ . Add `#debug` to the address for the pose and egg buttons, or `?perf=1` for frame
times (handy on a phone). `python3 -m http.server` works too; `tools/serve.py` just stops the browser caching.

## How it's laid out

| Path | What it is |
|---|---|
| `index.html`, `spellbook.html` | The page, and the grimoire of what you have found. |
| `src/main.js` | Wires everything together. Start reading here. |
| `src/config.js` | The cat's numbers, every sound file, the page's words. Swap a sound by changing one line. |
| `src/core/` | The cat (a Gaussian splat, drawn by our own small renderer), the stage, input, sound, saved state, keepsakes. |
| `src/eggs/`, `src/gags/` | One file per egg or gag, each with its knobs in a config object at the top. |
| `src/sigils/` | The shapes you can draw in the air and the recognizer. |
| `src/finds.js`, `src/combos.js` | Everything there is to find, and what happens when two things meet. |
| `src/ui/` | The page's look ("Hush"): the name, the counts, the row of marks, the sound control. |
| `assets/` | Splats, sounds, the rifle model, textures. Each folder's `SOURCES.md` says where every file came from. |
| `checks/run-all.sh` | Plays the whole page in a headless browser at desktop and phone size. Ends `ALL PASS`. |
| `tools/` | The scripts that made the assets, and `tools/perf/measure.mjs` for the speed numbers. |
| `prototypes/` | The experiments the site grew from. |
| `docs/` | The spec (`spec.md`), the rebuild's brief (`revamp-brief.md`), what is waiting for review (`REVIEW.md`). |

## Making a change

```
git pull                      # get the other person's changes first
# edit, then check it in the browser
git add -A && git commit -m "add duck sound"
git push                      # the live site updates about a minute later
```

No build step: what's in the repo is what's served.

Aaron builds on a longer local history and publishes it with `tools/publish.sh`, which pushes the current files as
one `publish …` commit on top of `main`. If you pushed in between, it stops and asks for `git merge origin/main` first.
