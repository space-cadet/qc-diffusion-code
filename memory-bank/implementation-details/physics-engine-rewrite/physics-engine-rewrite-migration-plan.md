# Physics Engine Migration Plan (Stepwise)

Created: 2025-08-28 19:00:55 IST

This file tracks the concrete migration steps from the current composite strategy loop to the two-phase PhysicsEngine architecture. Source references: `physics-engine-rewrite-final.md`, `physics-engine-rewrite-claude4.md`, `physics-engine-rewrite-deepseek.md`.

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

## Step 3 (Time unification & logging)
- Replace `Date.now()` and fixed `0.01` with engine `dt/currentTime`
- Single trajectory logging point post-step; remove duplicates in strategies/ParticleManager

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

This plan is intentionally incremental to keep PRs small, reviewable, and reversible.
