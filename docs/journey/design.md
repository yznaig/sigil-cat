# The Journey: a design pass

Aaron (2026-11-21): *"The end goal is for the game to be entirely playable through ... it does need to stay kind of
hard ... and require some exploring ... spawn in this empty space with this cat and then slowly start finding random
cool stuff and filling the area up with random little trophies. There does need to be a sort of progression and a sort
of guided progression, little hints throughout the games, different trophies that hint towards other things, things
the cat says."*

This is the design for that, and the plan for building it in parallel. The machine-readable half lives in
`src/journey/` (scaffolding committed with this doc): the hint graph is `src/journey/graph.js`, the nudge logic
`src/journey/progress.js`, the lines `src/journey/lines.js`. **If this doc and `graph.js` disagree, `graph.js` wins**
(its check, `checks/journey-graph.test.mjs`, runs in `checks/run-all.sh`).

---

## 1. Inventory: what exists today, and can it be played through?

Key: **R** reachable because something in the game points there; **A** reachable, but only by accident or by trying
everything; **U** effectively undiscoverable (nothing leads there; you need to be told); **G** grind or luck.

### 1.1 Sigils (draw on the air; all nine have a grimoire riddle once the grimoire link shows, after the first sigil)

| Find / achievement | How it is unlocked | Keepsake / trophy it leaves | Today |
|---|---|---|---|
| `butter` B for Butter | B sigil. Each B plays the next Butterman scene (butter, loop, rise); then always the butter | butter on his head; the pat | R (riddle) |
| `circle` Full Circle | circle sigil: 20 turns in 2 s | the spinning top | R (riddle) — but the *first* sigil has no hint except "draw on the air" |
| `bolt` Ride the Lightning | zigzag | the cloud | R |
| `loaf` Loafing Around | dome (half circle open at the bottom): he becomes bread ~5 s | crumbs (recycle) ; bread twice → flour sack | R |
| `cup` Half Full | cup (half circle open at the top): glass pushed off, shatters | puddle, shards; cup twice → pail | R |
| `box` Thinking Inside It | square | the box/chest (kitchen) | R |
| `eyes` Seeing Things | figure-eight on its side | googly eyes | R |
| `hat` Hat Trick | triangle; each cast the next of three hats | hats; the hat rack | R |
| `fork` Fork Found | fork | pitchfork (throw up → hay → cow) | R |
| `fluent` Fluent | all nine | — | R |
| `scribble` Scribble | a stroke he does not know | — | R ("draw something he does not know") |

### 1.2 Handling him

| | How | Leaves | Today |
|---|---|---|---|
| `bonk-1` … `bonk-1000` | taps | — | R / G |
| `bonk-10000` | 10,000 taps (hours) | — | **G, blocks Platinum** |
| `lucky` | 1 tap in 400 | — | G |
| `spin` Spin Doctor | let go of a drag at > 8 rad/s | — | R (hint) |
| `purr` | stroke up and down (purr ≥ 0.6) | — | R (hint) |
| `bite` Fair Warning (find) | keep petting a purring cat | tin of plasters, the plaster cursor | R (riddle) |
| `whisper` Ask the Butter (find) | pointer very close to the butter | — | R (riddle), needs butter |
| `noscope` 360 No Scope (find) | one flick, exactly once round, let go | the rifle | R (riddle), hard |
| `harp` Encore (find) | whisker tune C C B C D C (keys S S A S D S) | the encore ticket | R in name only: the riddle says "the spreader's tune" but nothing teaches which whisker is which note — **close to U** |

### 1.3 Happenings and combos

| | How | Leaves | Today |
|---|---|---|---|
| `void` Into the Void | hold a spin > 13 rad/s | the postcard | A (the circle's 20 spins are meant as the tell; nothing says "faster") |
| `blastoff` (find, combo) | spin the bread really fast | the gold star sticker | **U-ish**: combos are hidden from the grimoire until found; you must spin bread hard within 5 s by chance |
| `paradox` (find, combo) | the loaf sigil on a buttered cat (not every time) | the rejected physics paper | A (likely by chance: butter persists) |
| `fling` (find, combo) | spin a buttered cat fast, or cast the circle on him | grease streak; pat on the floor | A |
| `buttaman` Buttaman! | the third B (the rise scene yells) | — | R (B's "does" text: "each visit turns another page") |
| `shock` (combo, no find) | bolt while the puddle lies there | lights the bulb in the puddle; charges a wet top | **U** |

### 1.4 The room (trophies arriving)

| | How | Arrives | Today |
|---|---|---|---|
| `shelf` Shelf Life | own two solid keepsakes | the shelf grinds in from the left on a fanfare | A (it just happens, which is good) |
| `board` Pin It | own two flat keepsakes | the board grinds in from the right | A (happens) |
| `rack` Hat Rack | the first hat | the rack drops in | R |
| `dressup` Dress Up | wear all four hats; the party hat only comes from the cake | — | R ("four pegs. three hats, for now.") but the link to the cake is **U** |
| `light` Let There Be Light | first sigil gives a bulb → click it down → bulb in the puddle + bolt → the shade appears → drag the bulb into it | the lamp on the rack | **U** (four hidden steps, no hint at all) |
| `charged` Charged | bolt while the top stands in the puddle | a top that never stops | **U** |
| `collector` Collector | shelf bays: rifle, top, pat, tin; hooks: pail, flour | a full shelf | A (no list of what is missing) |
| `curator` Curator | board: paper, postcard, ticket, recipe | a full board | A (same) |

### 1.5 The kitchen and the bird

| | How | Today |
|---|---|---|
| `milk` Got Milk | cup twice → pail; fork thrown up through the top → hay → the cow visits; pail to the cow | **U** (cup twice, and throwing the fork, are both untaught) |
| `baker` Baker | flour, butter, milk, egg in the box; close; shake | R (the recipe card flutters down once two are held; the box says "something could be baked in there") |
| `birthday` Happy Birthday | eat the cake | R |
| `recycle` Clean Sweep | drag crumbs/shards into the bin, six times | R (the bin comes by itself) |
| `birdwatch` Bird Watcher | click the bird (first comes 90 s in) | R |
| `lostgame` (find) | the bird → trailer → controller | R |
| `flappy`, `pipes` | 1 and 15 gates | R / G (skill) |

### 1.6 Meta

`complete` Completionist (every grimoire find; its rule is another lane's tonight), `platinum` Platinum Cat (every other
achievement, **including 10,000 bonks**), the Platinum badge pinned to the board.

### 1.7 The audit, in one line each

- **Effectively undiscoverable today:** `light`, `charged`, `milk` (the pail + hay chain), the party hat → `dressup`,
  `blastoff` (hidden combo), `harp` (the note mapping), and therefore `collector`, `curator` and `platinum`.
- **No ending.** Platinum is the only "last thing", and it is gated on 10,000 bonks: nobody finishes the game, they stop.
- **No guide.** The cat speaks only a handful of fixed lines (thank you, cow; the box; the stickers). Nothing notices
  that a player is stuck. The achievements book hides ~30 of its 45 entries as "???" with no hint.
- **The first 30 seconds** teach "turn him · tap him · draw on the air" in a corner hint; nothing shows *what* drawing
  does until a sigil lands by luck.

---

## 2. The arc

The frame stays: an empty room, a felt cat, and a room that fills with trophies. The Journey adds a spine (five
chapters the player never sees named), a guide (the cat notices when you are stuck), and an ending worth a screenshot.

| Ch | Feels like | The room | What carries the player |
|---|---|---|---|
| 1 **The empty room** (0-5 min) | "what is this?" | the cat, the floor grid | the hook (§6): he speaks; the corner hint says "draw on the air". First bonk, first spin, first sigil → bulb over his head → the grimoire link appears. Riddles take over. |
| 2 **Things arrive** (5-20 min) | "oh, it's a *collection*" | shelf (left) and board (right) grind in on fanfares; the rack drops; the bird visits | keepsakes landing on the floor; the shelf/board arrival is the first big payoff and is cheap to reach (two of anything) |
| 3 **The kitchen** (20-40 min) | "there's a *recipe*?" | box/chest, pail, flour sack, pitchfork, the cow, the egg cup, cake | the recipe card, the bin, his nudges ("throw the fork at the sky...") |
| 4 **Deep secrets** (40-90 min) | "wait, the whiskers?" | lamp lit, top charged, the rifle, the postcard, the ticket, the paper, gold stars | tells in the room, cryptic nudges, the "what he said" page |
| 5 **The last page** (the end) | "I *finished* it" | a full shelf, a full board, a lit lamp, four hats, six stars | the torn last page in the grimoire fills in, piece by piece; whole, it shows his own sign. Drawing it plays the ending and hands you the room card. |

Then the **post-game**: Platinum Cat (10,000 bonks stays as the forever-goal; it is no longer the only ending).

**The last page** (new, §5) is what makes "playable through" true: eight pieces, each one a *room* trophy, so the end is
literally "the room is full":
`fluent` (all nine signs), `lostgame` (the bird's controller), `recycle` (six gold stars), `birthday` (the cake
eaten), `dressup` (four hats worn), `light` (the lamp), `collector` (a full shelf), `curator` (a full board).
Between them they need every sigil, every handling secret but the purr-free ones, the galaxy, the paradox, the harp,
the bolt-in-the-puddle, the whole kitchen and the bird. Lucky bonks, the bonk tiers, Pipe Dream, Charged, Fling,
Blast-off and Buttaman stay optional (Completionist and Platinum still want them).

**Kept hard on purpose:** nothing gives a sigil's shape before it is found; nudges come only after minutes of real
stuck time; late hints are riddles; the last page's own shape is shown only once all eight pieces are in, and even
then it is "his sign" with a start dot, which the player must still draw well enough for the recognizer.

---

## 3. The hint graph

Every secret is a node (`src/journey/graph.js`, one per achievement plus `ending`). Each node lists `needs` (what must
be done before it can even happen: it is never nudged earlier) and `hints`, each with a channel (`via`):

| via | what it is | who builds it |
|---|---|---|
| `grimoire` | a find's riddle (exists) | — |
| `book` | an achievement's locked hint (exists) | — |
| `thing` | an object or scene that already points there (the recipe card, the box's line, B's "each visit turns another page") | — |
| `cat` | he says it, when the player is stuck on that node (§4) | voice unit |
| `tell` | an environmental tell in the room | tells unit |
| `journal` | the grimoire's "what he said" page: every hint he has spoken, kept to re-read | tells unit |

**Tiers.** Chapter sets tone: ch 1 hints are near-plain ("b. just b. one stroke. somebody is waiting for it."),
ch 2-3 point at an object ("the glass came twice and left a pail. a pail is for something."), ch 4-5 are riddles
("the song goes: what's the butter man. my whiskers know it."). Inside one node, the `cat` hints are ordered vague →
clearer, and he walks down them one stuck interval at a time; the last one is never an outright instruction for ch 4-5.

**Rules (enforced by `checks/journey-graph.test.mjs`):** every achievement has a node; no cycles; every nudgeable node
has a hint that exists before the node is done and does not come from something that itself needs the node (no hint
locked behind a dead end); every node has at least one channel a player can actually meet; the ending needs all eight
pieces.

### 3.1 Dependency list (secret ← hinted by …)

Chapter 1 (gentle)
- `bonk-1` ← corner hint "tap him"; cat "you could say hello. a tap is hello."
- `spin` ← book "turn him faster than he would like"; cat
- `scribble` ← corner hint "draw on the air"; cat "the air around me takes ink. try it."
- `circle` ← riddle; cat (the ghost-doodle tell that drew it in the air was removed after the playtest: it came too
  soon, too often, and gave the easiest sign away)
- `butter` `loaf` `cup` `bolt` `box` `hat` `eyes` `fork` ← each its riddle; each one or two cat lines (e.g. cup: "the bread's roof, turned over, holds water.")
- `fluent` ← book; journal

Chapter 2 (pointed)
- `shelf` ← cat "things keep landing on my floor..."; tell **scrape** (a far-off scrape from the left wall when the first solid keepsake lands)
- `board` ← cat "paper wants a wall..."; tell **scrape** (from the right, first flat keepsake)
- `rack` ← (needs `hat`) cat "a hat needs somewhere to wait."
- `birdwatch` ← riddle "a distant visitor..."; cat "there is a bird..."
- `lostgame` ← (needs `birdwatch`) cat; `flappy` ← cat; `pipes` (grind) ← cat
- `purr` ← book; cat "up, down. up, down." → `bite` ← riddle; cat "i purr. i also count."
- `bonk-100/500/1000/10000` (grind) ← book only; `lucky` (luck) ← book only, never nudged

Chapter 3 (pointed, through things)
- `milk` ← (needs `fork`, `cup`) cat "the glass came twice and left a pail..." → "throw the fork at the sky. the sky pays in hay. hay pays in cow."
- `baker` ← box line "something could be baked in there"; recipe card; cat "bread twice leaves flour. the bird leaves eggs..."
- `birthday` ← cat "a cake you do not eat is just a hat for a plate."
- `dressup` ← rack's line "three hats, for now"; cat; tell **empty-peg**
- `recycle` ← the bin itself; cat "the bin is very encouraging. feed it."

Chapter 4 (cryptic)
- `whisper` ← riddle; tell **butter-shimmer**; cat
- `buttaman` ← B's "does" ("each visit turns another page"); cat "he has more to say. he says it louder each time."
- `harp` ← riddle; cat ×2 (the **whisker-hum** tell is gone, e1123-59: glinting the whiskers in the tune's order gave the answer away)
- `noscope` ← riddle; cat; `void` ← the circle's twenty turns; cat "faster. faster than that. there is something behind me."
- `blastoff` ← riddle (now shown once `loaf` and `spin` are done, see §5.6); cat
- `paradox` ← riddle (shown once `loaf` and `butter` are done); cat "cats land on their feet. toast lands butter down. i wear butter. make me toast."
- `fling` ← riddle (shown once `butter`); cat
- `light` ← cat "the bulb went out when you clicked it. bulbs like a jolt." → "water carries lightning..."
- `charged` ← cat "the top stops. everything stops. unless it is struck while standing in water."
- `collector` ← tell **shelf-gaps** (faint dust outlines in empty bays); cat
- `curator` ← tell **board-pins** (four empty pins; one glints while a flat thing is held); cat

Chapter 5
- `complete` ← book; `ending` ← the torn last page (8 pieces); cat "the last page is whole..."; tell **seal-head** (his head mark on the bonk seals is the sign)
- `platinum` (post-game) ← book

---

## 4. The cat's voice

He already speaks: `site.ui.speak(text | [sentences])` writes a line above his head in his script, settling into words,
with a small hop and bonk per sentence (`src/ui/hush.js`). The Journey uses only that. Style: short, lowercase, dry,
a bit smug; never more than two sentences; never a full instruction for ch 4-5.

### 4.1 Triggers (the voice unit, `src/journey/voice.js`)

| trigger | when | lines |
|---|---|---|
| `hook` | first visit only, 3 s after the doors open, then 6 s later | hook-1, hook-2 |
| `hook-tap` | first visit, first bonk | hook-3 |
| `return` / `return-long` | a later visit, 4 s after the doors; `return-long` if the last visit was > 3 days ago | back-* (if/unless filtered) |
| **stuck** | visible play time since the last live achievement ≥ **3 min** (first nudge of a visit), then every **4 min** more; only when idle ≥ 8 s and `journey.busy()` is false | `pickNudge()` → that node's next `cat` hint |
| `stuck-repeat` | the picked node has had all its cat hints | stuck-books (points at the journal) — at most once per visit |
| `stuck-none` | nothing nudgeable open (only grind/luck left) | stuck-none, once per visit |
| `idle` | no input ≥ 45 s, not busy, at most one per 90 s, max 4 per visit | idle-* (filtered by if/unless) |
| reactions | events (fizzle, first sigil, grimoire closed, shelf/board arrive, bite, galaxy, bread back, cake eaten, cow leaves) | react-*; each once ever, except fizzle (at most once per visit) |
| `piece`, `piece-7`, `piece-8` | a last-page piece is earned (journey 'piece' event) | piece-*, with {n} and {thing} |
| `idle-post` | after the ending, in place of idle | post-* |

**Never too often:** at most one journey line per 20 s; never while another line, a book, an egg or a drag is on; a
line id said in the last 12 journey lines (saved `journey.said`) is skipped; nudges escalate per node
(`journey.hinted[node]`), and the node nudged last is avoided if another is open. Every spoken line emits
`journey.emit('said', ...)` so the journal records it. `?nudge=fast` (debug) cuts the stuck intervals to 10 s / 15 s
for checks. Reduced motion changes nothing here (speech is text).

### 4.2 The lines

`src/journey/lines.js` has 48 own lines (hook, return, idle, reactions, pieces, stuck, ending, post-game) and
`src/journey/graph.js` has 43 nudge lines (`via: 'cat'`): 91 in all. A sample:

- hook: "oh. you can see me." / "this room is very empty. i am working on it."
- idle: "i do not have a face. i have opinions." / "felt is a lot to live up to."
- nudge ch 1: "if i fits, i sits. draw me four walls."
- nudge ch 3: "throw the fork at the sky. the sky pays in hay. hay pays in cow."
- nudge ch 4: "cats land on their feet. toast lands butter down. i wear butter. make me toast."
- piece: "another scrap of the last page. it was in the {thing}."
- ending: "oh. that is my sign." / "the room is full." / "thank you for filling it." / "i am going to sleep now. you can stay."

---

## 5. New content

Kept small, built from what the repo already has (the grimoire, the recognizer, the stickers, the cat's script and
poses, the stage's floor and lights).

### 5.1 The last page (torn grimoire page) — unit `ending`
A new grimoire section after the cards: "the last page", a torn sheet in eight scraps on a faint outline. Each piece
(`PIECES` in graph.js) fades in, in its place, once its trophy is earned (a scrap is one stroke segment of his sign,
so the shape assembles in drawing order). Earning a piece live: he says a piece line, and the grimoire link gets the
same small mark the achievements use. Whole: the page shows the sign with its start dot and one line: "his own sign.
draw it when the room is full." Before any piece: the section is a blank torn edge with "a page is missing.".

### 5.2 His own sign (the tenth sigil) — unit `ending`
The cat-head outline drawn as one open stroke: up his left side, over the left ear, the dip, the right ear, down his
right side (the `HEAD` path in `src/achievements.js`, the mark on every bonk seal and the platinum badge: that is the
`seal-head` tell). Added to `src/sigils/templates.js` as `cathead`, not a FINDS entry (so the grimoire count and
Completionist are untouched). Cast before the page is whole: he looks at you and says "not yet." (no find, no fizzle
achievement). Must pass `checks/sigils.test.mjs` without stealing any other sign's strokes.

### 5.3 The ending — unit `ending`
Cast the sign with the page whole: input locked ~20 s. The music fades; the room dims to dusk (one full-screen
gradient layer, not a relight); the lamp, if lit, glows warmer; one by one, each trophy on the shelf, the board, the
rack and the stickers gets a single glint (screen-space sparkle at its picture's position); he says end-1 … end-4,
goes to the sleep pose (the cycle's sleep, held); his script writes the credits across the middle ("sigil cat" / "made
by two brothers" (names or not: Aaron's call, REPORT Q2) / "thank you for playing"), settling into words. Then, a few seconds after Goodnight's stamp,
the room card (§6) opens with the ending variant: once per ending, opened by `ending.js` alone (closing it is final). Achievement `ending` **"Goodnight"** (mastery group, said: "the room was full. he slept.") is earned,
`journey.ended` is saved, and he wakes on the next tap: the post-game. Reduced motion: no dim animation (a cut), no
glints, the same lines and card. Replay: the ending's card can be reopened from the grimoire; the scene replays by
drawing the sign again (once per visit).

### 5.4 The tells — unit `tells`
All cheap, all one-shot or event-driven (no per-frame work at rest):
- ~~**ghost-doodle**~~ (removed after the playtest, with its line hook-4 "the air takes ink"): an invisible pen drew
  the circle in the air beside him early on. It came too soon and twice, and handed out the one sign players find
  easiest on their own.
- **scrape**: the first solid (flat) keepsake, if the shelf (board) is not yet unlocked: one quiet far-off scrape
  panned left (right), using the arrivals' scrape sound at low gain.
- **butter-shimmer**: with butter on and `whisper` not found, a pointer passing within ~120 px of the butter makes
  it catch a small specular glint (at most once per 20 s).
- ~~**whisker-hum**~~ (removed, e1123-59): it glinted his whiskers once each in the tune's order (C C B C D C)
  during the butter song's "what's the butter man", which handed out the harp's answer. The harp keeps its grimoire
  riddle and the cat's two nudges; `src/gags/harp.js` no longer has a `glint(index)`.
- **shelf-gaps**: an empty shelf bay or hook shows a faint dust outline of its missing item's silhouette (the item
  icons in `src/ui/item-icons.js`), only for items the player has *not yet ever owned* (an owned one elsewhere in the
  room shows no outline: no help placing what you have).
- **board-pins**: the board's empty pin heads glint once when a flat keepsake is picked up.
- **empty-peg**: with three hats and no party hat, the rack's fourth peg wobbles when he turns toward it.
- **seal-head**: nothing to build: the head mark is already on the seals; the last page's whole shape matches it.

### 5.5 "What he said" (the journal) — unit `tells`
A grimoire section: every journey line he has spoken, newest first, grouped by the node it hinted (with that node's
*name* only once it is found; before that, "something" + the line). So a hint missed in the moment is never lost, and
the grimoire becomes the player's notebook. Empty: the section is hidden.

### 5.6 Combo riddles show up — unit `tells`
Today a combo's grimoire card is hidden until found, so `blastoff`, `paradox`, `fling` have no visible riddle. Change:
a combo's unfound card (riddle, no shape) shows once its graph `needs` are done. (`src/ui/books.js` reads a small
`journey.visibleCombos()` the tells unit adds; one-line change in books.js, owned by tells.)

### 5.7 What is NOT added
No new 3D assets; no new keepsakes on the shelf or board (Collector/Curator stay as they are); no change to
Completionist's or Platinum's rules (other lanes / Aaron) beyond `ending` joining the list as any new achievement does.

---

## 6. Shareability

### 6.1 The room card — unit `share`
A canvas image of **their** room, the thing people will post:
- the room as it is now, rendered once to an offscreen target at 1200×1500 (portrait, fits a phone's share sheet;
  1600×900 landscape variant on desktop), the camera at its home view, his current pose, stickers drawn on top;
- a bone-beige frame (`#F7EDE3`, Sigil Black `#121212`), "SIGIL CAT" in Silkscreen, their **title** (`journey.title()`:
  a visitor → a regular → a friend of the cat → keeper of signs → the butter's confidant → curator of the room → the
  one who finished it), "N of 17 found · M of 46 achievements · B bonks" (the live totals, not these numbers), the date, the site address small at the
  bottom; the ending variant adds "the room was full." and a gold seal with his head;
- **Save** (download PNG) and, where `navigator.canShare({files})`, **Share** (the phone's sheet with the PNG);
- opened from a button in the grimoire's header area ("my room") at any time, and automatically at the end of the
  ending. No server, no upload, nothing personal in the image.

### 6.2 The first 30 seconds
1. the doors open; 3 s: "oh. you can see me." (hook-1)
2. a tap: he hops, bonk, "hello to you too."; 9 s: "this room is very empty. i am working on it."
3. the corner hint "turn him · tap him · draw on the air" is the only prompt; a first stroke is the player's own.
4. a first sign (most find the circle): the bulb, then the circle's twenty spins, the top lands at his feet, the grimoire link appears with
   eight riddles. That is the hook: in under a minute the player has a trophy and a list of things to find.

### 6.3 Other cheap wins (in the units above)
- the room card's title doubles as bragging rights ("keeper of signs");
- "N of 8" piece counter on the last page makes the end visible from the first piece;
- a returning visitor is greeted (return lines), so coming back feels noticed.

---

## 7. Build plan: four parallel units + integration

Each unit branches from `sc/p9-journey` in its own worktree. Everything shared is already committed: `src/journey/index.js`
(the `journey` object, the event bus, the book-section hook), `graph.js`, `progress.js`, `lines.js`, one stub per
part, the hook lines in `src/main.js` and `src/ui/books.js`, `checks/journey-boot.js` and
`checks/journey-graph.test.mjs`. A unit **fills its own part files only** and adds its own check; changes to the shared
files are limited to what is listed under "may touch". Each unit's check uses `?nudge=fast` or store seeding to get to
its state quickly, runs at 1536x864 and phone (844x390, dpr 2), and is added to `checks/run-all.sh` next to
`journey-boot`. Done for every unit = its check passes and `SC_CHECK_PORT=<port> checks/run-all.sh` ends ALL PASS.

Events and APIs between units are only through `journey.on/emit` and `journey.<part>` (index.js lists the names). A
unit that needs another's part treats it as optional (`journey.snapshot?.open?.()`), so units merge in any order.

### Unit 1 — `sc/p9-voice`: the cat's voice
- **Goal:** §4: the hook lines, return lines, idle lines, reactions, piece lines, stuck detection and nudges.
- **Owns:** `src/journey/voice.js`, `checks/journey-voice.js`. **May touch:** `src/journey/lines.js` (line wording,
  new lines), `src/journey/graph.js` (only `via:'cat'` hint texts), the dev-only `?nudge=fast` read in voice.js.
- **Must not touch:** `src/ui/hush.js` (use `ui.speak`), eggs/gags, books, other journey parts.
- **Listens for:** reactions via existing hooks only (achievements.onUnlock, registry.onFind, `sigilcat:*` window events,
  `journey.on('piece'|'book-closed')`); where an event does not exist, skip that reaction and list it in the REPORT.
- **Done check** (`checks/journey-voice.js`, real page): fresh save → hook-1 is spoken within 5 s of the doors and
  hook-3 on the first tap; with `?nudge=fast` and no input, a nudge is spoken whose text is the first `cat` hint of the
  node `journey.pickNudge` chose, `journey.hinted` counts it, a second stuck interval speaks the *next* hint or another
  node, never the same line twice in a row; earning an achievement resets the stuck clock (no nudge for the next
  interval); no line while a book is open or Butterman runs; reload → `return` line, not hook; every spoken line
  emitted `said`.

### Unit 2 — `sc/p9-tells`: tells, the journal, combo riddles
- **Goal:** §5.4, §5.5, §5.6.
- **Owns:** `src/journey/tells.js`, `src/journey/journal.js`, `checks/journey-tells.js`. **May touch:** one line in
  `src/ui/books.js` (the combo filter), small read-only hooks in `src/gags/harp.js` (a `glint(index)` for the whisker
  hum, since removed with it) and `src/world/shelf.js` / `src/world/pinboard.js` (expose empty bay/pin positions) — additive exports only.
- **Must not touch:** `voice.js`, `lastpage.js`, `ending.js`, `snapshot.js`, the egg/gag behaviour itself.
- **Done check** (`checks/journey-tells.js`): fresh save → nothing draws itself in the air (the ghost doodle is gone);
  seeded butter → a pointer pass near the butter
  fires one shimmer, not two within 20 s; seeded shelf with empty bays → the dust outlines exist only for never-owned
  items; the butter scene runs past its first line with no whisker hum (the tell was removed, e1123-59); `journey.emit('said', …)` × 2 → the grimoire shows a "what he said" section with both lines; a combo whose
  needs are done shows its riddle card, one whose needs are not stays hidden; reduced motion: tells are static or off.

### Unit 3 — `sc/p9-ending`: the last page, his own sign, the ending
- **Goal:** §5.1, §5.2, §5.3.
- **Owns:** `src/journey/lastpage.js`, `src/journey/ending.js`, `checks/journey-ending.js`. **May touch:** add the
  `cathead` templates to `src/sigils/templates.js` and its cases to `checks/sigils.test.mjs`; add one achievement row
  `ending` ("Goodnight", mastery, before `complete`) to `src/achievements.js` (and its node's `doneKey` may stay);
  register `site.spells.cathead` from lastpage.js (no `main.js` edit).
- **Must not touch:** finds.js (no new find), Completionist/Platinum logic, voice.js, snapshot.js internals (call
  `journey.snapshot?.open({ending:true})`).
- **Done check** (`checks/journey-ending.js`): seeded store with 0, 3 and 8 pieces → the grimoire's last page shows
  exactly that many scraps and the whole sign only at 8; the cathead stroke drawn as real pointer input with 7 pieces →
  "not yet.", no ending; with 8 → the ending runs (input locked, the four end lines spoken, sleep pose, credits text in
  the DOM), `journey.ended` saved, `ending` achievement earned, `ending-done` emitted, input unlocked after; reload →
  no replay, post-game idle lines eligible; `checks/sigils.test.mjs` still passes with the new sign; reduced motion run
  of the same.

### Unit 4 — `sc/p9-share`: the room card
- **Goal:** §6.1 (and the "my room" button).
- **Owns:** `src/journey/snapshot.js`, `checks/journey-share.js`, any CSS in a new `src/journey/journey.css` (linked by
  snapshot.js at runtime). **May touch:** nothing else (the button goes in a grimoire section via `journey.addSection`).
- **Must not touch:** the renderer's settings (`preserveDrawingBuffer` etc.): render to an offscreen target or read
  the canvas synchronously right after a render.
- **Done check** (`checks/journey-share.js`): `journey.snapshot.render()` resolves a PNG blob ≥ 1000 px wide whose
  pixels are not all one colour, whose middle region is not the frame colour (the room is in it); the card's text
  (title, counts, date) matches `journey.title()` and the store; the grimoire has a "my room" button that opens the
  card with Save (a download is triggered: Playwright `download` event) and, when `navigator.canShare` is stubbed true,
  Share calls `navigator.share` with one PNG file; `{ending:true}` adds the ending line; the page's frame time after
  closing the card is back to normal (no leaked render target: `renderer.info.memory` returns to its prior counts).

### Unit 5 — integration (`sc/p9-journey`, after 1-4 merge)
Merge the four branches into `sc/p9-journey`, then run **`checks/journey-playthrough.js`**: a fresh save played to the
end through real input where cheap and store seeding where slow: draw all nine sigils as strokes, seed the room
trophies one by one (`achievements.unlock` for collector/curator/light/dressup/birthday/recycle/lostgame), and assert at
each step: a piece line is spoken, the last page grows by one scrap, the nudge picker never names a done node, the
journal grows when a nudge is forced; then draw the sign → the ending → the room card opens → Save gives a PNG; reload →
post-game greeting. Plus `SC_CHECK_PORT=<port> checks/run-all.sh` ALL PASS and a real-time (no `?nudge=fast`) 10-minute
idle soak showing at most 3 nudges and no repeated line.
