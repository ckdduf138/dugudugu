"""Build Dugudugu's image-authored fortune-cookie cutscene GLB.

Run with:
  blender -b --python scripts/blender/build_fortune_cookie.py

The source renders were generated specifically for Dugudugu, then cleaned,
alpha-matted, resized, split into independently animated fracture halves, and
packed into a reproducible GLB here. The delivery asset contains no paper,
plate, text, or decorative prop.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = ROOT / "scripts" / "assets" / "fortune-cookie-renders"
STAGE_DIR = SOURCE_DIR / "stages"
STATE_SOURCES = tuple(
    STAGE_DIR / f"state-{step:02d}.png" for step in range(11)
)
OUT = ROOT / "public" / "models" / "fortune" / "fortune-cookie.glb"
HERO_PREVIEW = Path("/tmp/dugudugu-fortune-v3-hero.png")
CRACK_PREVIEW = Path("/tmp/dugudugu-fortune-v3-crack.png")
PROCESSED_LEFT = Path("/tmp/dugudugu-fortune-left.png")
PROCESSED_RIGHT = Path("/tmp/dugudugu-fortune-right.png")
MAX_BYTES = 1_000_000
TEXTURE_WIDTH = 512
TEXTURE_HEIGHT = 384
FPS = 30
SNAP_FRAME = 11
CLIP_END = 30
FINAL_SHELL_SCALE = (0.88, 1.0, 1.0)
ASSET_OBJECTS: list[bpy.types.Object] = []


def remember(obj: bpy.types.Object) -> bpy.types.Object:
    if obj not in ASSET_OBJECTS:
        ASSET_OBJECTS.append(obj)
    return obj


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.images,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def smoothstep(edge_a: float, edge_b: float, value: float) -> float:
    if value <= edge_a:
        return 0.0
    if value >= edge_b:
        return 1.0
    unit = (value - edge_a) / (edge_b - edge_a)
    return unit * unit * (3.0 - 2.0 * unit)


def clean_render(
    source_path: Path,
    output_path: Path,
    *,
    keep_side: str | None = None,
) -> bpy.types.Image:
    """Remove the generated neutral checker and optionally isolate one half."""
    if not source_path.exists():
        raise FileNotFoundError(f"Missing fortune-cookie render: {source_path}")

    source = bpy.data.images.load(str(source_path), check_existing=False)
    source.scale(TEXTURE_WIDTH, TEXTURE_HEIGHT)
    pixels = list(source.pixels[:])
    cleaned = [0.0] * len(pixels)

    for pixel in range(TEXTURE_WIDTH * TEXTURE_HEIGHT):
        offset = pixel * 4
        red, green, blue = pixels[offset : offset + 3]
        x = pixel % TEXTURE_WIDTH

        # The source background is neutral grayscale while every cookie pixel
        # is warm. Chroma-keying red-vs-blue preserves pale antialiased edges
        # more reliably than a luminance threshold.
        warmth = red - blue
        alpha = smoothstep(0.018, 0.095, warmth)
        if keep_side == "left" and x >= TEXTURE_WIDTH // 2:
            alpha = 0.0
        elif keep_side == "right" and x < TEXTURE_WIDTH // 2:
            alpha = 0.0

        # Neutral edge contamination creates a white fringe on cream. Blend
        # partial-alpha RGB toward the baked wafer color before packing.
        edge_cleanup = 1.0 - alpha
        red = red * alpha + 0.91 * edge_cleanup
        green = green * alpha + 0.52 * edge_cleanup
        blue = blue * alpha + 0.12 * edge_cleanup
        cleaned[offset : offset + 4] = (red, green, blue, alpha)

    image = bpy.data.images.new(
        output_path.stem,
        width=TEXTURE_WIDTH,
        height=TEXTURE_HEIGHT,
        alpha=True,
    )
    image.alpha_mode = "STRAIGHT"
    image.colorspace_settings.name = "sRGB"
    image.pixels[:] = cleaned
    image.filepath_raw = str(output_path)
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(source)
    return image


def image_material(
    name: str,
    image: bpy.types.Image,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.surface_render_method = "DITHERED"
    material.use_transparency_overlap = False
    material.diffuse_color = (1, 1, 1, 1)

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = image
    texture.interpolation = "Linear"

    shader.inputs["Roughness"].default_value = 0.92
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = 0.16
    shader.inputs["Emission Strength"].default_value = 0.7
    links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    links.new(texture.outputs["Color"], shader.inputs["Emission Color"])
    links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    return material


def flat_material(
    name: str,
    color: tuple[float, float, float, float],
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.surface_render_method = "DITHERED"
    material.diffuse_color = color
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError(f"{name} has no Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Alpha"].default_value = color[3]
    shader.inputs["Roughness"].default_value = 1.0
    return material


def empty(
    name: str,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    obj = remember(bpy.data.objects.new(name, None))
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def image_plane(
    name: str,
    material: bpy.types.Material,
    parent: bpy.types.Object,
) -> bpy.types.Object:
    half_width = 2.0
    half_height = 1.5
    vertices = [
        (-half_width, 0, -half_height),
        (half_width, 0, -half_height),
        (half_width, 0, half_height),
        (-half_width, 0, half_height),
    ]
    faces = [(0, 1, 2, 3)]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.uv_layers.new(name="UVMap")
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]
    for loop in mesh.loops:
        mesh.uv_layers.active.data[loop.index].uv = uvs[loop.vertex_index]
    mesh.materials.append(material)
    mesh.update()

    obj = remember(bpy.data.objects.new(name, mesh))
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def ground_shadow(parent: bpy.types.Object) -> bpy.types.Object:
    vertices = [(0.0, 0.0, 0.0)]
    segments = 64
    for segment in range(segments):
        angle = math.tau * segment / segments
        vertices.append(
            (
                1.52 * math.cos(angle),
                0.0,
                0.22 * math.sin(angle),
            )
        )
    faces = [
        (0, segment + 1, (segment + 1) % segments + 1)
        for segment in range(segments)
    ]
    mesh = bpy.data.meshes.new("GroundShadowMesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(SHADOW)
    mesh.update()

    obj = remember(bpy.data.objects.new("GroundShadow", mesh))
    bpy.context.collection.objects.link(obj)
    obj.location = (0, 0.08, -0.97)
    obj.parent = parent
    return obj


def keyframe_transform(
    obj: bpy.types.Object,
    frame: int,
    *,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float],
    scale: tuple[float, float, float],
) -> None:
    obj.location = location
    obj.rotation_euler = rotation
    obj.scale = scale
    obj.keyframe_insert("location", frame=frame)
    obj.keyframe_insert("rotation_euler", frame=frame)
    obj.keyframe_insert("scale", frame=frame)


def seal_clip(obj: bpy.types.Object) -> None:
    animation = obj.animation_data
    if animation is None or animation.action is None:
        return
    action = animation.action
    action.name = f"{obj.name}_CrackReveal"


def _author_legacy_tap_clip(
    motion: bpy.types.Object,
    left: bpy.types.Object,
    right: bpy.types.Object,
) -> None:
    # Ten authored tap beats. Each segment contains its own impact and recovery
    # instead of stretching a few poses over the interaction. Linear keys keep
    # the wafer brittle and avoid the floaty interpolation of earlier drafts.
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "LINEAR"
    for frame, location, rotation, scale in (
        (1, (0, 0, 0), (0, 0, 0), (1, 1, 1)),
        # Taps 1–4: increasingly firm presses with alternating dry recoil.
        (
            3,
            (-0.012, 0, -0.035),
            (0, math.radians(-0.6), 0),
            (1.025, 1, 0.965),
        ),
        (
            6,
            (0, 0, 0.008),
            (0, math.radians(0.15), 0),
            (1.003, 1, 0.996),
        ),
        (
            8,
            (0.015, 0, -0.05),
            (0, math.radians(0.8), 0),
            (1.035, 1, 0.94),
        ),
        (
            11,
            (0, 0, 0.012),
            (0, math.radians(-0.12), 0),
            (1.005, 1, 0.993),
        ),
        (
            13,
            (-0.018, 0, -0.065),
            (0, math.radians(-1.0), 0),
            (1.048, 1, 0.915),
        ),
        (
            16,
            (0, 0, 0.018),
            (0, math.radians(0.15), 0),
            (1.008, 1, 0.989),
        ),
        (
            18,
            (0.02, 0, -0.085),
            (0, math.radians(1.2), 0),
            (1.06, 1, 0.88),
        ),
        (
            21,
            (0, 0, 0.025),
            (0, math.radians(-0.1), 0),
            (1.012, 1, 0.984),
        ),
        # Tap 5: the center score appears with a short upward recoil.
        (23, (0, 0, -0.095), (0, 0, 0), (1.07, 1, 0.85)),
        (24, (0, 0, 0.075), (0, 0, 0), (0.985, 1, 1.045)),
        (27, (0, 0, 0.04), (0, 0, 0), (1, 1, 1)),
        # Taps 6–9: separate impacts widen the fracture, then settle.
        (
            29,
            (-0.012, 0, 0.005),
            (0, math.radians(-0.45), 0),
            (1.025, 1, 0.96),
        ),
        (
            31,
            (0.006, 0, 0.105),
            (0, math.radians(0.35), 0),
            (0.99, 1, 1.03),
        ),
        (34, (0, 0, 0.055), (0, 0, 0), (1, 1, 1)),
        (
            36,
            (0.014, 0, 0.015),
            (0, math.radians(0.55), 0),
            (1.03, 1, 0.95),
        ),
        (
            38,
            (-0.006, 0, 0.125),
            (0, math.radians(-0.4), 0),
            (0.987, 1, 1.035),
        ),
        (41, (0, 0, 0.07), (0, 0, 0), (1, 1, 1)),
        (
            43,
            (-0.016, 0, 0.02),
            (0, math.radians(-0.7), 0),
            (1.034, 1, 0.94),
        ),
        (
            45,
            (0.008, 0, 0.145),
            (0, math.radians(0.5), 0),
            (0.985, 1, 1.04),
        ),
        (48, (0, 0, 0.085), (0, 0, 0), (1, 1, 1)),
        (
            50,
            (0.018, 0, 0.025),
            (0, math.radians(0.85), 0),
            (1.04, 1, 0.925),
        ),
        (
            52,
            (-0.009, 0, 0.165),
            (0, math.radians(-0.6), 0),
            (0.982, 1, 1.045),
        ),
        (55, (0, 0, 0.1), (0, 0, 0), (1, 1, 1)),
        # Tap 10: hard compression, brittle snap, overshoot, and dry settle.
        (57, (0, 0, 0.015), (0, 0, 0), (1.055, 1, 0.9)),
        (59, (0, 0, 0.2), (0, 0, 0), (0.975, 1, 1.06)),
        (62, (0, 0, 0.25), (0, 0, 0), (0.992, 1, 1.02)),
        (66, (0, 0, 0.175), (0, 0, 0), (1.006, 1, 0.988)),
        (CLIP_END, (0, 0, 0.2), (0, 0, 0), (1, 1, 1)),
    ):
        keyframe_transform(
            motion,
            frame,
            location=location,
            rotation=rotation,
            scale=scale,
        )

    for obj, direction in ((left, -1), (right, 1)):
        for frame, x, z, angle in (
            (1, 0.0, 0.0, 0.0),
            (21, 0.0, 0.0, 0.0),
            # Tap 5: first visible score.
            (23, 0.0, 0.0, 0.0),
            (24, 0.012, 0.035, 0.6),
            (27, 0.018, 0.02, 0.5),
            # Tap 6.
            (29, 0.014, 0.005, 0.35),
            (31, 0.038, 0.07, 1.2),
            (34, 0.03, 0.035, 0.9),
            # Tap 7.
            (36, 0.025, 0.012, 0.7),
            (38, 0.062, 0.09, 1.8),
            (41, 0.05, 0.045, 1.4),
            # Tap 8.
            (43, 0.042, 0.018, 1.2),
            (45, 0.09, 0.105, 2.4),
            (48, 0.074, 0.04, 1.8),
            # Tap 9.
            (50, 0.064, 0.012, 1.55),
            (52, 0.125, 0.095, 3.1),
            (55, 0.098, 0.025, 2.2),
            # Tap 10.
            (57, 0.08, -0.01, 1.8),
            (59, 0.2, 0.16, 5.0),
            (62, 0.25, 0.08, 5.5),
            (66, 0.15, -0.04, 2.8),
            (CLIP_END, 0.115, -0.015, 2.0),
        ):
            keyframe_transform(
                obj,
                frame,
                location=(direction * x, -0.01, z),
                rotation=(0, math.radians(direction * angle), 0),
                scale=(1, 1, 1),
            )

    for obj in (motion, left, right):
        seal_clip(obj)


def author_clip(
    motion: bpy.types.Object,
    left: bpy.types.Object,
    right: bpy.types.Object,
) -> None:
    """Author one continuous press, brittle snap, short recoil, and settle."""
    bpy.context.preferences.edit.keyframe_new_interpolation_type = "BEZIER"
    bpy.context.preferences.edit.keyframe_new_handle_type = "AUTO_CLAMPED"

    for frame, location, rotation, scale in (
        (1, (0, 0, 0), (0, 0, 0), (1, 1, 1)),
        (7, (0, 0, -0.01), (0, 0, 0), (1.015, 1, 0.98)),
        # The intact wafer holds this pressure pose before visibility swaps.
        (10, (0, 0, -0.03), (0, 0, 0), (1.055, 1, 0.9)),
        # A two-frame release makes the snap dry rather than elastic.
        (12, (0, 0, 0.09), (0, 0, 0), (0.985, 1, 1.045)),
        (16, (0, 0, 0.21), (0, 0, 0), (0.995, 1, 1.015)),
        (22, (0, 0, 0.17), (0, 0, 0), (1.006, 1, 0.988)),
        (CLIP_END, (0, 0, 0.2), (0, 0, 0), (1, 1, 1)),
    ):
        keyframe_transform(
            motion,
            frame,
            location=location,
            rotation=rotation,
            scale=scale,
        )

    for obj, direction in ((left, -1), (right, 1)):
        for frame, x, z, angle in (
            # The broken render already contains a center gap. Start both
            # hidden halves shifted inward so their fracture faces meet at the
            # visibility switch, then open them continuously.
            (1, -0.135, 0.0, 0.0),
            (10, -0.135, 0.0, 0.0),
            (12, -0.08, 0.035, 1.2),
            (16, 0.03, 0.045, 2.8),
            (22, 0.095, -0.02, 2.4),
            (CLIP_END, 0.115, -0.015, 2.0),
        ):
            keyframe_transform(
                obj,
                frame,
                location=(direction * x, -0.01, z),
                rotation=(0, math.radians(direction * angle), 0),
                scale=(1, 1, 1),
            )

    for obj in (motion, left, right):
        seal_clip(obj)


def build_asset() -> bpy.types.Object:
    # The delivery asset uses only one intact render and one split render.
    # Intermediate source studies remain preserved for audit but are not
    # shipped; continuous transforms now carry the motion.
    intact_image = clean_render(
        STATE_SOURCES[0],
        Path("/tmp/dugudugu-fortune-intact.png"),
    )
    left_image = clean_render(
        STATE_SOURCES[10],
        PROCESSED_LEFT,
        keep_side="left",
    )
    right_image = clean_render(
        STATE_SOURCES[10],
        PROCESSED_RIGHT,
        keep_side="right",
    )

    root = empty("CookieRig")
    motion = empty("CookieMotion", root)
    intact = image_plane(
        "CookieIntact",
        image_material("Dugu_CookieState00", intact_image),
        motion,
    )
    intact.scale = (1, 1, 1)
    left = empty("CookieLeft", motion)
    right = empty("CookieRight", motion)
    left_shell = image_plane(
        "CookieLeftShell",
        image_material("Dugu_CookieBrokenLeft", left_image),
        left,
    )
    right_shell = image_plane(
        "CookieRightShell",
        image_material("Dugu_CookieBrokenRight", right_image),
        right,
    )
    left_shell.scale = FINAL_SHELL_SCALE
    right_shell.scale = FINAL_SHELL_SCALE
    ground_shadow(root)
    author_clip(motion, left, right)

    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = CLIP_END
    bpy.context.scene.render.fps = FPS
    bpy.context.scene.frame_set(1)
    intact["source"] = (
        "Original Dugudugu intact and broken fortune-cookie renders generated "
        "2026-07-29; alpha cleanup, delivery split, and continuous snap "
        "animation authored in Blender"
    )
    root["cutscene"] = "CrackReveal"
    root["interaction_count"] = 1
    root["visual_step_count"] = 1
    root["image_state_count"] = 2
    root["image_state_nodes"] = "CookieIntact,CookieLeft+CookieRight"
    root["snap_frame"] = SNAP_FRAME
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
        export_animations=True,
        export_animation_mode="ACTIVE_ACTIONS",
        export_nla_strips_merged_animation_name="CrackReveal",
        export_apply=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_image_format="AUTO",
    )
    if OUT.stat().st_size > MAX_BYTES:
        raise RuntimeError(
            f"Fortune GLB is {OUT.stat().st_size:,} bytes; cap is {MAX_BYTES:,}"
        )


def look_at(
    obj: bpy.types.Object,
    target: tuple[float, float, float],
) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat(
        "-Z", "Y"
    ).to_euler()


def render_previews() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 840
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.world.color = (0.96, 0.91, 0.83)
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.96, 0.91, 0.83, 1)
    background.inputs["Strength"].default_value = 0.8

    bpy.ops.object.camera_add(location=(0, -8.0, 0.18))
    camera = bpy.context.object
    camera.data.lens = 58
    look_at(camera, (0, 0, 0.02))
    scene.camera = camera

    intact = bpy.data.objects["CookieIntact"]
    halves = (
        bpy.data.objects["CookieLeftShell"],
        bpy.data.objects["CookieRightShell"],
    )

    scene.frame_set(1)
    intact.hide_render = False
    for obj in halves:
        obj.hide_render = True
    scene.render.filepath = str(HERO_PREVIEW)
    bpy.ops.render.render(write_still=True)

    scene.frame_set(CLIP_END)
    intact.hide_render = True
    for obj in halves:
        obj.hide_render = False
    scene.render.filepath = str(CRACK_PREVIEW)
    bpy.ops.render.render(write_still=True)


clear_scene()
SHADOW = flat_material(
    "Dugu_CookieGroundShadow",
    (0.18, 0.08, 0.035, 0.13),
)
asset_root = build_asset()
export_asset(asset_root)
render_previews()
print(f"Fortune cookie exported to {OUT} ({OUT.stat().st_size:,} bytes)")
print(f"Hero preview: {HERO_PREVIEW}")
print(f"Crack preview: {CRACK_PREVIEW}")
