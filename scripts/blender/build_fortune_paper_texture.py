"""Build the delivery WebP from the preserved CC0 white-paper photograph.

Run with:
  blender -b --python scripts/blender/build_fortune_paper_texture.py
"""

from __future__ import annotations

from pathlib import Path

import bpy


ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    ROOT
    / "scripts"
    / "assets"
    / "fortune-ui"
    / "source-white-paper-texture-cc0.jpg"
)
OUTPUT = (
    ROOT
    / "public"
    / "images"
    / "games"
    / "fortune-paper-texture-cc0.webp"
)


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing preserved source: {SOURCE}")

    scene = bpy.context.scene
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.quality = 74
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "Medium High Contrast"

    image = bpy.data.images.load(str(SOURCE), check_existing=False)
    image.scale(1536, 1024)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save_render(str(OUTPUT), scene=scene)
    print(f"Rendered paper texture: {OUTPUT}")


if __name__ == "__main__":
    main()
