---
kind: edit_chunk
id: 150329-T1-bianchi-telegraph-validation
created_at: 2026-07-21 15:03:29 IST
task_ids: [T1, T27]
source_branch: main
source_commit: ce44fd2af3c628dc25cc3aa2c584d3e79f4cb93f
---

#### 15:03:29 IST - T1: Bianchi I seeded telegraph calibration
- Created `scripts/bianchi-telegraph-validation.mjs` - Seeded headless persistent-walk, absorbing telegraph solver, density/moment/front comparison, and refinement study
- Modified `package.json` - Added `pnpm validate:bianchi-telegraph`
- Created `frontend/src/physics/__tests__/BianchiTelegraphValidation.test.ts` - Covered reproducibility, $B\le0$ restriction, front bound, and finite metrics
- Modified `memory-bank/tasks/T1.md` - Recorded the calibration run and non-monotone default refinement errors
- Modified `memory-bank/tasks.md`, `memory-bank/session_cache.md`, `memory-bank/activeContext.md`, and `memory-bank/implementation-details/random-walks-diff-eq.md` - Updated the active numerical-validation record
- Modified `memory-bank/sessions/2026-05-11-morning.md` - Appended the numerical-validation follow-up
