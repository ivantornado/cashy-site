#!/usr/bin/env python3
"""Turns the cyan outline glow on supplied Cashy art into Base blue.

The site has no cyan, so only the glow around the outside of the figure changes: cyan
pixels near the transparent edge get Base-blue's hue. Everything inside (his face,
the jacket, a gadget's own light) keeps its colours.

  python3 scripts/blue-glow.py <source image> <out.webp> [max width]

Run it again on each new piece of art that arrives with a cyan rim.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

EDGE_PX = 34  # how far in from the transparent edge counts as "glow"
BLUE_HUE = 170  # 240 degrees on PIL's 0-255 hue scale
CYAN_HUES = (108, 152)  # roughly 150-215 degrees: cyan, teal and sky blue


def blue_glow(src: Path, out: Path, max_width=None):
    art = Image.open(src).convert("RGBA")
    if max_width and art.width > max_width:
        art = art.resize((max_width, round(art.height * max_width / art.width)), Image.LANCZOS)
    alpha = art.getchannel("A")

    # The edge band: anything within EDGE_PX of a see-through pixel.
    clear = alpha.point(lambda a: 255 if a < 250 else 0)
    edge = clear.filter(ImageFilter.GaussianBlur(EDGE_PX / 2)).point(lambda v: 255 if v > 8 else 0)

    hsv = art.convert("RGB").convert("HSV")
    h, s, v = hsv.split()
    cyan = h.point(lambda x: 255 if CYAN_HUES[0] <= x <= CYAN_HUES[1] else 0)
    saturated = s.point(lambda x: 255 if x > 60 else 0)
    mask = ImageChops.multiply(ImageChops.multiply(cyan, saturated), edge).filter(ImageFilter.GaussianBlur(1))

    # Base blue, kept as bright as the cyan was so the glow still reads on black.
    blue = Image.merge("HSV", (Image.new("L", art.size, BLUE_HUE), s.point(lambda x: int(x * 0.78)), v)).convert("RGB")
    result = Image.composite(blue, art.convert("RGB"), mask)
    result.putalpha(alpha)
    result.save(out, "WEBP", quality=88, method=6)
    print(out.name, result.size, f"{out.stat().st_size // 1024}KB")


if __name__ == "__main__":
    blue_glow(Path(sys.argv[1]), Path(sys.argv[2]), int(sys.argv[3]) if len(sys.argv) > 3 else None)
