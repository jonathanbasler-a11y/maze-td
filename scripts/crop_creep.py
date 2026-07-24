from pathlib import Path

from PIL import Image

src = Path(r"C:\Users\Joni\maze-td\public\assets\sprites\creep.png")
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
xs: list[int] = []
ys: list[int] = []
for y in range(h):
    for x in range(w):
        if px[x, y][3] > 40:
            xs.append(x)
            ys.append(y)
if not xs:
    raise SystemExit("empty")
l, t, r, b = min(xs), min(ys), max(xs) + 1, max(ys) + 1
cw = r - l
# Prefer the large right beetle in the old sheet crop
crop = im.crop((l + int(cw * 0.35), t, r, b))
bb = crop.getbbox()
if bb:
    crop = crop.crop(bb)
side = max(crop.size) + 24
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(crop, ((side - crop.size[0]) // 2, (side - crop.size[1]) // 2), crop)
canvas.save(src)
print("creep", canvas.size, src.stat().st_size)
