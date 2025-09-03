# Random Walk Engine Implementation Plan

_Created: 2025-08-21 09:10:30 IST_
_Last Updated: 2025-09-03 17:41:45 IST_

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
    this.particles.forEach((particle) => {
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

### Phase 3: Density Calculation (Priority 3) - ✅ COMPLETED

**Files implemented:**

- `frontend/src/physics/RandomWalkSimulator.ts` - 2D density calculation with `getDensityProfile2D()`
- `frontend/src/hooks/useDensityVisualization.ts` - Canvas-based heatmap rendering
- `frontend/src/components/DensityComparison.tsx` - Real-time density visualization

**Implementation details:**

```typescript
getDensityProfile2D(binSize: number = 10): {
  density: number[][];
  xBounds: { min: number; max: number };
  yBounds: { min: number; max: number };
  binSize: number;
}
```

**Features completed:**
- 2D spatial binning with configurable bin size
- Canvas heatmap rendering with blue-to-red color mapping
- Real-time density updates with auto-update controls
- Density history recording (100 snapshots) for temporal analysis
- Wavefront speed analysis for telegraph equation verification
- Integration with DensityComparison panel UI

**Known issues:**
- Boundary artifacts at corners due to periodic boundary wrapping
- Extra bin creation causing artificial density peaks
- Coordinate system alignment between physics and visualization

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

## Dual Physics Engine Architecture (Added 2025-09-03 17:41:00 IST)

### Architecture Overview

The system now supports runtime switching between legacy and new physics engines via a UI toggle button. Both engines coexist and can be selected without code changes or restarts.

### Complete Architecture Map

```
                               RandomWalkSimulator
                                       |
                          ┌────────────┴────────────┐
                          │                         │
                    LEGACY ENGINE              NEW ENGINE
                   (useNewEngine=false)      (useNewEngine=true)
                          │                         │
                          │                         │
                ┌─────────┴─────────┐     ┌─────────┴─────────┐
                │ LegacySimulation  │     │ EngineSimulation  │
                │ Runner            │     │ Runner            │
                └─────────┬─────────┘     └─────────┬─────────┘
                          │                         │
                          │                         │
                ┌─────────▼─────────┐               │
                │ ParticleManager   │               │
                │   .update(dt)     │               │
                └─────────┬─────────┘               │
                          │                         │
                ┌─────────▼─────────┐               │
                │ CompositeStrategy │◄──────────────┤
                │ (legacy wrapper)  │               │
                └─────────┬─────────┘               │
                          │                         │
                          ├─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                          │                         │                         │
          ┌───────────────▼───────────────┐ ┌───────▼───────┐ ┌───────────────▼───────────────┐
          │ LegacyBallisticStrategy      │ │ PhysicsEngine  │ │ BallisticStrategy             │
          │                              │ │                │ │ (implements both interfaces) │
          │ updateParticle() {           │ │ .step() {      │ │                              │
          │   console.log("[Ballistic]   │ │   Phase A      │ │ preUpdate() - no-op          │
          │     p0 update", ...)         │ │   Phase B      │ │ integrate() - ballistic      │
          │   pos += vel * 0.01          │ │ }              │ │                              │
          │ }                            │ │                │ │ updateParticleWithDt() {     │
          │                              │ │                │ │   pos += vel * dt            │
          │ updateParticleWithDt() {     │ │                │ │ }                            │
          │   pos += vel * dt            │ │                │ │                              │
          │ }                            │ └────────────────┘ │                              │
          └──────────────────────────────┘                    └──────────────────────────────┘
```

### Engine Execution Flows

**LEGACY ENGINE** - When "LEGACY" button is selected:
```
User clicks "Resume" button
│
▼
1. RandomWalkParameterPanel.tsx:85 (button onClick)
   └─ handlePause() function (RandomWalkSim.tsx:375)
   
2. State updates: setIsRunning(true), status="Running"

3. Animation loop restart: useParticlesLoader.restartAnimation()
   └─ startAnimation() → animate() RAF loop
   
4. Physics stepping: simulatorRef.current.step(dt)
   └─ RandomWalkSimulator.step() → this.simulationRunner.step(dt)
   
5. LegacySimulationRunner.step(dt)
   └─ this.particleManager.update(dt)
   
6. ParticleManager.update(dt)
   └─ strategy.updateParticleWithDt(particle, allParticles, dt)
   
7. LegacyBallisticStrategy.updateParticleWithDt()
   ├─ Console.log("[Ballistic] p0 update Object {...}")  ← EXPECTED LOG
   ├─ particle.position.x += particle.velocity.vx * dt
   ├─ particle.position.y += particle.velocity.vy * dt
   └─ Apply boundary conditions

8. Rendering: updateParticlesFromStrategies() → container.draw()
```

**NEW ENGINE** - When "NEW" button is selected:
```
User clicks "Resume" button
│
(Steps 1-4 same as legacy)
│
5. EngineSimulationRunner.step(dt)
   ├─ Get particles from particleManager  
   └─ this.physicsEngine.step(particles)
   
6. PhysicsEngine.step(particles)
   ├─ timeManager.advance() → get dt
   ├─ Create PhysicsContext
   ├─ Phase A: orchestrator.executePhaseA() → preUpdate()
   └─ Phase B: orchestrator.executePhaseB() → integrate()
   
7. BallisticStrategy.integrate(particle, dt, context)
   └─ this.updateParticleWithDt(particle, [], dt)
      ├─ particle.position.x += particle.velocity.vx * dt
      ├─ particle.position.y += particle.velocity.vy * dt  
      └─ Apply boundary conditions

8. Rendering: (same as legacy)
```

### Runtime Engine Selection

**UI Implementation:**
- Toggle button in page header: "LEGACY" / "NEW" 
- Persistent state via Zustand store (`useNewEngine` boolean)
- Visual feedback with color coding (gray/green)
- Simulator recreation when engine flag changes

**Engine Determination:**
```typescript
// RandomWalkSimulator constructor
constructor(config: SimulatorParams & { useNewEngine?: boolean }) {
  this.useNewEngine = config.useNewEngine ?? USE_NEW_ENGINE === true;
  // ... rest of initialization
}
```

**Strategy Factory Logic:**
```typescript
// StrategyFactory.createStrategies() - for legacy engine
function createStrategiesInternal(/* ... */, forPhysicsEngine: boolean) {
  // Legacy path uses LegacyBallisticStrategy
  // New path uses BallisticStrategy (implements both interfaces)
  
  const strategy = forPhysicsEngine || getNewEngineFlag()
    ? new BallisticStrategy({ boundaryConfig })
    : new LegacyBallisticStrategy({ boundaryConfig });
}
```

### Debugging Engine Selection

**Expected Console Logs:**

*Legacy Engine:*
- `[RWS] setupSimulationRunner { useNewEngine: false }`
- `[RWS] Using LegacySimulationRunner (flag disabled)`
- `[Ballistic] p0 update Object { beforePos: {...}, velocity: {...}, dt: 0.01 }`

*New Engine:*
- `[RWS] setupSimulationRunner { useNewEngine: true }`
- `[RWS] Using EngineSimulationRunner with direct PhysicsStrategies`
- `[ESR] step called`, `[PhysicsEngine] step` logs

**Missing Legacy Logs Troubleshooting:**
1. Check `[RWS] setupSimulationRunner` message for engine selection
2. Verify animation loop is running (simulation not paused)
3. Confirm particles are initialized and active
4. Check that `LegacyBallisticStrategy.updateParticleWithDt()` is being called

## Integration with Existing Architecture

### C1 Telegraph Solver Integration

- Reuse existing WebGL telegraph equation solver
- Extract density comparison functionality
- Add CTRW vs analytical solution comparison charts

### State Management Integration

- Connect physics parameters to Zustand store
- Persist simulation settings across browser sessions
- Maintain separation between physics state and UI state
- **NEW**: Engine selection persistence via `useNewEngine` flag

### History and Replay System

- Record particle trajectories for replay functionality
- Save collision event history for analysis
- Export density evolution data for scientific use

## Implementation Timeline

**Phase 1** ✅ COMPLETED: CTRW collision mechanism with exponential timing
**Phase 2** ✅ COMPLETED: tsParticles integration via ParticleManager and updateParticlesWithCTRW
**Phase 2.5** ✅ COMPLETED: Strategy selection and boundary condition system
**Phase 3** ✅ COMPLETED: Density calculation and telegraph comparison with 2D visualization
**Phase 4** (Next session): Fix boundary artifacts and optimize density analysis

## Implementation Status Update (2025-08-21 11:40:59 IST)

### Phase 1 & 2: CTRW Core Implementation - COMPLETED

- ✅ PhysicsRandomWalk class with complete collision mechanism
- ✅ Exponential waiting time generation: `generateCollisionTime()`
- ✅ Collision handling with isotropic scattering
- ✅ ParticleManager bridge class for tsParticles integration
- ✅ updateParticlesWithCTRW function replacing default motion
- ✅ Comprehensive TypeScript type definitions

### Phase 2.5: Strategy Selection and Boundary Conditions - COMPLETED (2025-08-22 19:20:42 IST)

**UI Controls Added:**
- Strategy selection: CTRW, Simple Random Walk, Lévy Flight, Fractional Brownian Motion
- Boundary conditions: Periodic (wrap around), Reflective (bounce back), Absorbing (particles disappear)

**Architecture Implementation:**
- Strategy-agnostic boundary system with centralized utilities
- Boundary configuration interface with physics space coordinates
- Parameter flow from UI → RandomWalkSimulator → CTRWStrategy

**Files Created:**
- `frontend/src/physics/types/BoundaryConfig.ts` - Boundary type definitions
- `frontend/src/physics/utils/boundaryUtils.ts` - Strategy-agnostic boundary functions

**Files Modified:**
- `frontend/src/stores/appStore.ts` - Added strategy and boundaryCondition fields
- `frontend/src/components/ParameterPanel.tsx` - Added UI controls
- `frontend/src/physics/strategies/CTRWStrategy.ts` - Boundary application logic
- `frontend/src/physics/RandomWalkSimulator.ts` - Boundary config and parameter flow
- `frontend/src/RandomWalkSim.tsx` - Parameter passing integration

**Previous Issue:** Coordinate system alignment fixed by GPT5 implementation.
**Status:** ✅ ALL MAJOR ISSUES RESOLVED (2025-08-23)

### Major Updates (2025-08-23)

**Coordinate System Fixes:**
- ✅ **GPT5 Fix**: Corrected coordinate mapping in RandomWalkSimulator initialization from physics coords (-200,+200) to canvas coords (0,canvasWidth)
- ✅ **GPT5 Enhancement**: Added proper canvas size tracking and propagation to ParticleManager for accurate coordinate transformations
- ✅ **GPT5 Solution**: Made mapToCanvas() method public for visualization synchronization

**Distribution System Implementation:**
- ✅ **GPT5 Feature**: Extended SimulatorParams interface with comprehensive distribution fields (initialDistType, distSigmaX/Y, distR0, distDR, distThickness, distNx/y, distJitter)
- ✅ **GPT5 Implementation**: Created sophisticated sampleCanvasPosition() method with 5 distribution types:
  - Uniform: Standard random distribution
  - Gaussian: Box-Muller transform for normal distribution
  - Ring/Annulus: Polar coordinates with configurable radius
  - Vertical Stripe: Centered stripe with thickness control
  - Grid: Regular grid positions with jitter for natural variation
- ✅ **Claude 3.5 Fix**: Ensured initial particle visualization synchronizes with selected distribution pattern immediately after initialization

**Density Profile Resolution:**
- ✅ **Issue Fixed**: Density clustering at corners resolved through proper coordinate system flow
- ✅ **Verification**: Uniform distributions now show proper uniform density instead of corner artifacts
- ✅ **Ready**: Telegraph equation verification can proceed with accurate density calculations

### Current Implementation Achievements

- Complete CTRW physics engine with Poisson collision process
- Particle state management with trajectory recording
- Real-time parameter updates without simulation restart
- Dual mode support (continuum/graph) with Sigma.js visualization
- Strategy selection UI with 4 random walk algorithms
- Boundary condition system with 3 behavior types
- Strategy-agnostic boundary architecture for extensibility
- ✅ **Accurate 2D density profile calculation** with coordinate system fixes
- ✅ **5 sophisticated distribution types** with mathematical precision
- ✅ **Proper visualization synchronization** ensuring UI matches physics state
- Telegraph equation verification framework ready with corrected density calculations

## Documentation Requirements

- Update `random-walks-diff-eq.md` with implementation details
- Create TypeScript documentation for physics classes
- Add educational notes explaining CTRW → telegraph connection
- Document parameter ranges and recommended settings for demonstrations
