# Nik Bear Brown — Building the Claude Mascot with Claude Code and the Blender MCP
> Research brief of an 8:56 "honesty report" (uploaded 2026-10-09): https://www.youtube.com/watch?v=t9N0a1Uz1Tk
> Why it matters for sigil-cat: a recorded, checked run of Claude Code modeling and rigging a simple character in Blender via MCP for Blender (ahujasid), failures included.

**Credibility:** Nik Bear Brown publishes the run's prompts and independently checks Claude's claims with a separate script and a Godot import. One run only (Claude Sonnet 4.6, headless, one Mac, Blender 5.1.2, MCP for Blender 2.1.9), so it is a case study, not a benchmark.

## Exec recap
From a numeric brief, Claude built a 9-box, 108-triangle mascot correctly in 9 tool calls in under 2 minutes, and an independent read-back confirmed every number. Rendering, pixel read-back and rigging needed human-caught fixes. The rig took 23 minutes and 8 turns versus under 2 for the build; it used bone parenting (rigid parts), not skinning. Fine for rigid boxes; skinning is what you need when a part has to bend.

## Key highlights
- [00:01:19] Write the brief first: each part's size and position in metres, origin at the feet, colours, triangle budget, predicted failures with the check that catches each.
- [00:02:03] Security: the add-on opens port 9876 on enable, with no password; a plain Python script could run code in Blender. Use a throwaway profile, save first, switch the add-on off after.
- [00:02:26] `claude mcp add` quirk: an env flag directly before the server name was misparsed; reorder flags.
- [00:03:13] Ask for a plan before building; the plan had a colour-space error (sRGB vs linear) that the build quietly fixed.
- [00:03:48] One `execute_blender_code` call per part, printing location/size/rotation/scale after each.
- [00:04:13] Independent script read-back: all sizes, positions, 108 tris, colours matched.
- [00:04:30] Saved renders came out grey (render read a different colour field than the viewport look tool).
- [00:04:54] Pixel read-back: Claude had the right number, then argued itself into a wrong one.
- [00:05:22] Rig: 23 min, 8 turns. Bone roll attribute error; parts jumped 4 cm because bone-parenting places the child at the bone's tail; Claude caught and fixed it.
- [00:06:05] Scaling an eye bone moved the eye 4 cm; Claude couldn't explain why.
- [00:06:27] Export: GLB with 19 nodes, 9 meshes, one skin, no animations; parts follow bones by parenting, no vertex weights.
- [00:06:48] Godot import: moving a bone moves only its part. "Bone parenting works" for rigid parts; "skinning with weights would matter if a part had to bend."

## Takeaways for sigil-cat
1. Claude + Blender MCP is good at precise, scriptable geometry and setup (armature creation, naming, NLA setup, export settings), weak at judging how it looks. Keep a human eye on silhouette and deformation.
2. Rigid parts parented to bones export cleanly to glTF; that is the no-skinning route. A cat's loaf pose needs bending, so the body needs real skin weights.
3. Pattern to copy: brief with numbers → plan → one change per call → independent read-back script → human visual check.
4. Run the MCP add-on only while working, in a throwaway Blender profile.
