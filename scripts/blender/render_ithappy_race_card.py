"""Render the lobby card from the licensed ITHappy final-product cast.

Run with the locally downloaded source (which is never copied into the repo):

    blender -b /path/to/Animals_Free.blend \
      --python scripts/blender/render_ithappy_race_card.py
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "images" / "games" / "race.webp"
FRAME = 8

RACERS = (
    ("Tiger_001", -4.15, 1.15, 1.35),
    ("Horse_001", -1.38, 1.15, 1.38),
    ("Deer_001", 1.38, 1.15, 1.46),
    ("Dog_001", 4.15, 1.15, 1.16),
    ("Kitty_001", -2.7, -1.15, 0.98),
    ("Pinguin_001", 0.0, -1.15, 1.08),
    ("Chicken_001", 2.7, -1.15, 0.92),
)


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def material(name: str, color: str, roughness: float = 0.82) -> bpy.types.Material:
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.use_nodes = True
    result.diffuse_color = (*srgb(color), 1)
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*srgb(color), 1)
        bsdf.inputs["Roughness"].default_value = roughness
    return result


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


def run_pose(source: str, x: float, y: float, target_height: float) -> None:
    rig = bpy.data.objects[f"{source}_rig"]
    mesh = bpy.data.objects[source]
    action = bpy.data.actions[f"{source}_run"]
    rig.hide_render = False
    mesh.hide_render = False
    rig.rotation_euler.z = math.radians(90)

    rig.animation_data_clear()
    animation = rig.animation_data_create()
    track = animation.nla_tracks.new()
    strip = track.strips.new(f"{source}_run", 1, action)
    strip.action_frame_start, strip.action_frame_end = action.frame_range
    strip.repeat = 3

    bpy.context.scene.frame_set(FRAME)
    bpy.context.view_layer.update()
    minimum, maximum = bounds(mesh)
    factor = target_height / max(0.001, maximum.z - minimum.z)
    rig.scale = tuple(component * factor for component in rig.scale)
    bpy.context.view_layer.update()
    minimum, maximum = bounds(mesh)
    center = (minimum + maximum) * 0.5
    rig.location.x += x - center.x
    rig.location.y += y - center.y
    rig.location.z -= minimum.z


def setup_scene() -> None:
    keep = {
        name
        for source, *_ in RACERS
        for name in (source, f"{source}_rig")
    }
    for obj in list(bpy.data.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    for racer in RACERS:
        run_pose(*racer)

    bpy.ops.mesh.primitive_cube_add(location=(0, 0, -0.22))
    ground = bpy.context.object
    ground.scale = (8.0, 7.0, 0.22)
    ground.data.materials.append(material("RaceCardGrass", "#9CDCB9"))

    bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0.005))
    track = bpy.context.object
    track.scale = (7.5, 6.1, 0.035)
    track.data.materials.append(material("RaceCardTrack", "#E8BD89"))

    cream = material("RaceCardLine", "#FFF8EA", 0.74)
    for y in (-2.25, -0.4, 0.4, 2.25):
        bpy.ops.mesh.primitive_cube_add(location=(0, y, 0.06))
        line = bpy.context.object
        line.scale = (6.5, 0.025, 0.02)
        line.data.materials.append(cream)

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (*srgb("#EAF7FF"), 1)
        background.inputs["Strength"].default_value = 0.7
    bpy.context.scene.world = world


def add_camera_and_lights() -> None:
    bpy.ops.object.camera_add(location=(0, -13.0, 8.5))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 10.5
    point_at(camera, Vector((0, 0, 0.85)))
    bpy.context.scene.camera = camera

    for location, energy, size, color in (
        ((-5, -6, 9), 850, 6.0, "#FFD9C9"),
        ((6, -2, 6), 560, 5.0, "#CFE8FF"),
        ((0, 5, 8), 720, 5.0, "#FFF0C8"),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = srgb(color)
        point_at(light, Vector((0, 0, 0.8)))


def render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 86
    scene.render.film_transparent = False
    scene.render.filepath = str(OUTPUT)
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = -0.2
    scene.frame_set(FRAME)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.render.render(write_still=True)
    print(f"ITHAPPY_RACE_CARD={OUTPUT}")


setup_scene()
add_camera_and_lights()
render()
