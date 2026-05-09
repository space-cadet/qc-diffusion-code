# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-05-09 15:45 IST*

## Current Focus
**Task**: T27 - Clean Rewrite — Pure WebGL + Original Physics Engine
**Status**: 🔄 IN PROGRESS — Build succeeds, fixes applied, pending deploy
**Priority**: HIGH

**Context**: User decided to ditch tsParticles entirely after seeing the depth of initialization race conditions. Built clean V2 architecture with WebGLRendererV2 + original PhysicsEngine. TypeScript compiles clean. Build and deploy succeed. Three fixes applied this session:

1. **Frozen particles** ✅ — nextCollisionTime was Infinity, now random wait time
2. **Missing walk strategies** ✅ — strategy selector added to parameter panel
3. **Strategy propagation** ✅ — createParameterManager now reads params.strategies

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
- Build: ✅ Compiles clean locally and on Vercel
- Deploy: ✅ Successful
- Motion: ✅ Should work (nextCollisionTime initialized to random wait time)
- Strategies: ✅ Panel has strategy selection, propagated to engine

**Branch**: `cloud-claw/screenshot-poc`

**Immediate Next Step**: Build and deploy to Vercel for live testing

## Recent Completed Work

### T27: Clean Architecture + Original Engine Integration (7 rounds of fixes)
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
  - T27c: Frozen particles — nextCollisionTime initialized to random wait time instead of Infinity
  - T27d: Strategy UI — strategy selector dropdown added to parameter panel
  - T27e: Strategy propagation — createParameterManager reads params.strategies with fallback logic

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
