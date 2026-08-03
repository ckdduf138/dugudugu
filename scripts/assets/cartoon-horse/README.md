# Preserved Cartoon Horse source

`source.zip` is the unmodified Sketchfab download supplied by the project
owner on 2026-07-19. Its SHA-256 is:

`d4684e344d0b80bab9cb8634922f10709177d4ec9e1e96eb39325ab2c93b4c49`

The archive contains Jungle Jim's 10k cartoon horse mesh, a 43-bone rig, one
looping walk clip, a bind/static clip, and PBR textures. The downloadable
source does not contain the paid run, jump, or idle clips advertised by the
creator. `scripts/blender/build_cartoon_horse.py` therefore authors Dugudugu's
own `Idle` and `Run` actions from the included rig and walk motion; it does not
copy or reconstruct the paid animation pack.

Keep this archive unmodified so the production derivative remains auditable.
