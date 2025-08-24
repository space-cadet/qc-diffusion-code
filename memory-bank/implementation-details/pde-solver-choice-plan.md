# PDE Solver Choice Implementation Plan
*Created: 2025-08-25 03:43:52 IST*
*Last Updated: 2025-08-25 04:41:45 IST*

## Overview
Implementation plan for addressing diffusion equation stability issues through multiple numerical solver support using Strategy pattern architecture.

## Problem Analysis
- **Current Issue**: Forward Euler shows oscillatory instabilities in diffusion equation (visible in comparison images)
- **Root Cause**: Explicit time-stepping with CFL stability limitations
- **Solution**: Implement implicit (Crank-Nicolson) and higher-order explicit (RK4) solvers

## Solver Comparison

### Stability and Accuracy Analysis
| Solver | Stability | Order | Best For | Implementation Complexity |
|---------|-----------|-------|----------|-------------------------|
| Forward Euler | CFL-limited | 1st | Simple testing | Low |
| Crank-Nicolson | Unconditional | 2nd | Diffusion equations | Medium (GPU matrix solve) |
| RK4 | Better CFL | 4th | Wave equations (Telegraph) | Medium (multi-stage) |
| Backward Euler | Unconditional | 1st | Robust fallback | Medium (GPU matrix solve) |

### Per-Equation Recommendations
- **Diffusion Equation**: Crank-Nicolson (unconditional stability)
- **Telegraph Equation**: RK4 (wave-like nature, higher accuracy)
- **Wheeler-DeWitt**: Custom/RK4 (future implementation)

## Architecture Design

### Strategy Pattern Infrastructure ✅ COMPLETED
```typescript
interface SolverStrategy {
  getName(): string;
  getShaderSource(equationType: string): string;
  getTextureCount(): number;
  isStable(dt: number, dx: number, parameters: any): boolean;
  step(...): number; // WebGL stepping logic
}
```

### WebGL Integration Pattern
```javascript
class WebGLSolver {
  constructor(canvas) { this.solverStrategy = new ForwardEulerSolver(); }
  setSolver(solverStrategy) { this.solverStrategy = solverStrategy; }
  step(dt, params) { return this.solverStrategy.step(...); }
}
```

## Implementation Phases

### Phase 1: Strategy Infrastructure ✅ COMPLETED
**Files Modified**: 4 files (~170 lines)
- ✅ `BaseSolver.ts` - Strategy interface (30 lines)
- ✅ `ForwardEulerSolver.ts` - Existing FE logic encapsulated (60 lines) 
- ✅ `webgl-solver.js` - Strategy integration (50 lines)
- ✅ `types.ts` - SolverConfig definitions (30 lines)

### Phase 2: Crank-Nicolson Implementation ✅ COMPLETED 2025-08-25
**Files Created/Modified**: 5 files (~300 lines)
- ✅ `CrankNicolsonSolver.ts` - CN strategy implementation with Jacobi iterations (217 lines)
- ✅ `webgl-solver.js` - Added textureSource1 uniform support (updated)
- ✅ `generic_shaders.js` - Pinned vertex attribute locations (updated)
- ✅ `useWebGLSolver.ts` - Solver strategy integration (updated)
- ✅ `appStore.ts` - Default CN configuration for diffusion (updated)

**Implementation Approach**:
- Jacobi iterative method instead of direct tridiagonal solve
- Standalone fragment shader for CN diffusion with proper texture sampling
- 1D diffusion (x-only) for stability with height=1 textures
- Proper initialization: first iteration uses u^n, final renders to output
- Fixed shader compilation issues: uniform scope, varying names, texture binding

### Phase 3: RK4 Implementation
**Files to Create/Modify**: 2 files (~140 lines)
- `RK4Solver.ts` - Multi-stage explicit strategy (80 lines)
- Additional texture management for intermediate stages (60 lines)

### Phase 4: UI Integration
**Files to Modify**: 2 files (~90 lines)
- `PdeParameterPanel.tsx` - Per-equation solver dropdowns (50 lines)
- `appStore.ts` - Solver configuration state (40 lines)

## Technical Implementation Details

### Crank-Nicolson Approach
```glsl
// CN discretization: (I - 0.5*dt*L)*u^{n+1} = (I + 0.5*dt*L)*u^n
// Requires solving tridiagonal system on GPU
float solve_tridiagonal(float a, float b, float c, float d) {
  // Thomas algorithm implementation
  return solution;
}
```

### RK4 Multi-Stage Pattern
```javascript
// RK4 requires 4 texture reads per time step
const k1 = computeRHS(u_n);
const k2 = computeRHS(u_n + 0.5*dt*k1);  
const k3 = computeRHS(u_n + 0.5*dt*k2);
const k4 = computeRHS(u_n + dt*k3);
u_n_plus_1 = u_n + dt/6*(k1 + 2*k2 + 2*k3 + k4);
```

## Current Status

### Completed Infrastructure ✅
- Strategy pattern architecture established
- ForwardEulerSolver encapsulates existing logic
- WebGLSolver delegates to solver strategies  
- Type definitions extended with SolverConfig
- No breaking changes to existing functionality

### Next Immediate Steps
1. Implement CrankNicolsonSolver.ts strategy class
2. Create CN shader with GPU tridiagonal solver
3. Test CN solver with diffusion equation stability
4. Compare stability improvements vs Forward Euler

## Expected Outcomes
- **Diffusion Equation**: Stable solution at large time steps
- **Telegraph Equation**: Higher accuracy, reduced oscillations
- **User Experience**: Per-equation solver selection for optimal results
- **Performance**: Potential speed improvements with larger stable time steps

## Risk Mitigation
- **GPU Matrix Solve Complexity**: Start with 1D tridiagonal, extend to 2D if needed
- **Texture Management**: CN may require additional textures for matrix storage
- **Backward Compatibility**: ForwardEuler remains default, existing functionality unchanged
