"""Render polished HUD portraits from the shipped race delivery GLB.

This renderer intentionally consumes the integrated final-product GLB instead
of the non-redistributable ``Animals_Free.blend`` source. It keeps roster and
leader portraits reproducible even when the licensed source file is not
present on a development machine.

Run with:
    blender -b --python scripts/blender/render_race_delivery_icons.py
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "public" / "models" / "race" / "animals" / "animals-free.glb"
OUTPUT_DIR = ROOT / "public" / "images" / "games" / "race-icons"


@dataclass(frozen=True)
class Racer:
    key: str
    ortho_scale: float


RACERS = (
    Racer("tiger", 3.05),
    Racer("horse", 2.5),
    Racer("deer", 2.5),
    Racer("dog", 2.4),
    Racer("cat", 1.95),
    Racer("penguin", 2.0),
    Racer("chicken", 2.0),
)


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def set_tree_render_hidden(obj: bpy.types.Object, hidden: bool) -> None:
    obj.hide_render = hidden
    for child in obj.children:
        set_tree_render_hidden(child, hidden)


def import_delivery() -> None:
    if not INPUT.exists():
        raise FileNotFoundError(INPUT)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(INPUT))

    for racer in RACERS:
        rig = bpy.data.objects[f"Race_{racer.key}"]
        if rig.animation_data:
            rig.animation_data_clear()
        rig.data.pose_position = "REST"
        rig.rotation_euler = (0, 0, 0)
        set_tree_render_hidden(rig, True)


def configure_materials() -> None:
    # The atlas already owns the species color. Shared restrained highlights
    # make the mixed pack feel like one matte toy cast without altering the
    # licensed texture or embedding another image.
    for material in bpy.data.materials:
        material.use_nodes = True
        principled = material.node_tree.nodes.get("Principled BSDF")
        if principled is None:
            continue
        principled.inputs["Roughness"].default_value = 0.7
        if "Coat Weight" in principled.inputs:
            principled.inputs["Coat Weight"].default_value = 0.16
            principled.inputs["Coat Roughness"].default_value = 0.34


def configure_scene() -> bpy.types.Object:
    scene = bpy.context.scene
    scene.frame_set(0)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 320
    scene.render.resolution_y = 320
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 90
    scene.render.film_transparent = True

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0.05

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (*srgb("#FFF8EC"), 1)
        background.inputs["Strength"].default_value = 0.45
    scene.world = world

    bpy.ops.object.camera_add(location=(3.9, -7.4, 2.8))
    camera = bpy.context.object
    camera.name = "RaceIconCamera"
    camera.data.type = "ORTHO"
    point_at(camera, Vector((0, 0, 0.76)))
    scene.camera = camera

    for name, location, energy, size, color in (
        ("RaceIconKey", (-4, -5, 7), 900, 4.5, "#FFD4C2"),
        ("RaceIconFill", (5, -1, 5), 640, 4.0, "#C9E5FF"),
        ("RaceIconRim", (0, 4, 6), 720, 3.8, "#FFF0C2"),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = srgb(color)
        point_at(light, Vector((0, 0, 0.75)))

    return camera


def render_icons(camera: bpy.types.Object) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    for racer in RACERS:
        rig = bpy.data.objects[f"Race_{racer.key}"]
        set_tree_render_hidden(rig, False)
        camera.data.ortho_scale = racer.ortho_scale
        scene.render.filepath = str(OUTPUT_DIR / f"{racer.key}.webp")
        bpy.ops.render.render(write_still=True)
        set_tree_render_hidden(rig, True)
        print(f"RACE_DELIVERY_ICON={scene.render.filepath}")


def main() -> None:
    import_delivery()
    configure_materials()
    camera = configure_scene()
    render_icons(camera)


main()
