# Overlap Prevention & Initial State Selection
*Created: 2026-01-30 23:30:00 IST*
*Last Updated: 2026-01-30 23:30:00 IST*
*Task: T30a*

## Overview

Two features added to boundary growth (T30): geometric overlap prevention and selectable initial states (single simplex vs triangle/tet strip for Cauchy surface evolution).

## 1. Overlap Prevention

### Parameters
- `preventOverlap: boolean` added to `BoundaryGrowthParams`
- UI: checkbox in parameter panel

### 2D Intersection Test
- `trianglesOverlap2D(p0, p1, p2, existingFaces, geometry)`: checks if candidate triangle overlaps any existing face
- Uses segment-segment intersection for all edge pairs
- Falls back to point-in-triangle containment check
- Returns `true` if any overlap detected

### 3D Intersection Test
- `tetrahedronOverlaps3D(newPos, existingTets, geometry, threshold)`: bounding-sphere proximity check
- Computes centroid and radius of candidate tet, checks distance to existing tet centroids
- Simplified — full tet-tet intersection is expensive and unnecessary for visual quality

### Controller Retry Logic
- In `applyMove()`, when `preventOverlap` is true:
  - Try up to 10 different random boundary elements
  - For each, compute candidate vertex position and run overlap test
  - Accept first non-overlapping result; skip step if all fail

## 2. Initial State Selection

### Parameters
- `initialState: 'single-simplex' | 'triangle-strip'` added to `BoundaryGrowthParams`
- `stripLength: number` (3-20, default 8) — number of triangles/tets in strip

### Triangle Strip (2D)
```
  V2------V4------V6------V8
  /\      /\      /\      /\
 /  \    /  \    /  \    /  \
/    \  /    \  /    \  /    \
V1----V3------V5------V7------V9
```
- Alternating up/down triangles sharing edges
- Boundary = top and bottom zigzag edges
- Topology: `createTriangleStripTopology(n)`
- Geometry: `createTriangleStripGeometry(n, centerX, centerY, scale)`

### Tet Strip (3D)
- Row of N tetrahedra sharing triangular faces
- Each pair shares one face; alternating orientation
- Topology: `createTetStripTopology(n)`
- Geometry: `createTetStripGeometry(n, centerX, centerY, centerZ, scale)`

### Controller Routing
- `initialize()` checks `params.initialState` to select topology/geometry factory

## File Changes
- `frontend/src/lab/types/simplicial.ts` — extend BoundaryGrowthParams
- `frontend/src/lab/simplicial/core/types.ts` — add strip topology factories
- `frontend/src/lab/simplicial/geometry/types.ts` — add strip geometry factories
- `frontend/src/lab/simplicial/operations/BoundaryGrowth.ts` — add overlap detection
- `frontend/src/lab/controllers/BoundaryGrowthController.ts` — retry logic, init routing
- `frontend/src/SimplicialGrowthPage.tsx` — UI controls (select, slider, checkbox)

## References
- Parent task: `memory-bank/tasks/T30.md`
- Parent impl: `memory-bank/implementation-details/boundary-growth-algorithm.md`
- arXiv:1108.1974v2 Section 5, Figure 10
