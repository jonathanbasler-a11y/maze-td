"""Crop and cut out production sprites from ComfyUI raw outputs."""
from pathlib import Path

from PIL import Image

raw = Path(r"C:\Users\Joni\maze-td\assets\sprites\raw")
out = Path(r"C:\Users\Joni\maze-td\public\assets\sprites")
out.mkdir(parents=True, exist_ok=True)


def cut_white(im: Image.Image, thr: int = 240) -> Image.Image:
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= thr and g >= thr and b >= thr:
                px[x, y] = (r, g, b, 0)
            elif min(r, g, b) > 210:
                s = min(r, g, b)
                alpha = max(0, int(255 * (1 - (s - 210) / 45)))
                px[x, y] = (r, g, b, alpha)
    return im


def to_square(im: Image.Image) -> Image.Image:
    bb = im.getbbox()
    if bb is None:
        raise RuntimeError("empty image after cutout")
    im = im.crop(bb)
    side = max(im.size)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.size[0]) // 2, (side - im.size[1]) // 2), im)
    return canvas


# Creep: center crop from sheet
creep = Image.open(raw / "ComfyUI_00014_.png").convert("RGBA")
w, h = creep.size
cw, ch = int(w * 0.42), int(h * 0.42)
box = (
    (w - cw) // 2,
    (h - ch) // 2 - int(h * 0.05),
    (w + cw) // 2,
    (h + ch) // 2 - int(h * 0.05),
)
creep = to_square(cut_white(creep.crop(box)))
creep.save(out / "creep.png")
print("creep", creep.size)

# Wall cell art from cobble texture
wall_tex = Image.open(raw / "ComfyUI_00010_.png").convert("RGBA")
ww, wh = wall_tex.size
s = min(ww, wh)
wall_crop = wall_tex.crop(((ww - s) // 2, (wh - s) // 2, (ww + s) // 2, (wh + s) // 2))
wall_crop = wall_crop.resize((256, 256), Image.Resampling.LANCZOS)
wall_crop.save(out / "wall.png")
print("wall", wall_crop.size)

# Gun: remove light courtyard
gun = Image.open(raw / "gun_raw.png").convert("RGBA")
px = gun.load()
W, H = gun.size
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        if r > 200 and g > 200 and b > 200:
            px[x, y] = (r, g, b, 0)
        elif abs(r - g) < 12 and abs(g - b) < 12 and r > 170:
            px[x, y] = (r, g, b, 0)
gun = to_square(gun)
gun.save(out / "gun.png")
print("gun", gun.size)

print("ok", sorted(p.name for p in out.iterdir()))
