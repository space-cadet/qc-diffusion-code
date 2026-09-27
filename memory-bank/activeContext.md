# Active Context

*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2026-09-27 18:01:51 IST*

## Current Focus
**Task**: T40 - T15a/T15b modes in the existing Random Walk page
**Status**: 🔄 IN PROGRESS — the in-page T15 prototype runs, but it bypasses the existing engine; independent strategy integration is still required
**Priority**: HIGH

**Context**: T40 keeps T15a/T15b on the existing Random Walk page and requires them as independent strategies in the existing physics engine. The current standalone runner is an architectural mismatch; its implementation and checks are provisional. General engine audit findings remain separate under T27. T39 remains open for browser QA; the app-shell history below is retained as prior context.

1. **Frozen particles** ✅ — `nextCollisionTime` no longer starts at `Infinity`
2. **Missing walk strategies** ✅ — strategy selector restored to the V2 panel
3. **Strategy propagation** ✅ — `createParameterManager()` now reads `params.strategies`
4. **Control wiring** ✅ — `Initialize` / `Reset` reach the live engine; `Start` visibly advances the sim
5. **Live UI stats** ✅ — time and runtime stats flow back into V2 state
6. **Scroll restoration** ✅ — random walk page can scroll to lower panels
7. **Density panel restoration** ✅ — density field is back on the V2 page
8. **Initial distributions restored** ✅ — dropdown and per-distribution controls now affect real particle placement
9. **Strategy audit** ⚠️ — `levy` and `fractional` remain UI-visible but are not implemented in `StrategyFactory`
10. **2D strategy composition** ⚠️ — memory previously claimed CTRW replaces ballistic motion; the 2026-09-27 source audit found both strategies included and integrated. Resolve under T27 before depending on that path.

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

**Branch**: `codex/t40-t15-random-walk-page` (based on `cd9f2a7`)

**Immediate Next Step**: In a new session, replace the standalone T15 simulation/canvas path with independent strategies integrated into the existing physics engine, then repeat relevant model and page checks. The JSON download event also remains unverified. T39c browser QA and general T27 engine findings remain separate open work.

## T40 plan — 2026-09-27

- Add T15a and T15b as selectable modes within the existing Random Walk page. Do not add an app page, tab, or navigation entry.
- Keep the T15a/T15b integration requirements separate from general engine concerns documented under T27.
- Use the paper repository task and model documents as the scientific source of truth; this repository's older T15a task is unrelated.
- See `memory-bank/implementation-details/t15a-t15b-random-walk-page-integration.md` and `memory-bank/tasks/T40.md`.

## 2026-09-26 Spheroid experiment

- Paper research T15/T15a now includes an embedded-surface precursor to the one-anisotropy gravitational derivation. The spheroid's intrinsic metric, curvature, coordinate transformation, and chosen walk equations are in `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/spheroid-geometry-space-walk.md`.
- T39/T39a/T39b/T39c own the separate pure model, numerical validation, and interactive 3D page in this repository. The implementation details are in `memory-bank/implementation-details/spheroid-geometry-space-experiment.md`.
- `spin-network-app` was reviewed for overlap; its fixed-graph walk and future spin-foam type sketch do not replace this repository's simplicial-growth work.
- T39a geometry/walk and T39b finite-volume comparison are implemented. Frozen run v1 meets its terminal mean $L^1$ criterion at 32,000 walkers for both profiles; see `memory-bank/results/t39-spheroid-run-v1.md`.
- T39c page is implemented and replays saved frames; browser verification remains open because this checkout has no installed frontend dependencies. The paper checkout was not changed. Existing T38/T27 and simplicial work retain their recorded status.
- PR feedback fixes now serialize every selected ensemble metric, extend live comparison data to the 50-unit run limit, and restart live simulation when walker count changes. Run v1 was regenerated from a clean source revision; browser QA and the paper note remain open.

## New Tasks Created (Mem-scan Audit)

Following a comprehensive codebase audit, four new tasks and two implementation docs were created to track previously undocumented improvement areas:

- **T34: Frontend Build Artifact Cleanup** — Remove 307+ `.js`/`.d.ts`/`.d.ts.map` files from `src/` trees
- **T35: App Shell and Navigation Refactor** — Replace App.tsx ternary tab switcher, add Error Boundaries, fix mobile labels
- **T36: Monorepo Package Hygiene** — Decide `graph-ui` fate, clean `graph-core` deps, align versions, delete stray lockfiles
- **T37: Backend API Hardening** — Add Pydantic validation, fix pause/resume state loss, extract `useWebSocket` hook
- **T25b/T25c/T25d** — Backfilled missing subtask files for type safety, state fixes, and architecture refactoring

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
