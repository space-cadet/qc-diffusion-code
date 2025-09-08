import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';

export class CompositeStrategy implements RandomWalkStrategy {
  private strategies: RandomWalkStrategy[];
  private primaryStrategy: RandomWalkStrategy;

  constructor(strategies: RandomWalkStrategy[]) {
    if (strategies.length === 0) {
      throw new Error('CompositeStrategy requires at least one strategy');
    }
    this.strategies = strategies;
    this.primaryStrategy = strategies[0]; // Use first strategy for boundary/parameter methods
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    for (const strategy of this.strategies) {
      strategy.updateParticle(particle, allParticles);
    }
  }

  calculateStep(particle: Particle): Step {
    return this.primaryStrategy.calculateStep(particle);
  }

  setBoundaries(config: BoundaryConfig): void {
    for (const strategy of this.strategies) {
      strategy.setBoundaries(config);
    }
  }

  getBoundaries(): BoundaryConfig {
    const primaryBounds = this.primaryStrategy.getBoundaries();
    // Validate all strategies have consistent boundaries
    for (const strategy of this.strategies) {
      const bounds = strategy.getBoundaries();
      if (bounds.type !== primaryBounds.type || bounds.xMin !== primaryBounds.xMin || 
          bounds.xMax !== primaryBounds.xMax || bounds.yMin !== primaryBounds.yMin || 
          bounds.yMax !== primaryBounds.yMax) {
        console.warn('[CompositeStrategy] Inconsistent boundaries detected across strategies');
      }
    }
    return primaryBounds;
  }

  validateParameters(params: any): boolean {
    return this.strategies.every(strategy => strategy.validateParameters(params));
  }

  getPhysicsParameters(): Record<string, number> {
    return this.primaryStrategy.getPhysicsParameters();
  }

  getParameters?(): { collisionRate: number; velocity: number; jumpLength: number } {
    return this.primaryStrategy.getParameters?.() || { collisionRate: 0, velocity: 0, jumpLength: 0 };
  }
}
