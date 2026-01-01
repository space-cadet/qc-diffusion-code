# Tetrahedron Implementation Plan

*Created: 2025-05-24*

## Two-Phase Approach

### Phase 1: Basic Tetrahedron (T67 - Ready Now)
**What**: Sequential coupling of 4 spins using existing T66 capability
**Result**: Valid quantum state, but fixed coupling order ((j1⊗j2)⊗j3)⊗j4
**Limitation**: Cannot transform between coupling schemes

```typescript
interface BasicTetrahedron {
  edgeSpins: number[];        // [j1, j2, j3, j4] 
  coupledState: StateVector;  // Final result
  totalJ: number;             // Effective angular momentum
}
```

### Phase 2: Complete Tetrahedron (Requires 6j Symbols)
**What**: Full intertwiner space with recoupling transformations
**Result**: All possible tetrahedron states, proper geometric symmetries
**Requirement**: 6j symbols for transforming between coupling schemes

```typescript
interface CompleteTetrahedron extends BasicTetrahedron {
  intertwiners: number[];           // All allowed J values
  basisStates: StateVector[];       // Complete orthogonal basis
  recouplingTransforms: Matrix[];   // 6j-based transformations
}
```

## Why 6j Symbols are Essential

Research shows 6j symbols are "the basic building block" for quantum tetrahedra because:
1. Handle coupling of 3+ angular momenta with scheme transformations
2. Provide unitary transforms between different coupling orders
3. Enable proper geometric interpretation of quantum tetrahedra

## Implementation Timeline

- **Phase 1**: 3-4 days (can start immediately with T66)
- **6j Symbols**: 3-4 days (extends T55a Wigner module) 
- **Phase 2**: 4-5 days (after 6j symbols complete)

## Bottom Line

T67 can start now with basic construction. Complete tetrahedron needs 6j symbols for mathematical rigor and physical accuracy.
