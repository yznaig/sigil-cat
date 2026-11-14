#!/usr/bin/env bash
# run-all.sh: the unit-1 check (docs/revamp-brief.md, "Done"). Ends "ALL PASS" or lists what failed.
#   checks/run-all.sh [--shots docs/shots]
# It starts its own preview server, plays the whole page in headless Chromium on the real GPU (no window is ever
# opened) at desktop and phone size (a phone on its side, 844x390; held upright only in shell-turn), reloads and checks what survived, checks the grimoire and calm-motion mode, runs
# the sigil recognizer test, and checks that no placeholder sound is referenced and every asset the code names exists.
# --shots: where the review screenshots go (default checks/out, which git ignores).
# Needs playwright-core: PW_FROM=<folder with it in node_modules> (default: the shot tool's folder).
set -u
cd "$(dirname "$0")/.."
export PW_FROM="${PW_FROM:-$HOME/command-hq/scripts/shot}"
# Resolve jsDelivr once (3 bounded attempts), then pin Chromium's host resolver in
# both launchers. HTTPS URLs/TLS and production loading are unchanged. Standalone
# run.mjs/rack-frames.mjs resolve themselves; SC_CHECK_CDN_IP can share a known answer.
SC_CHECK_CDN_IP=$(node checks/cdn.mjs) || exit 1
export SC_CHECK_CDN_IP
SHOTS=checks/out
[ "${1:-}" = "--shots" ] && SHOTS="$2"
PORT=${SC_CHECK_PORT:-${SC_CHECK_18749:-8739}}
LOG=$(mktemp -d)
fails=()
python3 tools/serve.py . $PORT & SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 0.6
kill -0 "$SERVER" 2>/dev/null || { echo "FAILED: preview server could not start on $PORT"; exit 1; }
BASE="http://localhost:$PORT"

# one headless run; its CHECK lines are kept, and it counts as failed on any FAIL line, page error or failed request
run() {  # name, then run.mjs arguments
  local name="$1"; shift
  echo "== $name"
  # a run that never got going (the GPU process sometimes fails to start under load) is tried once more
  for try in 1 2; do
    node checks/run.mjs "$@" --quiet > "$LOG/$name.txt" 2>&1; local code=$?
    grep -q '^CHECK' "$LOG/$name.txt" && break
  done
  grep -E '^(CHECK|FAIL|PAGEERROR|CONSOLE|HTTP|REQUEST)' "$LOG/$name.txt"
  if [ $code -ne 0 ] || ! grep -q '^CHECK' "$LOG/$name.txt"; then fails+=("$name"); fi
}

# Cost checks (e1112-11, Aaron): wait up to ~3 min for a quiet machine (1-minute load below 8); if it never quiets,
# run anyway and, should the gate fail, run that cost check once more. The gates themselves are in the check files.
quiet() {  # 0 when the machine quieted in time
  local end=$((SECONDS+180))
  while [ $SECONDS -lt $end ]; do awk '{exit !($1<8)}' /proc/loadavg && return 0; sleep 5; done
  echo "(load $(cut -d' ' -f1 /proc/loadavg) after 3 min: running anyway, one retry if the gate fails)"; return 1
}
cost() {  # same arguments as run
  local name="$1" calm=1 n=${#fails[@]}; quiet || calm=0
  run "$@"
  if [ $calm -eq 0 ] && [ ${#fails[@]} -gt $n ]; then
    unset 'fails[-1]'; echo "== $name (retry, e1112-11)"; run "$@"
  fi
}
cost_rest() {  # size: the G4 rest measurement
  local calm=1; quiet || calm=0
  echo "== world-final-rest-$1"
  if node checks/world-rack-rest.mjs "$BASE/" "$1" final; then return; fi
  if [ $calm -eq 0 ]; then echo "== world-final-rest-$1 (retry, e1112-11)"; node checks/world-rack-rest.mjs "$BASE/" "$1" final && return; fi
  fails+=("world-final-rest-$1")
}

echo "== rack frames"
if ! node checks/rack-frames.mjs "$BASE/"; then fails+=("rack-frames"); fi

for size in desktop phone; do
  final_dpr=1; [ "$size" = phone ] && final_dpr=2
  run "world-atlas-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-atlas.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "world-lazy-$size" "$BASE/" --lib checks/lib.js --js checks/world-lazy.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-final-scene-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-final-scene.js --size $size --out "$SHOTS" --jpeg --timeout 180
  cost "world-final-cost-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-final-cost.js --size $size --out "$SHOTS" --jpeg --timeout 300
  cost "world-final-cake-cost-$size" "$BASE/?dpr=$final_dpr&cakecost=1" --lib checks/lib.js --js checks/world-final-cost.js --size $size --out "$SHOTS" --jpeg --timeout 300
  cost_rest "$size"
  run "world-presentation-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-presentation.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-presentation-rotor-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-presentation-rotor.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "world-shelf-play-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-shelf-play.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "world-shelf-drag-all-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-shelf-drag-all.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-support-recovery-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-support-recovery.js --size $size --out "$SHOTS" --jpeg --timeout 90
  run "world-small-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small.js --then checks/world-small-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-small-drops-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small-drops.js --then checks/world-small-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "world-small-lifecycle-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small-lifecycle.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-small-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small-lifecycle.js --size $size --out "$SHOTS" --jpeg --timeout 180 --reduced
  run "world-small-cup-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small-cup.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-small-sounds-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-small-sounds.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-cake-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-cake.js --then checks/world-cake-reload.js --size $size --out "$SHOTS" --jpeg --timeout 300
  run "world-cake-solids-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-cake-solids.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "world-cake-pouring-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-cake-pouring.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-cake-ending-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-cake-ending.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-cake-ending-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-cake-ending.js --size $size --out "$SHOTS" --jpeg --timeout 180 --reduced
  # Kitchen lane (e1111-58/59/61): the chest, the bird's egg, the recipe card, the recycling bin, the flappy replay.
  run "kitchen-chest-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/kitchen-chest.js --then checks/kitchen-chest-reload.js --size $size --out "$SHOTS" --jpeg --timeout 300
  run "kitchen-egg-$size" "$BASE/?dpr=$final_dpr&birdcheck=1" --lib checks/lib.js --js checks/kitchen-egg.js --then checks/kitchen-egg-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  # layout lane (playtest-3, e1113-07/e1113-30): the second egg brings the egg cup, falling into the row; the egg in it by hand, a reload
  run "egg-cup-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/egg-cup.js --then checks/egg-cup-reload.js --size $size --out "$SHOTS" --jpeg --timeout 200 --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}'
  run "egg-cup-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/egg-cup.js --size $size --out "$SHOTS" --jpeg --timeout 200 --reduced --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}'
  run "kitchen-card-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/kitchen-card.js --then checks/kitchen-card-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "kitchen-recycle-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/kitchen-recycle.js --then checks/kitchen-recycle-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "kitchen-recycle-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/kitchen-recycle.js --size $size --out "$SHOTS" --jpeg --timeout 180 --reduced
  run "kitchen-replay-$size" "$BASE/?dpr=$final_dpr&birdcheck=1" --lib checks/lib.js --js checks/kitchen-replay.js --size $size --out "$SHOTS" --jpeg --timeout 180
  # Gags lane, playtest 2 (2026-11-12): the pitchfork's sky fall and exit, the cake's hats, the glass, the box fling,
  # recycling's six stars, the 2D stickers, the UV lamp's smiley, the harp (tune, glow, keys, the cat holding still).
  run "gags-fork-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-fork.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "gags-hats-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-hats.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "gags-harp-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-harp.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "gags-lamp-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-lamp.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "gags-lamp-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-lamp.js --size $size --out "$SHOTS" --jpeg --timeout 150 --reduced
  run "gags-glass-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-glass.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "gags-glass-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-glass.js --size $size --out "$SHOTS" --jpeg --timeout 150 --reduced
  run "gags-box-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-box.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "gags-box-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-box.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "gags-cakes-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-cakes.js --then checks/gags-cakes-reload.js --size $size --out "$SHOTS" --jpeg --timeout 500
  run "gags-stickers-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-stickers.js --then checks/gags-stickers-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "gags-stickers-legacy-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/gags-stickers-legacy.js --size $size --out "$SHOTS" --jpeg --timeout 120 --storage '{"keepsakes":{"twinkle":{"autoHome":false,"x":0.5,"y":1.2,"state":{"sky":[0.3,0.2]},"order":3},"goodjob":{"autoHome":false,"x":1,"y":1,"state":{"sky":[0.84,0.3]},"order":4}},"worldBodies":{"twinkle":{"version":1}},"recycle":{"shown":true,"crumbs":true,"shards":true,"sticker":true,"gone":true}}'
  echo "== world-cake-reloads-$size"
  if ! node checks/world-cake-reloads.mjs "$BASE/?dpr=$final_dpr" "$size"; then fails+=("world-cake-reloads-$size"); fi
  run "world-shelf-$size" "$BASE/" --lib checks/lib.js --js checks/world-shelf.js --then checks/world-shelf-reload.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "world-shelf-solids-$size" "$BASE/" --lib checks/lib.js --js checks/world-shelf-solids.js --size $size --out "$SHOTS" --jpeg --timeout 150
  cost "world-shelf-cost-$size" "$BASE/" --lib checks/lib.js --js checks/world-shelf-cost.js --size $size --out "$SHOTS" --jpeg --timeout 240
  rack_dpr=1; [ "$size" = phone ] && rack_dpr=2
  run "world-rack-$size" "$BASE/" --lib checks/lib.js --js checks/world-rack.js --then checks/world-rack-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # G2 measures an unchanged viewport. Adaptive DPR resize is a separate event,
  # traced in world-unit7-results; pin the full device quality, never a lower DPR.
  run "world-rack-off-$size" "$BASE/?dpr=$rack_dpr" --lib checks/lib.js --js checks/world-rack-off.js --then checks/world-rack-reload.js --size $size --out "$SHOTS" --jpeg --timeout 90
  run "world-rack-calm-$size" "$BASE/?dpr=$rack_dpr" --lib checks/lib.js --js checks/world-rack-off.js --then checks/world-rack-reload.js --size $size --out "$SHOTS" --jpeg --timeout 90 --reduced
  run "world-rack-legacy-$size" "$BASE/" --lib checks/lib.js --js checks/world-rack-legacy.js --then checks/world-rack-legacy.js --size $size --out "$SHOTS" --jpeg --timeout 90 --storage '{"hat":"party","butterman":{"buttered":true}}'
  # e1111-37: the rack drops in on unlock; e1111-35: the first-sigil light bulb, every stage, every reload
  run "world-rack-drop-$size" "$BASE/" --lib checks/lib.js --js checks/world-rack-drop.js --then checks/world-rack-drop-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "world-rack-drop-calm-$size" "$BASE/" --lib checks/lib.js --js checks/world-rack-drop.js --then checks/world-rack-drop-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "bulb-$size" "$BASE/" --lib checks/lib.js --js checks/bulb.js --then checks/bulb-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "bulb-calm-$size" "$BASE/" --lib checks/lib.js --js checks/bulb.js --then checks/bulb-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240 --reduced
  echo "== bulb-reloads-$size"
  if ! node checks/bulb-reloads.mjs "$BASE/" "$size"; then fails+=("bulb-reloads-$size"); fi
  cost "world-rack-cost-$size" "$BASE/" --lib checks/lib.js --js checks/world-rack-cost.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # Bird lane (playtest-2): retry / give up, the controller stand (and its reload), the visitor schedule and its egg.
  run "bird-$size" "$BASE/?birdcheck=1" --lib checks/lib.js --js checks/bird.js --then checks/bird-stand-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "bird-calm-$size" "$BASE/?birdcheck=1" --lib checks/lib.js --js checks/bird.js --then checks/bird-stand-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180 --reduced
  run "bird-visits-$size" "$BASE/?birdcheck=1" --lib checks/lib.js --js checks/bird-visits.js --then checks/bird-visits-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180 --storage '{"bird":{"seen":true,"away":290000,"gap":300000}}'
  run "world-impacts-$size" "$BASE/" --lib checks/lib.js --js checks/world-impacts.js --size $size --out "$SHOTS" --jpeg --timeout 120
  # Furniture arrivals at real time (~75 s): the slides are skipped under automation unless ?arrivals=1.
  run "world-arrivals-$size" "$BASE/?arrivals=1" --lib checks/lib.js --js checks/world-arrivals.js --then checks/world-arrivals-reload.js --size $size --out "$SHOTS" --jpeg --timeout 220
  run "world-arrivals-calm-$size" "$BASE/?arrivals=1" --lib checks/lib.js --js checks/world-arrivals.js --then checks/world-arrivals-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  # (?dpr pinned: an adaptive pixel-ratio step inside its 2.1 s "asleep" window re-lays the board out, integration playtest-2)
  run "world-board-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-board.js --then checks/world-board-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # cards lane, playtest 3: each card kind clicked (page with one (x) / flip / wiggle), drags, nothing onto the board by itself
  run "cards-tap-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/cards-tap.js --then checks/cards-tap-reload.js --size $size --out "$SHOTS" --jpeg --timeout 300
  cost "world-board-cost-$size" "$BASE/" --lib checks/lib.js --js checks/world-board-cost.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "world-supports-$size" "$BASE/" --lib checks/lib.js --js checks/world-supports.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "world-board-integration-$size" "$BASE/" --lib checks/lib.js --js checks/world-board-integration.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "world-board-curtain-$size" "$BASE/" --lib checks/lib.js --js checks/world-board-curtain.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "sound-reel-$size" "$BASE/docs/sound-reel.html" --js checks/sound-reel.js --size $size --out "$SHOTS" --jpeg --timeout 60
  run "sounds-$size" "$BASE/" --lib checks/lib.js --js checks/sounds.js --then checks/sounds-reload.js --size $size --out "$SHOTS" --jpeg --timeout 150
  # Aaron's sound playtest (e1111-58): star tink, originals at their triggers, no contact sounds, purr bursts, radio, riser
  run "sounds-playtest-$size" "$BASE/" --lib checks/lib.js --js checks/sounds-playtest.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "sounds-radio-$size" "$BASE/" --lib checks/lib.js --js checks/sounds-radio.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "noscope-playtest-$size" "$BASE/" --lib checks/lib.js --js checks/noscope-playtest.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "world-water-$size" "$BASE/" --lib checks/lib.js --js checks/world-water.js --then checks/world-water-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "world-water-calm-$size" "$BASE/" --lib checks/lib.js --js checks/world-water.js --then checks/world-water-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "world-props-$size" "$BASE/" --lib checks/lib.js --js checks/world-props.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "world-layout-$size" "$BASE/" --lib checks/lib.js --js checks/world-layout.js --then checks/world-layout-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  # Aaron's own screen (integration, playtest-3): the default collection planned at 1536x864 (the ticket shoved onto the
  # tin's spot, the postcard under the rifle's scope)
  [ "$size" = desktop ] && run "world-layout-1536x864" "$BASE/" --lib checks/lib.js --js checks/world-layout.js --then checks/world-layout-reload.js --size 1536x864 --out "$SHOTS" --jpeg --timeout 180
  cost "world-core-$size" "$BASE/" --lib checks/lib.js --js checks/world-core.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "physics-$size" "$BASE/" --lib checks/lib.js --js checks/physics.js --then checks/physics-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "physics-calm-$size" "$BASE/" --lib checks/lib.js --js checks/physics-calm.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "play-$size" "$BASE/?birdcheck=1" --lib checks/lib.js --js checks/play.js --then checks/after-reload.js --size $size --out "$SHOTS" --jpeg --timeout 420
  run "party-$size" "$BASE/" --lib checks/lib.js --js checks/party.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "party-calm-$size" "$BASE/" --lib checks/lib.js --js checks/party.js --size $size --out "$SHOTS" --jpeg --timeout 180 --reduced
  run "audit-polish-$size" "$BASE/" --lib checks/lib.js --js checks/audit-polish.js --size $size --out "$SHOTS" --jpeg --timeout 150
  run "bread-float-$size" "$BASE/" --lib checks/lib.js --js checks/bread-float.js --size $size --out "$SHOTS" --jpeg --timeout 90
  run "bread-float-calm-$size" "$BASE/" --lib checks/lib.js --js checks/bread-float.js --size $size --out "$SHOTS" --jpeg --timeout 90 --reduced
  run "bread-float-shots-$size" "$BASE/" --lib checks/lib.js --js checks/bread-float-shots.js --size $size --out "$SHOTS" --jpeg --timeout 90
  run "noscope-footer-$size" "$BASE/" --lib checks/lib.js --js checks/noscope-footer.js --size $size --out "$SHOTS" --jpeg --timeout 100
  run "noscope-video-$size" "$BASE/" --lib checks/lib.js --js checks/noscope-video.js --size $size --out "$SHOTS" --jpeg --timeout 100
  run "look-pet-pass-$size" "$BASE/" --lib checks/lib.js --js checks/look-pet-pass.js --then checks/look-pet-seven.js --size $size --out "$SHOTS" --jpeg --timeout 90
  run "look-butterman-bite-$size" "$BASE/" --lib checks/lib.js --js checks/look-butterman-bite.js --then checks/look-bite-reload.js --size $size --out "$SHOTS" --jpeg --timeout 150
  # Butterman lane, playtest-2: rarer cameos, his depth against the keepsakes, the once-ever encore and its ticket
  run "butterman-p2-$size" "$BASE/" --lib checks/lib.js --js checks/butterman-p2.js --then checks/butterman-p2-reload.js --size $size --out "$SHOTS" --jpeg --timeout 420
  # butterman lane (playtest-3): the B's round (1, 2, 3, then 1), never a prop into the cat, scene 3 leaves the page as it was
  # (the bird kept away: its egg's arrival repacks the shelf, which the scene-3 snapshot would read as the scene's doing)
  run "butterman-p3-$size" "$BASE/" --lib checks/lib.js --js checks/butterman-p3.js --then checks/butterman-p3-reload.js --size $size --out "$SHOTS" --jpeg --timeout 480 --storage '{"bird":{"seen":true,"away":-100000000,"gap":300000}}'
  run "look-pat-return-$size" "$BASE/" --lib checks/lib.js --js checks/look-pat-return.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "look-use-$size" "$BASE/" --lib checks/lib.js --js checks/look-use.js --then checks/look-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "look-landing-$size" "$BASE/" --lib checks/lib.js --js checks/look-landing.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "look-motion-$size" "$BASE/" --lib checks/lib.js --js checks/look-motion.js --size $size --out "$SHOTS" --jpeg --timeout 120
  # the books are pop-ups now (shell lane, playtest-2): their old addresses send you to ./?book=...
  run "grimoire-$size" "$BASE/?book=grimoire" --js checks/grimoire.js --size $size --out "$SHOTS" --jpeg --timeout 90 \
    --storage '{"found":{"butter":1,"circle":1,"bolt":1,"blastoff":1,"harp":1},"bonks":12}'
  # shell lane (playtest-2): the loading screen and its doors, the books as pop-ups with start over
  run "shell-boot-$size" "$BASE/?doors=hold&dpr=$final_dpr" --js checks/shell-boot.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "shell-boot-calm-$size" "$BASE/?doors=hold&dpr=$final_dpr" --js checks/shell-boot.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "shell-books-$size" "$BASE/" --lib checks/lib.js --js checks/shell-books.js --then checks/shell-books-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180
  run "calm-$size" "$BASE/" --lib checks/lib.js --js checks/calm.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  # achievements (e1111-40/-47/-48), the rare-bonk line (e1111-39/-43) and the platinum badge (e1111-46)
  run "achievements-$size" "$BASE/" --lib checks/lib.js --js checks/achievements.js --then checks/achievements-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "achievements-book-$size" "$BASE/?book=achievements" --js checks/achievements-book.js --size $size --out "$SHOTS" --jpeg --timeout 90 \
    --storage '{"found":{"circle":1},"bonks":120,"rareBonks":2,"achievements":{"bonk-1":1762800000000,"bonk-100":1762810000000,"circle":1762820000000,"scribble":1762830000000,"lucky":1762840000000,"milk":1762850000000,"spin":1762860000000,"platinum":1762870000000}}'
  # book lane (playtest-3, e1113-05): the all-at-once view, its bar at the top, kept over a reload; also at 640x360
  ACH_STORE='{"found":{"circle":1},"bonks":120,"rareBonks":2,"achievements":{"bonk-1":1762800000000,"bonk-100":1762810000000,"circle":1762820000000,"scribble":1762830000000,"lucky":1762840000000,"milk":1762850000000,"spin":1762860000000,"platinum":1762870000000}}'
  run "achievements-view-$size" "$BASE/?book=achievements" --js checks/achievements-view.js --then checks/achievements-view-reload.js --size $size --out "$SHOTS" --jpeg --timeout 120 --storage "$ACH_STORE"
  [ $size = phone ] && run "achievements-view-640x360" "$BASE/?book=achievements" --js checks/achievements-view.js --then checks/achievements-view-reload.js --size 640x360 --out "$SHOTS" --jpeg --timeout 120 --storage "$ACH_STORE"
  run "achievements-badge-$size" "$BASE/" --lib checks/lib.js --js checks/achievements-badge.js --then checks/achievements-badge-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "achievements-badge-calm-$size" "$BASE/" --lib checks/lib.js --js checks/achievements-badge.js --then checks/achievements-badge-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240 --reduced
  # polish lane (2026-11-13): Platinum Cat the real way, from a save one short (a drawn sign; a playtest-2 one), and a lost badge given back
  for last in circle flappy lost; do
    case $last in circle) skip='["circle","fluent","platinum"]';; flappy) skip='["flappy","platinum"]';; lost) skip='[]';; esac
    PLAT_STORE=$(node --input-type=module -e "const { ACHIEVEMENTS } = await import('$PWD/src/achievements.js'); const skip = $skip; console.log(JSON.stringify({ achievements: Object.fromEntries(ACHIEVEMENTS.filter((a) => !skip.includes(a.id)).map((a) => [a.id, 1762800000000])) }))")
    run "platinum-earn-$last-$size" "$BASE/?dpr=$final_dpr&last=$last" --lib checks/lib.js --js checks/platinum-earn.js --then checks/platinum-earn-reload.js --size $size --out "$SHOTS" --jpeg --timeout 180 --storage "$PLAT_STORE"
  done
  # text lane (playtest-2): the cat's speech, the first-pickup tip, the felt buttons, the sigil-only row, the
  # achievement reveal and its metals, a stored Platinum kept, the hints. Once with motion, once calm.
  TEXT_STORE='{"found":{"butter":1,"circle":1,"bolt":1,"loaf":1,"box":1,"noscope":1,"harp":1,"bird":1,"blastoff":1},"bonks":3,"achievements":{"platinum":1762870000000,"circle":1762820000000}}'
  run "text-$size" "$BASE/" --lib checks/lib.js --js checks/text.js --then checks/text-reload.js --size $size --out "$SHOTS" --jpeg --timeout 240 --storage "$TEXT_STORE"
  run "text-calm-$size" "$BASE/" --lib checks/lib.js --js checks/text.js --size $size --out "$SHOTS" --jpeg --timeout 240 --reduced --storage "$TEXT_STORE"
  # furniture lane (playtest 2): level shelf, drop over the whole furniture, hooks, Collector/Curator, recipe sheet,
  # the paper from under the recipe, the round badge, googly eyes that stay on
  run "furniture-p2-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/furniture-p2.js --then checks/furniture-p2-reload.js --size $size --out "$SHOTS" --jpeg --timeout 300
  # physics and handling lane (e1111-58): solid contacts, the cat's space and depth, no spin, wheel, off-screen, buttons, snapping
  run "physics2-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/physics2.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # physics lane, playtest-2: settling, depth between pictures, the box lid, the fork in the pail; nothing lost behind
  # the cat or furniture, the cloud's crossing; the inventory stress test and its reload mid-move
  run "physics-p2-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/physics-p2.js --size $size --out "$SHOTS" --jpeg --timeout 300
  run "world-occluders-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-occluders.js --size $size --out "$SHOTS" --jpeg --timeout 300
  # Fix round A (playtest-2): a body taken out of the room leaves no collider behind; the box's first place is in view
  run "world-disable-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/world-disable.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "box-home-$size" "$BASE/" --lib checks/lib.js --js checks/box-home.js --size $size --out "$SHOTS" --jpeg --timeout 90
  # box-open stray pictures (2026-11-13, Aaron's img10): the swinging lid stays in the box's picture; no atlas tile is painted by another
  run "box-open-tiles-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/box-open-tiles.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # physics lane, playtest-3: the eyes follow him and show on the badge, chest take-out, too far into him, the flour's place
  run "physics-p3-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/physics-p3.js --then checks/physics-p3-reload.js --size $size --out "$SHOTS" --jpeg --timeout 400
  run "inventory-stress-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/inventory-stress.js --then checks/inventory-stress-reload.js --size $size --out "$SHOTS" --jpeg --timeout 500
  # speed lane (playtest-2): moving pictures to a pixel budget in big windows, sharp again once still; pops count as motion
  run "speed-motion-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/speed-motion.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # visual lane (playtest-3): no line along any item's picture border (at rest, after play, drawn at the moving scale:
  # ?motion=0.6 makes the check size's moving draws lighter); every picture right again after Butterman's rise
  run "visual-hairlines-$size" "$BASE/?dpr=$final_dpr&motion=0.6" --lib checks/lib.js --js checks/visual-hairlines.js --size $size --out "$SHOTS" --jpeg --timeout 300
  run "visual-rise-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/visual-rise.js --size $size --out "$SHOTS" --jpeg --timeout 240
  # a fractional pixel ratio (Windows at 150 %, the adaptive ratio's steps): the card edges fall between pixels
  [ "$size" = desktop ] && run "visual-hairlines-dpr1.5" "$BASE/?dpr=1.5&motion=0.6" --lib checks/lib.js --js checks/visual-hairlines.js --size desktop --dpr 1.5 --out "$SHOTS" --jpeg --timeout 300
  # world polish lane (e1111-58): Aaron's playtest notes, one check per note
  for p in galaxy cat butterman hat-butter top top-calm cloud cloud-calm puddle paper; do
    js=${p%-calm}; flag=; [ "$js" != "$p" ] && flag=--reduced
    run "polish-$p-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/polish-$js.js --size $size --out "$SHOTS" --jpeg --timeout 240 $flag
  done
  # sky lane (playtest 2): the star as a spin, the galaxy without its black hole holding until a click, the bread's spun blast-off, charged water
  run "sky-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/sky.js --size $size --out "$SHOTS" --jpeg --timeout 300
  # gags lane (playtest 3): the loaf's riser and pop, crumbs every second loaf, the blast-off covered like the galaxy
  run "bread-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/bread.js --size $size --out "$SHOTS" --jpeg --timeout 300
  run "bread-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/bread.js --size $size --out "$SHOTS" --jpeg --timeout 300 --reduced

  # fx lane (playtest 3): the new bolt (calm too), the galaxy's glow in every pose, the #debug panel's cake and bonks
  run "bolt-visual-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/bolt-visual.js --size $size --out "$SHOTS" --jpeg --timeout 120
  run "bolt-visual-calm-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/bolt-visual.js --size $size --out "$SHOTS" --jpeg --timeout 120 --reduced
  run "galaxy-glow-$size" "$BASE/?dpr=$final_dpr" --lib checks/lib.js --js checks/galaxy-glow.js --size $size --out "$SHOTS" --jpeg --timeout 240
  run "debug-panel-$size" "$BASE/?dpr=$final_dpr#debug" --lib checks/lib.js --js checks/debug-panel.js --size $size --out "$SHOTS" --jpeg --timeout 180
done
# (Bird lane, playtest-2: flappy and the stand at 844x390 touch are the bird-phone runs above; "phone" is landscape now.)

# a phone held upright only ever shows "flip sideways" (shell lane, playtest-2): at boot, and mid-game, frozen under it
run "shell-turn-phone-portrait" "$BASE/?doors=hold&dpr=2" --js checks/shell-turn.js --size phone-portrait --out "$SHOTS" --jpeg --timeout 150
# full screen on a phone (fullscreen lane, playtest-3): the step after "flip sideways", the button, no element full
# screen (iPhone Safari), opened from the home screen, loaded upright, and a desktop that gets neither
run "fullscreen-phone" "$BASE/?doors=hold&fs=1&case=api" --js checks/fullscreen.js --then checks/fullscreen-reload.js --size phone --out "$SHOTS" --jpeg --timeout 180
run "fullscreen-later-calm-phone" "$BASE/?doors=hold&fs=1&case=later" --js checks/fullscreen.js --size phone --out "$SHOTS" --jpeg --timeout 120 --reduced
run "fullscreen-noapi-phone" "$BASE/?doors=hold&fs=1&case=noapi" --js checks/fullscreen.js --size phone --out "$SHOTS" --jpeg --timeout 120
run "fullscreen-standalone-phone" "$BASE/?doors=hold&fs=1&case=standalone" --js checks/fullscreen.js --size phone --out "$SHOTS" --jpeg --timeout 120
run "fullscreen-phone-portrait" "$BASE/?doors=hold&fs=1&case=portrait" --js checks/fullscreen.js --size phone-portrait --out "$SHOTS" --jpeg --timeout 120
run "fullscreen-desktop" "$BASE/?doors=hold&fs=1&case=desktop" --js checks/fullscreen.js --size desktop --out "$SHOTS" --jpeg --timeout 120

echo "== sigils"
if node checks/sigils.test.mjs > "$LOG/sigils.txt" 2>&1; then tail -n 1 "$LOG/sigils.txt"; else tail -n 15 "$LOG/sigils.txt"; fails+=("sigils"); fi

echo "== bird assets and physics"
if ! python3 checks/bird-art.py; then fails+=("bird assets"); fi
if ! node checks/flappy.test.mjs; then fails+=("bird physics"); fi

echo "== files"
if ! python3 checks/sounds-files.py; then fails+=("sound files"); fi
if ! python3 checks/sound-originals.py; then fails+=("Aaron's original sounds"); fi
if ! python3 checks/sound-playtest-files.py; then fails+=("sound playtest files"); fi
# no placeholder sound anywhere in what the page loads
if grep -rn "audio/placeholder" index.html spellbook.html src > "$LOG/placeholder.txt"; then cat "$LOG/placeholder.txt"; fails+=("placeholder sounds referenced"); else echo "CHECK no file under assets/audio/placeholder/ is referenced: PASS"; fi
# every asset path the code names is a file in the repo (the sounds are named in a list: config.js)
missing=0
for f in $(grep -rhoE "assets/[A-Za-z0-9_./-]+\.[a-z0-9]+" index.html spellbook.html src | sort -u); do [ -f "$f" ] || { echo "missing: $f"; missing=1; }; done
for n in $(node -e "import('./src/config.js').then(m=>console.log(Object.values(m.SITE.sounds.files).join(' ')))"); do [ -f "$n" ] || { echo "missing: $n"; missing=1; }; done
if [ $missing -eq 0 ]; then echo "CHECK every asset the code names is in the repo: PASS"; else fails+=("missing assets"); fi

echo
if [ ${#fails[@]} -eq 0 ]; then echo "ALL PASS"; else echo "FAILED: ${fails[*]}"; echo "(full output: $LOG)"; exit 1; fi
