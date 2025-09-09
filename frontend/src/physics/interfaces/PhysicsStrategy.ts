import type { Particle } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { Step } from '../types/CollisionEvent';

// Unified strategy interface for physics simulation
export interface PhysicsStrategy {
  // Phase A: collision/scattering, velocity-only changes
  preUpdate(particle: Particle, allParticles: Particle[], context: PhysicsContext): void;

  // Phase B: integrate positions and enforce boundaries
  integrate(particle: Particle, dt: number, context: PhysicsContext): void;

  // Step calculation for analysis
  calculateStep(particle: Particle): Step;

  // Configuration and validation
  setBoundaries(config: BoundaryConfig): void;
  getBoundaries(): BoundaryConfig;
  validateParameters(params: any): boolean;
  getPhysicsParameters(): Record<string, number>;
  
  // Strategy-specific parameters (required for parameter display)
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number };
}
