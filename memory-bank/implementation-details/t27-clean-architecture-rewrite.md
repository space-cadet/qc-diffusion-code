# T27: Clean Architecture Rewrite — Implementation Details

*Created: 2026-05-09 11:55:00 IST*
*Last Updated: 2026-05-09 14:00:20 IST*
*Branch: cloud-claw/t27-webgl-rewrite (merged into cloud-claw/screenshot-poc)*

## Overview

Complete rewrite of the Random Walk simulation visualization and control path. The original architecture (Canvas 2D + tsParticles + RandomWalkSimulator) had fundamental race conditions that made particle initialization unreliable. The final T27 direction is not a full greenfield physics rewrite; it is a pure WebGL renderer plus an adapter around the original strategy-capable physics engine.

## Architecture

```
┌─────────────────────────────────────────┐
│           RandomWalkSimV2               │
│  (React component, grid layout, state)  │
└─────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
┌────────┐   ┌────────────┐   ┌─────────────────┐
│ Panel  │   │   Canvas   │   │   History/Export │
│  V2    │   │    V2      │   │                  │
└────────┘   └────────────┘   └─────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │  ParticleCanvasV2 │
         │  (orchestration)  │
         └─────────────────┘
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
┌─────────────────────┐  ┌──────────────┐
│ useOriginalPhysics  │  │  useWebGL    │
│     Engine          │  │   Renderer   │
└─────────────────────┘  └──────────────┘
      │                         │
      ▼                         ▼
┌──────────────────────┐ ┌──────────────┐
│ Original PhysicsEngine│ │WebGLRendererV2│
│ + ParameterManager    │ │              │
│ + StrategyFactory     │ │ - shaders    │
│ + particle adapter    │ │ - buffers    │
│ + reset/init bridge   │ │ - draw()     │
└──────────────────────┘ └──────────────┘
```

## Key Design Decisions

### 1. Ditch tsParticles
- Original: tsParticles container creation raced with physics engine initialization
- New: Pure WebGL point rendering, no external particle library
- Benefit: Predictable lifecycle, no race conditions

### 2. Original Engine Adapter Design
- **Preserve mature strategy logic**: Reuse the existing `PhysicsEngine`, `ParameterManager`, and `StrategyFactory`
- **Bridge to V2 renderer**: Convert original particle objects into the simpler WebGL render format
- **Explicit reset/init path**: `Initialize` and `Reset` now reach the live engine instead of only toggling UI status
- **Decoupled from rendering**: Physics engine remains independent of WebGL

### 3. WebGLRendererV2 Design
- **Shader-based**: Vertex + fragment shaders for point rendering
- **Color mapping**: Currently static blue for all particles; velocity → color mapping (blue = slow, red = fast) is planned but not yet implemented
- **Buffer management**: Single buffer for all particles, updated each frame
- **Cleanup**: Proper WebGL resource disposal on unmount

### 4. React Hooks
- `useOriginalPhysicsEngine`: Creates the adapter-backed engine and provides `step/reset/updateParams/getStats`
- `useWebGLRenderer`: Initializes renderer on canvas mount, provides `render/resize`
- Both hooks handle cleanup automatically

### 5. Parameter Panel V2
- **Store-only**: Updates Zustand store, no direct engine calls
- **Decoupled**: No `simulatorRef` prop, no imperative API
- **Reactive**: Canvas component reacts to store changes via `useEffect`
- **Parity restored**: Initial-distribution-specific controls and strategy selector are present again

## File Structure

```
frontend/src/
├── physics/
│   └── PhysicsEngineV2.ts          # Core physics engine
├── webgl/
│   ├── WebGLRendererV2.ts          # WebGL renderer
│   └── shaders/
│       ├── particle.vert             # Vertex shader
│       └── particle.frag             # Fragment shader
├── hooks/
│   ├── usePhysicsEngine.ts           # Earlier V2-only hook kept as fallback
│   ├── useOriginalPhysicsEngine.ts   # Original engine adapter hook
│   └── useWebGLRenderer.ts           # WebGL renderer hook
├── components/
│   ├── ParticleCanvasV2.tsx        # Canvas component
│   ├── RandomWalkParameterPanelV2.tsx # Parameter panel
│   └── DensityComparison.tsx         # Density panel restored to V2 path
└── RandomWalkSimV2.tsx              # Main component
```

## API Reference

### useOriginalPhysicsEngine

```typescript
type UseOriginalPhysicsEngineReturn = {
  step(dt: number): void
  reset(): void
  updateParams(params: Partial<EngineParams>): void
  getParticles(): SimpleParticle[]
  getStats(): { time: number; collisionCount: number; particleCount: number }
}
```

### WebGLRendererV2

```typescript
class WebGLRendererV2 {
  constructor(gl: WebGLRenderingContext, maxParticles: number)
  
  render(particles: Particle[]): void  // Draw particles
  resize(width: number, height: number): void
  destroy(): void                      // Cleanup WebGL resources
}
```

## Migration Notes

### From Legacy Page to V2

| Original | V2 | Notes |
|----------|-----|-------|
| `RandomWalkSim.tsx` | `RandomWalkSimV2.tsx` | New component, same layout |
| `ParticleCanvas.tsx` | `ParticleCanvasV2.tsx` | WebGL instead of Canvas 2D |
| `RandomWalkParameterPanel.tsx` | `RandomWalkParameterPanelV2.tsx` | Decoupled from simulatorRef |
| `RandomWalkSimulator.ts` | `useOriginalPhysicsEngine.ts` + original `PhysicsEngine` | Adapter-backed runtime |
| tsParticles | WebGLRendererV2 | Pure WebGL, no library |

### App.tsx Change

```typescript
// Before
const RandomWalkSim = lazy(() => import("./RandomWalkSim"));

// After
const RandomWalkSim = lazy(() => import("./RandomWalkSimV2"));
```

## Current State

1. **Controls wired**: `Initialize`, `Start`, `Pause`, and `Reset` affect the live engine
2. **Visible motion fixed**: Frame-time stepping and render-space scaling make default motion visible
3. **Density restored**: `DensityComparison` is mounted again on the V2 page
4. **Initial distributions restored**: V2 uses the shared sampler and exposes per-distribution controls

## Known Limitations

1. **Graph mode not implemented**: Only continuum mode works in V2
2. **Physics verification still needed**: Collision statistics, boundary behavior, and long-run random-walk correctness still need broader live validation

The V2 adapter selects one motion strategy at a time. Lévy flight uses exponentially timed events and symmetric Pareto-tailed jump lengths. Fractional diffusion is time-fractional subdiffusion, using fixed-length jumps and Pareto-distributed waiting times. Their controls and run seed are persisted with `gridLayoutParams`. The engine uses the configured fixed timestep with a frame-time accumulator and resets the V2 random source from the saved seed on initialization. Observable registration now uses registered text IDs, inline observable syntax is parsed, and shared simulation time is displayed once at the top of the Observables panel. The Lévy alpha control tolerates older persisted state without `levyAlpha`. Repeated Random Walk render logging was removed.

T27 is the completed clean rewrite task. Strategy diagnostic plots are tracked separately under T41; they are not additional T27 rewrite scope.

## Testing

- TypeScript compilation: `npx tsc --noEmit` ✅
- Playwright screenshot test: `scripts/test-v2.ts` ✅
- Manual verification: Initialize → Start → Pause → Reset ✅

## Next Steps

1. Verify the current branch live in-browser or on deploy
Follow-up work outside completed T27: graph-mode parity if still required, and broader long-run physics verification. Strategy diagnostic plots are tracked under T41.

## References

- Task: `memory-bank/tasks/T27.md`
- Session: `memory-bank/sessions/2026-05-09-morning.md`
- Edit history: `memory-bank/edits/2026-05-09/`
