import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { Step } from '../types/CollisionEvent';

export class BallisticStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig = {
    type: 'reflective',
    xMin: -Infinity,
    xMax: Infinity,
    yMin: -Infinity,
    yMax: Infinity
  };

  constructor(config?: { boundaryConfig?: BoundaryConfig }) {
    if (config?.boundaryConfig) {
      this.boundaryConfig = {
        ...this.boundaryConfig,
        ...config.boundaryConfig
      };
    }
  }

  updateParticle(particle: Particle, allParticles?: Particle[]): void {
    // Not used in ballistic strategy
  }

  calculateStep(particle: Particle): Step {
    return {
      dx: particle.velocity.vx,
      dy: particle.velocity.vy,
      collision: {
        occurred: false,
        newDirection: 0,
        waitTime: 0,
        energyChange: 0,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      particleId: particle.id
    };
  }

  validateParameters(): boolean {
    return true;
  }

  getPhysicsParameters(): Record<string, number> {
    return {};
  }

  reset(): void {
    // No state to reset
  }

  getBoundaryConfig(): BoundaryConfig {
    return this.boundaryConfig;
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }
}