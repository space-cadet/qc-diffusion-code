# Implementation Details Index

Purpose: Fast AI/human lookup of implementation docs via compact, parseable entries and a global tag/task index.

## Metadata
```json
{ "generated_at": "2025-08-28 16:44:57 IST", "version": "1" }
```

## Inverse Indexes (inline source of truth)
```json
{
  "tag_index": {
    "random-walk": ["1d-random-walk-sim-plan","interparticle-collision-plan","random-walk-class-redesign","random-walk-engine-plan","random-walk-ui-interface","random-walks-diff-eq","quantum-walk-implementation"],
    "collisions": ["interparticle-collision-plan"],
    "gpu": ["gpu-amr-integration","visual-pde-gpu-solver-plan"],
    "amr": ["gpu-amr-integration"],
    "pde": ["pde-bcs-equations-stability","gpu-amr-integration","pde-bcs-final-plan","pde-bcs-implementation","pde-solver-choice-plan","visual-pde-gpu-solver-plan","random-walks-diff-eq","pde-bcs-architecture-claude4","pde-bcs-architecture-deepseek","pde-bcs-architecture-gpt5","pde-bcs-3way-comparison-claude4","pde-bcs-3way-comparison-deepseek","pde-bcs-3way-comparison-gpt5"],
    "boundary-conditions": ["pde-bcs-equations-stability","pde-bcs-final-plan","pde-bcs-implementation","pde-bcs-architecture-claude4","pde-bcs-architecture-deepseek","pde-bcs-architecture-gpt5","pde-bcs-3way-comparison-claude4","pde-bcs-3way-comparison-deepseek","pde-bcs-3way-comparison-gpt5"],
    "ui": ["observer-design-plan","random-walk-ui-interface"],
    "observables": ["observer-design-plan"],
    "architecture": ["observer-design-plan","pde-bcs-final-plan","random-walk-class-redesign","pde-bcs-architecture-claude4","pde-bcs-architecture-deepseek","pde-bcs-architecture-gpt5"],
    "deployment": ["vercel-deployment-plan"],
    "quantum": ["quantum-walk-implementation"]
  },
  "task_index": {
    "C12": ["interparticle-collision-plan"],
    "C14": ["interparticle-collision-plan"],
    "C24": ["quantum-walk-implementation"]
  }
}
```

## Entries (JSONL)
One JSON object per line. Fields: id, title, path, summary, tags, tasks?, updated, related?. Keep summary ≤220 chars.

```jsonl
{ "id":"1d-random-walk-sim-plan", "title":"1D Random Walk Simulation Implementation Plan", "path":"memory-bank/implementation-details/1d-random-walk-sim-plan.md", "summary":"Adds a dedicated 1D CTRW strategy, 1D visualization, and UI toggles for dimension and interparticle collisions; strategy selection wired in RandomWalkSimulator.", "tags":["random-walk","strategy","ui"], "updated":"2025-08-27 15:03:12 IST" }
{ "id":"quantum-walk-implementation", "title":"Quantum Walk Explorer Implementation", "path":"memory-bank/implementation-details/quantum-walk-implementation.md", "summary":"Comprehensive React implementation of quantum random walk with parameter panel, classical comparison, decoherence logic, and unified styling matching existing application components.", "tags":["quantum","random-walk","ui","implementation"], "tasks":["C24"], "updated":"2026-01-11 14:50:46 IST" }
{ "id":"gpu-amr-integration", "title":"GPU AMR Integration Analysis", "path":"memory-bank/implementation-details/gpu-amr-integration.md", "summary":"Surveys tessellation, screen-space LOD, and displacement mapping to bring adaptive mesh refinement into GPU PDE workflows; proposes phased tessellation-based AMR.", "tags":["gpu","amr","pde","performance"], "updated":"2025-08-20 14:33:33 IST" }
{ "id":"interparticle-collision-plan", "title":"Inter-Particle Collision Implementation Plan", "path":"memory-bank/implementation-details/interparticle-collision-plan.md", "summary":"Composite framework: ballistic base + elastic interparticle collisions; Phase 1.1 bug fixes separating scattering vs collisions and correcting 1D pair handling.", "tags":["random-walk","collisions","strategy"], "tasks":["C12","C14"], "updated":"2025-08-28 13:36:51 IST" }
{ "id":"observer-design-plan", "title":"Observer Design and Implementation Plan", "path":"memory-bank/implementation-details/observer-design-plan.md", "summary":"Observer pattern for numerical observables with zero-cost when inactive, snapshot consistency, lazy evaluation, and ObservableManager orchestration.", "tags":["observables","ui","architecture"], "updated":"2025-08-24 22:21:48 IST" }
{ "id":"pde-bcs-equations-stability", "title":"PDE Solvers — Boundary Conditions, Equation Types, and Stability", "path":"memory-bank/implementation-details/pde-bcs-equations-stability.md", "summary":"Unifies Neumann BCs via CLAMP_TO_EDGE across solvers; adds dt guards and diagnostics; frames future Dirichlet/Periodic/Absorbing extensions.", "tags":["pde","boundary-conditions","stability"], "updated":"2025-08-25 00:00:00 IST" }
{ "id":"pde-bcs-final-plan", "title":"Final Boundary Conditions Implementation Plan", "path":"memory-bank/implementation-details/pde-bcs-final-plan.md", "summary":"Chooses corrected shader-only domain-level BC architecture (KIRSS); details config, UI hooks, and shader integration for Neumann/Dirichlet/Periodic/Absorbing.", "tags":["pde","boundary-conditions","architecture","solvers"], "updated":"2025-08-26 20:40:41 IST" }
{ "id":"pde-bcs-implementation", "title":"Boundary Conditions Implementation", "path":"memory-bank/implementation-details/pde-bcs-implementation.md", "summary":"Implements solver-agnostic Dirichlet enforcement via post-pass shader; records WebGL integration details and legend/UI updates.", "tags":["pde","boundary-conditions","solvers"], "updated":"2025-08-27 14:08:14 IST" }
{ "id":"pde-solver-choice-plan", "title":"PDE Solver Choice Implementation Plan", "path":"memory-bank/implementation-details/pde-solver-choice-plan.md", "summary":"Compares FE, CN, RK4, Backward Euler; recommends CN for diffusion, RK4 for telegraph; outlines Strategy interface and WebGL integration phases.", "tags":["pde","solvers","stability","architecture"], "updated":"2025-08-25 12:54:55 IST" }
{ "id":"random-walk-class-redesign", "title":"Random Walk Class Redesign Implementation Plan", "path":"memory-bank/implementation-details/random-walk-class-redesign.md", "summary":"Refactors to preserve state, enforce separation of concerns, type-safety, and performance; introduces abstract base and clean strategy implementations.", "tags":["random-walk","architecture"], "updated":"2025-08-22 08:54:17 IST" }
{ "id":"random-walk-engine-plan", "title":"Random Walk Engine Implementation Plan", "path":"memory-bank/implementation-details/random-walk-engine-plan.md", "summary":"Replaces tsParticles motion with CTRW physics; phases include core collisions, strategy system, density comparison, and telegraph linkage.", "tags":["random-walk","strategy"], "updated":"2025-08-23 17:05:57 IST" }
{ "id":"random-walk-ui-interface", "title":"Random Walk UI Interface Design", "path":"memory-bank/implementation-details/random-walk-ui-interface.md", "summary":"Defines Random Walk page layout, parameter controls, run/pause/reset, status metrics, and density comparison UI; integrates with physics and history/export flows.", "tags":["random-walk","ui"], "updated":"2025-08-27 23:15:00 IST" }
{ "id":"random-walks-diff-eq", "title":"Random Walk Derivation of Telegraph Equation", "path":"memory-bank/implementation-details/random-walks-diff-eq.md", "summary":"Shows how telegraph equation emerges from CTRW; details physics engine, tsParticles integration, and component wiring via diagrams for implementation guidance.", "tags":["random-walk","pde","architecture"], "updated":"2025-08-20 23:50:59 IST" }
{ "id":"vercel-deployment-plan", "title":"Vercel Deployment Plan for QC-Diffusion Code Subproject", "path":"memory-bank/implementation-details/vercel-deployment-plan.md", "summary":"Monorepo deployment to Vercel with pnpm filters, frontend build settings, rewrites, cache headers; documents vercel.json and CI-friendly commands.", "tags":["deployment"], "updated":"2025-08-23 18:52:31 IST" }
{ "id":"visual-pde-gpu-solver-plan", "title":"VisualPDE GPU Solver Integration Plan", "path":"memory-bank/implementation-details/visual-pde-gpu-solver-plan.md", "summary":"Extracts VisualPDE WebGL solver components, texture management, and GLSL operators to integrate GPU PDE solving into React app for major speedups.", "tags":["gpu","pde","solvers"], "updated":"2025-08-25 12:54:55 IST" }
{ "id":"pde-bcs-architecture-claude4", "title":"QC-Diffusion Physics Engine Architecture (Claude 4)", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-architecture-claude4.md", "summary":"Complex multi-pattern BC architecture (Strategy+Bridge+Factory) with per-equation/edge BCs; flexible but high complexity and consistency risk.", "tags":["pde","boundary-conditions","architecture"] }
{ "id":"pde-bcs-architecture-deepseek", "title":"Boundary Condition Architecture Comparison (DeepSeek)", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-architecture-deepseek.md", "summary":"Recommends shader-only BC helpers with simple adapter; emphasizes simplicity, consistency, phased extensibility, and performance.", "tags":["pde","boundary-conditions","architecture"] }
{ "id":"pde-bcs-architecture-gpt5", "title":"Final Boundary Conditions (BC) Architecture (GPT-5)", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-architecture-gpt5.md", "summary":"Approved design: per-equation BC selection with shader-only BoundaryPolicy helpers; WebGLSolver composes helpers with equation shader.", "tags":["pde","boundary-conditions","architecture"] }
{ "id":"pde-bcs-3way-comparison-claude4", "title":"Boundary Condition Architecture 3-Way Comparison (Claude4)", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-3way-comparison-claude4.md", "summary":"Matrix comparing Claude4/GPT5/DeepSeek BC approaches across features, complexity, and recommendations; suggests staged adoption.", "tags":["pde","boundary-conditions","architecture"] }
{ "id":"pde-bcs-3way-comparison-deepseek", "title":"Boundary Condition Architecture 3-Way Comparison", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-3way-comparison-deepseek.md", "summary":"Feature comparison highlighting DeepSeek’s simplicity and performance focus; recommends DeepSeek shader-only path for best balance.", "tags":["pde","boundary-conditions","architecture"] }
{ "id":"pde-bcs-3way-comparison-gpt5", "title":"Boundary Condition Architecture 3-Way Comparison", "path":"memory-bank/implementation-details/boundary-conditions/pde-bcs-3way-comparison-gpt5.md", "summary":"Side-by-side of BC implementations; GPT5 emphasizes shader-only single source of truth and enhanced diagnostics; phased roadmap provided.", "tags":["pde","boundary-conditions","architecture"] }
```
