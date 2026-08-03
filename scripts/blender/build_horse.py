"""Deterministically remaster the CC0 Quaternius horse for Dugudugu.

Run with Blender 5.x:
  blender -b --python scripts/blender/build_horse.py

The preserved donor blend supplies a sound, single-island quadruped topology,
an armature and authored motion. This script changes the character silhouette,
surface density, illustrated matte materials, saddle, clip set and loop endpoint, then
exports and re-imports the GLB for production validation.

Blender -Y is forward. glTF converts that to +Z; the existing runtime wrapper's
+90 degree Y rotation therefore makes the horse face track +X.
"""

from __future__ import annotations

import math
import shutil
import subprocess
from collections import defaultdict
from collections.abc import Iterable, Iterator
from pathlib import Path

import bmesh
import bpy
from mathutils import Quaternion, Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "scripts" / "assets" / "quaternius" / "Horse.blend"
OUT = ROOT / "public" / "models" / "race" / "horse.glb"
CARD = ROOT / "public" / "images" / "games" / "race.webp"

HERO = Path("/tmp/dugudugu-horse-hero.png")
QA_FRONT = Path("/tmp/dugudugu-horse-front.png")
QA_FACE = Path("/tmp/dugudugu-horse-face.png")
QA_LEFT = Path("/tmp/dugudugu-horse-left.png")
QA_REAR = Path("/tmp/dugudugu-horse-rear.png")
QA_RIGHT = Path("/tmp/dugudugu-horse-right.png")
QA_SIDE_QUARTER = Path("/tmp/dugudugu-horse-side-025x.png")
QA_RUNTIME_QUARTER = Path("/tmp/dugudugu-horse-runtime-quarter.png")
QA_CONTACT = Path("/tmp/dugudugu-horse-gallop-contact.png")
QA_SUSPENSION = Path("/tmp/dugudugu-horse-gallop-suspension.png")
QA_COMPRESSION = Path("/tmp/dugudugu-horse-gallop-compression.png")
MOTION_PREVIEW = Path("/tmp/dugudugu-horse-gallop-preview.gif")
MOTION_FRAMES = Path("/tmp/dugudugu-horse-gallop-frames")

FPS = 24
RUN_START = 0
RUN_END = 18
TARGET_BODY_TRIS = 11_500
MAX_BODY_TRIS = 14_000
MIN_BODY_TRIS = 8_000
MAX_GLB_BYTES = 2_000_000
STRIDE_LENGTH = 5.25


def srgb(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))


def toy_material(
    name: str,
    color: str,
    *,
    roughness: float,
    coat: float,
    metallic: float = 0.0,
    specular: float = 0.32,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    rgb = srgb(color)
    material.diffuse_color = (*rgb, 1.0)
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"{name}: Principled BSDF is unavailable")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = specular
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = min(0.32, roughness * 0.65)
    return material


def iter_action_fcurves(action: bpy.types.Action) -> Iterator[bpy.types.FCurve]:
    """Yield curves from both legacy and Blender 4.4+ layered actions."""
    legacy_curves = getattr(action, "fcurves", None)
    if legacy_curves is not None:
        yield from legacy_curves
        return
    for layer in action.layers:
        for strip in layer.strips:
            for channelbag in strip.channelbags:
                yield from channelbag.fcurves


def weighted_group_value(
    vertex: bpy.types.MeshVertex,
    index_to_name: dict[int, str],
    names: set[str],
) -> float:
    return max(
        (
            assignment.weight
            for assignment in vertex.groups
            if index_to_name.get(assignment.group) in names
        ),
        default=0.0,
    )


def material_vertex_sets(mesh: bpy.types.Mesh) -> dict[str, set[int]]:
    sets: dict[str, set[int]] = defaultdict(set)
    for polygon in mesh.polygons:
        material = mesh.materials[polygon.material_index]
        if material is not None:
            sets[material.name].update(polygon.vertices)
    return sets


def reshape_character(horse: bpy.types.Object) -> dict[int, Vector]:
    """Turn the generic donor silhouette into Dugudugu's toy race mascot."""
    mesh = horse.data
    sets = material_vertex_sets(mesh)
    index_to_name = {group.index: group.name for group in horse.vertex_groups}

    head_groups = {"Head", *(f"Ear{segment}.{side}" for segment in range(1, 5) for side in ("L", "R"))}
    torso_groups = {"Back", "Torso", "Torso2", "Torso3"}
    neck_groups = {"Neck1", "Neck2", "Neck3"}
    leg_groups = {
        name
        for name in index_to_name.values()
        if name.startswith(("FrontShoulder", "FrontUpperLeg", "FrontLowerLeg", "BackShoulder", "BackLeg", "BackUpperLeg", "BackLowerLeg"))
    }

    # Original positions are retained for every weighted blend so region edits
    # cannot compound into a pinched neck or stretched shoulder seam.  The
    # donor has a long, narrow adult-horse skull.  Make the cranium genuinely
    # mascot-sized while tucking it down and back into the neck.  Compressing
    # the projecting axis is more important than simply scaling the whole
    # animal: a broad, short face reads as a young pony in the runtime 3/4
    # camera, while the connected donor surface keeps every expression on the
    # authored Head deformation.
    for vertex in mesh.vertices:
        point = vertex.co
        head_weight = weighted_group_value(vertex, index_to_name, head_groups)
        if head_weight > 0.0:
            pivot = Vector((0.0, -2.56, 4.04))
            target = pivot + Vector(
                (
                    (point.x - pivot.x) * 1.78,
                    (point.y - pivot.y) * 0.63 + 0.29,
                    (point.z - pivot.z) * 1.17 - 0.12,
                )
            )
            point[:] = point.lerp(target, min(1.0, head_weight))

        torso_weight = weighted_group_value(vertex, index_to_name, torso_groups)
        if torso_weight > 0.0 and point.z > 1.65:
            pivot = Vector((0.0, 0.0, 2.72))
            target = pivot + Vector(
                (
                    (point.x - pivot.x) * 1.52,
                    (point.y - pivot.y) * 0.80,
                    (point.z - pivot.z) * 1.44 - 0.10,
                )
            )
            point[:] = point.lerp(target, min(1.0, torso_weight))

        neck_weight = weighted_group_value(vertex, index_to_name, neck_groups)
        if neck_weight > 0.0:
            pivot = Vector((0.0, -1.72, 3.38))
            target = pivot + Vector(
                (
                    (point.x - pivot.x) * 2.00,
                    (point.y - pivot.y) * 0.62,
                    (point.z - pivot.z) * 0.82 - 0.05,
                )
            )
            point[:] = point.lerp(target, min(1.0, neck_weight))

    # The source ears are elegant but very tall and deer-like. Keep their
    # expressive rig while making the rest silhouette short, wide and pony-ish.
    ear_groups = {
        f"Ear{segment}.{side}"
        for segment in range(1, 5)
        for side in ("L", "R")
    }
    for vertex in mesh.vertices:
        ear_weight = weighted_group_value(vertex, index_to_name, ear_groups)
        if ear_weight <= 0.0:
            continue
        target = vertex.co.copy()
        target.z = 4.42 + (target.z - 4.42) * 0.7
        target.x *= 1.1
        vertex.co[:] = vertex.co.lerp(target, min(1.0, ear_weight))

    # Shorten and round only the projecting muzzle, preserving jaw-to-neck
    # continuity.  The old remaster widened this patch after widening the
    # whole head, which produced a flat rectangular plate in front view.  A
    # compact raised snout with soft cheek transitions reads much more like a
    # friendly illustrated pony.
    muzzle_vertices = sets.get("Muzzle", set()) | {
        vertex.index for vertex in mesh.vertices if vertex.co.y < -3.05
    }
    for index in muzzle_vertices:
        point = mesh.vertices[index].co
        if point.y < -2.74:
            point.y = -2.74 + (point.y + 2.74) * 0.38
        point.x *= 1.10
        point.z = 3.62 + (point.z - 3.505) * 0.85

    # Give the connected cheek/forehead surface a gentle spherical cadence.
    # This stays deliberately subtle at the neck seam and strongest around
    # the eye line, avoiding the former slab-sided mask silhouette.
    for vertex in mesh.vertices:
        point = vertex.co
        head_weight = weighted_group_value(vertex, index_to_name, head_groups)
        if head_weight <= 0.0 or point.y > -2.28:
            continue
        cheek = math.exp(-((point.z - 3.97) / 0.42) ** 2)
        forehead = math.exp(-((point.z - 4.40) / 0.34) ** 2)
        point.x *= 1.0 + head_weight * (0.065 * cheek + 0.025 * forehead)
        point.y -= head_weight * 0.025 * cheek

    # Retain the connected facial topology as a subtle eyelid and derive
    # anchors for separate glossy eye domes/catchlights.
    eye_vertices = sets.get("Eye_White", set()) | sets.get("Eye_Black", set())
    eye_anchors: dict[int, Vector] = {}
    for side in (-1, 1):
        indexes = [index for index in eye_vertices if math.copysign(1, mesh.vertices[index].co.x) == side]
        if not indexes:
            continue
        pivot = sum((mesh.vertices[index].co for index in indexes), Vector()) / len(indexes)
        eye_anchors[side] = pivot.copy()
        for index in indexes:
            point = mesh.vertices[index].co
            # Flatten the donor's painted eye patch into a shallow socket. The
            # expressive eye dome added later sits mostly inside this surface
            # instead of looking glued to the outside of the skull.
            point.x -= side * 0.022
            point.y = pivot.y + (point.y - pivot.y) * 0.92 + 0.008
            point.z = pivot.z + (point.z - pivot.z) * 0.94

    # Thicken limbs radially around the weighted segment centre.  The deeper
    # barrel above hides more of the upper limb, so together these changes
    # make the visible legs read about 12% shorter without changing bone
    # lengths or sacrificing the donor IK/contact contract.
    centroids: dict[str, Vector] = {}
    for name in leg_groups:
        group = horse.vertex_groups.get(name)
        if group is None:
            continue
        points = []
        for vertex in mesh.vertices:
            weight = next(
                (assignment.weight for assignment in vertex.groups if assignment.group == group.index),
                0.0,
            )
            if weight >= 0.35:
                points.append(vertex.co.copy())
        if points:
            centroids[name] = sum(points, Vector()) / len(points)

    for vertex in mesh.vertices:
        candidates: list[tuple[float, str]] = []
        for assignment in vertex.groups:
            name = index_to_name.get(assignment.group, "")
            if name in leg_groups:
                candidates.append((assignment.weight, name))
        if not candidates:
            continue
        weight, name = max(candidates)
        centre = centroids.get(name)
        if centre is None:
            continue
        upper = name.startswith(
            (
                "FrontShoulder",
                "FrontUpperLeg",
                "BackShoulder",
                "BackLeg",
                "BackUpperLeg",
            )
        )
        radial_scale = 1.0 + (1.08 if upper else 0.98) * min(1.0, weight)
        vertex.co.x = centre.x + (vertex.co.x - centre.x) * radial_scale
        vertex.co.y = centre.y + (vertex.co.y - centre.y) * radial_scale

    # The donor hair is one connected ribbon. Carve a few broad scalloped
    # lobes into that same topology so it reads as overlapping illustrated
    # tufts without adding objects, draw calls or unrigged accessories.
    for index in sets.get("Hair", set()):
        point = mesh.vertices[index].co
        if point.y > 1.0:  # tail plume
            source_y = point.y
            blend = min(1.0, max(0.0, (source_y - 1.0) / 0.34))
            wave = 0.45 + 0.65 * (0.5 + 0.5 * math.cos((source_y - 1.08) * 7.2))
            lobe = 1.0 + blend * (wave - 1.0)
            point.x *= 1.82 * lobe
            point.y = 1.45 + (source_y - 1.45) * 1.08
            point.z = 2.55 + (point.z - 2.55) * (0.72 + 0.62 * lobe)
            point.z += 0.07 * math.sin((source_y - 1.05) * 6.4)
        elif point.y < -1.0:  # mane ribbon
            source_y = point.y
            blend = min(1.0, max(0.0, (-1.0 - source_y) / 0.28))
            wave = 0.68 + 0.38 * (0.5 + 0.5 * math.cos((source_y + 1.0) * 8.2))
            lobe = 1.0 + blend * (wave - 1.0)
            point.x *= 1.82 * lobe
            point.z += 0.08 + 0.13 * lobe

    # Keep the hoof footprint crisp after smoothing and a touch broader than
    # the cannon bone so contact is readable at mobile race scale.
    for index in sets.get("Hooves", set()):
        point = mesh.vertices[index].co
        side_centre = 0.419 if point.x > 0 else -0.419
        fore_centre = -1.46 if point.y < 0 else 1.72
        point.x = side_centre + (point.x - side_centre) * 2.10
        point.y = fore_centre + (point.y - fore_centre) * 1.94
        point.z = 0.08 + (point.z - 0.08) * 1.16

    def weighted_points(names: set[str], threshold: float = 0.35) -> list[Vector]:
        return [
            vertex.co
            for vertex in mesh.vertices
            if weighted_group_value(vertex, index_to_name, names) >= threshold
        ]

    def spans(points: list[Vector]) -> tuple[float, float, float]:
        return tuple(
            max(point[axis] for point in points)
            - min(point[axis] for point in points)
            for axis in range(3)
        )

    head_span = spans(weighted_points({"Head"}))
    torso_span = spans(weighted_points(torso_groups))
    head_width_ratio = head_span[0] / torso_span[0]
    face_axis_ratio = head_span[1] / head_span[0]
    print(
        "Chibi proportion audit",
        f"head={tuple(round(value, 3) for value in head_span)}",
        f"torso={tuple(round(value, 3) for value in torso_span)}",
        f"head_width_ratio={head_width_ratio:.3f}",
        f"face_axis_ratio={face_axis_ratio:.3f}",
    )
    if head_width_ratio < 0.70 or face_axis_ratio > 0.62:
        raise RuntimeError(
            "The remastered silhouette regressed toward adult-horse proportions"
        )

    mesh.update()
    return eye_anchors


def add_feature_creases(horse: bpy.types.Object) -> None:
    mesh = horse.data
    face_materials_by_edge: dict[tuple[int, int], set[str]] = defaultdict(set)
    for polygon in mesh.polygons:
        material = mesh.materials[polygon.material_index]
        name = material.name if material is not None else ""
        vertices = list(polygon.vertices)
        for index, start in enumerate(vertices):
            end = vertices[(index + 1) % len(vertices)]
            face_materials_by_edge[tuple(sorted((start, end)))].add(name)

    crease = mesh.attributes.get("crease_edge") or mesh.attributes.new(
        "crease_edge", "FLOAT", "EDGE"
    )
    for edge in mesh.edges:
        names = face_materials_by_edge.get(tuple(sorted(edge.vertices)), set())
        if "Hooves" in names:
            crease.data[edge.index].value = 0.72
        elif names & {"Eye_White", "Eye_Black"}:
            crease.data[edge.index].value = 0.5
        elif "Muzzle" in names and len(names) > 1:
            crease.data[edge.index].value = 0.25


def apply_modifier(obj: bpy.types.Object, name: str) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=name)
    obj.select_set(False)


def triangle_count(mesh: bpy.types.Mesh) -> int:
    return sum(max(0, len(polygon.vertices) - 2) for polygon in mesh.polygons)


def topology_stats(mesh: bpy.types.Mesh) -> tuple[int, int]:
    bm = bmesh.new()
    bm.from_mesh(mesh)
    boundary = sum(1 for edge in bm.edges if edge.is_boundary)
    remaining = set(bm.verts)
    islands = 0
    while remaining:
        islands += 1
        stack = [remaining.pop()]
        while stack:
            vertex = stack.pop()
            for edge in vertex.link_edges:
                other = edge.other_vert(vertex)
                if other in remaining:
                    remaining.remove(other)
                    stack.append(other)
    bm.free()
    return islands, boundary


def remesh_surface(horse: bpy.types.Object, armature: bpy.types.Object) -> None:
    # Apply only rest-space surface modifiers. Re-add Armature last so no
    # animation frame is accidentally baked into the production topology.
    for modifier in list(horse.modifiers):
        horse.modifiers.remove(modifier)

    add_feature_creases(horse)
    subdivision = horse.modifiers.new("Dugudugu soft surface", "SUBSURF")
    subdivision.subdivision_type = "CATMULL_CLARK"
    subdivision.levels = 2
    subdivision.render_levels = 2
    subdivision.show_only_control_edges = True
    apply_modifier(horse, subdivision.name)

    dense_tris = triangle_count(horse.data)
    if dense_tris > TARGET_BODY_TRIS:
        decimate = horse.modifiers.new("Web silhouette budget", "DECIMATE")
        decimate.decimate_type = "COLLAPSE"
        decimate.ratio = TARGET_BODY_TRIS / dense_tris
        decimate.use_collapse_triangulate = True
        apply_modifier(horse, decimate.name)

    apply_illustrated_shading(horse)

    armature_modifier = horse.modifiers.new("HorseRig", "ARMATURE")
    armature_modifier.object = armature
    horse.parent = armature

    tris = triangle_count(horse.data)
    islands, boundary = topology_stats(horse.data)
    print(f"Remastered topology triangles={tris} islands={islands} boundary={boundary}")
    if not MIN_BODY_TRIS <= tris <= MAX_BODY_TRIS:
        raise RuntimeError(f"Horse body triangle budget failed: {tris}")
    if islands != 1 or boundary != 0:
        raise RuntimeError(f"Horse body must stay one closed island: islands={islands}, boundary={boundary}")


def apply_illustrated_shading(horse: bpy.types.Object) -> None:
    """Paint broad, deterministic shadow shapes and retain readable planes.

    A perfectly smooth single-colour mesh reads as injection-moulded plastic
    under the race lights.  The second coat value is already part of the six
    material delivery budget, so these shapes survive glTF without a texture
    fetch or a runtime toon shader.
    """
    slots = {
        material.name: index
        for index, material in enumerate(horse.data.materials)
        if material is not None
    }
    coat = slots["CoatWarm"]
    shade = slots["CoatShade"]
    accent = slots["ManeHoofInk"]
    for polygon in horse.data.polygons:
        centre = polygon.center
        if polygon.material_index == coat:
            belly = (
                centre.z < 2.34 + 0.08 * math.sin(centre.y * 3.2)
                and -1.15 < centre.y < 1.05
            )
            haunch = centre.y > 1.02 and centre.z < 3.05 and abs(centre.x) > 0.34
            shoulder = centre.y < -1.0 and centre.z < 2.95 and centre.x < -0.34
            if belly or haunch or shoulder:
                polygon.material_index = shade
        # Hair and hoof planes retain a little sculpted definition; the coat
        # stays smooth while its large graphic value shapes do the illustration.
        polygon.use_smooth = polygon.material_index != accent


def prune_and_normalize_skin(
    horse: bpy.types.Object,
    armature: bpy.types.Object,
) -> None:
    """Make Blender QA and the four-influence glTF skin identical."""
    deform_names = {bone.name for bone in armature.data.bones if bone.use_deform}
    group_by_index = {group.index: group for group in horse.vertex_groups}

    for vertex in horse.data.vertices:
        assignments = [
            (group_by_index[item.group], item.weight)
            for item in vertex.groups
            if group_by_index[item.group].name in deform_names and item.weight > 1e-7
        ]
        assignments.sort(key=lambda item: item[1], reverse=True)
        kept = assignments[:4]
        total = sum(weight for _, weight in kept)
        if total <= 1e-7:
            raise RuntimeError(f"Vertex {vertex.index} has no deform influence")
        for group, _ in assignments:
            group.remove([vertex.index])
        for group, weight in kept:
            group.add([vertex.index], weight / total, "REPLACE")

    max_influences = 0
    sums: list[float] = []
    for vertex in horse.data.vertices:
        weights = [
            item.weight
            for item in vertex.groups
            if group_by_index[item.group].name in deform_names and item.weight > 1e-7
        ]
        max_influences = max(max_influences, len(weights))
        sums.append(sum(weights))
    min_sum = min(sums)
    max_sum = max(sums)
    print(
        "Skin validator",
        f"vertices={len(horse.data.vertices)}",
        f"max_influences={max_influences}",
        f"sum_range=({min_sum:.6f},{max_sum:.6f})",
    )
    if max_influences > 4 or min_sum < 0.9999 or max_sum > 1.0001:
        raise RuntimeError(
            "Skin must have at most four normalized deform influences per vertex"
        )


def assign_production_materials(horse: bpy.types.Object) -> dict[str, bpy.types.Material]:
    materials = {
        "coat": toy_material("CoatWarm", "#B96F50", roughness=0.83, coat=0.015, specular=0.23),
        "coatshade": toy_material("CoatShade", "#A85F4B", roughness=0.88, coat=0.0, specular=0.2),
        "accent": toy_material("ManeHoofInk", "#49313A", roughness=0.78, coat=0.02, specular=0.24),
        "muzzle": toy_material("MuzzleCream", "#F0BBA0", roughness=0.9, coat=0.0, specular=0.18),
        "eye": toy_material("FaceInk", "#201A25", roughness=0.48, coat=0.12, specular=0.38),
        "saddle": toy_material("SaddleColor", "#E45F83", roughness=0.76, coat=0.02, specular=0.25),
    }
    mapping = {
        "Main": "coat",
        "Main_Dark": "coatshade",
        "Hooves": "accent",
        "Hair": "accent",
        "Muzzle": "muzzle",
        "Eye_White": "coat",
        "Eye_Black": "coat",
    }
    old_names = [material.name if material is not None else "Main" for material in horse.data.materials]
    target_keys = []
    for polygon in horse.data.polygons:
        old_name = old_names[polygon.material_index]
        if old_name == "Main_Light":
            # Keep the warm inner-ear accent, but remove the donor's jagged
            # facial blaze.  In front view that stripe used to surround each
            # added eye like a torn paper mask.
            centre = polygon.center
            key = "muzzle" if centre.z > 4.42 and abs(centre.x) > 0.14 else "coat"
        else:
            key = mapping.get(old_name, "coat")
        target_keys.append(key)
    ordered_keys = ["coat", "coatshade", "accent", "muzzle", "eye"]
    horse.data.materials.clear()
    for key in ordered_keys:
        horse.data.materials.append(materials[key])
    index_by_key = {key: index for index, key in enumerate(ordered_keys)}
    for polygon, key in zip(horse.data.polygons, target_keys, strict=True):
        polygon.material_index = index_by_key[key]
    return materials


def rounded_cube(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = tuple(value / 2 for value in dimensions)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new(f"{name} bevel", "BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    apply_modifier(obj, modifier.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(material)
    return obj


def ellipsoid(
    name: str,
    location: Vector,
    scale: tuple[float, float, float],
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        # These pieces are tiny at runtime and deliberately illustrated.  The
        # former 24x16 spheres spent more triangles on a catchlight than the
        # silhouette could expose at 390px; 18x12 keeps the eyes round while
        # leaving ten animated horses comfortably inside the mobile budget.
        segments=18,
        ring_count=12,
        location=location,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj.data.materials.append(material)
    return obj


def create_hair_tufts(
    armature: bpy.types.Object,
    material: bpy.types.Material,
) -> bpy.types.Object:
    """Add one lightweight skinned mesh of overlapping faceted hair lobes."""

    def lobe(
        name: str,
        bone_name: str,
        radial: tuple[float, float],
        offset: Vector,
        length_scale: float,
    ) -> bpy.types.Object:
        bone = armature.data.bones[bone_name]
        centre = (bone.head_local + bone.tail_local) * 0.5 + offset
        direction = (bone.tail_local - bone.head_local).normalized()
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=centre)
        obj = bpy.context.object
        obj.name = name
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = direction.to_track_quat("Y", "Z")
        obj.scale = (radial[0], max(0.22, bone.length * length_scale), radial[1])
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        obj.data.materials.append(material)
        for polygon in obj.data.polygons:
            polygon.use_smooth = False
        group = obj.vertex_groups.new(name=bone_name)
        group.add([vertex.index for vertex in obj.data.vertices], 1.0, "REPLACE")
        return obj

    def dorsal_offset(bone_name: str, distance: float) -> Vector:
        bone = armature.data.bones[bone_name]
        direction = (bone.tail_local - bone.head_local).normalized()
        dorsal = Vector((0.0, direction.z, -direction.y)).normalized()
        return dorsal * distance

    parts = [
        lobe("ManeLobe.1", "Neck1", (0.25, 0.17), dorsal_offset("Neck1", 0.70), 0.74),
        lobe("ManeLobe.2", "Neck2", (0.26, 0.18), dorsal_offset("Neck2", 0.66), 0.76),
        lobe("ManeLobe.3", "Neck3", (0.24, 0.16), dorsal_offset("Neck3", 0.60), 0.72),
        lobe("TailLobe.1", "Tail2", (0.30, 0.23), Vector((0, 0, 0.07)), 1.0),
        lobe("TailLobe.2", "Tail4", (0.28, 0.22), Vector((0, 0, -0.025)), 1.02),
        lobe("TailLobe.3", "Tail6", (0.25, 0.19), Vector((0, 0, 0.02)), 1.0),
    ]
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    tufts = parts[0]
    tufts.name = "HairTufts"
    modifier = tufts.modifiers.new("HorseRig", "ARMATURE")
    modifier.object = armature
    tufts.parent = armature
    return tufts


def create_facial_features(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    eye_anchors: dict[int, Vector],
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    parts: list[bpy.types.Object] = []
    for side in (-1, 1):
        anchor = eye_anchors[side]
        # Angle the dark oval toward the viewer instead of placing a flat disc
        # on each temple.  The outward/forward normal makes both eyes readable
        # from front and 3/4 cameras without protruding or appearing cross-eyed.
        normal = Vector((side * 0.62, -0.78, 0.0)).normalized()
        eye_location = anchor + Vector((-side * 0.038, -0.036, 0.010))
        eye = ellipsoid(
            f"Eye.{side}",
            eye_location,
            (0.032, 0.123, 0.148),
            materials["eye"],
        )
        eye.rotation_euler.z = -side * math.radians(51.5)
        eye.rotation_euler.x = math.radians(-4.0)
        parts.append(eye)

        # A soft upper lid/brow anchors the eye into the face.  It follows the
        # same face plane and tilts very slightly up toward the forehead for a
        # friendly, curious expression rather than an angry race brow.
        brow_location = eye_location + Vector((-side * 0.010, -0.002, 0.098))
        brow = ellipsoid(
            f"UpperLid.{side}",
            brow_location,
            (0.017, 0.112, 0.017),
            materials["accent"],
        )
        brow.rotation_euler.z = -side * math.radians(51.5)
        brow.rotation_euler.y = side * math.radians(7.0)
        parts.append(brow)

        sparkle_location = (
            eye_location
            + normal * 0.031
            + Vector((-side * 0.018, -0.010, 0.052))
        )
        parts.append(
            ellipsoid(
                f"Catchlight.{side}",
                sparkle_location,
                (0.016, 0.020, 0.032),
                materials["muzzle"],
            )
        )
    muzzle_indexes = material_vertex_sets(horse.data).get("MuzzleCream", set())
    muzzle_candidates = [horse.data.vertices[index].co for index in muzzle_indexes]
    if not muzzle_candidates:
        raise RuntimeError("Remastered muzzle material has no vertices")
    front_y = min(point.y for point in muzzle_candidates)
    muzzle_points = [point for point in muzzle_candidates if point.y < front_y + 0.2]
    if not muzzle_points:
        raise RuntimeError("Remastered muzzle has no front-facing vertices")
    muzzle_front = min(point.y for point in muzzle_points)
    muzzle_z = sum(point.z for point in muzzle_points) / len(muzzle_points) + 0.025
    # A nearly flush oval turns the donor's tiny painted nose patch into a
    # softly raised, cream muzzle that survives the dark coat palettes and the
    # 390px finish camera.  It shares MuzzleCream and the Head parent with the
    # rest of FaceDetails, so this costs no extra material draw and cannot lag
    # behind the gallop pose.
    muzzle_puff = ellipsoid(
        "MuzzlePuff",
        Vector((0.0, muzzle_front - 0.006, muzzle_z - 0.006)),
        (0.29, 0.045, 0.155),
        materials["muzzle"],
    )
    parts.append(muzzle_puff)
    detail_front = muzzle_front - 0.053
    for side in (-1, 1):
        parts.append(
            ellipsoid(
                f"Nostril.{side}",
                Vector((side * 0.112, detail_front, muzzle_z + 0.022)),
                (0.036, 0.009, 0.026),
                materials["eye"],
            )
        )

    # A shallow three-piece smile gives the snout a readable lower plane at
    # mobile size.  It is intentionally narrow and inset so it cannot become
    # the moustache-like horizontal slash seen on many primitive toy horses.
    mouth_z = muzzle_z - 0.074
    mouth_centre = ellipsoid(
        "Mouth.Centre",
        Vector((0.0, detail_front - 0.001, mouth_z)),
        (0.063, 0.009, 0.012),
        materials["eye"],
    )
    parts.append(mouth_centre)
    for side in (-1, 1):
        smile = ellipsoid(
            f"Mouth.Corner.{side}",
            Vector((side * 0.060, detail_front, mouth_z + 0.013)),
            (0.038, 0.009, 0.011),
            materials["eye"],
        )
        smile.rotation_euler.y = -side * math.radians(17.0)
        parts.append(smile)

    # Break up the donor's flat helmet-like forelock with three overlapping
    # painted lobes.  They sit almost flush to the forehead and share the mane
    # material, so the silhouette gains a soft storybook fringe without a new
    # material or a loose runtime accessory.
    eye_mid_z = sum(anchor.z for anchor in eye_anchors.values()) / len(eye_anchors)
    eye_front_y = min(anchor.y for anchor in eye_anchors.values())
    for index, (x, z_offset, roll) in enumerate(
        ((-0.135, 0.405, -13.0), (0.0, 0.365, 4.0), (0.13, 0.415, 14.0)),
        start=1,
    ):
        fringe = ellipsoid(
            f"Forelock.{index}",
            Vector((x, eye_front_y - 0.030, eye_mid_z + z_offset)),
            (0.170, 0.032, 0.090),
            materials["accent"],
        )
        fringe.rotation_euler.y = math.radians(roll)
        parts.append(fringe)

    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    features = parts[0]
    features.name = "FaceDetails"
    world_matrix = features.matrix_world.copy()
    features.parent = armature
    features.parent_type = "BONE"
    features.parent_bone = "Head"
    features.matrix_world = world_matrix
    return features


def create_saddle(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    back_top = max(
        vertex.co.z
        for vertex in horse.data.vertices
        if -0.65 < vertex.co.y < 0.8 and abs(vertex.co.x) < 0.75
    )
    blanket_z = back_top - 0.045
    lane = materials["saddle"]
    # One soft pad is clearer than a miniature adult saddle at mobile size.
    # All pieces share SaddleColor and are joined below, so runtime lane
    # recolouring produces one coherent candy accent with a single draw.
    parts = [
        rounded_cube(
            "Blanket",
            (0, 0.10, blanket_z - 0.035),
            (1.28, 0.94, 0.13),
            lane,
            bevel=0.115,
        ),
        ellipsoid(
            "PuffySeat",
            Vector((0, 0.08, blanket_z + 0.055)),
            (0.50, 0.40, 0.13),
            lane,
        ),
        ellipsoid(
            "PadWing.L",
            Vector((0.58, 0.08, blanket_z - 0.15)),
            (0.075, 0.29, 0.19),
            lane,
        ),
        ellipsoid(
            "PadWing.R",
            Vector((-0.58, 0.08, blanket_z - 0.15)),
            (0.075, 0.29, 0.19),
            lane,
        ),
    ]
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    saddle = parts[0]
    saddle.name = "SaddleBlanket"
    polygon_materials = [
        saddle.data.materials[polygon.material_index]
        for polygon in saddle.data.polygons
    ]
    saddle.data.materials.clear()
    saddle.data.materials.append(lane)
    for polygon, material in zip(saddle.data.polygons, polygon_materials, strict=True):
        if material != lane:
            raise RuntimeError("The chibi saddle pad must use SaddleColor only")
        polygon.material_index = 0
    world_matrix = saddle.matrix_world.copy()
    saddle.parent = armature
    saddle.parent_type = "BONE"
    saddle.parent_bone = "Back"
    saddle.matrix_world = world_matrix
    return saddle


def stylized_hoof(
    name: str,
    location: Vector,
    material: bpy.types.Material,
) -> bpy.types.Object:
    """Create a flat-soled, tapered pony hoof instead of a rounded brick."""
    bottom = (
        (-0.207, -0.207), (0.0, -0.299), (0.207, -0.207), (0.219, -0.023),
        (0.161, 0.161), (0.0, 0.207), (-0.161, 0.161), (-0.219, -0.023),
    )
    middle = (
        (-0.19, -0.196), (0.0, -0.259), (0.19, -0.196), (0.201, -0.017),
        (0.15, 0.144), (0.0, 0.178), (-0.15, 0.144), (-0.201, -0.017),
    )
    top = (
        (-0.112, -0.118), (0.0, -0.171), (0.112, -0.118), (0.132, -0.006),
        (0.097, 0.092), (0.0, 0.120), (-0.097, 0.092), (-0.132, -0.006),
    )
    vertices = [
        (x, y, z)
        for ring, z in ((bottom, -0.008), (middle, 0.112), (top, 0.255))
        for x, y in ring
    ]
    faces: list[tuple[int, ...]] = [tuple(reversed(range(8))), tuple(range(16, 24))]
    for ring_start in (0, 8):
        next_start = ring_start + 8
        for index in range(8):
            following = (index + 1) % 8
            faces.append(
                (
                    ring_start + index,
                    ring_start + following,
                    next_start + following,
                    next_start + index,
                )
            )
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    hoof = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(hoof)
    hoof.location = location
    hoof.data.materials.append(material)
    bevel = hoof.modifiers.new(f"{name} soft edge", "BEVEL")
    bevel.width = 0.034
    bevel.segments = 3
    apply_modifier(hoof, bevel.name)
    for polygon in hoof.data.polygons:
        polygon.use_smooth = polygon.center.z > 0.025
    return hoof


def create_hoof_shells(
    armature: bpy.types.Object,
    material: bpy.types.Material,
) -> list[bpy.types.Object]:
    shells: list[bpy.types.Object] = []
    for key in LEG_RIG:
        bone_name = f"DEF_Hoof.{key}"
        sole = armature.data.bones[bone_name].head_local
        shell = stylized_hoof(
            f"HoofShell.{key}",
            sole + Vector((0.0, -0.015, 0.042)),
            material,
        )
        world_matrix = shell.matrix_world.copy()
        shell.parent = armature
        shell.parent_type = "BONE"
        shell.parent_bone = bone_name
        shell.matrix_world = world_matrix
        shells.append(shell)
    return shells


LEG_RIG = {
    "FL": ("FrontLowerLeg.L", "IKFrontLeg.L", "FF.L"),
    "FR": ("FrontLowerLeg.R", "IKFrontLeg.R", "FF.R"),
    "HL": ("BackLowerLeg.L", "IKBackLeg.L", "FFB.L"),
    "HR": ("BackLowerLeg.R", "IKBackLeg.R", "FFB.R"),
}


def create_deformation_leg_chains(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
) -> None:
    """Separate IK controls from the deform skeleton.

    The donor weights the mesh directly to its IK targets. At a mismatched
    endpoint those controls pull away from the lower leg and expose a stretched
    socket that reads as a severed limb. Connected DEF bones keep the mesh
    continuous while the original controls remain non-deforming solvers.
    """
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="EDIT")
    for key, (lower_name, control_name, foot_name) in LEG_RIG.items():
        lower = armature.data.edit_bones[lower_name]
        control = armature.data.edit_bones[control_name]
        foot = armature.data.edit_bones[foot_name]

        # Match the donor's two lower-leg deform segments exactly.  The donor
        # bones are geometrically continuous but the IK ankle is an unparented
        # control, so weighting the skin to it makes the socket vulnerable to
        # solver-space mismatches.  Our DEF chain keeps the same rest matrices
        # while making the deformation hierarchy explicitly continuous.
        head = lower.tail.copy()
        first_joint = control.tail.copy()
        second_joint = foot.tail.copy()

        fetlock = armature.data.edit_bones.new(f"DEF_Fetlock.{key}")
        fetlock.head = head
        fetlock.tail = first_joint
        fetlock.parent = lower
        fetlock.use_connect = True
        fetlock.use_deform = True

        pastern = armature.data.edit_bones.new(f"DEF_Pastern.{key}")
        pastern.head = first_joint
        pastern.tail = second_joint
        pastern.parent = fetlock
        pastern.use_connect = True
        pastern.use_deform = True

        hoof = armature.data.edit_bones.new(f"DEF_Hoof.{key}")
        hoof.head = second_joint
        hoof_forward = Vector((0, -0.23, 0))
        hoof.tail = second_joint + hoof_forward
        hoof.parent = pastern
        hoof.use_connect = True
        hoof.use_deform = True

        control.use_deform = False
        foot.use_deform = False
    bpy.ops.object.mode_set(mode="POSE")

    for key, (_, control_name, foot_name) in LEG_RIG.items():
        fetlock = armature.pose.bones[f"DEF_Fetlock.{key}"]
        copy_control = fetlock.constraints.new("COPY_TRANSFORMS")
        copy_control.name = "Follow IK ankle transform"
        copy_control.target = armature
        copy_control.subtarget = control_name
        copy_control.target_space = "WORLD"
        copy_control.owner_space = "WORLD"

        pastern = armature.pose.bones[f"DEF_Pastern.{key}"]
        copy_foot = pastern.constraints.new("COPY_TRANSFORMS")
        copy_foot.name = "Follow pastern transform"
        copy_foot.target = armature
        copy_foot.subtarget = foot_name
        copy_foot.target_space = "WORLD"
        copy_foot.owner_space = "WORLD"
    bpy.ops.object.mode_set(mode="OBJECT")

    # Transfer and feather the two donor control groups into three DEF groups.
    for key, (_, control_name, foot_name) in LEG_RIG.items():
        control_group = horse.vertex_groups.get(control_name)
        foot_group = horse.vertex_groups.get(foot_name)
        if control_group is None or foot_group is None:
            raise RuntimeError(f"Missing donor weights for {key}")
        fetlock_group = horse.vertex_groups.new(name=f"DEF_Fetlock.{key}")
        pastern_group = horse.vertex_groups.new(name=f"DEF_Pastern.{key}")
        hoof_group = horse.vertex_groups.new(name=f"DEF_Hoof.{key}")

        for vertex in horse.data.vertices:
            control_weight = next(
                (
                    assignment.weight
                    for assignment in vertex.groups
                    if assignment.group == control_group.index
                ),
                0.0,
            )
            foot_weight = next(
                (
                    assignment.weight
                    for assignment in vertex.groups
                    if assignment.group == foot_group.index
                ),
                0.0,
            )
            if control_weight > 0:
                fetlock_group.add([vertex.index], control_weight, "ADD")
            if foot_weight > 0:
                hoof_blend = max(0.0, min(1.0, (0.105 - vertex.co.z) / 0.09))
                pastern_group.add(
                    [vertex.index], foot_weight * (1 - hoof_blend), "ADD"
                )
                hoof_group.add([vertex.index], foot_weight * hoof_blend, "ADD")

        horse.vertex_groups.remove(control_group)
        horse.vertex_groups.remove(foot_group)


RUN_TARGETS = (
    # FL(y,z), FR(y,z), HL(y,z), HR(y,z), root Z, body/back/torso/head pitch.
    ((-1.5583, 0.00), (-0.75, 0.45), (1.90, 1.30), (0.20, 0.65), 1.00, -10, -28, -3, -30),
    ((-1.2666, 0.00), (-0.35, 0.75), (1.60, 1.20), (-0.10, 0.55), 1.02, -9, -27, -2, -29),
    ((-0.9749, 0.00), (-0.15, 1.05), (1.20, 1.05), (-0.35, 0.45), 1.05, -7, -25, -1, -26),
    ((-0.70, 0.35), (-0.50, 1.20), (0.70, 0.85), (-0.50, 0.35), 1.09, -4, -22, 0, -22),
    ((-0.25, 0.75), (-1.00, 1.15), (0.10, 0.65), (-0.55, 0.25), 1.13, -1, -19, 1, -18),
    ((-0.10, 1.10), (-1.50, 1.00), (-0.25, 0.45), (-0.45, 0.15), 1.15, 1, -17, 1, -16),
    ((-0.45, 1.25), (-2.00, 0.85), (-0.45, 0.30), (-0.35, 0.07), 1.12, 2, -16, 2, -17),
    ((-0.95, 1.20), (-2.40, 0.65), (-0.50, 0.18), (-0.25, 0.00), 1.07, 3, -15, 3, -19),
    ((-1.45, 1.10), (-2.65, 0.50), (-0.40, 0.10), (0.042, 0.00), 1.02, 4, -14, 4, -21),
    ((-1.95, 1.00), (-2.75, 0.40), (-0.33, 0.05), (0.333, 0.00), 0.99, 4, -13, 4, -23),
    ((-2.35, 0.85), (-2.65, 0.30), (-0.25, 0.00), (0.90, 0.20), 0.98, 3, -14, 4, -24),
    ((-2.65, 0.65), (-2.52, 0.20), (0.042, 0.00), (1.40, 0.60), 1.00, 2, -16, 3, -25),
    ((-2.80, 0.50), (-2.45, 0.12), (0.333, 0.00), (1.80, 0.95), 1.04, 0, -18, 2, -27),
    ((-2.75, 0.42), (-2.40, 0.06), (0.625, 0.00), (2.00, 1.20), 1.08, -3, -21, 0, -29),
    ((-2.62, 0.30), (-2.15, 0.00), (1.30, 0.25), (1.80, 1.25), 1.06, -6, -24, -1, -31),
    ((-2.50, 0.18), (-1.858, 0.00), (1.70, 0.60), (1.40, 1.15), 1.02, -8, -26, -2, -32),
    ((-2.42, 0.08), (-1.567, 0.00), (2.00, 0.95), (0.90, 0.95), 0.99, -10, -28, -3, -32),
    ((-1.8500, 0.00), (-1.15, 0.20), (2.20, 1.20), (0.50, 0.75), 0.98, -11, -29, -4, -31),
)


def close_idle_loop(action: bpy.types.Action) -> None:
    for curve in iter_action_fcurves(action):
        value = curve.evaluate(0)
        endpoint = next(
            (point for point in curve.keyframe_points if abs(point.co.x - 100) < 1e-5),
            None,
        )
        if endpoint is None:
            curve.keyframe_points.insert(100, value, options={"FAST"})
        else:
            endpoint.co.y = value
        curve.update()
    action.use_frame_range = True
    action.frame_start = 0
    action.frame_end = 100


def hoof_indexes(horse: bpy.types.Object) -> dict[str, list[int]]:
    indexes = {"FL": [], "FR": [], "HL": [], "HR": []}
    for vertex in horse.data.vertices:
        if vertex.co.z > 0.3:
            continue
        front = vertex.co.y < 0
        left = vertex.co.x > 0
        key = ("F" if front else "H") + ("L" if left else "R")
        indexes[key].append(vertex.index)
    if any(not value for value in indexes.values()):
        raise RuntimeError("Could not classify remastered hoof vertices")
    return indexes


def evaluated_hoof_bottoms(
    horse: bpy.types.Object,
    indexes: dict[str, list[int]],
) -> dict[str, float]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    depsgraph.update()
    evaluated = horse.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return {
            key: min(
                (evaluated.matrix_world @ mesh.vertices[index].co).z
                for index in values
            )
            for key, values in indexes.items()
        }
    finally:
        evaluated.to_mesh_clear()


def solve_hoof_heights(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    indexes: dict[str, list[int]],
    foot_targets: dict[str, tuple[float, float]],
    *,
    frame: int,
) -> None:
    """Bake IK controls from measured skin contact, not rest-bone guesses.

    Subdivision, weight feathering and the rounded hoof silhouette mean the
    visible sole is not exactly at the donor foot-bone tail.  Each iteration
    evaluates the final skinned mesh and corrects the unparented IK target in
    world Z.  This prevents a mathematically plausible control from pushing a
    rendered hoof through the track.
    """
    sole_offset = -0.046
    for _ in range(24):
        bpy.context.view_layer.update()
        bottoms = evaluated_hoof_bottoms(horse, indexes)
        errors = {
            key: foot_targets[key][1] + sole_offset - bottoms[key]
            for key in LEG_RIG
        }
        # 1.25 cm in source space is <5 mm after the runtime's 0.38 scale;
        # below that threshold further lowering can only overextend the IK
        # chain without a visible contact improvement.
        if max(abs(value) for value in errors.values()) <= 0.0125:
            break
        for key, error in errors.items():
            control_name = LEG_RIG[key][1]
            control = armature.pose.bones[control_name]
            local_delta = control.bone.matrix_local.to_3x3().inverted() @ Vector(
                (0.0, 0.0, error)
            )
            control.location += local_delta
    else:
        depsgraph = bpy.context.evaluated_depsgraph_get()
        evaluated = horse.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        for key, values in indexes.items():
            index = min(
                values,
                key=lambda value: (evaluated.matrix_world @ mesh.vertices[value].co).z,
            )
            assignments = [
                (horse.vertex_groups[item.group].name, round(item.weight, 4))
                for item in horse.data.vertices[index].groups
            ]
            print(
                "Unsolved hoof",
                key,
                "vertex",
                index,
                "rest",
                tuple(round(value, 4) for value in horse.data.vertices[index].co),
                "deformed",
                tuple(
                    round(value, 4)
                    for value in (evaluated.matrix_world @ mesh.vertices[index].co)
                ),
                "groups",
                assignments,
            )
        evaluated.to_mesh_clear()
        raise RuntimeError(
            f"Frame {frame}: visible hoof solver did not converge: {errors}"
        )


def polish_loop_tangent(
    samples: list[dict[str, tuple[Vector, object, Vector]]],
) -> None:
    """Make frame 17->0 and 0->1 a C1 cyclic transition."""
    first = samples[0]
    second = samples[1]
    previous = samples[RUN_END - 1]
    endpoint = samples[RUN_END]
    for name in first:
        location0, rotation0, scale0 = first[name]
        location1, rotation1, scale1 = second[name]
        rotation0 = rotation0.copy()
        rotation1 = rotation1.copy()
        rotation1.make_compatible(rotation0)
        # The right forehoof is airborne at the seam.  Dampen that chain's
        # one-frame angular/translation step before mirroring it; this removes
        # the nonlinear skin-velocity spike without slowing a planted hoof.
        damp_right_fore = (
            (name.endswith(".R") and name.startswith(("Front", "IKFront", "FF")))
            or name == "DEF_Hoof.FR"
        )
        if damp_right_fore:
            location1 = location0.lerp(location1, 0.7)
            rotation1 = rotation0.slerp(rotation1, 0.7)
            scale1 = scale0.lerp(scale1, 0.7)
            second[name] = (location1.copy(), rotation1.copy(), scale1.copy())
        angular_step = rotation0.rotation_difference(rotation1)
        rotation_previous = rotation0 @ angular_step.inverted()
        rotation_previous.normalize()
        previous[name] = (
            location0 * 2.0 - location1,
            rotation_previous,
            scale0 * 2.0 - scale1,
        )
        endpoint[name] = (location0.copy(), rotation0.copy(), scale0.copy())


def prepare_actions(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
) -> tuple[bpy.types.Action, bpy.types.Action]:
    idle = bpy.data.actions.get("Idle")
    source = bpy.data.actions.get("Gallop")
    if idle is None or source is None:
        raise RuntimeError("The preserved source must contain Idle and Gallop")

    armature.animation_data_create()
    # The donor stores every clip as an unmuted NLA strip.  Leaving those
    # tracks live blends unrelated attacks/idle poses over the action we are
    # sampling and makes an IK correction appear to move a different leg.
    for track in armature.animation_data.nla_tracks:
        track.mute = True
    armature.animation_data.action = source
    samples: list[dict[str, tuple[Vector, object, Vector]]] = []
    for frame in range(RUN_END):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        frame_sample: dict[str, tuple[Vector, object, Vector]] = {}
        for bone in armature.pose.bones:
            if bone.name.startswith("DEF_"):
                continue
            location, rotation, scale = bone.matrix_basis.decompose()
            frame_sample[bone.name] = (location.copy(), rotation.copy(), scale.copy())
        samples.append(frame_sample)

    source.name = "GallopSource"
    armature.animation_data.action = None
    indexes = hoof_indexes(horse)
    baked_samples: list[dict[str, tuple[Vector, object, Vector]]] = []

    for frame in range(RUN_START, RUN_END + 1):
        bpy.context.scene.frame_set(frame)
        source_frame = frame % RUN_END
        target = RUN_TARGETS[source_frame]
        authored_heights = dict(zip(("FL", "FR", "HL", "HR"), target[:4], strict=True))
        _root_z, _body_pitch, _back_pitch, _torso_pitch, _head_pitch = target[4:]
        sample = samples[source_frame]

        for name, (location, rotation, scale) in sample.items():
            bone = armature.pose.bones[name]
            bone.location = location
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = rotation
            bone.scale = scale

        # Layer a restrained, phase-lagged tail follow-through over the donor
        # gallop.  Each segment trails the rump a little more, which reads as
        # flexible hair rather than the former single rubber hose silhouette.
        cycle = math.tau * source_frame / RUN_END
        for segment in range(2, 8):
            tail = armature.pose.bones[f"Tail{segment}"]
            follow = math.radians(1.6 + segment * 0.42) * math.sin(
                cycle - segment * 0.24
            )
            tail.rotation_mode = "QUATERNION"
            tail.rotation_quaternion = tail.rotation_quaternion @ Quaternion(
                (1.0, 0.0, 0.0), follow
            )

        # Preserve the donor's authored thorax weight shift and head
        # counter-balance.  Re-pitching the root after sampling moves the
        # shoulder while the world-space foot target stays fixed, overextends
        # the foreleg at contact, and creates the very socket pop this remaster
        # is meant to remove.

        bpy.context.view_layer.update()
        foot_targets: dict[str, tuple[float, float]] = {}
        for key, (_, control_name, foot_name) in LEG_RIG.items():
            control = armature.pose.bones[control_name]
            current_sole = armature.pose.bones[foot_name].tail.copy()
            z = authored_heights[key][1]
            # Keep the donor's natural protraction/retraction arc.  The first
            # remaster replaced Y outright with a diagrammatic foot chart,
            # producing folded limbs and a mechanical bicycle motion.  Only
            # vertical contact is corrected here; fairness/runtime travel still
            # comes from the distance-phased clip contract.
            foot_targets[key] = (current_sole.y, z)
            # Pose-channel axes are aligned to each slanted control bone, not
            # armature XYZ.  Move the target matrix in armature space so a
            # desired ground Z cannot become a diagonal local-axis offset.
            world_delta = Vector((0.0, 0.0, z - current_sole.z))
            control.location += (
                control.bone.matrix_local.to_3x3().inverted() @ world_delta
            )

        # Hooves remain horizontal through stance; only the final contact frame
        # breaks over the toe.  Set this before solving the visible sole so the
        # toe roll cannot introduce contact penetration after feedback.
        toe_off = {
            "FL": 6.0 if frame in (2,) else 0.0,
            "HR": 6.0 if frame in (9,) else 0.0,
            "HL": 6.0 if frame in (13,) else 0.0,
            "FR": 6.0 if frame in (16,) else 0.0,
        }

        for key in LEG_RIG:
            bone = armature.pose.bones[f"DEF_Hoof.{key}"]
            bone.rotation_mode = "XYZ"
            bone.rotation_euler = (math.radians(toe_off.get(key, 0.0)), 0, 0)

        solve_hoof_heights(
            armature,
            horse,
            indexes,
            foot_targets,
            frame=frame,
        )

        baked_frame: dict[str, tuple[Vector, object, Vector]] = {}
        for bone in armature.pose.bones:
            if bone.name.startswith("DEF_") and not bone.name.startswith("DEF_Hoof."):
                continue
            location, rotation, scale = bone.matrix_basis.decompose()
            baked_frame[bone.name] = (location.copy(), rotation.copy(), scale.copy())
        baked_samples.append(baked_frame)

    polish_loop_tangent(baked_samples)

    run = bpy.data.actions.new("Run")
    armature.animation_data.action = run
    for frame, baked_frame in enumerate(baked_samples, start=RUN_START):
        bpy.context.scene.frame_set(frame)
        for name, (location, rotation, scale) in baked_frame.items():
            bone = armature.pose.bones[name]
            bone.location = location
            bone.rotation_mode = "QUATERNION"
            bone.rotation_quaternion = rotation
            bone.scale = scale
            bone.keyframe_insert("location", frame=frame, group=bone.name)
            bone.keyframe_insert("rotation_quaternion", frame=frame, group=bone.name)
            bone.keyframe_insert("scale", frame=frame, group=bone.name)

    for curve in iter_action_fcurves(run):
        for point in curve.keyframe_points:
            point.interpolation = "LINEAR"
        curve.update()
    run.use_frame_range = True
    run.frame_start = RUN_START
    run.frame_end = RUN_END
    run["strideLength"] = STRIDE_LENGTH
    armature["strideLength"] = STRIDE_LENGTH

    close_idle_loop(idle)

    for track in list(armature.animation_data.nla_tracks):
        armature.animation_data.nla_tracks.remove(track)

    for action in list(bpy.data.actions):
        if action not in (idle, run):
            bpy.data.actions.remove(action)
    for action in (idle, run):
        action.use_fake_user = True
    armature.animation_data.action = idle
    return idle, run


def bone_positions(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    frame: int,
    names: Iterable[str],
) -> dict[str, Vector]:
    armature.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {
        name: (armature.matrix_world @ armature.pose.bones[name].matrix).translation.copy()
        for name in names
    }


def bone_rotations(
    armature: bpy.types.Object,
    action: bpy.types.Action,
    frame: int,
    names: Iterable[str],
) -> dict[str, object]:
    armature.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    return {
        name: (armature.matrix_world @ armature.pose.bones[name].matrix).to_quaternion()
        for name in names
    }


def validate_motion(armature: bpy.types.Object, run: bpy.types.Action) -> None:
    controls = (
        "Body",
        "Back",
        "Torso",
        "Head",
        "IKBackLeg.L",
        "IKBackLeg.R",
        "IKFrontLeg.L",
        "IKFrontLeg.R",
        "FFB.L",
        "FFB.R",
        "FF.L",
        "FF.R",
        "DEF_Hoof.FL",
        "DEF_Hoof.FR",
        "DEF_Hoof.HL",
        "DEF_Hoof.HR",
    )
    previous = bone_positions(armature, run, RUN_END - 1, controls)
    first = bone_positions(armature, run, RUN_START, controls)
    second = bone_positions(armature, run, RUN_START + 1, controls)
    last = bone_positions(armature, run, RUN_END, controls)
    rotations_previous = bone_rotations(armature, run, RUN_END - 1, controls)
    rotations_first = bone_rotations(armature, run, RUN_START, controls)
    rotations_second = bone_rotations(armature, run, RUN_START + 1, controls)
    rotations_last = bone_rotations(armature, run, RUN_END, controls)

    endpoint_error = max((last[name] - first[name]).length for name in controls)
    first_step = sum((second[name] - first[name]).length for name in controls)
    vector_errors = {
        name: ((first[name] - previous[name]) - (second[name] - first[name])).length
        for name in controls
    }
    angular_endpoint = max(
        rotations_last[name].rotation_difference(rotations_first[name]).angle
        for name in controls
    )
    angular_errors = {}
    for name in controls:
        incoming = rotations_previous[name].rotation_difference(rotations_first[name])
        outgoing = rotations_first[name].rotation_difference(rotations_second[name])
        angular_errors[name] = incoming.rotation_difference(outgoing).angle
    worst_vector_name = max(vector_errors, key=vector_errors.get)
    worst_angular_name = max(angular_errors, key=angular_errors.get)
    max_vector_error = vector_errors[worst_vector_name]
    max_angular_error = angular_errors[worst_angular_name]
    print(
        f"Run loop endpoint={endpoint_error:.6f} first_step={first_step:.4f} "
        f"C1_vector={max_vector_error:.4f}({worst_vector_name}) "
        f"C1_angular={math.degrees(max_angular_error):.2f}deg({worst_angular_name})"
    )
    if endpoint_error > 1e-4 or angular_endpoint > math.radians(0.05):
        raise RuntimeError(
            f"Run endpoint pose does not close: position={endpoint_error}, "
            f"angle={math.degrees(angular_endpoint)}deg"
        )
    if first_step < 0.1:
        raise RuntimeError("Run has a zero-time hold between frame 0 and frame 1")
    if max_vector_error > 0.1:
        raise RuntimeError(
            f"Run loop vector discontinuity is too large: "
            f"{worst_vector_name}={max_vector_error}"
        )
    if max_angular_error > math.radians(8):
        raise RuntimeError(
            f"Run loop angular discontinuity is too large: "
            f"{worst_angular_name}={math.degrees(max_angular_error)}deg"
        )


def evaluated_mesh_positions(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    action: bpy.types.Action,
    frame: int,
) -> list[Vector]:
    armature.animation_data.action = action
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = horse.evaluated_get(depsgraph)
    mesh = evaluated.to_mesh()
    try:
        return [
            (evaluated.matrix_world @ vertex.co).copy()
            for vertex in mesh.vertices
        ]
    finally:
        evaluated.to_mesh_clear()


def validate_evaluated_mesh_loop(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    run: bpy.types.Action,
    *,
    label: str,
) -> None:
    previous = evaluated_mesh_positions(armature, horse, run, RUN_END - 1)
    first = evaluated_mesh_positions(armature, horse, run, RUN_START)
    second = evaluated_mesh_positions(armature, horse, run, RUN_START + 1)
    endpoint = evaluated_mesh_positions(armature, horse, run, RUN_END)
    if not (len(previous) == len(first) == len(second) == len(endpoint)):
        raise RuntimeError(f"{label}: evaluated vertex counts changed across Run")

    closure = [(end - start).length for start, end in zip(first, endpoint, strict=True)]
    seam = [
        ((start - before) - (after - start)).length
        for before, start, after in zip(previous, first, second, strict=True)
    ]
    closure_rms = math.sqrt(sum(value * value for value in closure) / len(closure))
    seam_rms = math.sqrt(sum(value * value for value in seam) / len(seam))
    seam_sorted = sorted(seam)
    seam_p95 = seam_sorted[min(len(seam_sorted) - 1, int(len(seam_sorted) * 0.95))]
    worst_index = max(range(len(seam)), key=seam.__getitem__)
    worst_groups = []
    if worst_index < len(horse.data.vertices):
        worst_groups = [
            (horse.vertex_groups[item.group].name, round(item.weight, 3))
            for item in horse.data.vertices[worst_index].groups
        ]
    print(
        f"{label} evaluated mesh",
        f"closure_rms={closure_rms:.8f}",
        f"closure_max={max(closure):.8f}",
        f"C1_rms={seam_rms:.5f}",
        f"C1_p95={seam_p95:.5f}",
        f"C1_max={max(seam):.5f}",
        f"worst_vertex={worst_index}",
        f"groups={worst_groups}",
    )
    if closure_rms > 1e-6 or max(closure) > 1e-5:
        raise RuntimeError(f"{label}: evaluated f18 mesh is not an exact f0 loop")
    if seam_rms > 0.025 or seam_p95 > 0.065 or max(seam) > 0.1:
        raise RuntimeError(f"{label}: evaluated mesh has a visible loop velocity seam")


def validate_leg_sockets(
    armature: bpy.types.Object,
    run: bpy.types.Action,
    *,
    label: str,
) -> None:
    max_rest_gap = 0.0
    for key, (lower_name, control_name, foot_name) in LEG_RIG.items():
        chain_names = (f"DEF_Fetlock.{key}", f"DEF_Pastern.{key}", f"DEF_Hoof.{key}")
        parents = (lower_name, chain_names[0], chain_names[1])
        for child_name, parent_name in zip(chain_names, parents, strict=True):
            child = armature.data.bones[child_name]
            if child.parent is None or child.parent.name != parent_name or not child.use_connect:
                raise RuntimeError(f"{label}: disconnected deform chain at {child_name}")
            max_rest_gap = max(max_rest_gap, (child.head_local - child.parent.tail_local).length)
        if armature.data.bones[control_name].use_deform or armature.data.bones[foot_name].use_deform:
            raise RuntimeError(f"{label}: IK controls must never deform the horse skin")

    armature.animation_data.action = run
    max_pose_gap = 0.0
    for frame in range(RUN_START, RUN_END + 1):
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()
        for key, (lower_name, _, _) in LEG_RIG.items():
            chain = (lower_name, f"DEF_Fetlock.{key}", f"DEF_Pastern.{key}", f"DEF_Hoof.{key}")
            for parent_name, child_name in zip(chain[:-1], chain[1:], strict=True):
                parent_tail = armature.matrix_world @ armature.pose.bones[parent_name].tail
                child_head = armature.matrix_world @ armature.pose.bones[child_name].head
                max_pose_gap = max(max_pose_gap, (child_head - parent_tail).length)
    print(
        f"{label} socket validator",
        f"rest_max={max_rest_gap:.8f}",
        f"pose_max={max_pose_gap:.8f}",
    )
    if max_rest_gap > 1e-6 or max_pose_gap > 1e-5:
        raise RuntimeError(f"{label}: deform leg socket opens during Run")


def validate_hoof_clearance(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    run: bpy.types.Action,
) -> None:
    indexes = hoof_indexes(horse)
    armature.animation_data.action = run
    depsgraph = bpy.context.evaluated_depsgraph_get()
    lowest_by_frame: list[float] = []
    for frame in range(RUN_START, RUN_END + 1):
        bpy.context.scene.frame_set(frame)
        depsgraph.update()
        evaluated = horse.evaluated_get(depsgraph)
        mesh = evaluated.to_mesh()
        clearances = {
            key: min((evaluated.matrix_world @ mesh.vertices[index].co).z for index in values)
            for key, values in indexes.items()
        }
        evaluated.to_mesh_clear()
        lowest_by_frame.append(min(clearances.values()))
        print(
            "Gallop clearance",
            frame,
            " ".join(f"{key}={value:.3f}" for key, value in clearances.items()),
        )
    # Validate the exact runtime transform: the race wrapper places the model
    # at +0.02m after applying its 0.38 scale. This donor's authored contact is
    # intentionally 5.2cm below local zero, yielding a 0.2mm track clearance
    # at runtime rather than a hovering hoof or a visible intersection.
    runtime_clearance = 0.02 + min(lowest_by_frame) * 0.38
    print(f"Runtime minimum hoof clearance={runtime_clearance:.5f}")
    if runtime_clearance < -0.0005:
        raise RuntimeError(
            f"Gallop penetrates the runtime track: {runtime_clearance:.5f}"
        )
    if max(lowest_by_frame) < 0.12:
        raise RuntimeError("Gallop has no readable all-hooves suspension phase")


def validate_hoof_shell_overlap(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    hoof_shells: list[bpy.types.Object],
    run: bpy.types.Action,
) -> None:
    indexes = hoof_indexes(horse)
    shells = {obj.name.rsplit(".", 1)[-1]: obj for obj in hoof_shells}
    armature.animation_data.action = run
    depsgraph = bpy.context.evaluated_depsgraph_get()
    max_gap = 0.0
    minimum_shell_z = float("inf")
    for frame in range(RUN_START, RUN_END + 1):
        bpy.context.scene.frame_set(frame)
        depsgraph.update()
        evaluated_body = horse.evaluated_get(depsgraph)
        body_mesh = evaluated_body.to_mesh()
        try:
            for key, values in indexes.items():
                body_points = [
                    evaluated_body.matrix_world @ body_mesh.vertices[index].co
                    for index in values
                ]
                shell = shells[key]
                evaluated_shell = shell.evaluated_get(depsgraph)
                shell_mesh = evaluated_shell.to_mesh()
                try:
                    shell_points = [
                        evaluated_shell.matrix_world @ vertex.co
                        for vertex in shell_mesh.vertices
                    ]
                finally:
                    evaluated_shell.to_mesh_clear()
                minimum_shell_z = min(
                    minimum_shell_z,
                    min(point.z for point in shell_points),
                )
                separations = []
                for axis in range(3):
                    body_min = min(point[axis] for point in body_points)
                    body_max = max(point[axis] for point in body_points)
                    shell_min = min(point[axis] for point in shell_points)
                    shell_max = max(point[axis] for point in shell_points)
                    separations.append(
                        max(body_min - shell_max, shell_min - body_max, 0.0)
                    )
                max_gap = max(max_gap, Vector(separations).length)
        finally:
            evaluated_body.to_mesh_clear()
    runtime_clearance = 0.02 + minimum_shell_z * 0.38
    print(
        "Hoof shell validator",
        f"max_aabb_gap={max_gap:.6f}",
        f"runtime_clearance={runtime_clearance:.6f}",
    )
    if max_gap > 0.005:
        raise RuntimeError("A hoof shell separates from its connected ankle silhouette")
    if runtime_clearance < -0.0005:
        raise RuntimeError("A hoof shell penetrates the runtime track")


def export_glb(
    armature: bpy.types.Object,
    horse: bpy.types.Object,
    saddle: bpy.types.Object,
    facial_features: bpy.types.Object,
    hair_tufts: bpy.types.Object,
    hoof_shells: list[bpy.types.Object],
) -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (armature, horse, saddle, facial_features, hair_tufts, *hoof_shells):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = armature
    print(
        "Export selection",
        [(obj.name, obj.type, obj.select_get()) for obj in bpy.context.scene.objects],
    )
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
    print(f"Exported GLB bytes={size}")
    if size > MAX_GLB_BYTES:
        raise RuntimeError(f"Horse GLB exceeds 2MB: {size} bytes")


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_preview_stage() -> tuple[bpy.types.Object, bpy.types.Object]:
    floor_material = toy_material("PreviewFloor", "#D8EEDB", roughness=0.86, coat=0)
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, -0.015))
    floor = bpy.context.object
    floor.name = "PreviewFloor"
    floor.data.materials.append(floor_material)

    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    camera.data.lens = 66

    lights = (
        ((-5.5, -6.2, 8.0), 620, 5.8, (1.0, 0.82, 0.74)),
        ((5.2, -2.0, 5.1), 280, 5.0, (0.68, 0.82, 1.0)),
        ((0.0, 5.2, 7.0), 380, 4.8, (1.0, 0.76, 0.82)),
    )
    for location, energy, size, color in lights:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = "DISK"
        light.data.size = size
        light.data.color = color
        point_at(light, (0, 0, 2.1))
    return floor, camera


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.fps = FPS
    scene.render.resolution_percentage = 100
    scene.render.image_settings.color_depth = "8"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = -0.65
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (*srgb("#F5E9DD"), 1.0)
    background.inputs["Strength"].default_value = 0.45


def render_png(
    camera: bpy.types.Object,
    path: Path,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    *,
    resolution: tuple[int, int] = (760, 760),
    lens: float = 66,
) -> None:
    scene = bpy.context.scene
    camera.location = location
    camera.data.lens = lens
    point_at(camera, target)
    scene.camera = camera
    scene.render.resolution_x, scene.render.resolution_y = resolution
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def render_qa(
    armature: bpy.types.Object,
    idle: bpy.types.Action,
    run: bpy.types.Action,
) -> None:
    configure_render()
    floor, camera = add_preview_stage()
    armature.animation_data.action = idle
    bpy.context.scene.frame_set(24)

    render_png(camera, HERO, (-6.7, -7.6, 4.45), (0, -0.35, 2.25), lens=64)
    render_png(camera, QA_FRONT, (0, -11.7, 3.7), (0, -0.35, 2.45), lens=66)
    render_png(
        camera,
        QA_FACE,
        (0, -7.25, 4.18),
        (0, -2.47, 4.02),
        resolution=(760, 620),
        lens=76,
    )
    render_png(camera, QA_LEFT, (-12.5, 0, 3.45), (0, 0, 2.15), lens=60)
    render_png(camera, QA_REAR, (0, 10.5, 3.45), (0, 0.15, 2.15), lens=70)
    render_png(camera, QA_RIGHT, (12.5, 0, 3.45), (0, 0, 2.15), lens=60)
    render_png(
        camera,
        QA_SIDE_QUARTER,
        (-24.0, 0, 4.2),
        (0, 0, 2.2),
        resolution=(390, 240),
        lens=64,
    )
    render_png(
        camera,
        QA_RUNTIME_QUARTER,
        (-11.0, -11.0, 3.20),
        (0, -0.30, 2.45),
        resolution=(390, 260),
        lens=62,
    )

    # Lobby art is rendered from the exact production mesh/materials.
    CARD.parent.mkdir(parents=True, exist_ok=True)
    floor.hide_render = True
    for obj in bpy.context.scene.objects:
        if obj.type == "LIGHT":
            obj.hide_render = False
    camera.location = (-8.3, -9.4, 4.20)
    camera.data.lens = 60
    point_at(camera, (0, -0.25, 2.35))
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.resolution_x = 640
    scene.render.resolution_y = 480
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 94
    scene.render.film_transparent = True
    scene.render.filepath = str(CARD)
    bpy.ops.render.render(write_still=True)
    floor.hide_render = False

    armature.animation_data.action = run
    for frame, path in ((0, QA_CONTACT), (8, QA_SUSPENSION), (13, QA_COMPRESSION)):
        bpy.context.scene.frame_set(frame)
        render_png(camera, path, (-12.8, 0, 3.35), (0, 0, 2.0), resolution=(760, 620), lens=60)

    if MOTION_FRAMES.exists():
        shutil.rmtree(MOTION_FRAMES)
    MOTION_FRAMES.mkdir(parents=True)
    scene.render.resolution_x = 640
    scene.render.resolution_y = 360
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    scene.render.filepath = str(MOTION_FRAMES / "frame_")
    scene.frame_start = RUN_START
    scene.frame_end = RUN_END - 1  # exclude duplicated loop endpoint from GIF
    camera.location = (-13.2, 0, 3.35)
    camera.data.lens = 58
    point_at(camera, (0, 0, 2.0))
    bpy.ops.render.render(animation=True)

    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js is required to assemble the motion QA GIF")
    subprocess.run(
        [
            node,
            str(ROOT / "scripts" / "render_gallop_gif.mjs"),
            str(MOTION_FRAMES),
            str(MOTION_PREVIEW),
        ],
        cwd=ROOT,
        check=True,
    )


def clear_scene_and_data() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        action.use_fake_user = False
        bpy.data.actions.remove(action, do_unlink=True)
    for collection in (bpy.data.meshes, bpy.data.armatures, bpy.data.materials):
        for block in list(collection):
            if block.users == 0:
                collection.remove(block)


def validate_reimport() -> None:
    clear_scene_and_data()
    bpy.ops.import_scene.gltf(filepath=str(OUT), import_shading="NORMALS")
    scene = bpy.context.scene
    scene.render.fps = FPS

    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    body = next((obj for obj in meshes if obj.name.startswith("HorseBody")), None)
    if body is None:
        raise RuntimeError(f"Re-imported GLB has no HorseBody: {[obj.name for obj in meshes]}")
    tris = triangle_count(body.data)
    actions = {action.name for action in bpy.data.actions}
    materials = {material.name for obj in meshes for material in obj.data.materials if material is not None}
    bounds = [body.matrix_world @ Vector(corner) for corner in body.bound_box]
    dimensions = tuple(max(point[index] for point in bounds) - min(point[index] for point in bounds) for index in range(3))
    size = OUT.stat().st_size
    print(
        "Re-import validator",
        f"actions={sorted(actions)}",
        f"materials={sorted(materials)}",
        f"tris={tris}",
        f"dimensions={tuple(round(value, 3) for value in dimensions)}",
        f"bytes={size}",
    )
    if actions != {"Idle", "Run"}:
        raise RuntimeError(f"GLB must contain exactly Idle and Run, got {actions}")
    if "SaddleColor" not in materials or len(materials) > 6:
        raise RuntimeError(f"GLB material contract failed: {materials}")
    if not MIN_BODY_TRIS <= tris <= MAX_BODY_TRIS:
        raise RuntimeError(f"Re-import triangle budget failed: {tris}")
    if size > MAX_GLB_BYTES:
        raise RuntimeError(f"Re-import GLB exceeds 2MB: {size}")
    if not (1.4 < dimensions[0] < 2.6 and 4.3 < dimensions[1] < 6.3 and 4.0 < dimensions[2] < 6.2):
        raise RuntimeError(f"Re-imported bounds are implausible: {dimensions}")

    armature = next((obj for obj in scene.objects if obj.type == "ARMATURE"), None)
    if armature is None:
        raise RuntimeError("Re-imported GLB has no armature")
    if abs(float(armature.get("strideLength", 0.0)) - STRIDE_LENGTH) > 1e-6:
        raise RuntimeError("Re-imported armature lost strideLength=5.25")
    saddle = next((obj for obj in meshes if obj.name.startswith("SaddleBlanket")), None)
    face = next((obj for obj in meshes if obj.name.startswith("FaceDetails")), None)
    hair = next((obj for obj in meshes if obj.name.startswith("HairTufts")), None)
    if saddle is None or saddle.parent is not armature or saddle.parent_type != "BONE" or saddle.parent_bone != "Back":
        raise RuntimeError("Re-imported saddle lost its Back bone parenting")
    if face is None or face.parent is not armature or face.parent_type != "BONE" or face.parent_bone != "Head":
        raise RuntimeError("Re-imported facial features lost Head bone parenting")
    if hair is None or hair.parent is not armature or not any(
        modifier.type == "ARMATURE" for modifier in hair.modifiers
    ):
        raise RuntimeError("Re-imported hair tufts lost their skinned armature binding")
    if not any(modifier.type == "ARMATURE" for modifier in body.modifiers):
        raise RuntimeError("Re-imported HorseBody is not a skinned mesh")
    run = bpy.data.actions["Run"]
    if tuple(round(value) for value in run.frame_range) != (RUN_START, RUN_END):
        raise RuntimeError(f"Run range changed during GLB round-trip: {tuple(run.frame_range)}")
    validate_motion(armature, run)
    validate_evaluated_mesh_loop(armature, body, run, label="Re-import")


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Preserved CC0 source is missing: {SOURCE}")
    bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
    scene = bpy.context.scene
    scene.render.fps = FPS

    armature = bpy.data.objects.get("AnimalArmature")
    horse = bpy.data.objects.get("Horse")
    if armature is None or armature.type != "ARMATURE" or horse is None or horse.type != "MESH":
        raise RuntimeError("Unexpected Quaternius Horse.blend structure")
    armature.name = "HorseRig"
    armature.data.name = "HorseRig"
    horse.name = "HorseBody"
    horse.data.name = "HorseBody"

    create_deformation_leg_chains(armature, horse)
    armature.data.pose_position = "REST"
    eye_anchors = reshape_character(horse)
    production_materials = assign_production_materials(horse)
    remesh_surface(horse, armature)
    prune_and_normalize_skin(horse, armature)
    armature.data.pose_position = "POSE"
    idle, run = prepare_actions(armature, horse)
    armature.data.pose_position = "REST"
    saddle = create_saddle(armature, horse, production_materials)
    facial_features = create_facial_features(armature, horse, eye_anchors, production_materials)
    hair_tufts = create_hair_tufts(armature, production_materials["accent"])
    hoof_shells = create_hoof_shells(armature, production_materials["accent"])
    armature.data.pose_position = "POSE"
    validate_motion(armature, run)
    validate_leg_sockets(armature, run, label="Pre-export")
    validate_evaluated_mesh_loop(armature, horse, run, label="Pre-export")
    validate_hoof_clearance(armature, horse, run)
    validate_hoof_shell_overlap(armature, horse, hoof_shells, run)
    export_glb(armature, horse, saddle, facial_features, hair_tufts, hoof_shells)
    render_qa(armature, idle, run)
    validate_reimport()

    print(f"Wrote {OUT}")
    print(f"Card {CARD}")
    print(f"Hero {HERO}")
    print(f"Motion {MOTION_PREVIEW}")


if __name__ == "__main__":
    main()
