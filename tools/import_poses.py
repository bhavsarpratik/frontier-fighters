"""Import generated pose drawings: trim, scale consistently, find the foot anchor.

Usage: python3 tools/import_poses.py [id ...]
Reads /tmp/ffposes/<id>_<pose>.png, writes assets/art/<id>_f_<pose>.webp and <id>_frames.json:
{ pose: { w, h, ax, ay } } where (ax, ay) is the ground anchor in image pixels.
Pose images are scaled so the character matches the standing key art (STAND px tall),
using a nominal height ratio per pose; per-fighter overrides live in tools/pose_tune.json.
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from genart import OUT, cut_background, write_manifest  # noqa: E402

SRC = Path("/tmp/ffposes")
TUNE_FILE = Path(__file__).resolve().parent / "pose_tune.json"
STAND = 640
# visible height of each pose relative to a standing guard (lying poses use width)
RATIO = {
    "idle": 1.0, "walk": 1.0, "crouch": 0.68, "jump": 0.8, "punch": 0.97, "kick": 1.0, "sweep": 0.5,
    "uppercut": 1.22, "special": 0.92, "block": 0.97, "hit": 0.98, "knockdown": 0.0, "win": 1.18,
    "super1": 0.86, "super2": 0.92,
}
LYING_WIDTH = 1.0
AIRBORNE = {"jump", "uppercut"}


def anchor(im: Image.Image, pose: str) -> tuple[float, float]:
    a = im.getchannel("A").load()
    w, h = im.size
    if pose in AIRBORNE or pose == "knockdown":
        sx = n = 0
        for y in range(0, h, 3):
            for x in range(0, w, 3):
                if a[x, y] > 128:
                    sx += x
                    n += 1
        return (sx / n if n else w / 2, h)
    # feet: alpha-weighted centre of the bottom band
    band = max(4, int(h * 0.1))
    sx = n = 0
    for y in range(h - band, h):
        for x in range(w):
            if a[x, y] > 128:
                sx += x
                n += 1
    return (sx / n if n else w / 2, h)


def main() -> None:
    tune = json.loads(TUNE_FILE.read_text()) if TUNE_FILE.exists() else {}
    ids = sys.argv[1:] or sorted({p.name.split("_")[0] for p in SRC.glob("*_*.png") if not p.name.startswith(("ref_", "prompt_", "log_"))})
    for fid in ids:
        meta = {}
        for src in sorted(SRC.glob(f"{fid}_*.png")):
            pose = src.stem[len(fid) + 1:]
            if pose not in RATIO:
                continue
            im = Image.open(src).convert("RGBA")
            if im.getchannel("A").getextrema()[0] == 255:
                im = cut_background(im.convert("RGB"))
            bbox = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
            if not bbox:
                continue
            im = im.crop(bbox)
            t = tune.get(fid, {}).get(pose, {})
            if t.get("mirror"):
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            if pose == "knockdown":
                k = STAND * LYING_WIDTH * t.get("scale", 1) / im.width
            else:
                k = STAND * RATIO[pose] * t.get("scale", 1) / im.height
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            ax, ay = anchor(im, pose)
            ax += t.get("dx", 0) * im.width
            im.save(OUT / f"{fid}_f_{pose}.webp", "WEBP", quality=90)
            meta[pose] = {"w": im.width, "h": im.height, "ax": round(ax, 1), "ay": round(ay, 1), "stand": STAND}
        if meta:
            (OUT / f"{fid}_frames.json").write_text(json.dumps(meta))
            print(fid, sorted(meta))
    files = sorted(p.name for p in OUT.glob("*.webp")) + sorted(p.name for p in OUT.glob("*_rig.json")) + sorted(p.name for p in OUT.glob("*_frames.json"))
    (OUT / "manifest.json").write_text(json.dumps(files))


if __name__ == "__main__":
    main()
