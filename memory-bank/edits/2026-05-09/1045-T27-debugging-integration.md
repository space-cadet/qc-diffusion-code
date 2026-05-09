---
kind: edit_chunk
id: t27-debugging-integration
created_at: 2026-05-09 10:45:00 IST
task_ids: [T27]
source_branch: cloud-claw/t27-webgl-rewrite
source_commit: HEAD
---
#### 10:45:00 IST - T27: Debugging Integration Issues
- Identified bug: RandomWalkParameterPanel expects simulatorRef prop, causing React error on Start click
- Error remounts component tree, destroying WebGL context → blank canvas
- Attempted fix: Pass dummy simulatorRef to panel (failed — panel calls .updateParameters() internally)
- Added debug logging to usePhysicsEngine, useWebGLRenderer, ParticleCanvasV2
- Created test script scripts/test-v2.ts for Playwright testing
- Status: Blocked on parameter panel integration
