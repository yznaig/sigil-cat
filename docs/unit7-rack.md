# Unit 7: four-peg rack, shaped pixel hats and lamp

Lane B, `sc/rack`, complete under e1111-21: **21 functional scenarios / 498
assertions pass**, plus two review-capture runs / 14 assertions. The orchestrator
owns full-suite and cost validation on the merged code. No push was made.

The fixed walnut-and-brass rack has four permanent named pegs. Wizard, cone,
party and crown are hollow 3D shapes with original pixel patterns; each has one
persistent physical identity across peg, grip, floor and the cat. The same mesh
enters the cat picture, and the shared crown-height API places butter on top
through all four poses. The party return still calls `site.eggs.hat.wear('party')`.

The first wet lightning strike also awards one bulb, preserving shock and
charged-top behavior. *(Superseded 2026-11-11 by e1111-35: the bulb now comes from the first drawn sigil and lights in
the puddle; see REVIEW.md, "Bulb and rack arrival lane".)* Only that bulb fits the socket. Occupancy and on/off are
saved; warm emission and a non-shadowing fill are cached without ongoing world
work. All model art and the glow texture are ours/CC0; see
[provenance](../assets/world/rack/SOURCES.md). Shelf/fling files are unchanged.
The only shared-core addition is the event-driven
`worldLayout.invalidateShadow()` hook, documented in the frozen API section of
the plan. Mounted hats and the bulb contribute matching floor shadows.

| Review capture | Desktop | Phone |
|---|---|---|
| All four named pegs | [view](shots/world-unit7-pegs-desktop.jpg) | [view](shots/world-unit7-pegs-phone.jpg) |
| Wizard worn, butter on its crown | [view](shots/world-unit7-worn-wizard-desktop.jpg) | [view](shots/world-unit7-worn-wizard-phone.jpg) |
| Cone worn | [view](shots/world-unit7-worn-cone-desktop.jpg) | [view](shots/world-unit7-worn-cone-phone.jpg) |
| Party hat worn | [view](shots/world-unit7-worn-party-desktop.jpg) | [view](shots/world-unit7-worn-party-phone.jpg) |
| Crown worn | [view](shots/world-unit7-worn-crown-desktop.jpg) | [view](shots/world-unit7-worn-crown-phone.jpg) |
| Wizard and butter while lying | [view](shots/world-unit7-wizard-lie-desktop.jpg) | [view](shots/world-unit7-wizard-lie-phone.jpg) |
| Party hat and butter while stretching | [view](shots/world-unit7-party-stretch-desktop.jpg) | [view](shots/world-unit7-party-stretch-phone.jpg) |
| Warm socketed bulb | [view](shots/world-unit7-warm-desktop.jpg) | [view](shots/world-unit7-warm-phone.jpg) |
| Loose bulb | [view](shots/world-unit7-bulb-loose-desktop.jpg) | [view](shots/world-unit7-bulb-loose-phone.jpg) |
| Wizard underside | [view](shots/world-unit7-underside-wizard-desktop.jpg) | [view](shots/world-unit7-underside-wizard-phone.jpg) |
| Cone underside | [view](shots/world-unit7-underside-cone-desktop.jpg) | [view](shots/world-unit7-underside-cone-phone.jpg) |
| Party underside | [view](shots/world-unit7-underside-party-desktop.jpg) | [view](shots/world-unit7-underside-party-phone.jpg) |
| Crown underside | [view](shots/world-unit7-underside-crown-desktop.jpg) | [view](shots/world-unit7-underside-crown-phone.jpg) |
| Reload | [view](shots/world-unit7-reload-desktop.jpg) | [view](shots/world-unit7-reload-phone.jpg) |
| Off socket and loose crown | [view](shots/world-unit7-off-and-loose-desktop.jpg) | [view](shots/world-unit7-off-and-loose-phone.jpg) |
| Legacy party save | [view](shots/world-unit7-legacy-party-desktop.jpg) | [view](shots/world-unit7-legacy-party-phone.jpg) |
| Collection layout | [view](shots/world-unit7-collection-desktop.jpg) | [view](shots/world-unit7-collection-phone.jpg) |

Additional `world-unit7-back-*`, `grip-*`, `butter-*`, `off-*` and `rest-*`
captures in `docs/shots` show the handled geometry, pose returns and off state.
There are 66 unit-specific captures. The primary peg/worn/pose/warm review
captures use full DPR: desktop 1280×900 at 1, phone 390×844 at 2. The prepared
asset studios provide close three-angle material views in
[art-ready](art-ready.md).

The contact audit is retained in
[world-unit7-contact-results.json](../checks/diag/world-unit7-contact-results.json).
It includes failures and the measured fixture correction: fresh seeded releases
plus continuous physical lifts preserve the 8s sleep, <=2px visible contact and
energy requirements without teleporting stale contact manifolds. Runtime and
prepared-source byte estimates are in
[world-unit7-bytes.json](../checks/diag/world-unit7-bytes.json).

The [final functional record](../checks/diag/world-unit7-functional-final.json)
retains every selected raw log and the failed attempts before corrections.
It covers rack/reload, off/reload in both motion modes, legacy save migration,
first paint and resize, collection layout/reload, play/reload, water/reload and
party return in both motion modes. All browser work was headless on port 18749.
The ten play/water/party scenarios passed before the final upper-peg fit; the
final rack, layout and frame checks then covered that fit. These are aggregated
latest results, not a claim that the original batches passed without fixes.

| Measured behavior | Desktop | Phone |
|---|---:|---:|
| Fresh drops (100 each: wizard/cone/party/crown/bulb) | 500/500 | 500/500 |
| Worst fresh-drop sleep (limit 8s) | 6.000s | 6.000s |
| Largest settled visual gap (limit 2px) | 1.902px | 1.122px |
| Continuous physical party-hat lifts | 100/100 | 100/100 |
| Worst continuous-lift sleep (limit 8s) | 5.383s | 4.450s |
| Maximum measured energy gain (limit .01) | .006661 | .006661 |
| Settled lit/unlit work over 2.1s | 0 | 0 |
| Fixed/loose same-layout reload drift | 0px | 0px |
| First-paint/reload position jump | 0px | 0px |

The worn hat uses exact local attachment; its page coordinate follows the cat's
authored bob. Every hat passed all four poses with the correct butter crown
offset. The contact logs also retain transient visible dip depth/duration.
Runtime source is 23,592 bytes (9,835 separate gzip estimate); prepared source
including shared helpers is 13,721 bytes (6,496 gzip estimate), loaded after the
visible cat. These are byte counts, not cost acceptance measurements.

The final frame check initially recorded only 29 fresh-load samples at each
size, below the unchanged >30 requirement, while all positions had zero jump.
With host load sampled at 40.98, its one permitted isolated unchanged retry
passed: 46/56 desktop fresh/reload samples and 81/116 phone samples; both resize
directions passed. The query-flag fixture failures and the corrected 23.315%
upper-hat overlap are also retained. The fitted upper pegs reduce the desktop
party/crown overlap to 13.919%, below the unchanged 20% limit.

The old cost attempts and premise probes remain in
[historical evidence](../checks/diag/world-unit7-results.json). Per e1111-21,
no full suite or cost/speed gates ran during this final functional handoff;
their queued batch was cancelled. No appearance or play limit was raised.
Actual iPhone Safari validation remains unverified.

The meaningful implementation commits are `ae39e38` (merge prepared art),
`287f72e` (rack/hats/lamp), `8830f9b` (contacts and functional checks),
`f4a6905` (legacy rewards and complete lamp envelope), `597fb62` (lazy art),
`6745e4f` (matching mounted shadows), and `d78fbe9` (upper-peg fit).
`42dce61` commits the final functional evidence and 66 review captures. The
complete first-parent history is available with
`git log --first-parent --reverse fb6fc68..sc/rack`.
