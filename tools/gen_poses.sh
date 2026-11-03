#!/bin/sh
# Generate pose drawings of an existing fighter with Codex CLI image generation, using the
# fighter's key art as the identity reference so every pose is the same character.
# Usage: tools/gen_poses.sh <id> pose [pose ...]   (writes /tmp/ffposes/<id>_<pose>.png)
id="$1"; shift
root="$(cd "$(dirname "$0")/.." && pwd)"
out=/tmp/ffposes
mkdir -p "$out"
cp "$root/assets/art/${id}_raw.png" "$out/ref_$id.png"
desc() {
  case "$1" in
    idle) echo "relaxed but ready fighting guard stance, fists up near the chin, knees slightly bent, weight on the back foot" ;;
    walk) echo "mid-stride walking forward in a fighting guard, front foot stepping forward, fists up" ;;
    crouch) echo "crouching low in a fighting guard, knees deeply bent, fists up, compact and ready" ;;
    jump) echo "jumping high in the air, knees tucked up to the chest, fists ready, dynamic midair pose" ;;
    punch) echo "throwing a powerful straight punch to the right, front arm fully extended at shoulder height, rear fist at the chin, body twisted into the punch, intense shout" ;;
    kick) echo "high roundhouse kick to the right, kicking leg fully extended at head height, standing on one leg, arms out for balance, fierce expression" ;;
    sweep) echo "crouching leg sweep, very low to the ground, one leg extended far forward to the right along the floor, hands touching the ground" ;;
    uppercut) echo "rising uppercut, leaping upward with one fist thrust straight up above the head, other arm down, shouting" ;;
    special) echo "unleashing a special move, both palms thrust forward to the right firing energy, wide lunging stance, glowing hands" ;;
    block) echo "blocking defensively, both forearms raised and crossed in front of the face, braced, leaning back slightly" ;;
    hit) echo "getting hit hard, recoiling backward to the left, head snapped back, arms flailing, pained grimace" ;;
    knockdown) echo "knocked down lying flat on his back on the floor, body horizontal, dazed with eyes shut" ;;
    win) echo "victory pose, one fist raised high in triumph, big confident grin, chest out" ;;
  esac
}
for pose in "$@"; do
  cat > "$out/prompt_${id}_$pose.txt" <<P
Use your image generation tool to create ONE new image, then save it as $out/${id}_$pose.png (PNG with transparent background).
Draw EXACTLY the same character as the attached reference image: same face, hair, body type, outfit, colors, accessories and the same art style, line weight and cel shading.
New pose: $(desc "$pose"). Side view facing right (three-quarter), whole body fully visible, same scale as the reference.
Transparent background, single character, no shadow, no text, no extra effects except what the pose describes. Fictional parody character. Do not do anything else.
P
  codex exec --skip-git-repo-check -s workspace-write -m gpt-5.6-terra -c model_reasoning_effort=low -i "$out/ref_$id.png" \
    < "$out/prompt_${id}_$pose.txt" > "$out/log_${id}_$pose.txt" 2>&1 &
done
wait
ls -la "$out"/${id}_*.png 2>/dev/null
