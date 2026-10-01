#!/usr/bin/env bash
# Render preview stills of one composition at the given frames.
# usage: scripts/stills.sh <CompositionId> <prefix> <frame> [frame...]
set -euo pipefail
cd "$(dirname "$0")/.."
comp="$1"; prefix="$2"; shift 2
mkdir -p out/stills
export REMOTION_BROWSER="${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
frames=$(IFS=,; echo "$*")
# one bundle, many frames: render a sequence of single-frame stills
for f in "$@"; do
  npx remotion still src/index.ts "$comp" "out/stills/${prefix}-$(printf '%03d' "$f").png" --frame="$f" --log=error --scale=0.5 2>&1 | grep -v -i memory || true
done
