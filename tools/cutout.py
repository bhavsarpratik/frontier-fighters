"""Cut fighter key art into rig parts for cutout animation.

Reads joint annotations from tools/rigs.json (coordinates in assets/art/<id>.webp pixels) and
writes assets/art/<id>_part_<name>.webp plus assets/art/<id>_rig.json with pivots.
Usage: python3 tools/cutout.py [id ...]
"""
import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets" / "art"
RIGS = json.loads((ROOT / "tools" / "rigs.json").read_text())


def capsule(draw: ImageDraw.ImageDraw, a, b, r, fill=255):
    ax, ay = a
    bx, by = b
    n = max(1, int(math.hypot(bx - ax, by - ay) / 2))
    for i in range(n + 1):
        t = i / n
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def mask_of(size, shapes):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    for s in shapes:
        if s["k"] == "cap":
            capsule(d, s["a"], s["b"], s["r"])
        elif s["k"] == "circle":
            x, y = s["c"]
            r = s["r"]
            d.ellipse([x - r, y - r, x + r, y + r], fill=255)
        elif s["k"] == "poly":
            d.polygon([tuple(p) for p in s["pts"]], fill=255)
    return m.filter(ImageFilter.GaussianBlur(1.2))


def extract(img, mask):
    a = ImageChops.multiply(img.getchannel("A"), mask)
    part = img.copy()
    part.putalpha(a)
    bbox = a.point(lambda v: 255 if v > 10 else 0).getbbox()
    if not bbox:
        return part.crop((0, 0, 1, 1)), (0, 0)
    pad = 2
    bbox = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(img.width, bbox[2] + pad), min(img.height, bbox[3] + pad))
    return part.crop(bbox), (bbox[0], bbox[1])


def build(fid: str) -> None:
    rig = RIGS[fid]
    img = Image.open(ART / f"{fid}.webp").convert("RGBA")
    size = img.size
    out = {"w": size[0], "h": size[1], "joints": rig["joints"], "parts": {}}
    arm = rig["arm"]
    leg = rig["leg"]
    j = rig["joints"]
    shapes = {
        "upper": [{"k": "cap", "a": j["shoulder"], "b": j["elbow"], "r": arm["rUpper"]}],
        "fore": [{"k": "cap", "a": j["elbow"], "b": j["fist"], "r": arm["rFore"]}, {"k": "circle", "c": j["fist"], "r": arm["rFist"]}],
        "thigh": [{"k": "cap", "a": j["hip"], "b": j["knee"], "r": leg["rThigh"]}],
        "shin": [{"k": "cap", "a": j["knee"], "b": j["ankle"], "r": leg["rShin"]}, {"k": "cap", "a": j["heel"], "b": j["toe"], "r": leg["rFoot"]}],
        "head": [{"k": "poly", "pts": rig["head"]}],
    }
    if rig.get("twoSided"):
        shapes["upper2"] = [{"k": "cap", "a": j["shoulder2"], "b": j["elbow2"], "r": arm["rUpper"]}]
        shapes["fore2"] = [{"k": "cap", "a": j["elbow2"], "b": j["fist2"], "r": arm["rFore"]}, {"k": "circle", "c": j["fist2"], "r": arm["rFist"]}]
        shapes["thigh2"] = [{"k": "cap", "a": j["hip2"], "b": j["knee2"], "r": leg["rThigh"]}]
        shapes["shin2"] = [{"k": "cap", "a": j["knee2"], "b": j["ankle2"], "r": leg["rShin"]}, {"k": "cap", "a": j["heel2"], "b": j["toe2"], "r": leg["rFoot"]}]
    masks = {k: mask_of(size, v) for k, v in shapes.items()}
    torso_m = mask_of(size, [{"k": "poly", "pts": rig["torso"]}])
    # remove the front arm from the torso and patch the hole with the shirt colour
    arm_m = ImageChops.lighter(masks["upper"], masks["fore"])
    if rig.get("twoSided"):
        arm_m = ImageChops.lighter(arm_m, ImageChops.lighter(masks["upper2"], masks["fore2"]))
    if rig.get("erase"):
        arm_m = ImageChops.lighter(arm_m, mask_of(size, rig["erase"]))
    hole = ImageChops.multiply(torso_m, arm_m.point(lambda v: 255 if v > 20 else 0).filter(ImageFilter.MaxFilter(rig.get("holeGrow", 11))))
    torso_img = img.copy()
    fill = Image.new("RGBA", size, tuple(rig["fill"]) + (255,))
    shade = Image.new("RGBA", size, tuple(max(0, c - 18) for c in rig["fill"]) + (255,))
    patch = Image.composite(shade, fill, Image.linear_gradient("L").resize(size).point(lambda v: 255 if v > 140 else 0))
    torso_img = Image.composite(patch, torso_img, hole.filter(ImageFilter.GaussianBlur(2)))
    torso_part, torso_off = extract(torso_img, torso_m)
    parts = {"torso": (torso_part, torso_off)}
    # the forearm must not drag a patch of shirt along with it
    fr, fg, fb = rig["fill"]
    tol = rig.get("fillTol", 48)
    not_shirt = img.convert("RGB").point(lambda v: v).copy()
    px = not_shirt.load()
    keep = Image.new("L", size, 255)
    kp = keep.load()
    for y in range(size[1]):
        for x in range(size[0]):
            r, g, b = px[x, y]
            if abs(r - fr) + abs(g - fg) + abs(b - fb) < tol:
                kp[x, y] = 0
    masks["fore"] = ImageChops.multiply(masks["fore"], keep.filter(ImageFilter.MinFilter(3)))
    if "fore2" in masks:
        masks["fore2"] = ImageChops.multiply(masks["fore2"], keep.filter(ImageFilter.MinFilter(3)))
    for k in [n for n in ("upper", "fore", "thigh", "shin", "head", "upper2", "fore2", "thigh2", "shin2") if n in masks]:
        parts[k] = extract(img, masks[k])
    for k, (p, off) in parts.items():
        p.save(ART / f"{fid}_part_{k}.webp", "WEBP", quality=92)
        out["parts"][k] = {"x": off[0], "y": off[1], "w": p.width, "h": p.height}
    (ART / f"{fid}_rig.json").write_text(json.dumps(out))
    print(fid, {k: (v["w"], v["h"]) for k, v in out["parts"].items()})


def manifest() -> None:
    files = sorted(p.name for p in ART.glob("*.webp")) + sorted(p.name for p in ART.glob("*_rig.json")) + sorted(p.name for p in ART.glob("*_frames.json"))
    (ART / "manifest.json").write_text(json.dumps(files))


if __name__ == "__main__":
    for fid in sys.argv[1:] or list(RIGS):
        build(fid)
    manifest()
