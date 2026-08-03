"""Print the scene, rig, and action contract of the ITHappy Animals Free blend."""

from __future__ import annotations

import json

import bpy


def rounded(values):
    return [round(float(value), 4) for value in values]


def action_name(animation_data):
    if not animation_data or not animation_data.action:
        return None
    return animation_data.action.name


def iter_action_fcurves(action):
    try:
        yield from action.fcurves
        return
    except AttributeError:
        pass
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for channelbag in getattr(strip, "channelbags", []):
                yield from channelbag.fcurves


report = {
    "scene": bpy.context.scene.name,
    "frame_range": [bpy.context.scene.frame_start, bpy.context.scene.frame_end],
    "collections": [collection.name for collection in bpy.data.collections],
    "objects": [],
    "actions": [],
}

for obj in bpy.context.scene.objects:
    if obj.type not in {"MESH", "ARMATURE", "EMPTY"}:
        continue

    item = {
        "name": obj.name,
        "type": obj.type,
        "parent": obj.parent.name if obj.parent else None,
        "location": rounded(obj.location),
        "dimensions": rounded(obj.dimensions),
        "active_action": action_name(obj.animation_data),
        "nla": [
            {
                "track": track.name,
                "strip": strip.name,
                "action": strip.action.name if strip.action else None,
                "frame_range": [round(strip.frame_start, 3), round(strip.frame_end, 3)],
            }
            for track in obj.animation_data.nla_tracks
            for strip in track.strips
        ]
        if obj.animation_data
        else [],
    }

    if obj.type == "MESH":
        item.update(
            {
                "vertices": len(obj.data.vertices),
                "polygons": len(obj.data.polygons),
                "materials": [material.name for material in obj.data.materials if material],
                "armature_modifiers": [
                    modifier.object.name
                    for modifier in obj.modifiers
                    if modifier.type == "ARMATURE" and modifier.object
                ],
            }
        )
    elif obj.type == "ARMATURE":
        item.update(
            {
                "bones": len(obj.data.bones),
                "bone_names": [bone.name for bone in obj.data.bones],
            }
        )

    report["objects"].append(item)

for action in bpy.data.actions:
    curves = []
    action_curves = list(iter_action_fcurves(action))
    for curve in action_curves:
        if "Root" not in curve.data_path or not curve.data_path.endswith("location"):
            continue
        values = [point.co.y for point in curve.keyframe_points]
        curves.append(
            {
                "data_path": curve.data_path,
                "array_index": curve.array_index,
                "keys": len(curve.keyframe_points),
                "value_range": [round(min(values), 4), round(max(values), 4)]
                if values
                else None,
            }
        )
    report["actions"].append(
        {
            "name": action.name,
            "frame_range": rounded(action.frame_range),
            "users": action.users,
            "pose_markers": [marker.name for marker in action.pose_markers],
            "curves": curves,
        }
    )

print("ANIMALS_FREE_REPORT=" + json.dumps(report, ensure_ascii=False))
