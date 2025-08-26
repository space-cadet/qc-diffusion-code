QC-Diffusion Physics Engine Architecture (Claude 4)
========================================

┌─────────────────────────────────────────────────────────────────┐
│                        UI Layer (React)                        │
├─────────────────────────────────────────────────────────────────┤
│  PdeParameterPanel.tsx                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────┐ │
│  │ Equation    │ │ Solver      │ │ Boundary Conditions         │ │
│  │ Selection   │ │ Selection   │ │ ┌─────────┐ ┌─────────────┐ │ │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ │Telegraph│ │  Diffusion  │ │ │
│  │ │Telegraph│ │ │ │Forward  │ │ │ │ L│R│T│B │ │  L│R│T│B   │ │ │
│  │ │Diffusion│ │ │ │Euler    │ │ │ │ N│N│N│N │ │  N│N│N│N   │ │ │
│  │ │W-DeWitt │ │ │ │Crank-N  │ │ │ └─────────┘ └─────────────┘ │ │
│  │ └─────────┘ │ │ │Lax-W    │ │ │ N=Neumann, D=Dirichlet      │ │
│  └─────────────┘ │ │RK4      │ │ │ P=Periodic, A=Absorbing     │ │
│                  │ └─────────┘ │ └─────────────────────────────┘ │
│                  └─────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Configuration Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  SimulationParams + SolverConfig + BoundaryConfig              │
│                                                                 │
│  interface BoundaryConfig {                                     │
│    telegraph: { left: BCStrategy, right: BCStrategy, ... }     │
│    diffusion: { left: BCStrategy, right: BCStrategy, ... }     │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Strategy Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐           ┌─────────────────────────────┐   │
│  │ SolverStrategy  │◄─────────►│ BoundaryConditionStrategy  │   │
│  │                 │  delegates │                             │   │
│  ├─────────────────┤           ├─────────────────────────────┤   │
│  │ ForwardEuler    │           │ NeumannBC                   │   │
│  │ CrankNicolson   │           │ DirichletBC                 │   │
│  │ LaxWendroff     │           │ PeriodicBC                  │   │
│  │ RK4Solver       │           │ AbsorbingBC                 │   │
│  └─────────────────┘           └─────────────────────────────┘   │
│           │                                    │                │
│           │ generates                          │ injects        │
│           ▼                                    ▼                │
│  ┌─────────────────┐           ┌─────────────────────────────┐   │
│  │ Shader Code     │           │ BC Shader Code              │   │
│  │ (equations)     │◄─────────►│ (boundary handling)         │   │
│  └─────────────────┘  combines └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WebGL Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  WebGLSolver (orchestrator)                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                Texture Management                       │   │
│  │ ┌─────────┐ ┌─────────┐ ┌───────────┐ ┌───────────────┐ │   │
│  │ │Texture0 │ │Texture1 │ │Framebuf0  │ │ Framebuf1     │ │   │
│  │ │(read)   │ │(write)  │ │           │ │               │ │   │
│  │ └─────────┘ └─────────┘ └───────────┘ └───────────────┘ │   │
│  │              Ping-Pong Buffers                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Texture Wrapping (BC Implementation)         │   │
│  │                                                         │   │
│  │ Current: CLAMP_TO_EDGE (Neumann)                        │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ ┌───┬───┬───┬───┬───┐                               │ │   │
│  │ │ │ = │ A │ B │ C │ = │  CLAMP_TO_EDGE                │ │   │
│  │ │ └───┴───┴───┴───┴───┘  (edge values replicated)     │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  │                                                         │   │
│  │ Planned: Strategy-Based BC                              │   │
│  │ ┌─────────────────────────────────────────────────────┐ │   │
│  │ │ ┌───┬───┬───┬───┬───┐                               │ │   │
│  │ │ │ 0 │ A │ B │ C │ 0 │  Dirichlet                    │ │   │
│  │ │ └───┴───┴───┴───┴───┘                               │ │   │
│  │ │ ┌───┬───┬───┬───┬───┐                               │ │   │
│  │ │ │ C │ A │ B │ C │ A │  Periodic                     │ │   │
│  │ │ └───┴───┴───┴───┴───┘                               │ │   │
│  │ └─────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GPU Shader Execution                        │
├─────────────────────────────────────────────────────────────────┤
│  Fragment Shader Pipeline                                       │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Vertex      │  │ Main         │  │ Boundary Condition      │ │
│  │ Shader      │→ │ Computation  │→ │ Application             │ │
│  │ (geometry)  │  │ (PDE logic)  │  │ (BC strategy code)      │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│                          │                       │              │
│  RDShaderTop()          │         clampSpeciesToEdgeShader()    │
│  + equation code        │         RDShaderDirichletX/Y()        │
│  + RDShaderMain()       │         RDShaderGhostX/Y()            │
│  + RDShaderBot()        │         (from simulation_shaders.js)  │
│                                                                 │
│  Example Telegraph + Diffusion with Mixed BCs:                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ if (equationType == "telegraph") {                       │   │
│  │   // Telegraph equation with absorbing BCs              │   │
│  │   float laplacian = ...                                 │   │
│  │   result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0); │   │
│  │   // Apply absorbing BC                                 │   │
│  │   if (at_boundary) result = vec4(0.0, 0.0, 0.0, 0.0);  │   │
│  │ } else if (equationType == "diffusion") {               │   │
│  │   // Diffusion with Neumann BCs (CLAMP_TO_EDGE)        │   │
│  │   float laplacian = ...                                 │   │
│  │   result = vec4(k*laplacian, 0.0, 0.0, 0.0);           │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

Current Implementation Status:
==============================
✅ SolverStrategy interface with ForwardEuler, CrankNicolson, LaxWendroff
✅ Unified CLAMP_TO_EDGE (Neumann) boundary conditions  
✅ Per-equation solver selection infrastructure
✅ Existing BC shader functions in simulation_shaders.js

Planned BC Implementation:
=========================
⬜ BoundaryConditionStrategy interface
⬜ Concrete BC implementations (Neumann, Dirichlet, Periodic, Absorbing)
⬜ BoundaryConfig type definition and UI controls
⬜ Integration: SolverStrategy ↔ BoundaryConditionStrategy
⬜ Shader code injection for mixed BC scenarios
⬜ Per-equation BC assignment (telegraph ≠ diffusion BCs)

Key Design Decisions:
====================
- Bridge Pattern: Solvers delegate BC handling to BC strategies
- Composition over Inheritance: BC and Solver strategies are separate
- Shader Code Generation: Both solver and BC contribute to final shader
- WebGL Texture Management: BC strategies configure texture wrapping
- Per-Equation Flexibility: Different equations can have different BCs

Simplified QC-Diffusion Physics Engine Architecture
===================================================

Simplified BC System (KIRSS-Compliant)
=====================================

┌─────────────────────────────────────────────────────────────┐
│                    UI Layer                                 │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Equation        │  │ Domain Boundary Conditions      │   │
│  │ Selection       │  │ ┌─────┬─────┬─────┬─────┬─────┐ │   │
│  │ ┌─────────────┐ │  │ │ L=N │ R=N │ T=N │ B=N │Type │ │   │
│  │ │ Telegraph   │ │  │ ├─────┼─────┼─────┼─────┼─────┤ │   │  
│  │ │ Diffusion   │ │  │ │  D  │  P  │  A  │  N  │ ... │ │   │
│  │ └─────────────┘ │  │ └─────┴─────┴────────────────┘ │   │
│  └─────────────────┘  │ N=Neumann, D=Dirichlet, etc.   │   │
│                       └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Configuration (Simple)                         │
│                                                             │
│  interface BoundaryConditions {                             │
│    left: 'neumann' | 'dirichlet' | 'periodic' | 'absorbing'│
│    right: 'neumann' | 'dirichlet' | 'periodic'| 'absorbing'│
│    top: 'neumann' | 'dirichlet' | 'periodic' | 'absorbing' │
│    bottom: 'neumann'|'dirichlet'| 'periodic'| 'absorbing'  │
│    dirichlet_values?: { left: number, right: number, ... } │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│              Solver Layer (Modified)                       │
│                                                             │
│  SolverStrategy.getShaderSource(eqType, boundaryConfig)    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ function getShaderSource(eqType, boundaryConfig) {   │   │
│  │   let shader = baseShader(eqType);                   │   │
│  │   shader += getBoundaryShader(boundaryConfig);       │   │
│  │   return shader;                                     │   │
│  │ }                                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│         WebGL Layer (Simplified)                           │
│                                                             │
│  // Single approach: Shader-based BCs only                 │
│  // Remove texture wrapping configuration                  │
│  // Use existing simulation_shaders.js functions           │
│                                                             │
│  function getBoundaryShader(config) {                      │
│    switch(config.left) {                                   │
│      case 'dirichlet': return RDShaderDirichletX('L');     │
│      case 'neumann': return clampSpeciesToEdgeShader('H'); │
│      // ... etc                                            │
│    }                                                       │
│  }                                                         │
└─────────────────────────────────────────────────────────────┘
