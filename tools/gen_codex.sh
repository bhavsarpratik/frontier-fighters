#!/bin/sh
# Generate a fighter's key art with Codex CLI image generation (uses your ChatGPT login).
# Usage: tools/gen_codex.sh <id> "<character description>" [identity_ref.png]
# Then: python3 tools/import_art.py /tmp/ffcodex <id>; annotate tools/rigs.json; python3 tools/cutout.py <id>
set -e
id="$1"; desc="$2"; ref="$3"
mkdir -p /tmp/ffcodex
cp "$(dirname "$0")/../assets/art/karpathink_raw.png" /tmp/ffcodex/style_ref.png
imgs="-i /tmp/ffcodex/style_ref.png"
[ -n "$ref" ] && imgs="-i $ref $imgs"
cat > "/tmp/ffcodex/prompt_$id.txt" <<P
Use your image generation tool to create ONE new image, then save it as /tmp/ffcodex/$id.png (PNG with transparent background).
Full body character select art for a 90s arcade 2D fighting game, in the same art style, line weight and cel shading as the attached style reference.
Character: $desc.
Pose (important): wide confident fighting stance, three-quarter view facing right, whole body visible from head to shoes, both arms held out away from the torso with fists clenched and nothing crossing the chest, legs wide apart and fully visible. No floating effects, no props, nothing overlapping the body. Transparent background, single character, centered, no text. Fictional parody character. Do not do anything else.
P
codex exec --skip-git-repo-check -s workspace-write -m gpt-5.6-terra -c model_reasoning_effort=low $imgs < "/tmp/ffcodex/prompt_$id.txt"
