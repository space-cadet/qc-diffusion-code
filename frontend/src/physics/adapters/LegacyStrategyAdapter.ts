import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';

// Thin adapter: maps existing RandomWalkStrategy.updateParticle to PhysicsStrategy.integrate
// No behavior change: dt and context are ignored; legacy strategy controls time/BCs as before.
export class LegacyStrategyAdapter implements PhysicsStrategy {
  private wrapped: RandomWalkStrategy;
  private getAllParticles: () => Particle[];

  constructor(wrapped: RandomWalkStrategy, getAllParticles: () => Particle[]) {
    this.wrapped = wrapped;
    this.getAllParticles = getAllParticles;
  }

  // Phase A left empty to avoid behavior changes; legacy strategy does all work in integrate.
  preUpdate?(particle: Particle, _allParticles: Particle[], _context: PhysicsContext): void {
    // no-op
  }

  integrate?(particle: Particle, dt: number, _context: PhysicsContext): void {
    const all = this.getAllParticles();
    // Pass dt to the wrapped strategy if it supports it
    if (typeof (this.wrapped as any).updateParticleWithDt === 'function') {
      (this.wrapped as any).updateParticleWithDt(particle, all, dt);
    } else {
      this.wrapped.updateParticle(particle, all);
      // For strategies that don't integrate position (like CTRWStrategy2D),
      // manually integrate position using current velocity
      if (this.wrapped.constructor.name.includes('CTRW')) {
        particle.position.x += particle.velocity.vx * dt;
        particle.position.y += particle.velocity.vy * dt;
      }
    }
  }

  setBoundaries?(config: BoundaryConfig): void {
    this.wrapped.setBoundaries?.(config);
  }

  getBoundaries?(): BoundaryConfig {
    return this.wrapped.getBoundaries?.() as BoundaryConfig;
  }

  validateParameters?(params: any): boolean {
    return this.wrapped.validateParameters?.(params) ?? true;
  }

  getPhysicsParameters?(): Record<string, number> {
    return this.wrapped.getPhysicsParameters?.() ?? {};
  }
}
