import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle, Vector, Velocity } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import { simTime } from '../core/GlobalTime';

export class InterparticleCollisionStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig;
  private coordSystem: CoordinateSystem;

  constructor(boundaryConfig: BoundaryConfig, coordSystem: CoordinateSystem) {
    this.boundaryConfig = boundaryConfig;
    this.coordSystem = coordSystem;
  }

  private detectCollision(p1: Particle, p2: Particle): boolean {
    const dx = p1.position.x - p2.position.x;
    const dy = p1.position.y - p2.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 1.0; // Collision radius
  }

  private resolveCollision(v1: Vector, v2: Vector): Vector {
    // Elastic collision in 2D
    return {
      x: v2.x,
      y: v2.y
    };
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    const velocity = this.coordSystem.toVector(particle.velocity);
    const position = { x: particle.position.x, y: particle.position.y };
    
    for (const other of allParticles) {
      if (other !== particle) {
        const otherVel = this.coordSystem.toVector(other.velocity);
        
        if (this.detectCollision(particle, other)) {
          const newVel = this.resolveCollision(velocity, otherVel);
          particle.velocity = this.coordSystem.toVelocity(newVel);
          break;
        }
      }
    }
  }

  updateParticleWithDt(particle: Particle, allParticles: Particle[], dt: number): void {
    // Convert velocity to Vector for calculations
    const velocity = this.coordSystem.toVector(particle.velocity);
    const position = { x: particle.position.x, y: particle.position.y };
    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    particle.position = position;
    
    // Convert back to Velocity for storage
    particle.velocity = this.coordSystem.toVelocity(velocity);
    
    // Handle inter-particle collisions
    this.handleInterparticleCollisions(particle, allParticles);
  }

  private handleInterparticleCollisions(particle: Particle, allParticles: Particle[]): void {
    // Ensure each pair is processed only once per frame using numeric id ordering
    const pid = parseInt(String(particle.id).replace(/\D+/g, ''), 10) || 0;
    for (const other of allParticles) {
      if (particle.id === other.id) continue;
      const oid = parseInt(String(other.id).replace(/\D+/g, ''), 10) || 0;
      if (!(pid < oid)) continue; // only handle pair once when pid < oid

      const particlePosition = { x: particle.position.x, y: particle.position.y };
      const otherPosition = { x: other.position.x, y: other.position.y };
      const dx = particlePosition.x - otherPosition.x;
      const dy = particlePosition.y - otherPosition.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const collisionRadius = (particle.radius || 3) + (other.radius || 3);

      if (dist < collisionRadius && dist > 0) {
        // Convert velocity to Vector for calculations
        const particleVelocity = this.coordSystem.toVector(particle.velocity);
        const otherVelocity = this.coordSystem.toVector(other.velocity);
        
        // 2D elastic collision with momentum conservation
        const [v1x, v1y, v2x, v2y] = this.elasticCollision2D(
          particleVelocity.x, particleVelocity.y,
          otherVelocity.x, otherVelocity.y,
          1, 1
        );
        
        // Convert back to Velocity for storage
        particle.velocity = this.coordSystem.toVelocity({ x: v1x, y: v1y });
        other.velocity = this.coordSystem.toVelocity({ x: v2x, y: v2y });

        // Separate particles to prevent overlap
        const overlap = collisionRadius - dist;
        const separationFactor = overlap / (2 * dist);
        particlePosition.x += dx * separationFactor;
        particlePosition.y += dy * separationFactor;
        otherPosition.x -= dx * separationFactor;
        otherPosition.y -= dy * separationFactor;
        particle.position = particlePosition;
        other.position = otherPosition;

        // Count actual inter-particle collisions on both participants
        particle.interparticleCollisionCount = (particle.interparticleCollisionCount || 0) + 1;
        other.interparticleCollisionCount = (other.interparticleCollisionCount || 0) + 1;

        // Mark collision timestamp for visual indicator
        const currentTime = simTime();
        particle.lastInterparticleCollisionTime = currentTime;
        other.lastInterparticleCollisionTime = currentTime;
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
      collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
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
