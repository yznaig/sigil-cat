# DesignCode (Meng To) — My Whole Claude Code Workflow for a 3D Website, From A to Z
> Research brief of Meng To's 13-min three.js build with Claude Opus 5.5 (uploaded 2026-11-03, ~15k views): https://www.youtube.com/watch?v=I96tdKCCI3g
> Why it matters for sigil-cat: the closest match to our project. An agent-built three.js scene polished with a scored screenshot-vs-target loop, with every prompt published.

**Credibility:** Meng To founded DesignCode and has taught UI design for over a decade. He publishes the prompts, the plan, the judge setup and the site HTML. The loop he uses is achimala/dream-loop (≈1.8k stars, pushed 2026-09). **Caveats:** the video is sponsored by Mobbin. The YouTube transcript was rate-limited (HTTP 429) during this research, so this brief comes from his companion article and prompts file (fil.design links in the video description). Timestamps are the author's chapter markers, not transcript lines.

**Substance score: 8/10.** He shows the prompts, a numbered score history (4.6 → 8.05 over 11 rounds), what moved the score and what went wrong. Weaknesses: about 10 hours and 1,500 tool calls of Opus, and image generation through a paid tool (Aura).

## Exec recap
Find references first, and ask for screenshots rather than links. Take one idea each from two references ("copy one reference and you get a clone, take one idea from two and you get a direction"). Prompt the *feeling*, not the tech. Then run the **dream loop**: an image model renders a "finished" version of the current camera view as the target. Each round makes a change, re-captures the same camera, and a **fresh judge subagent with no memory** scores it (composition 3, lighting 3, materials 3, details 1) and lists what's wrong. A script compares regional brightness, because judging light by eye overshoots. Stop at 8+ or after two stalled rounds. Light did more than geometry. Choosing the right medium per object (modelled, painted in code, cut-out cards, baked light) did more than adding detail.

## Key highlights
- [00:01:15] The golden rule: references do the work. A lazy one-line prompt gets a generic site.
- [00:03:27] Two studios, one idea: Basement Studio's line drawing plus Poly's sunlight.
- [00:04:15] The prompt: "Build an immersive 3D-world landing page in the basement.studio / Poly style, where the whole page is one scene." Nothing technical in it.
- [00:05:44] Pick the medium per object. Modelled leaves looked fake, so plants became cut-out cards.
- [00:06:31] Round 1 scored 4.6. The judge loop is introduced. "A judge with no memory can't grade you on effort."
- [00:08:13] Install: `npx skills add achimala/dream-loop`. It needs vision, subagents and an image-generation tool. Set a time limit or a stop score, or it burns tokens.
- [00:11:05] Mistakes: a light probe captured at load went grey once dark furniture was added, and a comment mid-line swallowed code. Performance: the page measures its own frame time and lowers render resolution when it falls behind (55–80 FPS furnished on a Mac). Phones get their own camera framing.

## Takeaways for sigil-cat
1. Use the judge loop for the cat's *look* (matte-black material, rim light, silhouette against the background), with a fixed camera and a target image. Skip image generation: a hand-picked reference photo or render can be the target. Give it a stop score and a round cap.
2. A fresh-context judge with a rubric beats "make it better". It fits a Claude Code subagent that reads the `shot` PNG and the target.
3. Adaptive resolution from measured frame time is a cheap, proven safety net for phones. Add it early.
4. Matte black is all about light. His finding that light moved the score more than geometry predicts where our effort should go.
