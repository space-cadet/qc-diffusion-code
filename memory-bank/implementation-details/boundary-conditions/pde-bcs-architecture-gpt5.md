# Final Boundary Conditions (BC) Architecture (GPT-5)

Date: 2025-08-26
Owner: PDE/Graphics stack
Status: Approved design for implementation

## Architecture at a glance (ASCII)

```
┌──────────────────────────────────────────────────────────────┐
│                          UI Layer                            │
│  PdeParameterPanel.tsx                                       │
│  ┌───────────────────────────┐                               │
│  │ Per-Equation BC Selection │  e.g., Diffusion: Neumann     │
│  └───────────────────────────┘        Telegraph: Periodic    │
└───────────────┬──────────────────────────────────────────────┘
                │ BoundaryConfig (per-equation, Phase 1)
                ▼
┌──────────────────────────────────────────────────────────────┐
│                    SolverStrategy Layer                       │
│  ForwardEuler / CrankNicolson / LaxWendroff / RK4             │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ getShaderSource(equation, bcSpec)                      │  │
│  │  = [BC helpers] + [equation core] + [main]             │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────────────────────┘
                │ requests
                ▼
┌──────────────────────────────────────────────────────────────┐
│                   BoundaryPolicy (shader-only)                │
│  Neumann / Periodic / Dirichlet                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ glslHelpers() → provides:                               │  │
│  │  - bc_sample_center(ij)                                 │  │
│  │  - bc_sample_neighbor(ij, delta)                        │  │
│  │  - bc_is_boundary(ij) (optional diagnostics)            │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────┬──────────────────────────────────────────────┘
                │ composed into shader source
                ▼
┌──────────────────────────────────────────────────────────────┐
│                        WebGLSolver                            │
│  Orchestrates program build + caching; sets uniforms/textures │
│  Note: CLAMP_TO_EDGE may be set as default, but logic relies  │
│        solely on BC helpers (single source of truth)          │
└───────────────┬──────────────────────────────────────────────┘
                │ compiles & runs
                ▼
┌──────────────────────────────────────────────────────────────┐
│                     GPU Shader Execution                      │
│  Fragment Shader uses BC helpers for all neighbor sampling    │
│  ensuring consistent edges for Neumann/Periodic/Dirichlet     │
└──────────────────────────────────────────────────────────────┘
```

## Purpose

Provide a simple, consistent, and extensible way to apply boundary conditions to PDE solvers in our WebGL pipeline, with the ability to assign different BCs per equation. Keep logic in one place, avoid subtle edge inconsistencies, and make debugging straightforward.

## Design Overview (Keep It Really Simple)

- Single mechanism for BCs: done in shaders only (no logic dependency on texture wrapping).
- Solvers always call a small, shared GLSL helper API for sampling near edges.
- Per-equation BC selection is supported now; finer granularity (per-axis, per-edge) can come later.
- Minimal surface in TypeScript: select BC type(s), pass to solver, solver requests BC GLSL helpers and composes the shader.

## Why shader-only BCs?

Using two mechanisms (hardware wrap + shader code) leads to mismatches and hard-to-debug artifacts, especially for periodic boundaries. A single source of truth—GLSL helpers—removes this class of bugs. We may still set CLAMP_TO_EDGE as a harmless default, but we never rely on it for logic.

## Configuration Model (phased)

Phase 1 (now): per-equation BC

- BoundarySpec: { type: 'neumann' | 'periodic' | 'dirichlet', value?: number }
- BoundaryConfig: { telegraph: BoundarySpec, diffusion: BoundarySpec }

Phase 2: per-axis (optional)

- BoundaryAxes: { x: BoundarySpec, y: BoundarySpec }
- Used if we need different handling horizontally vs vertically.

Phase 3: per-edge (optional)

- BoundaryEdges: { left: BoundarySpec, right: BoundarySpec, top: BoundarySpec, bottom: BoundarySpec }
- Add dirichlet_values per edge if needed.

We will ship Phase 1 first and keep the types forward-compatible.

## Responsibilities and Interfaces

TypeScript (simplified):

- BoundaryPolicy (per BC type)
  - glslHelpers(): returns GLSL code for sampling and edge handling
  - uniforms(params): returns uniform declarations/values if needed (e.g., dirichlet value)
- SolverStrategy
  - getShaderSource(equation, boundarySpec): composes final shader as [BC helpers] + [equation core] + [main]
- WebGLSolver
  - Orchestrates program build and caching; sets uniforms and textures; no BC decisions here.

We do not expose sampler wrap modes from BC policies. Texture setup remains standard and simple.

## GLSL Helper API (single sampling path)

All solvers use only these helpers for edge-aware sampling:

- bc_sample_center(ivec2 ij): read the current cell
- bc_sample_neighbor(ivec2 ij, ivec2 delta): read a neighbor, applying BC rules if ij+delta is outside
- bc_is_boundary(ivec2 ij): optional mask for diagnostics/visualization

Notes:

- Helpers work on integer indices; the solver provides ij and deltas (e.g., (+1,0), (-1,0), etc.).
- Periodic: do manual index wrap
- Dirichlet: return fixed value when stepping outside
- Neumann: mimic zero-gradient by mirroring the edge value

## Supported BC Types (Phase 1)

- Neumann (default today): zero-gradient at edges
  - Implementation: neighbor beyond edge returns the edge sample
- Periodic: wrap around domain
  - Implementation: manual integer wrap for indices (no hardware REPEAT)
- Dirichlet: fixed value at edges
  - Implementation: out-of-domain samples return a constant (single scalar for all edges in Phase 1)

Telegraph specifics (u, w packed channels):

- Phase 1: apply the same BC to both channels for simplicity
- If future physics requires different handling, we can extend the helper to accept per-channel behavior

## Shader Composition and Caching

- Composition order: [BC helpers] + [equation core] + [main]
- Program cache key: (equation, solver, bc.type)
- Parameter-only updates (e.g., dirichlet value) go through uniforms—no recompile

## Diagnostics and Testing

- Add a small uniform flag to visualize bc_is_boundary in false-color for quick checks
- Extend existing UI diagnostics with a “Boundary Conditions” readout (type per equation)
- Basic tests to validate:
  - Periodic continuity across edges (no seams)
  - Dirichlet holds the requested value at boundaries
  - Neumann conserves mass appropriately in diffusion

## Migration From Current State

- Today: CLAMP_TO_EDGE gives Neumann-like behavior implicitly
- Move to: explicit GLSL helpers implementing Neumann
- Keep CLAMP_TO_EDGE as default sampler state but never rely on it in logic
- Lax-Wendroff/Crank-Nicolson/Forward-Euler shaders switch to the helper API for all stencils

## Scope Control (Phase 1 Deliverables)

- BoundarySpec/BoundaryConfig (per-equation)
- Three BC policies (neumann, periodic, dirichlet)
- GLSL helper API and integration into all solvers
- UI: per-equation BC dropdown; show Dirichlet value field when selected
- No absorbing in Phase 1

## Future Extensions (later phases)

- Absorbing BC for wave-like equations (telegraph), with a clearly defined discrete scheme
- Per-axis or per-edge configuration
- Per-channel BC for multi-component equations if physics demands it

## Glossary

- Shader helpers / shader injection: Small snippets of shader code added at build time to provide shared functions (e.g., boundary-aware sampling) used by all solvers.
- Periodic seams: Visible discontinuities at domain edges when wrapping is handled inconsistently.
- Manual index wrap: Computing wrapped indices in code (e.g., (i+W)%W) rather than relying on texture sampler modes.
- CLAMP_TO_EDGE: A texture sampler setting that replicates edge texels; convenient but not sufficient for all BCs.
- NPOT/filtering constraints: Practical limits when using non–power-of-two texture sizes and certain filtering modes; avoiding hardware wrap for logic sidesteps these constraints.

---

This document combines the clarity of the original strategy/bridge idea with the simplicity and safety of a shader-only BC implementation. It prioritizes consistency, debuggability, and phased complexity.
