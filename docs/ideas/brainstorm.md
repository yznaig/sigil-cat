# Brainstorm: outside-the-box ideas
Ideas from command-hq-66 (2026-11-07) beyond round 1's research and its nostalgia top 10. Aaron picked six ★ ideas (e1107-39): sigil spells, hole in the universe, loaf → actual loaf, 360 no-scope, yell to summon Butterman, footer as a 1999 web page. Butterman-from-Mixamo is being previewed; the rest are undecided.
★ = my strongest picks. Effort: S = an evening, M = a weekend, L = bigger.

## Leaning into the name: sigils
- ★ **Draw a sigil to cast a spell.** Draw a shape on the background with your finger or mouse and something happens: a circle spins him, a "B" summons Butterman, a star rains cats, a zig-zag zaps him. The $1 Unistroke Recognizer (a classic 2007 research algorithm, about 100 lines, no AI) recognizes the shapes. It gives the site a reason for its name and a secret language people share. (M)
- **Hidden sigil list.** A tiny "grimoire" page lists the sigils as smudged sketches, half of them "unknown" until someone finds them.

## The cat himself
- ★ **He's a hole in the universe.** Lean into the featureless matte black. Spin him fast, or find the secret, and his body becomes a window onto a starfield or galaxy, as if he's cut out of reality. Cheap to do: render a starfield only where the cat is (stencil shader). (S–M)
- ★ **Loaf → actual loaf.** Every so often, when he settles into the loaf (lie down) pose, he turns into a literal loaf of bread for one beat, then back. Butter on a loaf: Butterman's whole plan makes sense now. (S once the model exists)
- **The butter melts.** Over a few minutes the butter slab slumps and drips down his head. Butterman comes back to re-butter. (M)
- **Eyes only in the dark.** No face by default, but two small glowing eyes open when the page dims at night, or when he wakes up startled. (S)
- **Sculpt the real cat in clay and scan it.** The brothers sculpt the cat in grey clay and scan it with the iPhone (Polycam, Scaniverse or RealityScan); the shader makes it matte black. It becomes a real-world artifact of the project, and it's a solid model path if AI generation looks off. Scan grey, not black: black clay scans badly. (M)
- **3D-print him.** The same model exported to STL means a desk figurine for each brother. (S once the model exists)

## Turntable gags (rotation is left-right only)
- ★ **360 no-scope.** Spin him one full turn in a single swipe and you get MLG mode for two seconds: airhorn, hitmarkers, a spinning Dorito, "OH BABY A TRIPLE" text. Nostalgia for the 2014 YouTube-montage era. Only a clean single-swipe 360 counts, so it stays a secret. (S–M)
- **Fidget-spinner mode.** Flick hard and he keeps spinning with momentum and a whirring sound that pitches up; a spin-count readout climbs. (S)
- **Tilt to turn.** On iPhone, tilt the phone left and right to spin him (gyroscope; iOS asks permission once). (S)

## Sound and voice
- ~~Yell to summon Butterman~~ (dropped by Aaron, e1107-45: the iPhone asks for the mic every visit).
  Was: With mic permission, shout at your phone. A loud enough yell (just a volume threshold, no speech recognition) triggers Butterman's rise scene, and the louder you are, the bigger he gets. (S–M)
- **Hold to purr.** Press and hold on the cat: a purr loop fades in and rises the longer you hold. (S)
- **Infinite sound variety.** Each tap plays a random clip at a random pitch and speed (Web Audio), so 8 recordings feel like 80. (S)
- **Foley night.** The brothers record every sound themselves. No copyright problems, and funnier.

## Old web, done on purpose
- ★ **Footer as a 1999 web page.** Make the social links (the brother's ask) into 88×31 pixel buttons, plus an odometer hit counter ("You are visitor #000042"), a "Sigil Cat webring ← →" for friends' sites, and a guestbook. Nostalgia that doubles as the required footer. (S; the real hit counter and guestbook need a tiny backend, see below)
- **Era dial.** A hidden slider restyles everything by era: 1999 GeoCities (Comic Sans, tiled backgrounds, MIDI), 2005 Flash/Newgrounds, 2014 MLG, 2026 brainrot. The cat gets a PS1-style wobbly low-poly shader in the 1999 era. (L)
- **DVD screensaver.** Leave the page alone for a while and the cat bounces around the screen like the DVD logo. Hitting a corner exactly gets a celebration. (S–M)

## Collecting and sharing
- **Loot box hats.** A crate button gives a random hat with a fake rarity ("LEGENDARY: Butter Crown, 0.4%"), saved on your device. Butter could be the rarest one. (M)
- **Record a clip.** One button records five seconds of the cat (a canvas recording) and saves a video ready for TikTok or Instagram, which the footer links to. (M)
- **Daily cat.** His mood or hat for the day comes from the date, so everyone sees the same cat today, Wordle-style, with no server. (S)

## Shared world (needs a tiny free backend, e.g. a Cloudflare Worker)
- **World pet counter.** "This cat has been petted 1,204,551 times." One shared number across all visitors. (M)
- **Other people's paws.** See live tiny paw cursors of anyone else on the page right now. (M–L)
- **Global butter.** If anyone, anywhere buttered the cat in the last minute, everyone sees butter. (M)
GitHub Pages stays the host; only the counter or live layer would live on the free worker.

## Tools that make the build easier
- ★ **Butterman from Mixamo.** He's a humanoid stick figure, so he can use Adobe Mixamo's free human rig and animations directly (strut, swagger walk, catwalk, arms-raised poses). Rig a simple black stick-figure mesh once, then pick the walks from a library instead of animating them. (S–M)
- **Cascadeur for the cat's jumps and stretches.** Free for small creators. Its physics assist makes jumps and landings feel heavy and real. (M)
- **Daily cat check.** A GitHub Action screenshots the live site every day, so a broken push shows up fast. (S)
