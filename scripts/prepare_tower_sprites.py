"""Prepare per-tower HD sprites: studio-bg flood cutout + square pack at 1024."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

RAW = Path(r"C:\Users\Joni\maze-td\assets\sprites\raw\towers_hd")
OUT = Path(r"C:\Users\Joni\maze-td\public\assets\sprites\towers")
OUT.mkdir(parents=True, exist_ok=True)

try:
    from rembg import remove as rembg_remove
except ImportError:
    rembg_remove = None


def flood_studio_bg(im: Image.Image, tol: int = 42) -> Image.Image:
    """Punch out light studio backdrop by flooding from image corners."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (0, h // 2)]
    seen = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def is_bg(r: int, g: int, b: int) -> bool:
        mn = min(r, g, b)
        mx = max(r, g, b)
        # light / mid-grey studio paper (low chroma)
        return mn >= 125 and (mx - mn) <= tol

    for sx, sy in seeds:
        r, g, b, _ = px[sx, sy]
        if is_bg(r, g, b) and not seen[sy][sx]:
            seen[sy][sx] = True
            q.append((sx, sy))

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h or seen[ny][nx]:
                continue
            r, g, b, a = px[nx, ny]
            if a == 0 or not is_bg(r, g, b):
                continue
            seen[ny][nx] = True
            q.append((nx, ny))
    return im


def cutout(im: Image.Image) -> Image.Image:
    if rembg_remove is not None:
        return rembg_remove(im.convert("RGBA"))
    return flood_studio_bg(im)


def to_square(im: Image.Image, padding: int = 28, side: int = 1024) -> Image.Image:
    bb = im.getbbox()
    if bb is None:
        raise RuntimeError("empty after cutout")
    l, t, r, b = bb
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(im.width, r + padding)
    b = min(im.height, b + padding)
    im = im.crop((l, t, r, b))
    scale = min(side / im.width, side / im.height) * 0.92
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - nw) // 2, (side - nh) // 2), im)
    rgb = canvas.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=1.0, percent=110, threshold=3)
    )
    out = rgb.convert("RGBA")
    out.putalpha(canvas.getchannel("A"))
    return out


def process(src: str, dst: str) -> None:
    path = RAW / src
    if not path.exists():
        print("missing", src)
        return
    im = cutout(Image.open(path))
    im = to_square(im)
    out = OUT / dst
    im.save(out, optimize=True)
    print(f"{dst}: {im.size} rembg={rembg_remove is not None}")


JOBS = [
    ("blocker_raw.png", "blocker.png"),
    ("gun_raw.png", "gun.png"),
    ("frost_raw.png", "frost.png"),
    ("sniper_raw.png", "sniper.png"),
    ("mortar_raw.png", "mortar.png"),
    ("spike_raw.png", "spike.png"),
]


if __name__ == "__main__":
    for src, dst in JOBS:
        process(src, dst)
    print("done", sorted(p.name for p in OUT.iterdir()))
