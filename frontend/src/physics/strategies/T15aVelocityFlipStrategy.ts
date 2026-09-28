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

/** Unbounded one-dimensional T15a velocity-flip process. */
export class T15aVelocityFlipStrategy implements PhysicsStrategy {
  private readonly pendingSteps = new WeakMap<Particle, PendingStep>();

  constructor(
    private readonly flipRate: number,
    private boundaryConfig: BoundaryConfig,
  ) {}

  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (!particle.isActive) return;

    const initialVelocity = { ...particle.velocity };
    const events: PendingEvent[] = [];
    let nextTime = particle.nextCollisionTime;
    while (nextTime <= context.currentTime && events.length < 256) {
      const velocity = { vx: -initialVelocity.vx, vy: 0 };
      events.push({ time: nextTime, velocity });
      initialVelocity.vx = velocity.vx;
      nextTime += this.sampleWait(context.random);
    }

    if (events.length > 0) {
      particle.velocity = { ...events[events.length - 1].velocity };
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
    particle.position.y = 0;
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
    if (config.type !== 'unbounded') throw new Error('T15a requires unbounded boundaries');
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig { return { ...this.boundaryConfig }; }
  validateParameters(): boolean { return this.flipRate >= 0; }
  getPhysicsParameters(): Record<string, number> { return { collisionRate: this.flipRate, velocity: 1 }; }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return { collisionRate: this.flipRate, velocity: 1, jumpLength: this.flipRate > 0 ? 1 / this.flipRate : 0 };
  }

  private sampleWait(random: () => number): number {
    if (this.flipRate <= 0) return Infinity;
    return -Math.log(Math.max(1 - random(), Number.EPSILON)) / this.flipRate;
  }
}
