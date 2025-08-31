# Physics Engine Migration Plan (Stepwise)

Created: 2025-08-28 19:00:55 IST
Last Updated: 2025-08-31 19:10:02 IST

This file tracks the concrete migration steps from the current composite strategy loop to the two-phase PhysicsEngine architecture. Source references: `physics-engine-rewrite-final.md`, `physics-engine-rewrite-claude4.md`, `physics-engine-rewrite-deepseek.md`.

## Current Status (as of 2025-08-29 15:23:43 IST)

- Step 1: COMPLETE
  - Files present: `core/TimeManager.ts`, `core/CoordinateSystem.ts`, `core/StrategyOrchestrator.ts`, `core/PhysicsEngine.ts`, `interfaces/PhysicsStrategy.ts`, `types/PhysicsContext.ts`
  - Feature flag defined: `frontend/src/physics/config/flags.ts` → `USE_NEW_ENGINE`
- Step 2: COMPLETE (adapters + minimal wiring)
  - LegacyStrategyAdapter created to conform existing strategies to `PhysicsStrategy`
  - Engine instantiation added behind feature flag in `RandomWalkSimulator` (default off)
- Step 3: COMPLETE (time unification & logging)
  - Added `core/GlobalTime.ts` with `simTime()` and `simDt()` utilities
  - All strategies now use unified time source: `BallisticStrategy`, `CTRWStrategy1D`, `CTRWStrategy2D`, `InterparticleCollisionStrategy`, `InterparticleCollisionStrategy1D`
  - `ParticleManager` and `PhysicsRandomWalk` updated to use `simTime()`
  - `RandomWalkSimulator` PhysicsEngine timeStep aligned to 0.01 for parity
  - No remaining `Date.now() / 1000` usage in physics directory
- Step 3.5: COMPLETE (ballistic strategy rollout)
  - `BallisticStrategy` converted from `PhysicsStrategy` to `RandomWalkStrategy` interface
  - Fixed constructor initialization and method signatures in `RandomWalkSimulator`
  - Updated integration tests for new strategy architecture
  - Fixed coordinate system instantiation with proper argument order
  - Added missing getter methods: `getParticleCount()`, `getDimension()`, `getStrategy()`
- Step 4: IN PROGRESS (issue resolution & functionality restoration)
  - RESOLVED: Critical velocity property mismatch (vx/vy vs x/y) in ParticleManager.initializeParticle()
  - RESOLVED: LegacyBallisticStrategy import cleanup and aliasing
  - RESOLVED: RandomWalkSimulator step() method logic to properly call particleManager.update()
  - ADDED: Extensive debug logging infrastructure throughout execution chain
  - STATUS: Physics simulation now functional with visible particle movement
  - REMAINING: Complete testing and validation of all functionality
- Step 5: PENDING (boundary phase)
  - Boundary enforcement still inside strategies via `boundaryUtils`
- Step 5: PENDING (coordinate centralization)
  - `ParticleManager` owns mapping; `CoordinateSystem` not yet injected/used there

## Step 1 (Scaffolding only, no behavior change)
- Add new core/types/interfaces (unused initially):
  - `TimeManager` (single simulation clock, seconds)
  - `CoordinateSystem` (physics↔canvas mapping, 1D/2D aware)
  - `PhysicsContext` (time, coordinates)
  - `PhysicsStrategy` (preUpdate + integrate)
  - `StrategyOrchestrator` (Phase A then Phase B)
  - `PhysicsEngine` (wraps TimeManager + Orchestrator)
  - `VITE_USE_NEW_PHYSICS_ENGINE` flag (not yet wired)

## Step 2 (Adapters, minimal wiring)
- Adapter/conformance for current strategies to `PhysicsStrategy` signatures without behavior change
- Optional engine instantiation behind feature flag (default off)

## Step 3 (Time unification & logging) - COMPLETE
- Replace `Date.now()` and fixed `0.01` with engine `dt/currentTime`
- Single trajectory logging point post-step; remove duplicates in strategies/ParticleManager

### Implementation Details:
- Created `core/GlobalTime.ts` with `simTime()` and `simDt()` utilities for centralized time management
- Updated all strategy files to import and use GlobalTime:
  - `strategies/BallisticStrategy.ts`: timestamps and dt unified
  - `strategies/CTRWStrategy1D.ts`: collision timing and dt unified  
  - `strategies/CTRWStrategy2D.ts`: collision timing and dt unified
  - `strategies/InterparticleCollisionStrategy.ts`: timestamps unified
  - `strategies/InterparticleCollisionStrategy1D.ts`: timestamps unified
- Updated core physics files:
  - `ParticleManager.ts`: particle initialization and trajectory timestamps use simTime()
  - `PhysicsRandomWalk.ts`: step generation and collision handling use simTime()/simDt()
- `RandomWalkSimulator.ts`: PhysicsEngine timeStep set to 0.01 for parity with legacy path
- Verified no remaining `Date.now() / 1000` usage in physics directory

## Step 4 (Boundary phase)
- Extract boundary enforcement as a dedicated boundary strategy in Phase B

## Step 5 (Coordinate centralization)
- Move mapping out of `ParticleManager` into `CoordinateSystem` and inject

## Constraints
- Maintain backward compatibility via feature flag
- Keep particle type from `frontend/src/physics/types/Particle.ts`
- Use seconds for dt throughout

## Open Decisions
- Boundary handling placement: Phase B via dedicated strategy (recommended)
- Deterministic tests: mock random for visual parity

## Recent Changes 

### Phase 4 Issue Resolution (2025-08-29 15:23:43 IST)

**Root Cause Analysis & Resolution**: 
- **Velocity Property Mismatch**: Thermal velocity generation in `RandomWalkSimulator.generateThermalVelocities()` created objects with `{vx, vy}` properties, but `ParticleManager.initializeParticle()` was reading `{x, y}` properties, resulting in all particles having zero velocity.
- **Fix Applied**: Changed `ParticleManager.ts` line 51-52 from `tsParticle.velocity?.x` to `tsParticle.velocity?.vx` and `tsParticle.velocity?.y` to `tsParticle.velocity?.vy`

**Import & Strategy Reference Cleanup**:
- **LegacyBallisticStrategy Import**: Fixed import in `RandomWalkSimulator.ts` to use `LegacyBallisticStrategy as BallisticStrategy` for clarity
- **Strategy Initialization**: Updated `initializeStrategies()` method to use consistent `BallisticStrategy` references

**Step Method Logic Correction**:
- **RandomWalkSimulator.step()**: Fixed legacy path to properly call `particleManager.update(dt)` instead of incorrectly attempting individual particle updates
- **Flow Validation**: Added debug logging to verify execution chain: simulator → particle manager → strategy

**Debug Infrastructure Enhancement**:
- **Comprehensive Logging**: Added detailed debug output throughout execution chain with precise velocity and position tracking
- **Precision Formatting**: Enhanced debug output to show exact numerical values with `.toFixed(4)` precision
- **Execution Tracing**: Complete logging from simulator step() through ParticleManager.update() to strategy methods

**Temporary Debug Modifications**:
- **Momentum Conservation**: Temporarily disabled momentum conservation in `generateThermalVelocities()` for debugging purposes
- **Enhanced Diagnostics**: Added particle state monitoring (active/inactive counts) and strategy execution verification

**Result**: Physics simulation now operates correctly with visible particle movement. All critical blocking issues resolved.

### Previous Changes (2025-08-28 23:05:36 IST)

### Ballistic Strategy Rollout
- **BallisticStrategy Interface Migration**: Converted from `PhysicsStrategy` to `RandomWalkStrategy` interface
  - Added required methods: `updateParticle()`, `calculateStep()`, `validateParameters()`, `getPhysicsParameters()`, `setBoundaries()`, `getBoundaries()`
  - Removed legacy `preUpdate()` and `integrate()` methods
  - Updated constructor to take no arguments (boundary config set via `setBoundaries()`)

- **RandomWalkSimulator Constructor Fixes**: 
  - Fixed `CoordinateSystem` instantiation with proper 3-argument constructor: `(boundaryConfig, canvasSize, dimension)`
  - Fixed `ParticleManager` instantiation with proper 3-argument constructor: `(strategy, dimension, coordinateSystem)`
  - Added missing getter methods: `getParticleCount()`, `getDimension()`, `getStrategy()`
  - Fixed boundary config initialization to use proper `BoundaryConfig` type

- **Integration Test Updates**:
  - Updated test imports to include `CoordinateSystem` and `BoundaryConfig` types
  - Fixed test instantiation patterns to match new constructor signatures
  - Updated particle positioning to use canvas coordinates (200, 200) instead of physics coordinates (0, 0)

- **Files Modified**:
  - `frontend/src/physics/RandomWalkSimulator.ts` - constructor fixes, getter methods
  - `frontend/src/physics/strategies/BallisticStrategy.ts` - interface migration
  - `frontend/src/physics/__tests__/integration.test.ts` - test updates
  - `frontend/src/RandomWalkSim.tsx` - minor updates
  - `frontend/src/physics/ParticleManager.ts` - constructor signature updates
  - `frontend/src/physics/core/CoordinateSystem.ts` - constructor validation
  - `frontend/src/physics/core/StrategyOrchestrator.ts` - strategy handling
  - `frontend/src/physics/strategies/CTRWStrategy2D.ts` - boundary config updates
  - `frontend/src/physics/strategies/InterparticleCollisionStrategy.ts` - interface compliance
  - `frontend/src/physics/types/Particle.ts` - type definitions

## Recent Updates (2025-08-31)

- **Step 4.7: Boundary Integration Completed**
  - Updated `StrategyFactory.ts` to pass `BoundaryConfig` to new `BallisticStrategy` for consistency with legacy strategies
  - Added lightweight boundary update path in `RandomWalkSimulator.updateParameters()` using `PhysicsEngine.updateConfiguration()`
  - Boundary enforcement now centralized via `BoundaryPhase` in new engine architecture
  - Eliminated engine rebuilds when only boundary conditions change
  - Fixed animation loop in `ParticleCanvas.tsx` to suppress tsParticles logging when paused/stopped

This plan is intentionally incremental to keep PRs small, reviewable, and reversible.
