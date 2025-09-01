import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import { simTime } from '../core/GlobalTime';

export class InterparticleCollisionStrategy1D implements RandomWalkStrategy, PhysicsStrategy {
  private boundaryConfig: BoundaryConfig;

  constructor(params: { boundaryConfig?: BoundaryConfig } = {}) {
    this.boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200,
    };
  }

  updateParticle(particle: Particle, allParticles: Particle[] = []): void {
    this.handleCollisions(particle, allParticles);
  }

  preUpdate(particle: Particle, allParticles: Particle[], _context: PhysicsContext): void {
    // Handle inter-particle collisions in the preUpdate phase
    this.handleCollisions(particle, allParticles);
  }

  integrate(_particle: Particle, _dt: number, _context: PhysicsContext): void {
    // No position integration in this strategy, only collision handling
    // Position integration is handled by other strategies
  }
  
  private handleCollisions(particle: Particle, allParticles: Particle[] = []): void {
    // Simple 1D elastic collisions: swap vx when overlapping
    // Ensure each pair is processed only once per frame using numeric id ordering
    const toNum = (id: string | number): number =>
      typeof id === 'number' ? id : (parseInt(String(id).replace(/\D+/g, ''), 10) || 0);
    const pid = toNum(particle.id as any);

    for (const other of allParticles) {
      if (other.id === particle.id) continue;
      const oid = toNum(other.id as any);
      if (!(pid < oid)) continue; // only handle pair once when pid < oid

      const dx = particle.position.x - other.position.x;
      const dist = Math.abs(dx);
      const r = (particle.radius || 1) + (other.radius || 1);
      if (dist < r) {
        // Only count when approaching each other
        const relV = particle.velocity.vx - other.velocity.vx;
        if (relV * dx < 0) {
          // Swap velocities (elastic, equal mass)
          const v1 = particle.velocity.vx;
          particle.velocity.vx = other.velocity.vx;
          other.velocity.vx = v1;

          // Separate positions to remove overlap and avoid immediate re-collision
          const overlap = r - dist;
          const sign = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
          const push = (overlap / 2) * sign;
          particle.position.x += push;
          other.position.x -= push;

          // Count actual inter-particle collisions on both participants
          particle.interparticleCollisionCount = (particle.interparticleCollisionCount || 0) + 1;
          other.interparticleCollisionCount = (other.interparticleCollisionCount || 0) + 1;
        }
      }
    }
  }

  calculateStep(particle: Particle): Step {
    // No intrinsic displacement; purely modifies velocities
    return {
      dx: 0,
      dy: 0,
      collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
      particleId: particle.id,
    };
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }

  validateParameters(): boolean {
    return true;
  }

  getPhysicsParameters(): Record<string, number> {
    return {};
  }
}
