"""Generate key art and pose sets with Codex CLI image generation, resumably.

Usage: python3 tools/gen_queue.py [--workers 4] [--only id,id] [--stage keys|poses|all]
Key art -> /tmp/ffcodex/<id>.png (then imported to assets/art/<id>*.webp)
Poses   -> /tmp/ffposes/<id>_<pose>.png (imported by tools/import_poses.py)
Fictional parody characters only; descriptions never name real people.
"""
import concurrent.futures as cf
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "assets" / "art"
KEYS = Path("/tmp/ffcodex")
POSES_DIR = Path("/tmp/ffposes")
LOG = Path("/tmp/ffgen.log")

NEW_KEYS = {
    "potetron": "a young woman in her late 20s with shoulder-length dark brown hair and wispy see-through bangs, thin round gold wire-rimmed glasses, "
    "warm open-mouthed grin, a taupe ribbed tank top with a small cartoon potato emblem, high-waisted light jeans, red sneakers, a cute potato keychain on her belt loop",
    "feifei": "a woman in her late 40s with shoulder-length straight black hair with bangs, warm intelligent eyes, sleek white blazer over a teal top, "
    "dark slacks, white sneakers",
    "ngram": "a friendly man in his late 40s with short neat black hair and rimless glasses, light blue button-down shirt with rolled-up sleeves, "
    "khaki trousers, brown loafers, calm smile",
    "hintern": "a tall slim elderly man in his late 70s with short white hair and a kind wise face, gray tweed blazer over a sweater vest and white shirt, "
    "dark trousers, brown shoes",
    "mirage": "a woman in her mid 30s with long dark brown wavy hair and sharp confident eyes, sleek black turtleneck, fitted dark trousers, black ankle boots, "
    "small silver earrings",
    "zen": "a woman in her mid 50s with a short dark bob haircut and glasses, confident smile, red blazer over a black top, black trousers, black flats",
    "packet": "a charismatic South Asian man in his early 50s with short neat black hair graying at the temples and a warm wide smile, "
    "navy blazer over an open-collar light blue shirt, dark trousers, brown loafers",
    "router": "a tall broad-shouldered man in his late 50s with short neatly combed silver-gray hair, clean-shaven, friendly confident Southern grin, "
    "charcoal gray suit jacket over a crisp white open-collar shirt, no tie, dark gray trousers, black dress shoes",
    "pitchai": "a calm friendly South Asian man in his early 50s with short neat black hair graying at the temples, clean-shaven, gentle warm smile, "
    "light gray crewneck sweater over a white collared shirt, dark chinos, white sneakers",
    "jazzy": "a fit man in his mid 50s with a shaved bald head, clean-shaven, broad friendly grin, navy fleece vest over a light blue button-down shirt, "
    "blue jeans, brown leather shoes",
    "amodeus": "a slim thoughtful man in his early 40s with short dark brown curly hair and rectangular glasses, light stubble, earnest focused expression, "
    "rust-orange crewneck sweater, dark gray trousers, gray sneakers",
    "safeskever": "a lean intense man in his late 30s, bald on top with very short dark hair on the sides, clean-shaven, piercing thoughtful eyes, "
    "plain black t-shirt, dark jeans, black sneakers",
    "almighty": "a sharp energetic man in his mid 30s with short dark wavy hair and a neat short dark beard, confident half-smile, "
    "charcoal zip-up hoodie over a white t-shirt, slim black jeans, white minimalist sneakers",
    "hassabyss": "a slim man in his late 40s with short dark hair, thoughtful smirk, navy quarter-zip sweater over a collared shirt, dark jeans, black sneakers",
}

ROSTER = ["karpathink", "codeaux", "potetron", "wangle", "altmind", "hwang", "zuckerbot", "tusk",
          "feifei", "ngram", "hintern", "mirage", "zen", "hassabyss", "packet", "router", "pitchai", "jazzy", "amodeus", "safeskever", "almighty"]

POSES = {
    "idle": "relaxed but ready fighting guard stance, fists up near the chin, knees slightly bent",
    "walk": "mid-stride walking forward in a fighting guard, front foot stepping forward, fists up",
    "crouch": "crouching low in a fighting guard, knees deeply bent, fists up, compact and ready",
    "jump": "jumping high in the air, knees tucked up toward the chest, fists ready, dynamic midair pose",
    "punch": "throwing a powerful straight punch to the right, front arm fully extended at shoulder height, rear fist at the chin, body twisted into the punch, intense shout",
    "kick": "high roundhouse kick to the right, kicking leg fully extended at head height, standing on one leg, arms out for balance, fierce expression",
    "sweep": "crouching leg sweep very low to the ground, one leg extended far forward to the right along the floor, one hand touching the ground",
    "uppercut": "rising uppercut, leaping upward with one fist thrust straight up above the head, other arm down, shouting",
    "special": "unleashing a special move, both palms thrust forward to the right firing a burst of energy, wide lunging stance, glowing hands",
    "block": "blocking defensively, both forearms raised and crossed in front of the face, braced, leaning back slightly",
    "hit": "getting hit hard, recoiling backward to the left, head snapped back, arms flailing, pained grimace",
    "knockdown": "knocked down lying flat on the back on the floor, body horizontal, dazed with eyes shut",
    "win": "victory pose, one fist raised high in triumph, big confident grin, chest out",
    "super1": "powering up an ultimate super move, crouched and tensed with fists clenched at the sides, hair and clothes blown by an energy aura, shouting",
    "super2": "unleashing the ultimate super attack, whole body thrust forward to the right, both arms extended, explosive energy bursting from the hands",
}


def log(msg: str) -> None:
    with LOG.open("a") as f:
        f.write(time.strftime("%H:%M:%S ") + msg + "\n")
    print(msg, flush=True)


def codex(prompt: str, images: list[Path], out: Path, cwd: "Path | None" = None) -> bool:
    args = ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write", "-m", "gpt-5.6-terra", "-c", "model_reasoning_effort=low"]
    for i in images:
        args += ["-i", str(i)]
    for attempt in range(2):
        try:
            subprocess.run(args, input=prompt, text=True, capture_output=True, timeout=600, cwd=cwd)
        except subprocess.TimeoutExpired:
            pass
        if out.exists() and out.stat().st_size > 10000:
            return True
        time.sleep(10)
    return False


def key_job(fid: str) -> str:
    out = KEYS / f"{fid}.png"
    if out.exists():
        return f"key {fid}: exists"
    job = KEYS / f"job_{fid}"
    job.mkdir(exist_ok=True)
    job_ref = job / "style_reference.png"
    shutil.copy(ART / "karpathink_raw.png", job_ref)
    job_out = job / "out.png"
    job_out.unlink(missing_ok=True)
    extra = ""
    if fid == "potetron":
        extra = "This character is a woman (she/her). "
    prompt = f"""Use your image generation tool to create ONE new image, then save it as {job_out} (PNG).
Full body character select art for a 90s arcade 2D fighting game, in the same art style, line weight and cel shading as the attached reference.
{extra}Character: {NEW_KEYS[fid]}.
Pose (important): wide confident fighting stance, three-quarter view facing right, whole body visible from head to shoes, both arms held out away from the torso with fists clenched and nothing crossing the chest, legs wide apart and fully visible. No floating effects, no props, nothing overlapping the body. Plain flat pure white background (not transparent, no gradient, no floor), single character, centered, no text. Fictional parody character. Do not do anything else."""
    ok = codex(prompt, [job_ref], job_out, cwd=job)
    if ok:
        shutil.move(job_out, out)
    return f"key {fid}: {'ok' if ok else 'FAILED'}"


def pose_job(fid: str, pose: str) -> str:
    out = POSES_DIR / f"{fid}_{pose}.png"
    if out.exists():
        return f"pose {fid}_{pose}: exists"
    src_ref = ART / f"{fid}_raw.png"
    if not src_ref.exists():
        return f"pose {fid}_{pose}: no key art yet"
    # Each job gets a private folder: parallel Codex runs sharing one folder sometimes saved
    # another fighter's drawing under this name.
    job = POSES_DIR / f"job_{fid}_{pose}"
    job.mkdir(exist_ok=True)
    ref = job / "reference.png"
    shutil.copy(src_ref, ref)
    final = out
    out = job / "out.png"
    out.unlink(missing_ok=True)
    prompt = f"""Use your image generation tool to create ONE new image, then save it as {out} (PNG).
Draw EXACTLY the same character as the attached reference image: same face, hair, body type, gender, outfit, colors, accessories and the same art style, line weight and cel shading.
New pose: {POSES[pose]}. Side view facing right (three-quarter), whole body fully visible, same scale as the reference.
Plain flat pure white background (not transparent, no gradient, no floor), single character, no shadow, no text, no extra effects except what the pose describes. Fictional parody character. Do not do anything else."""
    ok = codex(prompt, [ref], out, cwd=job)
    if ok:
        shutil.move(out, final)
    return f"pose {fid}_{pose}: {'ok' if ok else 'FAILED'}"


def main() -> None:
    workers = int(sys.argv[sys.argv.index("--workers") + 1]) if "--workers" in sys.argv else 4
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    stage = sys.argv[sys.argv.index("--stage") + 1] if "--stage" in sys.argv else "all"
    KEYS.mkdir(exist_ok=True)
    POSES_DIR.mkdir(exist_ok=True)
    if stage in ("keys", "all"):
        ids = [k for k in NEW_KEYS if not only or k in only]
        if "potetron" in ids:
            (KEYS / "potetron.png").unlink(missing_ok=True) if "--redo-potetron" in sys.argv else None
        with cf.ThreadPoolExecutor(workers) as ex:
            for r in ex.map(key_job, ids):
                log(r)
        done = [k for k in ids if (KEYS / f"{k}.png").exists()]
        if done:
            subprocess.run([sys.executable, str(ROOT / "tools" / "import_art.py"), str(KEYS), *done], check=False)
            log(f"imported keys: {done}")
    if stage in ("poses", "all"):
        ids = [k for k in ROSTER if not only or k in only]
        jobs = [(f, p) for p in POSES for f in ids]
        with cf.ThreadPoolExecutor(workers) as ex:
            for r in ex.map(lambda j: pose_job(*j), jobs):
                log(r)
    log("queue finished")


if __name__ == "__main__":
    main()
