import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';

export class InterparticleCollisionStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig;

  constructor(params: { boundaryConfig?: BoundaryConfig }) {
    this.boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    this.handleInterparticleCollisions(particle, allParticles);
  }

  private handleInterparticleCollisions(particle: Particle, allParticles: Particle[]): void {
    for (const other of allParticles) {
      if (particle.id === other.id) continue;

      const dx = particle.position.x - other.position.x;
      const dy = particle.position.y - other.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = (particle.radius || 1) + (other.radius || 1);

      if (dist < collisionRadius && dist > 0) {
        // 2D elastic collision with momentum conservation
        const [v1x, v1y, v2x, v2y] = this.elasticCollision2D(
          particle.velocity.vx, particle.velocity.vy,
          other.velocity.vx, other.velocity.vy,
          particle.mass || 1, other.mass || 1
        );
        
        particle.velocity.vx = v1x;
        particle.velocity.vy = v1y;
        other.velocity.vx = v2x;
        other.velocity.vy = v2y;

        // Separate particles to prevent overlap
        const overlap = collisionRadius - dist;
        const separationFactor = overlap / (2 * dist);
        particle.position.x += dx * separationFactor;
        particle.position.y += dy * separationFactor;
        other.position.x -= dx * separationFactor;
        other.position.y -= dy * separationFactor;
      }
    }
  }

  private elasticCollision2D(v1x: number, v1y: number, v2x: number, v2y: number, m1: number, m2: number): [number, number, number, number] {
    const totalMass = m1 + m2;
    const newV1x = ((m1 - m2) * v1x + 2 * m2 * v2x) / totalMass;
    const newV1y = ((m1 - m2) * v1y + 2 * m2 * v2y) / totalMass;
    const newV2x = ((m2 - m1) * v2x + 2 * m1 * v1x) / totalMass;
    const newV2y = ((m2 - m1) * v2y + 2 * m1 * v1y) / totalMass;
    
    return [newV1x, newV1y, newV2x, newV2y];
  }

  calculateStep(particle: Particle): Step {
    return {
      dx: 0,
      dy: 0,
      collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: Date.now() / 1000 },
      timestamp: Date.now() / 1000,
      particleId: particle.id
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
