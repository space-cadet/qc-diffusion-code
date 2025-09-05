feat(gpu): implement GPU.IO Phase 1 infrastructure for particle physics

- Add GPUParticleManager with GPU.IO composer, position/velocity layers
- Integrate GLSL position update shader for particle movement  
- Add GPU/CPU toggle in animation loop with runtime switching
- Implement GPU-tsParticles synchronization for rendering
- Add useGPU state with persistence in Zustand store
- Add purple GPU/CPU toggle button in RandomWalkSim header
- Add console logging for GPU operations debugging

Core infrastructure complete for GPU.IO particle physics migration.
Ready for Phase 2: GPU collision detection implementation.

Files: GPUParticleManager.ts, useParticlesLoader.ts, appStore.ts, RandomWalkSim.tsx
