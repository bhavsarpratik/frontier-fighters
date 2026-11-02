"""Generate fighter key art with FLUX.1-schnell (public Hugging Face Space) and cut out the background.

Usage: python3 tools/genart.py [fighter_id ...] [--seed N]
Writes assets/art/<id>.webp (RGBA). Prompts describe fictional parody characters only.
"""
import json
import sys
import time
import urllib.request
from collections import deque
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageFilter

SPACE = "https://black-forest-labs-flux-1-schnell.hf.space/gradio_api"
OUT = Path(__file__).resolve().parent.parent / "assets" / "art"

STYLE = (
    "full body character select art for a 90s arcade 2D fighting game, dynamic confident fighting stance, "
    "three-quarter view facing right, whole body visible from head to shoes, bold clean cartoon illustration, "
    "thick black ink outlines, cel shading, vibrant saturated colors, plain flat solid pure white background, "
    "single character, centered, no text, no watermark, no border"
)

FIGHTERS = {
    "karpathink": "a lean friendly man in his late 30s, short tousled brown hair, warm smile, dark navy crew-neck t-shirt, "
    "blue jeans, white sneakers, holding a stick of white chalk, chalk dust swirling with tiny math symbols",
    "codeaux": "a man with messy dark hair and a full dark beard, black hoodie with glowing green circuit trim, "
    "a sleek glowing green visor over his eyes, dark joggers, white sneakers, green code glyphs floating near his fists",
    "potetron": "a muscular fighter whose head is a cartoon brown potato with a small green sprout on top and black sunglasses, "
    "cheeky grin, black t-shirt, dark blue jeans, red sneakers",
    "wangle": "a young slim man with neat side-parted black hair, navy blue suit, white shirt, purple tie, black dress shoes, "
    "confident smirk, glowing green rectangular bounding boxes floating around him",
    "altmind": "a slim young man with short wavy brown hair and big earnest eyes, slate blue crew-neck sweater, khaki chinos, "
    "white sneakers, calm smile, a glowing purple energy orb hovering above one palm",
    "hwang": "a stocky older man with swept-back silver-gray hair and a wide grin, black leather jacket over a black t-shirt, "
    "black jeans, black shoes, holding a glowing green computer graphics card",
    "zuckerbot": "a muscular man with short curly brown hair, very pale skin, wide intense eyes, plain gray t-shirt, "
    "gold chain necklace, dark gray jeans, white sneakers, low grappling stance",
    "tusk": "a tall broad-shouldered man with short dark hair and a strong square jaw, smug grin, black t-shirt with a small white rocket emblem, "
    "dark gray jeans, black boots, small rocket flames at his feet",
}


def call_flux(prompt: str, seed: int, w: int = 768, h: int = 1024) -> Image.Image:
    body = json.dumps({"data": [prompt, seed, False, w, h, 4]}).encode()
    req = urllib.request.Request(f"{SPACE}/call/infer", data=body, headers={"Content-Type": "application/json"})
    event = json.load(urllib.request.urlopen(req, timeout=60))["event_id"]
    with urllib.request.urlopen(f"{SPACE}/call/infer/{event}", timeout=300) as r:
        text = r.read().decode()
    url = None
    for line in text.splitlines():
        if line.startswith("data:") and "url" in line:
            url = json.loads(line[5:])[0]["url"]
    if not url:
        raise RuntimeError(f"generation failed: {text[-300:]}")
    data = urllib.request.urlopen(url, timeout=60).read()
    return Image.open(BytesIO(data)).convert("RGB")


def cut_background(im: Image.Image, tol: int = 34) -> Image.Image:
    """Flood-fill near-white from the borders to transparent, then feather the edge."""
    w, h = im.size
    px = im.load()
    bg = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))

    def white(c):
        return c[0] > 255 - tol and c[1] > 255 - tol and c[2] > 255 - tol

    while q:
        x, y = q.popleft()
        i = y * w + x
        if bg[i] or not white(px[x, y]):
            continue
        bg[i] = 1
        if x > 0: q.append((x - 1, y))
        if x < w - 1: q.append((x + 1, y))
        if y > 0: q.append((x, y - 1))
        if y < h - 1: q.append((x, y + 1))
    alpha = Image.frombytes("L", (w, h), bytes(0 if b else 255 for b in bg))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 20 else 0).getbbox()
    return out.crop(bbox) if bbox else out


def face_crop(cut: Image.Image) -> Image.Image:
    """Square crop around the head: alpha centroid of the top band of the figure."""
    w, h = cut.size
    a = cut.getchannel("A").load()
    band = int(h * 0.2)
    sx = n = 0
    top = None
    for y in range(band):
        for x in range(0, w, 2):
            if a[x, y] > 128:
                sx += x
                n += 1
                if top is None:
                    top = y
    cx = sx / n if n else w / 2
    size = int(h * 0.3)
    y0 = max(0, (top or 0) - int(size * 0.06))
    x0 = int(max(0, min(w - size, cx - size / 2)))
    return cut.crop((x0, y0, x0 + size, y0 + size))


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    seed = 11
    if "--seed" in sys.argv:
        seed = int(sys.argv[sys.argv.index("--seed") + 1])
        args = [a for a in args if a != str(seed)]
    ids = args or list(FIGHTERS)
    if "--faces" in sys.argv:
        for fid in ids:
            face_crop(Image.open(OUT / f"{fid}.webp")).save(OUT / f"{fid}_face.webp", "WEBP", quality=92)
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for fid in ids:
        prompt = f"{FIGHTERS[fid]}, {STYLE}"
        for attempt in range(3):
            try:
                t0 = time.time()
                im = call_flux(prompt, seed)
                im.save(OUT / f"{fid}_raw.png")
                cut = cut_background(im)
                cut.save(OUT / f"{fid}.webp", "WEBP", quality=90)
                face_crop(cut).save(OUT / f"{fid}_face.webp", "WEBP", quality=92)
                print(f"{fid}: {cut.size} in {time.time() - t0:.1f}s")
                break
            except Exception as e:  # network hiccups / queue limits
                print(f"{fid}: attempt {attempt + 1} failed: {e}")
                time.sleep(5)


if __name__ == "__main__":
    main()
