#!/usr/bin/env bash
# Publish a local commit to the live site as one new snapshot commit on origin/main.
# The local history stays local: only the chosen commit's files go public, on top of the last published snapshot.
# Usage: tools/publish.sh [ref]   (default: main). Plain push, never forced; the repo's pre-push scan still runs.
set -euo pipefail

ref="${1:-main}"
git fetch -q origin
tree=$(git rev-parse "$ref^{tree}")
parent=$(git rev-parse origin/main)
short=$(git rev-parse --short "$ref")

# Someone else pushed straight to the live site: merge their change into $ref first, or it would be overwritten.
if ! git merge-base --is-ancestor "$parent" "$ref" && ! git log -1 --format=%s "$parent" | command grep -q '^publish '; then
  echo "✗ origin/main has a change that isn't in $ref. Run: git merge origin/main   then publish again."; exit 1
fi

if [ "$tree" = "$(git rev-parse origin/main^{tree})" ]; then
  echo "Live site already matches $ref ($short); nothing to publish."; exit 0
fi

# Refuse if any file names this machine's home folder or user.
home_pat=$(printf '%s' "$HOME" | sed 's/[][\.*^$/]/\\&/g')
if git grep -I -n -E "$home_pat|\\b$(whoami)\\b" "$tree" -- . >/dev/null 2>&1; then
  echo "✗ $ref has files naming this machine's home folder or user:"
  git grep -I -n -E "$home_pat|\\b$(whoami)\\b" "$tree" -- . | head -20 | sed 's/^/    /'
  echo "  Replace them (use ~/ or process.env.HOME) and commit before publishing."; exit 1
fi

snap=$(git commit-tree "$tree" -p "$parent" -m "publish $short ($(date +%Y-%m-%d))")
git push origin "$snap:refs/heads/main"
echo "Published $ref ($short) as $(git rev-parse --short "$snap"). Live in about a minute: https://yznaig.github.io/sigil-cat/"
