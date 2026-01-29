# Boundary Growth Algorithm Implementation
*Created: 2026-01-29 22:37:00 IST*
*Last Updated: 2026-01-29 22:37:00 IST*
*Task: T30*

## Overview

Implements the stochastic growth model from arXiv:1108.1974v2 (Dittrich & Hoehn). A simplicial complex representing a spatial hypersurface grows by gluing new top-dimensional simplices onto exposed boundary faces, rather than subdividing existing interior simplices.

## Key Concepts from the Paper

### Boundary Gluing (Section 3)
- A new tetrahedron (3D) or triangle (2D) is attached to an exposed boundary face
- One face of the new simplex is identified with the boundary face
- Remaining faces of the new simplex become new boundary
- From the boundary's perspective, this induces a Pachner move

### Induced Pachner Moves
- **1-3 induced**: Gluing a simplex to a single boundary face creates a new vertex and splits the face into sub-faces on the boundary
- **2-2 induced**: When a newly glued simplex shares two faces with the existing boundary
- **3-1 induced**: When gluing completes a "cap" removing a boundary vertex

### Tent Moves (Section 5, Figure 10)
- Select a boundary vertex v with k incident boundary faces
- Create v' (future copy) displaced outward
- Glue k simplices connecting each boundary face in star(v) to v'
- This sequences 1-3, 2-2, and 3-1 Pachner moves on the boundary

## Implementation Design

### 1. Boundary Detection

For 2D complexes (faces are top-simplices):
- A boundary edge is one that belongs to exactly 1 face
- Track via edge-to-face incidence count

For 3D complexes (tetrahedra are top-simplices):
- A boundary face is one that belongs to exactly 1 tetrahedron
- Already tracked by `faceToTets` map: boundary faces have exactly 1 entry

### 2. Outward Normal Computation

**2D**: For a boundary edge (v0, v1) belonging to face F:
- Compute the edge perpendicular direction
- Orient away from the centroid of F
- Normalize and scale by desired edge length

**3D**: For a boundary face (v0, v1, v2) belonging to tet T:
- Compute face normal via cross product of two edge vectors
- Orient away from the 4th vertex of T (the interior vertex)
- Normalize and scale by desired edge length

### 3. Glue Simplex Operation

**2D** (`glueFace2D`):
1. Pick a random boundary edge (v0, v1)
2. Compute outward normal at edge midpoint
3. Create new vertex at midpoint + normal * scale
4. Create new edges: (v0, newV), (v1, newV)
5. Create new face: (v0, v1, newV)
6. Update boundary tracking

**3D** (`glueTet3D`):
1. Pick a random boundary face (v0, v1, v2)
2. Compute outward normal at face centroid
3. Create new vertex at centroid + normal * scale
4. Create new edges: (v0, newV), (v1, newV), (v2, newV)
5. Create new faces: (v0, v1, newV), (v0, v2, newV), (v1, v2, newV)
6. Create new tetrahedron: (v0, v1, v2, newV)
7. Update boundary tracking and faceToTets

### 4. Tent Move Operation

1. Select a boundary vertex v
2. Find star(v) on boundary: all boundary faces/edges incident to v
3. Create v' at position of v displaced along average outward normal
4. For each boundary face in star(v), glue a new simplex using v' instead of creating a fresh vertex
5. Update all adjacency structures

### 5. Controller

`BoundaryGrowthController` follows the same `SimulationController` interface as `SimplicialGrowthController`:
- `initialize(params)`: Creates initial complex and boundary set
- `step()`: Randomly selects glue-simplex or tent-move based on probabilities
- `reset()`, `seekToStep()`, etc.

### 6. UI Integration

- Add `TabNavigation` to `SimplicialGrowthPage` with two tabs: "Interior Moves" (existing) and "Boundary Growth" (new)
- Boundary Growth tab reuses: `MetricsGrid`, `ControlButtons`, `TimelineSlider`, `ParameterPanel`, `MetricsTable`
- Parameters: dimension (2D/3D), growth scale, glue vs tent move probability
- Visualization reuses existing `SimplicialVisualization` / `SimplicialVisualization3D`

## File Structure

```
frontend/src/lab/simplicial/operations/BoundaryGrowth.ts  - Core operations
frontend/src/lab/controllers/BoundaryGrowthController.ts   - Controller
frontend/src/lab/hooks/useBoundaryGrowth.ts                - React hook
frontend/src/SimplicialGrowthPage.tsx                      - Tab integration
```
