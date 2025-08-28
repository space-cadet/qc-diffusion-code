import type { Particle } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';

// Phase-based strategy interface for the new engine.
// Backward compatibility: existing RandomWalkStrategy remains unchanged elsewhere.
export interface PhysicsStrategy {
  // Phase A: collision/scattering, velocity-only changes.
  preUpdate?(particle: Particle, allParticles: Particle[], context: PhysicsContext): void;

  // Phase B: integrate positions and enforce boundaries.
  integrate?(particle: Particle, dt: number, context: PhysicsContext): void;

  // Configuration/validation (mirrors current strategy surface)
  setBoundaries?(config: BoundaryConfig): void;
  getBoundaries?(): BoundaryConfig;
  validateParameters?(params: any): boolean;
  getPhysicsParameters?(): Record<string, number>;
}
