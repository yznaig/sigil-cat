#!/usr/bin/env bash
# Unit 7 / e1111-21: behavior, contacts, restore and affected integrations only.
# Start the preview separately; the orchestrator owns full-suite/cost validation.
set -u
cd "$(dirname "$0")/.."
export PW_FROM="${PW_FROM:-$HOME/command-hq/scripts/shot}"
export RACK_RESULTS="${RACK_RESULTS:-checks/diag/world-unit7-frames-final.json}"
BASE=${1:-http://localhost:18749/}
OUT=${2:-docs/shots}
mkdir -p checks/out
failures=()
run(){
  local name=$1; shift
  if "$@" > "checks/out/unit7-functional-$name.log" 2>&1; then
    echo "$name PASS"
  else
    failures+=("$name"); echo "$name FAIL"
  fi
}
for size in desktop phone; do
  dpr=1; [ "$size" = phone ] && dpr=2
  run "rack-$size" node checks/run.mjs "$BASE?dpr=$dpr" --lib checks/lib.js --js checks/world-rack.js --then checks/world-rack-reload.js --size "$size" --out "$OUT" --jpeg --timeout 240 --quiet
  run "off-$size" node checks/run.mjs "$BASE?dpr=$dpr" --lib checks/lib.js --js checks/world-rack-off.js --then checks/world-rack-reload.js --size "$size" --out "$OUT" --jpeg --timeout 90 --quiet
  run "off-calm-$size" node checks/run.mjs "$BASE?dpr=$dpr" --lib checks/lib.js --js checks/world-rack-off.js --then checks/world-rack-reload.js --size "$size" --out "$OUT" --jpeg --timeout 90 --reduced --quiet
  run "legacy-$size" node checks/run.mjs "$BASE" --lib checks/lib.js --js checks/world-rack-legacy.js --then checks/world-rack-legacy.js --size "$size" --out "$OUT" --jpeg --timeout 90 --storage '{"hat":"party","butterman":{"buttered":true}}' --quiet
done
run frames node checks/rack-frames.mjs "$BASE"
for size in desktop phone; do
  run "layout-$size" node checks/run.mjs "$BASE?functional=1" --lib checks/lib.js --js checks/world-layout.js --then checks/world-layout-reload.js --size "$size" --out "$OUT" --jpeg --timeout 180 --quiet
  run "play-$size" node checks/run.mjs "$BASE" --lib checks/lib.js --js checks/play.js --then checks/after-reload.js --size "$size" --out "$OUT" --jpeg --timeout 420 --quiet
  for motion in normal calm; do
    extra=(); [ "$motion" = calm ] && extra=(--reduced)
    run "water-$size-$motion" node checks/run.mjs "$BASE" --lib checks/lib.js --js checks/world-water.js --then checks/world-water-reload.js --size "$size" --out "$OUT" --jpeg --timeout 120 --quiet "${extra[@]}"
    run "party-$size-$motion" node checks/run.mjs "$BASE" --lib checks/lib.js --js checks/party.js --size "$size" --out "$OUT" --jpeg --timeout 120 --quiet "${extra[@]}"
  done
done
for size in desktop phone; do
  dpr=1; [ "$size" = phone ] && dpr=2
  run "shots-$size" node checks/run.mjs "$BASE?dpr=$dpr" --lib checks/lib.js --js checks/world-rack-shots.js --size "$size" --out "$OUT" --jpeg --timeout 90 --quiet
done
if [ ${#failures[@]} -eq 0 ]; then echo 'UNIT 7 FUNCTIONAL ALL PASS'; else echo "UNIT 7 FUNCTIONAL FAILED: ${failures[*]}"; exit 1; fi
