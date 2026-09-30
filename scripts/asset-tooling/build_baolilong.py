"""Pack the LiClick-generated sheet into game-sized, transparent single-frame atlases.

Usage: python scripts/asset-tooling/build_baolilong.py path/to/liclick-sheet.png
Accepts the original 1024px sheet or the user's revised 1479x1064 sheet.
"""

import colorsys
import json
from pathlib import Path
import sys

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "src/assets/baolilong"
DEST.mkdir(parents=True, exist_ok=True)
sheet = Image.open(sys.argv[1]).convert("RGBA")
if sheet.size not in [(1024, 1024), (1479, 1064)]:
    raise ValueError("Expected a reviewed 1024x1024 or 1479x1064 sheet")


def sprite(box, size, source=None):
    image = (sheet if source is None else source).crop(box)
    image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= 160 else 0))
    image = image.crop(image.getbbox())
    image.thumbnail(size, Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, size[1] - image.height))
    return canvas


def shiny(image):
    result = image.copy()
    pixels = []
    for r, g, b, a in result.getdata():
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if a and 0.48 < h < 0.72 and s > 0.15:
            r, g, b = (round(c * 255) for c in colorsys.hsv_to_rgb(0.9, s * 0.8, v))
        pixels.append((r, g, b, a))
    result.putdata(pixels)
    return result


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


if sheet.size == (1479, 1064):
    # The two battle views overlap in X but not in Y. Isolate their gutters
    # without clipping either tail or including pixels from the adjacent view.
    front_source = sheet.copy()
    front_source.paste((0, 0, 0, 0), (740, 400, 780, 700))
    back_source = sheet.copy()
    back_source.paste((0, 0, 0, 0), (740, 0, 780, 400))
    front = sprite((0, 0, 780, 700), (96, 80), front_source)
    back = sprite((740, 0, 1479, 700), (96, 80), back_source)
    icon = sprite((0, 700, 740, 1064), (32, 32))
    stone = sprite((740, 700, 1479, 1064), (24, 24))
else:
    front = sprite((0, 0, 512, 620), (96, 80))
    back = sprite((512, 0, 1024, 620), (96, 80))
    icon = sprite((0, 620, 512, 1024), (32, 32))
    stone = sprite((512, 620, 1024, 1024), (24, 24))
for name, im in [("front", front), ("back", back)]:
    atlas(name, [("0001.png", im)])
    atlas(f"{name}-shiny", [("0001.png", shiny(im))])
atlas("icons", [("1900", icon), ("1900s", shiny(icon)), ("spheal_stone", stone)])

# A readable preview on a neutral background, outside shipped assets.
preview = Image.new("RGBA", (560, 160), (232, 239, 243, 255))
for x, im in [(10, front), (130, back), (250, shiny(front)), (380, icon), (430, stone)]:
    preview.alpha_composite(im, (x, 30))
preview.resize((1120, 320), Image.Resampling.NEAREST).save(Path(sys.argv[1]).with_name("game-assets-preview.png"))
print(f"Wrote 5 PNG/JSON atlas pairs to {DEST}")
