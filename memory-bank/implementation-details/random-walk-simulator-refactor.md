# RandomWalkSimulator Refactoring Plan

_Created: 2025-08-31 00:35:27 IST_
_Last Updated: 2025-08-31 01:00:15 IST_

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

## Future Considerations

- Extract boundary condition and strategy initialization logic into a config module
- Add unit tests for the new utility modules to verify correctness
- Consider performance profiling to ensure no overhead from delegation