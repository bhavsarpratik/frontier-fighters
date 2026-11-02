#!/bin/sh
# Retry art generation for fighters that are still missing, until done or out of attempts.
cd "$(dirname "$0")/.." || exit 1
for i in $(seq 1 30); do
  missing=""
  for f in karpathink codeaux potetron wangle altmind hwang zuckerbot tusk; do
    [ -f "assets/art/$f.webp" ] || missing="$missing $f"
  done
  [ -z "$missing" ] && { echo "all art generated"; exit 0; }
  echo "attempt $i, missing:$missing"
  python3 tools/genart.py $missing 2>&1 | grep -E "^[a-z]+: \(" || true
  sleep 300
done
echo "gave up; still missing:$missing"
