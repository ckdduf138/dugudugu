"""Render transparent DOM HUD portraits from the licensed ITHappy cast.

Run with the locally downloaded source (which is never copied into the repo):

    blender -b /path/to/Animals_Free.blend \
      --python scripts/blender/render_ithappy_race_icons.py
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "public" / "images" / "games" / "race-icons"
FRAME = 0


@dataclass(frozen=True)
class Racer:
    key: str
    source: str
    target_height: float
    ortho_scale: float


RACERS = (
    Racer("tiger", "Tiger_001", 1.45, 3.10),
    Racer("horse", "Horse_001", 1.45, 2.55),
    Racer("deer", "Deer_001", 1.45, 2.30),
    Racer("dog", "Dog_001", 1.45, 2.45),
    Racer("cat", "Kitty_001", 1.45, 2.40),
    Racer("penguin", "Pinguin_001", 1.45, 2.05),
    Racer("chicken", "Chicken_001", 1.45, 2.10),
)


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def bounds(mesh: bpy.types.Object) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    return (
        Vector(tuple(min(point[axis] for point in points) for axis in range(3))),
        Vector(tuple(max(point[axis] for point in points) for axis in range(3))),
    )


def prepare_pose(racer: Racer) -> tuple[bpy.types.Object, bpy.types.Object]:
    rig = bpy.data.objects[f"{racer.source}_rig"]
    mesh = bpy.data.objects[racer.source]
    rig.rotation_euler.z = math.radians(150)

    # A neutral authored rest pose stays recognizable at 32 CSS pixels; a
    # mid-stride silhouette makes small species and antlers harder to parse.
    rig.animation_data_clear()
    bpy.context.scene.frame_set(FRAME)
    bpy.context.view_layer.update()
    minimum, maximum = bounds(mesh)
    factor = racer.target_height / max(0.001, maximum.z - minimum.z)
    rig.scale = tuple(component * factor for component in rig.scale)
    bpy.context.view_layer.update()
    minimum, maximum = bounds(mesh)
    center = (minimum + maximum) * 0.5
    rig.location.x -= center.x
    rig.location.y -= center.y
    rig.location.z -= minimum.z
    return rig, mesh


def setup_scene() -> None:
    keep = {
        name
        for racer in RACERS
        for name in (racer.source, f"{racer.source}_rig")
    }
    for obj in list(bpy.data.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    for racer in RACERS:
        rig, mesh = prepare_pose(racer)
        rig.hide_render = True
        mesh.hide_render = True

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (*srgb("#FFF9ED"), 1)
        background.inputs["Strength"].default_value = 0.7
    bpy.context.scene.world = world


def add_camera_and_lights() -> None:
    bpy.ops.object.camera_add(location=(3.9, -7.4, 2.8))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.1
    point_at(camera, Vector((0, 0, 0.76)))
    bpy.context.scene.camera = camera

    for location, energy, size, color in (
        ((-4, -5, 7), 760, 4.5, "#FFD9C9"),
        ((5, -1, 5), 520, 4.0, "#CFE8FF"),
        ((0, 4, 6), 600, 3.8, "#FFF0C8"),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = srgb(color)
        point_at(light, Vector((0, 0, 0.75)))


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 192
    scene.render.resolution_y = 192
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 88
    scene.render.film_transparent = True
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = -0.15
    scene.frame_set(FRAME)


def render_icons() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    for racer in RACERS:
        rig = bpy.data.objects[f"{racer.source}_rig"]
        mesh = bpy.data.objects[racer.source]
        rig.hide_render = False
        mesh.hide_render = False
        scene.camera.data.ortho_scale = racer.ortho_scale
        scene.render.filepath = str(OUTPUT_DIR / f"{racer.key}.webp")
        bpy.ops.render.render(write_still=True)
        rig.hide_render = True
        mesh.hide_render = True
        print(f"ITHAPPY_RACE_ICON={scene.render.filepath}")


setup_scene()
add_camera_and_lights()
configure_render()
render_icons()
