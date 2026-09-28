import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle, Velocity } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { Step } from '../types/CollisionEvent';
import { simDt, simTime } from '../core/GlobalTime';

interface PendingEvent {
  time: number;
  velocity: Velocity;
}

interface PendingStep {
  initialVelocity: Velocity;
  events: PendingEvent[];
}

/** Unbounded planar T15b constant-speed process with uniform Poisson heading resets. */
export class T15bHeadingResetStrategy implements PhysicsStrategy {
  private readonly pendingSteps = new WeakMap<Particle, PendingStep>();

  constructor(
    private readonly speed: number,
    private readonly resetRate: number,
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
    let eventVelocity = { ...initialVelocity };
    while (nextTime <= context.currentTime && events.length < 256) {
      const eventTime = nextTime;
      const segmentDuration = Math.max(0, eventTime - eventTimeCursor);
      eventPosition.x += eventVelocity.vx * segmentDuration;
      eventPosition.y += eventVelocity.vy * segmentDuration;
      eventTimeCursor = eventTime;
      const angle = context.random() * 2 * Math.PI;
      const velocity = { vx: this.speed * Math.cos(angle), vy: this.speed * Math.sin(angle) };
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: eventTime,
        kind: 'turn',
        position: { ...eventPosition },
        waitTime: Math.max(0, eventTime - previousEventTime),
        jumpLength: this.speed * Math.max(0, eventTime - previousEventTime),
        previousVelocity: { ...eventVelocity },
        velocity: { ...velocity },
      });
      previousEventTime = eventTime;
      eventVelocity = velocity;
      events.push({ time: eventTime, velocity });
      nextTime += this.sampleWait(context.random);
    }

    if (events.length > 0) {
      particle.velocity = { ...events[events.length - 1].velocity };
      particle.lastEventTime = previousEventTime;
      particle.lastCollisionTime = events[events.length - 1].time;
      particle.nextCollisionTime = nextTime;
      particle.collisionCount += events.length;
    }
    this.pendingSteps.set(particle, { initialVelocity, events });
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
      particle.position.y += velocity.vy * segment;
      cursor = event.time;
      velocity = event.velocity;
    }
    const remainder = Math.max(0, context.currentTime - cursor);
    particle.position.x += velocity.vx * remainder;
    particle.position.y += velocity.vy * remainder;
    particle.trajectory.push({ position: { ...particle.position }, timestamp: context.currentTime });
    particle.lastUpdate = context.currentTime;
    this.pendingSteps.delete(particle);
  }

  calculateStep(particle: Particle): Step {
    const dt = simDt();
    return {
      deltaX: particle.velocity.vx * dt,
      deltaY: particle.velocity.vy * dt,
      collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
      particleId: particle.id,
    };
  }

  setBoundaries(config: BoundaryConfig): void {
    if (config.type !== 'unbounded') throw new Error('T15b requires unbounded boundaries');
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig { return { ...this.boundaryConfig }; }
  validateParameters(): boolean { return this.speed > 0 && this.resetRate >= 0; }
  getPhysicsParameters(): Record<string, number> { return { collisionRate: this.resetRate, velocity: this.speed }; }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return {
      collisionRate: this.resetRate,
      velocity: this.speed,
      jumpLength: this.resetRate > 0 ? this.speed / this.resetRate : 0,
    };
  }

  private sampleWait(random: () => number): number {
    if (this.resetRate <= 0) return Infinity;
    return -Math.log(Math.max(1 - random(), Number.EPSILON)) / this.resetRate;
  }
}
