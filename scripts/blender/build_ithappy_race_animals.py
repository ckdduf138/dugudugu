"""Build the licensed ITHappy Animals Free cast for the web race.

The downloaded ``Animals_Free.blend`` is intentionally not copied into the
repository.  Pass it to Blender as the input file, then run this script:

    blender -b /path/to/Animals_Free.blend \
      --python scripts/blender/build_ithappy_race_animals.py

The delivery is one compact GLB so the seven racers share their texture.  It
contains only the seven final-product rigs/meshes and their authored Run clips;
the source blend and unused source animations are never redistributed.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "models" / "race" / "animals" / "animals-free.glb"
MAX_BYTES = 6_000_000


@dataclass(frozen=True)
class Racer:
    key: str
    source: str
    target_height: float
    stride_length: float


RACERS = (
    Racer("tiger", "Tiger_001", 1.38, 1.36),
    Racer("horse", "Horse_001", 1.42, 1.40),
    Racer("deer", "Deer_001", 1.50, 1.28),
    Racer("dog", "Dog_001", 1.18, 1.22),
    Racer("cat", "Kitty_001", 0.98, 1.13),
    Racer("penguin", "Pinguin_001", 1.10, 0.98),
    Racer("chicken", "Chicken_001", 0.92, 1.02),
)


def evaluated_bounds(mesh: bpy.types.Object) -> tuple[Vector, Vector]:
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = mesh.evaluated_get(depsgraph)
    points = [evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box]
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return minimum, maximum


def animated_bounds(
    mesh: bpy.types.Object,
    frame_start: float,
    frame_end: float,
) -> tuple[Vector, Vector]:
    """Return the union of every authored Run frame in world space.

    Grounding a quadruped from one pose is not enough: a paw can reach lower
    later in the stride and visibly cut through the track. The delivery GLB is
    force-sampled at the scene frame rate, so checking every integer frame
    matches the poses the browser will receive.
    """

    scene = bpy.context.scene
    previous_frame = scene.frame_current
    minimum: Vector | None = None
    maximum: Vector | None = None
    first = math.floor(frame_start)
    last = math.ceil(frame_end)

    for frame in range(first, last + 1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        frame_minimum, frame_maximum = evaluated_bounds(mesh)
        if minimum is None or maximum is None:
            minimum = frame_minimum.copy()
            maximum = frame_maximum.copy()
            continue
        for axis in range(3):
            minimum[axis] = min(minimum[axis], frame_minimum[axis])
            maximum[axis] = max(maximum[axis], frame_maximum[axis])

    scene.frame_set(previous_frame)
    bpy.context.view_layer.update()
    if minimum is None or maximum is None:
        raise RuntimeError(f"No animation frames sampled for {mesh.name}")
    return minimum, maximum


def keep_only_delivery_objects() -> None:
    keep = {
        name
        for racer in RACERS
        for name in (racer.source, f"{racer.source}_rig")
    }
    for obj in list(bpy.data.objects):
        if obj.name not in keep:
            bpy.data.objects.remove(obj, do_unlink=True)


def prepare_racer(racer: Racer) -> None:
    rig = bpy.data.objects[f"{racer.source}_rig"]
    mesh = bpy.data.objects[racer.source]
    run_action = bpy.data.actions[f"{racer.source}_run"]

    # One track per animal gives glTF a stable ``<species>|Run`` clip name.
    # Removing the long idle/walk tracks keeps the final-product delivery
    # small while the runtime uses the authored rest pose for setup and stop.
    rig.animation_data_clear()
    animation_data = rig.animation_data_create()
    track = animation_data.nla_tracks.new()
    track.name = f"{racer.key}|Run"
    action_start, action_end = run_action.frame_range
    strip = track.strips.new(track.name, 0, run_action)
    strip.name = track.name
    strip.action_frame_start = action_start
    strip.action_frame_end = action_end
    strip.extrapolation = "NOTHING"
    strip.blend_type = "REPLACE"

    rig.name = f"Race_{racer.key}"
    rig.data.name = f"Race_{racer.key}_Armature"
    mesh.name = f"Race_{racer.key}_Mesh"
    mesh.data.name = f"Race_{racer.key}_Geometry"

    rig["raceAnimal"] = racer.key
    rig["strideLength"] = racer.stride_length
    rig["sourceAsset"] = "ITHappy Animals Free"

    # Use the complete Run cycle, not only its first contact. A later paw can
    # otherwise fall below the delivery ground and sink through the web track.
    # Object-level transforms preserve the source rig, weights and authored
    # motion exactly.
    minimum, maximum = animated_bounds(mesh, strip.frame_start, strip.frame_end)
    height = max(0.001, maximum.z - minimum.z)
    factor = racer.target_height / height
    rig.scale = tuple(component * factor for component in rig.scale)

    minimum, maximum = animated_bounds(mesh, strip.frame_start, strip.frame_end)
    center = (minimum + maximum) * 0.5
    rig.location.x -= center.x
    rig.location.y -= center.y
    rig.location.z -= minimum.z
    bpy.context.scene.frame_set(0)
    bpy.context.view_layer.update()

    grounded_minimum, _ = animated_bounds(mesh, strip.frame_start, strip.frame_end)
    if grounded_minimum.z < -1e-4:
        raise RuntimeError(
            f"{racer.key} Run crosses delivery ground: {grounded_minimum.z:.6f}"
        )
    print(f"ITHAPPY_RACE_GROUND_MIN_{racer.key.upper()}={grounded_minimum.z:.6f}")


def cleanup_data() -> None:
    used_actions = {f"{racer.source}_run" for racer in RACERS}
    for action in list(bpy.data.actions):
        if action.name not in used_actions:
            bpy.data.actions.remove(action)

    # Source meshes share this opaque atlas. JPEG-in-GLB is both supported by
    # core glTF and far smaller than embedding the uncompressed source image.
    for material in bpy.data.materials:
        material.blend_method = "OPAQUE"


def export() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_image_quality=76,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_attributes=False,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_merge_animation="NLA_TRACK",
        export_anim_single_armature=False,
        export_anim_slide_to_zero=True,
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_skins=True,
        export_all_influences=False,
    )


def main() -> None:
    bpy.context.scene.render.fps = 30
    keep_only_delivery_objects()
    for racer in RACERS:
        prepare_racer(racer)
    cleanup_data()
    export()

    size = OUTPUT.stat().st_size
    if size > MAX_BYTES:
        raise RuntimeError(f"Race GLB exceeds {MAX_BYTES:,} bytes: {size:,}")
    print(f"ITHAPPY_RACE_GLB={OUTPUT}")
    print(f"ITHAPPY_RACE_GLB_BYTES={size}")


main()
