# Nostalgia ideas
Ideas for buttons, Easter eggs, trinkets and small utilities on the floating-cat page, mined from classic meme, toy and widget websites (1989 to 2012).
Each idea says how it works on our page, where it comes from, effort (S/M/L) and trigger type; researched 2026-11-07 with headless screenshots of each site (shots were scratch files and are not kept in the repo).

**How to read effort:** S = an evening, mostly 2D/CSS or one sound. M = needs the 3D cat to do something new (a look-at, a new emote) or a small physics/audio system. L = new 3D assets or a backend.

## Top 10 picks

1. **Neko eyes (he watches you, then naps)**
   The cat's head (or just his eyes, if he has any) turns to follow the cursor or finger while he floats. Stop moving for ~20 s and he yawns, curls up and drops into the existing `sleep` pose, with a tiny "z z z" in 2D. Move again and he startles awake (small hop and an emote). The 1989 Neko cat did exactly this: chase the cursor, paw at it, fall asleep when you leave it alone. It ties straight into the pose cycle we already planned.
   Inspired by: [Neko (software)](https://en.wikipedia.org/wiki/Neko_(software)), [WebNeko](https://webneko.net/). Effort **M** (3D look-at with clamped angles). Trigger: **always-on behavior + idle timeout**.

2. **Shake him and he loses it**
   Drag the cat back and forth very fast (or physically shake your phone) and he goes dizzy: spins on his own, swirly eyes, a "MRRRAAAOW" from the sound pool, then slumps into `lie down` looking sick. Staggering Beauty's whole joke was "shake the mouse hard and the calm worm freaks out." We keep the payoff (sudden chaos from a calm thing) and drop the strobe: no flashing colors, just motion and sound.
   Inspired by: [Staggering Beauty](http://www.staggeringbeauty.com) (George Michael Brower, Google Creative Lab). Effort **S–M** (velocity check on drag + one emote clip; `devicemotion` on phones needs a permission tap on iOS). Trigger: **Easter egg (gesture)**.

3. **MAKE IT RAIN (cats)**
   A small button rains dozens of tiny matte-black cat silhouettes from the top of the screen. They bounce off the big cat (he flinches each time), pile up along the footer, then fade. Tap the button again and more come. Cat Bounce is literally this: cat photos bouncing around, and a "MAKE IT RAIN" button that adds more.
   Inspired by: [cat-bounce.com](https://cat-bounce.com) (Tara Sinn, 2012). Effort **M** (2D physics: a few dozen circles, or matter.js). Trigger: **button**.

4. **"It looks like you're trying to pet a cat"**
   After the 10th tap, a Clippy-style assistant (a paperclip, or a tiny second cat in a speech bubble with a Windows 98 grey border) pops up from the corner: "It looks like you're trying to pet a cat. Would you like help? [Pet harder] [Don't show me this tip again]". "Pet harder" triggers a big purr emote. It shows up once per visit and has a real close button.
   Inspired by: Clippy / Office Assistant (Office 97). Effort **S** (HTML/CSS dialog). Trigger: **Easter egg (many taps)**.

5. **Welcome to Catsite (Zombo voiceover)**
   A tiny "enter" link, or the first idle minute, plays an absurdly confident announcer over a slow pulsing ring around the cat: "Welcome... to catsite. You can do anything at catsite. Anything at all. The only limit... is yourself." A fake loading bar under the cat creeps to 99% and stays there. Zombo.com was a parody of Flash intro pages: a loading screen that never loads anything, plus a voice promising everything.
   Inspired by: [zombo.com](https://web.archive.org/web/2004/http://www.zombo.com/) (Josh Levine, 1999). Effort **S** (one recorded voice line, which the brothers can record themselves). Trigger: **Easter egg (idle or hidden link)**. Needs **audio**.

6. **Hampster Dance mode (Cat Dance)**
   Type `dance` (or tap the footer paw five times) and rows of tiny 2D dancing cats fill the background under a looping, sped-up, chipmunk-ish 9-second tune. The big cat bobs on the beat. Tap him to stop it. The original Hampster Dance was four animated hamster GIFs repeated in rows over a 9-second sped-up loop. It was dumb, loud and it went everywhere.
   Inspired by: [Hampster Dance, 2000 capture](https://web.archive.org/web/2000/http://www.hampsterdance.com/) (Deidre LaCarte, 1997). Effort **M** (4 sprite frames × 2–3 dance moves; an **original** loop, not "Whistle Stop"). Trigger: **Easter egg (typed code / taps)**. Needs **audio + 2D**.

7. **Pointer Cat**
   Click anywhere on the empty background (not the cat) and he turns to stare at the spot, raises a paw and points at it, holds that for a second, then drifts back. Spam-click around the screen and he whips around trying to keep up. Pointer Pointer's trick: wherever your cursor stops, a photo appears of a stranger pointing right at it.
   Inspired by: [pointerpointer.com](https://pointerpointer.com) (Studio Moniker, 2012). Effort **M** (look-at, plus one "point" pose clip; it reuses the head-tracking from #1). Trigger: **interaction (background click)**.

8. **"You've petted him for N seconds"**
   A small pixel-font counter under the cat: "YOU'VE PETTED HIM 37 TIMES", with a "TWEET YOUR SCORE"-style share link that copies the text. At milestones (100, 500, 1000) he does a special emote. Nyan.cat's "You've nyaned for 8.6 seconds" turned a looping GIF into a stupid high-score contest.
   Inspired by: [nyan.cat](https://www.nyan.cat) (Chris Torres / PRguitarman, 2011). Effort **S** (localStorage count; wrap reads/writes in try/catch). Trigger: **utility**.

9. **Is it Caturday?**
   The cat reads the date and time. Saturday: a tiny party hat, plus a footer line in giant type: "IS IT CATURDAY? YES." Late at night (local time): the page warms and dims and he spends more time asleep. 25 December: Santa hat. Isitchristmas.com answers one question with one giant word ("NO") 364 days a year, and that's the whole joke.
   Inspired by: [isitchristmas.com](https://isitchristmas.com). Effort **S** for the text and time-of-day mood, **M** if hats are 3D props. Trigger: **Easter egg (date/time)**.

10. **Fish slap**
    A small 🐟 button turns your next drag into a slap: swipe across the cat and a wet cartoon fish smacks him (wobble squash on the mesh, "SPLAT" sound, a brief offended emote). It goes back to normal rotation after one slap, so it never fights the main drag. Eel Slap is a slow-motion video you scrub with the mouse, and it's satisfying because the hit tracks your hand exactly.
    Inspired by: [eelslap.com](https://eelslap.com) (2011). Effort **M** (2D fish sprite plus a squash/stretch on the mesh). Trigger: **button + gesture**.

## Site by site

Shot names below record which screenshot each note came from; the images themselves were scratch files and are not in the repo. Re-take any of them with the `shot` command.

### Zombo.com
- Link: live [zombo.com](https://zombo.com) (under new owners since Feb 2026); original [Wayback 2004](https://web.archive.org/web/2004/http://www.zombo.com/), now running under Ruffle.
- 1999, Josh Levine. A Flash "intro" page that never loads and a voice promising "anything is possible at Zombocom". It stuck because it parodied the loading screens everyone hated, and the voice line is endlessly quotable.
- Ideas: the catsite voiceover (#5, strong fit: it's audio only, so it doesn't touch the cat); a never-finishing "loading cat… 99%" bar as a footer gag (S).
- Shots: `zombo-com-1280w.png` (live: crayon logo, "Loading… 0%", "New Management" note), `ruffle/web-archive-org-web-2004-http-www-zombo-com-1280w.png` (the archived Flash only reached the Ruffle loader within 15 s).

### Hampster Dance
- Link: [Wayback 2000](https://web.archive.org/web/2000/http://www.hampsterdance.com/); the 2003 capture shows the later commercial version (album, shop).
- 1997 GeoCities page by Deidre LaCarte, made in a traffic contest with her friend and sister. Four hamster GIFs in rows over a 9-second sped-up loop of Roger Miller's "Whistle Stop". About 800 visits in two years, then roughly 60,000 in four days once email chains picked it up (1999).
- Ideas: Cat Dance mode (#6, strong fit); the footer could quietly hide one dancing mini-cat as a clue.
- Shot: `h99/web-archive-org-web-1999-http-www-hampsterdance-com-1280w.png` (rows of hamsters, "dance the night away", a sponsor banner on top).

### Staggering Beauty
- Link: [staggeringbeauty.com](http://www.staggeringbeauty.com) (live).
- c. 2012, George Michael Brower (Google Creative Lab), a Chrome experiment. A black worm wobbles gently until you shake the mouse hard; then the screen strobes and screams. It stuck because the calm-to-chaos swing is a surprise you want to show a friend.
- Ideas: shake-to-freak-out (#2, strong fit; a matte-black worm and a matte-black cat are basically the same character). Keep the surprise, drop the strobe.
- Shots: `www-staggeringbeauty-com-1280w.png`, `sb/…` (both show the gate it now opens with: "⚠ FLASHING IMAGES, LOUD NOISES [OK]". Even the original now needs a warning, which tells us to skip the strobe).

### Pointer Pointer
- Link: [pointerpointer.com](https://pointerpointer.com) (live).
- 2012, Studio Moniker (Amsterdam). Rest your cursor and a photo appears of someone pointing exactly at it. It stuck because it feels like the site sees you.
- Ideas: Pointer Cat (#7, strong fit); a cheap 2D version: an arrow paw-print appears where you clicked and the cat glances at it.
- Shots: `pointerpointer-com-1280w.png`, `pp2/…` ("Please move your pointer". Synthetic mouse events didn't trigger it, which suggests it needs real pointer movement).

### Cat Bounce
- Link: [cat-bounce.com](https://cat-bounce.com) (live).
- 2012, Tara Sinn, while playing with a Flash physics engine; rebuilt for modern browsers in 2017 by Nick Hulea. Cats bounce around, you fling them, and "MAKE IT RAIN" adds more. It stuck because flinging cats around is very easy to enjoy.
- Ideas: MAKE IT RAIN (#3, strong fit); its "MESSAGE FROM CAT" link could become a cat-written note (see the guestbook ideas below).
- Shots: `cat-bounce-com-1280w.png` (a cat dropping in from the top, gradient background), `rain/cat-bounce-com-1280w.png` (after clicking Make It Rain: the background changed color and the cats had fallen off-screen by the time of the shot).

### Paper Toilet
- Link: [Wayback 2009](https://web.archive.org/web/2009/http://www.papertoilet.com/) (Flash, via Ruffle; the live site may also work).
- Rafaël Rozendaal, one of his 100+ "single-serving" art sites. Drag to unroll a toilet roll until it runs out, and it is never refilled for you. It stuck because the dumb physical action has a real ending.
- Ideas: a ball of yarn hangs by the cat; drag it down and it unravels forever while he bats at it. Once it's gone, it stays gone (localStorage) (M, good fit). Or a scroll-wheel version where the scroll unrolls the yarn.
- Shot: `web-archive-org-web-2008-http-www-papertoilet-com-1280w.png` (Ruffle loader; the Flash was slow through Wayback).

### The Useless Web
- Link: [theuselessweb.com](https://theuselessweb.com) (live).
- 2012, Tim Holman. One "PLEASE" button sends you to a random pointless site. It stuck because it's a button to press when you're bored, again and again.
- Ideas: a "PLEASE" / "Bored?" button that fires a random Easter egg from our own pool, so people find eggs without knowing the codes (S, strong fit; it also solves discovery on phones).
- Shot: `theuselessweb-com-1280w.png`.

### neal.fun
- Link: [neal.fun](https://neal.fun) (live; Cloudflare blocked the screenshot).
- Neal Agarwal, since 2016. Polished one-idea toys (Spend Bill Gates' Money, The Password Game, Infinite Craft). They stuck because each one does one idea perfectly and is easy to share.
- Ideas: "Spend the Cat's Money": the cat's fake net worth (3 treats) and a shop of absurd items (M, medium fit, it's a page, not the cat). More useful as a principle: each egg does **one** thing and does it well.
- Shot: `neal-fun-1280w.png` (bot check only).

### heeeeeeeey.com
- Link: [heeeeeeeey.com](https://heeeeeeeey.com) (live).
- Mike Bodge. Black screen, a giant "HOOOOOOOOO!" and an endless sax-guy "heeeeey" audio loop. It stuck because of one sound and one word.
- Ideas: a hidden domain-style egg: visiting `#heeeey` (URL hash) makes the cat yell one long elongated meow, with the letters stretching across the screen (S, good fit).
- Shot: `heeeeeeeey-com-1280w.png`.

### Nyan Cat
- Link: [nyan.cat](https://www.nyan.cat) (live).
- April 2011, Chris Torres (PRguitarman)'s pixel Pop-Tart cat GIF, set to daniwell's song. The site counts how long you've been nyaning. It stuck because of the earworm plus a score to brag about.
- Ideas: the petting counter (#8, strong fit); a secret rainbow trail behind the cat while you drag him (S–M, matte-black cat with a rainbow is a good contrast); "Pick a flavor" → cat skins (L, needs new materials).
- Shot: `www-nyan-cat-1280w.png` (nyan cat, music player, "YOU'VE NYANED FOR 8.6 SECONDS").

### Patience is a Virtue
- Link: [Wayback 2013](https://web.archive.org/web/2013/http://www.patience-is-a-virtue.org/).
- 2012, wadiraal.net ("a crazy experiment"). A "Loading, please wait" spinner that just keeps going. It stuck because it's an anti-joke: the wait is the content.
- Ideas: a button labelled "Feed the cat (please wait)" with an endless spinner; after 60 s the cat burps (S, good fit, payoff on a timer).
- Shot: `pat/web-archive-org-web-2013-http-www-patience-is-a-virtue-org-1280w.png` (the spinner, still going after 15 s).

### Is it Christmas?
- Link: [isitchristmas.com](https://isitchristmas.com) (live; source is public on GitHub at `isitchristmas/web`).
- One giant word, "NO", every day but one. It stuck because people come back every year for 25 December.
- Ideas: Is it Caturday? (#9, strong fit).
- Shot: `isitchristmas-com-1280w.png` (huge black "NO" on white, which is close to our own look).

### Eel Slap
- Link: [eelslap.com](https://eelslap.com) (live).
- 2011 (domain registered March 2011; the creator is credited as Per Stenius, though sources disagree). You move the mouse across a video and a man gets slapped by an eel in slow motion. It stuck because the hit follows your hand frame by frame.
- Ideas: Fish slap (#10).
- Shots: `eelslap-com-1280w.png` (video still loading), `eel/eelslap-com-1280w.png` (after a mouse sweep: mid-slap).

### The Million Dollar Homepage
- Link: [milliondollarhomepage.com](http://www.milliondollarhomepage.com) (live, sold out).
- 2005, Alex Tew (a 21-year-old student). Sold 1,000,000 pixels at $1 each to pay for university. It stuck because of the stunt and the visible ad wall.
- Ideas: "The Million Pixel Cat": a pixel-grid version of the cat in the footer where every click fills one random cell, never paid (M, weak fit). The bigger lesson is in Avoid: a dense ad wall is the opposite of our calm page.
- Shot: `www-milliondollarhomepage-com-1280w.png` (the whole wall, "SOLD OUT!").

### Space Jam (1996)
- Link: [spacejam.com/1996](https://www.spacejam.com/1996/) (live, preserved by Warner Bros).
- 1996 movie site, untouched for decades: tiled starfield, planets as nav links. It stuck because it's the most famous surviving piece of '96 web design.
- Ideas: a "1996 mode" (Easter egg URL `?1996` or a tiny "view in 1996" link): starfield tile background, Comic Sans, planets orbiting the cat as fake nav links (M, good fit, a theme swap, the cat stays put).
- Shot: `www-spacejam-com-1996-1280w.png`.

### Badger Badger Badger (Weebl's Stuff)
- Link: [Wayback 2005](https://web.archive.org/web/2005/http://www.badgerbadgerbadger.com/) (Flash via Ruffle).
- 2003, Jonti Picking (Weebl). Looped Flash: badgers doing squats, "mushroom mushroom", then "a snake, oh it's a snake!". It stuck because of a hypnotic loop with one surprise in it.
- Ideas: Cat Squats: on loop, the cat and 11 clones do squats to a chant that's all "cat cat cat… TREAT! TREAT!" (M; good fit as an alternative or extra to Cat Dance mode); a rare snake, as a 1-in-50 chance on any tap (S).
- Shot: `ruffle/web-archive-org-web-2005-http-www-badgerbadgerbadger-com-1280w.png` (Ruffle loader; links show "AIM Buddy Icon | Windows Media Player Skin | Wallpaper" as period furniture).

### Albino Blacksheep and Newgrounds classics
- Links: [albinoblacksheep.com](https://www.albinoblacksheep.com/) (live), [Know Your Meme: Peanut Butter Jelly Time](https://knowyourmeme.com/memes/peanut-butter-jelly-time).
- Flash portals of 1998–2008. Peanut Butter Jelly Time (2002, Ryan Gancenia Etrata and Kevin Flynn, a dancing banana with maracas), Llama Song (2005), Numa Numa (Gary Brolsma, 2004). They stuck because of a short loop, one silly dance, and endless remixes (PBJT spawned hundreds of YTMND remakes).
- Ideas: "IT'S TREAT TIME": the cat shakes two tiny maracas and bobs (M; needs an original song, not Buckwheat Boyz); a webcam-free "Numa" lip-sync: the cat mouths along to a short clip (L, skip).
- Shot: `www-albinoblacksheep-com-1280w.png` (featured player, "Bob and the Apple").

### Homestar Runner
- Link: [homestarrunner.com](https://homestarrunner.com) (live, "celebrating 25 dot coms").
- Mike and Matt Chapman (The Brothers Chaps): a 1996 book idea, then the site from 2000. Strong Bad Emails, Trogdor. Almost every toon hides Easter eggs, found by clicking at the right moment or at the end. It stuck because fans hunted for eggs and traded where they were. That's two brothers building the same kind of thing we are.
- Ideas: the "click at the end" habit: after any emote, a tiny clickable thing sits in a corner for 3 s and clicking it plays a bonus line (S each, strong fit); a Trogdor-style dumb song about the cat as one long egg (M).
- Shot: `homestarrunner-com-1280w.png`.

### Orisinal (Ferry Halim)
- Link: [Wayback ferryhalim.com/orisinal](https://web.archive.org/web/2013/http://www.ferryhalim.com/orisinal/).
- c. 2000–2010. Soft, pastel Flash mini-games ("Bells", "Winterbells"): a calm mood and one-button play. They stuck because they were gentle and beautiful in a loud era.
- Ideas: tone reference for our warm background; a "Winterbells" mini-game: the cat hops upward on floating bells (L, outside the cat-is-the-page idea, so it would be a separate egg page).
- Shot: `web-archive-org-web-2012-http-www-orisinal-com-1280w.png` ("Couldn't load plugin.": this capture's Flash didn't run, even with Wayback's Ruffle).

### JacksonPollock.org
- Link: [jacksonpollock.org](http://www.jacksonpollock.org/) (live).
- 2003, Miltos Manetas. A blank page; moving the mouse drips paint, and the faster you move, the thicker it gets. It stuck because it makes you an "artist" by accident.
- Ideas: a paw-print or tail trail drawn on the background as you drag the cat, fading after a few seconds (S–M, good fit, it rewards the main interaction).
- Shots: `www-jacksonpollock-org-1280w.png` (blank before moving), `jp/www-jacksonpollock-org-1280w.png` (after a scripted mouse sweep: grey drip lines).

### Bored Button
- Link: [boredbutton.com](https://boredbutton.com) (live, since 2006).
- A big red button that sends you to a random toy site. It stuck because the button is physical-looking and begs to be pressed.
- Ideas: same as the Useless Web: a random-egg button. Or a big glossy red button labelled "DO NOT PRESS" that does something worse each time (S, strong fit).
- Shot: `boredbutton-com-1280w.png`.

### YTMND
- Link: [ytmnd.com](https://ytmnd.com) (live; Cloudflare blocked the screenshot).
- 2001, Max Goldberg. One image, one line of zooming text, one looping sound. "You're the man now, dog!" It stuck because anyone could make one in a minute.
- Ideas: a hidden `#ytmnd` URL mode: the cat gets a giant zooming caption and a looping sound (S, good fit); the format itself (image + caption + loop) is a good template for quick eggs.
- Shot: `ytmnd-com-1280w.png` (bot check only).

### Koalas to the Max
- Link: [koalastothemax.com](https://koalastothemax.com) (live).
- Vadim Ogievetsky, made for Annie Albagli, built with D3. A circle splits into four as you mouse over it, until a koala photo appears. It stuck because it's oddly satisfying, with a reveal at the end.
- Ideas: "Find the cat": a giant dot hides a secret image (the cat in a silly costume, or a photo of the brothers' real pet), revealed by hovering (M, medium fit, a separate egg overlay).
- Shots: `koalastothemax-com-1280w.png` (the first big circle), `koala/koalastothemax-com-1280w.png` (after a mouse sweep: half-split into a dark koala shape).

### Neko and desktop pets (Shimeji, Tamagotchi)
- Links: [Neko on Wikipedia](https://en.wikipedia.org/wiki/Neko_(software)), [WebNeko](https://webneko.net/), [Shimeji (Pixiv dictionary)](https://dic.pixiv.net/en/a/Shimeji).
- Neko: Naoshi Watanabe's PC-9801 original, then the 1989 Mac port (Kenji Gotoh), oneko (1990), WebNeko (2004), oneko.js (2022). A pixel cat chases your cursor, scratches, falls asleep. Shimeji (Yuki Yamada, c. 2009): desktop mascots that climb windows. Tamagotchi (Bandai, 1996): a pet that needs you. They stuck because the cat is "alive" when you aren't doing anything.
- Ideas: Neko eyes (#1, strongest fit); a mini Neko: one tiny pixel cat that chases the cursor around the edges while the big cat ignores it (S with oneko.js-style code); Tamagotchi-lite: a hunger meter that drops over days (stored in localStorage), and he looks grumpy until you feed him (M).
- Shot: `webneko-net-1280w.png` (the "Choose your Neko" grid of 40 skins and the copy-paste embed code, a reminder of how people spread widgets).

### Clippy and Windows-era widgets
- Office Assistant "Clippit" (Office 97). A paperclip that interrupted you: "It looks like you're writing a letter." It stuck because everyone loved hating it.
- Ideas: "It looks like you're trying to pet a cat" (#4); a fake Windows 98 error box when you rotate him upside down: "cat.exe has performed an illegal operation" with an OK button that rights him (S, strong fit).
- No screenshot (no stable live demo).

### Dancing Baby
- Link: [Dancing baby on Wikipedia](https://en.wikipedia.org/wiki/Dancing_baby).
- 1996 3D demo (Character Studio; Tony Morrill, Robert Lurye, John Chadwick), passed around as an email attachment and GIF, then on *Ally McBeal*. It stuck because it was an uncanny 3D figure doing a cha-cha.
- Ideas: the cat cha-chas (an "ooga-chaka" emote) when you type `baby` or hit the 1000-pet milestone (M, good fit, since our cat is a 3D figure too).
- No screenshot.

### GeoCities era (OoCities, GifCities)
- Links: [oocities.org](https://www.oocities.org/), [GifCities](https://gifcities.org/).
- GeoCities 1994–2009 (closed 27 Oct 2009); OoCities mirrors pages, and GifCities (Internet Archive) searches 4.5 million GIFs. The look: neighborhood addresses, hit counters, guestbooks, under-construction signs, webrings. It stuck because it was everyone's first homepage.
- Ideas: see Retro furniture below.
- Shots: `www-oocities-org-1280w.png` (the neighborhood list), `gifcities-org-search-1280w.png` ("under construction" results: striped barriers, digging-man signs, a painter guy), `www-oocities-org-heartland-meadows-1015-1280w.png` (dead link; most GeoCities pages are only on Wayback).

## Retro furniture
Footer and side pieces. Draw each in **our** style (matte black on warm light, one accent color) so it reads as a wink, not a mess.

- **Hit counter.** An odometer of black digit tiles: "You are visitor #000042". Do it honestly and simply: a per-browser count in localStorage ("you've been here 7 times"), or a counter that always shows a funny number and says so in its tooltip. Avoid third-party counter widgets (ads, trackers). A real global count needs a backend; skip it unless the brothers want one.
- **Guestbook.** "Sign my guestbook" opens a parchment card. Simplest honest version: a link to GitHub Discussions or a mailto. A fun one: the cat "signs" it himself with a rotating set of obviously-the-cat entries ("meow. 5 stars. — cat"). Never an open public post box (spam; it needs moderation).
- **Under construction.** Our own little GIF/SVG: the matte-black cat in a yellow hard hat, sitting on a tiny striped barrier. Use it next to anything unfinished (e.g. the socials before the handles are known). Look at GifCities for reference; don't hotlink.
- **Webring.** "← prev | 🐈 cat ring | random | next →" in the footer. Ring the brothers' own pages/socials, or join a real indie webring later. "Random" can reuse the random-egg button.
- **"Best viewed in…"** A tiny grey line: "Best viewed with a cat on your keyboard at 800×600." Pure text, zero cost.
- **Marquee.** One slow scrolling line of cat news ("BREAKING: cat still floating • butter levels nominal"). Use a CSS animation, not `<marquee>`; pause on hover; stop entirely under `prefers-reduced-motion`.
- **88×31 badges.** A row of fake old-web buttons: "Made with Notepad", "Powered by Butter", "Cat approved". Static images, one row, footer only.
- **"Last updated" stamp.** "Last updated: whenever the cat felt like it", or the real git commit date. Cheap and very GeoCities.
- **"NEW!" blinker.** A small "NEW!" next to the newest egg's hint, blinking at most about once a second (well under the flash limit), off under reduced motion.

## Avoid
- **Strobe or flashing.** Nothing that flashes more than 3 times a second, and no big full-screen color flips (WCAG 2.3.1). Even Staggering Beauty now opens behind a warning gate.
- **Autoplay audio.** Sound starts only after a user tap (browsers block it anyway). Add a mute toggle that is remembered, and keep loops short and quiet.
- **Copyrighted tracks.** "Whistle Stop" (Hampster Dance), the Buckwheat Boyz (PBJT), "Dragostea din tei" (Numa Numa), the Nyan song: make original loops or use clearly licensed ones.
- **Codes with no hint, especially on phones.** Keyboard codes don't work on mobile. Every egg needs a tap or gesture path too, or a random-egg button.
- **Fighting the main drag.** Eggs that hijack drag (slap, paint trail) must be one-shot or need a button press first, so rotating the cat always works.
- **Clutter.** A Million-Dollar-Homepage wall of widgets kills the "the cat is the page" idea. Furniture stays in the footer, small.
- **Embedding old Flash or third-party widgets.** Ruffle through Wayback took over 15 s or failed in testing, and counters or guestbook services bring ads and trackers. Rebuild the idea natively.
- **Blocking popups.** Clippy-style boxes appear once per visit, have a close button, and never cover the cat.
- **Ignoring reduced motion.** Respect `prefers-reduced-motion` for rains, marquees and dance modes.

## Sources
- Zombo.com — [Wikipedia](https://en.wikipedia.org/wiki/Zombo.com): encyclopedia entry with creator, the 2021 HTML5 port and the Feb 2026 domain sale.
- Hampster Dance — [Wikipedia](https://en.wikipedia.org/wiki/Hampster_Dance): creator, the traffic contest, song source and traffic numbers; [Wayback 2000 capture](https://web.archive.org/web/2000/http://www.hampsterdance.com/): primary, the page itself.
- Neko (software) — [Wikipedia](https://en.wikipedia.org/wiki/Neko_(software)): lineage of ports with authors and years.
- WebNeko — [webneko.net](https://webneko.net/): the live 2004 web port and its embed code (primary).
- Cat Bounce — [About page](https://cat-bounce.com/about): the creator's own credit (Tara Sinn, 2012; Nick Hulea, 2017).
- Staggering Beauty — [Laughing Squid](https://laughingsquid.com/?p=187021): contemporary coverage naming George Michael Brower and the epilepsy warning.
- Paper Toilet — [Rhizome ArtBase](https://artbase.rhizome.org/wiki/Document:Q5243): art-archive record placing it among Rozendaal's single-serving sites.
- Eel Slap — [Webiano](https://webiano.digital/eel-slap-is-the-internet-reduced-to-one-perfect-bad-idea/): registration date and the Per Stenius credit (one source; others disagree).
- Peanut Butter Jelly Time — [Know Your Meme](https://knowyourmeme.com/memes/peanut-butter-jelly-time): the standard meme encyclopedia (creators, YTMND spread, Family Guy).
- Dancing Baby — [Wikipedia](https://en.wikipedia.org/wiki/Dancing_baby): the creators and how it spread by email and GIF.
- Homestar Runner — [Wikipedia](https://en.wikipedia.org/wiki/Homestar_Runner): creators, the 2000 launch, Trogdor; [homestarrunner.com](https://homestarrunner.com): the live site itself.
- Shimeji — [Pixiv dictionary](https://dic.pixiv.net/en/a/Shimeji): Japanese-community reference crediting Yuki Yamada / Group Finity, c. 2009.
- The Useless Web — [theuselessweb.com](https://theuselessweb.com): live, with the creator (Tim Holman) in the footer.
- Nyan Cat — [nyan.cat](https://www.nyan.cat): the creator's own site ("Copyright 2011 Nyan Cat / PRGUITARMAN").
- Patience is a Virtue — [Wayback 2013](https://web.archive.org/web/2013/http://www.patience-is-a-virtue.org/): primary, with the footer credit to wadiraal.net.
- Koalas to the Max — [koalastothemax.com](https://koalastothemax.com): live, with the footer credit (Vadim Ogievetsky, D3).
- heeeeeeeey.com — [heeeeeeeey.com](https://heeeeeeeey.com): live, with the footer credit (Mike Bodge).
- Million Dollar Homepage, Space Jam 1996, Bored Button, JacksonPollock.org, Pointer Pointer, Is it Christmas, Albino Blacksheep — each site live (links above): primary sources, looked at directly on 2026-11-07.
- GeoCities furniture — [OoCities](https://www.oocities.org/): the archive's own history (GeoCities 1994 to 27 Oct 2009); [GifCities](https://gifcities.org/): Internet Archive GIF search.
- Flashing limits — [WCAG 2.3.1 Three Flashes or Below Threshold](https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html): the W3C accessibility standard.
