# Simplicial Foundational Core - Shared Aspects

*Created: 2026-01-28 23:53:00 IST*
*Last Updated: 2026-01-28 23:53:00 IST*

*Purpose*: Shared data structures, types, and architectural principles for 2D and 3D simplicial complexes

## Overview

This document defines the shared foundation for both 2D triangulations and 3D tetrahedral complexes, including core types, architectural principles, and common validation patterns.

## Architecture Principles

1. **Topology-Geometry Separation**
   - Topology: Purely combinatorial structure (vertices, simplices, adjacency)
   - Geometry: Optional embedding (positions) for visualization and quality checks

2. **Explicit Adjacency Representation**
   - 2D: Half-edge structure for triangulations
   - 3D: Tetrahedra with face adjacency maps

3. **Pure Operations with Validation**
   - All operations are pure functions
   - Validation before transformation
   - Clear failure modes

4. **Incremental Implementation**
   - Start with correct 2D core
   - Extend to 3D once 2D is solid

## Core Data Structures

### Topological Types

```typescript
// Core simplex types (purely topological)
interface Vertex {
  id: number;
}

interface Edge {
  id: number;
  vertices: [number, number]; // ordered pair for orientation
}

interface Face {
  id: number;
  vertices: [number, number, number]; // ordered triple for orientation
}

interface Tetrahedron {
  id: number;
  vertices: [number, number, number, number];
}

// Adjacency structures
interface HalfEdge {
  id: number;
  origin: number;      // vertex id
  face: number | null; // incident face (null for boundary)
  next: number;       // next half-edge in face
  twin: number | null; // opposite half-edge (null for boundary)
}

interface FaceToTetrahedronMap {
  // Maps sorted vertex triple [v0, v1, v2] to incident tetrahedra
  [key: string]: number[];
}

interface SimplicialComplexTopology {
  vertices: Map<number, Vertex>;
  edges: Map<number, Edge>;
  faces: Map<number, Face>;
  tetrahedra: Map<number, Tetrahedron>;
  halfEdges: Map<number, HalfEdge>;
  faceToTets: FaceToTetrahedronMap;
  dimension: 2 | 3;
}
```

### Geometric Types (Optional)

```typescript
interface VertexPosition {
  x: number;
  y: number;
  z?: number; // for 3D
}

interface SimplicialComplexGeometry {
  positions: Map<number, VertexPosition>;
}
```

### Move Types

```typescript
type PachnerMove2D = '1-3' | '2-2' | '3-1';
type PachnerMove3D = '1-4' | '2-3' | '3-2' | '4-1';
type PachnerMove = PachnerMove2D | PachnerMove3D;
```

## Validation Functions

### ValidationResult Interface

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Topological Validation

```typescript
function validateSimplicialComplex(topology: SimplicialComplexTopology): ValidationResult {
  // Check: all simplex references are valid
  // Check: adjacency consistency
  // Check: manifold conditions
  // Check: no duplicate simplices
}

function validatePachnerMovePreconditions(
  topology: SimplicialComplexTopology,
  moveType: PachnerMove,
  targetId: number
): ValidationResult {
  // Move-specific validation
}
```

### Geometric Validation (Optional)

```typescript
function validateConvexQuadrilateral(
  geometry: SimplicialComplexGeometry,
  vA: number, vB: number, vC: number, vD: number
): boolean {
  // Check if quadrilateral (vA, vC, vB, vD) is convex
  // Use cross product signs
}

function validateTriangleArea(
  geometry: SimplicialComplexGeometry,
  face: [number, number, number],
  minArea: number
): boolean {
  // Check triangle area > minArea
}

function validateTetrahedronVolume(
  geometry: SimplicialComplexGeometry,
  tet: [number, number, number, number],
  minVolume: number
): boolean {
  // Check tetrahedron volume > minVolume
}
```

## Directory Structure

```
frontend/src/lab/simplicial/
├── core/
│   ├── types.ts              # Core topological types
│   ├── SimplicialComplex.ts  # Main complex class
│   ├── HalfEdgeStructure.ts # 2D adjacency
│   ├── TetrahedralStructure.ts # 3D adjacency
│   └── validators.ts         # Validation functions
├── operations/
│   ├── PachnerMoves2D.ts     # 2D move implementations
│   └── PachnerMoves3D.ts     # 3D move implementations
├── geometry/
│   ├── Geometry.ts           # Optional embedding
│   └── quality.ts            # Quality metrics
└── algebraic/ (optional)
    ├── ChainComplex.ts      # Chain groups and boundary operators
    ├── Homology.ts          # Homology computation
    └── invariants.ts        # Euler characteristic, Betti numbers
```

## Chain Complex Operations (Optional Extension)

**Purpose**: Compute topological invariants and verify Pachner moves preserve homology

**When to Use**:
- Computing Euler characteristic and Betti numbers
- Verifying Pachner moves preserve topology
- Implementing discrete differential geometry
- Physics applications requiring homology calculations

**Core Types**:
```typescript
// Chain group C_k: free abelian group on k-simplices
interface Chain {
  simplices: Map<number, number>; // simplex id -> coefficient (usually 0 or 1)
}

// Boundary operator ∂_k: C_k -> C_{k-1}
interface BoundaryOperator {
  apply(chain: Chain, k: number): Chain;
}

// Homology group H_k = ker(∂_k) / im(∂_{k+1})
interface HomologyGroup {
  bettiNumbers: number[];
  torsion: Chain[];
}
```

**Key Operations**:
```typescript
// Boundary operator
function computeBoundary(topology: SimplicialComplexTopology, k: number): BoundaryOperator;

// Homology computation
function computeHomology(topology: SimplicialComplexTopology): HomologyGroup;

// Topological invariants
function computeEulerCharacteristic(topology: SimplicialComplexTopology): number;
function computeBettiNumbers(topology: SimplicialComplexTopology): number[];

// Pachner move verification
function verifyHomologyPreservation(
  before: SimplicialComplexTopology,
  after: SimplicialComplexTopology,
  moveType: PachnerMove
): boolean;
```

**Implementation Notes**:
- Chain complex operations can be added as separate module without changing core
- Use sparse representation for chain groups (most coefficients are 0)
- Homology computation requires linear algebra (Smith normal form)
- Optional for basic Pachner move implementation
- Essential for advanced physics applications

## Related Documents

- **[simplicial-2d-core.md](./simplicial-2d-core.md)**: 2D triangulation core and Pachner moves
- **[simplicial-3d-core.md](./simplicial-3d-core.md)**: 3D tetrahedral core and Pachner moves
- **[simplicial-integration.md](./simplicial-integration.md)**: Integration path and migration strategy

## Task Reference
- **[C28a](../memory-bank/tasks/C28a.md)**: Simplicial Foundational Core Implementation

## References

- Pachner, U. (1991). "P.L.S. collapse and moves for triangulated manifolds"
- Lickorish, W.B.R. (1999). "Simplicial structures on topological spaces"
- Thurston, W.P. (1997). "Three-dimensional geometry and topology"
- Regge, T. (1961). "General relativity without coordinates"
