# Simplicial Boundary Conditions Implementation (T30b)
*Created: 2026-01-30 08:15:03 IST*
*Task: T30b*

## Overview

Extends boundary growth (T30) with:
1. **Frozen boundary constraints** - User specifies which boundary elements don't evolve
2. **3D tet strip geometry fix** - Non-degenerate tetrahedra in strip initialization

## Boundary Constraints Design

### 1. Type Additions (types/simplicial.ts)

```typescript
type BoundaryConstraintMode = 'none' | 'bottom-and-sides' | 'custom'

interface BoundaryGrowthParams {
  // ... existing fields ...
  boundaryConstraints: {
    mode: BoundaryConstraintMode
    customFrozenElementIds?: Set<number>  // Face/edge IDs to freeze
  }
}

interface BoundaryGrowthState {
  // ... existing fields ...
  frozenBoundaryElements: Set<number>  // Tracks frozen IDs in current complex
}
```

### 2. Frozen Boundary Helpers (BoundaryGrowth.ts)

**Add three helper functions**:

```typescript
// Identify bottom/left/right boundaries based on geometry
function getBottomAndSideBoundaries2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
): number[] {
  // Find boundary edges with lowest y (bottom)
  // Find boundary edges at x extremes (left/right)
}

// 3D equivalent
function getBottomAndSideBoundaries3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
): number[] {
  // Find boundary faces with lowest z (bottom)
  // Find boundary faces at x/y extremes (sides)
}

// Check if boundary element is frozen
function isBoundaryFrozen(
  elementId: number,
  frozenSet: Set<number>,
): boolean {
  return frozenSet.has(elementId)
}
```

### 3. Controller Changes (BoundaryGrowthController.ts)

In `initialize()`: Initialize frozen boundaries based on constraint mode

In `step()`: Before gluing, check if target boundary element is frozen:
- If frozen: try next boundary element (like current overlap retry logic)
- If all frozen: skip step gracefully
- Log: `[BoundaryGrowth] Skipped glue: target frozen`

### 4. UI Changes (SimplicialGrowthPage.tsx)

Add to BoundaryGrowthTab:
```typescript
<Select label="Boundary Conditions"
  value={params.boundaryConstraints.mode}
  options={['none', 'bottom-and-sides', 'custom']}
/>

// If 'custom' selected:
<Button>Select Frozen Boundaries</Button>
// Interactive picker highlights elements; click to freeze/unfreeze
```

Visualization change: Highlight frozen boundaries in different color (e.g., darker shade)

---

## 3D Tet Strip Geometry Fix

### Problem

Current `createTetStripGeometry()` generates only `n+3` vertices for `n` tets by alternating displacement. This creates **sliver tets** with zero thickness.

### Solution

Generate proper tet chain where consecutive tets share triangular faces:

```typescript
export function createTetStripGeometry(
  n: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  scale: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>()

  // Generate 2*(n+1) vertices: two layers stacked vertically
  // Bottom layer: (0, 1, 2, ..., n)
  // Top layer: (n+1, n+2, ..., 2n+1)

  const halfLen = (n * scale) / 2
  const halfHeight = scale * 0.433 // equilateral triangle height

  // Bottom layer vertices
  for (let i = 0; i <= n; i++) {
    const x = centerX - halfLen + (i * scale)
    const y = centerY
    const z = centerZ
    positions.set(i, { x, y, z })
  }

  // Top layer vertices (offset upward by halfHeight)
  for (let i = 0; i <= n; i++) {
    const x = centerX - halfLen + (i * scale)
    const y = centerY
    const z = centerZ + halfHeight
    positions.set(n + 1 + i, { x, y, z })
  }

  return { positions }
}
```

### Updated Topology

`createTetStripTopology()` generates tets:
- Tet i: (i, i+1, n+1+i, n+2+i) for i in [0, n-1]
- Each tet shares face (i, i+1, n+1+i) with previous tet

---

## Integration Points

1. **types/simplicial.ts**: Add constraint mode type + extend params
2. **BoundaryGrowth.ts**: Add 3 helper functions for frozen boundary detection
3. **BoundaryGrowthController.ts**: Filter frozen boundaries in `step()`
4. **geometry/types.ts**: Rewrite `createTetStripGeometry()`
5. **SimplicialGrowthPage.tsx**: UI dropdown + picker + visualization highlight
6. **core/types.ts**: Update `createTetStripTopology()` if needed

## Diagnostic Logging

Add minimal logging at:
- Controller init: `Frozen boundaries initialized: [count]`
- Step: `Skipped glue: target frozen` (only on rejection)
- Overlap/frozen conflict: `Retry [attempt]/10: frozen boundary`

Use `console.debug()` with `[BoundaryGrowth]` prefix for consistency.

---

## Testing Approach

1. Create 2D triangle strip, freeze bottom/sides, verify growth only on top
2. Create 3D tet strip, verify non-degenerate geometry
3. Verify frozen boundaries highlighted visually
4. Verify custom constraint mode works with interactive selection

---

## References

- Parent T30: `memory-bank/implementation-details/boundary-growth-algorithm.md`
- T30a: Overlap prevention already handles retry logic
- Paper: arXiv:1108.1974v2 Section 5
