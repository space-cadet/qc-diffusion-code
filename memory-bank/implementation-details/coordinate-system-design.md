# Coordinate System Centralization Design

Created: 2025-09-01 11:25:39 IST  
Last Updated: 2025-09-01 13:12:23 IST

## Current Architecture Analysis
- **CoordinateSystem.ts** handles basic canvas↔physics mapping
- **ParticleManager.ts** contains redundant coordinate logic
- Strategies implement independent boundary checks

## Proposed API Extensions
```typescript
// New methods to add to CoordinateSystem
class CoordinateSystem {
  // Physics calculations
  calculateDisplacement(pos1: Position, pos2: Position): Vector
  applyBoundaryConditions(pos: Position, vel?: Velocity): BoundaryResult
  
  // Dimension-aware utilities
  getRandomPosition(): Position
  getCenterPosition(): Position
  
  // Conversion helpers
  normalizeVector(v: Vector): Vector
  scaleToPhysics(v: Vector): Vector
  scaleToCanvas(v: Vector): Vector
}
```

## Migration Steps
1. ✅ Move physics calculations from strategies → CoordinateSystem
2. ✅ Update ParticleManager to use centralized methods  
3. ✅ Modify strategies to delegate to CoordinateSystem
4. ⬜ Add comprehensive tests

## Implementation Progress (2025-09-01 13:12:23 IST)
- **InterparticleCollisionStrategy**: Refactored to use coordinate system transformations
- **Type System**: Added Vector/Velocity interfaces for better type safety
- **Strategy Integration**: Updated all physics strategies to use coordinate system abstractions
- **Boundary Conditions**: Unified coordinate transformations across strategies

## Test Plan
- Boundary condition verification
- Dimension switching tests
- Round-trip coordinate conversion checks
- Performance benchmarks

## Dependencies
- Requires completion of PhysicsEngine integration
- Needs updated BoundaryConfig types

## Estimated Impact
- ~6 modified files
- ~150-200 lines changed
- Improves dimension switching reliability
