# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-05-11 10:23:55 IST*

## Current Focus
**Task**: T27 - Clean Rewrite — Pure WebGL + Original Physics Engine
**Status**: 🔄 IN PROGRESS — V2 parity fixes applied, floating observables restored, collision stats visible; remaining strategy cleanup and graph mode
**Priority**: HIGH

**Context**: User decided to ditch tsParticles entirely after seeing the depth of initialization race conditions. The active page now runs through `WebGLRendererV2` plus the original `PhysicsEngine` via `useOriginalPhysicsEngine.ts`. TypeScript compiles clean. The main V2 parity fixes now on the branch are:

1. **Frozen particles** ✅ — `nextCollisionTime` no longer starts at `Infinity`
2. **Missing walk strategies** ✅ — strategy selector restored to the V2 panel
3. **Strategy propagation** ✅ — `createParameterManager()` now reads `params.strategies`
4. **Control wiring** ✅ — `Initialize` / `Reset` reach the live engine; `Start` visibly advances the sim
5. **Live UI stats** ✅ — time and runtime stats flow back into V2 state
6. **Scroll restoration** ✅ — random walk page can scroll to lower panels
7. **Density panel restoration** ✅ — density field is back on the V2 page
8. **Initial distributions restored** ✅ — dropdown and per-distribution controls now affect real particle placement
9. **Strategy audit** ⚠️ — `levy` and `fractional` remain UI-visible but are not implemented in `StrategyFactory`

**Architecture Evolution**:
- Started with: `PhysicsEngineV2` (hardcoded ballistic) + `WebGLRendererV2`
- **Current**: Original `PhysicsEngine` (full strategy system) + `WebGLRendererV2`
- New adapter: `useOriginalPhysicsEngine.ts` bridges original engine to V2 renderer

**Files Created**:
- `frontend/src/physics/PhysicsEngineV2.ts` (kept as fallback)
- `frontend/src/webgl/WebGLRendererV2.ts`
- `frontend/src/hooks/usePhysicsEngine.ts` (V2 wrapper)
- `frontend/src/hooks/useWebGLRenderer.ts`
- `frontend/src/hooks/useOriginalPhysicsEngine.ts` (NEW — wraps original engine)
- `frontend/src/components/ParticleCanvasV2.tsx`
- `frontend/src/RandomWalkSimV2.tsx`
- `frontend/src/components/RandomWalkParameterPanelV2.tsx`

**Files Modified**:
- `frontend/src/App.tsx` — imports RandomWalkSimV2
- `frontend/src/stores/appStore.ts` — exported RandomWalkSimulationState
- `frontend/src/physics/types/BoundaryConfig.ts` — kept 'reflective' type
- `frontend/src/hooks/useParticlesLoader.ts` — type fixes (as unknown as ParticlesLoader)
- `frontend/src/hooks/useRandomWalkControls.ts` — type fixes
- `frontend/src/components/WebGLCanvas.tsx` — canvas.id fix
- `frontend/src/memoryBank/hooks/useMemoryBankDocs.ts` — complete rewrite with types
- `frontend/src/memoryBank/components/*` — import fixes
- `frontend/src/hooks/useOriginalPhysicsEngine.ts` — nextCollisionTime fix, strategies propagation
- `frontend/src/components/RandomWalkParameterPanelV2.tsx` — strategy selector UI
- `frontend/src/RandomWalkSimV2.tsx` — pass strategies to engine params

**Current State**:
- Build: ✅ `npx tsc --noEmit` passes
- Deploy: ✅ Prior deploy succeeded; current parity fixes still need fresh live verification
- Motion: ✅ Controls and visible evolution now work on the V2 page
- Density: ✅ Restored below the main canvas
- Distributions: ✅ `uniform`, `gaussian`, `ring`, `stripe`, and `grid` now reinitialize correctly
- Strategies: ⚠️ `simple`, `ctrw`, and `collisions` work; `levy` and `fractional` are still UI-only

**Branch**: `cloud-claw/screenshot-poc`

**Immediate Next Step**: Run a fresh live/browser verification of the V2 page, then either remove or implement the fake `levy` / `fractional` strategy options

## Recent Completed Work

### T27: Clean Architecture + Original Engine Integration (current branch)
- PhysicsEngineV2 with particle creation, step, boundaries, collisions
- WebGLRendererV2 with shaders, buffers, draw call
- React hooks for orchestration
- Component integration with App.tsx
- RandomWalkParameterPanelV2 (decoupled from simulatorRef)
- **useOriginalPhysicsEngine.ts**: New hook wrapping original PhysicsEngine with full strategy system
- **adaptParticles()**: Converts original Particle[] to SimpleParticle[] for WebGL renderer
- TypeScript compiles clean locally and on Vercel
- Build fixes applied: RandomWalkSimulationState export, BoundaryType consistency, useParticlesLoader types, memory bank type exports, various cast fixes, double cast (unknown → ParticlesLoader)
- **Afternoon fixes (2026-05-09)**:
  - T27c: Frozen particles — `nextCollisionTime` initialized to a finite random wait time instead of `Infinity`
  - T27d: Strategy UI — strategy selector dropdown added to the V2 parameter panel
  - T27e: Strategy propagation — `createParameterManager()` reads `params.strategies` with fallback logic
  - V2 control wiring — `Initialize`, `Reset`, and live stats flow are connected to the actual engine
  - V2 layout parity — page scroll restored and density panel re-added to the layout
  - V2 initialization parity — shared initial-distribution sampler and missing distribution-specific controls restored
- **Morning fixes (2026-05-11)**:
  - T27f: Floating observables restored — `ObservablesPanel` and `CustomObservablesPanel` mounted on V2 via `simulatorLikeRef` shim
  - T27f: Collision stats fix — `useOriginalPhysicsEngine` now tracks `interparticleCollisionCount`; V2 panel shows Scattering and Collisions counts
  - Memory bank discrepancies fixed — velocity-color claim corrected in implementation doc; T27 timestamp inconsistency resolved

### T31: Mobile UI Responsiveness and Design
- Mobile bottom icon navigation bar (4 primary + hamburger overflow)
- Slide-in parameter drawer for simulation pages on mobile
- Controls placed directly below visualization area
- Compact MetricsGrid (3-col on mobile, smaller text/padding)
- Responsive canvas sizing for SimplicialVisualization/3D
- Compact info panel overlay on visualization
- Memory bank viewer: removed sticky sections toolbar
- MemoryBankPage height fix (h-full instead of h-screen)

### T30b: Simplicial Boundary Conditions & 3D Tet Strip Fix
- Added BoundaryConstraintMode type and extended BoundaryGrowthParams with boundary constraints
- Implemented getBottomAndSideBoundaries2D/3D() for automatic boundary identification
- Added frozen boundary filtering in BoundaryGrowthController.step() for both 2D and 3D
- Rewrote createTetStripGeometry() from scratch with cube-inscribed approach for proper 3D rendering from default camera angle
- Updated createTetStripTopology() to match new geometry (2*(n+1) vertices)
- Added isBoundaryFrozen() helper for efficient constraint checking
- All acceptance criteria met (7/9), UI/visualization deferred to T30c
- TypeScript builds clean, code committed and pushed
