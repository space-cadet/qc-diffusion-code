# GPU Collisions Strategy Implementation
*Created: 2025-09-11, 12:58:51 IST*
*Last updated: 2025-09-15 14:09:32 IST*

## Task T16c Integration

**Current Status**: GPU collision system partially implemented with spatial partitioning and bilateral momentum conservation. Requires comprehensive testing and validation.

**Key Components**:
- ✅ Spatial grid neighbor building (CPU-side optimization)
- ✅ GPU collision detection shader with alpha threshold scaling  
- ✅ Bilateral collision resolution with momentum conservation
- ✅ 1D/2D unified implementation with dimensional constraints
- ✅ Integration with tsParticles flash visualization

**Testing Requirements**:
- Energy/momentum conservation validation across particle densities
- Performance benchmarking: CPU vs GPU crossover points
- Collision accuracy verification against CPU baseline
- Integration testing with CTRW strategy composition

This document describes the GPU-based interparticle collisions strategy used by the Random Walk component, supporting both 1D and 2D modes with unified implementation.

## Overview

- Purpose: Physically plausible, performant particle–particle collisions in 2D using WebGL2 (gpu-io).
- Approach: Hybrid CPU–GPU pipeline.
  - CPU builds a uniform spatial grid neighbor index in O(n) each frame.
  - GPU performs deterministic, per-particle collision checks against compact neighbor lists and updates velocities.
- Determinism and correctness over probabilistic sampling.

Key files:
- `frontend/src/gpu/GPUCollisionManager.ts`
- `frontend/src/gpu/GPUParticleManager.ts`
- `frontend/src/gpu/shaders/collision_detection.glsl` (collision detection shader)
- `frontend/src/gpu/shaders/collision_pairs.glsl` (bilateral update shader)
- `frontend/src/gpu/shaders/spatialGrid.glsl` (spatial grid shader)

## Data Layout

- Positions texture: `vec2` (x, y)
- Velocities texture: `vec2` (vx, vy)
- Neighbor buffers (CPU-built, uploaded each frame):
  - `cellOffsets`: prefix sums (length = gridCells + 1)
  - `particleIndices`: compacted particle IDs (length = n)

Grid configuration:
- Bounds: `[u_bounds_min, u_bounds_max]` set from the simulation boundary.
- Cell size: `u_cell_size` (defaults to ~50 world units; sized so each cell spans ≈ particle diameter).
- Grid dims: `u_gridSize = (width, height)` derived from bounds and cell size.

## Frame Pipeline

1) CPU neighbor pass (O(n))
- Compute cell coordinates for each particle, clamp to grid.
- Count → prefix-sum → scatter to produce:
  - `cellOffsets[c]` .. `cellOffsets[c+1] - 1` is the index range in `particleIndices` for cell `c`.
- Upload to 1-channel float textures.

2) GPU collision pass (per particle)
- For particle i at `pos` with `vel`:
  - Determine own cell, iterate 3×3 neighbor cells.
  - For each neighbor cell: read `[start, end)` from `u_cell_offsets`, enumerate candidates from `u_particle_indices`.
  - Compute pairwise contact test and resolve elastic collision for equal masses.
  - One-collision-per-frame per fragment to keep work bounded.

3) GPU apply pass
- Writes updated velocity and collision timestamp. Positions are integrated elsewhere (position shader).

## Physics Model

- Relative motion and contact:
  - With `dp = pos - otherPos`, `n = normalize(dp)`
  - Approaching if `dot(vel - otherVel, n) < 0`.
- Contact threshold (alpha-scaled):
  - `d_thresh = 2 * radius * alpha`
  - `alpha = 1.0` → collide exactly at touching (2R)
  - `alpha < 1.0` → allow overlap before colliding (down to 0: only at coincident)
  - `alpha > 1.0` → collide earlier than touch
- Impulse (equal mass, 2D):
  - `impulse = dot(v_rel, n) * n`
  - `v' = v - impulse` (the complementary update is applied when the partner is processed in its own fragment; pairwise double-processing is bounded by the one-collision-per-frame rule).
- Positional correction (light overlap bleed):
  - If overlap is detected, we store an overlap value for diagnostics; separation is primarily handled via the next integration step with corrected velocities.

## Parameters

- `radius: number` (world units)
- `alpha: number` in `[0, 10]` (UI slider, continuous)
  - Uniform: `u_alpha` used to scale `d_thresh`.
- `showCollisions: boolean`
  - Enables/disables red flash visualization in the tsParticles overlay.
  - Throttled to bound render workload when many collisions occur simultaneously.
- Bounds and BCs are handled in the position/velocity shaders; collision pass respects domain via grid clamping.

## Uniforms and Inputs (Collision Shader)

- `u_position`: positions texture
- `u_velocity`: velocities texture
- `u_cell_offsets`: neighbor list prefix sums
- `u_particle_indices`: compact particle indices
- `u_texSize`: state texture dims
- `u_offsetsTexSize`, `u_indicesTexSize`: neighbor buffers dims
- `u_gridSize`: grid width/height
- `u_particle_count`: particle count
- `u_radius`: particle radius
- `u_alpha`: collision threshold scaling
- `u_current_time`: simulation time
- `u_bounds_min`, `u_bounds_max`: world bounds
- `u_cell_size`: grid cell size

## Visualization (tsParticles overlay)

- Red flash when a particle collided recently.
- Flash window: ~0.5–0.6s (configurable in `tsParticlesConfig.ts`).
- Throttling: cap flashes per frame (`max(50, 5% of synced particles)`) to avoid overloading the renderer.
- Toggle: `showCollisions` from the Parameters panel.

## Performance Notes

- CPU neighbor build is linear in n and fast for typical sizes (≤ O(50K)).
- Deterministic neighbor traversal avoids missed collisions at moderate densities.
- One-collision-per-frame per fragment bounds total work; suitable for interactive frame rates.

## Known Limitations / Future Work

- Pairwise symmetry: fragments apply own-side impulses; with one-collision-per-frame this is stable but not perfectly coupled. A dedicated pair-resolution pass could enforce exact symmetry.
- Strong overlaps: a small Baumgarte-style position correction pass could be added if deep overlaps appear.
- Cell size adaptivity: currently fixed; auto-tuning based on radius/density could improve performance.
- Pure GPU neighbor build: replace CPU pass with counting-sort on GPU if CPU becomes a bottleneck.

## UI Integration

- `RandomWalkParameterPanel.tsx`
  - `alpha` slider (continuous, 0..10)
  - `Show Collisions` toggle
- Propagated via `RandomWalkSimulator.updateParameters` → `GPUParticleManager.updateParameters` → `GPUCollisionManager.updateParameters`.

## 1D Strategy Implementation

**Status**: ✅ COMPLETED (2025-09-15)

The 1D collision strategy is fully implemented using the same GPU pipeline with dimensional constraints:

### Key Features
- **Neighbor traversal**: Only sweeps along x-axis (`dy=0` constraint in shader loop)
- **Physics model**: Identical distance/impulse calculations, naturally handles 1D case
- **Parameter sharing**: Uses same `alpha`, `radius`, `showCollisions` controls

### Shader Implementation (`collision_detection.glsl`)
```glsl
for (int dy = -1; dy <= 1; dy++) {
  if (u_is1D == 1 && dy != 0) continue; // 1D: only sweep along x
  // ... neighbor processing
}
```

### Integration
- `u_is1D` uniform set by `GPUCollisionManager` based on dimension parameter
- UI dimension toggle (1D/2D) automatically enables appropriate collision mode
- Grid structure adapts: 1D uses grid.height=1, processes x-axis bins only

## API and Integration Reference

- `frontend/src/gpu/GPUCollisionManager.ts`
  - `initialize(composer, texWidth, texHeight, particleCount, radius)`
  - `updateParameters({ radius?, bounds?, alpha? })`
    - Updates `u_radius`, `u_bounds_min/max`, `u_alpha` and resizes neighbor buffers if bounds change.
  - `applyCollisions(composer, positionLayer, velocityLayer, dt, texWidth, texHeight, particleCount, simulationTime)`
    - Builds CPU neighbor buffers and runs the collision and apply passes.
  - Internals: `updateGridSize(boundsMin, boundsMax)`, `buildAndUploadNeighborBuffers(positionLayer)`

- `frontend/src/gpu/GPUParticleManager.ts`
  - `updateParameters({ boundaryCondition?, bounds?, interparticleCollisions?, showCollisions?, radius?, alpha? })`
  - `syncToTsParticles(container)`
    - Applies throttled red flash visualization when `showCollisions` is true.

- Shader uniforms (inline collision shader in `GPUCollisionManager.ts`)
  - `u_position, u_velocity, u_cell_offsets, u_particle_indices`
  - `u_texSize, u_offsetsTexSize, u_indicesTexSize, u_gridSize`
  - `u_particle_count, u_radius, u_alpha, u_current_time, u_bounds_min, u_bounds_max, u_cell_size`

## Suggested Architecture Diagram (overview)

1. CPU: positions → grid binning → `cellOffsets` + `particleIndices`
2. GPU: collision pass (reads neighbor buffers) → new velocities + timestamps
3. GPU: apply pass → velocity texture
4. GPU: position/velocity update passes handle integration and BCs

Note: Consider adding a PNG diagram later under `memory-bank/` if desired.

## Benchmarking Plan: CPU vs GPU Performance

Goals:
- Measure throughput (particles/sec), frame time, and collision accuracy vs density.
- Compare CPU-only collisions (baseline) against GPU collisions.

Scenarios:
- Particle counts: 1k, 5k, 10k, 25k, 50k.
- Densities: sparse (large bounds), medium, dense (bounds near minimal), periodic vs reflective.
- Radii: small/medium/large; `alpha` values: 0.75, 1.0, 1.25.

Metrics:
- Average and p95 frame time (ms) over 10s windows.
- Collisions per second; missed/duplicate collisions (via small-n cross-check).
- GPU timing: `performance.now()` around composer steps; CPU timing for neighbor build.

Methodology:
1. Add a headless benchmark harness that steps the simulation without rendering (disable tsParticles overlay, `showCollisions=false`).
2. Warm-up for 2s, measure for 10s; repeat 3 runs per scenario.
3. For small n (≤512), run both CPU baseline and GPU, compare per-step energies/momentum and collision counts.
4. Record results to JSON under `memory-bank/benchmarks/` with scenario metadata.

Implementation Tasks:
- Expose a benchmark mode flag in `RandomWalkSim.tsx` or a separate script to initialize simulation without UI.
- Add timers around:
  - CPU neighbor build (`buildAndUploadNeighborBuffers`)
  - GPU `collision` and `collisionPairs` passes
  - Total step time
- Add CSV/JSON exporter and a simple summary printer.

Reporting:
- Produce a markdown summary with tables/plots (particles vs frame time, collisions/sec) under `memory-bank/benchmarks/`.
- Highlight crossover points where GPU overtakes CPU.

## Planned: CTRW (1D/2D) on GPU — 2025-09-11 23:21:54 IST

- Per-particle CTRW state textures:
  - `nextCollisionTime`, `lastCollisionTime`, `waitTime` (packed in a RGBA layer or separate 1–2 layers).
  - Optional seed texture for reproducibility; otherwise use a uniform seed + time hash.
- RNG in-shader: small GLSL hash PRNG (e.g., iq hash) included in a dedicated `frontend/src/gpu/shaders/rng.glsl`.
- New pass: `ctrw.glsl` executed each step before position/velocity updates:
  - Sample exponential waiting time with rate `collisionRate`.
  - When event occurs, refresh direction (2D) or sign (1D), set `lastCollisionTime`, schedule `nextCollisionTime`.
- 1D handling on GPU:
  - Constrain `vy=0`, keep `y` fixed; reduce direction sampling to ±x.
- Parameter plumbing via `GPUParticleManager.updateParameters`:
  - `collisionRate`, `jumpLength`, `velocity`, `dimension`.
- Ordering with existing passes:
  - `CTRW → velocityUpdate → positionUpdate → collisions` (collisions optional by flag).

## Planned: Strategy Composition on GPU — 2025-09-11 23:21:54 IST

- Composition implemented as fixed pass orchestration inside GPU pipeline (no shader awareness of TS strategies):
  - Base ballistic (existing position/velocity shaders)
  - Optional CTRW pass (pre-integration)
  - Optional collisions pass (existing GPUCollisionManager)
- Mapping from CPU StrategyFactory selections to GPU pass-enable flags:
  - `'ctrw'` → enable CTRW pass; `'collisions'` → enable collisions pass.
  - 1D/2D dimension flag controls kernels and constraints.
- No changes to `StrategyFactory.ts`/`CompositeStrategy.ts` needed for GPU mode; `useGPU` path bypasses CPU strategies.
- Public API remains the same; only `GPUParticleManager` gains internal pass toggles and parameter setters.

