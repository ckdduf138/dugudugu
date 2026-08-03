"""Build Dugudugu's race horse from Jungle Jim's CC BY 4.0 source.

Run with Blender 5.x:
  blender -b --python scripts/blender/build_cartoon_horse.py

The preserved Sketchfab ZIP supplies the mesh, skin, rig, painted texture and
one walk cycle. The free archive does not include its advertised paid run or
idle clips, so this script authors a closed 0.75 second Run and a quiet Idle
on the supplied rig. The delivery GLB intentionally contains only those two
actions and stays below the race route's 2 MB asset budget.

The imported horse faces Blender +Y. glTF converts that to -Z, so the runtime
wrapper rotates it -90 degrees around Y to face track +X.
"""

from __future__ import annotations

import math
import tempfile
import zipfile
from collections.abc import Iterator
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ZIP = ROOT / "scripts" / "assets" / "cartoon-horse" / "source.zip"
OUT = ROOT / "public" / "models" / "race" / "horse.glb"
CARD = ROOT / "public" / "images" / "games" / "race.webp"

QA_HERO = Path("/tmp/dugudugu-cartoon-horse-hero.png")
QA_RUN_DIR = Path("/tmp/dugudugu-cartoon-horse-run")

FPS = 24
RUN_END = 18
IDLE_END = 48
STRIDE_LENGTH = 1.95
MAX_GLB_BYTES = 2_000_000
MAX_TRIANGLES = 12_000

BODY_BONE = "body_023"
BODY_FOLLOW_BONES = ("body_bot_00", "body_top0_034", "body_top1_037")
NECK_BONES = ("neck0_038", "neck1_039", "head0_040")
TAIL_BONES = tuple(f"tail{index}_{17 + index:03d}" for index in range(5))


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def iter_action_fcurves(action: bpy.types.Action) -> Iterator[bpy.types.FCurve]:
    legacy_curves = getattr(action, "fcurves", None)
    if legacy_curves is not None:
        yield from legacy_curves
        return
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


def clear_scene() -> None:
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.actions, bpy.data.armatures, bpy.data.meshes, bpy.data.materials):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def imported_horse() -> tuple[bpy.types.Object, bpy.types.Object]:
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(armatures) != 1 or not meshes:
        raise RuntimeError(f"Unexpected source structure: armatures={len(armatures)} meshes={len(meshes)}")
    armature = armatures[0]
    horse = max(meshes, key=lambda obj: len(obj.data.vertices))
    if len(armature.data.bones) != 43 or len(horse.data.vertices) < 9_000:
        raise RuntimeError("The preserved Jungle Jim rig/mesh contract changed")

    keep: set[bpy.types.Object] = {armature, horse}
    for obj in tuple(keep):
        parent = obj.parent
        while parent is not None:
            keep.add(parent)
            parent = parent.parent
    for obj in list(bpy.context.scene.objects):
        if obj not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)

    armature.name = "HorseRig"
    armature.data.name = "HorseRig"
    horse.name = "HorseBody"
    horse.data.name = "HorseBody"
    return armature, horse


def source_action() -> bpy.types.Action:
    candidates = [action for action in bpy.data.actions if action.frame_range[1] >= 23.5]
    if len(candidates) != 1:
        raise RuntimeError(f"Expected one included walk cycle, got {[a.name for a in candidates]}")
    return candidates[0]


def grayscale_delivery_texture(horse: bpy.types.Object, work: Path) -> None:
    if len(horse.data.materials) != 1:
        raise RuntimeError("Expected one painted source material")
    material = horse.data.materials[0]
    material.name = "CoatWarm"
    material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError("Source material has no Principled BSDF")

    base_link = next((link for link in material.node_tree.links if link.to_node == bsdf and link.to_socket.name == "Base Color"), None)
    if base_link is None or base_link.from_node.type != "TEX_IMAGE":
        raise RuntimeError("Source material has no directly linked base-color texture")
    image_node = base_link.from_node
    image = image_node.image
    image.scale(1024, 1024)

    pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    pixels = pixels.reshape((-1, 4))
    luminance = pixels[:, :3] @ np.array((0.2126, 0.7152, 0.0722), dtype=np.float32)
    # Keep the creator's painted value structure while making the coat tintable
    # per lane. Dark eyes/mane stay dark; highlight planes retain separation.
    value = np.clip((luminance - 0.025) / 0.70, 0.0, 1.0)
    value = 0.13 + np.power(value, 0.86) * 0.87
    pixels[:, 0] = value
    pixels[:, 1] = value
    pixels[:, 2] = value
    image.pixels.foreach_set(pixels.ravel())
    image.update()

    delivery_path = work / "horse-paint-1024.jpg"
    image.filepath_raw = str(delivery_path)
    image.file_format = "JPEG"
    image.save()
    delivery_image = bpy.data.images.load(str(delivery_path), check_existing=False)
    delivery_image.name = "HorsePaint1024"
    image_node.image = delivery_image

    # The painted low-poly planes carry the form; the 2k normal map costs more
    # than the whole target GLB budget and adds shimmer on mobile.
    for link in list(material.node_tree.links):
        if link.to_node == bsdf and link.to_socket.name == "Normal":
            material.node_tree.links.remove(link)
    bsdf.inputs["Roughness"].default_value = 0.88
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.25
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.0


def toy_material(name: str, color: str, roughness: float = 0.82) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    rgb = srgb(color)
    material.diffuse_color = (*rgb, 1.0)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"{name}: Principled BSDF unavailable")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.28
    return material


def rounded_box(name: str, location: Vector, dimensions: tuple[float, float, float], material: bpy.types.Material, bevel: float) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new("SoftBevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def evaluated_points(horse: bpy.types.Object) -> list[Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = horse.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
    finally:
        evaluated.to_mesh_clear()


def ground_horse(armature: bpy.types.Object, horse: bpy.types.Object, action: bpy.types.Action) -> None:
    armature.animation_data_create()
    armature.animation_data.action = action
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()
    minimum = min(point.z for point in evaluated_points(horse))
    roots = {obj for obj in (armature, horse)}
    roots = {next(parent for parent in reversed(list(iter_parents(obj))) if parent.parent is None) if obj.parent else obj for obj in roots}
    if len(roots) != 1:
        raise RuntimeError(f"Armature and mesh do not share one source root: {[o.name for o in roots]}")
    root = roots.pop()
    root.location.z += 0.025 - minimum
    bpy.context.view_layer.update()


def iter_parents(obj: bpy.types.Object) -> Iterator[bpy.types.Object]:
    parent = obj.parent
    while parent is not None:
        yield parent
        parent = parent.parent


def add_saddle(armature: bpy.types.Object, horse: bpy.types.Object) -> list[bpy.types.Object]:
    points = evaluated_points(horse)
    back = [point for point in points if abs(point.x) < 0.31 and -0.34 < point.y < 0.28]
    if not back:
        raise RuntimeError("Could not find the horse's back surface")
    back_z = max(point.z for point in back)
    saddle_color = toy_material("SaddleColor", "#FF6E8A", 0.78)
    leather = toy_material("SaddleLeather", "#493040", 0.76)
    pad = rounded_box("SaddlePad", Vector((0.0, -0.03, back_z + 0.035)), (0.58, 0.70, 0.075), saddle_color, 0.055)
    seat = rounded_box("SaddleSeat", Vector((0.0, -0.045, back_z + 0.105)), (0.43, 0.48, 0.115), leather, 0.08)
    pommel = rounded_box("SaddlePommel", Vector((0.0, 0.16, back_z + 0.19)), (0.24, 0.13, 0.15), leather, 0.06)
    saddle_objects = [pad, seat, pommel]
    for obj in saddle_objects:
        world = obj.matrix_world.copy()
        obj.parent = armature
        obj.parent_type = "BONE"
        obj.parent_bone = BODY_BONE
        obj.matrix_world = world
    return saddle_objects


PoseSample = dict[str, tuple[Vector, Quaternion, Vector]]


def snapshot_pose(armature: bpy.types.Object) -> PoseSample:
    sample: PoseSample = {}
    for bone in armature.pose.bones:
        location, rotation, scale = bone.matrix_basis.decompose()
        sample[bone.name] = (location.copy(), rotation.copy(), scale.copy())
    return sample


def apply_sample(armature: bpy.types.Object, sample: PoseSample) -> None:
    for name, (location, rotation, scale) in sample.items():
        bone = armature.pose.bones[name]
        bone.location = location
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = rotation
        bone.scale = scale


def local_rotate(bone: bpy.types.PoseBone, axis: tuple[float, float, float], angle: float) -> None:
    bone.rotation_mode = "QUATERNION"
    bone.rotation_quaternion = bone.rotation_quaternion @ Quaternion(axis, angle)


def amplify_leg_rotation(armature: bpy.types.Object, reference: PoseSample, factor: float) -> None:
    for bone in armature.pose.bones:
        if not bone.name.startswith("leg_") or "hoof" in bone.name:
            continue
        reference_rotation = reference[bone.name][1]
        delta = reference_rotation.rotation_difference(bone.rotation_quaternion)
        axis, angle = delta.to_axis_angle()
        bone.rotation_quaternion = reference_rotation @ Quaternion(axis, angle * factor)


def key_pose(armature: bpy.types.Object, frame: int) -> None:
    for bone in armature.pose.bones:
        bone.keyframe_insert("location", frame=frame, group=bone.name)
        bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
        bone.keyframe_insert("scale", frame=frame, group=bone.name)


def author_actions(armature: bpy.types.Object, walk: bpy.types.Action) -> tuple[bpy.types.Action, bpy.types.Action]:
    armature.animation_data_create()
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = walk
    reference: PoseSample | None = None
    run_samples: list[PoseSample] = []
    for frame in range(RUN_END + 1):
        source_frame = frame * 24 / RUN_END
        whole = math.floor(source_frame)
        bpy.context.scene.frame_set(whole, subframe=source_frame - whole)
        bpy.context.view_layer.update()
        sample = snapshot_pose(armature)
        run_samples.append(sample)
        if frame == 0:
            reference = sample
    if reference is None:
        raise RuntimeError("Could not sample the source walk")

    run = bpy.data.actions.new("Run")
    armature.animation_data.action = run
    armature_scale = (armature.matrix_world.to_3x3() @ Vector((0, 0, 1))).length
    for frame, sample in enumerate(run_samples):
        bpy.context.scene.frame_set(frame)
        apply_sample(armature, sample)
        phase = math.tau * frame / RUN_END
        amplify_leg_rotation(armature, reference, 1.36)
        bpy.context.view_layer.update()

        # One long suspension beat plus a smaller rebound changes the source
        # walk's even prance into a readable toy gallop: collect, launch, float,
        # land, recover. The creator's actual joint arcs remain underneath.
        main_suspension = max(0.0, math.sin(phase)) ** 1.65
        landing_rebound = max(0.0, math.sin(phase + math.pi)) ** 2.2
        lift_world = 0.009 + 0.084 * main_suspension + 0.025 * landing_rebound
        body = armature.pose.bones[BODY_BONE]
        body_matrix = body.matrix.copy()
        body_matrix.translation.z += lift_world / max(armature_scale, 1e-6)
        body.matrix = body_matrix
        local_rotate(armature.pose.bones[BODY_FOLLOW_BONES[0]], (1, 0, 0), math.radians(-5.2) * math.sin(phase + 0.18))
        local_rotate(armature.pose.bones[NECK_BONES[1]], (1, 0, 0), math.radians(5.6) * math.sin(phase + 0.56))
        local_rotate(armature.pose.bones[NECK_BONES[2]], (1, 0, 0), math.radians(-4.1) * math.sin(phase + 0.62))
        for index, name in enumerate(TAIL_BONES):
            local_rotate(armature.pose.bones[name], (1, 0, 0), math.radians(-7.0 - index * 1.45))
            local_rotate(armature.pose.bones[name], (0, 0, 1), math.radians(5.5 + index * 1.15) * math.sin(phase - index * 0.24))
        key_pose(armature, frame)

    run.use_frame_range = True
    run.frame_start = 0
    run.frame_end = RUN_END
    run["strideLength"] = STRIDE_LENGTH
    armature["strideLength"] = STRIDE_LENGTH

    idle = bpy.data.actions.new("Idle")
    armature.animation_data.action = idle
    for frame in range(IDLE_END + 1):
        bpy.context.scene.frame_set(frame)
        apply_sample(armature, reference)
        phase = math.tau * frame / IDLE_END
        bpy.context.view_layer.update()
        body = armature.pose.bones[BODY_BONE]
        body_matrix = body.matrix.copy()
        body_matrix.translation.z += (0.008 + 0.008 * math.sin(phase)) / max(armature_scale, 1e-6)
        body.matrix = body_matrix
        local_rotate(armature.pose.bones[BODY_FOLLOW_BONES[0]], (1, 0, 0), math.radians(0.8) * math.sin(phase))
        local_rotate(armature.pose.bones[NECK_BONES[1]], (1, 0, 0), math.radians(-1.6) * math.sin(phase - 0.35))
        local_rotate(armature.pose.bones[NECK_BONES[2]], (1, 0, 0), math.radians(1.2) * math.sin(phase - 0.35))
        for index, name in enumerate(TAIL_BONES):
            local_rotate(armature.pose.bones[name], (0, 0, 1), math.radians(2.0 + index * 0.7) * math.sin(phase - index * 0.20))
        key_pose(armature, frame)

    idle.use_frame_range = True
    idle.frame_start = 0
    idle.frame_end = IDLE_END
    for action in (idle, run):
        action.use_fake_user = True
        for curve in iter_action_fcurves(action):
            for point in curve.keyframe_points:
                point.interpolation = "LINEAR"
            curve.update()

    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)
    for action in list(bpy.data.actions):
        if action not in (idle, run):
            bpy.data.actions.remove(action)
    armature.animation_data.action = idle
    return idle, run


def validate_actions(armature: bpy.types.Object, idle: bpy.types.Action, run: bpy.types.Action) -> None:
    if {action.name for action in bpy.data.actions} != {"Idle", "Run"}:
        raise RuntimeError(f"Unexpected actions: {[a.name for a in bpy.data.actions]}")
    if tuple(round(value) for value in run.frame_range) != (0, RUN_END):
        raise RuntimeError(f"Run frame contract failed: {tuple(run.frame_range)}")
    if tuple(round(value) for value in idle.frame_range) != (0, IDLE_END):
        raise RuntimeError(f"Idle frame contract failed: {tuple(idle.frame_range)}")
    armature.animation_data.action = run
    poses: list[PoseSample] = []
    for frame in (0, RUN_END):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        poses.append(snapshot_pose(armature))
    maximum = 0.0
    worst = ""
    for name in poses[0]:
        first = poses[0][name]
        last = poses[1][name]
        errors = {
            "location": (first[0] - last[0]).length,
            "rotation": first[1].rotation_difference(last[1]).angle,
            "scale": (first[2] - last[2]).length,
        }
        component, error = max(errors.items(), key=lambda item: item[1])
        if error > maximum:
            maximum = error
            worst = f"{name}.{component} first={tuple(round(v, 4) for v in first[0])} last={tuple(round(v, 4) for v in last[0])}"
    if maximum > 1e-4:
        raise RuntimeError(f"Run endpoint is open: {maximum} at {worst}")


def export_glb() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
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
    size = OUT.stat().st_size
    print(f"Exported {OUT} ({size} bytes)")
    if size > MAX_GLB_BYTES:
        raise RuntimeError(f"Horse GLB exceeds 2 MB: {size}")


def point_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def tint_preview_material(horse: bpy.types.Object) -> None:
    material = horse.data.materials[0]
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    link = next(link for link in material.node_tree.links if link.to_node == bsdf and link.to_socket.name == "Base Color")
    texture = link.from_node
    material.node_tree.links.remove(link)
    tint = material.node_tree.nodes.new("ShaderNodeMixRGB")
    tint.blend_type = "MULTIPLY"
    tint.inputs[0].default_value = 1.0
    tint.inputs[2].default_value = (*srgb("#C77A42"), 1.0)
    material.node_tree.links.new(texture.outputs["Color"], tint.inputs[1])
    material.node_tree.links.new(tint.outputs["Color"], bsdf.inputs["Base Color"])


def render_qa(armature: bpy.types.Object, horse: bpy.types.Object, idle: bpy.types.Action, run: bpy.types.Action) -> None:
    tint_preview_material(horse)
    floor = toy_material("PreviewFloor", "#E5F5E9", 0.94)
    bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
    bpy.context.object.data.materials.append(floor)
    bpy.ops.object.camera_add(location=(3.15, 4.2, 2.55))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 3.35
    point_at(camera, Vector((0, 0.12, 0.95)))
    bpy.context.scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(-3.2, 3.4, 5.2))
    bpy.context.object.data.energy = 850
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 4.2
    bpy.ops.object.light_add(type="AREA", location=(3.4, -2.0, 2.8))
    bpy.context.object.data.energy = 520
    bpy.context.object.data.size = 3.0
    point_at(bpy.context.object, Vector((0, 0, 0.9)))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"
    armature.animation_data.action = idle
    scene.frame_set(8)
    scene.render.filepath = str(QA_HERO)
    bpy.ops.render.render(write_still=True)

    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 92
    scene.render.filepath = str(CARD)
    bpy.ops.render.render(write_still=True)

    QA_RUN_DIR.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_x = 560
    scene.render.resolution_y = 420
    scene.render.image_settings.file_format = "PNG"
    armature.animation_data.action = run
    for frame in (0, 3, 6, 9, 12, 15):
        scene.frame_set(frame)
        scene.render.filepath = str(QA_RUN_DIR / f"run-{frame:02d}.png")
        bpy.ops.render.render(write_still=True)


def validate_delivery() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.ops.import_scene.gltf(filepath=str(OUT))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
    triangles = sum(len(polygon.vertices) - 2 for obj in meshes for polygon in obj.data.polygons)
    materials = {material.name for obj in meshes for material in obj.data.materials if material}
    actions = {action.name for action in bpy.data.actions}
    if len(armatures) != 1 or actions != {"Idle", "Run"}:
        raise RuntimeError(f"Round-trip rig/action contract failed: rigs={len(armatures)} actions={actions}")
    material_bases = {name.split(".", 1)[0] for name in materials}
    if "CoatWarm" not in material_bases or "SaddleColor" not in material_bases:
        raise RuntimeError(f"Round-trip material contract failed: {materials}")
    if triangles > MAX_TRIANGLES:
        raise RuntimeError(f"Triangle budget failed: {triangles}")
    armature = armatures[0]
    if abs(float(armature.get("strideLength", 0.0)) - STRIDE_LENGTH) > 1e-6:
        raise RuntimeError("Round-trip strideLength extra is missing")
    print(f"Validated GLB: triangles={triangles} materials={sorted(materials)} actions={sorted(actions)}")


def main() -> None:
    if not SOURCE_ZIP.exists():
        raise FileNotFoundError(f"Preserved source is missing: {SOURCE_ZIP}")
    bpy.context.scene.render.fps = FPS
    with tempfile.TemporaryDirectory(prefix="dugudugu-cartoon-horse-") as temporary:
        work = Path(temporary)
        with zipfile.ZipFile(SOURCE_ZIP) as archive:
            archive.extractall(work)
        clear_scene()
        bpy.ops.import_scene.gltf(filepath=str(work / "scene.gltf"))
        armature, horse = imported_horse()
        walk = source_action()
        grayscale_delivery_texture(horse, work)
        ground_horse(armature, horse, walk)
        idle, run = author_actions(armature, walk)
        armature["title"] = "Cartoon Horse with animations — Dugudugu race derivative"
        armature["creator"] = "Jungle Jim"
        armature["source"] = "https://sketchfab.com/3d-models/cartoon-horse-with-animations-1210663c398745cb9898e7d66fa51500"
        armature["license"] = "CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/"
        armature["changes"] = "Tintable texture optimization, saddle, and original Dugudugu Idle/Run actions"
        armature.animation_data.action = idle
        bpy.context.scene.frame_set(0)
        bpy.context.view_layer.update()
        add_saddle(armature, horse)
        validate_actions(armature, idle, run)
        export_glb()
        render_qa(armature, horse, idle, run)
    validate_delivery()
    print(f"Wrote {OUT}")
    print(f"Card {CARD}")
    print(f"Hero {QA_HERO}")
    print(f"Run frames {QA_RUN_DIR}")


if __name__ == "__main__":
    main()
