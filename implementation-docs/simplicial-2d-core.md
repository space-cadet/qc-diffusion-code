# Simplicial Foundational Core - 2D Implementation

*Created: 2026-01-28 23:53:00 IST*
*Last Updated: 2026-01-28 23:53:00 IST*

*Purpose*: 2D triangulation core with half-edge structure and Pachner moves (1-3, 2-2, 3-1)

## Overview

This document defines the 2D triangulation core using half-edge structure, including adjacency queries, Pachner move implementations, and validation functions.

## Half-Edge Structure

Each edge is represented as two directed half-edges:
- Each half-edge has: origin vertex, incident face, next half-edge in face, twin (opposite)
- Boundary edges have twin = null
- Enables O(1) adjacency queries

### Core Operations

```typescript
// Query operations
function getVertexHalfEdges(topology: SimplicialComplexTopology, vertexId: number): HalfEdge[];
function getFaceHalfEdges(topology: SimplicialComplexTopology, faceId: number): HalfEdge[];
function getAdjacentFaces(topology: SimplicialComplexTopology, faceId: number): number[];
function getVertexFaces(topology: SimplicialComplexTopology, vertexId: number): number[];

// Validation operations
function validateManifoldEdge(topology: SimplicialComplexTopology, edgeId: number): boolean;
function validateFaceOrientation(topology: SimplicialComplexTopology, faceId: number): boolean;
function validateTriangulation(topology: SimplicialComplexTopology): ValidationResult;
```

## 2D Pachner Move Implementations

### 1-3 Move (Subdivision)

**Preconditions**:
- Selected face exists
- Face is interior (not boundary)

**Operation**:
1. Create new vertex at centroid (geometric) or arbitrary (topological)
2. Create 3 new faces: (v0, v1, newV), (v1, v2, newV), (v2, v0, newV)
3. Create 6 new half-edges with proper adjacency
4. Remove original face and its 3 half-edges
5. Update adjacency maps

**Validation**:
- Check face exists and is interior
- Ensure new vertex doesn't create degenerate triangles (if geometry present)

**Implementation Notes**:
- Centroid calculation: (pos0.x + pos1.x + pos2.x) / 3 for x, similarly for y
- New vertex ID: max(existing IDs) + 1
- Update vertexCount: increment by 1
- Preserve vertex positions for new vertex

### 2-2 Move (Edge Flip)

**Preconditions**:
- Selected edge is interior (has two incident faces)
- The two faces form a convex quadrilateral in embedding (if geometry present)
- Four vertices are distinct

**Operation**:
1. Identify two faces sharing edge: (vA, vB, vC) and (vA, vB, vD)
2. Remove edge (vA, vB) and its half-edges
3. Create new edge (vC, vD)
4. Create two new faces: (vA, vC, vD) and (vB, vC, vD)
5. Update half-edge adjacency

**Validation**:
- Edge has exactly 2 incident faces
- Quadrilateral is convex (if geometry): cross product test
- No self-intersection

**Geometric Validation**:
```typescript
function validateConvexQuadrilateral(
  geometry: SimplicialComplexGeometry,
  vA: number, vB: number, vC: number, vD: number
): boolean {
  // Check if quadrilateral (vA, vC, vB, vD) is convex
  // Use cross product signs
  const posA = geometry.positions.get(vA);
  const posB = geometry.positions.get(vB);
  const posC = geometry.positions.get(vC);
  const posD = geometry.positions.get(vD);
  
  if (!posA || !posB || !posC || !posD) return false;
  
  // Compute cross products
  const cross1 = (posC.x - posA.x) * (posD.y - posA.y) - (posC.y - posA.y) * (posD.x - posA.x);
  const cross2 = (posC.x - posB.x) * (posD.y - posB.y) - (posC.y - posB.y) * (posD.x - posB.x);
  
  // Both should have same sign for convex quadrilateral
  return cross1 * cross2 > 0;
}
```

### 3-1 Move (Coarsening)

**Preconditions**:
- Selected vertex has exactly 3 incident faces
- These 3 faces form a closed fan around vertex
- The 3 outer vertices form a single triangle boundary

**Operation**:
1. Identify vertex v and its 3 incident faces
2. Get outer vertices: v1, v2, v3 (one from each face, not v)
3. Verify (v1, v2, v3) form a triangle (check edges exist)
4. Remove vertex v, its 3 incident faces, and associated half-edges
5. Create new face (v1, v2, v3)
6. Update adjacency

**Validation**:
- Vertex has exactly 3 incident faces
- Outer vertices are distinct
- Edges (v1, v2), (v2, v3), (v3, v1) exist
- Removing faces doesn't create non-manifold edges

**Implementation Notes**:
- Decrement vertexCount by 1
- Remove vertex from vertexPositions map
- Ensure outer vertices form a valid triangle (edges exist between them)
- This is the inverse of 1-3 move

## Testing Strategy

### Unit Tests

- Test each Pachner move in isolation
- Test boundary conditions (interior vs boundary faces/edges/vertices)
- Test invalid configurations (wrong number of incident simplices)
- Test inverse moves (1-3 then 3-1 should restore original complex)

### Integration Tests

- Test random move sequences
- Test move count accumulation
- Test vertex position preservation
- Test manifold property preservation

### Geometric Tests

- Test convex quadrilateral detection for 2-2 move
- Test triangle area thresholds (prevent degenerate triangles)
- Test quality metrics (aspect ratio, minimum angle)

## Implementation Checklist

- [ ] Implement half-edge structure (HalfEdgeStructure.ts)
- [ ] Implement 2D query operations
- [ ] Implement 2D validation
- [ ] Implement 1-3 move with validation (PachnerMoves2D.ts)
- [ ] Implement 2-2 move with validation
- [ ] Implement 3-1 move with validation
- [ ] Create 2D unit tests
- [ ] Add geometric quality checks

## Known Issues in Current Implementation

### Critical Issues
1. **3-1 move incorrect**: Doesn't select correct boundary cycle, doesn't remove vertex
2. **moveCount reset**: Resets to zeros every step instead of accumulating
3. **selectMove() ignores 2D moves**: Only samples 3D moves, causing 2D simulation to stall

### High Priority
1. **Type safety**: dimension typed as number, not Dimension (2|3)
2. **Geometric validation missing**: No convex quadrilateral check for 2-2 move
3. **Preview ID conflicts**: Hardcoded IDs (999, 998, etc.) can conflict with existing IDs

### Medium Priority
1. **Inverse moves**: No verification that moves are true inverses
2. **No quality metrics**: No triangle area checks
3. **No topological invariants**: No Euler characteristic computation

## Related Documents

- **[simplicial-shared-aspects.md](./simplicial-shared-aspects.md)**: Shared data structures and types
- **[simplicial-3d-core.md](./simplicial-3d-core.md)**: 3D tetrahedral core and Pachner moves
- **[simplicial-integration.md](./simplicial-integration.md)**: Integration path and migration strategy

## Task Reference
- **[C28b](../memory-bank/tasks/C28b.md)**: 2D Simplicial Pachner Moves Implementation

## References

- Pachner, U. (1991). "P.L.S. collapse and moves for triangulated manifolds"
- Lickorish, W.B.R. (1999). "Simplicial structures on topological spaces"
