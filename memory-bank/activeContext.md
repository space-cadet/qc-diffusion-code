# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-05-09 11:45:00 IST*

## Current Focus
**Task**: T27 - Clean Rewrite — Pure WebGL + New Physics Engine
**Status**: 🔄 IN PROGRESS — Core architecture working, needs physics verification
**Priority**: HIGH

**Context**: User decided to ditch tsParticles entirely after seeing the depth of initialization race conditions. Built clean V2 architecture with PhysicsEngineV2 + WebGLRendererV2. TypeScript compiles clean. Initial render shows particles. Start/Pause works. Parameter panel V2 created and integrated.

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

**Current State**: Particles render and move. Need to verify physics correctness (collision algorithms, random walk behavior, boundary conditions).

**Branch**: `cloud-claw/t27-webgl-rewrite`

**Immediate Next Step**: Verify physics algorithms or commit current progress

## Recent Completed Work

### T27: Clean Architecture Implementation
- PhysicsEngineV2 with particle creation, step, boundaries, collisions
- WebGLRendererV2 with shaders, buffers, draw call
- React hooks for orchestration
- Component integration with App.tsx
- RandomWalkParameterPanelV2 (decoupled from simulatorRef)
- TypeScript compiles clean
- Initial render shows particles correctly
- Start/Pause/Reset buttons work
- Particles move when simulation runs

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