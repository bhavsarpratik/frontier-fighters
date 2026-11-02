#!/bin/sh
# Keep generating art on the free quota: key art first, then pose images. Safe to re-run.
cd "$(dirname "$0")/.." || exit 1
ALL="karpathink codeaux potetron wangle altmind hwang zuckerbot tusk"
for i in $(seq 1 60); do
  missing=""
  for f in $ALL; do [ -f "assets/art/$f.webp" ] || missing="$missing $f"; done
  if [ -n "$missing" ]; then
    echo "attempt $i, key art missing:$missing"
    python3 tools/genart.py $missing 2>&1 | grep -E "^[a-z]+: \(" || true
  else
    poses=$(ls assets/art/*_pose_*.webp 2>/dev/null | wc -l | tr -d ' ')
    [ "$poses" -ge 48 ] && { echo "all art generated"; exit 0; }
    echo "attempt $i, poses so far: $poses"
    python3 tools/genart.py $ALL --poses 2>&1 | grep -E "ok in" || true
  fi
  sleep 300
done
echo "stopped after 60 attempts"
