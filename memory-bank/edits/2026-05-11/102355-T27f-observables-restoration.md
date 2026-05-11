---
kind: edit_chunk
id: 102355-T27f-observables-restoration
created_at: 2026-05-11 10:23:55 IST
task_ids: [T27, T27f]
source_branch: main
source_commit: 6b05933e8ed59336ebfdd066abda497be0fe5fb1
---

#### 10:23:55 IST - T27f: Restore floating observables panels and collision stats to V2 page
- Modified `frontend/src/RandomWalkSimV2.tsx` - Added FloatingPanel imports, simulatorLikeRef shim, useRandomWalkPanels hook, and both floating observables panels
- Modified `frontend/src/hooks/useOriginalPhysicsEngine.ts` - Added interparticleCollisionCountRef, summed interparticleCollisionCount in step(), returned it in getStats(), reset it on reset()
- Modified `frontend/src/components/RandomWalkParameterPanelV2.tsx` - Restored Scattering and Collisions readouts in status display
- Created `memory-bank/tasks/T27f.md` - Subtask documenting observables restoration and collision stats fix
