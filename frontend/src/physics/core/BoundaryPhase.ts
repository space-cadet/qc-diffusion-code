import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';

export class BoundaryPhase implements PhysicsStrategy {
  integrate(particle: Particle, _dt: number, context: PhysicsContext): void {
    const bounds = context.coordinateSystem.getBoundaries();
    const { type } = bounds;

    switch (type) {
      case 'reflective': {
        // Reflect position and velocity at boundaries
        if (particle.position.x < bounds.xMin) {
          particle.position.x = bounds.xMin + (bounds.xMin - particle.position.x);
          particle.velocity.vx = -particle.velocity.vx;
        } else if (particle.position.x > bounds.xMax) {
          particle.position.x = bounds.xMax - (particle.position.x - bounds.xMax);
          particle.velocity.vx = -particle.velocity.vx;
        }

        if (context.coordinateSystem.getDimension() === '2D') {
          if (particle.position.y < bounds.yMin) {
            particle.position.y = bounds.yMin + (bounds.yMin - particle.position.y);
            particle.velocity.vy = -particle.velocity.vy;
          } else if (particle.position.y > bounds.yMax) {
            particle.position.y = bounds.yMax - (particle.position.y - bounds.yMax);
            particle.velocity.vy = -particle.velocity.vy;
          }
        }
        break;
      }

      case 'periodic': {
        // Wrap position at boundaries
        const width = bounds.xMax - bounds.xMin;
        particle.position.x = ((particle.position.x - bounds.xMin) % width + width) % width + bounds.xMin;

        if (context.coordinateSystem.getDimension() === '2D') {
          const height = bounds.yMax - bounds.yMin;
          particle.position.y = ((particle.position.y - bounds.yMin) % height + height) % height + bounds.yMin;
        }
        break;
      }

      case 'absorbing': {
        // Deactivate particles that hit boundaries
        if (
          particle.position.x < bounds.xMin ||
          particle.position.x > bounds.xMax ||
          (context.coordinateSystem.getDimension() === '2D' &&
            (particle.position.y < bounds.yMin || particle.position.y > bounds.yMax))
        ) {
          particle.isActive = false;
        }
        break;
      }
    }
  }
}
