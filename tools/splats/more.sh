#!/usr/bin/env bash
# more.sh <pose> [count] [filter]: make <count> (default 8) more Idol candidates for <pose> (loaf, sit, ...) and add
# them to prototypes/splats/pick.html; [filter] picks inputs whose name has it (e.g. face). more.sh --previews remakes
# the page's previews. Needs IDOL_PY (the python of an Idol install, e.g. a venv's bin/python) and
# SPLAT_TRANSFORM (npm @playcanvas/splat-transform). About 25 s a candidate on a desktop GPU. See more.py.
set -euo pipefail
: "${IDOL_PY:?set IDOL_PY to the python of your Idol install}"
repo="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
cd "$repo" && "$IDOL_PY" -I tools/splats/more.py "$1" "${2:-8}" "${3:-}" "$repo"
