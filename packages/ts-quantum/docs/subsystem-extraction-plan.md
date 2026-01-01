# Subsystem Extraction Implementation Plan
*Created: 2025-06-03*

## Problem

Quantum graph operations fail when applying operators to overlapping qubit sets due to dimension mismatch:

```typescript
// Apply XXXX to [A,B,C,D] - SUCCESS (16-dim composite)
// Apply XXXX to [B,C,D,E] - FAILURE (dimension mismatch 128 !== 16)
```

**Root Cause**: `extractSubsystemState` returns full composite states instead of proper subsystems via partial trace.

## Solution

Use partial trace to extract correct subsystem states from overlapping composites:

```typescript
// Instead of: getVertexQuantumObject(B) → full 16-dim composite ABCD
// Use: partialTrace(composite_ABCD, [2,2,2,2], [0]) → 2-dim state for B
```

## Implementation (70 lines total)

### 1. Track Composite Elements (20 lines)
**File**: `CompositeQuantumManager.ts`

Add element tracking to existing class:
```typescript
private compositeElements: Map<string, string[]> = new Map();

setComposite(elementIds: string[], obj: QuantumObject): void {
  // existing code...
  this.compositeElements.set(compositeId, [...elementIds]);
}

getCompositeElements(compositeId: string): string[] {
  return this.compositeElements.get(compositeId) || [];
}
```

### 2. Fix extractSubsystemState (40 lines)
**File**: `operations/general.ts`

Replace current implementation:
```typescript
export function extractSubsystemState(graph: QuantumGraph, elementIds: string[]): QuantumObject[] {
  const states: QuantumObject[] = [];
  
  for (const id of elementIds) {
    const compositeId = graph.getCompositeManager().getCompositeIdForElement(id);
    
    if (compositeId) {
      // Use partial trace for composite elements
      const composite = graph.getCompositeQuantumObject([id]);
      const allElements = graph.getCompositeManager().getCompositeElements(compositeId);
      const traceOutIndices = allElements.map((_, i) => i).filter(i => allElements[i] !== id);
      
      const dims = allElements.map(() => 2); // assume qubits
      const reducedState = composite.partialTrace(dims, traceOutIndices);
      states.push(reducedState);
    } else {
      // Individual element unchanged
      const state = graph.hasNode(id) ? graph.getVertexQuantumObject(id) : graph.getEdgeQuantumObject(id);
      if (state) states.push(state);
    }
  }
  
  return states;
}
```

### 3. Handle Mixed Types (10 lines)
**File**: `operations/general.ts`

Update `tensorProductStates` to handle StateVector/Operator mixing from partial trace results.

## Expected Result

**Before**: Dimension mismatch errors in toric code
**After**: All stabilizer operations succeed

```
3x3 toric code: 9/9 X-stabilizers + 9/9 Z-stabilizers ✅
4x4 toric code: 16/16 X-stabilizers + 16/16 Z-stabilizers ✅
```

## Timeline

- **Total Time**: 3 hours
- **Risk**: Low (uses existing partial trace infrastructure)
- **Complexity**: Simple (just extract correct subsystem states)
