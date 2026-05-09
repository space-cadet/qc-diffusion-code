# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-05-09 13:15:00 IST*

## Current Focus
**Task**: T27 - Clean Rewrite — Pure WebGL + New Physics Engine
**Status**: 🔄 IN PROGRESS — Core architecture working, Vercel build fixes ongoing
**Priority**: HIGH

**Context**: User decided to ditch tsParticles entirely after seeing the depth of initialization race conditions. Built clean V2 architecture with PhysicsEngineV2 + WebGLRendererV2. TypeScript compiles clean locally. Multiple rounds of Vercel build fixes applied (6 rounds so far). Some TypeScript errors remain to be fixed in next session.

**New Architecture**:
- `PhysicsEngineV2`: owns particles (created once, updated in place)
- `WebGLRendererV2`: draws particles directly with GPU (no tsParticles)
- `usePhysicsEngine` / `useWebGLRenderer`: React hooks
- `ParticleCanvasV2`: canvas component
- `RandomWalkSimV2`: main component (wired into App.tsx)
- `RandomWalkParameterPanelV2`: decoupled parameter panel (no simulatorRef)

**Files Created**:
- `frontend/src/physics/PhysicsEngineV2.ts`
- `frontend/src/webgl/WebGLRendererV2.ts`
- `frontend/src/hooks/usePhysicsEngine.ts`
- `frontend/src/hooks/useWebGLRenderer.ts`
- `frontend/src/components/ParticleCanvasV2.tsx`
- `frontend/src/RandomWalkSimV2.tsx`
- `frontend/src/components/RandomWalkParameterPanelV2.tsx`

**Files Modified**:
- `frontend/src/App.tsx` — imports RandomWalkSimV2
- `frontend/src/stores/appStore.ts` — exported RandomWalkSimulationState
- `frontend/src/physics/types/BoundaryConfig.ts` — kept 'reflective' type
- `frontend/src/hooks/useParticlesLoader.ts` — type fixes
- `frontend/src/hooks/useRandomWalkControls.ts` — type fixes
- `frontend/src/components/WebGLCanvas.tsx` — canvas.id fix
- `frontend/src/memoryBank/hooks/useMemoryBankDocs.ts` — complete rewrite with types
- `frontend/src/memoryBank/components/*` — import fixes

**Current State**: Particles render and move locally. Vercel deployment has remaining TypeScript errors to fix.

**Branch**: `cloud-claw/screenshot-poc` (merged from t27-webgl-rewrite)

**Immediate Next Step**: Fix remaining Vercel build errors in new session

## Recent Completed Work

### T27: Clean Architecture Implementation + Vercel Build Fixes (6 rounds)
- PhysicsEngineV2 with particle creation, step, boundaries, collisions
- WebGLRendererV2 with shaders, buffers, draw call
- React hooks for orchestration
- Component integration with App.tsx
- RandomWalkParameterPanelV2 (decoupled from simulatorRef)
- TypeScript compiles clean locally
- Initial render shows particles correctly
- Start/Pause/Reset buttons work
- Particles move when simulation runs
- **Build fixes applied**: RandomWalkSimulationState export, BoundaryType consistency, useParticlesLoader types, memory bank type exports, various cast fixes

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