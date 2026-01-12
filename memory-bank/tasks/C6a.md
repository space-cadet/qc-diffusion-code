# C6a: Rewrite ts-particles Component Using Low-Level API
*Updated: 2026-01-12 18:19:28 IST*

**Description**: Replace high-level ts-particles React wrapper with low-level API for direct particle control and eliminate animation interference
**Status**: ✅ COMPLETED
**Priority**: HIGH
**Started**: 2025-08-22 12:00:00 IST
**Completed**: 2025-08-22 12:26:44 IST
**Dependencies**: C5b, C6

## Completion Criteria
- ✅ Remove high-level `<Particles>` React component
- ✅ Implement low-level engine initialization with `tsParticles.load()`
- ✅ Replace config-based particle management with direct particle creation
- ✅ Establish custom render loop with manual particle updates
- ✅ Eliminate ts-particles built-in animation interference

## Related Files
- `frontend/src/components/ParticleCanvas.tsx`
- `frontend/src/config/tsParticlesConfig.ts`
- `frontend/src/RandomWalkSim.tsx`
- `frontend/src/hooks/useParticlesEngine.ts` (removed)

## Progress
1. ✅ Removed high-level API imports and components
2. ✅ Implemented low-level engine initialization functions
3. ✅ Created manual container creation with canvas element
4. ✅ Established direct particle control without config system
5. ✅ Fixed iterator type errors in particle array access
6. ✅ Implemented custom animation loop with requestAnimationFrame

## Implementation Details
**High-level API removal:**
- Removed `initParticlesEngine`, `Particles` component imports
- Deleted `useParticlesEngine.ts` hook
- Removed `ISourceOptions` config system

**Low-level API implementation:**
- `initializeEngine()` - Direct engine setup with slim bundle
- `createParticleContainer()` - Manual container creation with canvas
- `updateParticlesWithCTRW()` - Direct particle updates with proper array access
- Custom render loop in `ParticleCanvasComponent`

**Key fixes:**
- Fixed iterator error by accessing `container.particles.array` properly
- Eliminated double animation loops (ts-particles + physics)
- Direct particle position control from physics simulation

## Next Steps
- Connect physics engine timing to single animation loop
- Remove duplicate animation loops between components
- Optimize render performance with direct particle updates

## Context
Eliminated ts-particles animation interference that was conflicting with physics simulation. System now has complete control over particle lifecycle and rendering without built-in animation conflicts.

### Current Session Progress — 2026-01-12 18:19:28 IST

**Architecture Review Integration**: C6a ParticleCanvas component included in comprehensive RandomWalkSim architecture review.

**Files Modified in Current Session**:
- `frontend/src/components/ParticleCanvas.tsx` - Canvas rendering fixes and improvements

**Key Improvements**:
- Enhanced ParticleCanvas stability and error handling
- Fixed canvas integration issues identified in architecture review
- Better integration with RandomWalkSim refactoring
- Improved tsParticles low-level API usage

**Status**: C6a ParticleCanvas component stable and integrated with architecture review fixes.
