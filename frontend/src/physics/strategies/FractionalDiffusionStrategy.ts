import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simTime } from '../core/GlobalTime';

/** Time-fractional subdiffusive CTRW with Pareto waits and fixed jump length. */
export class FractionalDiffusionStrategy implements PhysicsStrategy {
  private readonly boundaryManager: BoundaryManager;

  constructor(
    private readonly params: { beta: number; waitingScale: number; jumpLength: number; dimension: '1D' | '2D'; boundaryConfig: BoundaryConfig }
  ) {
    this.boundaryManager = new BoundaryManager(params.boundaryConfig);
  }

  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (!particle.isActive) return;
    let nextTime = particle.nextCollisionTime;
    let events = 0;
    let previousEventTime = particle.lastEventTime ?? particle.lastCollisionTime;
    while (nextTime <= context.currentTime && events < 256) {
      const angle = context.random() * 2 * Math.PI;
      const direction = this.params.dimension === '1D'
        ? { x: context.random() < 0.5 ? -1 : 1, y: 0 }
        : { x: Math.cos(angle), y: Math.sin(angle) };
      const eventTime = nextTime;
      const previousPosition = { ...particle.position };
      particle.position = {
        x: particle.position.x + direction.x * this.params.jumpLength,
        y: particle.position.y + direction.y * this.params.jumpLength,
      };
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
        waitTime: Math.max(0, eventTime - previousEventTime),
        waitPosition: previousPosition,
        jumpLength: this.params.jumpLength,
      });
      previousEventTime = eventTime;
      nextTime += this.sampleWaitingTime(context.random);
      events++;
      if (!particle.isActive) break;
    }
    if (events > 0) {
      particle.lastCollisionTime = context.currentTime;
      particle.lastEventTime = previousEventTime;
      particle.nextCollisionTime = nextTime;
      particle.waitingTime = Math.max(0, nextTime - context.currentTime);
      particle.collisionCount += events;
    }
  }

  integrate(_particle: Particle, _dt: number, _context: PhysicsContext): void {}
  calculateStep(particle: Particle): Step {
    return { deltaX: 0, deltaY: 0, collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() }, timestamp: simTime(), particleId: particle.id };
  }
  setBoundaries(config: BoundaryConfig): void { this.boundaryManager.updateConfig(config); }
  getBoundaries(): BoundaryConfig { return this.boundaryManager.getConfig(); }
  validateParameters(): boolean { return this.params.beta > 0 && this.params.beta < 1 && this.params.waitingScale > 0 && this.params.jumpLength > 0; }
  getPhysicsParameters(): Record<string, number> { return { fractionalBeta: this.params.beta, fractionalWaitingScale: this.params.waitingScale, fractionalJumpLength: this.params.jumpLength }; }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } { return { collisionRate: 0, velocity: 0, jumpLength: this.params.jumpLength }; }

  private sampleWaitingTime(random: () => number): number {
    return this.params.waitingScale / Math.pow(Math.max(random(), Number.EPSILON), 1 / this.params.beta);
  }
}
