"""Render a motion-first QA board for the ITHappy Animals Free source file.

Run with:
    blender -b /path/to/Animals_Free.blend \
      --python scripts/blender/render_animals_free_run_qa.py
"""

from __future__ import annotations

import math
import os
import shutil
import subprocess
import sys
from pathlib import Path

import bpy
from mathutils import Vector


FPS = 24
FRAME_START = 1
FRAME_END = FPS * 3
OUTPUT_DIR = Path(
    os.environ.get("ANIMALS_FREE_QA_DIR", "/tmp/dugudugu-animals-free-qa")
)
FRAMES_DIR = OUTPUT_DIR / "frames"
MOTION_PATH = OUTPUT_DIR / "animals-free-run-qa.gif"
POSTER_PATH = OUTPUT_DIR / "animals-free-run-qa.png"
ROOT = Path(__file__).resolve().parents[2]

RACERS = (
    ("Tiger_001", "Tiger", (-5.25, 2.45)),
    ("Horse_001", "Horse", (-1.75, 2.45)),
    ("Deer_001", "Deer", (1.75, 2.45)),
    ("Dog_001", "Dog", (5.25, 2.45)),
    ("Kitty_001", "Cat", (-3.5, 0.0)),
    ("Pinguin_001", "Penguin", (0.0, 0.0)),
    ("Chicken_001", "Chicken", (3.5, 0.0)),
)


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def material(name: str, hex_color: str, roughness: float = 0.85) -> bpy.types.Material:
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.diffuse_color = (*srgb(hex_color), 1.0)
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (*srgb(hex_color), 1.0)
        principled.inputs["Roughness"].default_value = roughness
    return result


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def evaluated_bounds(mesh: bpy.types.Object) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum


def set_run_loop(rig: bpy.types.Object, action: bpy.types.Action) -> None:
    rig.animation_data_clear()
    animation_data = rig.animation_data_create()
    track = animation_data.nla_tracks.new()
    track.name = "Run_QA"
    action_start, action_end = action.frame_range
    strip = track.strips.new("Run_QA", FRAME_START, action)
    strip.action_frame_start = action_start
    strip.action_frame_end = action_end
    strip.blend_type = "REPLACE"
    strip.extrapolation = "NOTHING"
    strip.repeat = math.ceil((FRAME_END - FRAME_START + 1) / max(1.0, action_end - action_start))


def place_racer(
    source_name: str,
    label: str,
    position: tuple[float, float],
) -> tuple[bpy.types.Object, bpy.types.Object]:
    rig = bpy.data.objects[f"{source_name}_rig"]
    mesh = bpy.data.objects[source_name]
    action = bpy.data.actions[f"{source_name}_run"]

    rig.hide_render = False
    mesh.hide_render = False
    rig.rotation_euler.z = math.radians(90)
    set_run_loop(rig, action)

    bpy.context.scene.frame_set(FRAME_START)
    bpy.context.view_layer.update()
    minimum, maximum = evaluated_bounds(mesh)
    height = max(0.001, maximum.z - minimum.z)
    target_height = 1.3 if label not in {"Penguin", "Chicken"} else 1.15
    scale_factor = target_height / height
    rig.scale = tuple(value * scale_factor for value in rig.scale)

    bpy.context.view_layer.update()
    minimum, maximum = evaluated_bounds(mesh)
    center = (minimum + maximum) * 0.5
    target_x, ground_z = position
    rig.location.x += target_x - center.x
    rig.location.y -= center.y
    rig.location.z += ground_z - minimum.z
    bpy.context.view_layer.update()

    rig["qa_label"] = label
    rig["qa_run_action"] = action.name
    rig["qa_run_frames"] = [round(action.frame_range[0]), round(action.frame_range[1])]
    return rig, mesh


def add_platform(x: float, ground_z: float, width: float = 3.1) -> None:
    bpy.ops.mesh.primitive_cube_add(location=(x, 0.18, ground_z - 0.075))
    platform = bpy.context.object
    platform.name = f"QAPlatform_{x}_{ground_z}"
    platform.scale = (width * 0.5, 1.1, 0.075)
    platform.data.materials.append(material("QAPlatform", "#E9DCCB"))


def add_label(text: str, x: float, z: float) -> None:
    bpy.ops.object.text_add(location=(x, -0.58, z), rotation=(math.radians(90), 0, 0))
    label = bpy.context.object
    label.name = f"QALabel_{text}"
    label.data.body = text
    label.data.align_x = "CENTER"
    label.data.align_y = "CENTER"
    label.data.size = 0.32
    label.data.extrude = 0.006
    label.data.bevel_depth = 0.003
    label.data.materials.append(material("QALabel", "#372F2A", 0.7))


def configure_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.fps = FPS
    scene.render.resolution_x = 1600
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_depth = "8"
    scene.render.film_transparent = False
    scene.render.use_file_extension = True
    scene.render.image_settings.file_format = "PNG"

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = -0.25

    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (*srgb("#F8F2E8"), 1.0)
        background.inputs["Strength"].default_value = 0.65
    scene.world = world

    for collection in bpy.data.collections:
        collection.hide_render = False
        collection.hide_viewport = False


def add_camera_and_lights() -> None:
    bpy.ops.object.camera_add(location=(0, -16.5, 2.1))
    camera = bpy.context.object
    camera.name = "QACamera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 16.5
    point_at(camera, Vector((0, 0, 1.8)))
    bpy.context.scene.camera = camera

    for name, location, energy, size, color, target in (
        ("QAKey", (-5.5, -6.0, 8.0), 900, 6.0, "#FFD9C9", (0, 0, 1.8)),
        ("QAFill", (6.0, -3.0, 5.5), 600, 5.0, "#CFE4FF", (0, 0, 1.8)),
        ("QARim", (0, 4.0, 7.0), 750, 5.0, "#FFF0CC", (0, 0, 2.0)),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = srgb(color)
        point_at(light, Vector(target))


def main() -> None:
    configure_scene()

    for source_name, label, position in RACERS:
        place_racer(source_name, label, position)
        add_platform(position[0], position[1])
        add_label(label, position[0], position[1] - 0.38)

    add_camera_and_lights()
    scene = bpy.context.scene

    scene.frame_set(8)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(POSTER_PATH)
    bpy.ops.render.render(write_still=True)

    if os.environ.get("ANIMALS_FREE_QA_STILL_ONLY") == "1" or "--still-only" in sys.argv:
        print(f"ANIMALS_FREE_QA_POSTER={POSTER_PATH}")
        return

    if FRAMES_DIR.exists():
        shutil.rmtree(FRAMES_DIR)
    FRAMES_DIR.mkdir(parents=True)
    scene.frame_set(FRAME_START)
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(FRAMES_DIR / "frame_")
    bpy.ops.render.render(animation=True)

    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js is required to assemble the motion QA GIF")
    subprocess.run(
        [
            node,
            str(ROOT / "scripts" / "render_gallop_gif.mjs"),
            str(FRAMES_DIR),
            str(MOTION_PATH),
        ],
        cwd=ROOT,
        check=True,
    )

    print(f"ANIMALS_FREE_QA_POSTER={POSTER_PATH}")
    print(f"ANIMALS_FREE_QA_MOTION={MOTION_PATH}")


main()
