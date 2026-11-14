# Nate Herk — Building Beautiful Websites with Claude Code Is Too Easy
> Research brief of Nate Herk's 28-min beginner walkthrough (uploaded 2026-02-19, ~588k views): https://www.youtube.com/watch?v=86HM0RUWhCk
> Why it matters for sigil-cat: the video Aaron asked about; a beginner version of the CLAUDE.md + design skill + screenshot loop + reference-site workflow, plus one useful warning about animation.

**Credibility:** Nate Herk runs a large AI-automation channel and a paid Skool community. He builds on screen, but he teaches beginners and sells a course. Treat this video as an onboarding walkthrough, not expert practice.

**Substance score: 5/10.** Everything happens on screen and in order, but most of it is beginner setup (installing VS Code, signing up for Vercel). The CLAUDE.md file it relies on sits behind his free community sign-up. There's no 3D, no performance work and no testing beyond screenshots. The one thing worth keeping is the warning about animated content.

## Exec recap
His five "hacks", in order: (0) a short CLAUDE.md that works as the project's rules, (1) the Anthropic `frontend-design` skill, with a "brand_assets" folder holding the logo and brand guide, (2) a screenshot loop with Puppeteer, where Claude renders the page, looks at it and fixes it in at least two passes, (3) cloning a reference site from a full-page screenshot plus its copied CSS, then re-skinning it with the brand assets, (4) taking single components (backgrounds, buttons) from 21st.dev. Deploys go to GitHub with Vercel auto-deploy, and a CLAUDE.md rule says to test on localhost until he says push.

## Key highlights
- [00:01:57] CLAUDE.md is "hack zero". Keep it concise and expect to keep changing it over the project.
- [00:03:48] His CLAUDE.md's first line: always invoke the front-end design skill before writing front-end code.
- [00:05:27] Puts the logo and brand guidelines in a `brand_assets/` folder and @-mentions them in the prompt.
- [00:08:03] Screenshot loop. The front-end skill gets the page "60%" of the way, and screenshots let Claude close the gap itself.
- [00:08:43] Screenshots pile up in a temp folder. [00:13:53] Name them by convention or clear them out, or you can't tell which round is which.
- [00:09:47] Reference cloning. DevTools → Ctrl+Shift+P → "Capture full size screenshot", plus the copied styles, then "clone this", then re-skin it.
- [00:18:55] **For animated backgrounds, tell it NOT to use the screenshot loop.** [00:19:17] A still frame never captures the motion, so Claude "gets stuck in this loop of thinking I haven't built this good enough… overengineers".
- [00:25:30] CLAUDE.md rule: test on localhost and push only when told.

## Takeaways for sigil-cat
1. The warning at 18:55 applies directly to the cat. A single screenshot of an idle animation looks like a bug. Shoot several frames at fixed times, or freeze the clock (a `?t=` debug param), before letting Claude judge the motion.
2. A `brand_assets/` folder is the beginner version of a `docs/design/` folder holding mood-board images and tokens. Use the idea, not the folder name.
3. Name screenshots by round and viewport (`shots/r3-mobile.png`). Our `shot` command already writes `<name>-<width>w.png`, so add a round prefix with `--out`.
4. Skip the Vercel part, since we deploy to GitHub Pages. The "localhost until I say push" rule fits as a CLAUDE.md line.
