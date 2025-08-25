# C2a: PDE Solver Methods and Boundary Conditions
*Created: 2025-08-25 12:49:41 IST*
*Last Updated: 2025-08-25 14:41:42 IST*

**Description**: Implement multiple PDE solver methods (Crank-Nicolson, RK4, Lax-Wendroff) with boundary condition system and stability improvements for WebGL PDE simulation
**Status**: 🔄 IN PROGRESS **Priority**: HIGH
**Started**: 2025-08-25
**Last Active**: 2025-08-25 14:41:42 IST
**Dependencies**: C2

## Completion Criteria
- ✅ Strategy pattern infrastructure (merged from C11)
- ✅ Crank-Nicolson solver implementation (merged from C11)
- ✅ Lax-Wendroff solver implementation
- ✅ Boundary condition unification across solvers (CLAMP_TO_EDGE)
- ✅ Forward Euler automatic stability guard implementation
- ⬜ RK4 solver implementation
- ⬜ Boundary condition parameter system (Dirichlet, Neumann, Periodic, Absorbing)
- ⬜ Per-equation solver selection functionality
- ⬜ Solver validation and stability checking
- ⬜ Boundary condition shader implementations

## Related Files
- `frontend/src/webgl/solvers/BaseSolver.ts` (merged from C11)
- `frontend/src/webgl/solvers/ForwardEulerSolver.ts` (merged from C11)
- `frontend/src/webgl/solvers/CrankNicolsonSolver.ts` (merged from C11)
- `frontend/src/webgl/solvers/LaxWendroffSolver.ts`
- `frontend/src/webgl/webgl-solver.js`
- `frontend/src/types.ts`
- `frontend/src/stores/appStore.ts`

## Progress
1. ✅ Strategy pattern infrastructure setup (from C11)
2. ✅ ForwardEulerSolver strategy implementation (from C11)
3. ✅ WebGLSolver strategy integration (from C11)
4. ✅ SolverConfig type definitions (from C11)
5. ✅ Crank-Nicolson solver implementation (from C11)
6. ✅ Lax-Wendroff solver implementation
7. ✅ Boundary condition unification - added CLAMP_TO_EDGE to LaxWendroffSolver.ts
8. ✅ Forward Euler stability guard - automatic dt clamping with CFL conditions
9. ⬜ RK4 solver implementation
10. ⬜ Per-equation solver selection UI integration
11. ⬜ Boundary condition system design and implementation
12. ⬜ Solver validation and stability checking

## Context
**Merged Progress from C11 (2025-08-25):**
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

**Next Steps:**
Need RK4 solver for telegraph equation accuracy improvements and boundary condition system for flexible physics scenarios beyond current hardcoded Neumann (CLAMP_TO_EDGE) boundaries. Test unified boundary behavior and stability improvements.
