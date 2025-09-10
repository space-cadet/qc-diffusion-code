feat(gpu): Complete GPU boundary conditions with collision infrastructure

## GPU Implementation Enhancements

### GPUParticleManager (+97 lines)
- Integrated GPUCollisionManager for Phase 2 collision detection
- Added collision time tracking and visual red flash feedback
- Enhanced syncToTsParticles with collision state synchronization  
- Added interparticle collision parameter support and metrics
- Implemented collision count accumulation and timing

### New GPUCollisionManager (195 lines)
- Complete GPU collision detection infrastructure with GLSL shaders
- Hashed neighbor sampling approach for O(1) collision performance
- Collision time tracking layer and velocity update system
- Equal-mass elastic collision using normal/tangent projection
- Parameter management for runtime radius updates

### CPU Physics Optimizations
- InterparticleCollisionStrategy2D: Single-pass spatial grid building
- Improved elastic collision physics with proper vector mathematics
- SpatialGrid: Reduced logging frequency to minimize console spam
- Enhanced collision detection accuracy and performance

### Integration & Documentation  
- useParticlesLoader: Added interparticle collision parameter sync
- GEMINI.md: Updated project documentation and build commands
- Complete memory bank documentation of Phase 1.6 completion

## Technical Achievements

**Phase 1.6 Status**: All boundary conditions (periodic, reflective, absorbing) 
complete with dual-shader architecture, velocity updates, dead particle handling, 
and collision detection infrastructure.

**Ready for Phase 2**: GPU collision physics implementation with complete 
infrastructure, optimized spatial algorithms, and validated physics mathematics.

Files modified: GEMINI.md, GPUParticleManager.ts, useParticlesLoader.ts, 
InterparticleCollisionStrategy2D.ts, SpatialGrid.ts

New files: GPUCollisionManager.ts (GPU collision infrastructure)
