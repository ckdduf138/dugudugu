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
    image = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    s = lambda value: scale(value, canvas_size)

    draw.rounded_rectangle(
        (s(2), s(2), s(46), s(46)),
        radius=s(14),
        fill=CORAL,
    )

    spiral: list[tuple[int, int]] = []
    center_x, center_y = 31.5, 28.6
    for index in range(72):
        t = index / 71
        radius = 13.2 * (1 - t) + 2.2
        angle = math.pi * (0.96 + 2.18 * t)
        spiral.append(
            (
                s(center_x + math.cos(angle) * radius),
                s(center_y + math.sin(angle) * radius * 0.76),
            )
        )
    draw.line(spiral, fill=MINT, width=s(7), joint="curve")

    draw.ellipse((s(8.2), s(10.4), s(29.8), s(32.7)), fill=MINT)
    draw.ellipse((s(12.1), s(14), s(22.3), s(24.2)), fill=SURFACE)
    draw.ellipse((s(15.25), s(17.05), s(20.35), s(22.15)), fill=INK)
    draw.ellipse((s(16.05), s(17.85), s(17.75), s(19.55)), fill=SURFACE)
    draw.arc(
        (s(7.6), s(17.7), s(15.4), s(25.2)),
        start=35,
        end=122,
        fill=INK,
        width=s(1.55),
    )
    draw.polygon(
        [(s(x), s(y)) for x, y in star_points(22.8, 11.4, 3.5, 1.6)],
        fill=LEMON,
    )

    return image.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    outputs = {
        ROOT / "public/brand-icon-192.png": 192,
        ROOT / "public/brand-icon-512.png": 512,
        ROOT / "app/apple-icon.png": 180,
    }
    for path, size in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        draw_mark(size).save(path, optimize=True)

    draw_mark(64).save(
        ROOT / "app/favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )


if __name__ == "__main__":
    main()
