# MCP decisions

Last reviewed: 2026-07-14.

## Current decision

No additional 3D-generation MCP is part of the production path. The horse
audit showed that the bottleneck was connected topology, quadruped deformation,
four-beat contact, loop closure, and runtime cadence—not the number of generated
meshes. The production route therefore uses a reviewed CC0 quadruped source and
a deterministic Blender remaster instead of another opaque generation step.

| Tool | Decision | Reason |
| --- | --- | --- |
| Blender CLI | Use | Deterministic, reviewable, versionable source for every production GLB. |
| Blender MCP | Conditional only | Useful for supervised scene inspection, but it executes arbitrary Blender Python and collects telemetry unless disabled. If enabled: localhost only, reviewed pinned version, `DISABLE_TELEMETRY=true`, saved `.blend` first. |
| Quaternius CC0 source | Use for the remastered horse | A connected 50-bone quadruped and authored clips are a safer base than generating disconnected geometry. Preserve the official source/license and run every change through the local Blender validator. |
| Anything World | Do not add for this pass | Its official lean-hooved-mammal list includes Run/Canter/Trot but no explicit production gallop; downloads/API access also add an external, early-access dependency. Revisit only for a measured A/B test. |
| Meshy MCP/API | Do not use for the horse | Useful for props and drafts. Official rigging currently targets standard humanoid/biped assets and explicitly excludes non-humanoids. |
| Tripo MCP/API | Do not use for final gallop | MCP is alpha. Retargeting exposes `quadruped:walk`, not a production quadruped gallop preset. |
| Figma MCP | Optional for UI review | Good for variables, components, Code Connect, and comparing flows. It does not improve 3D animation and should be connected only when a real Figma file becomes a design source of truth. |

Primary references:

- https://github.com/ahujasid/blender-mcp
- https://quaternius.com/packs/ultimateanimatedanimals.html
- https://anything-world.gitbook.io/anything-world/quickstart/animate-anything-quickstart/animations-by-category
- https://anything-world.gitbook.io/anything-world/quickstart/animate-anything-quickstart/faq
- https://docs.meshy.ai/en/api/rigging
- https://github.com/meshy-dev/meshy-mcp-server
- https://docs.tripo3d.ai/animation/retarget.html
- https://github.com/VAST-AI-Research/tripo-mcp
- https://developers.figma.com/docs/figma-mcp-server/

## Re-evaluation gate

Reconsider a generation service only for a bounded prop or quadruped A/B
comparison with an explicit gallop export. Never upload a licensed asset
without explicit permission. Generated output must pass license review,
Blender cleanup, silhouette review, topology/rig inspection, animation contact
review, loop closure, and web budget checks before entering `public/models/`.
