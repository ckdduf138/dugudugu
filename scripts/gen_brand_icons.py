"""Generate Dugudugu raster icons from the compact chameleon mark."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CORAL = "#ff8a6b"
MINT = "#57e0b6"
LEMON = "#ffd45e"
INK = "#34273a"
SURFACE = "#ffffff"


def scale(value: float, size: int) -> int:
    return round(value * size / 48)


def star_points(
    cx: float,
    cy: float,
    outer: float,
    inner: float,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(10):
        radius = outer if index % 2 == 0 else inner
        angle = -math.pi / 2 + index * math.pi / 5
        points.append(
            (cx + math.cos(angle) * radius, cy + math.sin(angle) * radius)
        )
    return points


def draw_mark(size: int) -> Image.Image:
    supersample = 4
    canvas_size = size * supersample
    image = Image.new("RGB", (canvas_size, canvas_size), CORAL)
    draw = ImageDraw.Draw(image)
    s = lambda value: scale(value, canvas_size)

    content_scale = 1.1
    content_offset_x = -2.5
    content_offset_y = 1.7
    cx = lambda value: 24 + (value - 24) * content_scale + content_offset_x
    cy = lambda value: 24 + (value - 24) * content_scale + content_offset_y

    spiral: list[tuple[int, int]] = []
    center_x, center_y = cx(31.5), cy(28.6)
    for index in range(72):
        t = index / 71
        radius = (13.2 * (1 - t) + 2.2) * content_scale
        angle = math.pi * (0.96 + 2.18 * t)
        spiral.append(
            (
                s(center_x + math.cos(angle) * radius),
                s(center_y + math.sin(angle) * radius * 0.76),
            )
        )
    draw.line(spiral, fill=MINT, width=s(7 * content_scale), joint="curve")

    draw.ellipse((s(cx(8.2)), s(cy(10.4)), s(cx(29.8)), s(cy(32.7))), fill=MINT)
    draw.ellipse((s(cx(12.1)), s(cy(14)), s(cx(22.3)), s(cy(24.2))), fill=SURFACE)
    draw.ellipse((s(cx(15.25)), s(cy(17.05)), s(cx(20.35)), s(cy(22.15))), fill=INK)
    draw.ellipse((s(cx(16.05)), s(cy(17.85)), s(cx(17.75)), s(cy(19.55))), fill=SURFACE)
    draw.arc(
        (s(cx(7.6)), s(cy(17.7)), s(cx(15.4)), s(cy(25.2))),
        start=35,
        end=122,
        fill=INK,
        width=s(1.55 * content_scale),
    )
    draw.polygon(
        [
            (s(cx(x)), s(cy(y)))
            for x, y in star_points(22.8, 11.4, 3.5, 1.6)
        ],
        fill=LEMON,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    outputs = {
        ROOT / "public/brand-icon-192.png": 192,
        ROOT / "public/brand-icon-512.png": 512,
        ROOT / "public/apple-touch-icon.png": 180,
    }
    for path, size in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        draw_mark(size).save(path, optimize=True)

    draw_mark(64).save(
        ROOT / "public/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


if __name__ == "__main__":
    main()
