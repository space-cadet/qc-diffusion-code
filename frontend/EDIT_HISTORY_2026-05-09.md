# Random Walk Canvas Fix - Edit History

## Problem
The Random Walk simulation canvas was blank/white after clicking Initialize + Start. Particles were not visible, and the Density Profile showed "Max ρ: -Infinity" with "Bins: 0/0".

## Root Causes Found

1. **Stale `gridLayoutParamsRef` closure**: The parent component (`RandomWalkSim.tsx`) creates a new `{ current: {...} }` object on every render. `startAnimation` in `useParticlesLoader.ts` was memoized with empty deps `[]`, capturing the first (stale) ref object. This caused the animation loop to read stale parameter values.

2. **Double particle creation**: `createParticleContainer` in `tsParticlesConfig.ts` creates `particleCount` random particles. Then `handleInitialize` in `useRandomWalkControls.ts` adds another `particleCount` particles from the simulator without clearing the existing ones first.

3. **Missing forced redraw**: After adding particles in `handleInitialize`, no explicit `draw()` call was made to ensure immediate visibility.

4. **Canvas sizing issues**: The canvas element had no explicit sizing checks or ResizeObserver to handle layout changes.

## Fixes Applied

### 1. `frontend/src/hooks/useParticlesLoader.ts`
- Added `localGridLayoutParamsRef` to avoid stale closure issues
- Added `useEffect` to keep local ref in sync with passed ref
- Updated all internal references from `gridLayoutParamsRef` to `localGridLayoutParamsRef`

### 2. `frontend/src/hooks/useRandomWalkControls.ts`
- Added `container.particles.clear()` before adding new particles in `handleInitialize`
- Added `container.draw(false)` after adding particles to force immediate redraw
- Added debug logging for particle count and canvas size after initialization

### 3. `frontend/src/config/tsParticlesConfig.ts`
- Added canvas size checks and logging in `createParticleContainer`
- Added warning if canvas has zero size on initialization

### 4. `frontend/src/components/ParticleCanvas.tsx`
- Added `style={{ display: 'block' }}` to canvas element
- Added `ResizeObserver` to monitor canvas size changes and trigger `container.canvas.resize()`
- Added cleanup for ResizeObserver on unmount

### 5. `frontend/src/components/DensityComparison.tsx`
- Added empty-array guard before `Math.max(...)` to fix "-Infinity" bug

## Files Modified
1. `frontend/src/hooks/useParticlesLoader.ts`
2. `frontend/src/hooks/useRandomWalkControls.ts`
3. `frontend/src/config/tsParticlesConfig.ts`
4. `frontend/src/components/ParticleCanvas.tsx`
5. `frontend/src/components/DensityComparison.tsx`

## Verification
- TypeScript compiles without errors in modified files
- Build completes successfully

## Branch
`cloud-claw/screenshot-poc`
