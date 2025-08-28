import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { CircularBuffer } from '../utils/CircularBuffer';

// Adapts legacy RandomWalkStrategy implementations to new PhysicsStrategy interface
export class LegacyRandomWalkStrategy implements PhysicsStrategy {
  private strategy: RandomWalkStrategy;

  constructor(strategy: RandomWalkStrategy) {
    this.strategy = strategy;
  }

  preUpdate(particle: Particle, allParticles: Particle[], context: PhysicsContext): void {
    // Legacy strategies handle collisions in updateParticle
    this.strategy.updateParticle(particle, allParticles);
  }

  integrate(particle: Particle, dt: number, context: PhysicsContext): void {
    // Legacy strategies handle motion in updateParticle
    // No-op here since updateParticle already did everything
  }
}
