# Simplicial Foundational Core - 3D Implementation

*Created: 2026-01-28 23:53:00 IST*
*Last Updated: 2026-01-28 23:53:00 IST*

*Purpose*: 3D tetrahedral core with face adjacency maps and Pachner moves (1-4, 2-3, 3-2, 4-1)

## Overview

This document defines the 3D tetrahedral core using face adjacency maps, including adjacency queries, Pachner move implementations, and validation functions.

## Tetrahedron Representation

Each tetrahedron has:
- 4 vertices
- 4 faces (triangular boundaries)
- 4 neighbor tetrahedra (one across each face)

### Face Adjacency Map

```typescript
// Map from sorted face vertices to incident tetrahedra
// Example: "0,1,2" -> [tetId1, tetId2] (two tets share this face)
interface FaceToTetMap {
  [key: string]: number[];
}
```

### Core Operations

```typescript
// Query operations
function getTetrahedronFaces(topology: SimplicialComplexTopology, tetId: number): Face[];
function getTetrahedronNeighbors(topology: SimplicialComplexTopology, tetId: number): (number | null)[];
function getFaceTetrahedra(topology: SimplicialComplexTopology, face: [number, number, number]): number[];

// Validation operations
function validateTetrahedron(topology: SimplicialComplexTopology, tetId: number): boolean;
function validateManifold3D(topology: SimplicialComplexTopology): ValidationResult;
```

## 3D Pachner Move Implementations

### 1-4 Move (Subdivision)

**Preconditions**:
- Selected tetrahedron exists
- Tetrahedron is interior (all 4 faces have 2 incident tets, or boundary faces have 1)

**Operation**:
1. Create new vertex at centroid of 4 vertices
2. Create 4 new tetrahedra: each original face + new vertex
3. Update face adjacency map for all new faces
4. Remove original tetrahedron

**Validation**:
- Tetrahedron exists
- New vertex doesn't create degenerate tetrahedra (if geometry present)

**Implementation Notes**:
- Centroid calculation: (v0.x + v1.x + v2.x + v3.x) / 4 for x, similarly for y, z
- New vertex ID: max(existing IDs) + 1
- Update vertexCount: increment by 1
- Preserve vertex positions for new vertex

### 2-3 Move

**Preconditions**:
- Two adjacent tetrahedra sharing a face
- The shared face has exactly 2 incident tetrahedra

**Operation**:
1. Identify two tets sharing face F: T1 = (v0, v1, v2, v3), T2 = (v0, v1, v2, v4)
2. Remove T1, T2 and shared face F
3. Create 3 new tetrahedra: (v0, v1, v3, v4), (v0, v2, v3, v4), (v1, v2, v3, v4)
4. Update face adjacency

**Validation**:
- Two tets share exactly one face
- The shared face is interior (exactly 2 incident tets)

**Implementation Notes**:
- This is the 3D analog of the 2D 2-2 move
- Should preserve manifold property
- Update faceToTets map for all affected faces

### 3-2 Move (Inverse of 2-3)

**Preconditions**:
- Three tetrahedra around a common edge
- The three tets form a valid local configuration

**Operation**:
1. Identify three tets around edge (v0, v1): T1, T2, T3
2. Remove T1, T2, T3
3. Create 2 new tetrahedra sharing face (v2, v3, v4)
4. Update adjacency

**Validation**:
- Edge has exactly 3 incident tets
- The configuration is topologically valid

**Implementation Notes**:
- This is the inverse of 2-3 move
- More complex than 2-3 due to edge configuration
- Requires careful adjacency map updates

### 4-1 Move (Coarsening)

**Preconditions**:
- Four tetrahedra sharing a common vertex
- The four tets form a closed ball around vertex

**Operation**:
1. Identify vertex v and its 4 incident tets
2. Get outer vertices (8 vertices, but should form 4 faces)
3. Remove vertex v and its 4 incident tets
4. Create 1 new tetrahedron from outer vertices
5. Update adjacency

**Validation**:
- Vertex has exactly 4 incident tets
- The 4 tets form a closed ball
- Outer vertices form a valid tetrahedron

**Implementation Notes**:
- This is the 3D analog of 2D 3-1 move
- Decrement vertexCount by 1
- Remove vertex from vertexPositions map
- This is the inverse of 1-4 move

## Testing Strategy

### Unit Tests

- Test each Pachner move in isolation
- Test boundary conditions (interior vs boundary tetrahedra)
- Test invalid configurations (wrong number of incident simplices)
- Test inverse moves (1-4 then 4-1 should restore original complex)

### Integration Tests

- Test random move sequences
- Test move count accumulation
- Test vertex position preservation
- Test manifold property preservation

### Geometric Tests

- Test tetrahedron volume thresholds
- Test quality metrics (aspect ratio, dihedral angles)
- Test non-degeneracy conditions

## Implementation Checklist

- [ ] Implement tetrahedral structure (TetrahedralStructure.ts)
- [ ] Implement 3D query operations
- [ ] Implement 3D validation
- [ ] Implement 1-4 move with validation (PachnerMoves3D.ts)
- [ ] Implement 2-3 move with validation
- [ ] Implement 3-2 move with validation
- [ ] Implement 4-1 move with validation
- [ ] Create 3D unit tests
- [ ] Add geometric quality checks

## Known Issues in Current Implementation

### Critical Issues
1. **3D representation missing**: No explicit tetrahedra, only triangular faces
2. **Tetrahedron detection heuristic**: Grouping by shared vertices is insufficient
3. **3D vertexPositions empty**: createInitialVertexPositions returns empty Map for 3D

### High Priority
1. **Vertex count inconsistency**: 3D init expects 4 vertices but uses initialVertices param
2. **Incomplete face creation**: 1-4 move preview doesn't create all 12 faces for 4 tets
3. **4-1 move incorrect**: Collapses to single triangle face, not tetrahedron

### Medium Priority
1. **No face adjacency**: No efficient way to find adjacent tetrahedra
2. **No quality metrics**: No tetrahedron volume checks
3. **No topological invariants**: No Euler characteristic computation

### Low Priority
1. **Metrics placeholder**: Volume and curvature calculations are not meaningful
2. **Preview ID conflicts**: Hardcoded IDs can conflict with existing IDs
3. **No inverse verification**: No check that moves are true inverses

## Related Documents

- **[simplicial-shared-aspects.md](./simplicial-shared-aspects.md)**: Shared data structures and types
- **[simplicial-2d-core.md](./simplicial-2d-core.md)**: 2D triangulation core and Pachner moves
- **[simplicial-integration.md](./simplicial-integration.md)**: Integration path and migration strategy

## Task Reference
- **[C28c](../memory-bank/tasks/C28c.md)**: 3D Simplicial Pachner Moves Implementation

## References

- Pachner, U. (1991). "P.L.S. collapse and moves for triangulated manifolds"
- Thurston, W.P. (1997). "Three-dimensional geometry and topology"
- Regge, T. (1961). "General relativity without coordinates"
