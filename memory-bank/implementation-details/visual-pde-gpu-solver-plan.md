# VisualPDE GPU Solver Integration Plan

Created: 2025-08-19 23:18:35 IST
Last Updated: 2025-08-20 00:45:09 IST

## Objective

Extract and integrate VisualPDE's WebGL-based PDE solvers into T9's existing React frontend to achieve GPU-accelerated computation while maintaining current UI and visualization components.

## Background

Current T9 architecture uses Python (py-pde) backend with WebSocket communication to React frontend. VisualPDE offers GPU-accelerated fragment shader-based PDE solving that could provide 10-100x performance improvement while eliminating backend infrastructure.

## Fragment Shader PDE Approach

### Core Concept

**Traditional CPU:**

```
for each grid point (i,j):
    compute derivatives from neighbors
    update u[i][j] based on PDE
```

**Fragment Shader GPU:**

```glsl
// Each pixel/thread processes one grid point simultaneously
vec2 pos = gl_FragCoord.xy;  // Current grid point
float u_center = texture2D(u_texture, pos);
float u_left = texture2D(u_texture, pos + vec2(-dx, 0));
// Compute PDE update for this pixel in parallel
```

### Key Components to Extract

1. **Core Solver Engine** (`simulation_shaders.js`)

   - `RDShaderTop()` - WebGL setup and uniforms
   - `RDShaderMain()` - Time integration schemes (Euler, RK4, Adams-Bashforth)
   - `computeRHS()` - Right-hand side evaluation

2. **Texture Management** (`main.js`)

   - Double-buffered texture system
   - WebGL context initialization
   - Animation loop with configurable timesteps

3. **Mathematical Operators** (`auxiliary_GLSL_funs.js`)
   - Laplacian: `(u_left + u_right + u_up + u_down - 4*u_center)/(dx*dx)`
   - Gradient computations
   - Boundary condition enforcement

## Implementation Phases

### Phase 1: Core Component Extraction (✅ COMPLETED)

**Goal**: Extract minimal WebGL solver components from VisualPDE

**Completed Tasks**:

1. ✅ Extract core WebGL solver components
   - `simulation_shaders.js` (294 lines, adapted from VisualPDE)
   - `auxiliary_GLSL_funs.js` (150 lines, adapted from VisualPDE)
   - `generic_shaders.js` (adapted from VisualPDE)
   - `webgl-solver.js` (105 lines, new minimal wrapper)

**Architecture**:

```
React Frontend (Plotly.js) ← WebGL Solver ← Equation Templates
```

### Phase 2: Telegraph Equation Implementation (✅ COMPLETED)

**Goal**: Implement dynamic GLSL generation following VisualPDE's approach

**Completed Tasks**:

1. ✅ Dynamic GLSL shader generation for telegraph/diffusion equations
2. ✅ React integration via useWebGLSolver hook
3. ✅ Solver toggle in UI (WebGL vs Python)
4. ✅ Parameter control integration
5. ✅ Plotly visualization compatibility

**Files modified**:

- `code/frontend/src/webgl/webgl-solver.js` (+80 lines)
- `code/frontend/src/hooks/useWebGLSolver.ts` (50 lines, new)
- `code/frontend/src/Controls.tsx` (+18 lines)
- `code/frontend/src/App.tsx` (+25 lines)
- `code/frontend/src/types.ts` (+1 line)

### Phase 3: WebGL Solver Completion (✅ COMPLETED - Credit: Deepseek AI)

**Goal**: Resolve compilation issues and achieve full functionality

**Completed Tasks**:

1. ✅ **Shader Compilation Fixes**:
   - Fixed TIMESCALES replacement using regex for complete substitution
   - Corrected GLSL function closure syntax in computeRHS functions
   - Resolved WebGL2 compatibility (varying→in/out, texture2D→texture)
   - Added missing uniform declarations (a, k, MINX, MINY)

2. ✅ **WebGL Initialization**:
   - Implemented floating point texture support check (EXT_color_buffer_float)
   - Added fallback to RGBA8 format for cross-platform compatibility
   - Updated texture creation and framebuffer handling for both formats

3. ✅ **Texture/Framebuffer Handling**:
   - Cross-platform texture format support
   - Proper framebuffer initialization and clearing
   - Double-buffering implementation for temporal evolution

4. ✅ **Initial Distribution Support**:
   - Complete support for all distribution types (gaussian, step, delta, sine)
   - Proper texture data conversion for float/non-float formats
   - Initial condition rendering verification

5. ✅ **Control Integration**:
   - Verified backend-agnostic parameter controls
   - WebGL/Python solver selection fully functional
   - All distribution types working with WebGL backend

**Technical Achievements**:
- WebGL2 compatible shader system
- Cross-platform texture support with graceful fallback
- GPU-accelerated PDE computation with 100x potential performance improvement
- Seamless React integration maintaining existing UI components

**Equation Implementation Strategy**:

```javascript
// Dynamic equation generation (not static files)
generateTelegraphShader(parameters) {
  const equationCode = `
    float UFUN = uvwq.g;  // u̇ = v
    float VFUN = v*v*uvwqXX.r - 2.0*a*uvwq.g;  // v̇ = v²∇²u - 2av
  `;
  return RDShaderTop("FE") + equationCode + RDShaderBot();
}
```

### Phase 4: Multi-Equation Selection System (CURRENT)

**Goal**: Implement flexible equation selection allowing users to choose which equations to solve and plot simultaneously

**Motivation**: Research tool needs extensibility beyond telegraph/diffusion to include Wheeler-DeWitt, wave equations, spin networks, etc. Users should select any combination of available equations.

**Required Changes**: ~110-145 lines across 6 files

**Tasks**:

1. ⬜ **Add Equation Selection Controls** (`Controls.tsx`) - ~15-20 lines
   - Checkboxes for each equation type (Telegraph, Diffusion, Wheeler-DeWitt, etc.)
   - Update `SimulationParams` type to include selected equations array
   - Dynamic UI that adapts to available equation types

2. ⬜ **Update Type System** (`types.ts`) - ~10-15 lines
   - Change `AnimationFrame` from fixed telegraph/diffusion to dynamic equations array
   - Add equation selection to `SimulationParams`
   - Add equation metadata type for extensibility

3. ⬜ **Modify WebGL Multi-Solver** (`useWebGLSolver.ts` + `webgl-solver.js`) - ~40-50 lines
   - Create multiple solver instances for selected equations
   - Manage parallel execution of selected equation types
   - Combine results from all active solvers into unified output

4. ⬜ **Update PlotComponent** (`PlotComponent.tsx`) - ~25-30 lines
   - Dynamic trace generation based on selected equations
   - Remove hardcoded telegraph/diffusion traces
   - Automatic legend and color assignment for active equations

5. ⬜ **Update Initial Conditions** (`utils/initialConditions.ts`) - ~10-15 lines
   - Return data structure matching selected equations
   - Ensure backend-agnostic initial condition generation

6. ⬜ **Update App.tsx Integration** - ~10-15 lines
   - Handle dynamic equation results
   - Maintain backend-agnostic behavior

**Architecture Benefits**:
- Easy equation type additions (just implement solver + add to list)
- User-controlled complexity (solve only needed equations)
- Research flexibility (compare any combination of equation types)
- Maintains backward compatibility

### Phase 5: Wheeler-DeWitt Implementation (NEXT)

**Goal**: Implement Wheeler-DeWitt equations as additional equation types in the flexible system

**Tasks**:

1. ⬜ Implement Wheeler-DeWitt equations:
   ```glsl
   // Bianchi I: ∂²Ψ/∂α² - B∂Ψ/∂α - ∇²Ψ = 0
   // Bianchi IX: Add potential -24π²e^(6α)R(α,β±)Ψ
   ```
2. ⬜ Add to equation selection system
3. ⬜ Performance benchmarking vs py-pde
4. ⬜ Error analysis and numerical stability testing
5. ⬜ Advanced boundary condition handling

### Phase 6: Production Optimization (FUTURE)

**Goal**: Deployment-ready optimization and advanced features

**Tasks**:

1. ⬜ Real-time parameter sweep visualization
2. ⬜ Multi-equation systems for Bianchi models  
3. ⬜ Advanced visualization modes (3D surfaces, vector fields)
4. ⬜ Export functionality for research paper figures
5. ⬜ Production deployment optimization
6. ⬜ Equation type plugin system for easy extensibility

## Technical Implementation Details

### WebGL Texture System

**State Representation**:

- 2D textures store PDE solution fields u(x,y,t)
- RGBA channels can store up to 4 field components
- Double-buffering for temporal evolution: ping-pong between textures

**Time Integration**:

```glsl
// Forward Euler
updated = uvwq + dt * RHS / timescales;

// RK4 (multi-pass)
k1 = dt * rhs(u, uv);
k2 = dt * rhs(u + 0.5*k1, uv);
k3 = dt * rhs(u + 0.5*k2, uv);
k4 = dt * rhs(u + k3, uv);
updated = u + (k1 + 2.0*k2 + 2.0*k3 + k4) / 6.0;
```

### Equation Translation Examples

**Telegraph Equation**:

```javascript
// JavaScript equation definition
const telegraphEquation = {
  numSpecies: 2, // [u, ∂u/∂t]
  UFUN: "uvwq.g", // u̇ = v
  VFUN: "v*v*uvwqXX.r - 2.0*a*uvwq.g", // v̇ = v²∇²u - 2av
  parameters: { v: 1.0, a: 0.5 },
};
```

**GLSL Implementation**:

```glsl
void computeRHS(sampler2D textureSource, vec4 uvwq, ..., out vec4 result) {
  float u = uvwq.r;        // u field
  float v_component = uvwq.g;  // ∂u/∂t field

  // Compute Laplacian
  float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);

  // Telegraph equation as first-order system
  float du_dt = v_component;
  float dv_dt = v*v*laplacian - 2.0*a*v_component;

  result = vec4(du_dt, dv_dt, 0.0, 0.0);
}
```

### Data Extraction for Visualization

```javascript
// Extract solution from GPU texture for Plotly
function extractSolutionData(gl, texture, width, height) {
  const pixels = new Float32Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixels);

  // Convert to arrays for Plotly
  const x = [],
    y = [],
    z = [];
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const idx = (i * width + j) * 4;
      x.push(j / width);
      y.push(i / height);
      z.push(pixels[idx]); // u field
    }
  }
  return { x, y, z };
}
```

## Performance Expectations

**Current py-pde Performance**:

- Grid size: 100x100
- Time per step: ~10ms
- Real-time factor: ~0.1x

**Expected WebGL Performance**:

- Grid size: 512x512 (25x more points)
- Time per step: ~0.1ms (100x faster)
- Real-time factor: ~100x

**Estimated Improvements**:

- 100x faster computation
- 25x higher resolution
- Real-time parameter adjustment
- No server infrastructure required

## Technical Challenges

### 1. GLSL Learning Curve

- **Challenge**: Fragment shader programming differs from Python
- **Solution**: Start with VisualPDE templates, modify incrementally

### 2. Debugging Complexity

- **Challenge**: GPU debugging more difficult than Python
- **Solution**: Implement texture visualization tools, step-by-step validation

### 3. Precision Limitations

- **Challenge**: Single-precision float vs Python's flexibility
- **Solution**: Analyze numerical stability, implement adaptive timesteps

### 4. Data Transfer Overhead

- **Challenge**: GPU-to-CPU transfer for visualization
- **Solution**: Minimize transfer frequency, implement efficient extraction

## Integration Architecture

### Current T9 Structure

```
src/
├── components/
│   ├── ParameterControls.tsx
│   ├── PlotlyVisualization.tsx
│   └── SimulationControls.tsx
├── hooks/
│   └── useSimulation.ts (WebSocket to py-pde)
└── types/
    └── simulation.ts
```

### Proposed WebGL Structure

```
src/
├── components/
│   ├── ParameterControls.tsx (unchanged)
│   ├── PlotlyVisualization.tsx (unchanged)
│   ├── SimulationControls.tsx (unchanged)
│   └── WebGLSolver.tsx (new)
├── hooks/
│   ├── useSimulation.ts (modified)
│   └── useWebGLSolver.ts (new)
├── webgl/
│   ├── shaders/
│   │   ├── telegraphEquation.glsl
│   │   ├── diffusionEquation.glsl
│   │   └── wheelerdewitt.glsl
│   ├── TextureManager.ts
│   ├── ShaderCompiler.ts
│   └── SolverEngine.ts
└── types/
    ├── simulation.ts (extended)
    └── webgl.ts (new)
```

## Risk Mitigation

### Fallback Strategy

- Maintain py-pde backend as fallback option
- Implement feature flag for WebGL vs Python solver selection
- Progressive rollout: start with telegraph equation only

### Testing Strategy

- Numerical validation against py-pde results
- Performance benchmarking across different devices
- Browser compatibility testing (WebGL 2.0 support)

### Deployment Considerations

- Pure frontend deployment (no server required)
- Browser WebGL capability detection
- Graceful degradation for unsupported devices

## Success Metrics

### Performance Targets

- [ ] 50x faster computation than py-pde
- [ ] Real-time parameter adjustment (<50ms response)
- [ ] Support for 512x512 grid resolution
- [ ] <100ms total rendering time including visualization

### Feature Completeness

- [ ] All current py-pde equation types supported
- [ ] Parameter control parity maintained
- [ ] Visualization quality preserved
- [ ] Export functionality working

### Code Quality

- [ ] Modular, maintainable WebGL abstraction
- [ ] Comprehensive error handling
- [ ] Unit tests for core solver components
- [ ] Performance monitoring and profiling

## Next Steps

1. **Immediate (Week 1)**:

   - Set up development branch for WebGL integration
   - Extract minimal VisualPDE solver components
   - Create basic WebGL React component

2. **Short-term (Weeks 2-3)**:

   - Implement telegraph equation in GLSL
   - Build texture management system
   - Integrate with existing Plotly visualization

3. **Medium-term (Weeks 4-6)**:

   - Add Wheeler-DeWitt equations
   - Performance optimization and validation
   - Complete feature parity with py-pde

4. **Long-term (Weeks 7-8)**:
   - Advanced visualization features
   - Documentation and testing
   - Production deployment preparation

This integration represents a significant architectural improvement that could transform T9 from a research prototype into a high-performance, production-ready simulation platform suitable for interactive research demonstrations and publication-quality figure generation.
