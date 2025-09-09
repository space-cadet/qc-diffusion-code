import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';

export class CompositeStrategy implements PhysicsStrategy {
  private strategies: PhysicsStrategy[];
  private primaryStrategy: PhysicsStrategy;

  constructor(strategies: PhysicsStrategy[]) {
    if (strategies.length === 0) {
      throw new Error('CompositeStrategy requires at least one strategy');
    }
    this.strategies = strategies;
    this.primaryStrategy = strategies[0]; // Use first strategy for boundary/parameter methods
  }

  preUpdate(particle: Particle, allParticles: Particle[], context: PhysicsContext): void {
    for (const strategy of this.strategies) {
      strategy.preUpdate(particle, allParticles, context);
    }
  }

  integrate(particle: Particle, dt: number, context: PhysicsContext): void {
    for (const strategy of this.strategies) {
      strategy.integrate(particle, dt, context);
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
    // In a composite strategy, ensuring consistent boundaries is crucial.
    // Here we'll just return the primary's but a more robust implementation
    // might validate or merge them.
    return primaryBounds;
  }

  validateParameters(params: any): boolean {
    return this.strategies.every(strategy => strategy.validateParameters(params));
  }

  getPhysicsParameters(): Record<string, number> {
    return this.strategies.reduce((acc, strategy) => {
      return { ...acc, ...strategy.getPhysicsParameters() };
    }, {});
  }

  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    const combined = this.strategies.reduce((acc, strategy) => {
      const params = strategy.getParameters();
      Object.assign(acc, params);
      return acc;
    }, {} as { collisionRate?: number; velocity?: number; jumpLength?: number });

    return {
      collisionRate: combined.collisionRate || 0,
      velocity: combined.velocity || 0,
      jumpLength: combined.jumpLength || 0,
    };
  }
}
