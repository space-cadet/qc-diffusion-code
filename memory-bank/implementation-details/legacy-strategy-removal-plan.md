# Legacy Strategy Removal and Migration Plan

This document outlines the file changes required to completely migrate from `RandomWalkStrategy` to `PhysicsStrategy`. The overall goal is to make `PhysicsStrategy` the sole interface for all physics calculations, removing the legacy `updateParticle`-based methods.

## Migration Plan: File by File

### 1. Refactor/Remove Legacy Strategies

*   **`frontend/src/physics/strategies/LegacyBallisticStrategy.ts`**
    *   **Action:** Delete this file.
    *   **Reason:** A modern, `PhysicsStrategy`-compliant version already exists in `BallisticStrategy.ts`. Any part of the code still using `LegacyBallisticStrategy` should be updated to use `BallisticStrategy` instead.

### 2. Update Hybrid Strategies

These files currently implement both interfaces. The legacy methods must be removed.

*   **`frontend/src/physics/strategies/CTRWStrategy1D.ts`**
*   **`frontend/src/physics/strategies/CTRWStrategy2D.ts`**
*   **`frontend/src/physics/strategies/InterparticleCollisionStrategy1D.ts`**
*   **`frontend/src/physics/strategies/InterparticleCollisionStrategy2D.ts`**
    *   **Action (for each file):**
        1.  In the class declaration, remove `RandomWalkStrategy` from the `implements` clause.
        2.  Delete the `updateParticle` and `updateParticleWithDt` methods.
        3.  Ensure the core logic resides within the `preUpdate` and `integrate` methods.

*   **`frontend/src/physics/strategies/CompositeStrategy.ts`**
    *   **Action:**
        1.  Change the class declaration to only `implements PhysicsStrategy`.
        2.  Update the constructor to accept an array of `PhysicsStrategy[]`.
        3.  Delete the `updateParticle` method.

### 3. Update Strategy Consumers

These are the high-level managers that run the simulation. They need to be updated to use the new two-phase physics loop.

*   **`frontend/src/physics/ParticleManager.ts`**
    *   **Action:**
        1.  Change all type annotations for the `strategy` property from `RandomWalkStrategy` to `PhysicsStrategy`.
        2.  Rewrite the `update(dt: number)` method. The current loop calls `strategy.updateParticle...`. It must be replaced with two separate loops:
            ```typescript
            // Phase A: Run preUpdate for all particles
            for (const particle of activeParticles) {
              this.strategy.preUpdate?.(particle, allParticles, context);
            }

            // Phase B: Run integrate for all particles
            for (const particle of activeParticles) {
              this.strategy.integrate?.(particle, dt, context);
            }
            ```
            *(Note: A `PhysicsContext` object will need to be created and passed in).*

### 4. Update Factories and Configuration

*   **`frontend/src/physics/factories/StrategyFactory.ts`**
    *   **Action:**
        1.  Change the return type of `createStrategies` to `PhysicsStrategy[]`.
        2.  Remove any instantiation of `LegacyBallisticStrategy`.
        3.  Clean up any type casting to `RandomWalkStrategy`. The factory should only produce and return `PhysicsStrategy` objects.

*   **`frontend/src/physics/RandomWalkSimulator.ts`**
    *   **Action:**
        1.  Change the type of `strategies` and `currentStrategy` from `RandomWalkStrategy` to `PhysicsStrategy`.
        2.  Anywhere the strategy methods are called, it must be updated to use the new `preUpdate`/`integrate` loop if applicable.

### 5. Final Cleanup

Once all the above changes are made and the application is confirmed to be working:

*   **`frontend/src/physics/interfaces/RandomWalkStrategy.ts`**
    *   **Action:** Delete this file.
*   **`frontend/src/physics/adapters/LegacyStrategyAdapter.ts`**
    *   **Action:** Delete this file, as it will no longer be needed.
*   **`frontend/src/physics/index.ts`**
    *   **Action:** Remove the line that exports from `RandomWalkStrategy`.
