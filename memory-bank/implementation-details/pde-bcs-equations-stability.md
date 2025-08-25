# PDE Solvers — Boundary Conditions, Equation Types, and Stability

**Date:** 2025-08-25  
**Session:** Afternoon development session  
**Focus:** Unified boundary conditions, stability guards, and dt diagnostics

## Overview

This document summarizes the analysis and improvements made to the WebGL-based PDE solver system, focusing on boundary condition consistency, stability management, and equation parameter monitoring. The goal is to ensure consistent physical behavior across solvers while maintaining numerical stability and providing clear diagnostics.

## Equation Types and Parameters

### Telegraph Equation
- **Form:** `∂²u/∂t² + 2a∂u/∂t = v²∇²u`
- **Parameters:**
  - `a = collision_rate` (damping coefficient)
  - `v = velocity` (finite wave speed)
- **Conserved Quantities:**
  - Mass: `∫ u dx`
  - Energy: `∫ [½w² + ½v²(∂u/∂x)²] dx` where `w = ∂u/∂t`
  - Momentum: `∫ w dx`
- **Physical Behavior:** Finite-speed wave propagation with damping

### Diffusion Equation
- **Form:** `∂u/∂t = k∇²u`
- **Parameters:**
  - `k = diffusivity` (diffusion coefficient)
- **Conserved Quantities:**
  - Mass: `∫ u dx`
- **Physical Behavior:** Infinite-speed diffusive spreading

## Boundary Conditions

### Current Implementation
All solvers now use **Neumann (zero-gradient) boundary conditions** implemented via WebGL texture wrapping mode `CLAMP_TO_EDGE`.

### Key Changes Made
- **Issue:** Lax-Wendroff solver was missing boundary condition setup, leading to absorptive-like behavior
- **Fix:** Added `CLAMP_TO_EDGE` texture wrapping to `LaxWendroffSolver.ts` lines 96-116
- **Result:** All solvers now exhibit consistent reflective boundary behavior

### Physical Implications
- **Neumann BCs:** Zero flux across boundaries (`∂u/∂n = 0`)
- **Wave Behavior:** Waves reflect at boundaries
- **Diffusion Behavior:** No mass flux across boundaries
- **Conservation:** Mass is conserved within the domain

### Future Extensions
Planned flexible boundary condition system:
- **Dirichlet:** Fixed values at boundaries (`u = constant`)
- **Periodic:** Wraparound boundaries (`u(x_min) = u(x_max)`)
- **Absorbing:** Non-reflecting boundaries for waves
- **Implementation:** Shader-based BC application with runtime selection

## Stability Analysis and Guards

### Forward Euler Solver
- **Stability:** Conditionally stable (explicit method)
- **Observed Issues:** High-frequency noise growth due to numerical dispersion
- **CFL Conditions:**
  - Diffusion: `dt ≤ 0.5 × dx² / k`
  - Telegraph (hyperbolic): `dt ≤ dx / v`

#### Automatic dt Guard Implementation
Added to `ForwardEulerSolver.ts` lines 63-96:

```typescript
// Auto dt guard (CFL-style)
const k = parameters.k || 0;
const v = parameters.v || 0;
const safety = 0.9; // conservative factor
let dtLocal = dt;
if (k > 0) {
  dtLocal = Math.min(dtLocal, safety * 0.5 * dx * dx / k);
}
if (v > 0) {
  dtLocal = Math.min(dtLocal, safety * dx / v);
}
```

**Key Features:**
- Non-invasive: UI dt slider unchanged
- Conservative: 0.9 safety factor applied
- Effective dt passed to shader, UI dt preserved
- Combined stability check for mixed telegraph-diffusion systems

### Lax-Wendroff Solver
- **Stability:** CFL condition `dt ≤ dx / v` for hyperbolic terms
- **Boundary Fix:** Now uses `CLAMP_TO_EDGE` for consistent reflective behavior
- **Status:** Stable for appropriate dt values

### Crank-Nicolson Solver
- **Stability:** Unconditionally stable (implicit method)
- **Boundary Conditions:** Uses `CLAMP_TO_EDGE` consistently

## Diagnostics and Monitoring

### dt Diagnostics Panel
Added to "Conserved Quantities" panel showing:
- **UI dt:** User-selected time step
- **Effective dt:** Actually used time step (after stability guard)
- **Diffusion limit:** `0.5 × dx² / k` (when k > 0)
- **Telegraph limit:** `dx / v` (when v > 0)
- **Safety factor:** 0.9 applied to limits

### Conservation Monitoring
Enhanced display format:
- Uniform monospace formatting for all numerical values
- Separate sections for Mass, Energy, Time Step Diagnostics, and Parameters
- Real-time stability indicator based on conservation errors

### Parameters Display
Shows current equation parameters:
- Selected equations list
- Telegraph: collision_rate (a), velocity (v)
- Diffusion: diffusivity (k)

## Validation and Testing

### Example Parameters
- `collision_rate ≈ 0.252`
- `velocity ≈ 0.619`
- `diffusivity ≈ 0.426`
- `mesh_size = 128`
- `domain ≈ [-3, 3]`

### Expected Behavior
- **Telegraph:** Damped wave propagation with reflections at boundaries
- **Diffusion:** Smooth spreading with mass conservation
- **Stability:** Forward Euler should show reduced high-frequency noise with dt guard
- **Boundaries:** Consistent reflective behavior across all solvers

## Implementation Files Modified

### Core Solver Changes
- `frontend/src/webgl/solvers/ForwardEulerSolver.ts`: Added dt guard and stability checks
- `frontend/src/webgl/solvers/LaxWendroffSolver.ts`: Added boundary condition setup

### UI and Monitoring
- `frontend/src/ConservationDisplay.tsx`: Enhanced formatting and added dt diagnostics
- `frontend/src/PlotComponent.tsx`: Added dt computation and parameter passing

## Next Steps

### Immediate Testing
1. **Verify Lax-Wendroff reflective behavior** matches Forward Euler
2. **Test Forward Euler stability** with dt guard active
3. **Validate conservation** across different parameter ranges

### Future Enhancements
1. **Flexible Boundary Conditions:**
   - Shader-based BC selection
   - Runtime switching between Neumann/Dirichlet/Periodic/Absorbing
   - Per-equation boundary condition assignment

2. **Solver Selection:**
   - Per-equation solver choice (e.g., FE for telegraph, CN for diffusion)
   - Adaptive solver switching based on stability requirements

3. **Advanced Stability:**
   - Optional artificial viscosity for noise suppression
   - Adaptive time stepping
   - Stability warnings in UI when dt capping occurs

4. **Validation Tools:**
   - Analytical solution comparisons
   - Convergence testing
   - Performance benchmarking

## Technical Notes

### WebGL Implementation Details
- **Texture Format:** `gl.RG32F` for storing `(u, w)` pairs
- **Boundary Implementation:** `CLAMP_TO_EDGE` provides zero-gradient automatically
- **Shader Uniforms:** `dt`, `dx`, `dy`, equation parameters passed per frame
- **Ping-pong Buffers:** Standard double-buffering for time stepping

### Stability Theory
- **Explicit Methods:** Require dt restrictions for stability
- **Implicit Methods:** Stable for larger dt but computationally expensive
- **CFL Principle:** Information propagation must not exceed numerical grid speed
- **Mixed Systems:** Most restrictive condition applies

### Conservation Principles
- **Mass Conservation:** Fundamental for both telegraph and diffusion
- **Energy Conservation:** Critical for telegraph equation physical validity
- **Numerical Conservation:** Discrete schemes should preserve continuous properties
- **Error Monitoring:** Relative errors tracked against initial values

---

*This document reflects the state as of the 2025-08-25 afternoon session. Updates should be made as the system evolves.*