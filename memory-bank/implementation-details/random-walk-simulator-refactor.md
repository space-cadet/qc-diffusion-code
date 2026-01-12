# RandomWalkSimulator Refactoring Plan

_Created: 2025-08-31 00:35:27 IST_
_Updated: 2026-01-12 18:19:28 IST_

## Overview

This document outlines the incremental refactoring of the `RandomWalkSimulator.ts` file to improve code organization, modularity, and maintainability while preserving existing behavior and APIs. The goal is to extract unrelated or overly large functionality into focused utility modules.

## Refactoring Phases

### Phase 1: Density Utilities Extraction (Completed)

- Extracted density profile and density field computation logic from `RandomWalkSimulator.ts` into utility functions in `frontend/src/physics/utils/density.ts`
- Added `getDensityField1D` utility function replicating existing 1D density field logic
- Modified `RandomWalkSimulator` methods to delegate to these utilities:
  - `getDensityProfile1D` → `getDensityProfile1D` utility
  - `getDensityProfile2D` → `getDensityProfile2D` utility
  - `getDensityField` → `getDensityField1D` utility

### Phase 2: Initialization Utilities Extraction (Completed)

- Created `frontend/src/physics/utils/ThermalVelocities.ts` containing:
  - `gaussianRandom()` function for Gaussian random number generation (Box-Muller transform)
  - `generateThermalVelocities()` function for generating thermal velocities scaled by temperature
- Created `frontend/src/physics/utils/InitDistributions.ts` containing:
  - `sampleCanvasPosition()` function to sample initial particle positions based on distribution parameters and dimension
- Updated `RandomWalkSimulator.ts` to:
  - Import and delegate calls to these new utility functions
  - Preserve all existing logging, momentum conservation diagnostics, and behavior
  - Fixed lint error by defining `thermalSpeed` explicitly in the logging object

### Phase 3: Analysis Utilities Extraction (Completed)

- Extracted analysis utilities:
  - Moved `analyzeWaveFrontSpeed()` and `calculateCenterOfMass()` from `RandomWalkSimulator.ts` to a new module `frontend/src/physics/analysis/WavefrontAnalysis.ts`
  - Delegated calls in `RandomWalkSimulator` to the new analysis utilities
  - Preserved all existing logging and behavior
  - Fixed TypeScript errors in the implementation

## Design Decisions

1. **Orchestration vs. Utilities**:
   - Kept `initializeParticles()` orchestration inside `RandomWalkSimulator` to maintain control over particle creation and interaction with `ParticleManager`
   - Extracted pure utility functions that don't require simulator state

2. **Utility Design Principles**:
   - Utilities are pure and stateless, accepting parameters and returning results without side effects
   - Position sampling utility accepts a parameter object for flexibility and clarity
   - Thermal velocity utilities encapsulate random number generation and velocity scaling

3. **Logging and Diagnostics**:
   - Preserved all existing logging in `RandomWalkSimulator` for debugging and diagnostics
   - Momentum conservation diagnostics remain in the simulator class

## Dependencies and APIs

- Utilities depend on the `Particle` type and particle position data structures
- `RandomWalkSimulator` continues to expose the same public methods and interfaces
- No changes to external APIs or UI components

## Implementation Status

- Phase 1 (Density Utilities): ✅ Completed
- Phase 2 (Initialization Utilities): ✅ Completed
- Phase 3 (Analysis Utilities): ✅ Completed
- Phase 4 (RandomWalkSim Component): ✅ Completed - 2025-09-15

### Phase 4: RandomWalkSim.tsx Component Refactoring (Completed)

**Problem**: RandomWalkSim.tsx grew to 700+ lines handling multiple concerns: engine management, control logic, state sync, and UI layout.

**Solution**: Extracted logic into focused hooks and components:
- `useRandomWalkEngine.ts` (144 lines) - Engine initialization and parameter updates
- `useRandomWalkControls.ts` (172 lines) - Start/pause/reset/initialize handlers  
- `useRandomWalkPanels.ts` (77 lines) - Floating panel state management
- `RandomWalkHeader.tsx` (61 lines) - Header with engine toggles
- `useRandomWalkStateSync.ts` (69 lines) - Periodic saves and metrics sync

**Result**: Main component reduced to 320 lines focused on layout coordination.

**Issues Identified**:
- Infinite loop in state synchronization (partially fixed)
- Component functionality needs verification
- TypeScript compilation errors resolved

### Phase 5: Architecture Review and Bug Fixes (In Progress - 2026-01-12)

**Current Changes**: Comprehensive architecture review identified 31 issues across RandomWalkSim and related components.

**Files Modified**:
- `frontend/src/RandomWalkSim.tsx` - Main component fixes and improvements
- `frontend/src/hooks/useRandomWalkEngine.ts` - Engine management fixes
- `frontend/src/hooks/useRandomWalkControls.ts` - Control logic improvements
- `frontend/src/components/ExportPanel.tsx` - Export functionality fixes
- `frontend/src/components/ReplayControls.tsx` - Replay control improvements
- `frontend/src/components/ParticleCanvas.tsx` - Canvas rendering fixes

**Key Issues Being Addressed**:
- P3-006: Graph physics frozen on GPU mode (4-6h)
- P1-011: ReplayControls hardcoded data (4-6h)  
- P1-007: Animation startup race condition (2-3h)
- P6-001: Add ParticlesLoader interface (2-3h)
- P6-002: Remove 7 `any` type casts (2-3h)
- P1-001: Add useGPU dependency (0.5h)
- P5-002: Fix GPU mode switching (0.5h)
- P1-008: Consolidate isRunning state (4-6h)

**Status**: Architecture review complete, implementation in progress with focus on critical bug fixes.

## Future Considerations

- Complete RandomWalkSim functionality verification and testing
- Extract boundary condition and strategy initialization logic into a config module
- Add unit tests for the new utility modules to verify correctness
- Consider performance profiling to ensure no overhead from delegation