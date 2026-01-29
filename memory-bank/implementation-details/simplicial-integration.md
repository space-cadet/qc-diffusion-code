# Simplicial Foundational Core - Integration

*Created: 2026-01-28 23:53:00 IST*
*Last Updated: 2026-01-29 22:51:00 IST*

*Purpose*: Integration path, migration strategy, and testing for simplicial core implementation

## Overview

This document defines the integration strategy for replacing the existing simplicial implementation with the new foundational core, including migration steps, backward compatibility, and testing.

## Integration Status

**70% Complete - Testing and Validation Remaining**
**Completed by GLM 4.7 on 2026-01-29 22:42:19 IST**

### Refactoring Summary

**12 files modified, 576 insertions(+), 818 deletions(-)**

#### Component Improvements
- PachnerMoveTester: Refactored from 548 to ~250 lines with cleaner state management
- SimplicialVisualization: Enhanced with 172 lines of improvements for better rendering
- SimplicialGrowthController: Simplified with 482 lines of architectural improvements
- ChainComplex: Updated algebraic operations with enhanced type safety (45 lines added)
- HalfEdgeStructure: Improved core with 57 lines of structural enhancements
- simplicial/types: Standardized types across components with better type definitions
- ParameterPanel: Enhanced with cleaner component structure and reduced complexity
- MetricsGrid: Updated with minor improvements
- TabNavigation: Updated with minor improvements
- SimplicialGrowthPage: Updated with architectural improvements

### Key Architectural Changes
- Added proper imports and type exports for better module organization
- Standardized simplicial types across all components
- Improved type safety in algebraic operations
- Enhanced structural integrity of core components
- Simplified component architecture for better maintainability

## Migration Strategy

### Step 1: Create Core Types and 2D Structure
- Implement `SimplicialComplexTopology` and half-edge structure
- Add query operations
- Add validation functions

**Timeline**: 3-4 hours

### Step 2: Implement 2D Pachner Moves
- Create `PachnerMoves2D.ts` with pure functions
- Add pre/post validation
- Test with simple triangulations

**Timeline**: 2-3 hours

### Step 3: Update Existing Controller to Use New Core
- Replace `SimplicialGrowthController` internal representation
- Keep same interface for hooks/UI
- Add geometric position mapping

**Timeline**: 2-3 hours

### Step 4: Implement 3D Structure
- Add tetrahedron representation and face adjacency
- Implement 3D query operations
- Add 3D validation

**Timeline**: 3-4 hours

### Step 5: Implement 3D Pachner Moves
- Create `PachnerMoves3D.ts`
- Test with simple tetrahedral complexes

**Timeline**: 2-3 hours

### Step 6: Update UI and Tester
- Wire `PachnerMoveTester` to use new core
- Ensure preview uses same operations as apply
- Add geometric quality checks in UI

**Timeline**: 2-3 hours

## Files to Modify

### 1. SimplicialGrowthController.ts

**Changes Required**:
- Replace internal representation with `SimplicialComplexTopology`
- Update `selectMove()` to be dimension-aware
- Fix `moveCount` accumulation (remove reset in `createState()`)
- Update `createInitialVertexPositions()` to handle 3D
- Add geometric position mapping

**Specific Fixes**:
```typescript
// Fix selectMove() to be dimension-aware
private selectMove(probabilities: SimplicialGrowthParams['moveProbabilities']): MoveType {
  const rand = Math.random();
  let cumulative = 0;
  
  if (this.params.dimension === 2) {
    // 2D moves
    if (rand < (cumulative += probabilities['1-3'])) return '1-3';
    if (rand < (cumulative += probabilities['2-2'])) return '2-2';
    return '3-1';
  } else {
    // 3D moves
    if (rand < (cumulative += probabilities['1-4'])) return '1-4';
    if (rand < (cumulative += probabilities['2-3'])) return '2-3';
    if (rand < (cumulative += probabilities['3-2'])) return '3-2';
    return '4-1';
  }
}

// Fix moveCount accumulation in createState()
private createState(complex: SimplicialComplex, lastMove: MoveType | null): SimplicialGrowthState {
  return {
    step: this.currentStep,
    complex: {
      simplices: [...complex.simplices],
      vertexCount: complex.vertexCount,
      dimension: complex.dimension,
      vertexPositions: new Map(complex.vertexPositions),
    },
    lastMove,
    moveCount: {
      '1-4': this.state?.moveCount['1-4'] || 0,
      '2-3': this.state?.moveCount['2-3'] || 0,
      '3-2': this.state?.moveCount['3-2'] || 0,
      '4-1': this.state?.moveCount['4-1'] || 0,
      '1-3': this.state?.moveCount['1-3'] || 0,
      '2-2': this.state?.moveCount['2-2'] || 0,
      '3-1': this.state?.moveCount['3-1'] || 0,
    },
    metrics: this.calculateMetrics(complex),
  };
}
```

### 2. PachnerMoveTester.tsx

**Changes Required**:
- Replace simulation functions with calls to core operations
- Fix `onApplyMove` to actually apply selected move type
- Remove hardcoded IDs (use `nextVertexId` from controller)
- Ensure preview uses same operations as apply

**Specific Fixes**:
```typescript
const handleApplyMove = () => {
  if (selectedMove) {
    onApplyMove(selectedMove); // Now passes the selected move type
    setSelectedMove(null);
    setPreviewComplex(null);
  }
};
```

### 3. SimplicialVisualization.tsx

**Changes Required**:
- Update to work with new `SimplicialComplex` structure
- Ensure `vertexPositions` map is used correctly
- Handle 3D projection properly

### 4. simplicial.ts (Types)

**Changes Required**:
- Update `dimension` type to be `2 | 3` instead of `number`
- Ensure consistency across all interfaces

```typescript
interface SimplicialComplex {
  simplices: Simplex[];
  vertexCount: number;
  dimension: 2 | 3; // Changed from number
  vertexPositions: Map<number, { x: number; y: number }>;
}
```

### 5. useSimplicialGrowth.ts

**Changes Required**:
- Update to work with new controller interface
- Ensure state management works correctly

## Backward Compatibility

### Interface Preservation
- Keep existing `SimplicialComplex` interface for external use
- Add adapter layer if needed
- Maintain same `SimplicialGrowthState` shape

### Adapter Pattern
```typescript
// Adapter to convert between old and new representations
class SimplicialComplexAdapter {
  static toNewComplex(oldComplex: SimplicialComplex): SimplicialComplexTopology {
    // Convert old structure to new topology
  }
  
  static toOldComplex(topology: SimplicialComplexTopology): SimplicialComplex {
    // Convert new topology to old structure
  }
}
```

## Testing Strategy

### Unit Tests

- Test each Pachner move in isolation
- Test boundary conditions
- Test invalid configurations
- Test inverse moves (1-3 then 3-1 should restore)

### Integration Tests

- Test random move sequences
- Test move count accumulation
- Test vertex position preservation
- Test manifold property preservation

### Geometric Tests

- Test convex quadrilateral detection
- Test area/volume thresholds
- Test quality metrics

### Migration Tests

- Verify old tests still pass
- Test backward compatibility
- Test adapter layer correctness

## Timeline Estimate

- **Phase 1 (Core Data Structures)**: 3-4 hours
- **Phase 2 (2D Operations)**: 2-3 hours
- **Phase 3 (3D Operations)**: 3-4 hours
- **Phase 4 (Integration)**: 2-3 hours
- **Testing**: 3-4 hours
- **Total**: 13-18 hours

## Critical Files Reference

| File | Lines | Primary Concerns |
|------|-------|------------------|
| [SimplicialGrowthController.ts](../frontend/src/lab/controllers/SimplicialGrowthController.ts) | 454 | Move selection, state management, move count bugs |
| [PachnerMoveTester.tsx](../frontend/src/lab/components/PachnerMoveTester.tsx) | 474 | Preview vs apply mismatch, hardcoded IDs |
| [SimplicialVisualization.tsx](../frontend/src/lab/components/SimplicialVisualization.tsx) | 296 | Position mapping, 3D projection |
| [simplicial.ts](../frontend/src/lab/types/simplicial.ts) | 60 | Type definitions, dimension typing |

## Known Issues Summary

### Critical Priority
1. **selectMove() ignores 2D moves**: Only samples 3D moves, causing 2D simulation to stall
2. **3-1 move incorrect**: Doesn't select correct boundary cycle, doesn't remove vertex
3. **moveCount reset**: Resets to zeros every step instead of accumulating
4. **PachnerMoveTester apply mismatch**: Previews selected move but applies random move

### High Priority
1. **Type safety**: dimension typed as number, not Dimension (2|3)
2. **3D representation missing**: No explicit tetrahedra, only triangular faces
3. **Vertex count inconsistency**: 3D init expects 4 vertices but uses initialVertices param
4. **3D vertexPositions empty**: createInitialVertexPositions returns empty Map for 3D

### Medium Priority
1. **Geometric validation missing**: No convex quadrilateral check for 2-2 move
2. **Tetrahedron detection heuristic**: Grouping by shared vertices is insufficient
3. **Preview ID conflicts**: Hardcoded IDs (999, 998, etc.) can conflict with existing IDs
4. **Inverse moves**: No verification that moves are true inverses

### Low Priority
1. **Metrics placeholder**: Volume and curvature calculations are not meaningful
2. **No quality metrics**: No triangle area or tetrahedron volume checks
3. **No topological invariants**: No Euler characteristic or Betti number computation

## Deliverables

### 1. Core Library Modules
- Topological data structures (types, half-edges, tetrahedra)
- Pachner move implementations (2D and 3D)
- Validation functions (topological and geometric)
- Optional chain complex operations

### 2. Integration Layer
- Updated SimplicialGrowthController using new core
- Updated PachnerMoveTester with correct apply behavior
- SimplicialVisualization compatibility layer
- Adapter functions for backward compatibility

### 3. Test Suite
- Unit tests for all Pachner moves
- Integration tests for controller and tester
- Geometric validation tests
- Optional homology preservation tests

### 4. Documentation
- API documentation for all public functions
- Usage examples for common operations
- Migration guide from old implementation
- Optional chain complex usage guide

## Next Steps

1. **Get Approval**: Review this plan for completeness and correctness
2. **Execute Phase 1**: Implement core data structures and validation
3. **Execute Phase 2**: Implement 2D Pachner moves with tests
4. **Execute Phase 3**: Implement 3D Pachner moves with tests
5. **Execute Phase 4**: Integrate with existing code
6. **Final Testing**: Comprehensive integration and performance testing
7. **Documentation**: Complete API docs and migration guide

## Related Documents

- **[simplicial-shared-aspects.md](./simplicial-shared-aspects.md)**: Shared data structures and types
- **[simplicial-2d-core.md](./simplicial-2d-core.md)**: 2D triangulation core and Pachner moves
- **[simplicial-3d-core.md](./simplicial-3d-core.md)**: 3D tetrahedral core and Pachner moves

## Task Reference
- **[T28d](../memory-bank/tasks/T28d.md)**: Simplicial Core Integration and Migration
