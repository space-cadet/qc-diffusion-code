# Edit History
*Created: 2026-02-16 05:27:33 IST*
*Last Updated: 2026-02-16 05:27:33 IST*

### 2026-02-16

#### 05:27:33 IST - T33: Boundary Growth Panel, Symmetric Simplices, Boundary Conditions Fix

- Modified `frontend/src/lab/types/simplicial.ts` - Added symmetricSimplices boolean field to BoundaryGrowthParams interface
- Modified `frontend/src/lab/simplicial/operations/BoundaryGrowth.ts` - Fixed getBottomAndSideBoundaries2D axis inversion (minY→maxY for screen y-down); replaced hard-coded 0.1 threshold with relative 2% of x-span; added symmetric param to glueTriangle2D (equilateral: edgeLen*sqrt(3)/2) and glueTetrahedron3D (regular: avgEdgeLen*sqrt(2/3))
- Modified `frontend/src/lab/controllers/BoundaryGrowthController.ts` - Dynamic frozen set recomputed each step() for bottom-and-sides mode; updated computeCandidatePosition2D/3D to respect symmetric flag; passed symmetric to all glue calls
- Modified `frontend/src/SimplicialGrowthPage.tsx` - BoundaryGrowthTab visualization wrapped in max-w-2xl container, canvas reduced from 700x500 to 600x400; symmetricSimplices default true; Symmetric Simplices checkbox added to parameters panel
- Created `memory-bank/tasks/T33.md` - Task file for T33 fixes
