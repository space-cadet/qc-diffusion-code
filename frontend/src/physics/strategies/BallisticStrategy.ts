import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';

export class BallisticStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig = { type: 'periodic', xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

  updateParticle(particle: Particle, allParticles?: Particle[]): void {
    // Ballistic motion: position updates based on velocity
    const dt = 1; // Assume unit time step for simplicity
    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;
  }

  calculateStep(particle: Particle): Step {
    // No discrete steps in pure ballistic motion, so we return a step that represents no change.
    return {
      dx: 0,
      dy: 0,
      collision: {
        occurred: false,
        newDirection: 0,
        waitTime: Infinity,
        energyChange: 0,
        timestamp: 0,
      },
      timestamp: 0,
      particleId: particle.id,
    };
  }

  validateParameters(params: any): boolean {
    return true; // No parameters to validate
  }

  getPhysicsParameters(): Record<string, number> {
    return {}; // No specific physics parameters
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }
}
