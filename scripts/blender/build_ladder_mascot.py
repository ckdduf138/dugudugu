"""Build Dugudugu's rigged ladder mascot and deterministic card renders.

Run with:
  blender -b --python scripts/blender/build_ladder_mascot.py

No downloaded textures or generated inputs are used.  The GLB keeps stable
node/material names for the R3F runtime and includes two authored clips:
``Idle`` and ``Travel``.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public" / "models" / "ladder" / "ladder-mascot.glb"
PREVIEW = Path("/tmp/dugudugu-ladder-preview.png")
CARD = ROOT / "public" / "images" / "games" / "ladder.webp"

ASSET_OBJECTS: list[bpy.types.Object] = []


def clear_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.armatures,
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
    roughness: float = 0.38,
    metallic: float = 0.0,
    coat: float = 0.28,
    emission: float = 0.0,
) -> bpy.types.Material:
    value = color.removeprefix("#")
    rgb = tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.2
    if emission:
        emission_key = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        bsdf.inputs[emission_key].default_value = (*rgb, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    mat.diffuse_color = (*rgb, 1.0)
    return mat


BODY = material("BodyColor", "#ff7eb6", roughness=0.34, coat=0.42)
BELLY = material("FaceCream", "#fff7e9", roughness=0.48, coat=0.14)
INNER_EAR = material("InnerEar", "#ffb4c9", roughness=0.43, coat=0.18)
EYE = material("EyeGloss", "#2f2537", roughness=0.09, coat=0.8)
EYE_SPARK = material("EyeSpark", "#ffffff", roughness=0.08, coat=0.75, emission=0.14)
CHEEK = material("Cheek", "#ff8ea5", roughness=0.42, coat=0.12)
NOSE = material("Nose", "#b65f7c", roughness=0.3, coat=0.45)
ACCENT = material("AccentColor", "#ffd45e", roughness=0.32, coat=0.38)
SOLE = material("Sole", "#55405d", roughness=0.52, coat=0.12)


def smooth(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return
    for polygon in obj.data.polygons:
        polygon.use_smooth = True


def apply_bevel(obj: bpy.types.Object, width: float, segments: int = 3) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("Soft bevel", "BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    smooth(obj)
    obj.select_set(False)


def sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    *,
    segments: int = 24,
    rings: int = 16,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=location,
        rotation=rotation,
    )
    obj = remember(bpy.context.object)
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    smooth(obj)
    obj.data.materials.append(mat)
    return obj


def cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
    vertices: int = 20,
    bevel: float = 0.025,
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
    return obj


def torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    mat: bpy.types.Material,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_radius,
        minor_radius=minor_radius,
        major_segments=28,
        minor_segments=10,
        location=location,
        rotation=rotation,
    )
    obj = remember(bpy.context.object)
    obj.name = name
    smooth(obj)
    obj.data.materials.append(mat)
    return obj


def make_armature() -> bpy.types.Object:
    data = bpy.data.armatures.new("LadderMascotRig")
    armature = remember(bpy.data.objects.new("LadderMascotRig", data))
    bpy.context.collection.objects.link(armature)
    armature.show_in_front = True
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")

    def bone(
        name: str,
        head: tuple[float, float, float],
        tail: tuple[float, float, float],
        parent: str | None = None,
    ) -> bpy.types.EditBone:
        edit_bone = data.edit_bones.new(name)
        edit_bone.head = head
        edit_bone.tail = tail
        if parent:
            edit_bone.parent = data.edit_bones[parent]
        return edit_bone

    bone("Root", (0, 0, 0.03), (0, 0, 0.28))
    bone("Body", (0, 0, 0.3), (0, 0, 0.91), "Root")
    bone("Head", (0, 0, 0.89), (0, 0, 1.44), "Body")
    bone("Ear.L", (-0.25, 0, 1.42), (-0.31, 0, 1.78), "Head")
    bone("Ear.R", (0.25, 0, 1.42), (0.31, 0, 1.78), "Head")
    bone("Arm.L", (-0.21, 0, 0.78), (-0.34, -0.015, 0.42), "Body")
    bone("Arm.R", (0.21, 0, 0.78), (0.34, -0.015, 0.42), "Body")
    bone("Leg.L", (-0.13, 0, 0.45), (-0.14, -0.01, 0.11), "Body")
    bone("Leg.R", (0.13, 0, 0.45), (0.14, -0.01, 0.11), "Body")
    bpy.ops.object.mode_set(mode="POSE")
    for pose_bone in armature.pose.bones:
        pose_bone.rotation_mode = "XYZ"
    bpy.ops.object.mode_set(mode="OBJECT")
    armature.select_set(False)
    return armature


def rigid_bind(
    obj: bpy.types.Object,
    armature: bpy.types.Object,
    bone_name: str,
) -> bpy.types.Object:
    group = obj.vertex_groups.new(name=bone_name)
    group.add(range(len(obj.data.vertices)), 1.0, "REPLACE")
    obj.parent = armature
    obj.matrix_parent_inverse = armature.matrix_world.inverted()
    modifier = obj.modifiers.new("Mascot rig", "ARMATURE")
    modifier.object = armature
    return obj


def build_mascot() -> bpy.types.Object:
    armature = make_armature()

    # Pear-shaped body and oversized head establish a readable 28–40 px token.
    rigid_bind(sphere("Body", (0, 0, 0.65), (0.285, 0.23, 0.355), BODY), armature, "Body")
    rigid_bind(sphere("Belly", (0, -0.205, 0.62), (0.19, 0.055, 0.235), BELLY), armature, "Body")
    rigid_bind(sphere("Tail", (0, 0.205, 0.67), (0.145, 0.13, 0.145), BODY), armature, "Body")

    rigid_bind(sphere("Head", (0, -0.01, 1.23), (0.43, 0.35, 0.39), BODY), armature, "Head")
    rigid_bind(sphere("Muzzle", (0, -0.335, 1.12), (0.235, 0.085, 0.145), BELLY), armature, "Head")
    rigid_bind(sphere("Nose", (0, -0.41, 1.16), (0.052, 0.032, 0.042), NOSE, segments=18, rings=12), armature, "Head")

    for side, x in (("L", -0.155), ("R", 0.155)):
        rigid_bind(sphere(f"Eye.{side}", (x, -0.323, 1.31), (0.082, 0.047, 0.105), EYE, segments=24, rings=16), armature, "Head")
        rigid_bind(sphere(f"EyeSpark.{side}", (x - 0.02, -0.365, 1.35), (0.023, 0.012, 0.029), EYE_SPARK, segments=16, rings=10), armature, "Head")
        rigid_bind(sphere(f"Cheek.{side}", (x * 1.38, -0.347, 1.13), (0.06, 0.018, 0.035), CHEEK, segments=16, rings=10), armature, "Head")

    # Tall soft ears and a three-piece forehead tuft make the silhouette unique.
    for side, x in (("L", -0.29), ("R", 0.29)):
        bone_name = f"Ear.{side}"
        rigid_bind(sphere(f"Ear.{side}", (x, -0.005, 1.61), (0.16, 0.105, 0.32), BODY, segments=22, rings=14, rotation=(0, math.radians(-8 if side == "L" else 8), 0)), armature, bone_name)
        rigid_bind(sphere(f"InnerEar.{side}", (x, -0.097, 1.61), (0.087, 0.027, 0.22), INNER_EAR, segments=18, rings=12, rotation=(0, math.radians(-8 if side == "L" else 8), 0)), armature, bone_name)

    for index, (x, z, angle) in enumerate(((-0.12, 1.55, -22), (0, 1.59, 0), (0.12, 1.55, 22))):
        rigid_bind(sphere(f"Tuft.{index}", (x, -0.105, z), (0.11, 0.085, 0.18), BODY, segments=18, rings=12, rotation=(0, math.radians(angle), 0)), armature, "Head")

    # Separate rigidly skinned limbs keep the toy curves while the rig supplies
    # real authored weight shifts rather than procedural sine-wave limbs.
    for side, x in (("L", -0.30), ("R", 0.30)):
        rigid_bind(sphere(f"Arm.{side}", (x, -0.015, 0.63), (0.105, 0.095, 0.255), BODY, segments=20, rings=14, rotation=(0, math.radians(-8 if side == "L" else 8), 0)), armature, f"Arm.{side}")
    for side, x in (("L", -0.135), ("R", 0.135)):
        rigid_bind(sphere(f"Leg.{side}", (x, -0.005, 0.26), (0.115, 0.11, 0.215), BODY, segments=20, rings=14), armature, f"Leg.{side}")
        rigid_bind(sphere(f"Foot.{side}", (x, -0.105, 0.09), (0.155, 0.205, 0.10), SOLE, segments=20, rings=12), armature, f"Leg.{side}")

    rigid_bind(torus("Collar", (0, 0, 0.91), 0.22, 0.043, ACCENT), armature, "Body")
    rigid_bind(sphere("CollarBell", (0, -0.235, 0.9), (0.075, 0.045, 0.075), ACCENT, segments=18, rings=12), armature, "Body")

    return armature


def join_skinned_parts(armature: bpy.types.Object) -> None:
    """Collapse authored pieces to one skinned mesh per material.

    The character is still edited as friendly separate primitives above, but the
    shipped scene renders each mascot in nine draws instead of 27. Grouping by
    material also avoids Blender's join operator replacing face slot indices.
    """
    mesh_parts = [obj for obj in ASSET_OBJECTS if obj.type == "MESH"]
    non_mesh = [obj for obj in ASSET_OBJECTS if obj.type != "MESH"]
    groups: dict[str, list[bpy.types.Object]] = {}
    for obj in mesh_parts:
        material_name = obj.data.materials[0].name
        groups.setdefault(material_name, []).append(obj)

    joined_parts: list[bpy.types.Object] = []
    for material_name, parts in groups.items():
        bpy.ops.object.select_all(action="DESELECT")
        for obj in parts:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        if len(parts) > 1:
            bpy.ops.object.join()
        joined = bpy.context.object
        joined.name = f"MascotMesh_{material_name}"
        joined_parts.append(joined)

    ASSET_OBJECTS[:] = [*non_mesh, *joined_parts]
    bpy.context.view_layer.objects.active = armature


def reset_pose(armature: bpy.types.Object) -> None:
    for bone in armature.pose.bones:
        bone.location = (0, 0, 0)
        bone.rotation_euler = (0, 0, 0)
        bone.scale = (1, 1, 1)


def key_bone(
    armature: bpy.types.Object,
    name: str,
    frame: int,
    *,
    location: tuple[float, float, float] | None = None,
    rotation: tuple[float, float, float] | None = None,
    scale: tuple[float, float, float] | None = None,
) -> None:
    bone = armature.pose.bones[name]
    if location is not None:
        bone.location = location
        bone.keyframe_insert("location", frame=frame, group=name)
    if rotation is not None:
        bone.rotation_euler = rotation
        bone.keyframe_insert("rotation_euler", frame=frame, group=name)
    if scale is not None:
        bone.scale = scale
        bone.keyframe_insert("scale", frame=frame, group=name)


def build_actions(armature: bpy.types.Object) -> None:
    armature.animation_data_create()

    idle = bpy.data.actions.new("Idle")
    idle.use_fake_user = True
    armature.animation_data.action = idle
    for frame, lift, lean in ((1, 0.0, -0.025), (16, 0.035, 0.025), (31, 0.0, -0.025)):
        reset_pose(armature)
        key_bone(armature, "Root", frame, location=(0, 0, lift))
        key_bone(armature, "Body", frame, rotation=(lean, 0, 0), scale=(1, 1, 1 - lift * 0.35))
        key_bone(armature, "Head", frame, rotation=(-lean * 1.7, 0, math.sin(frame / 15 * math.pi) * 0.018))
        key_bone(armature, "Arm.L", frame, rotation=(-lean * 1.8, 0, -0.025))
        key_bone(armature, "Arm.R", frame, rotation=(lean * 1.8, 0, 0.025))
        key_bone(armature, "Ear.L", frame, rotation=(lean * 0.7, 0, -0.018))
        key_bone(armature, "Ear.R", frame, rotation=(-lean * 0.7, 0, 0.018))
    idle.frame_start = 1
    idle.frame_end = 31

    travel = bpy.data.actions.new("Travel")
    travel.use_fake_user = True
    armature.animation_data.action = travel
    for frame, swing, lift in ((1, -1.0, 0.0), (7, 0.0, 0.085), (13, 1.0, 0.0), (19, 0.0, 0.085), (25, -1.0, 0.0)):
        reset_pose(armature)
        key_bone(armature, "Root", frame, location=(0, 0, lift))
        key_bone(armature, "Body", frame, rotation=(swing * 0.045, 0, -swing * 0.028), scale=(1 + lift * 0.25, 1, 1 - lift * 0.4))
        key_bone(armature, "Head", frame, rotation=(-swing * 0.055 - lift * 0.25, 0, swing * 0.025))
        key_bone(armature, "Arm.L", frame, rotation=(swing * 0.64, 0, -0.04))
        key_bone(armature, "Arm.R", frame, rotation=(-swing * 0.64, 0, 0.04))
        key_bone(armature, "Leg.L", frame, rotation=(-swing * 0.58, 0, 0))
        key_bone(armature, "Leg.R", frame, rotation=(swing * 0.58, 0, 0))
        key_bone(armature, "Ear.L", frame, rotation=(-lift * 0.9, 0, -swing * 0.035))
        key_bone(armature, "Ear.R", frame, rotation=(-lift * 0.9, 0, swing * 0.035))
    travel.frame_start = 1
    travel.frame_end = 25

    armature.animation_data.action = idle
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 31
    bpy.context.scene.render.fps = 30


def export_asset(armature: bpy.types.Object) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in ASSET_OBJECTS:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_merge_animation="ACTION",
        export_nla_strips=True,
        export_optimize_animation_size=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_render_lights(target: tuple[float, float, float]) -> None:
    bpy.ops.object.light_add(type="AREA", location=(4.2, -5.8, 6.5))
    key = bpy.context.object
    key.data.energy = 900
    key.data.shape = "DISK"
    key.data.size = 4.0
    key.data.color = (1.0, 0.78, 0.72)
    point_at(key, target)

    bpy.ops.object.light_add(type="AREA", location=(-4.5, -2.2, 3.8))
    fill = bpy.context.object
    fill.data.energy = 700
    fill.data.size = 3.8
    fill.data.color = (0.54, 0.76, 1.0)
    point_at(fill, target)

    bpy.ops.object.light_add(type="AREA", location=(1.5, 4.0, 5.5))
    rim = bpy.context.object
    rim.data.energy = 1050
    rim.data.size = 3.2
    rim.data.color = (0.72, 0.56, 1.0)
    point_at(rim, target)


def configure_render(
    path: Path,
    width: int,
    height: int,
    world: tuple[float, float, float],
    *,
    transparent: bool = False,
) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP" if path.suffix == ".webp" else "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 92
    scene.render.filepath = str(path)
    scene.render.film_transparent = transparent
    scene.world.color = world


def add_rounded_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    bevel: float,
    *,
    rotation: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = tuple(value / 2 for value in scale)
    apply_bevel(obj, bevel)
    obj.data.materials.append(mat)
    return obj


def render_preview(armature: bpy.types.Object) -> None:
    configure_render(PREVIEW, 680, 760, (0.035, 0.047, 0.075))
    bpy.context.scene.frame_set(7)

    floor_mat = material("PreviewFloor", "#dff2e2", roughness=0.8, coat=0.0)
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, 0))
    floor = bpy.context.object
    floor.data.materials.append(floor_mat)
    add_render_lights((0, 0, 0.9))

    bpy.ops.object.camera_add(location=(3.7, -6.5, 3.05))
    camera = bpy.context.object
    camera.data.lens = 64
    point_at(camera, (0, 0, 0.9))
    bpy.context.scene.camera = camera
    bpy.ops.render.render(write_still=True)

    # Remove preview-only nodes so the card scene can be composed cleanly.
    for obj in list(bpy.context.scene.objects):
        if obj not in ASSET_OBJECTS:
            bpy.data.objects.remove(obj, do_unlink=True)
    armature.animation_data.action = bpy.data.actions.get("Idle")
    bpy.context.scene.frame_set(16)


def render_card(armature: bpy.types.Object) -> None:
    CARD.parent.mkdir(parents=True, exist_ok=True)
    configure_render(CARD, 640, 480, (0.94, 0.97, 1.0), transparent=True)

    cream = material("CardCream", "#fff8ee", roughness=0.52, coat=0.12)
    sky = material("CardSky", "#9edbff", roughness=0.38, coat=0.26)
    pink = material("CardPink", "#ff7eb6", roughness=0.34, coat=0.34)
    mint = material("CardMint", "#62ddb9", roughness=0.4, coat=0.24)
    ink = material("CardInk", "#55405d", roughness=0.48, coat=0.12)
    lemon = material("CardLemon", "#ffd45e", roughness=0.34, coat=0.34)

    # A compact 3/4 product-view version of the in-app tabletop board.
    add_rounded_box("CardBase", (0, 0.18, 0.16), (4.9, 2.4, 0.28), cream, 0.12)
    add_rounded_box("CardBack", (0, 0.92, 2.25), (4.35, 0.28, 3.55), sky, 0.16, rotation=(math.radians(-8), 0, 0))
    for x in (-1.5, -0.5, 0.5, 1.5):
        cylinder("CardRail", (x, 0.61, 2.35), 0.052, 2.6, ink, vertices=16, bevel=0.018)
    for z, left in ((2.95, -1.5), (2.55, -0.5), (2.15, 0.5), (1.75, -0.5), (1.35, 0.5)):
        cylinder("CardRung", (left + 0.5, 0.58, z), 0.052, 1.0, pink if z > 2 else mint, rotation=(0, math.pi / 2, 0), vertices=16, bevel=0.018)
    for x in (-1.5, -0.5, 0.5, 1.5):
        add_rounded_box("CardSlot", (x, 0.42, 0.78), (0.62, 0.52, 0.34), lemon, 0.1)
    for x in (-2.22, 2.22):
        cylinder("CardPost", (x, 0.35, 2.25), 0.16, 3.45, pink, vertices=24, bevel=0.05)
        sphere("CardPostCap", (x, 0.35, 4.0), (0.25, 0.25, 0.25), lemon, segments=20, rings=14)

    armature.location = (-0.5, -0.37, 0.38)
    armature.scale = (0.95, 0.95, 0.95)
    armature.rotation_euler = (0, 0, math.radians(-8))
    armature.animation_data.action = bpy.data.actions.get("Travel")
    bpy.context.scene.frame_set(7)

    add_render_lights((0, 0.35, 1.9))

    bpy.ops.object.camera_add(location=(6.9, -9.2, 6.0))
    camera = bpy.context.object
    camera.data.lens = 58
    point_at(camera, (0, 0.5, 2.05))
    bpy.context.scene.camera = camera
    bpy.ops.render.render(write_still=True)


def validate_export() -> None:
    if not OUT.exists():
        raise RuntimeError(f"GLB export failed: {OUT}")
    if OUT.stat().st_size > 2 * 1024 * 1024:
        raise RuntimeError(f"Ladder mascot exceeds 2 MB: {OUT.stat().st_size} bytes")


def main() -> None:
    clear_scene()
    ASSET_OBJECTS.clear()
    armature = build_mascot()
    join_skinned_parts(armature)
    build_actions(armature)
    export_asset(armature)
    validate_export()
    render_preview(armature)
    render_card(armature)
    print(f"Wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KiB)")
    print(f"Preview {PREVIEW}")
    print(f"Card {CARD}")


if __name__ == "__main__":
    main()
