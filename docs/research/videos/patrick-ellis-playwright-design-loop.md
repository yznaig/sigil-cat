# Patrick Ellis — Turn Claude Code into Your Own UI Designer (Playwright MCP subagents)
> Research brief of Patrick Ellis's 30-min workflow talk (uploaded 2025-08-16, ~305k views): https://www.youtube.com/watch?v=xOO8Wt_i72s
> Why it matters for sigil-cat: the original, most-copied "give the agent eyes" loop. Its CLAUDE.md snippet and design-review subagent are public in a maintained repo.

**Credibility:** CTO and co-founder of an AI-native startup working with large brands. The files shown in the video are published at github.com/OneRedOak/claude-code-workflows (≈3.9k stars, pushed 2026-10). It dates from 2025 (the Opus 4.1 era), so parts are older than current Claude Code features.

**Substance score: 7/10.** It has a clear mental model and real config files, and it shows a design-review subagent run against a live site. It talks more than it builds, and it runs on the Playwright MCP, which Playwright's own README now says is heavier on tokens than its CLI.

## Exec recap
His framing is that output quality comes from **context + tools + validation**. Without screenshots the model designs "blindfolded", using only its text side. Playwright MCP lets Claude navigate, screenshot, read console and network logs, emulate devices and click through states. Two layers: a "Quick Visual Check" section in CLAUDE.md that runs after every front-end change (navigate to the changed pages, compare with the design principles and style guide, take a 1440px screenshot, read console messages), and a heavier `design-review` subagent (persona, step-by-step review, report format) for PRs. He also uses git worktrees to run 2–3 parallel attempts and pick the best.

## Key highlights
- [00:00:52] Models design "with essentially blindfolds on". They see the code, not the result.
- [00:03:29] The orchestration layer has three parts: context (docs, prompts), tools (Playwright) and validation (mocks, style guide, examples of good and bad).
- [00:04:54] "We need a fixed spec or validator in order to iterate against."
- [00:08:09] Read browser console and network logs. [00:08:22] Emulate devices and viewports.
- [00:12:00] Headed vs headless. He runs it headed so he can watch.
- [00:14:22] His CLAUDE.md "Visual Development" section points to `context/design-principles.md` and `context/style-guide.md`. [00:14:58] He drafted the principles with a deep-research report, then edited them.
- [00:18:58] `@agent-design-review` reviews the last N commits and returns a graded report: strengths, high-priority issues, console errors.
- [00:26:23] Git worktrees run the same prompt 2–3 times in parallel. Pick the best, and treat outputs as cheap.
- [00:28:51] Put visuals in the prompt: low-fidelity sketches, references, mood-board images, as well as hex codes and fonts.

## Takeaways for sigil-cat
1. Copy the *shape* of his CLAUDE.md "Quick Visual Check" and swap our `shot` command in for the Playwright MCP tools. `shot` already prints console errors and `WIDE` overflow, so it covers steps 6–7 of his list in a single call.
2. Keep a short `docs/design/principles.md` (mood, palette, type, motion rules) and point CLAUDE.md at it rather than pasting it in.
3. A design-review subagent fits a pre-merge check on a PR. It's overkill on every edit.
4. Worktree A/B runs suit the cat's look (lighting, material). Run two prompts, compare the shots side by side, keep one.
