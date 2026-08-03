"""Build the original Dugudugu chibi zodiac racing cast.

Run with Blender 5.x:
  blender -b --python scripts/blender/build_zodiac_animals.py

The twelve animals share one toy-like proportion and material language, but
each has a species-readable silhouette. Geometry, rigging, animation, QA
renders, GLBs, and the lobby card are generated deterministically in Blender.
The web runtime only plays the authored Idle / Run clips with AnimationMixer.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import bpy
from mathutils import Euler, Vector


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "models" / "race" / "zodiac"
HORSE_OUT = ROOT / "public" / "models" / "race" / "horse.glb"
CARD = ROOT / "public" / "images" / "games" / "race.webp"
QA_DIR = Path("/tmp/dugudugu-zodiac-previews")

FPS = 24
RUN_END = 18
IDLE_END = 48
MAX_SPECIES_BYTES = 650_000
MAX_TOTAL_BYTES = 6_000_000
MAX_TRIANGLES = 12_000


@dataclass(frozen=True)
class Species:
    key: str
    stride: float
    suspension: float


SPECIES = (
    Species("rat", 1.20, 0.12),
    Species("ox", 1.58, 0.105),
    Species("tiger", 1.52, 0.14),
    Species("rabbit", 1.34, 0.17),
    Species("dragon", 1.46, 0.15),
    Species("snake", 1.10, 0.11),
    Species("horse", 1.64, 0.16),
    Species("sheep", 1.38, 0.125),
    Species("monkey", 1.28, 0.16),
    Species("rooster", 1.14, 0.18),
    Species("dog", 1.42, 0.145),
    Species("pig", 1.30, 0.13),
)


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def material(
    name: str,
    color: str,
    *,
    roughness: float = 0.78,
    metallic: float = 0.0,
) -> bpy.types.Material:
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.use_nodes = True
    rgb = srgb(color)
    result.diffuse_color = (*rgb, 1.0)
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if "Specular IOR Level" in bsdf.inputs:
            bsdf.inputs["Specular IOR Level"].default_value = 0.24
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = 0.08
            bsdf.inputs["Coat Roughness"].default_value = 0.34
    return result


def apply_transform(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    obj.select_set(False)


def mark_bone(obj: bpy.types.Object, bone: str) -> bpy.types.Object:
    apply_transform(obj)
    group = obj.vertex_groups.new(name=bone)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj["rigPart"] = bone
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def ellipsoid(
    parts: list[bpy.types.Object],
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bone: str,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    segments: int = 18,
    rings: int = 12,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    parts.append(mark_bone(obj, bone))
    return obj


def cone(
    parts: list[bpy.types.Object],
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    bone: str,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=18,
        radius1=radius,
        radius2=radius * 0.14,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    bevel = obj.modifiers.new("SoftTip", "BEVEL")
    bevel.width = min(radius * 0.28, depth * 0.08)
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(mat)
    parts.append(mark_bone(obj, bone))
    return obj


def tube(
    parts: list[bpy.types.Object],
    name: str,
    points: list[tuple[float, float, float]],
    radius: float,
    mat: bpy.types.Material,
    bone: str,
    *,
    resolution: int = 2,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    curve.use_fill_caps = True
    curve.resolution_u = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bezier, point in zip(spline.bezier_points, points, strict=True):
        bezier.co = point
        bezier.handle_left_type = "AUTO"
        bezier.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    parts.append(mark_bone(obj, bone))
    return obj


def add_eye_pair(
    parts: list[bpy.types.Object],
    *,
    x: float = 0.205,
    y: float = 0.985,
    z: float = 1.30,
    size: float = 1.0,
) -> None:
    ink = material("FaceInk", "#302936", roughness=0.42)
    shine = material("EyeShine", "#fffdf4", roughness=0.24)
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Eye{suffix}", (side * x, y, z), (0.115 * size, 0.065, 0.145 * size), ink, "Head")
        ellipsoid(
            parts,
            f"EyeShine{suffix}",
            (side * x - side * 0.028, y + 0.060, z + 0.050 * size),
            (0.035 * size, 0.020, 0.043 * size),
            shine,
            "Head",
            segments=14,
            rings=8,
        )


def add_cheeks(
    parts: list[bpy.types.Object],
    *,
    x: float = 0.34,
    y: float = 0.985,
    z: float = 1.08,
) -> None:
    blush = material("CheekBlush", "#ef9b9d", roughness=0.88)
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Cheek{suffix}", (side * x, y, z), (0.105, 0.028, 0.055), blush, "Head", segments=14, rings=8)


def add_quad_legs(
    parts: list[bpy.types.Object],
    leg_mat: bpy.types.Material,
    paw_mat: bpy.types.Material,
    *,
    rear_scale: float = 1.0,
    hoof: bool = False,
) -> None:
    specs = (
        ("FL", -0.29, 0.31, "LegFL", 1.0),
        ("FR", 0.29, 0.31, "LegFR", 1.0),
        ("BL", -0.30, -0.31, "LegBL", rear_scale),
        ("BR", 0.30, -0.31, "LegBR", rear_scale),
    )
    for suffix, x, y, bone, scale in specs:
        ellipsoid(parts, f"Leg{suffix}", (x, y, 0.34), (0.13 * scale, 0.145, 0.32 * scale), leg_mat, bone)
        ellipsoid(
            parts,
            f"{'Hoof' if hoof else 'Paw'}{suffix}",
            (x, y + 0.075, 0.105),
            (0.16 * scale, 0.215, 0.105),
            paw_mat,
            bone,
            segments=16,
            rings=10,
        )


def base_body(
    parts: list[bpy.types.Object],
    body_mat: bpy.types.Material,
    head_mat: bpy.types.Material | None = None,
    *,
    body_scale: tuple[float, float, float] = (0.47, 0.60, 0.46),
    head_scale: tuple[float, float, float] = (0.50, 0.47, 0.50),
    head_location: tuple[float, float, float] = (0, 0.54, 1.18),
) -> None:
    ellipsoid(parts, "Body", (0, -0.02, 0.78), body_scale, body_mat, "Body")
    ellipsoid(parts, "Head", head_location, head_scale, head_mat or body_mat, "Head")


def build_rat(parts: list[bpy.types.Object]) -> None:
    fur = material("RatFur", "#7d8497")
    belly = material("RatMuzzle", "#e7c7bd")
    pink = material("RatPink", "#d98391")
    base_body(parts, fur, body_scale=(0.42, 0.54, 0.42), head_scale=(0.48, 0.44, 0.47))
    add_quad_legs(parts, fur, pink)
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Ear{suffix}", (side * 0.33, 0.48, 1.55), (0.22, 0.10, 0.24), fur, f"Ear{suffix}")
        ellipsoid(parts, f"EarInner{suffix}", (side * 0.33, 0.57, 1.55), (0.13, 0.035, 0.15), pink, f"Ear{suffix}")
    ellipsoid(parts, "Muzzle", (0, 0.91, 1.10), (0.31, 0.19, 0.22), belly, "Head")
    ellipsoid(parts, "Nose", (0, 1.085, 1.12), (0.085, 0.055, 0.065), pink, "Head")
    for side in (-1, 1):
        for z_offset in (-0.045, 0.035):
            tube(parts, f"Whisker{side}{z_offset}", [(side * 0.08, 1.08, 1.11 + z_offset), (side * 0.40, 1.18, 1.10 + z_offset)], 0.008, belly, "Head", resolution=1)
    tube(parts, "Tail", [(0, -0.48, 0.65), (-0.28, -0.85, 0.48), (-0.50, -0.55, 0.27), (-0.18, -0.35, 0.25)], 0.052, pink, "Tail")
    add_eye_pair(parts, y=0.94, z=1.31, size=0.92)


def build_ox(parts: list[bpy.types.Object]) -> None:
    coat = material("OxCoat", "#ad704b")
    dark = material("OxHoof", "#4a3834")
    muzzle = material("OxMuzzle", "#e7b99a")
    horn = material("OxHorn", "#f2ddad")
    base_body(parts, coat, body_scale=(0.52, 0.66, 0.50), head_scale=(0.54, 0.46, 0.50), head_location=(0, 0.54, 1.18))
    add_quad_legs(parts, coat, dark, hoof=True)
    ellipsoid(parts, "Muzzle", (0, 0.94, 1.09), (0.39, 0.20, 0.24), muzzle, "Head")
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Ear{suffix}", (side * 0.46, 0.52, 1.39), (0.22, 0.10, 0.13), coat, f"Ear{suffix}", rotation=(0, side * 0.15, side * 0.25))
        tube(parts, f"Horn{suffix}", [(side * 0.26, 0.53, 1.53), (side * 0.46, 0.50, 1.70), (side * 0.36, 0.57, 1.82)], 0.055, horn, "Head")
    ellipsoid(parts, "ForeheadMark", (0, 0.96, 1.46), (0.11, 0.035, 0.16), horn, "Head")
    ellipsoid(parts, "Nose", (0, 1.12, 1.10), (0.12, 0.045, 0.055), dark, "Head")
    tube(parts, "Tail", [(0, -0.55, 0.74), (0.05, -0.88, 0.50), (0.12, -0.82, 0.30)], 0.045, coat, "Tail")
    ellipsoid(parts, "TailTuft", (0.12, -0.82, 0.25), (0.10, 0.10, 0.16), dark, "Tail")
    add_eye_pair(parts, y=0.95, z=1.34, size=0.92)


def build_tiger(parts: list[bpy.types.Object]) -> None:
    orange = material("TigerOrange", "#e58b35")
    cream = material("TigerCream", "#f7d397")
    stripe = material("TigerStripe", "#493238")
    base_body(parts, orange, body_scale=(0.48, 0.63, 0.47), head_scale=(0.51, 0.47, 0.50))
    add_quad_legs(parts, orange, cream, rear_scale=1.05)
    ellipsoid(parts, "Muzzle", (0, 0.94, 1.10), (0.34, 0.20, 0.23), cream, "Head")
    for side, suffix in ((-1, "L"), (1, "R")):
        cone(parts, f"Ear{suffix}", (side * 0.32, 0.50, 1.60), 0.19, 0.37, orange, f"Ear{suffix}", rotation=(0, side * 0.12, -side * 0.12))
        for index, y in enumerate((-0.27, 0.03, 0.28)):
            ellipsoid(parts, f"BodyStripe{suffix}{index}", (side * 0.455, y, 0.87), (0.045, 0.11, 0.19), stripe, "Body", rotation=(0, side * 0.32, 0))
    for index, x in enumerate((-0.16, 0, 0.16)):
        ellipsoid(parts, f"ForeheadStripe{index}", (x, 0.985, 1.49 - abs(x) * 0.25), (0.045, 0.025, 0.12), stripe, "Head", rotation=(0, x * 1.4, 0))
    ellipsoid(parts, "Nose", (0, 1.125, 1.12), (0.095, 0.045, 0.065), stripe, "Head")
    tube(parts, "Tail", [(0, -0.54, 0.76), (0.15, -0.92, 0.64), (0.42, -0.88, 0.82)], 0.075, orange, "Tail")
    ellipsoid(parts, "TailTip", (0.43, -0.86, 0.84), (0.11, 0.16, 0.12), stripe, "Tail")
    add_eye_pair(parts, y=0.97, z=1.32)
    add_cheeks(parts)


def build_rabbit(parts: list[bpy.types.Object]) -> None:
    fur = material("RabbitFur", "#eee6d8")
    shade = material("RabbitShade", "#b7a99e")
    pink = material("RabbitPink", "#e69aaa")
    base_body(parts, fur, body_scale=(0.43, 0.56, 0.44), head_scale=(0.50, 0.45, 0.49))
    add_quad_legs(parts, fur, shade, rear_scale=1.22)
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Ear{suffix}", (side * 0.22, 0.48, 1.79), (0.18, 0.11, 0.43), fur, f"Ear{suffix}", rotation=(0, side * 0.10, side * 0.06))
        ellipsoid(parts, f"EarInner{suffix}", (side * 0.22, 0.575, 1.79), (0.09, 0.028, 0.30), pink, f"Ear{suffix}")
    ellipsoid(parts, "Muzzle", (0, 0.93, 1.10), (0.30, 0.18, 0.21), fur, "Head")
    ellipsoid(parts, "Nose", (0, 1.095, 1.13), (0.075, 0.045, 0.055), pink, "Head")
    ellipsoid(parts, "PomTail", (0, -0.61, 0.75), (0.24, 0.22, 0.24), fur, "Tail")
    add_eye_pair(parts, y=0.95, z=1.31)
    add_cheeks(parts, x=0.33, y=0.95)


def build_dragon(parts: list[bpy.types.Object]) -> None:
    jade = material("DragonJade", "#4fa99a")
    belly = material("DragonBelly", "#f3cf72")
    coral = material("DragonCrest", "#d96562")
    horn = material("DragonHorn", "#f1e0b6")
    dark = material("DragonInk", "#285455")
    base_body(parts, jade, body_scale=(0.45, 0.68, 0.43), head_scale=(0.53, 0.50, 0.48), head_location=(0, 0.58, 1.18))
    add_quad_legs(parts, jade, belly, rear_scale=0.95)
    ellipsoid(parts, "LongMuzzle", (0, 1.02, 1.12), (0.38, 0.27, 0.23), belly, "Head")
    for side, suffix in ((-1, "L"), (1, "R")):
        tube(parts, f"Antler{suffix}", [(side * 0.22, 0.50, 1.52), (side * 0.34, 0.45, 1.76), (side * 0.48, 0.51, 1.84)], 0.045, horn, "Head")
        tube(parts, f"Whisker{suffix}", [(side * 0.13, 1.20, 1.10), (side * 0.48, 1.34, 1.16), (side * 0.62, 1.22, 1.34)], 0.018, horn, "Head")
        ellipsoid(parts, f"Brow{suffix}", (side * 0.23, 1.00, 1.46), (0.15, 0.055, 0.075), dark, "Head", rotation=(side * 0.2, 0, side * 0.15))
    for index, y in enumerate((-0.40, -0.10, 0.22)):
        cone(parts, f"BackCrest{index}", (0, y, 1.22), 0.13, 0.30, coral, "Body", rotation=(math.pi, 0, 0))
    for index, x in enumerate((-0.12, 0.12)):
        ellipsoid(parts, f"Nostril{index}", (x, 1.265, 1.16), (0.035, 0.025, 0.028), dark, "Head", segments=12, rings=8)
    tube(parts, "LongTail", [(0, -0.54, 0.76), (-0.24, -0.95, 0.67), (0.20, -1.18, 0.54), (0.46, -0.93, 0.72)], 0.11, jade, "Tail")
    cone(parts, "TailFlame", (0.48, -0.91, 0.78), 0.14, 0.34, coral, "Tail", rotation=(0.65, 0.25, -0.2))
    add_eye_pair(parts, x=0.22, y=1.00, z=1.34, size=1.05)
    add_cheeks(parts, x=0.39, y=1.02, z=1.08)


def build_snake(parts: list[bpy.types.Object]) -> None:
    green = material("SnakeGreen", "#68b678")
    dark = material("SnakeDark", "#347064")
    belly = material("SnakeBelly", "#f0d681")
    tongue = material("SnakeTongue", "#d95d71")
    tube(parts, "SnakeBody", [(0.82, -0.77, 0.17), (0.68, -1.02, 0.20), (0.34, -0.85, 0.23), (-0.38, -0.70, 0.26), (-0.42, -0.24, 0.33), (0.22, -0.04, 0.42), (0.16, 0.38, 0.72)], 0.20, green, "Body")
    ellipsoid(parts, "SnakeTailTip", (.82, -.77, .17), (.20, .24, .18), dark, "Body")
    ellipsoid(parts, "Head", (0, 0.56, 1.14), (0.48, 0.44, 0.46), green, "Head")
    ellipsoid(parts, "BellyPatch", (0, 0.95, 1.05), (0.27, 0.08, 0.24), belly, "Head")
    ellipsoid(parts, "Nose", (0, 1.005, 1.12), (0.16, 0.055, 0.09), green, "Head")
    tube(parts, "Tongue", [(0, 1.04, 1.04), (0, 1.25, 1.00), (-0.06, 1.34, 1.03)], 0.018, tongue, "Head", resolution=1)
    tube(parts, "TongueFork", [(0, 1.25, 1.00), (0.07, 1.34, 0.98)], 0.018, tongue, "Head", resolution=1)
    add_eye_pair(parts, x=0.21, y=0.94, z=1.30, size=1.08)
    add_cheeks(parts, x=0.35, y=0.95, z=1.08)


def build_horse(parts: list[bpy.types.Object]) -> None:
    coat = material("HorseCoat", "#bd734d")
    cream = material("HorseMuzzle", "#edc29d")
    mane = material("HorseMane", "#4c3440")
    hoof = material("HorseHoof", "#3c3137")
    base_body(parts, coat, body_scale=(0.47, 0.69, 0.47), head_scale=(0.45, 0.52, 0.48), head_location=(0, 0.58, 1.22))
    add_quad_legs(parts, coat, hoof, rear_scale=1.04, hoof=True)
    ellipsoid(parts, "Muzzle", (0, 1.03, 1.11), (0.31, 0.27, 0.22), cream, "Head")
    for side, suffix in ((-1, "L"), (1, "R")):
        cone(parts, f"Ear{suffix}", (side * 0.22, 0.50, 1.69), 0.15, 0.34, coat, f"Ear{suffix}")
    for index, y in enumerate((0.43, 0.24, 0.04, -0.16, -0.36)):
        ellipsoid(parts, f"Mane{index}", (-0.02, y, 1.41 - index * 0.07), (0.13, 0.15, 0.20), mane, "Head" if index < 2 else "Body")
    ellipsoid(parts, "Forelock", (0, 0.58, 1.57), (0.16, 0.14, 0.24), mane, "Head", rotation=(0.28, 0, 0))
    ellipsoid(parts, "Nose", (0, 1.28, 1.12), (0.09, 0.04, 0.05), hoof, "Head")
    tube(parts, "Tail", [(0, -0.60, 0.83), (0.05, -0.93, 0.62), (-0.15, -1.01, 0.34)], 0.12, mane, "Tail")
    add_eye_pair(parts, y=1.02, z=1.37, size=0.94)


def build_sheep(parts: list[bpy.types.Object]) -> None:
    wool = material("SheepWool", "#f3ead8")
    wool_shadow = material("SheepWoolShadow", "#d7cdbd")
    face = material("SheepFace", "#665557")
    horn = material("SheepHorn", "#c69b69")
    ellipsoid(parts, "BodyCore", (0, -0.04, 0.78), (0.43, 0.58, 0.42), wool_shadow, "Body")
    for index, (x, y, z, s) in enumerate(((-0.25,-0.22,0.90,.31),(0.23,-0.24,.90,.32),(-.27,.18,.87,.30),(.26,.18,.88,.31),(0,-.04,1.05,.34),(0,-.38,.76,.31),(0,.31,.78,.29))):
        ellipsoid(parts, f"Wool{index}", (x, y, z), (s, s * 1.05, s), wool, "Body", segments=16, rings=10)
    ellipsoid(parts, "Head", (0, 0.59, 1.16), (0.43, 0.43, 0.47), face, "Head")
    add_quad_legs(parts, face, face, hoof=True)
    for side, suffix in ((-1, "L"), (1, "R")):
        ellipsoid(parts, f"Ear{suffix}", (side * 0.39, 0.55, 1.32), (0.19, 0.09, 0.11), face, f"Ear{suffix}")
        tube(parts, f"Horn{suffix}", [(side * .26,.52,1.45),(side*.43,.47,1.52),(side*.40,.55,1.35)], .045, horn, "Head")
    ellipsoid(parts, "WoolCap", (0, 0.52, 1.52), (0.31, 0.27, 0.20), wool, "Head")
    ellipsoid(parts, "Muzzle", (0, 0.96, 1.08), (0.25, 0.15, 0.18), face, "Head")
    add_eye_pair(parts, x=.19, y=.94, z=1.29, size=.9)


def build_monkey(parts: list[bpy.types.Object]) -> None:
    fur = material("MonkeyFur", "#8d593f")
    face = material("MonkeyFace", "#e5b67d")
    dark = material("MonkeyInk", "#3c2e32")
    base_body(parts, fur, body_scale=(.44,.55,.44), head_scale=(.52,.46,.50))
    add_quad_legs(parts, fur, dark, rear_scale=1.05)
    for side, suffix in ((-1,"L"),(1,"R")):
        ellipsoid(parts, f"Ear{suffix}", (side*.47,.52,1.28), (.23,.10,.25), fur, f"Ear{suffix}")
        ellipsoid(parts, f"EarInner{suffix}", (side*.47,.61,1.28), (.13,.035,.15), face, f"Ear{suffix}")
        ellipsoid(parts, f"FacePatch{suffix}", (side*.15,.95,1.27), (.25,.07,.30), face, "Head")
    ellipsoid(parts, "Muzzle", (0,.98,1.08), (.28,.18,.20), face, "Head")
    ellipsoid(parts, "Nose", (0,1.145,1.12), (.08,.04,.05), dark, "Head")
    tube(parts, "CurlTail", [(0,-.52,.76),(.35,-.90,.73),(.55,-.68,.98),(.34,-.51,.86)], .065, fur, "Tail")
    add_eye_pair(parts, y=.97,z=1.34,size=.95)
    add_cheeks(parts,x=.35,y=.96)


def build_rooster(parts: list[bpy.types.Object]) -> None:
    cream = material("RoosterBody", "#f1c66f")
    wing = material("RoosterWing", "#d9904e")
    red = material("RoosterComb", "#dd5d64")
    beak = material("RoosterBeak", "#f09b3f")
    tail = material("RoosterTail", "#3f7f78")
    dark = material("RoosterLeg", "#8f5a3b")
    ellipsoid(parts, "Body", (0,-.03,.76), (.49,.57,.54), cream, "Body")
    ellipsoid(parts, "Head", (0,.48,1.22), (.43,.41,.44), cream, "Head")
    for side, suffix in ((-1,"L"),(1,"R")):
        bone = "LegFL" if side < 0 else "LegFR"
        ellipsoid(parts, f"Leg{suffix}", (side*.23,.08,.32), (.10,.11,.32), dark, bone)
        ellipsoid(parts, f"Foot{suffix}", (side*.23,.18,.09), (.15,.22,.08), beak, bone)
        ellipsoid(parts, f"Wing{suffix}", (side*.43,-.02,.79), (.20,.38,.35), wing, f"Wing{suffix}", rotation=(0,side*.18,side*.20))
    for index, x in enumerate((-.14,0,.14)):
        ellipsoid(parts, f"Comb{index}", (x,.44,1.64 + (1-abs(index-1))*.06), (.12,.10,.20), red, "Head")
    cone(parts, "Beak", (0,.89,1.18), .16, .34, beak, "Head", rotation=(-math.pi/2,0,0))
    ellipsoid(parts, "Wattle", (0,.78,1.00), (.12,.10,.16), red, "Head")
    for index, (x, rot) in enumerate(((-.18,-.28),(0,0),(.18,.28))):
        ellipsoid(parts, f"TailFeather{index}", (x,-.61,.91), (.13,.20,.48), tail, "Tail", rotation=(rot,0,-rot))
    add_eye_pair(parts,x=.18,y=.86,z=1.35,size=.82)


def build_dog(parts: list[bpy.types.Object]) -> None:
    coat = material("DogCoat", "#d79a57")
    cream = material("DogCream", "#f4d7ad")
    dark = material("DogInk", "#49363a")
    base_body(parts, coat, body_scale=(.46,.60,.45), head_scale=(.51,.46,.49))
    add_quad_legs(parts, coat, cream, rear_scale=1.04)
    ellipsoid(parts,"Muzzle",(0,.95,1.10),(.34,.20,.23),cream,"Head")
    for side,suffix in ((-1,"L"),(1,"R")):
        ellipsoid(parts,f"Ear{suffix}",(side*.38,.49,1.45),(.20,.12,.30),dark,f"Ear{suffix}",rotation=(0,side*.15,side*.38))
    ellipsoid(parts,"EyePatch",(-.21,.965,1.34),(.16,.035,.19),dark,"Head",rotation=(0,0,-.15))
    ellipsoid(parts,"Nose",(0,1.13,1.13),(.10,.045,.065),dark,"Head")
    tube(parts,"CurlTail",[(0,-.55,.78),(.30,-.87,.86),(.48,-.65,1.08),(.27,-.51,.96)],.075,coat,"Tail")
    add_eye_pair(parts,y=.97,z=1.34,size=.96)
    add_cheeks(parts,x=.35,y=.96)


def build_pig(parts: list[bpy.types.Object]) -> None:
    pink = material("PigPink", "#e49391")
    light = material("PigSnout", "#f2b1a7")
    dark = material("PigInk", "#6e4a55")
    base_body(parts,pink,body_scale=(.51,.62,.48),head_scale=(.51,.46,.48))
    add_quad_legs(parts,pink,dark,rear_scale=1.02,hoof=True)
    for side,suffix in ((-1,"L"),(1,"R")):
        ellipsoid(parts,f"Ear{suffix}",(side*.32,.48,1.57),(.19,.11,.25),pink,f"Ear{suffix}",rotation=(0,side*.18,side*.22))
    ellipsoid(parts,"Snout",(0,1.00,1.10),(.31,.16,.22),light,"Head")
    for side in (-1,1):
        ellipsoid(parts,f"Nostril{side}",(side*.10,1.145,1.12),(.035,.025,.045),dark,"Head",segments=12,rings=8)
    tube(parts,"CurlyTail",[(0,-.55,.79),(.28,-.77,.84),(.34,-.62,1.00),(.19,-.56,.88)],.045,pink,"Tail")
    add_eye_pair(parts,y=.96,z=1.34,size=.94)
    add_cheeks(parts,x=.36,y=.96)


BUILDERS = {
    "rat": build_rat,
    "ox": build_ox,
    "tiger": build_tiger,
    "rabbit": build_rabbit,
    "dragon": build_dragon,
    "snake": build_snake,
    "horse": build_horse,
    "sheep": build_sheep,
    "monkey": build_monkey,
    "rooster": build_rooster,
    "dog": build_dog,
    "pig": build_pig,
}


def create_rig(species: Species) -> bpy.types.Object:
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    rig = bpy.context.object
    rig.name = f"{species.key.title()}ToyRig"
    armature = rig.data
    armature.name = rig.name
    armature.edit_bones.remove(armature.edit_bones[0])

    def add(name: str, head: tuple[float,float,float], parent: str | None = None) -> None:
        bone = armature.edit_bones.new(name)
        bone.head = head
        bone.tail = Vector(head) + Vector((0, 0, .18))
        if parent:
            bone.parent = armature.edit_bones[parent]

    add("Root", (0,0,.05))
    body_pivot = (0,.10,.45) if species.key == "snake" else (0,-.02,.78)
    head_pivot = (0,.48,1.12) if species.key == "snake" else (0,.52,1.17)
    tail_pivot = (.34,-.85,.23) if species.key == "snake" else (0,-.50,.77)
    add("Body", body_pivot, "Root")
    add("Head", head_pivot, "Body")
    add("LegFL", (-.29,.30,.62), "Body")
    add("LegFR", (.29,.30,.62), "Body")
    add("LegBL", (-.30,-.30,.62), "Body")
    add("LegBR", (.30,-.30,.62), "Body")
    add("Tail", tail_pivot, "Body")
    add("EarL", (-.25,.49,1.50), "Head")
    add("EarR", (.25,.49,1.50), "Head")
    add("WingL", (-.34,0,.82), "Body")
    add("WingR", (.34,0,.82), "Body")
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["species"] = species.key
    rig["strideLength"] = species.stride
    return rig


def join_and_skin(parts: list[bpy.types.Object], rig: bpy.types.Object, species: Species) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    mesh = bpy.context.object
    mesh.name = f"{species.key.title()}ToyMesh"
    mesh.data.name = mesh.name
    modifier = mesh.modifiers.new("ToyRig", "ARMATURE")
    modifier.object = rig
    modifier.use_deform_preserve_volume = True
    mesh.parent = rig
    mesh["strideLength"] = species.stride
    mesh["species"] = species.key
    return mesh


def reset_pose(rig: bpy.types.Object) -> None:
    rig.location = (0,0,0)
    rig.rotation_mode = "XYZ"
    rig.rotation_euler = (0,0,0)
    rig.scale = (1,1,1)
    for bone in rig.pose.bones:
        bone.location = (0,0,0)
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = (1,0,0,0)
        bone.scale = (1,1,1)


def rotate_bone(rig: bpy.types.Object, name: str, *, x: float = 0, y: float = 0, z: float = 0) -> None:
    rig.pose.bones[name].rotation_quaternion = Euler(tuple(math.radians(v) for v in (x,y,z)), "XYZ").to_quaternion()


def key_pose(rig: bpy.types.Object, frame: int) -> None:
    rig.keyframe_insert("location", frame=frame)
    rig.keyframe_insert("rotation_euler", frame=frame)
    rig.keyframe_insert("scale", frame=frame)
    for bone in rig.pose.bones:
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)


def author_idle(rig: bpy.types.Object, species: Species) -> bpy.types.Action:
    action = bpy.data.actions.new("Idle")
    rig.animation_data_create()
    rig.animation_data.action = action
    for frame, lift, head_tilt, ear_tilt in ((0,0,0,0),(24,.018,2.2,3.2),(48,0,0,0)):
        reset_pose(rig)
        rig.location.z = lift
        rig.scale = (1 + lift*.10, 1 - lift*.05, 1 + lift*.16)
        rotate_bone(rig,"Head",x=head_tilt,z=head_tilt*.22)
        rotate_bone(rig,"EarL",x=-ear_tilt,z=-ear_tilt*.35)
        rotate_bone(rig,"EarR",x=ear_tilt,z=ear_tilt*.35)
        rotate_bone(rig,"Tail",x=-head_tilt*.8,z=head_tilt*1.4)
        if species.key == "snake":
            rotate_bone(rig,"Body",z=head_tilt*1.6)
            rotate_bone(rig,"Tail",z=-head_tilt*2.4)
        key_pose(rig,frame)
    action.use_frame_range = True
    action.frame_start = 0
    action.frame_end = IDLE_END
    return action


RUN_POSES = (
    # frame, lift, pitch, squash, FL, FR, BL, BR, tail
    (0, 0.000, -2.0, 0.00, 42, -28, -36, 34, -10),
    (3, -0.035, 4.5, 0.055, 14, -6, -10, 18, 8),
    (6, 1.000, -6.0, -0.018, -30, -43, 38, 16, 18),
    (9, 0.005, -2.5, 0.00, -31, 43, 35, -37, 10),
    (12, -0.030, 4.0, 0.050, -7, 15, 14, -9, -8),
    (15, 0.82, -5.5, -0.014, -42, -25, 14, 38, -18),
    (18, 0.000, -2.0, 0.00, 42, -28, -36, 34, -10),
)


def author_run(rig: bpy.types.Object, species: Species) -> bpy.types.Action:
    action = bpy.data.actions.new("Run")
    rig.animation_data.action = action
    if species.key == "snake":
        snake_poses = ((0,0,8,-13,-5),(3,.03,1,7,3),(6,.10,-9,15,6),(9,.01,-8,13,5),(12,.025,0,-7,-3),(15,.085,9,-15,-6),(18,0,8,-13,-5))
        for frame,lift,body_yaw,head_yaw,tail_yaw in snake_poses:
            reset_pose(rig)
            rig.location.z = lift
            rig.rotation_euler.x = math.radians(-4 if lift > .05 else 1)
            rotate_bone(rig,"Body",z=body_yaw)
            rotate_bone(rig,"Head",x=-body_yaw*.22,z=head_yaw)
            rotate_bone(rig,"Tail",z=tail_yaw)
            key_pose(rig,frame)
    else:
        for frame,lift_unit,pitch,squash,fl,fr,bl,br,tail in RUN_POSES:
            reset_pose(rig)
            lift = lift_unit * species.suspension if lift_unit > .2 else lift_unit
            rig.location.z = lift
            rig.location.y = -.026 if lift > .05 else .012
            rig.rotation_euler.x = math.radians(pitch)
            rig.scale = (1 + squash*.22, 1 - squash*.12, 1 - squash)
            for name, angle in (("LegFL",fl),("LegFR",fr),("LegBL",bl),("LegBR",br)):
                rotate_bone(rig,name,x=angle)
            rotate_bone(rig,"Head",x=-pitch*.62,z=(2.0 if frame in (6,15) else 0))
            rotate_bone(rig,"Tail",x=tail,z=-tail*.42)
            rotate_bone(rig,"EarL",x=-pitch*.45,z=-tail*.10)
            rotate_bone(rig,"EarR",x=pitch*.35,z=tail*.10)
            if species.key == "rabbit":
                rotate_bone(rig,"EarL",x=-pitch*1.8,z=-tail*.18)
                rotate_bone(rig,"EarR",x=-pitch*1.55,z=tail*.18)
            if species.key == "rooster":
                rotate_bone(rig,"WingL",x=-abs(pitch)*2.0,z=-32 if lift > .05 else -12)
                rotate_bone(rig,"WingR",x=abs(pitch)*2.0,z=32 if lift > .05 else 12)
                # Only the visible two authored leg bones drive the rooster.
                rotate_bone(rig,"LegFL",x=fl*1.12)
                rotate_bone(rig,"LegFR",x=fr*1.12)
            key_pose(rig,frame)
    action.use_frame_range = True
    action.frame_start = 0
    action.frame_end = RUN_END
    action["strideLength"] = species.stride
    return action


def iter_action_curves(action: bpy.types.Action):
    legacy = getattr(action, "fcurves", None)
    if legacy is not None:
        yield from legacy
        return
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


def finish_actions(rig: bpy.types.Object, species: Species) -> None:
    idle = author_idle(rig,species)
    run = author_run(rig,species)
    for action in (idle,run):
        action.use_fake_user = True
        for curve in iter_action_curves(action):
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"
                point.handle_left_type = "AUTO_CLAMPED"
                point.handle_right_type = "AUTO_CLAMPED"
            curve.update()
    rig.animation_data.action = idle


def action_sample(rig: bpy.types.Object, action: bpy.types.Action, frame: int) -> dict[str, tuple]:
    rig.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    result = {"__rig__": (tuple(rig.location), tuple(rig.rotation_euler), tuple(rig.scale))}
    for bone in rig.pose.bones:
        result[bone.name] = (tuple(bone.location), tuple(bone.rotation_quaternion), tuple(bone.scale))
    return result


def validate(rig: bpy.types.Object, mesh: bpy.types.Object, species: Species) -> int:
    if {action.name for action in bpy.data.actions} != {"Idle","Run"}:
        raise RuntimeError(f"{species.key}: expected Idle/Run, got {[a.name for a in bpy.data.actions]}")
    run = bpy.data.actions["Run"]
    start = action_sample(rig,run,0)
    end = action_sample(rig,run,RUN_END)
    if start.keys() != end.keys():
        raise RuntimeError(f"{species.key}: Run track mismatch")
    max_error = 0.0
    for key in start:
        for a,b in zip(start[key],end[key],strict=True):
            max_error = max(max_error,max(abs(x-y) for x,y in zip(a,b,strict=True)))
    if max_error > 1e-5:
        raise RuntimeError(f"{species.key}: open Run seam {max_error}")
    mesh.data.calc_loop_triangles()
    triangles = len(mesh.data.loop_triangles)
    if triangles > MAX_TRIANGLES:
        raise RuntimeError(f"{species.key}: {triangles} triangles exceed {MAX_TRIANGLES}")
    return triangles


def export_glb(rig: bpy.types.Object, mesh: bpy.types.Object, species: Species) -> Path:
    OUT_DIR.mkdir(parents=True,exist_ok=True)
    output = HORSE_OUT if species.key == "horse" else OUT_DIR / f"{species.key}.glb"
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_merge_animation="ACTION",
        export_force_sampling=True,
        export_frame_step=1,
        export_optimize_animation_size=True,
        export_anim_single_armature=True,
        export_skins=True,
        export_all_influences=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    if output.stat().st_size > MAX_SPECIES_BYTES:
        raise RuntimeError(f"{species.key}: {output.stat().st_size} bytes exceed budget")
    return output


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z","Y").to_euler()


def setup_render(width: int, height: int, filepath: Path) -> None:
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.render.resolution_x = width
    bpy.context.scene.render.resolution_y = height
    bpy.context.scene.render.resolution_percentage = 100
    bpy.context.scene.render.image_settings.file_format = "PNG" if filepath.suffix == ".png" else "WEBP"
    bpy.context.scene.render.image_settings.color_mode = "RGBA"
    if filepath.suffix == ".webp":
        bpy.context.scene.render.image_settings.quality = 90
    bpy.context.scene.render.film_transparent = False
    world = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (*srgb("#eaf4f4"),1)
        background.inputs["Strength"].default_value = .72
    bpy.context.scene.world = world
    try:
        bpy.context.scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        bpy.context.scene.view_settings.look = "Medium High Contrast"
    filepath.parent.mkdir(parents=True,exist_ok=True)
    bpy.context.scene.render.filepath = str(filepath)


def render_preview(rig: bpy.types.Object, species: Species) -> None:
    floor_mat = material("PreviewFloor","#d9c098",roughness=.94)
    bpy.ops.mesh.primitive_plane_add(size=12,location=(0,0,-.015))
    bpy.context.object.data.materials.append(floor_mat)
    bpy.ops.object.light_add(type="AREA",location=(3.6,4.8,6.4))
    key = bpy.context.object
    key.data.energy = 520
    key.data.shape = "DISK"
    key.data.size = 4.2
    point_at(key,Vector((0,.15,.85)))
    bpy.ops.object.light_add(type="AREA",location=(-3.8,1.2,3.6))
    fill = bpy.context.object
    fill.data.energy = 230
    fill.data.color = (.55,.76,1.0)
    fill.data.size = 3.5
    point_at(fill,Vector((0,.2,.85)))
    bpy.ops.object.camera_add(location=(3.25,5.5,2.65))
    camera = bpy.context.object
    point_at(camera,Vector((0,.05,.85)))
    camera.data.lens = 58
    bpy.context.scene.camera = camera
    rig.animation_data.action = bpy.data.actions["Run"]
    bpy.context.scene.frame_set(6)
    setup_render(460,460,QA_DIR/f"{species.key}.png")
    bpy.ops.render.render(write_still=True)


def build_one(species: Species) -> Path:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = FPS
    parts: list[bpy.types.Object] = []
    BUILDERS[species.key](parts)
    rig = create_rig(species)
    mesh = join_and_skin(parts,rig,species)
    finish_actions(rig,species)
    triangles = validate(rig,mesh,species)
    output = export_glb(rig,mesh,species)
    render_preview(rig,species)
    print(f"Built {species.key}: {output.stat().st_size} bytes, {triangles} triangles")
    return output


def render_race_card(outputs: list[Path]) -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    by_key = {path.stem:path for path in outputs}
    by_key["horse"] = HORSE_OUT
    placements = {
        "rat": (-2.30,.28,0), "ox": (-1.40,.64,0), "tiger": (-.47,.22,0),
        "rabbit": (.48,.62,0), "dragon": (1.43,.18,0), "snake": (2.32,.58,0),
    }
    for index,(key,location) in enumerate(placements.items()):
        before = set(bpy.context.scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(by_key[key]))
        imported = set(bpy.context.scene.objects)-before
        root = bpy.data.objects.new(f"Card{key.title()}",None)
        bpy.context.scene.collection.objects.link(root)
        for obj in imported:
            if obj.parent is None:
                world = obj.matrix_world.copy()
                obj.parent = root
                obj.matrix_world = world
        root.location = location
        root.rotation_euler.z = math.radians((index-2.5)*-2.0)
    grass = material("CardGrass","#96d6ae",roughness=.94)
    dirt = material("CardTrack","#dfb47f",roughness=.94)
    cream = material("CardCream","#fff5dd",roughness=.86)
    bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.06))
    bpy.context.object.data.materials.append(grass)
    bpy.ops.mesh.primitive_cube_add(location=(0,.38,-.03),scale=(4.4,3.0,.05))
    bpy.context.object.data.materials.append(dirt)
    for x in (-1.55,0,1.55):
        bpy.ops.mesh.primitive_cube_add(location=(x,.38,.04),scale=(.025,2.7,.012))
        bpy.context.object.data.materials.append(cream)
    bpy.ops.object.light_add(type="AREA",location=(4.5,5.8,7.6))
    key_light=bpy.context.object
    key_light.data.energy=680
    key_light.data.shape="DISK"
    key_light.data.size=5.4
    point_at(key_light,Vector((0,.35,.8)))
    bpy.ops.object.light_add(type="AREA",location=(-4,1,4))
    fill=bpy.context.object
    fill.data.energy=280
    fill.data.color=(.60,.80,1)
    fill.data.size=4.5
    point_at(fill,Vector((0,.2,.75)))
    bpy.ops.object.camera_add(location=(4.9,8.9,4.2))
    camera=bpy.context.object
    point_at(camera,Vector((0,.25,.78)))
    camera.data.lens=59
    bpy.context.scene.camera=camera
    setup_render(640,480,CARD)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered race card: {CARD}")


def main() -> None:
    QA_DIR.mkdir(parents=True,exist_ok=True)
    outputs=[build_one(species) for species in SPECIES]
    total=sum(path.stat().st_size for path in outputs)
    if total>MAX_TOTAL_BYTES:
        raise RuntimeError(f"Zodiac route assets exceed budget: {total} bytes")
    render_race_card(outputs)
    print(f"Built {len(outputs)} original chibi animals: {total} bytes total")


if __name__ == "__main__":
    main()
