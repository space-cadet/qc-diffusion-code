# Boundary Condition Architecture Comparison (DeepSeek)

## Recommended Architecture

```
┌───────────────────────────────────────────────┐
│                   UI Layer                    │
│  PdeParameterPanel.tsx                        │
│  ┌─────────────────────────────────────────┐  │
│  │ Per-Equation BC Selection               │  │
│  │ (Dropdown per equation)                 │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              SolverStrategy Layer             │
│  ForwardEuler/CrankNicolson/LaxWendroff/RK4   │
│  ┌─────────────────────────────────────────┐  │
│  │ getShaderSource(equation, bcConfig)     │  │
│  │  = [BC helpers] + [equation] + [main]   │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│             BoundaryPolicy (GLSL)             │
│  Neumann/Periodic/Dirichlet helpers           │
│  ┌─────────────────────────────────────────┐  │
│  │ bc_sample_center(ij)                    │  │
│  │ bc_sample_neighbor(ij, delta)           │  │
│  │ bc_is_boundary(ij)                      │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                WebGL Execution                │
│  Single BC truth source in shaders            │
│  CLAMP_TO_EDGE as harmless default            │
└───────────────────────────────────────────────┘
```

## Key Advantages

1. **Simplicity**: Shader-only BC handling eliminates texture-wrap dependencies
2. **Consistency**: Single sampling API ensures uniform edge behavior
3. **Debuggability**: Clear BC isolation in shader code
4. **Extensibility**: Phased approach allows gradual complexity
5. **Performance**: Minimal runtime overhead from helper functions

## Implementation Phases

1. Core BC helpers (Neumann/Periodic/Dirichlet)
2. Per-equation BC selection
3. Diagnostics and validation tools
4. Optional per-edge controls (future)

## Strategy Pattern Alternative

```
┌───────────────────────────────────────────────┐
│                   UI Layer                    │
│  PdeParameterPanel.tsx                        │
│  ┌─────────────────────────────────────────┐  │
│  │ Per-Equation BC Selection               │  │
│  │ (Strategy Factory)                      │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Strategy Factory                 │
│  ┌─────────────────────────────────────────┐  │
│  │ createStrategy(type): BoundaryStrategy  │  │
│  └─────────────────────────────────────────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│              Concrete Strategies              │
│  ┌───────┐ ┌─────────┐ ┌─────────┐ ┌───────┐  │
│  │Neumann│ │Dirichlet│ │Periodic │ │Custom │  │
│  └───────┘ └─────────┘ └─────────┘ └───────┘  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│                Solver Layer                   │
│  Uses active strategy for:                    │
│  - Shader generation                          │
│  - Texture configuration                      │
│  - Uniform management                         │
└───────────────────────────────────────────────┘
```

### When To Use This Approach:
1. Need runtime BC switching
2. Complex BC-specific logic in TypeScript
3. Different texture wrap modes per BC
4. Advanced debugging requirements

### Key Tradeoffs:
- (+) More flexible at runtime
- (+) Cleaner separation of concerns
- (-) More complex architecture
- (-) Potential shader recompiles on BC change

File created with recommended architecture summary and ASCII visualization.
