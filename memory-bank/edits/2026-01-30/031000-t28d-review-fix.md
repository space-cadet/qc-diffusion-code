---
source_branch: claude/review-t28-su-work-jIhhn
source_commit: 2c60418
---

# T28d Review and Bug Fix Session

## Commits
1. `d9fe571` - (fix)T28: Fix dimension wiring, 3D move params, enable 2D simulation
2. `307f136` - (test)T28: Add Pachner move correctness tests and live Euler characteristic display
3. `2b2b7ed` - (feat)T28: Add Three.js 3D visualization for tetrahedral complexes
4. `2c60418` - (fix)T28: Fix PachnerMoveTester 2-tet creation and onApplyMove null safety

## File Changes
- Modified `frontend/src/SimplicialGrowthPage.tsx` - Dimension coercion, probability swap, 3D viz import, metrics panel
- Modified `frontend/src/lab/controllers/SimplicialGrowthController.ts` - 3D move param fixes, Euler char, logging
- Modified `frontend/src/lab/components/SimplicialVisualization.tsx` - Checkbox handlers, internal state
- Modified `frontend/src/lab/components/PachnerMoveTester.tsx` - 2-tet creation fix, null safety
- Created `frontend/src/lab/components/SimplicialVisualization3D.tsx` - Three.js 3D visualization
- Created `frontend/src/lab/simplicial/__tests__/PachnerMoves.test.ts` - 12 correctness tests
