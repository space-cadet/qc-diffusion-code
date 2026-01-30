# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-01-30 08:18:39 IST*

## Current Focus
**Task**: T30b Simplicial Boundary Conditions & 3D Tet Strip Fix
**Status**: 🔄 IN PROGRESS - Core implementation complete, UI/visualization deferred to T30c

## Immediate Context
T30b adds frozen boundary constraints to boundary growth (T30) allowing user-controlled constraints on evolution (bottom/sides frozen, growth on top), and fixes degenerate 3D tet strip geometry. UI controls deferred to T30c for better separation of concerns.

## Current Working State
- Active Tasks: 18 (T1, T2a, T2b, T3, T7, T7a, T8, T12, T15, T15a, T16, T17, T25, T27, T30, T30b, META-1, META-2)
- Completed Tasks: 21 (T0, T4, T5b, T6, T6a, T9, T10, T13, T14, T21, T21b, T24, T26, T28, T29, T29a, T30a)
- Current Focus: T30b - Simplicial Boundary Conditions & 3D Tet Strip Fix (core complete)
- Branch: claude/boundary-growth-feature-GLCrk

## Recent Completed Work (T30b)
- Added BoundaryConstraintMode type and extended BoundaryGrowthParams with boundary constraints
- Implemented getBottomAndSideBoundaries2D/3D() for automatic boundary identification
- Added frozen boundary filtering in BoundaryGrowthController.step() for both 2D and 3D
- Fixed createTetStripGeometry() to generate non-degenerate tets in two parallel layers
- Updated createTetStripTopology() to match new geometry (2*(n+1) vertices)
- Added isBoundaryFrozen() helper for efficient constraint checking
- All acceptance criteria met (7/9), UI/visualization deferred to T30c
- TypeScript builds clean, code committed and pushed
