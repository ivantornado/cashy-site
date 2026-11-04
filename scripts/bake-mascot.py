#!/usr/bin/env python3
"""Bakes the neon scene treatment onto the mascot so he sits in the skyline.

Nothing is redrawn: the source pixels get a cool night grade, cyan and Base blue
rim lights on his outer contour, and a soft outer glow. Baking it here means the
browser never runs a filter on him while the parallax is moving.

Run again when the final art arrives: python3 scripts/bake-mascot.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/reference/mascot-source.webp"
ART = ROOT / "public/art"

# The source sheet holds two poses side by side.
POSES = {
    "cashy-standing.webp": (121, 695),
    "cashy-crouching.webp": (870, 1780),
}
PAD = 48
CYAN = (39, 231, 255)
BLUE = (2, 79, 246)
NIGHT = (11, 19, 48)


def tint(mask, colour):
    return Image.merge("RGBA", (*[Image.new("L", mask.size, c) for c in colour], mask))


def rim(alpha, dx, width):
    """The part of the silhouette within `width` px of one side's edge."""
    shifted = ImageChops.offset(alpha, dx, 0)
    edge = ImageChops.subtract(alpha, shifted)
    return edge.filter(ImageFilter.GaussianBlur(width))


sheet = Image.open(SOURCE).convert("RGBA")


def bake(name, x_range):
    pose = sheet.crop((x_range[0], 0, x_range[1], sheet.height))
    out = ART / name
    pose = pose.crop(pose.getbbox())

    canvas = Image.new("RGBA", (pose.width + PAD * 2, pose.height + PAD * 2), (0, 0, 0, 0))
    canvas.paste(pose, (PAD, PAD))
    alpha = canvas.getchannel("A")

    # Night grade: cool him down, darker towards the boots.
    night = Image.new("RGBA", canvas.size, (*NIGHT, 255))
    ramp = Image.linear_gradient("L").resize(canvas.size)
    ramp = ramp.point(lambda v: int(30 + v * 0.26))
    graded = Image.composite(night, canvas, ramp)
    graded.putalpha(alpha)

    # Rim lights: screen the colour over the contour, inside the silhouette only.
    left = rim(alpha, 9, 1.2).point(lambda v: min(255, int(v * 1.0)))
    right = rim(alpha, -9, 1.2).point(lambda v: min(255, int(v * 1.0)))
    lit = ImageChops.screen(graded.convert("RGB"), Image.composite(Image.new("RGB", canvas.size, CYAN), Image.new("RGB", canvas.size, 0), left))
    lit = ImageChops.screen(lit, Image.composite(Image.new("RGB", canvas.size, BLUE), Image.new("RGB", canvas.size, 0), right))
    lit.putalpha(alpha)

    # Outer glow, offset to each side so the two colours read as light sources.
    glow_left = ImageChops.offset(alpha, -8, 0).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.55))
    glow_right = ImageChops.offset(alpha, 8, 0).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.55))
    result = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    result = Image.alpha_composite(result, tint(glow_left, CYAN))
    result = Image.alpha_composite(result, tint(glow_right, BLUE))
    result = Image.alpha_composite(result, lit)

    result.save(out, "WEBP", quality=90, method=6)
    print(out.name, result.size, f"{out.stat().st_size // 1024}KB")


for pose_name, pose_x in POSES.items():
    bake(pose_name, pose_x)

# Grain tile for the whole site: light specks on transparent, small and tileable.
import random

random.seed(8453)
SIZE = 128
grain = Image.new("LA", (SIZE, SIZE))
grain.putdata([(255 if random.random() > 0.5 else 0, random.choice((0, 0, 5, 9, 14))) for _ in range(SIZE * SIZE)])
grain_out = ROOT / "public/art/grain.png"
grain.save(grain_out, optimize=True)
print(grain_out.name, f"{grain_out.stat().st_size // 1024}KB")
