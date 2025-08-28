import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';

export interface RandomWalkStrategy {
  updateParticle(particle: Particle, allParticles?: Particle[]): void;
  calculateStep(particle: Particle): Step;
  validateParameters(params: any): boolean;
  getPhysicsParameters(): Record<string, number>;
  setBoundaries(config: BoundaryConfig): void;
  getBoundaries(): BoundaryConfig;
  getParameters?(): { collisionRate: number; velocity: number; jumpLength: number };
}