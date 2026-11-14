# Cat pose cycle
Aaron's spec for the cat's idle behavior (2026-11-07).
The cat drifts between poses on its own, with a transition clip between each pair; emotes play on site actions.

## Poses (looping holds)
sit, lie down, sleep, stretch (stretch is a one-shot, then returns to a hold)

## Transitions needed
| From | To | Clip |
|------|----|------|
| sit | lie down | sit→lie |
| sit | stretch | sit→stretch |
| lie down | stretch | lie→stretch |
| lie down | sleep | lie→sleep |
| lie down | sit | lie→sit |
| sleep | lie down | sleep→lie |
| stretch | sit | stretch ends seated (or a stretch→sit clip) |

## The cycle (Aaron, 2026-11-09: natural cat behaviour)
Three ways round, all starting seated. Weights and holds live in `CONFIG.cycle` (`src/cat.js`); `checks/site.js`
runs it 2000 steps and checks the wake-up path.
```
           3              3
   SIT ─────────► LOAF ─────────► SLEEP
    ▲ ◄─────────── │ 2              │ wakes
    │                               ▼
    │       4                 LOAF (just woke)
    ├◄─── STRETCH ◄─────────────────┤
    │                               │ 1
    ├◄──────────────────────────────┘
    │  1
    └───► STRETCH ───► SIT            (a stretch on its own)
```
- **Loaf, sleep, wake, stretch, sit:** sit → loaf → sleep → loaf (just woke) → stretch → sit.
- **Just a loaf:** sit → loaf → sit. A plain loaf goes to sleep (3) or sit (2), never to stretch.
- **A stretch on its own:** sit → stretch → sit.
- Just woke: a loaf right after sleep goes to stretch (4) or sit (1), never back to sleep (`after.sleep` on lie).
- Holds (seconds, random in range): sit 6-12, loaf 5-10, sleep 10-18, stretch 3-5 (splat cat); the splat pop takes
  1.5 s. All about a fifth longer than before.

## Emotes
Short reactions triggered by site actions (clicking the cat, Butterman, other Easter eggs). They interrupt
the cycle, then hand back to a sensible pose. Exact list still to come.
