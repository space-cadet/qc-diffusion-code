---
kind: edit_chunk
id: t27-react-hooks
created_at: 2026-05-09 10:00:00 IST
task_ids: [T27]
source_branch: cloud-claw/t27-webgl-rewrite
source_commit: HEAD
---
#### 10:00:00 IST - T27: React Hooks for V2 Architecture
- Created `frontend/src/hooks/usePhysicsEngine.ts` - Hook wrapping PhysicsEngineV2
- Created `frontend/src/hooks/useWebGLRenderer.ts` - Hook wrapping WebGLRendererV2
- Features: Engine created once, provides step/reset/updateParams/getStats. Renderer initializes on canvas mount, provides render/resize.
