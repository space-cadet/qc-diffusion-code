# Phase 4: Coordinate System Injection

Centralizes physics↔canvas coordinate mapping into a dedicated CoordinateSystem class to:
1. Remove duplicated mapping logic from ParticleManager
2. Make boundary handling more authoritative
3. Prepare for boundary phase extraction in Phase 5

Changes:
- Inject CoordinateSystem into ParticleManager
- Remove internal mapToPhysics/mapToCanvas methods
- Wire through RandomWalkSimulator
- Clean up tsParticlesConfig mapping

No behavior changes - pure refactoring for cleaner boundaries.
