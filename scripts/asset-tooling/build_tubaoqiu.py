"""Pack the reviewed LiClick 2x3 sprite sheet; no synthesized shiny recoloring.
Usage: python scripts/asset-tooling/build_tubaoqiu.py
"""
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "src/assets/tubaoqiu"
DEST.mkdir(parents=True, exist_ok=True)
sheet = Image.open(ROOT / "scripts/asset-tooling/tubaoball/liclick-sheet.png").convert("RGBA")
assert sheet.size == (1024, 1536)

def sprite(box, size):
    image = sheet.crop(box)
    image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= 200 else 0))
    assert image.getbbox(), box
    image = image.crop(image.getbbox())
    image.thumbnail(size, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, size[1] - image.height))
    return canvas

def atlas(name, entries):
    width = sum(im.width for _, im in entries)
    height = max(im.height for _, im in entries)
    image = Image.new("RGBA", (width, height))
    frames = {}
    x = 0
    for key, im in entries:
        image.alpha_composite(im, (x, 0))
        frames[key] = {
            "frame": {"x": x, "y": 0, "w": im.width, "h": im.height},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": im.width, "h": im.height},
            "sourceSize": {"w": im.width, "h": im.height},
        }
        x += im.width
    image.save(DEST / f"{name}.png")
    (DEST / f"{name}.json").write_text(json.dumps({"frames": frames, "meta": {
        "image": f"{name}.png", "size": {"w": width, "h": height}, "scale": "1"
    }}, indent=2) + "\n", encoding="utf-8")

# Wide gutters were inspected before cutting. Battle views share a 96x80 canvas.
views = [
    ("front", (0, 0, 512, 570)),
    ("back", (512, 0, 1024, 570)),
    ("front-shiny", (0, 590, 512, 1100)),
    ("back-shiny", (512, 590, 1024, 1100)),
]
images = []
for name, box in views:
    im = sprite(box, (96, 80))
    images.append(im)
    atlas(name, [("0001.png", im)])
normal_icon = sprite((0, 1120, 512, 1536), (32, 32))
shiny_icon = sprite((512, 1120, 1024, 1536), (32, 32))
atlas("icons", [("1901", normal_icon), ("1901s", shiny_icon)])
preview = Image.new("RGBA", (640, 120), (232, 239, 243, 255))
for x, im in zip([12, 120, 228, 336, 460, 516], [*images, normal_icon, shiny_icon]):
    preview.alpha_composite(im, (x, 20))
preview.resize((1280, 240), Image.Resampling.NEAREST).save(ROOT / "scripts/asset-tooling/tubaoball/game-assets-preview.png")
print(f"Packed ordinary/shiny front, back and icons into {DEST}")
