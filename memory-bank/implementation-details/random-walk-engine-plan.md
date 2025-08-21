# Random Walk Engine Implementation Plan

*Created: 2025-08-21 09:10:30 IST*

## Overview

This document outlines the implementation plan for the random walk physics engine that will replace tsParticles' default motion with CTRW (Continuous Time Random Walk) physics based on the mathematical framework from `random-walks-diff-eq.md`.

## Current State

### Completed Framework
- ✅ Physics file structure created with TypeScript interfaces
- ✅ tsParticles integration working with live particle visualization  
- ✅ RandomWalkSim component with parameter controls
- ✅ Particle count slider with continuous integer values (50-2000)
- ✅ UI framework ready for physics engine connection

### Current Particle Motion
**Problem**: Particles currently use tsParticles' built-in random motion:
```typescript
move: {
  direction: "none",
  enable: true,
  random: true,        // ← Generic random movement
  speed: 1,           // ← Constant speed
  straight: false,    // ← Not collision-based
}
```

**Goal**: Replace with CTRW physics where:
- Collision timing follows Poisson process: τ ~ Exponential(λ)
- Direction changes only at collision events
- Telegraph equation emerges in continuum limit

## Implementation Phases

### Phase 1: CTRW Core Physics (Priority 1)

**Files to implement:**
- `frontend/src/physics/PhysicsRandomWalk.ts` - Core CTRW engine

**Key methods:**
```typescript
class PhysicsRandomWalk {
  // Core CTRW collision mechanism
  private generateCollisionTime(): number {
    return -Math.log(Math.random()) / this.collisionRate; // Exponential(λ)
  }
  
  private handleCollision(particle: Particle): CollisionEvent {
    // Randomize direction: ±1 with equal probability
    // Update collision history
    // Return collision event data
  }
  
  public updateParticle(particle: Particle): void {
    // Check if collision should occur
    // Update position based on current velocity
    // Handle collision if time threshold reached
  }
}
```

**Physics parameters:**
- λ (collision rate): 0.1 - 10.0 Hz
- a (jump length): 0.01 - 1.0 units  
- v (velocity): 0.1 - 5.0 units/s
- Derived: D = v²/(2λ) (diffusion constant)

### Phase 2: tsParticles Integration (Priority 2)

**Goal**: Replace tsParticles motion with custom physics

**Approach:**
1. Disable tsParticles built-in movement:
```typescript
move: {
  enable: false,  // ← Disable default motion
}
```

2. Manual position updates via RandomWalkSimulator:
```typescript
class RandomWalkSimulator {
  step(): void {
    // Update all particles using CTRW physics
    this.particles.forEach(particle => {
      this.physics.updateParticle(particle);
    });
    
    // Sync positions to tsParticles for rendering
    this.syncToTsParticles();
  }
  
  private syncToTsParticles(): void {
    const tsParticles = this.tsParticlesContainer.particles;
    this.particles.forEach((physicsParticle, index) => {
      tsParticles.array[index].position.x = physicsParticle.position;
      // tsParticles handles visual updates automatically
    });
  }
}
```

### Phase 3: Density Calculation (Priority 3)

**Files to implement:**
- `frontend/src/physics/utils/DensityCalculator.ts` - Spatial binning

**Key functionality:**
```typescript
class DensityCalculator {
  calculateDensity(particles: Particle[]): DensityField {
    // Bin particles into spatial cells
    // Calculate ρ(x,t) = particle count per unit length
    // Calculate velocity field u(x,t) = local average velocity
    // Return continuous field for telegraph comparison
  }
}
```

**Output format:**
```typescript
interface DensityField {
  x: number[];          // Spatial grid points
  rho: number[];        // Density ρ(x,t)
  u: number[];          // Velocity field u(x,t)
  moments: Moments;     // Statistical moments
}
```

### Phase 4: Telegraph Equation Comparison (Priority 4)

**Integration with existing C1 solver:**
- Use existing telegraph equation solver from C1 task
- Compare CTRW density evolution with analytical solution
- Display convergence metrics in DensityComparison panel

**Convergence metrics:**
- L2 error: ||ρ_CTRW - ρ_telegraph||
- Effective diffusion: D_eff from moment analysis
- Scaling verification: v_eff, λ_eff parameter extraction

## Technical Implementation Details

### 1D Particle Constraint

**Spatial setup:**
- Particles constrained to 1D motion (-L/2, L/2)
- Periodic boundary conditions or reflecting boundaries
- Focus on x-axis motion (y fixed for visualization)

**tsParticles configuration:**
```typescript
particles: {
  move: {
    enable: false,  // Custom physics only
  },
  position: {
    x: { min: 0, max: 100 },  // Percentage of canvas width
    y: { value: 50 },         // Fixed y-position (center)
  }
}
```

### Parameter Synchronization

**UI → Physics connection:**
```typescript
// In RandomWalkSim.tsx
useEffect(() => {
  if (simulatorRef.current) {
    simulatorRef.current.updateParameters({
      collisionRate: gridLayoutParams.collisionRate,
      jumpLength: gridLayoutParams.jumpLength,
      velocity: gridLayoutParams.velocity,
      particleCount: gridLayoutParams.particles,
    });
  }
}, [gridLayoutParams]);
```

### Performance Considerations

**Target performance:**
- 60 FPS for N ≤ 1000 particles
- 30 FPS for N ≤ 2000 particles
- Efficient collision detection and particle updates

**Optimization strategies:**
- Vectorized position updates where possible
- Efficient random number generation
- Minimal DOM manipulation (tsParticles handles rendering)

## Success Criteria

### Educational Demonstration Goals
1. **Visual CTRW behavior**: Particles show discrete collision events with direction changes
2. **Parameter sensitivity**: Clear response to λ, a, v parameter changes
3. **Telegraph convergence**: Density evolution matches analytical solution
4. **Real-time feedback**: Smooth parameter adjustment without simulation restart

### Technical Performance Goals
1. **Collision accuracy**: Exponential waiting times statistically correct
2. **Density calculation**: Accurate spatial binning with configurable resolution
3. **Conservation**: Particle number and momentum conservation
4. **Stability**: No numerical instabilities for educational parameter ranges

## Integration with Existing Architecture

### C1 Telegraph Solver Integration
- Reuse existing WebGL telegraph equation solver
- Extract density comparison functionality
- Add CTRW vs analytical solution comparison charts

### State Management Integration
- Connect physics parameters to Zustand store
- Persist simulation settings across browser sessions
- Maintain separation between physics state and UI state

### History and Replay System
- Record particle trajectories for replay functionality
- Save collision event history for analysis
- Export density evolution data for scientific use

## Implementation Timeline

**Phase 1** (Next session): CTRW collision mechanism
**Phase 2** (Following session): tsParticles integration and custom motion
**Phase 3** (Third session): Density calculation and telegraph comparison
**Phase 4** (Fourth session): Polish, optimization, and educational refinements

## Documentation Requirements

- Update `random-walks-diff-eq.md` with implementation details
- Create TypeScript documentation for physics classes
- Add educational notes explaining CTRW → telegraph connection
- Document parameter ranges and recommended settings for demonstrations
