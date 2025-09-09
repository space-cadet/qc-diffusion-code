# Random Walk Strategy System Architecture
*Created: 2025-09-09 11:41:19 IST*
*Last Updated: 2025-09-09 11:41:19 IST*

## Overview

The Random Walk Strategy System implements a clean separation of concerns for particle physics simulation using the Strategy pattern. The system supports multiple physics behaviors (CTRW, ballistic motion, inter-particle collisions) that can be composed and executed in a unified framework.

## Core Architecture

### PhysicsStrategy Interface

All strategies implement a unified interface with two-phase execution:

```typescript
interface PhysicsStrategy {
  // Phase A: velocity modifications (collisions, scattering)
  preUpdate(particle: Particle, allParticles: Particle[], context: PhysicsContext): void;
  
  // Phase B: position integration and boundary enforcement
  integrate(particle: Particle, dt: number, context: PhysicsContext): void;
  
  // Analysis and configuration
  calculateStep(particle: Particle): Step;
  setBoundaries(config: BoundaryConfig): void;
  getBoundaries(): BoundaryConfig;
  validateParameters(params: any): boolean;
  getPhysicsParameters(): Record<string, number>;
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number };
}
```

### Strategy Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Physics Engine                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐ │
│  │   StrategyFactory   │    │     CompositeStrategy       │ │
│  │                     │────│                             │ │
│  │ createStrategies()  │    │ strategies: Strategy[]      │ │
│  └─────────────────────┘    └─────────────────────────────┘ │
│                                                             │
│  Strategy Execution Pipeline:                               │
│                                                             │
│  For each particle:                                         │
│    1. Phase A (preUpdate) ──► Velocity modifications       │
│       ├─ CTRWStrategy     ──► Poisson collisions           │
│       ├─ CollisionStrategy──► Inter-particle collisions    │
│       └─ BallisticStrategy──► No-op                        │
│                                                             │
│    2. Phase B (integrate) ──► Position integration         │
│       ├─ CTRWStrategy     ──► Move + boundaries            │
│       ├─ CollisionStrategy──► No-op (position only)        │
│       └─ BallisticStrategy──► Move + boundaries            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Strategy Implementations

### 1. BallisticStrategy
**Purpose**: Straight-line motion with boundary conditions
**Phase A**: No-op
**Phase B**: Position integration using particle velocity

### 2. CTRWStrategy1D/2D
**Purpose**: Continuous Time Random Walk with Poisson scattering
**Phase A**: Collision detection and velocity direction changes
**Phase B**: Position integration and boundary enforcement

### 3. InterparticleCollisionStrategy1D/2D
**Purpose**: Elastic collisions between particles
**Phase A**: Collision detection and velocity swapping/elastic collision physics
**Phase B**: No-op (collision strategy only modifies velocities)

### 4. CompositeStrategy
**Purpose**: Combines multiple strategies for complex behavior
**Execution**: Runs all strategies in sequence for both phases

## Code Structure

```
frontend/src/physics/
├── interfaces/
│   └── PhysicsStrategy.ts          ← Unified interface
├── strategies/
│   ├── BallisticStrategy.ts        ← Straight-line motion
│   ├── CTRWStrategy1D.ts          ← 1D random walk
│   ├── CTRWStrategy2D.ts          ← 2D random walk  
│   ├── InterparticleCollisionStrategy1D.ts  ← 1D collisions
│   ├── InterparticleCollisionStrategy2D.ts  ← 2D collisions
│   └── CompositeStrategy.ts       ← Multi-strategy composition
├── factories/
│   └── StrategyFactory.ts         ← Strategy creation logic
├── core/
│   ├── BoundaryManager.ts         ← Boundary condition handling
│   ├── CoordinateSystem.ts       ← Canvas/physics coordinate mapping
│   └── ParameterManager.ts       ← Strategy parameter management
└── __tests__/
    └── CTRWStrategy2D.test.ts     ← Strategy testing
```

## Strategy Factory Logic

The factory creates strategy combinations based on configuration:

**1D Mode:**
- Base: CTRWStrategy1D (if selected) OR BallisticStrategy
- Addition: InterparticleCollisionStrategy1D (if collision enabled)

**2D Mode:**
- Base: BallisticStrategy (always)
- Additions: CTRWStrategy2D (if selected), InterparticleCollisionStrategy2D (if collision enabled)

## Parameter Management

All strategies follow standardized constructor patterns:

```typescript
// Unified constructor pattern
constructor(params: {
  boundaryConfig: BoundaryConfig;
  coordSystem: CoordinateSystem;
  // strategy-specific parameters...
})
```

Required methods for parameter access:
- `getParameters()`: UI display parameters
- `getPhysicsParameters()`: Internal physics constants
- `validateParameters()`: Parameter validation

## Boundary Integration

All strategies use unified BoundaryManager:
- Periodic boundaries: wrap position coordinates
- Reflective boundaries: reverse velocity on collision
- Absorbing boundaries: deactivate particles

## Key Design Principles

1. **Two-phase execution**: Separate velocity modifications from position integration
2. **Composition over inheritance**: Use CompositeStrategy for complex behaviors
3. **Consistent interfaces**: All strategies implement PhysicsStrategy
4. **Boundary abstraction**: BoundaryManager handles all boundary logic
5. **Parameter standardization**: Consistent constructor and getter patterns

## Integration Points

- **RandomWalkSimulator**: Main execution engine calling strategy methods
- **ParameterManager**: Provides physics parameters to strategies
- **CoordinateSystem**: Handles canvas/physics coordinate transformations
- **StrategyFactory**: Creates appropriate strategy combinations based on UI settings

This architecture provides clean separation of concerns while maintaining flexibility for complex physics behavior composition.
