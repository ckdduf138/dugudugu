"""Print the scene/rig/action contract of temporary zodiac donor blends."""

from __future__ import annotations

import json
from pathlib import Path

import bpy


SOURCE_DIR = Path("/tmp/dugudugu-zodiac-sources")


def rounded(values):
    return [round(float(value), 4) for value in values]


reports = []
for source in sorted(SOURCE_DIR.glob("*.blend")):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    reports.append(
        {
            "file": source.name,
            "objects": [
                {
                    "name": obj.name,
                    "type": obj.type,
                    "parent": obj.parent.name if obj.parent else None,
                    "dimensions": rounded(obj.dimensions),
                    "vertices": len(obj.data.vertices) if obj.type == "MESH" else None,
                    "polygons": len(obj.data.polygons) if obj.type == "MESH" else None,
                    "materials": [material.name for material in obj.data.materials if material]
                    if obj.type == "MESH"
                    else None,
                    "bones": len(obj.data.bones) if obj.type == "ARMATURE" else None,
                "bone_names": [bone.name for bone in obj.data.bones]
                if obj.type == "ARMATURE"
                else None,
                "bone_heads": {
                    bone.name: [round(value, 4) for value in bone.head_local]
                    for bone in obj.data.bones
                    if bone.name.lower() in {"root", "body", "head", "chest", "tail", "tail1"}
                }
                if obj.type == "ARMATURE"
                else None,
                    "active_action": obj.animation_data.action.name
                    if obj.animation_data and obj.animation_data.action
                    else None,
                    "nla": [
                        strip.action.name
                        for track in obj.animation_data.nla_tracks
                        for strip in track.strips
                        if strip.action
                    ]
                    if obj.animation_data
                    else [],
                }
                for obj in bpy.context.scene.objects
                if obj.type in {"MESH", "ARMATURE"}
            ],
            "actions": [
                {"name": action.name, "range": rounded(action.frame_range)}
                for action in bpy.data.actions
            ],
        }
    )

print("ZODIAC_SOURCE_REPORT=" + json.dumps(reports, ensure_ascii=False))
