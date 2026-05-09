# T27 Clean Architecture Rewrite — Afternoon Fixes

*Created: 2026-05-09 14:00:20 IST*
*Last Updated: 2026-05-09 14:00:20 IST*

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

### 4. V2 Control Wiring and Visible Evolution Fix
**Root cause:** The V2 page was updating store status without actually resetting or reinitializing the engine, and the UI time display was not receiving live stats from the running canvas. On top of that, default motion was visually too small, which made the page look frozen even after `Start`.

**Fix:**
- Wired `Initialize` and `Reset` into the live engine path
- Propagated runtime stats back into V2 state so time/status update visibly
- Switched the V2 engine path to frame-time stepping with visible canvas-space motion scaling

**Files:**
- `frontend/src/RandomWalkSimV2.tsx`
- `frontend/src/components/ParticleCanvasV2.tsx`
- `frontend/src/hooks/useOriginalPhysicsEngine.ts`

### 5. Random Walk Page Scroll Fix
**Root cause:** The route shell and V2 page height rules trapped the page at viewport height, preventing scroll to lower grid panels.

**Fix:** Changed the app shell for the random walk tab to use scrollable overflow and changed the V2 page container from `h-screen` to `min-h-full`.

**Files:**
- `frontend/src/App.tsx`
- `frontend/src/RandomWalkSimV2.tsx`

### 6. Density Panel Restoration
**Root cause:** `DensityComparison` still existed, but it was mounted only on the legacy random walk page and had assumptions tied to the older engine path.

**Fix:** Re-added the density panel to the V2 layout and made `DensityComparison` tolerate the V2 engine path where there is no legacy `simulatorRef`.

**Files:**
- `frontend/src/RandomWalkSimV2.tsx`
- `frontend/src/components/ParticleCanvasV2.tsx`
- `frontend/src/components/DensityComparison.tsx`

### 7. Initial Distribution Wiring Restoration
**Root cause:** The V2 parameter panel exposed only the distribution-type dropdown, and the V2 engine still initialized particles uniformly regardless of selection.

**Fix:**
- Reused the shared initialization sampler in the V2 engine path
- Restored the missing distribution-specific controls in the V2 panel
- Reinitialized particles when distribution parameters changed

**Files:**
- `frontend/src/hooks/useOriginalPhysicsEngine.ts`
- `frontend/src/components/RandomWalkParameterPanelV2.tsx`

### 8. Strategy Audit
**Finding:** `simple`, `ctrw`, and `collisions` are implemented in the strategy factory. `levy` and `fractional` are still exposed in the V2 UI but have no implementation in `StrategyFactory`.

## Verification
- TypeScript compiles clean (`npx tsc --noEmit`)
- No build errors
- User confirmed the frozen-sim fix works locally
- User confirmed the page scroll fix works locally
- User confirmed the density panel is visible again

## Status
- Particles: move visibly on the V2 page
- Controls: `Initialize`, `Start`, and `Reset` affect the actual engine
- Density panel: restored below the main canvas
- Initial distributions: shape changes are visible on reinitialize
- Strategy UI: visible and propagated, but `levy` / `fractional` remain unimplemented

## Next Steps
- Run a fresh browser/deploy verification pass on the current branch
- Decide whether to implement `levy` / `fractional` or remove them from the dropdown
- Continue parity work only where the V2 page still differs from legacy behavior
