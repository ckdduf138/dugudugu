"""Rebuild the archived Blender-authored fortune UI studies.

Run with:
  blender -b --python scripts/blender/build_fortune_ui_assets.py

These rejected studies are deliberately kept out of public/. The live tap
guide is Lucide's Pointer vector, and the live result surface is derived from a
CC0 paper photograph by build_fortune_paper_texture.py.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "public" / "images" / "games"
SOURCE_DIR = ROOT / "scripts" / "assets" / "fortune-ui"
REJECTED_DIR = SOURCE_DIR / "rejected"
HAND_OUT = REJECTED_DIR / "fortune-tap-hand-v4-blender.webp"
PAPER_OUT = REJECTED_DIR / "fortune-paper-slip-v4-blender.webp"
BLEND_OUT = SOURCE_DIR / "fortune-ui-v4.blend"
HAND_REVIEW = SOURCE_DIR / "renders" / "fortune-tap-hand-v4.png"
PAPER_REVIEW = SOURCE_DIR / "renders" / "fortune-paper-slip-v4.png"

INK = (0.034, 0.020, 0.042, 1.0)
CREAM = (1.0, 0.95, 0.82, 1.0)
CORAL = (1.0, 0.254, 0.147, 1.0)
PAPER_LIGHT = (1.0, 0.98, 0.90, 1.0)
PAPER_DARK = (0.92, 0.87, 0.78, 1.0)


def reset_file() -> bpy.types.Scene:
    for scene in list(bpy.data.scenes)[1:]:
        bpy.data.scenes.remove(scene)
    scene = bpy.data.scenes[0]
    scene.name = "HandGuide"
    bpy.context.window.scene = scene
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)
    return scene


def aim_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


def material(
    name: str,
    color: tuple[float, float, float, float],
    *,
    roughness: float = 0.78,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    shader = mat.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError(f"Missing Principled BSDF for {name}")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = 0.22
    return mat


def paper_material() -> bpy.types.Material:
    mat = bpy.data.materials.new("FortunePaper")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    fine_noise = nodes.new("ShaderNodeTexNoise")
    bump = nodes.new("ShaderNodeBump")

    noise.inputs["Scale"].default_value = 38.0
    noise.inputs["Detail"].default_value = 4.0
    noise.inputs["Roughness"].default_value = 0.72
    fine_noise.inputs["Scale"].default_value = 185.0
    fine_noise.inputs["Detail"].default_value = 2.4
    fine_noise.inputs["Roughness"].default_value = 0.82

    ramp.color_ramp.elements[0].position = 0.27
    ramp.color_ramp.elements[0].color = PAPER_DARK
    ramp.color_ramp.elements[1].position = 0.74
    ramp.color_ramp.elements[1].color = PAPER_LIGHT
    bump.inputs["Strength"].default_value = 0.21
    bump.inputs["Distance"].default_value = 0.045

    shader.inputs["Roughness"].default_value = 0.91
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = 0.14

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], shader.inputs["Base Color"])
    links.new(fine_noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return mat


def setup_render(
    scene: bpy.types.Scene,
    *,
    width: int,
    height: int,
    filepath: Path,
    freestyle: bool,
) -> None:
    # Blender 5.1 exposes Eevee under BLENDER_EEVEE (the older NEXT suffix is
    # no longer part of the public enum).
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.quality = 88
    scene.render.film_transparent = True
    scene.render.filepath = str(filepath)
    scene.render.use_file_extension = True
    scene.render.resolution_percentage = 100
    scene.render.use_freestyle = freestyle
    scene.view_settings.look = "AgX - Medium High Contrast"

    if freestyle:
        lineset = scene.view_layers[0].freestyle_settings.linesets[0]
        lineset.linestyle.color = INK[:3]
        # The delivery hand occupies only about one quarter of the 512px
        # canvas at mobile size. A normal illustration line disappears after
        # that downscale, so author a deliberate toy-outline here.
        lineset.linestyle.thickness = 4.2
        lineset.select_silhouette = True
        lineset.select_border = True
        lineset.select_crease = True
        lineset.select_material_boundary = False


def add_area_light(
    scene: bpy.types.Scene,
    name: str,
    location: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
    target: tuple[float, float, float],
) -> bpy.types.Object:
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim_at(obj, target)
    return obj


def add_camera(
    scene: bpy.types.Scene,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    ortho_scale: float,
) -> bpy.types.Object:
    data = bpy.data.cameras.new(f"{scene.name}Camera")
    data.type = "ORTHO"
    data.ortho_scale = ortho_scale
    data.lens = 52
    obj = bpy.data.objects.new(data.name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim_at(obj, target)
    scene.camera = obj
    return obj


def add_ellipsoid(
    scene: bpy.types.Scene,
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation_y: float = 0.0,
) -> bpy.types.Object:
    bpy.context.window.scene = scene
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=64,
        ring_count=32,
        location=location,
        rotation=(0.0, rotation_y, 0.0),
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def add_cuff(
    scene: bpy.types.Scene,
    mat: bpy.types.Material,
) -> bpy.types.Object:
    bpy.context.window.scene = scene
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64,
        radius=1.0,
        depth=0.58,
        location=(0.0, 0.0, 0.28),
    )
    obj = bpy.context.object
    obj.name = "Cuff"
    obj.scale = (1.03, 0.70, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bevel = obj.modifiers.new("RoundedCuff", "BEVEL")
    bevel.width = 0.18
    bevel.segments = 5
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def add_crease_curve(
    scene: bpy.types.Scene,
    name: str,
    points: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    thickness: float = 0.035,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = thickness
    curve.bevel_resolution = 4
    curve.resolution_u = 16
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points, strict=True):
        point.co = coordinate
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    curve.materials.append(mat)
    obj = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(obj)
    return obj


def build_hand(scene: bpy.types.Scene) -> None:
    setup_render(
        scene,
        width=512,
        height=512,
        filepath=HAND_OUT,
        freestyle=True,
    )
    cream = material("GloveCream", CREAM, roughness=0.78)
    coral = material("CuffCoral", CORAL, roughness=0.72)
    ink = material("CreaseInk", INK, roughness=1.0)

    # One readable raised index, three curled fingers, and one separate thumb.
    # The pieces overlap deliberately: soft contacts read like stitched toy
    # glove panels while Freestyle and front creases preserve the anatomy.
    add_ellipsoid(scene, "Palm", (0.0, 0.0, 2.42), (1.26, 0.66, 1.31), cream)
    add_ellipsoid(scene, "Index", (-0.63, -0.02, 4.32), (0.50, 0.51, 1.70), cream)
    add_ellipsoid(scene, "MiddleCurl", (0.18, -0.12, 3.28), (0.50, 0.55, 0.72), cream, math.radians(-3))
    add_ellipsoid(scene, "RingCurl", (0.72, -0.08, 3.14), (0.46, 0.52, 0.66), cream, math.radians(-7))
    add_ellipsoid(scene, "PinkyCurl", (1.15, -0.03, 2.94), (0.39, 0.47, 0.56), cream, math.radians(-12))
    add_ellipsoid(scene, "Thumb", (-0.44, -0.70, 2.62), (0.36, 0.36, 0.82), cream, math.radians(57))
    add_ellipsoid(scene, "Wrist", (0.0, 0.0, 0.94), (0.78, 0.54, 0.70), cream)
    add_cuff(scene, coral)

    front_y = -0.73
    add_crease_curve(
        scene,
        "ThumbCrease",
        [(-0.83, front_y, 2.30), (-0.40, front_y - 0.01, 2.54), (0.08, front_y + 0.02, 2.79)],
        ink,
        0.043,
    )
    add_crease_curve(
        scene,
        "MiddleCrease",
        [(0.34, front_y + 0.07, 3.58), (0.32, front_y + 0.04, 3.18)],
        ink,
        0.032,
    )
    add_crease_curve(
        scene,
        "RingCrease",
        [(0.86, front_y + 0.12, 3.36), (0.82, front_y + 0.08, 3.00)],
        ink,
        0.032,
    )

    add_camera(scene, (0.0, -12.0, 3.35), (0.05, 0.0, 3.05), 7.15)
    add_area_light(scene, "WarmKey", (-4.0, -6.0, 8.0), 720.0, 5.0, (1.0, 0.72, 0.52), (0.0, 0.0, 3.0))
    add_area_light(scene, "CoolFill", (4.5, -4.0, 5.0), 430.0, 4.0, (0.56, 0.78, 1.0), (0.0, 0.0, 3.0))
    add_area_light(scene, "SoftRim", (0.0, 2.5, 7.5), 520.0, 3.5, (1.0, 0.80, 0.58), (0.0, 0.0, 3.0))
    bpy.ops.render.render(write_still=True)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    bpy.data.images["Render Result"].save_render(str(HAND_REVIEW), scene=scene)
    scene.render.image_settings.file_format = "WEBP"


def build_paper(scene: bpy.types.Scene) -> None:
    setup_render(
        scene,
        width=1536,
        height=320,
        filepath=PAPER_OUT,
        freestyle=False,
    )
    mat = paper_material()
    width = 6.15
    height = 1.08
    segments_x = 72
    segments_y = 10
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []

    for row in range(segments_y + 1):
        v = row / segments_y
        base_y = -height / 2 + height * v
        for column in range(segments_x + 1):
            u = column / segments_x
            x = -width / 2 + width * u
            # A machine-cut fortune slip is not torn parchment. Keep only a
            # low-amplitude fiber wobble that survives downscaling without
            # turning into decorative deckle teeth.
            edge_wave = 0.011 * math.sin(column * 1.61) + 0.0045 * math.sin(column * 4.13)
            edge_weight = abs(v - 0.5) * 2.0
            y = base_y + math.copysign(edge_wave * edge_weight, base_y if base_y else 1.0)
            end_lift = 0.12 * (abs(x) / (width / 2)) ** 4
            z = (
                0.047 * math.sin(x * 1.08)
                + 0.018 * math.sin(x * 3.1 + base_y * 2.0)
                + end_lift
            )
            vertices.append((x, y, z))

    stride = segments_x + 1
    for row in range(segments_y):
        for column in range(segments_x):
            index = row * stride + column
            faces.append((index, index + 1, index + stride + 1, index + stride))

    mesh = bpy.data.meshes.new("FortunePaperMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    paper = bpy.data.objects.new("FortunePaper", mesh)
    scene.collection.objects.link(paper)
    paper.data.materials.append(mat)

    solidify = paper.modifiers.new("PaperThickness", "SOLIDIFY")
    solidify.thickness = 0.026
    solidify.offset = 0.0
    bevel = paper.modifiers.new("SoftCutEdge", "BEVEL")
    bevel.width = 0.018
    bevel.segments = 3
    for polygon in mesh.polygons:
        polygon.use_smooth = True

    # Ortho scale is the horizontal camera span in this wide render. 7.0
    # leaves enough transparent room for the irregular top/bottom edges.
    add_camera(scene, (0.0, -1.18, 7.7), (0.0, 0.0, 0.02), 7.0)
    add_area_light(scene, "PaperKey", (-3.0, -4.0, 7.0), 620.0, 5.5, (1.0, 0.78, 0.60), (0.0, 0.0, 0.0))
    add_area_light(scene, "PaperFill", (4.0, -2.0, 5.0), 380.0, 4.5, (0.62, 0.80, 1.0), (0.0, 0.0, 0.0))
    add_area_light(scene, "PaperRim", (0.0, 3.0, 5.0), 300.0, 3.5, (1.0, 0.91, 0.73), (0.0, 0.0, 0.0))
    bpy.ops.render.render(write_still=True)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    bpy.data.images["Render Result"].save_render(str(PAPER_REVIEW), scene=scene)
    scene.render.image_settings.file_format = "WEBP"


def main() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    REJECTED_DIR.mkdir(parents=True, exist_ok=True)
    HAND_REVIEW.parent.mkdir(parents=True, exist_ok=True)
    hand_scene = reset_file()
    build_hand(hand_scene)

    paper_scene = bpy.data.scenes.new("PaperSlip")
    bpy.context.window.scene = paper_scene
    build_paper(paper_scene)

    bpy.context.window.scene = hand_scene
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_OUT), compress=True)
    print(f"Rendered hand: {HAND_OUT}")
    print(f"Rendered paper: {PAPER_OUT}")
    print(f"Saved source: {BLEND_OUT}")


if __name__ == "__main__":
    main()
