import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simDt, simTime } from '../core/GlobalTime';

/** Compound-Poisson Lévy flight with symmetric Pareto-tailed jump lengths. */
export class LevyFlightStrategy implements PhysicsStrategy {
  private readonly boundaryManager: BoundaryManager;

  constructor(
    private readonly params: { collisionRate: number; alpha: number; scale: number; dimension: '1D' | '2D'; boundaryConfig: BoundaryConfig }
  ) {
    this.boundaryManager = new BoundaryManager(params.boundaryConfig);
  }

  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (!particle.isActive || this.params.collisionRate <= 0) return;
    let nextTime = particle.nextCollisionTime;
    let events = 0;
    let previousEventTime = particle.lastEventTime ?? particle.lastCollisionTime;
    while (nextTime <= context.currentTime && events < 256) {
      const u = Math.max(context.random(), Number.EPSILON);
      const length = this.params.scale * Math.pow(u, -1 / this.params.alpha);
      const angle = context.random() * 2 * Math.PI;
      const dx = this.params.dimension === '1D' ? (context.random() < 0.5 ? -length : length) : length * Math.cos(angle);
      const dy = this.params.dimension === '1D' ? 0 : length * Math.sin(angle);
      const eventTime = nextTime;
      const waitTime = Math.max(0, eventTime - previousEventTime);
      particle.position = { x: particle.position.x + dx, y: particle.position.y + dy };
      const boundary = this.boundaryManager.apply(particle);
      particle.position = boundary.position;
      if (boundary.velocity) particle.velocity = boundary.velocity;
      if (boundary.absorbed) particle.isActive = false;
      particle.trajectory.push({ position: { ...particle.position }, timestamp: nextTime });
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: eventTime,
        kind: 'jump',
        position: { ...particle.position },
        waitTime,
        jumpLength: length,
      });
      previousEventTime = eventTime;
      nextTime += -Math.log(Math.max(context.random(), Number.EPSILON)) / this.params.collisionRate;
      events++;
      if (!particle.isActive) break;
    }
    if (events > 0) {
      particle.lastCollisionTime = context.currentTime;
      particle.lastEventTime = previousEventTime;
      particle.nextCollisionTime = nextTime;
      particle.collisionCount += events;
    }
  }

  integrate(_particle: Particle, _dt: number, _context: PhysicsContext): void {}

  calculateStep(particle: Particle): Step {
    return { deltaX: 0, deltaY: 0, collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() }, timestamp: simTime(), particleId: particle.id };
  }

  setBoundaries(config: BoundaryConfig): void { this.boundaryManager.updateConfig(config); }
  getBoundaries(): BoundaryConfig { return this.boundaryManager.getConfig(); }
  validateParameters(): boolean { return this.params.collisionRate > 0 && this.params.alpha > 0 && this.params.alpha <= 2 && this.params.scale > 0; }
  getPhysicsParameters(): Record<string, number> { return { collisionRate: this.params.collisionRate, levyAlpha: this.params.alpha, levyScale: this.params.scale }; }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } { return { collisionRate: this.params.collisionRate, velocity: 0, jumpLength: this.params.scale }; }
}
