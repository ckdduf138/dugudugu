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
WINDOW_PREVIEW = Path("/tmp/dugudugu-gacha-window-closeup.png")
CAPSULE_PREVIEW = Path("/tmp/dugudugu-capsule-closeup.png")
CAPSULE_OPEN_PREVIEW = Path("/tmp/dugudugu-capsule-open-closeup.png")
CARD_IMAGE = ROOT / "public" / "images" / "games" / "draw.webp"
CARD_PREVIEW = Path("/tmp/dugudugu-gacha-card-preview.png")
MAX_GLB_BYTES = 4_000_000
MAX_DELIVERY_MATERIALS = 10
MAX_DELIVERY_MESHES = 64
MAX_DELIVERY_TRIANGLES = 70_000

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


# The reference-led classic machine uses one coral body, one aqua globe, and a
# neutral gray/ivory mechanism. Four opaque capsule colors keep the inventory
# cheerful without turning the small mobile silhouette into confetti.
IVORY = material(
    "Dugu_Ivory",
    "#fff0dc",
    roughness=0.54,
    coat=0.24,
    coat_roughness=0.3,
)
CORAL = material(
    "Dugu_Coral",
    "#f25549",
    roughness=0.48,
    coat=0.2,
    coat_roughness=0.3,
)
DIAL_GRAY = material(
    "Dugu_DialGray",
    "#b9bdba",
    roughness=0.52,
    coat=0.18,
    coat_roughness=0.3,
)
INK = material(
    "Dugu_DeepChute",
    "#432f35",
    roughness=0.72,
    coat=0.04,
)
AQUA_BACK = material(
    "Dugu_Aqua",
    "#cdeff0",
    roughness=0.68,
    coat=0.1,
)
GLASS = material(
    "Dugu_FakeGlass",
    "#bfeff2",
    roughness=0.16,
    alpha=0.16,
    coat=0.58,
    coat_roughness=0.14,
)
CAPSULE_PINK = material(
    "Dugu_CapsulePink",
    "#f58b9a",
    roughness=0.42,
    coat=0.36,
    coat_roughness=0.2,
)
CAPSULE_SKY = material(
    "Dugu_CapsuleSky",
    "#79c6e9",
    roughness=0.42,
    coat=0.36,
    coat_roughness=0.2,
)
CAPSULE_MINT = material(
    "Dugu_CapsuleMint",
    "#91dc9e",
    roughness=0.42,
    coat=0.36,
    coat_roughness=0.2,
)
CAPSULE_LEMON = material(
    "Dugu_CapsuleLemon",
    "#f6d86d",
    roughness=0.42,
    coat=0.36,
    coat_roughness=0.2,
)

# Render-only helpers still use these aliases; they do not create materials.
CREAM = IVORY
CREAM_MATTE = IVORY
PINK = CORAL
PINK_DARK = CORAL
PINK_LIGHT = IVORY
MINT = AQUA_BACK
SKY = AQUA_BACK
GRAPE = INK
INK_GLOSS = INK
GOLD = CAPSULE_LEMON
SILVER = DIAL_GRAY
GLOW = CAPSULE_LEMON
GLOW_PINK = CORAL
ORANGE = CORAL
ORANGE_LIGHT = CORAL
ORANGE_DARK = CORAL
BROWN = INK
BROWN_DARK = INK
AQUA_EDGE = AQUA_BACK
LEMON = CAPSULE_LEMON


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


def cone(
    name: str,
    location: tuple[float, float, float],
    radius1: float,
    radius2: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 20,
    bevel: float = 0.012,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius1,
        radius2=radius2,
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


def trapezoid_box(
    name: str,
    location: tuple[float, float, float],
    *,
    bottom_width: float,
    top_width: float,
    bottom_depth: float,
    top_depth: float,
    height: float,
    mat: bpy.types.Material,
    bevel: float,
    parent_to: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """A softly beveled cabinet that flares toward the floor.

    The profile carries the classic capsule-machine read without copying the
    exact outline or proportions of any single reference illustration.
    """
    bw = bottom_width / 2
    tw = top_width / 2
    bd = bottom_depth / 2
    td = top_depth / 2
    h = height / 2
    vertices = [
        (-bw, -bd, -h),
        (bw, -bd, -h),
        (bw, bd, -h),
        (-bw, bd, -h),
        (-tw, -td, h),
        (tw, -td, h),
        (tw, td, h),
        (-tw, td, h),
    ]
    faces = [
        (3, 2, 1, 0),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = remember(bpy.data.objects.new(name, mesh))
    bpy.context.collection.objects.link(obj)
    obj.location = location
    apply_bevel(obj, bevel, 4)
    obj.data.materials.append(mat)
    if parent_to:
        parent(obj, parent_to)
    return obj


def boolean_difference(
    target: bpy.types.Object,
    cutter: bpy.types.Object,
) -> bpy.types.Object:
    """Apply one deterministic hard-surface cavity and discard the cutter."""
    bpy.ops.object.select_all(action="DESELECT")
    target.select_set(True)
    bpy.context.view_layer.objects.active = target
    modifier = target.modifiers.new("Retrieval cavity", "BOOLEAN")
    modifier.operation = "DIFFERENCE"
    modifier.solver = "EXACT"
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    target.select_set(False)
    if cutter in ASSET_OBJECTS:
        ASSET_OBJECTS.remove(cutter)
    bpy.data.objects.remove(cutter, do_unlink=True)
    return target


def join_meshes(
    name: str,
    objects: list[bpy.types.Object],
) -> bpy.types.Object:
    """Join authored pieces into one stable runtime node.

    Capsule roots animate as a unit, so retaining a separate object for every
    eye, ear, and molded flange only creates needless WebGL draw traversal.
    Blender preserves material slots on join, while the object count falls to
    one top, one lower shell, and one collectible per capsule.
    """
    meshes = [obj for obj in objects if obj.type == "MESH"]
    if not meshes:
        raise ValueError(f"{name} needs at least one mesh")
    for obj in meshes:
        if obj in ASSET_OBJECTS:
            ASSET_OBJECTS.remove(obj)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    joined = meshes[0]
    joined.name = name
    ASSET_OBJECTS.append(joined)
    joined.select_set(False)
    return joined


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
    shell_mat: bpy.types.Material,
) -> tuple[bpy.types.Object, bpy.types.Object, bpy.types.Object]:
    """Create a plain two-piece toy capsule with one seam and highlight.

    The new art direction deliberately removes every animal or figurine. The
    runtime still receives the historical Toy node as an empty transform so
    opening animation code remains compatible.
    """
    top_name = f"{prefix}Top{suffix}"
    bottom_name = f"{prefix}Bottom{suffix}"
    latch_name = f"{prefix}Latch{suffix}"
    toy_name = f"{prefix}Toy{suffix}"

    # The lid is a touch taller than the cup (roughly 53:47), which reads as a
    # manufactured capsule instead of a generic sphere while keeping the
    # silhouette round and friendly at mobile size.
    top = lathe_profile(
        top_name,
        tuple(
            (z * scale, radius * scale)
            for z, radius in (
                (0.0, 0.315),
                (0.065, 0.31),
                (0.16, 0.274),
                (0.245, 0.198),
                (0.305, 0.107),
                (0.326, 0.0),
            )
        ),
        shell_mat,
        segments=28,
        parent_to=root,
    )
    bottom = lathe_profile(
        bottom_name,
        tuple(
            (z * scale, radius * scale)
            for z, radius in (
                (-0.284, 0.0),
                (-0.266, 0.105),
                (-0.213, 0.192),
                (-0.135, 0.27),
                (-0.054, 0.308),
                (0.0, 0.315),
            )
        ),
        shell_mat,
        segments=28,
        parent_to=root,
    )

    # One hairline seam in the shell color is enough to explain how it opens;
    # a bright contrasting belt made the old capsule look ornamental. The
    # stable Latch node name remains available to runtime inspection tools.
    latch = torus(
        latch_name,
        (0, 0, 0),
        0.313 * scale,
        0.008 * scale,
        shell_mat,
        parent_to=root,
    )

    # A single almost-flat painted glint gives the lid orientation without
    # adding a face, badge, second sparkle, or collectible-toy detail.
    highlight_large = sphere(
        f"{top_name}_Highlight",
        (-0.1 * scale, -0.282 * scale, 0.145 * scale),
        (0.024 * scale, 0.004 * scale, 0.042 * scale),
        IVORY,
        segments=12,
        rings=8,
        parent_to=root,
    )
    top = join_meshes(top_name, [top, highlight_large])

    toy = remember(bpy.data.objects.new(toy_name, None))
    bpy.context.collection.objects.link(toy)
    parent(toy, root)
    return top, bottom, toy


def build_machine() -> bpy.types.Object:
    """Build the reference-led classic globe capsule machine.

    The delivery silhouette is intentionally only five readable masses: aqua
    globe, coral lid, coral trapezoid cabinet, flared base lip, and one neutral
    dial above a dark half-round chute. It borrows that shared visual grammar
    from the references without reproducing any single drawing.
    """
    root = remember(bpy.data.objects.new("GachaRoot", None))
    bpy.context.collection.objects.link(root)

    # One softly flared coral cabinet replaces the appliance panel, pillars,
    # feet, gate, and stacked lower trays from the rejected direction.
    body = trapezoid_box(
        "Body",
        (0, 0.0, 1.38),
        bottom_width=3.12,
        top_width=2.68,
        bottom_depth=1.76,
        top_depth=1.45,
        height=2.18,
        mat=CORAL,
        bevel=0.14,
        parent_to=root,
    )
    chute_cutter = cylinder(
        "ChuteCutter",
        (0, -0.87, 0.4),
        0.57,
        0.66,
        INK,
        rotation=(math.pi / 2, 0, 0),
        vertices=48,
        bevel=0,
        parent_to=root,
    )
    boolean_difference(body, chute_cutter)
    # The post-boolean bevel affects the fresh cut boundary, giving the coral
    # shell a thin molded lip rather than leaving a razor-sharp CG opening.
    apply_bevel(body, 0.025, 2)
    trapezoid_box(
        "Base",
        (0, 0.03, 0.21),
        bottom_width=3.72,
        top_width=3.22,
        bottom_depth=2.12,
        top_depth=1.82,
        height=0.42,
        mat=CORAL,
        bevel=0.13,
        parent_to=root,
    )

    # A shallow opaque aqua rear plate gives the transparent globe a readable
    # pastel body without stacking multiple refractive surfaces.
    sphere(
        "ChamberBack",
        (0, 0.7, 3.62),
        (1.5, 0.055, 1.32),
        AQUA_BACK,
        segments=40,
        rings=24,
        parent_to=root,
    )

    # Inventory nodes are authored center-out so the minimum valid two-entry
    # setup reads as a balanced pair rather than two objects stranded at left.
    capsule_positions = (
        (-0.98, 0.13, 2.77),
        (-0.49, -0.10, 2.76),
        (0.0, -0.18, 2.75),
        (0.49, 0.02, 2.76),
        (0.98, 0.16, 2.77),
        (-0.735, 0.17, 3.2),
        (-0.245, -0.02, 3.22),
        (0.245, 0.13, 3.22),
        (0.735, 0.05, 3.2),
        (-0.49, 0.18, 3.66),
        (0.0, 0.13, 3.67),
        (0.49, 0.2, 3.66),
    )
    capsule_palette = (
        CAPSULE_PINK,
        CAPSULE_SKY,
        CAPSULE_MINT,
        CAPSULE_LEMON,
    )
    for index, (x, y, z) in enumerate(capsule_positions):
        capsule_root = remember(
            bpy.data.objects.new(f"Capsule_{index:02d}", None)
        )
        bpy.context.collection.objects.link(capsule_root)
        capsule_root.location = (x, y, z)
        capsule_root.rotation_euler = (
            math.radians((-3, 2, -2, 3)[index % 4]),
            math.radians((-5, 4, 6, -3)[index % 4]),
            math.radians((-9, 7, -4, 8, 3)[index % 5]),
        )
        parent(capsule_root, root)
        capsule_assembly(
            capsule_root,
            prefix="Capsule",
            suffix=f"_{index:02d}",
            scale=0.88,
            shell_mat=capsule_palette[index % len(capsule_palette)],
        )

    # The single fake-glass ellipsoid is the recognizable globe. Runtime sets
    # transparent/depthWrite on this material; transmission is never authored.
    sphere(
        "GlassDome",
        (0, 0, 3.62),
        (1.61, 0.85, 1.44),
        GLASS,
        segments=48,
        rings=28,
        parent_to=root,
    )

    globe_ring = torus(
        "GlobeBaseRing",
        (0, 0, 2.55),
        0.94,
        0.13,
        CORAL,
        parent_to=root,
    )
    globe_ring.scale = (1.48, 0.78, 1.0)

    # A low coral lid and one small crown button finish the globe without the
    # layered appliance arch or ornamental signage of the previous model.
    lid_cap = sphere(
        "LidCap",
        (0, 0, 4.93),
        (1.15, 0.68, 0.28),
        CORAL,
        segments=40,
        rings=20,
        parent_to=root,
    )
    lid_rim = torus(
        "LidRim",
        (0, 0, 4.76),
        0.92,
        0.1,
        CORAL,
        parent_to=root,
    )
    lid_rim.scale = (1.45, 0.76, 1.0)
    lid_button = sphere(
        "LidButton",
        (0, 0, 5.22),
        (0.32, 0.25, 0.16),
        CORAL,
        segments=28,
        rings=16,
        parent_to=root,
    )
    join_meshes("DomeBowl", [lid_cap, lid_rim, lid_button])

    # Neutral hardware prevents the dial from competing with the coral body.
    # CrankRoot rests at exactly zero rotation with a vertical bar, ready for
    # the runtime's one full z-axis turn.
    crank = remember(bpy.data.objects.new("CrankRoot", None))
    bpy.context.collection.objects.link(crank)
    crank.location = (0, -0.94, 1.55)
    crank.rotation_euler = (0, 0, 0)
    parent(crank, root)
    torus(
        "CrankOuterRing",
        (0, 0, 0),
        0.39,
        0.046,
        IVORY,
        rotation=(math.pi / 2, 0, 0),
        parent_to=crank,
    )
    cylinder(
        "CrankHub",
        (0, -0.035, 0),
        0.34,
        0.13,
        DIAL_GRAY,
        rotation=(math.pi / 2, 0, 0),
        vertices=40,
        bevel=0.055,
        parent_to=crank,
    )
    rounded_box(
        "CrankArm",
        (0, -0.14, 0),
        (0.16, 0.13, 0.62),
        IVORY,
        0.065,
        parent_to=crank,
    )

    # The dark circular back sits well behind the real cut. The body edge can
    # therefore occlude a falling capsule before it crosses the mouth instead
    # of letting the prize render on top of the cabinet and crank.
    cylinder(
        "Chute",
        (0, -0.38, 0.62),
        0.505,
        0.065,
        INK,
        rotation=(math.pi / 2, 0, 0),
        vertices=44,
        bevel=0.012,
        parent_to=root,
    )

    # Prize capsule stays simple and empty. PrizeToy remains a stable empty
    # transform so existing opening animation code can snapshot it safely.
    prize = remember(bpy.data.objects.new("PrizeCapsule", None))
    bpy.context.collection.objects.link(prize)
    prize.location = (0, -1.14, 2.45)
    prize.scale = (1, 1, 1)
    parent(prize, root)
    capsule_assembly(
        prize,
        prefix="Prize",
        suffix="",
        scale=1.18,
        shell_mat=CAPSULE_PINK,
    )

    for name, location in (
        # Camera/front is negative Blender Y. These positions deliberately
        # progress from behind the cabinet face to the cut mouth, then onto the
        # foreground floor: internal.y > mouth.y > landing.y.
        ("InternalDropAnchor", (0, -0.5, 1.34)),
        ("ChuteMouthAnchor", (0, -0.72, 0.66)),
        ("ChuteAnchor", (0, -0.72, 0.66)),
        ("PrizeTapAnchor", (-0.11, -1.2, 0.48)),
        ("CameraTarget", (0, 0, 2.55)),
    ):
        anchor = remember(bpy.data.objects.new(name, None))
        bpy.context.collection.objects.link(anchor)
        anchor.location = location
        parent(anchor, root)

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


def validate_exported_prize_bounds() -> dict[str, object]:
    """Re-import the written GLB and fail if prize geometry was scale-baked.

    This validates the delivery artifact rather than the Blender source scene,
    catching regressions caused by `export_apply=True` or parent transforms.
    """
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    imported = list(bpy.context.selected_objects)
    bounds: dict[str, object] = {}
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

    required_nodes = (
        "CrankRoot",
        "PrizeCapsule",
        "PrizeTop",
        "PrizeBottom",
        "PrizeLatch",
        "PrizeToy",
        "GlassDome",
        "InternalDropAnchor",
        "ChuteMouthAnchor",
        "PrizeTapAnchor",
        "ChuteAnchor",
        "CameraTarget",
        *(f"Capsule_{index:02d}" for index in range(12)),
        *(f"CapsuleTop_{index:02d}" for index in range(12)),
        *(f"CapsuleBottom_{index:02d}" for index in range(12)),
        *(f"CapsuleLatch_{index:02d}" for index in range(12)),
        *(f"CapsuleToy_{index:02d}" for index in range(12)),
    )
    imported_names = {obj.name for obj in imported}
    missing = [
        name
        for name in required_nodes
        if not any(
            candidate == name or candidate.startswith(f"{name}.")
            for candidate in imported_names
        )
    ]
    if missing:
        raise RuntimeError(f"Export validation failed: missing stable nodes {missing}")

    def imported_node(stable_name: str) -> bpy.types.Object:
        node = next(
            (
                candidate
                for candidate in imported
                if candidate.name == stable_name
                or candidate.name.startswith(f"{stable_name}.")
            ),
            None,
        )
        if node is None:
            raise RuntimeError(f"Export validation failed: missing {stable_name}")
        return node

    internal_anchor = imported_node("InternalDropAnchor")
    mouth_anchor = imported_node("ChuteMouthAnchor")
    landing_anchor = imported_node("PrizeTapAnchor")
    anchor_depths = (
        float(internal_anchor.location.y),
        float(mouth_anchor.location.y),
        float(landing_anchor.location.y),
    )
    anchor_heights = (
        float(internal_anchor.location.z),
        float(mouth_anchor.location.z),
        float(landing_anchor.location.z),
    )
    bounds["DropAnchorDepths"] = anchor_depths
    bounds["DropAnchorHeights"] = anchor_heights
    if not (anchor_depths[0] > anchor_depths[1] > anchor_depths[2]):
        raise RuntimeError(
            "Export validation failed: drop anchors must travel from inside "
            f"to foreground, got Y={anchor_depths}"
        )
    if not (anchor_heights[0] > anchor_heights[1] > anchor_heights[2]):
        raise RuntimeError(
            "Export validation failed: drop anchors must descend monotonically, "
            f"got Z={anchor_heights}"
        )

    forbidden_figure_terms = (
        "bunny",
        "bear",
        "cat",
        "puppy",
        "duck",
        "robot",
        "frog",
        "muzzle",
        "paw",
        "ear",
    )
    figure_nodes = [
        name
        for name in imported_names
        if any(term in name.lower() for term in forbidden_figure_terms)
    ]
    if figure_nodes:
        raise RuntimeError(
            f"Export validation failed: figurine geometry leaked into delivery {figure_nodes}"
        )

    prize_toy_node = next(
        (
            candidate
            for candidate in imported
            if candidate.name == "PrizeToy"
            or candidate.name.startswith("PrizeToy.")
        ),
        None,
    )
    if prize_toy_node is None or prize_toy_node.type != "EMPTY":
        raise RuntimeError("Export validation failed: PrizeToy must remain an empty node")

    toy_nodes = [
        candidate
        for candidate in imported
        if candidate.name == "PrizeToy"
        or candidate.name.startswith("PrizeToy.")
        or candidate.name.startswith("CapsuleToy_")
    ]
    if len(toy_nodes) != 13 or any(node.type != "EMPTY" for node in toy_nodes):
        raise RuntimeError(
            "Export validation failed: every capsule Toy node must be an empty transform"
        )

    crank_node = next(
        (
            candidate
            for candidate in imported
            if candidate.name == "CrankRoot"
            or candidate.name.startswith("CrankRoot.")
        ),
        None,
    )
    crank_rest_degrees = (
        math.degrees(float(crank_node.rotation_euler.z)) if crank_node else math.inf
    )
    bounds["CrankRestDegrees"] = crank_rest_degrees
    if abs(crank_rest_degrees) > 0.01:
        raise RuntimeError(
            f"Export validation failed: crank rest is {crank_rest_degrees:.3f} degrees"
        )

    expected_capsule_x = {
        0: -0.98,
        1: -0.49,
        2: 0.0,
        3: 0.49,
        4: 0.98,
        5: -0.735,
        6: -0.245,
        7: 0.245,
        8: 0.735,
        9: -0.49,
        10: 0.0,
        11: 0.49,
    }
    capsule_x: dict[int, float] = {}
    for index, expected_x in expected_capsule_x.items():
        stable_name = f"Capsule_{index:02d}"
        capsule_node = next(
            (
                candidate
                for candidate in imported
                if candidate.name == stable_name
                or candidate.name.startswith(f"{stable_name}.")
            ),
            None,
        )
        if capsule_node is None:
            raise RuntimeError(f"Export validation failed: missing {stable_name}")
        actual_x = float(capsule_node.location.x)
        capsule_x[index] = actual_x
        if abs(actual_x - expected_x) > 0.02:
            raise RuntimeError(
                f"Export validation failed: {stable_name} x={actual_x:.3f}, "
                f"expected {expected_x:.3f} for center-out reveal"
            )
    bounds["InventoryCenterIndices"] = (2, 6, 7, 10)

    meshes = [obj for obj in imported if obj.type == "MESH"]
    used_materials = {
        mat
        for obj in meshes
        for mat in obj.data.materials
        if mat is not None
    }
    material_names = {mat.name for mat in used_materials}
    transmission_materials: list[str] = []
    for mat in used_materials:
        if not mat.use_nodes or mat.node_tree is None:
            continue
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf is None:
            continue
        transmission_input = (
            bsdf.inputs.get("Transmission Weight")
            or bsdf.inputs.get("Transmission")
        )
        if transmission_input and float(transmission_input.default_value) > 1e-6:
            transmission_materials.append(mat.name)
    bounds["TransmissionMaterials"] = len(transmission_materials)
    if transmission_materials:
        raise RuntimeError(
            f"Export validation failed: transmission materials {transmission_materials}"
        )
    triangles = sum(
        sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
        for obj in meshes
    )
    delivery_bytes = OUT.stat().st_size
    bounds["DeliveryBytes"] = delivery_bytes
    bounds["MeshNodes"] = len(meshes)
    bounds["Materials"] = len(material_names)
    bounds["Triangles"] = triangles
    if delivery_bytes > MAX_GLB_BYTES:
        raise RuntimeError(
            f"Export validation failed: GLB is {delivery_bytes:,} bytes "
            f"(max {MAX_GLB_BYTES:,})"
        )
    if len(meshes) > MAX_DELIVERY_MESHES:
        raise RuntimeError(
            f"Export validation failed: {len(meshes)} mesh nodes "
            f"(max {MAX_DELIVERY_MESHES})"
        )
    if len(material_names) > MAX_DELIVERY_MATERIALS:
        raise RuntimeError(
            f"Export validation failed: {len(material_names)} materials "
            f"(max {MAX_DELIVERY_MATERIALS})"
        )
    if triangles > MAX_DELIVERY_TRIANGLES:
        raise RuntimeError(
            f"Export validation failed: {triangles:,} triangles "
            f"(max {MAX_DELIVERY_TRIANGLES:,})"
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

    # Inventory QA at a tighter crop: all twelve supported color balls, seams,
    # and tiny painted highlights must remain legible behind one glass surface.
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    camera.location = (3.8, -7.7, 4.7)
    camera.data.lens = 76
    point_camera(camera, (0, 0, 3.48))
    scene.render.filepath = str(WINDOW_PREVIEW)
    bpy.ops.render.render(write_still=True)

    # The game-card render reveals the hero capsule beside the machine. The
    # runtime GLB was already exported with this object hidden.
    if prize:
        set_tree_render_hidden(prize, False)
        prize.location = (1.72, -0.52, 0.42)
        prize.scale = (1.18, 1.18, 1.18)
        prize.rotation_euler = (math.radians(-5), math.radians(10), math.radians(-12))

    CARD_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    floor.hide_render = True
    backdrop.hide_render = True
    # Eevee's fake-glass alpha can smear scanlines when it is composited onto
    # a transparent WebP film. The lobby art is code-native, so this delivery
    # card uses the same neutral opaque product-shot background as race.webp
    # instead of shipping a corrupted alpha asset.
    scene.render.film_transparent = False
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.quality = 100
    scene.render.filepath = str(CARD_IMAGE)
    camera.location = (8.1, -11.3, 6.2)
    camera.data.lens = 58
    point_camera(camera, (0.12, 0, 2.5))
    bpy.ops.render.render(write_still=True)

    # Lossless QA companion for comparing the final WebP composition.
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(CARD_PREVIEW)
    bpy.ops.render.render(write_still=True)

    # Isolated product QA: only the spherical two-piece shell and thin seam
    # should read here; there is deliberately no plinth or internal figurine.
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
            obj.hide_render = not is_prize_part(obj)
    floor.hide_render = False
    backdrop.hide_render = False
    scene.render.film_transparent = False
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    camera.location = (3.25, -4.75, 2.15)
    camera.data.lens = 72
    point_camera(camera, (1.72, -0.48, 0.46))
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
    point_camera(camera, (1.7, -0.48, 0.64))
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
    print(f"Window preview {WINDOW_PREVIEW}")
    print(f"Capsule preview {CAPSULE_PREVIEW}")
    print(f"Open capsule preview {CAPSULE_OPEN_PREVIEW}")
    print(f"Card image {CARD_IMAGE}")
    print(f"Card preview {CARD_PREVIEW}")
    print(f"Validated GLB prize bounds {prize_bounds}")


if __name__ == "__main__":
    main()
