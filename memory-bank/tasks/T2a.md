# T2a: PDE Solver Methods and Boundary Conditions
*Created: 2025-08-25 12:49:41 IST*
*Last Updated: 2025-09-01 18:41:54 IST*

**Description**: Implement multiple PDE solver methods (Crank-Nicolson, RK4, Lax-Wendroff) with boundary condition system and stability improvements for WebGL PDE simulation
**Status**: 🔄 IN PROGRESS **Priority**: HIGH
**Started**: 2025-08-25
**Last Active**: 2025-08-27 11:46:00 IST
**Dependencies**: T2

## Completion Criteria
- ✅ Strategy pattern infrastructure (merged from T11)
- ✅ Crank-Nicolson solver implementation (merged from T11)
- ✅ Lax-Wendroff solver implementation
- ✅ Boundary condition unification across solvers (CLAMP_TO_EDGE)
- ✅ Forward Euler automatic stability guard implementation
- ✅ Dirichlet boundary condition implementation
- ⬜ RK4 solver implementation
- ⬜ Boundary condition parameter UI system (Dirichlet, Neumann, Periodic, Absorbing)
- ⬜ Per-equation solver selection functionality
- ⬜ Solver validation and stability checking

## Related Files
- `frontend/src/webgl/solvers/BaseSolver.ts` (merged from T11)
- `frontend/src/webgl/solvers/ForwardEulerSolver.ts` (merged from T11)
- `frontend/src/webgl/solvers/CrankNicolsonSolver.ts` (merged from T11)
- `frontend/src/webgl/solvers/LaxWendroffSolver.ts`
- `frontend/src/webgl/webgl-solver.js`
- `frontend/src/types.ts`
- `frontend/src/stores/appStore.ts`

## Progress
1. ✅ Strategy pattern infrastructure setup (from T11)
2. ✅ ForwardEulerSolver strategy implementation (from T11)
3. ✅ WebGLSolver strategy integration (from T11)
4. ✅ SolverConfig type definitions (from T11)
5. ✅ Crank-Nicolson solver implementation (from T11)
6. ✅ Lax-Wendroff solver implementation
7. ✅ Boundary condition unification - added CLAMP_TO_EDGE to LaxWendroffSolver.ts
8. ✅ Forward Euler stability guard - automatic dt clamping with CFL conditions
9. ✅ Dirichlet boundary condition implementation - solver-agnostic post-processing approach
10. ✅ Forward Euler fix for Dirichlet BCs - added missing draw call
11. ⬜ RK4 solver implementation
12. ⬜ Per-equation solver selection UI integration
13. ⬜ Boundary condition UI system implementation
14. ⬜ Solver validation and stability checking

## Context
**Merged Progress from T11 (2025-08-25):**
Strategy pattern infrastructure completed with BaseSolver interface. Crank-Nicolson solver provides unconditional stability for diffusion equations, addressing oscillatory instabilities seen with Forward Euler. Infrastructure uses texture ping-pong architecture for explicit methods and supports per-equation solver configuration.

**Current Implementation:**
- Default solver config: telegraph=forward-euler, diffusion=crank-nicolson
- Strategy pattern delegates shader generation and stepping logic to solver strategies
- WebGLSolver maintains existing texture management while delegating to current solver strategy
- Per-equation solver configuration stored in SimulationParams.solver_config

**Session Updates (2025-08-25 14:41:42 IST):**
- **Boundary Condition Unification**: Fixed Lax-Wendroff solver missing CLAMP_TO_EDGE texture wrapping (lines 96-116), ensuring consistent Neumann boundary behavior across all solvers
- **Stability Guard Implementation**: Added automatic dt clamping to ForwardEulerSolver.ts (lines 63-96) with combined CFL conditions:
  - Diffusion: dt ≤ 0.5 × dx² / k
  - Telegraph: dt ≤ dx / v  
  - Safety factor: 0.9 applied to both limits
  - Non-invasive: UI dt preserved, effective dt passed to shader
- **Documentation**: Created comprehensive implementation notes at `memory-bank/implementation-details/pde-bcs-equations-stability.md`

**Boundary Condition Architecture Analysis (2025-08-26 20:40:41 IST):**
Completed comprehensive comparison of four BC implementation approaches:
- GPT-5 Plan: Shader-only with phased implementation
- DeepSeek Plan: Shader-only with optional Strategy pattern
- Complex Strategy: Multi-pattern composition (rejected for KIRSS violations)
- Simple Template: KIRSS-compliant domain-level BCs

**Final Decision:** Implement "Corrected GPT-5" approach using domain-level boundary conditions with shader-only implementation for physics accuracy and KIRSS compliance.

**Dirichlet BC Implementation (2025-08-27 11:46:00 IST):**
- **Solver-Agnostic Approach**: Implemented post-processing pass after solver step to enforce Dirichlet BCs
- **WebGLSolver Updates**: 
  - Updated `init()` to store BC type and Dirichlet value
  - Added `getEnforceDirichletProgram()` with shader for BC enforcement
  - Added post-processing pass to enforce Dirichlet BCs on x-boundaries
- **Forward Euler Fix**: Added missing `gl.drawArrays()` call to properly render updates
- **Plot Enhancements**: Added solver and parameter information to plot legend
- **TypeScript Fixes**: Updated WebGLSolver.init signature to include BC parameters

**Coordinate System Integration Updates (2025-09-01 13:12:23 IST):**
- **Physics Engine Refactoring**: Completed coordinate system centralization in physics strategies
- **InterparticleCollisionStrategy**: Refactored to use coordinate system transformations instead of direct property access
- **Type System Improvements**: Added Vector/Velocity interfaces for better type safety
- **Strategy Pattern**: Updated StrategyFactory and physics engine to use coordinate system abstractions
- **Boundary Condition Integration**: Unified coordinate transformations across all physics strategies

**Physics Strategy Implementation (2025-09-01 18:41:54 IST):**
- **Interface Implementation**: Updated InterparticleCollisionStrategy and InterparticleCollisionStrategy1D to implement PhysicsStrategy interface
- **Method Separation**: Added preUpdate() and integrate() methods to separate collision detection from position integration
- **Boundary Handling**: Implemented proper boundary condition application in integrate() method
- **Trajectory Recording**: Added trajectory point recording with proper timestamp from simTime()
- **Debug Cleanup**: Removed verbose console logs from density visualization code

**Next Steps:**
Implement boundary condition UI selection system and add support for additional BC types (Periodic, Absorbing).
