"""Remove near-white backgrounds and tight-crop sprites to RGBA PNG."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def cutout(src: Path, dst: Path, threshold: int = 245, padding: int = 8) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
            elif r > 220 and g > 220 and b > 220:
                # Soft edge fade for near-white
                strength = min(r, g, b)
                alpha = max(0, int(255 * (1 - (strength - 220) / 35)))
                px[x, y] = (r, g, b, alpha)

    bbox = im.getbbox()
    if bbox is None:
        raise SystemExit(f"empty after cutout: {src}")
    l, t, r, b = bbox
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(w, r + padding)
    b = min(h, b + padding)
    cropped = im.crop((l, t, r, b))
    # Normalize to square canvas
    side = max(cropped.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    ox = (side - cropped.size[0]) // 2
    oy = (side - cropped.size[1]) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    dst.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(dst)
    print(f"wrote {dst} ({side}x{side})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: cutout_sprite.py <src> <dst>")
    cutout(Path(sys.argv[1]), Path(sys.argv[2]))
