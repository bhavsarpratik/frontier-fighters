"""Import externally generated character art (e.g. from Codex CLI image generation).

Usage: python3 tools/import_art.py <dir> id [id ...]
Expects <dir>/<id>.png. Trims to the figure, keys out a white background if there is no
transparency, scales to a standard height and writes assets/art/<id>.webp, _face.webp, _raw.png.
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from genart import OUT, cut_background, face_crop, write_manifest  # noqa: E402

HEIGHT = 900


def main() -> None:
    src = Path(sys.argv[1])
    for fid in sys.argv[2:]:
        im = Image.open(src / f"{fid}.png").convert("RGBA")
        lo, _ = im.getchannel("A").getextrema()
        if lo == 255:
            im = cut_background(im.convert("RGB"))
        bbox = im.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
        im = im.crop(bbox)
        k = HEIGHT / im.height
        im = im.resize((round(im.width * k), HEIGHT), Image.LANCZOS)
        im.save(OUT / f"{fid}_raw.png")
        im.save(OUT / f"{fid}.webp", "WEBP", quality=92)
        face_crop(im).save(OUT / f"{fid}_face.webp", "WEBP", quality=92)
        print(fid, im.size)
    write_manifest()


if __name__ == "__main__":
    main()
