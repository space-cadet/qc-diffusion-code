import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';

export interface RandomWalkStrategy {
  updateParticle(particle: Particle): void;
  calculateStep(particle: Particle): Step;
  validateParameters(params: any): boolean;
  getPhysicsParameters(): Record<string, number>;
}