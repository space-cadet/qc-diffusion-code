import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';

export class BallisticStrategy implements PhysicsStrategy {
  integrate(particle: Particle, dt: number, context: PhysicsContext): void {
    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;
  }
}