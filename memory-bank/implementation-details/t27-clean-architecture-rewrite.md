# T27: Clean Architecture Rewrite — Implementation Details

*Created: 2026-05-09 11:55:00 IST*
*Last Updated: 2026-05-09 11:55:00 IST*
*Branch: cloud-claw/t27-webgl-rewrite (merged into cloud-claw/screenshot-poc)*

## Overview

Complete rewrite of the Random Walk simulation visualization and physics layers. The original architecture (Canvas 2D + tsParticles + RandomWalkSimulator) had fundamental race conditions that made particle initialization unreliable. This rewrite replaces the entire stack with a clean, decoupled architecture.

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
┌──────────────┐        ┌──────────────┐
│ usePhysics   │        │  useWebGL    │
│   Engine     │        │   Renderer   │
└──────────────┘        └──────────────┘
      │                         │
      ▼                         ▼
┌──────────────┐        ┌──────────────┐
│PhysicsEngineV2│       │WebGLRendererV2│
│              │        │              │
│ - particles  │        │ - shaders    │
│ - step()     │        │ - buffers    │
│ - boundaries │        │ - draw()     │
│ - collisions │        │ - resize()   │
└──────────────┘        └──────────────┘
```

## Key Design Decisions

### 1. Ditch tsParticles
- Original: tsParticles container creation raced with physics engine initialization
- New: Pure WebGL point rendering, no external particle library
- Benefit: Predictable lifecycle, no race conditions

### 2. PhysicsEngineV2 Design
- **Single initialization**: Particles created once in constructor
- **In-place updates**: `step(dt)` updates particle positions, no recreation
- **Parameter updates**: `updateParams()` modifies behavior without wiping particles
- **Decoupled from rendering**: Engine knows nothing about WebGL

### 3. WebGLRendererV2 Design
- **Shader-based**: Vertex + fragment shaders for point rendering
- **Color mapping**: Velocity → color (blue = slow, red = fast)
- **Buffer management**: Single buffer for all particles, updated each frame
- **Cleanup**: Proper WebGL resource disposal on unmount

### 4. React Hooks
- `usePhysicsEngine`: Creates engine once, provides `step/reset/updateParams/getStats`
- `useWebGLRenderer`: Initializes renderer on canvas mount, provides `render/resize`
- Both hooks handle cleanup automatically

### 5. Parameter Panel V2
- **Store-only**: Updates Zustand store, no direct engine calls
- **Decoupled**: No `simulatorRef` prop, no imperative API
- **Reactive**: Canvas component reacts to store changes via `useEffect`

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
│   ├── usePhysicsEngine.ts           # Physics engine hook
│   └── useWebGLRenderer.ts           # WebGL renderer hook
├── components/
│   ├── ParticleCanvasV2.tsx        # Canvas component
│   └── RandomWalkParameterPanelV2.tsx # Parameter panel
└── RandomWalkSimV2.tsx              # Main component
```

## API Reference

### PhysicsEngineV2

```typescript
class PhysicsEngineV2 {
  constructor(params: EngineParamsV2)
  
  // Core
  step(dt: number): void              // Advance simulation by dt seconds
  reset(): void                        // Reset to initial state
  
  // Parameters
  updateParams(params: Partial<EngineParamsV2>): void
  
  // State
  particles: Particle[]                // Current particle states
  time: number                         // Simulation time
  collisionCount: number               // Total collisions
  
  // Queries
  getStats(): { time, collisionCount, particleCount }
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

### From Original to V2

| Original | V2 | Notes |
|----------|-----|-------|
| `RandomWalkSim.tsx` | `RandomWalkSimV2.tsx` | New component, same layout |
| `ParticleCanvas.tsx` | `ParticleCanvasV2.tsx` | WebGL instead of Canvas 2D |
| `RandomWalkParameterPanel.tsx` | `RandomWalkParameterPanelV2.tsx` | Decoupled from simulatorRef |
| `RandomWalkSimulator.ts` | `PhysicsEngineV2.ts` | Clean architecture |
| tsParticles | WebGLRendererV2 | Pure WebGL, no library |

### App.tsx Change

```typescript
// Before
const RandomWalkSim = lazy(() => import("./RandomWalkSim"));

// After
const RandomWalkSim = lazy(() => import("./RandomWalkSimV2"));
```

## Known Limitations

1. **Physics verification needed**: Collision algorithms, boundary behavior, random walk statistics not yet validated
2. **Graph mode not implemented**: Only continuum mode works in V2
3. **Strategy system removed**: CTRW, Lévy, fractional strategies not yet ported
4. **Observables not connected**: Density profile, MSD, etc. not yet wired

## Testing

- TypeScript compilation: `npx tsc --noEmit` ✅
- Playwright screenshot test: `scripts/test-v2.ts` ✅
- Manual verification: Initialize → Start → Pause → Reset ✅

## Next Steps

1. Verify physics correctness (collision detection, boundary behavior)
2. Port graph mode from original
3. Re-implement strategy system (CTRW, Lévy, fractional)
4. Wire observables (density, MSD, momentum)
5. Performance optimization (instanced rendering, spatial hashing)

## References

- Task: `memory-bank/tasks/T27.md`
- Session: `memory-bank/sessions/2026-05-09-morning.md`
- Edit history: `memory-bank/edits/2026-05-09/`
