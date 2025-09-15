# GPU CTRW Strategy Implementation
*Created: 2025-09-15 13:14:24 IST*
*Last updated: 2025-09-15 14:09:32 IST*

This document describes the GPU-based Continuous Time Random Walk (CTRW) strategy implementation for both 1D and 2D particle simulations.

## Overview

- **Purpose**: GPU-accelerated CTRW physics with exponential waiting times and velocity-jump dynamics
- **Approach**: Per-particle state tracking with in-shader random number generation
- **Models**: Velocity-jump model with ballistic motion between collisions and proper speed preservation
- **Dimensions**: Unified 1D/2D implementation with dimensional constraints

Key files:
- `frontend/src/gpu/shaders/ctrw.glsl` (CTRW physics shader)
- `frontend/src/gpu/GPUParticleManager.ts` (integration and parameter management)

## Physics Model

### Velocity-Jump CTRW
- **Ballistic motion**: Particles maintain constant velocity between collisions
- **Speed preservation**: Current velocity magnitude preserved across direction changes
- **Collision events**: Exponentially distributed waiting times with rate `u_collision_rate`
- **Jump length**: Affects mean free path through collision rate, not velocity magnitude

### Corrected Physics Implementation
- **Speed handling**: Uses current velocity magnitude or falls back to `u_speed` for initialization
- **Separation of concerns**: Jump length affects collision frequency, velocity affects ballistic speed
- **Telegraph equation convergence**: Proper CTRW physics ensures correct diffusion limits

### Collision Timing
- **Exponential distribution**: `nextCollisionTime = currentTime + (-log(r) / collisionRate)`
- **Conservative clamping**: Random values clamped to [1e-7, 1-1e-7] to avoid distribution bias
- **State persistence**: Each particle maintains `nextCollisionTime` and `randomSeed`
- **Event detection**: Collision occurs when `currentTime >= nextCollisionTime`

### Direction Sampling
- **1D mode**: Random ±1 selection preserving current speed magnitude
- **2D mode**: Uniform random angle preserving current speed magnitude

## Data Layout

### CTRW State Texture (4-component)
- `x`: `nextCollisionTime` - when next collision occurs
- `y`: `randomSeed` - evolving seed for PRNG
- `z`: unused (reserved for future expansion)
- `w`: unused (reserved for future expansion)

### Shader Inputs/Outputs
- **Input**: `u_position`, `u_velocity`, `u_ctrw_state`
- **Output**: `vec4(newVelocity.xy, newNextCollisionTime, newRandomSeed)`
- **Integration**: Velocity extracted to velocity layer, state to CTRW state layer

## Shader Implementation

### Improved Random Number Generation
```glsl
// Hash function to avoid spatial correlation artifacts
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float random(vec2 st, float seed) {
    return hash(st + vec2(seed, seed * 1.618));
}
```

### Collision Detection and Response
```glsl
if (collisionOccurs) {
    // Update random seed using golden ratio for good distribution
    newRandomSeed = fract(randomSeed + 0.61803398875);
    
    // Generate new collision time with conservative clamping
    float r1 = random(position, newRandomSeed);
    r1 = clamp(r1, 1e-7, 1.0 - 1e-7);
    newNextCollisionTime = u_current_time + u_dt + (-log(r1) / u_collision_rate);
    
    // Preserve current speed magnitude for ballistic motion
    float currentSpeed = length(velocity);
    float ballistic_speed = (currentSpeed > 0.0) ? currentSpeed : u_speed;
    
    // Generate new direction with proper speed preservation
    if (u_is1D == 1) {
        newVelocity.x = (r2 < 0.5) ? ballistic_speed : -ballistic_speed;
        newVelocity.y = 0.0;
    } else {
        float angle = r2 * 2.0 * 3.14159265359;
        newVelocity.x = ballistic_speed * cos(angle);
        newVelocity.y = ballistic_speed * sin(angle);
    }
}
```

## Pipeline Integration

### Execution Order
1. **CTRW pass**: Update velocities based on collision events
2. **Position update**: Integrate positions using updated velocities
3. **Boundary conditions**: Apply reflective/periodic/absorbing BCs
4. **Collisions**: Optional interparticle collision resolution

### State Management
- **Persistent temp layer**: `ctrwTempLayer` stores combined velocity + state output
- **Data extraction**: Velocity and state components separated and uploaded to respective layers
- **Initialization**: Random collision times and seeds set during particle initialization

## Parameters

### UI Controls
- `collisionRate` (λ): Scattering frequency (events/time)
- `velocity`: Speed magnitude for velocity-jump model
- `dimension`: 1D/2D mode toggle

### Shader Uniforms
- `u_collision_rate`: Scattering rate parameter
- `u_speed`: Velocity magnitude
- `u_is1D`: Dimensional constraint flag
- `u_current_time`: Simulation time for event detection
- `u_dt`: Timestep (currently unused in CTRW logic)

## Integration with GPU Pipeline

### Parameter Flow
1. UI → `RandomWalkParameterPanel` → `RandomWalkSimulator`
2. `updateParameters()` → `GPUParticleManager.updateParameters()`
3. Shader uniforms updated via `ctrwProgram.setUniform()`

### Strategy Composition
- **Enable/disable**: `useCTRW` flag based on strategy selection
- **Composition**: CTRW + ballistic motion + optional collisions
- **Safety**: Guards against zero speed to prevent particle freezing

## Performance Characteristics

### Advantages
- **Parallel**: All particles processed simultaneously on GPU
- **Deterministic**: Reproducible collision sequences (given same initial seeds)
- **Efficient**: Single shader pass per timestep

### Limitations
- **PRNG quality**: Simple hash-based generator (adequate for visualization)
- **Memory bandwidth**: State texture reads/writes per frame
- **Precision**: Single-precision floating point for timing calculations

## 1D/2D Unified Implementation

### Dimensional Constraints
- **1D mode**: `u_is1D = 1`, constrains `vy = 0`, random ±x direction
- **2D mode**: `u_is1D = 0`, full 2D random angle selection
- **Grid compatibility**: Works with existing spatial partitioning for collisions

### Parameter Sharing
- Same `collisionRate`, `speed`, `showCollisions` controls
- Unified UI interface with dimension toggle
- Compatible with boundary condition system

## Future Enhancements

### Planned Improvements
- **Advanced RNG**: Higher-quality in-shader random number generation
- **Jump-length distribution**: Lévy flights and power-law jump distributions
- **Memory optimization**: Compact state representation
- **Temporal correlation**: Wait-time correlations and non-exponential distributions

### Integration Opportunities
- **Telegraph equation**: Demonstrate convergence in appropriate limits
- **Density profiles**: Connect with PDE solver for validation
- **Multi-scale**: Combine with discrete graph random walks

## Physics Corrections Applied (2025-09-15)

### Critical Fixes
1. **Speed preservation**: Now preserves current velocity magnitude instead of incorrectly multiplying `u_speed * u_jump_length`
2. **Velocity-jump model**: Jump length affects collision rate (mean free path), not velocity magnitude
3. **Improved PRNG**: Uses hash function instead of position-based random to eliminate spatial correlation artifacts
4. **Conservative clamping**: Random values bounded to [1e-7, 1-1e-7] to avoid exponential distribution bias
5. **Ballistic motion**: Maintains velocity magnitude between collisions per CTRW theory

### CPU-GPU Consistency
- Matches CPU strategy physics in `CTRWStrategy1D.ts` and `CTRWStrategy2D.ts`
- Proper telegraph equation convergence in diffusion limits
- Eliminates spurious spatial correlations from position-dependent RNG

## Validation and Testing

### Correctness Checks
- **Energy conservation**: Track kinetic energy over time
- **Distribution validation**: Verify exponential wait-time distribution
- **Telegraph convergence**: Compare with analytical telegraph equation solutions
- **Boundary compliance**: Ensure proper BC handling

### Performance Metrics
- **Throughput**: Particles processed per second
- **Memory usage**: State texture and temporary buffer overhead
- **Frame timing**: CTRW pass contribution to total frame time

## API Reference

### GPUParticleManager Methods
- `updateParameters({ strategies, collisionRate, velocity, dimension })`
- `initializeParticles()` - sets initial CTRW state
- `step(dt)` - executes CTRW pass if enabled

### Shader Interface
- **Vertex**: Standard fullscreen quad
- **Fragment**: Per-particle CTRW state update
- **Outputs**: Combined velocity + state for extraction
