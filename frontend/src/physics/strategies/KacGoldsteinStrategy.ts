import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle, Velocity } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { Step } from '../types/CollisionEvent';
import { simDt, simTime } from '../core/GlobalTime';
import { applyBoundaryCondition } from '../utils/boundaryUtils';

interface PendingEvent {
  time: number;
  velocity: Velocity;
}

interface PendingStep {
  initialVelocity: Velocity;
  events: PendingEvent[];
}

/** One-dimensional Kac-Goldstein velocity-flip process. */
export class KacGoldsteinStrategy implements PhysicsStrategy {
  private readonly pendingSteps = new WeakMap<Particle, PendingStep>();

  constructor(
    private readonly speed: number,
    private readonly flipRate: number,
    private boundaryConfig: BoundaryConfig,
  ) {}

  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (!particle.isActive) return;

    const initialVelocity = { ...particle.velocity };
    const events: PendingEvent[] = [];
    let nextTime = particle.nextCollisionTime;
    let eventTimeCursor = context.currentTime - context.dt;
    let previousEventTime = particle.lastEventTime ?? particle.lastCollisionTime;
    let eventPosition = { ...particle.position };
    while (nextTime <= context.currentTime && events.length < 256) {
      const eventTime = nextTime;
      eventPosition.x += initialVelocity.vx * Math.max(0, eventTime - eventTimeCursor);
      eventPosition.y += initialVelocity.vy * Math.max(0, eventTime - eventTimeCursor);
      eventTimeCursor = eventTime;
      const velocity = { vx: -initialVelocity.vx, vy: 0 };
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: eventTime,
        kind: 'turn',
        position: { ...eventPosition },
        waitTime: Math.max(0, eventTime - previousEventTime),
        jumpLength: Math.abs(initialVelocity.vx) * Math.max(0, eventTime - previousEventTime),
        previousVelocity: { ...initialVelocity },
        velocity: { ...velocity },
      });
      previousEventTime = eventTime;
      events.push({ time: eventTime, velocity });
      initialVelocity.vx = velocity.vx;
      nextTime += this.sampleWait(context.random);
    }

    if (events.length > 0) {
      particle.velocity = { ...events[events.length - 1].velocity };
      particle.lastEventTime = previousEventTime;
      particle.lastCollisionTime = events[events.length - 1].time;
      particle.nextCollisionTime = nextTime;
      particle.collisionCount += events.length;
    }
    this.pendingSteps.set(particle, {
      initialVelocity: events.length > 0 ? { vx: -events[0].velocity.vx, vy: 0 } : { ...particle.velocity },
      events,
    });
  }

  integrate(particle: Particle, dt: number, context: PhysicsContext): void {
    if (!particle.isActive) return;
    const pending = this.pendingSteps.get(particle);
    const startTime = context.currentTime - dt;
    let cursor = startTime;
    let velocity = pending?.initialVelocity ?? { ...particle.velocity };

    for (const event of pending?.events ?? []) {
      if (event.time <= startTime) {
        velocity = event.velocity;
        continue;
      }
      const segment = event.time - cursor;
      particle.position.x += velocity.vx * segment;
      cursor = event.time;
      velocity = event.velocity;
    }
    particle.position.x += velocity.vx * Math.max(0, context.currentTime - cursor);
    this.applyBoundary(particle);
    particle.trajectory.push({ position: { ...particle.position }, timestamp: context.currentTime });
    particle.lastUpdate = context.currentTime;
    this.pendingSteps.delete(particle);
  }

  calculateStep(particle: Particle): Step {
    const dt = simDt();
    return {
      deltaX: particle.velocity.vx * dt,
      deltaY: 0,
      collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
      particleId: particle.id,
    };
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig { return { ...this.boundaryConfig }; }
  validateParameters(): boolean { return this.speed > 0 && this.flipRate >= 0; }
  getPhysicsParameters(): Record<string, number> { return { collisionRate: this.flipRate, velocity: this.speed }; }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return { collisionRate: this.flipRate, velocity: this.speed, jumpLength: this.flipRate > 0 ? this.speed / this.flipRate : 0 };
  }

  private sampleWait(random: () => number): number {
    if (this.flipRate <= 0) return Infinity;
    return -Math.log(Math.max(1 - random(), Number.EPSILON)) / this.flipRate;
  }

  private applyBoundary(particle: Particle): void {
    const result = applyBoundaryCondition(particle.position, particle.velocity, this.boundaryConfig);
    particle.position = result.position;
    if (result.velocity) particle.velocity = result.velocity;
    if (result.absorbed) particle.isActive = false;
  }
}
