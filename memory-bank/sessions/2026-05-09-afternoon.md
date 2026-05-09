# T27 Clean Architecture Rewrite — Afternoon Fixes

## Session: 2026-05-09 ~15:30 IST

## Fixes Applied

### 1. Frozen Particles Fix (T27c)
**Root cause:** `nextCollisionTime` initialized to `Infinity` in `useOriginalPhysicsEngine.ts` `initializeParticles()`. CTRW strategies check `currentTime >= particle.nextCollisionTime` — since `currentTime` starts at 0, the condition is never met, so no collisions ever occur.

**Fix:** Changed initialization to `Math.random() * (1 / (params.collisionRate || 1))` so each particle gets a random initial wait time.

**File:** `frontend/src/hooks/useOriginalPhysicsEngine.ts`

### 2. Missing Strategy UI Fix (T27d)
**Root cause:** `RandomWalkParameterPanelV2.tsx` had no strategy selector — only simulation type (continuum/graph), dimension, particles, velocity, temperature, collision rate, boundary condition, interparticle collisions toggle, and initial distribution.

**Fix:** Added `<select>` dropdown with options:
- Simple (Ballistic)
- CTRW (Continuous Time Random Walk)
- Lévy Flight
- Fractional Diffusion
- Interparticle Collisions

**File:** `frontend/src/components/RandomWalkParameterPanelV2.tsx`

### 3. Strategy Propagation Fix (T27e)
**Root cause:** `createParameterManager()` in `useOriginalPhysicsEngine.ts` hardcoded strategies based on collision rate: `params.collisionRate > 0 ? ['ctrw'] : ['simple']`. The `strategies` array from `RandomWalkParams` was never read.

**Fix:** 
- Extended `EngineParams` interface to include `strategies` field
- Rewrote `createParameterManager()` to read from `params.strategies` first, then `params.strategyType`, then fall back to collision-rate logic
- Auto-adds `'collisions'` strategy when `interparticleCollisions` is enabled
- Updated `RandomWalkSimV2.tsx` to pass `gridLayoutParams.strategies` to engine params

**Files:** 
- `frontend/src/hooks/useOriginalPhysicsEngine.ts`
- `frontend/src/RandomWalkSimV2.tsx`

## Verification
- TypeScript compiles clean (`npx tsc --noEmit`)
- No build errors

## Status
- Particles: should now move with CTRW strategy (random collision times initialized)
- Strategy UI: visible in parameter panel
- Strategy selection: propagated to physics engine

## Next Steps
- Build and deploy to Vercel for live testing
- Verify particle movement and collision behavior visually
- Debug any remaining physics issues
