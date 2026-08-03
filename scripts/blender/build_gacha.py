"""Build the authored Dugudugu gacha-machine GLB.

Run with:
  blender -b --python scripts/blender/build_gacha.py

The script intentionally uses no downloaded textures. The web asset is small,
deterministic, and keeps stable object names that the R3F cutscene animates.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "models" / "draw" / "gacha-machine.glb"
PREVIEW = Path("/tmp/dugudugu-gacha-preview.png")
CAPSULE_PREVIEW = Path("/tmp/dugudugu-capsule-closeup.png")
CAPSULE_OPEN_PREVIEW = Path("/tmp/dugudugu-capsule-open-closeup.png")
CARD_IMAGE = ROOT / "public" / "images" / "games" / "draw.webp"

ASSET_OBJECTS: list[bpy.types.Object] = []


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def remember(obj: bpy.types.Object) -> bpy.types.Object:
    ASSET_OBJECTS.append(obj)
    return obj


def material(
    name: str,
    color: str,
    *,
    roughness: float = 0.42,
    metallic: float = 0.0,
    alpha: float = 1.0,
    emission: float = 0.0,
    coat: float = 0.35,
    coat_roughness: float = 0.25,
) -> bpy.types.Material:
    value = color.removeprefix("#")
    srgb = tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))
    # Blender's socket values are scene-linear while hex art-direction values
    # are sRGB. Feeding the bytes directly into the socket washed the approved
    # orange/aqua contrast into pale peach in glTF. Convert explicitly so the
    # web render matches the authored palette instead of compensating with
    # darker arbitrary hex codes.
    rgb = tuple(
        channel / 12.92
        if channel <= 0.04045
        else ((channel + 0.055) / 1.055) ** 2.4
        for channel in srgb
    )
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = coat_roughness
    if emission > 0:
        emission_key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[emission_key].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.diffuse_color = (*rgb, alpha)
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "DITHERED"
        mat.use_transparency_overlap = False
    return mat


CREAM = material("Dugu_Cream", "#fff8ef", roughness=0.43, coat=0.48, coat_roughness=0.2)
CREAM_MATTE = material("Dugu_CreamMatte", "#f7eadc", roughness=0.7, coat=0.08)
PINK = material("Dugu_Pink", "#ef7aa8", roughness=0.36, coat=0.38, coat_roughness=0.2)
PINK_DARK = material("Dugu_PinkDark", "#bf4f7b", roughness=0.42, coat=0.2)
PINK_LIGHT = material("Dugu_PinkLight", "#f7c6d8", roughness=0.5, coat=0.24, coat_roughness=0.24)
CORAL = material("Dugu_Coral", "#ff8266", roughness=0.34)
MINT = material("Dugu_Mint", "#55d8b0", roughness=0.36)
SKY = material("Dugu_Sky", "#65bdff", roughness=0.34)
LEMON = material("Dugu_Lemon", "#ffd052", roughness=0.33)
GRAPE = material("Dugu_Grape", "#9b7af1", roughness=0.36)
INK = material("Dugu_Ink", "#30263a", roughness=0.5)
INK_GLOSS = material("Dugu_InkGloss", "#241c30", roughness=0.2, coat=0.72, coat_roughness=0.12)
GOLD = material("Dugu_Gold", "#efbd55", roughness=0.46, metallic=0.04, coat=0.2, coat_roughness=0.24)
SILVER = material("Dugu_Silver", "#d8d7e5", roughness=0.38, metallic=0.18, coat=0.3, coat_roughness=0.2)
GLASS = material("Dugu_FakeGlass", "#dff7ff", roughness=0.1, alpha=0.16, coat=0.76, coat_roughness=0.08)
CAPSULE_GLASS_PINK = material(
    "Dugu_CapsuleGlassPink", "#ffb8d2", roughness=0.16, alpha=0.46, coat=0.78, coat_roughness=0.08
)
CAPSULE_GLASS_SKY = material(
    "Dugu_CapsuleGlassSky", "#a6ddff", roughness=0.16, alpha=0.46, coat=0.78, coat_roughness=0.08
)
CAPSULE_GLASS_LEMON = material(
    "Dugu_CapsuleGlassLemon", "#ffe69a", roughness=0.17, alpha=0.46, coat=0.76, coat_roughness=0.09
)
CAPSULE_GLASS_MINT = material(
    "Dugu_CapsuleGlassMint", "#a6efd7", roughness=0.16, alpha=0.46, coat=0.78, coat_roughness=0.08
)
CAPSULE_GLASS_GRAPE = material(
    "Dugu_CapsuleGlassGrape", "#d3baff", roughness=0.16, alpha=0.46, coat=0.78, coat_roughness=0.08
)
CAPSULE_GLASS_CORAL = material(
    "Dugu_CapsuleGlassCoral", "#ffc0b1", roughness=0.16, alpha=0.46, coat=0.78, coat_roughness=0.08
)
GLOW = material("Dugu_Glow", "#fff1a8", roughness=0.2, emission=1.65, coat=0.5, coat_roughness=0.12)
GLOW_PINK = material("Dugu_GlowPink", "#ff84bd", roughness=0.2, emission=1.25, coat=0.5, coat_roughness=0.12)
ORANGE = material("Dugu_Orange", "#ff6b5f", roughness=0.58, coat=0.1, coat_roughness=0.42)
ORANGE_LIGHT = material("Dugu_OrangeLight", "#ff9f78", roughness=0.52, coat=0.1, coat_roughness=0.38)
ORANGE_DARK = material("Dugu_OrangeDark", "#d74645", roughness=0.62, coat=0.06, coat_roughness=0.46)
BROWN = material("Dugu_Brown", "#5f2d20", roughness=0.7, coat=0.04)
BROWN_DARK = material("Dugu_BrownDark", "#351a17", roughness=0.76, coat=0.02)
AQUA_BACK = material("Dugu_AquaBack", "#e2faf7", roughness=0.82, coat=0.02)
AQUA_EDGE = material("Dugu_AquaEdge", "#69d9d4", roughness=0.52, coat=0.12, coat_roughness=0.36)


def parent(obj: bpy.types.Object, target: bpy.types.Object) -> bpy.types.Object:
    obj.parent = target
    return obj


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 3) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.select_set(False)


def rounded_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float = 0.12,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = remember(bpy.context.object)
    obj.name = name
    obj.scale = tuple(v / 2 for v in scale)
    apply_bevel(obj, min(bevel, min(scale) * 0.28))
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    segments: int = 32,
    rings: int = 20,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
    )
    obj = remember(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 32,
    bevel: float = 0.035,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = remember(bpy.context.object)
    obj.name = name
    if bevel:
        apply_bevel(obj, bevel, 2)
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=48,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = remember(bpy.context.object)
    obj.name = name
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def tube_curve(
    name: str,
    points: tuple[tuple[float, float, float], ...],
    radius: float,
    mat: bpy.types.Material,
    *,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(f"{name}Curve", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 8
    curve_data.bevel_depth = radius
    curve_data.bevel_resolution = 3
    spline = curve_data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for handle, point in zip(spline.bezier_points, points, strict=True):
        handle.co = point
        handle.handle_left_type = "AUTO"
        handle.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    obj = remember(bpy.context.object)
    obj.name = name
    if parent_to:
        parent(obj, parent_to)
    obj.select_set(False)
    return obj


def star_prism(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    points: list[tuple[float, float]] = []
    for i in range(10):
        angle = math.pi / 2 + i * math.pi / 5
        r = radius if i % 2 == 0 else radius * 0.46
        points.append((math.cos(angle) * r, math.sin(angle) * r))
    vertices = [(x, -depth / 2, z) for x, z in points] + [
        (x, depth / 2, z) for x, z in points
    ]
    faces: list[tuple[int, ...]] = []
    faces.append(tuple(range(9, -1, -1)))
    faces.append(tuple(range(10, 20)))
    for i in range(10):
        j = (i + 1) % 10
        faces.append((i, j, 10 + j, 10 + i))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = remember(bpy.data.objects.new(name, mesh))
    bpy.context.collection.objects.link(obj)
    obj.location = location
    apply_bevel(obj, depth * 0.28, 2)
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def heart_prism(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Small beveled heart badge facing the machine's front (-Y)."""
    points: list[tuple[float, float]] = []
    for i in range(32):
        t = (2 * math.pi * i) / 32
        x = 16 * math.sin(t) ** 3
        z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        points.append((x * radius / 17, z * radius / 17))
    vertices = [(x, -depth / 2, z) for x, z in points] + [
        (x, depth / 2, z) for x, z in points
    ]
    faces: list[tuple[int, ...]] = [
        tuple(range(31, -1, -1)),
        tuple(range(32, 64)),
    ]
    for i in range(32):
        j = (i + 1) % 32
        faces.append((i, j, 32 + j, 32 + i))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = remember(bpy.data.objects.new(name, mesh))
    bpy.context.collection.objects.link(obj)
    obj.location = location
    apply_bevel(obj, depth * 0.3, 2)
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def mini_animal_toy(
    name: str,
    scale: float,
    mat: bpy.types.Material,
    *,
    kind: str,
    parent_to: bpy.types.Object,
) -> bpy.types.Object:
    """Build one grounded capsule-toy silhouette with a stable root name."""
    toy = remember(bpy.data.objects.new(name, None))
    bpy.context.collection.objects.link(toy)
    parent(toy, parent_to)

    sphere(
        f"{name}_Body",
        (0, -0.015 * scale, -0.145 * scale),
        (0.105 * scale, 0.068 * scale, 0.12 * scale),
        mat,
        segments=20,
        rings=14,
        parent_to=toy,
    )
    sphere(
        f"{name}_Head",
        (0, -0.02 * scale, 0.015 * scale),
        (0.135 * scale, 0.074 * scale, 0.13 * scale),
        mat,
        segments=24,
        rings=16,
        parent_to=toy,
    )
    if kind == "bunny":
        for side in (-1, 1):
            sphere(
                f"{name}_Ear_{side}",
                (side * 0.066 * scale, -0.018 * scale, 0.145 * scale),
                (0.035 * scale, 0.045 * scale, 0.105 * scale),
                mat,
                segments=16,
                rings=12,
                parent_to=toy,
            )
    else:
        for side in (-1, 1):
            sphere(
                f"{name}_Ear_{side}",
                (side * 0.092 * scale, -0.018 * scale, 0.098 * scale),
                (0.046 * scale, 0.042 * scale, 0.048 * scale),
                mat,
                segments=16,
                rings=12,
                parent_to=toy,
            )
    sphere(
        f"{name}_Muzzle",
        (0, -0.084 * scale, -0.005 * scale),
        (0.061 * scale, 0.022 * scale, 0.046 * scale),
        CREAM_MATTE,
        segments=16,
        rings=12,
        parent_to=toy,
    )
    for side in (-1, 1):
        sphere(
            f"{name}_Eye_{side}",
            (side * 0.046 * scale, -0.089 * scale, 0.045 * scale),
            (0.012 * scale, 0.009 * scale, 0.016 * scale),
            INK,
            segments=12,
            rings=8,
            parent_to=toy,
        )
    sphere(
        f"{name}_Nose",
        (0, -0.109 * scale, 0.005 * scale),
        (0.015 * scale, 0.008 * scale, 0.012 * scale),
        BROWN_DARK,
        segments=12,
        rings=8,
        parent_to=toy,
    )

    # The chamber inventory only needs a clean face at mobile size, but the
    # dispensed hero is held on screen and then enlarged for the reveal. Give
    # that one figure a complete toy silhouette without multiplying the draw
    # calls of all twelve background capsules.
    if name == "PrizeToy":
        sphere(
            f"{name}_Belly",
            (0, -0.089 * scale, -0.135 * scale),
            (0.063 * scale, 0.02 * scale, 0.073 * scale),
            CREAM_MATTE,
            segments=18,
            rings=12,
            parent_to=toy,
        )
        for side in (-1, 1):
            sphere(
                f"{name}_Arm_{side}",
                (side * 0.105 * scale, -0.03 * scale, -0.13 * scale),
                (0.038 * scale, 0.038 * scale, 0.078 * scale),
                mat,
                segments=18,
                rings=12,
                parent_to=toy,
            )
            sphere(
                f"{name}_Foot_{side}",
                (side * 0.056 * scale, -0.055 * scale, -0.255 * scale),
                (0.055 * scale, 0.048 * scale, 0.034 * scale),
                mat,
                segments=18,
                rings=12,
                parent_to=toy,
            )
    return toy


def lathe_profile(
    name: str,
    profile: tuple[tuple[float, float], ...],
    mat: bpy.types.Material,
    *,
    segments: int = 40,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Build a smooth Z-axis shell from a (z, radius) profile.

    Capsule halves are deliberately open at the locking seam. The flange and
    latch cover that opening, so the silhouette reads like an injection-molded
    capsule rather than two overlapping ellipsoids.
    """
    vertices: list[tuple[float, float, float]] = []
    rings: list[list[int]] = []
    for z, radius in profile:
        if radius <= 0.0001:
            rings.append([len(vertices)])
            vertices.append((0.0, 0.0, z))
            continue
        ring: list[int] = []
        for index in range(segments):
            angle = (2 * math.pi * index) / segments
            ring.append(len(vertices))
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
        rings.append(ring)

    faces: list[tuple[int, ...]] = []
    for lower, upper in zip(rings, rings[1:]):
        if len(lower) == 1:
            pole = lower[0]
            for index in range(segments):
                nxt = (index + 1) % segments
                faces.append((pole, upper[nxt], upper[index]))
        elif len(upper) == 1:
            pole = upper[0]
            for index in range(segments):
                nxt = (index + 1) % segments
                faces.append((lower[index], lower[nxt], pole))
        else:
            for index in range(segments):
                nxt = (index + 1) % segments
                faces.append((lower[index], lower[nxt], upper[nxt], upper[index]))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = remember(bpy.data.objects.new(name, mesh))
    bpy.context.collection.objects.link(obj)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def capsule_assembly(
    root: bpy.types.Object,
    *,
    prefix: str,
    suffix: str,
    scale: float,
    top_mat: bpy.types.Material,
    lower_mat: bpy.types.Material,
    inner_mat: bpy.types.Material,
    inner_shape: str,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    """Create the shared Dugudugu 55:45 capsule product language.

    The softly tinted transparent upper shell and opaque lower cup meet at a
    narrow injection-molded lip. A small pull tab keeps the opening mechanism
    legible without turning the seam into a white decorative belt.
    """
    top_name = f"{prefix}Top{suffix}"
    bottom_name = f"{prefix}Bottom{suffix}"
    band_name = f"{prefix}Band{suffix}"
    latch_name = f"{prefix}Latch{suffix}"
    toy_name = f"{prefix}Toy{suffix}"

    # The two near-equal halves and their short vertical seam walls read as a
    # manufactured product capsule, not an egg or a flying saucer.
    top = lathe_profile(
        top_name,
        tuple(
            (z * scale, radius * scale)
            for z, radius in (
                (0.0, 0.335),
                (0.055, 0.338),
                (0.135, 0.326),
                (0.22, 0.282),
                (0.29, 0.19),
                (0.34, 0.0),
            )
        ),
        top_mat,
        parent_to=root,
    )
    bottom = lathe_profile(
        bottom_name,
        tuple(
            (z * scale, radius * scale)
            for z, radius in (
                (-0.31, 0.0),
                (-0.282, 0.108),
                (-0.228, 0.21),
                (-0.145, 0.287),
                (-0.055, 0.327),
                (0.0, 0.335),
            )
        ),
        lower_mat,
        parent_to=root,
    )

    # One thin molded ring and a small front tab are enough to communicate
    # where the product opens. There is deliberately no gold seam, dark notch,
    # exterior badge, or gem.
    torus(
        band_name,
        (0, 0, 0),
        0.337 * scale,
        0.014 * scale,
        lower_mat,
        parent_to=root,
    )
    rounded_box(
        latch_name,
        (0, -0.35 * scale, -0.003 * scale),
        (0.095 * scale, 0.034 * scale, 0.07 * scale),
        CREAM,
        0.017 * scale,
        parent_to=top,
    )

    # The prize now reads as a tiny grounded character rather than a floating
    # generic heart/star emblem. The complete figure remains well inside the
    # shell and the stable root is what the runtime reveal animates.
    toy = mini_animal_toy(
        toy_name,
        scale,
        inner_mat,
        kind=inner_shape,
        parent_to=root,
    )
    return top, bottom, toy


def build_machine() -> bpy.types.Object:
    root = remember(bpy.data.objects.new("GachaRoot", None))
    bpy.context.collection.objects.link(root)

    # All four supplied references reduce the machine to two large masses:
    # one clear inventory window and one warm control cabinet. The previous
    # plinth, inset face, dividers, trim bands and feet made it read as a small
    # arcade prop. Keep only a quiet bottom lip so the silhouette survives at
    # 390px without sacrificing the authored 3D bevels.
    rounded_box("Base", (0, 0.03, 0.18), (3.04, 1.76, 0.32), ORANGE_DARK, 0.13, parent_to=root)
    rounded_box("Body", (0, 0, 1.2), (2.9, 1.68, 2.06), ORANGE, 0.24, parent_to=root)

    # A rectangular fake-glass chamber reads at mobile size and matches the
    # supplied illustration without relying on transmission.
    rounded_box("DomeBowl", (0, 0.02, 2.23), (2.8, 1.66, 0.2), ORANGE, 0.065, parent_to=root)
    rounded_box("ChamberBack", (0, 0.77, 3.34), (2.54, 0.06, 2.16), AQUA_BACK, 0.08, parent_to=root)

    # A shallow aqua funnel is enough to explain the path. It stays behind the
    # bottom row and avoids introducing another dark mechanical focal point.
    rounded_box(
        "ChamberGateBack",
        (0, 0.62, 2.38),
        (0.76, 0.12, 0.24),
        AQUA_EDGE,
        0.07,
        parent_to=root,
    )
    rounded_box(
        "ChamberGateLip",
        (0, 0.49, 2.32),
        (0.5, 0.18, 0.09),
        CREAM_MATTE,
        0.045,
        parent_to=root,
    )
    rounded_box(
        "ChamberShelf",
        (0, 0.49, 2.41),
        (2.2, 0.24, 0.08),
        AQUA_EDGE,
        0.035,
        parent_to=root,
    )

    capsule_palette = (PINK, SKY, LEMON, MINT, GRAPE, CORAL)
    capsule_top_palette = (
        CAPSULE_GLASS_SKY,
        CAPSULE_GLASS_LEMON,
        CAPSULE_GLASS_MINT,
        CAPSULE_GLASS_GRAPE,
        CAPSULE_GLASS_CORAL,
        CAPSULE_GLASS_PINK,
    )
    capsule_positions = (
        (-0.96, -0.29, 2.52), (-0.32, -0.42, 2.54), (0.32, -0.4, 2.53), (0.96, -0.27, 2.52),
        (-0.91, 0.0, 3.07), (-0.29, -0.12, 3.09), (0.34, -0.09, 3.07), (0.94, 0.0, 3.08),
        (-0.96, 0.18, 3.62), (-0.32, 0.14, 3.64), (0.32, 0.17, 3.62), (0.96, 0.15, 3.63),
    )
    for i, (x, y, z) in enumerate(capsule_positions):
        capsule_root = remember(bpy.data.objects.new(f"Capsule_{i:02d}", None))
        bpy.context.collection.objects.link(capsule_root)
        capsule_root.location = (x, y, z)
        capsule_root.rotation_euler = (
            0.08 * ((i % 3) - 1),
            0.12 * ((i % 4) - 1.5),
            0.22 * i,
        )
        parent(capsule_root, root)
        capsule_assembly(
            capsule_root,
            prefix="Capsule",
            suffix=f"_{i:02d}",
            # Large, almost-touching color blocks match the references. Twelve
            # stable roots still mirror candidates 1–12; visual simplicity is
            # achieved by scale and spacing rather than breaking state truth.
            scale=0.98,
            top_mat=capsule_top_palette[i % 6],
            lower_mat=capsule_palette[i % 6],
            inner_mat=capsule_palette[(i + 3) % 6],
            inner_shape="bunny" if i % 2 == 0 else "bear",
        )

    rounded_box("GlassDome", (0, -0.005, 3.34), (2.72, 1.62, 2.3), GLASS, 0.18, parent_to=root)
    rounded_box("GlassBottomFrame", (0, -0.02, 2.22), (2.82, 1.68, 0.1), AQUA_EDGE, 0.04, parent_to=root)
    for i, x in enumerate((-1.34, 1.34)):
        rounded_box(f"GlassEdge_{i}", (x, -0.82, 3.34), (0.045, 0.045, 2.05), AQUA_EDGE, 0.018, parent_to=root)

    rounded_box("Crown", (0, 0, 4.53), (3.0, 1.76, 0.34), ORANGE, 0.15, parent_to=root)

    # One illustrated reflection is enough; more streaks make the chamber look
    # glossy and expensive rather than like a friendly molded toy.
    rounded_box(
        "DomeHighlightTall",
        (-0.97, -0.835, 3.3),
        (0.055, 0.025, 1.05),
        CREAM,
        0.022,
        rotation=(0, 0, math.radians(-4)),
        parent_to=root,
    )
    sphere("DomeHighlightDot", (-0.93, -0.83, 4.0), (0.07, 0.024, 0.095), CREAM, segments=20, rings=12, parent_to=root)

    # One oversized crank is the only control. Removing the coin-slot plaque
    # gives it the same instant readability as the supplied flat illustrations.
    crank = remember(bpy.data.objects.new("CrankRoot", None))
    bpy.context.collection.objects.link(crank)
    crank.location = (0.76, -0.94, 1.15)
    parent(crank, root)
    torus("CrankOuterRing", (0, -0.01, 0), 0.39, 0.065, CREAM_MATTE, rotation=(math.pi / 2, 0, 0), parent_to=crank)
    cylinder("CrankHub", (0, 0, 0), 0.31, 0.18, ORANGE_LIGHT, rotation=(math.pi / 2, 0, 0), bevel=0.055, parent_to=crank)
    cylinder("CrankCap", (0, -0.12, 0), 0.1, 0.05, CREAM, rotation=(math.pi / 2, 0, 0), bevel=0.025, parent_to=crank)
    rounded_box("CrankArm", (0, -0.14, -0.12), (0.2, 0.16, 0.62), CREAM, 0.075, parent_to=crank)
    rounded_box("CrankKnob", (0, -0.15, -0.41), (0.27, 0.2, 0.24), CREAM_MATTE, 0.085, parent_to=crank)

    # The exit is one deep negative shape plus one shallow landing lip. Extra
    # frames and nested trays made the lower cabinet busier than the capsules.
    rounded_box("Chute", (-0.72, -0.93, 1.08), (1.08, 0.14, 0.84), BROWN_DARK, 0.14, parent_to=root)
    rounded_box("Tray", (-0.72, -1.04, 0.7), (0.94, 0.34, 0.14), BROWN, 0.065, rotation=(math.radians(-6), 0, 0), parent_to=root)

    # Output capsule is hidden until the cutscene drops it into the tray.
    prize = remember(bpy.data.objects.new("PrizeCapsule", None))
    bpy.context.collection.objects.link(prize)
    prize.location = (-0.72, -1.12, 2.28)
    # Never export a zero-scale parent with export_apply=True: Blender can bake
    # the zero transform into every child mesh, making runtime scale recovery
    # impossible. GachaScene hides this node on the cloned GLB before render.
    prize.scale = (1, 1, 1)
    parent(prize, root)
    capsule_assembly(
        prize,
        prefix="Prize",
        suffix="",
        scale=1.22,
        top_mat=CAPSULE_GLASS_SKY,
        lower_mat=PINK,
        inner_mat=GLOW_PINK,
        inner_shape="bunny",
    )

    return root


def export_asset(root: bpy.types.Object) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_animations=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def validate_exported_prize_bounds() -> dict[str, tuple[float, float, float]]:
    """Re-import the written GLB and fail if prize geometry was scale-baked.

    This validates the delivery artifact rather than the Blender source scene,
    catching regressions caused by `export_apply=True` or parent transforms.
    """
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    imported = list(bpy.context.selected_objects)
    bounds: dict[str, tuple[float, float, float]] = {}
    prize_node = next(
        (
            candidate
            for candidate in imported
            if candidate.name == "PrizeCapsule"
            or candidate.name.startswith("PrizeCapsule.")
        ),
        None,
    )
    if prize_node is None:
        raise RuntimeError("Export validation failed: missing PrizeCapsule node")
    exported_scale = tuple(float(value) for value in prize_node.scale)
    bounds["PrizeCapsuleScale"] = exported_scale
    if min(abs(value) for value in exported_scale) <= 0.01:
        raise RuntimeError(
            f"Export validation failed: PrizeCapsule node scale is {exported_scale}"
        )
    for stable_name in ("PrizeTop", "PrizeBottom"):
        obj = next(
            (
                candidate
                for candidate in imported
                if candidate.type == "MESH"
                and (
                    candidate.name == stable_name
                    or candidate.name.startswith(f"{stable_name}.")
                )
            ),
            None,
        )
        if obj is None:
            raise RuntimeError(f"Export validation failed: missing {stable_name}")
        world_corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        minimum = Vector(
            (
                min(corner.x for corner in world_corners),
                min(corner.y for corner in world_corners),
                min(corner.z for corner in world_corners),
            )
        )
        maximum = Vector(
            (
                max(corner.x for corner in world_corners),
                max(corner.y for corner in world_corners),
                max(corner.z for corner in world_corners),
            )
        )
        size = maximum - minimum
        bounds[stable_name] = (size.x, size.y, size.z)
        if min(size) <= 0.01 or size.length <= 0.1:
            raise RuntimeError(
                f"Export validation failed: {stable_name} has zero/tiny bounds {tuple(size)}"
            )

    for obj in imported:
        bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.update()
    return bounds


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def render_preview() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 680
    scene.render.resolution_y = 760
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(PREVIEW)
    scene.render.film_transparent = False
    scene.world.color = (0.055, 0.035, 0.065)
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 64

    bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, 0))
    floor = bpy.context.object
    floor.data.materials.append(material("PreviewFloor", "#d9f1df", roughness=0.82, coat=0.0))

    # Soft product-photography sweep. This is render-only and is added after
    # GLB export, so it never enters the runtime asset.
    backdrop = rounded_box(
        "PreviewBackdrop",
        (0, 6.0, 5.0),
        (30.0, 0.2, 14.0),
        material("PreviewBackdropMat", "#f8ddec", roughness=0.86, coat=0.0),
        0.08,
    )

    bpy.ops.object.light_add(type="AREA", location=(4.5, -5.5, 7.5))
    key = bpy.context.object
    key.data.energy = 1250
    key.data.shape = "DISK"
    key.data.size = 5.0
    key.data.color = (1.0, 0.78, 0.72)
    point_camera(key, (0, 0, 2.1))

    bpy.ops.object.light_add(type="AREA", location=(-4.5, -2.5, 4.0))
    fill = bpy.context.object
    fill.data.energy = 850
    fill.data.size = 4.0
    fill.data.color = (0.55, 0.78, 1.0)
    point_camera(fill, (0, 0, 2.1))

    bpy.ops.object.light_add(type="AREA", location=(0, 4.0, 6.0))
    rim = bpy.context.object
    rim.data.energy = 1100
    rim.data.size = 3.0
    rim.data.color = (0.75, 0.55, 1.0)
    point_camera(rim, (0, 0, 2.4))

    bpy.ops.object.camera_add(location=(6.8, -8.8, 5.8))
    camera = bpy.context.object
    camera.data.lens = 58
    point_camera(camera, (0, 0, 2.15))
    scene.camera = camera

    # Match the runtime setup state: the exported prize stays at scale 1 for
    # valid child bounds, while GachaScene hides it until the chute drop.
    prize = bpy.data.objects.get("PrizeCapsule")

    def set_tree_render_hidden(obj: bpy.types.Object, hidden: bool) -> None:
        obj.hide_render = hidden
        for child in obj.children:
            set_tree_render_hidden(child, hidden)

    if prize:
        set_tree_render_hidden(prize, True)
    bpy.ops.render.render(write_still=True)

    # The game-card render reveals the hero capsule beside the machine. The
    # runtime GLB was already exported with this object hidden.
    if prize:
        set_tree_render_hidden(prize, False)
        prize.location = (1.72, -0.52, 0.78)
        prize.scale = (1.18, 1.18, 1.18)
        prize.rotation_euler = (math.radians(-5), math.radians(10), math.radians(-12))
    card_plinth = cylinder(
        "CardCapsulePlinth",
        (1.72, -0.4, 0.34),
        0.56,
        0.2,
        CREAM,
        vertices=48,
        bevel=0.07,
    )
    card_plinth_trim = torus(
        "CardCapsulePlinthTrim",
        (1.72, -0.4, 0.45),
        0.47,
        0.035,
        GOLD,
    )

    CARD_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    floor.hide_render = True
    backdrop.hide_render = True
    scene.render.film_transparent = True
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 100
    scene.render.filepath = str(CARD_IMAGE)
    camera.location = (7.0, -9.65, 5.65)
    camera.data.lens = 58
    point_camera(camera, (0.18, 0, 2.18))
    bpy.ops.render.render(write_still=True)

    # Isolated product QA: if the 55:45 split, flange, latch, and internal toy
    # do not read here, they will not read during the runtime hero close-up.
    def is_prize_part(obj: bpy.types.Object) -> bool:
        current: bpy.types.Object | None = obj
        while current is not None:
            if current == prize:
                return True
            current = current.parent
        return False

    for obj in ASSET_OBJECTS:
        if obj.type == "EMPTY":
            obj.hide_render = False
        else:
            obj.hide_render = not (
                is_prize_part(obj) or obj in {card_plinth, card_plinth_trim}
            )
    floor.hide_render = False
    backdrop.hide_render = False
    scene.render.film_transparent = False
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    camera.location = (3.25, -4.75, 2.15)
    camera.data.lens = 72
    point_camera(camera, (1.72, -0.48, 0.78))
    scene.render.filepath = str(CAPSULE_PREVIEW)
    bpy.ops.render.render(write_still=True)

    # Open-state QA render uses the same named parts animated by GachaScene.
    prize_top = bpy.data.objects.get("PrizeTop")
    prize_bottom = bpy.data.objects.get("PrizeBottom")
    prize_toy = bpy.data.objects.get("PrizeToy")
    if prize_top:
        prize_top.location.x -= 0.25
        prize_top.location.z += 0.58
        prize_top.rotation_euler.x -= math.radians(38)
        prize_top.rotation_euler.z += math.radians(9)
    if prize_bottom:
        prize_bottom.location.z -= 0.055
    if prize_toy:
        prize_toy.location.z += 0.31
        prize_toy.rotation_euler.z += math.radians(18)
        prize_toy.scale = tuple(value * 1.32 for value in prize_toy.scale)
    camera.location = (3.35, -5.05, 2.45)
    camera.data.lens = 64
    point_camera(camera, (1.7, -0.48, 0.96))
    scene.render.filepath = str(CAPSULE_OPEN_PREVIEW)
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    root = build_machine()
    export_asset(root)
    prize_bounds = validate_exported_prize_bounds()
    render_preview()
    print(f"Wrote {OUT}")
    print(f"Preview {PREVIEW}")
    print(f"Capsule preview {CAPSULE_PREVIEW}")
    print(f"Open capsule preview {CAPSULE_OPEN_PREVIEW}")
    print(f"Card image {CARD_IMAGE}")
    print(f"Validated GLB prize bounds {prize_bounds}")


if __name__ == "__main__":
    main()
