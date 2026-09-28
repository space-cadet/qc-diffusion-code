# Frontend Dead Code Inventory

*Created: 2026-05-11 11:31:20 IST*
*Last Updated: 2026-05-11 11:31:20 IST*

## Overview

This document tracks legacy files, parallel implementations, and unused components identified during the mem-scan audit. These files are safe to delete once their replacements are verified.

## Physics Engine — Parallel Implementations

| File | Lines | Status | Replacement | Notes |
|------|-------|--------|-------------|-------|
| `frontend/src/physics/PhysicsEngineV2.ts` | 352 | 🔴 DELETE | `frontend/src/physics/core/PhysicsEngine.ts` | Monolithic O(N^2) collision class; original strategy engine is authoritative |
| `frontend/src/physics/RandomWalkSimulator.ts` | 387 | 🔴 DELETE | `frontend/src/physics/core/PhysicsEngine.ts` | Legacy bridge with try/catch fallbacks |
| `frontend/src/physics/ParticleManager.ts` | ~200 | 🔴 DELETE | `frontend/src/physics/core/` | Legacy manager using old strategy interface |

## Random Walk UI — Legacy Pages and Components

| File | Status | Replacement | Notes |
|------|--------|-------------|-------|
| `frontend/src/RandomWalkSim.tsx` | 🔴 DELETE | `frontend/src/RandomWalkSimV2.tsx` | Legacy page; V2 is active |
| `frontend/src/components/RandomWalkParameterPanel.tsx` | 🔴 DELETE | `frontend/src/components/RandomWalkParameterPanelV2.tsx` | Legacy panel |
| `frontend/src/components/ParticleCanvas.tsx` | 🔴 DELETE | `frontend/src/components/ParticleCanvasV2.tsx` | Legacy canvas using tsParticles high-level API |
| `frontend/src/components/ObservablesPanel.tsx` | 🟡 VERIFY | `frontend/src/components/stream-ObservablesPanel.tsx` | Check if still used by legacy path |
| `frontend/src/components/Controls.tsx` | 🔴 DELETE | `frontend/src/components/PdeParameterPanel.tsx` | Unimported by App.tsx |
| `frontend/src/components/BottomControls.tsx` | 🔴 DELETE | `frontend/src/components/PdeParameterPanel.tsx` | Unimported by App.tsx |
| `frontend/src/components/ConservationDisplay.tsx` | 🔴 DELETE | `frontend/src/components/PlotComponent.tsx` | Unimported by App.tsx |

## Hooks — Legacy and Backup

| File | Status | Notes |
|------|--------|-------|
| `frontend/src/hooks/useParticlesEngine.ts.backup` | 🔴 DELETE | Backup file |
| `frontend/src/hooks/useRandomWalkEngine.ts` | 🟡 VERIFY | Likely legacy; verify against `useOriginalPhysicsEngine.ts` |
| `frontend/src/hooks/useParticlesLoader.ts` | 🟡 REFACTOR | Keep but split per T25d |

## Strategy — Legacy Interfaces

| File | Status | Replacement | Notes |
|------|--------|-------------|-------|
| `frontend/src/physics/interfaces/RandomWalkStrategy.ts` | 🔴 DELETE | `frontend/src/physics/interfaces/PhysicsStrategy.ts` | Legacy interface; migration plan in `legacy-strategy-removal-plan.md` |
| `frontend/src/physics/adapters/LegacyStrategyAdapter.ts` | 🔴 DELETE | N/A | Adapter for old interface |
| `frontend/src/physics/strategies/LegacyBallisticStrategy.ts` | 🔴 DELETE | `frontend/src/physics/strategies/BallisticStrategy.ts` | Legacy implementation |

## GPU — Unused Shaders

| File | Status | Notes |
|------|--------|-------|
| `frontend/src/gpu/shaders/positionUpdate.glsl.unused` | 🔴 DELETE | Unused shader file |

## Orphaned Demo Files

| File | Status | Notes |
|------|--------|-------|
| `frontend/src/drag-n-drop-demo.tsx` | 🔴 DELETE | Orphaned demo |

## Build Artifacts in Source Tree

| Pattern | Location | Action |
|---------|----------|--------|
| `**/*.js` | `frontend/src/` (except intentional JS like `webgl-solver.js`) | Delete |
| `**/*.d.ts` | `frontend/src/` (except ambient declarations like `spin-network.d.ts`) | Delete |
| `**/*.d.ts.map` | `frontend/src/` | Delete |
| `**/*.js` | `packages/ts-quantum/src/` | Delete |
| `**/*.d.ts` | `packages/ts-quantum/src/` | Delete |
| `**/*.js` | `packages/graph-core/src/` | Delete |
| `**/*.d.ts` | `packages/graph-core/src/` | Delete |

## Verdict Summary

- **Immediate deletion (no risk):** backup files, unused shaders, orphaned demos, unimported PDE controls
- **Deletion after verification:** legacy RandomWalkSim, ParticleCanvas, PhysicsEngineV2, RandomWalkSimulator
- **Refactor rather than delete:** useParticlesLoader (split per T25d), appStore (split per T25d)
