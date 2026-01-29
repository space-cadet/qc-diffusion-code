# Commit Message: Physics Strategy Interface Implementation

*Generated: 2025-09-01 18:47:09 IST*

## Commit Title
feat: implement PhysicsStrategy interface in collision strategies

## Commit Body
Refactor InterparticleCollisionStrategy and InterparticleCollisionStrategy1D to implement PhysicsStrategy interface alongside RandomWalkStrategy, enabling two-phase execution model with separated collision detection and position integration phases.

### Key Changes:
- Add preUpdate() method for collision detection phase
- Add integrate() method for position updates with boundary conditions
- Apply coordinate system transformations for position calculations
- Add trajectory recording with proper simTime() timestamps
- Clean up verbose debug logging in density utilities
- Fix method naming typo in RandomWalkSimulator

### Files Modified:
- frontend/src/physics/strategies/InterparticleCollisionStrategy.ts
- frontend/src/physics/strategies/InterparticleCollisionStrategy1D.ts
- frontend/src/physics/utils/density.ts
- frontend/src/physics/RandomWalkSimulator.ts

### Technical Details:
- Maintains backward compatibility with existing RandomWalkStrategy interface
- Enables new physics engine architecture with phased execution
- Centralizes boundary condition handling through coordinate system
- Improves performance by removing unnecessary console output
- Ensures consistent trajectory timestamps across simulation

This change advances the physics engine migration (T15) by implementing the PhysicsStrategy interface in collision strategies while preserving existing functionality.