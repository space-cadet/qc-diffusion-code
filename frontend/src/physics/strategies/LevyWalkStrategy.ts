import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle, Velocity } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simDt, simTime } from '../core/GlobalTime';

interface WalkState {
  nextTurnTime: number;
  lastTurnTime: number;
  velocity: Velocity;
}

interface PendingTurn {
  time: number;
  velocity: Velocity;
}

interface PendingStep {
  initialVelocity: Velocity;
  turns: PendingTurn[];
}

/** Finite-speed Lévy walk with Pareto-tailed flight durations and uniform headings. */
export class LevyWalkStrategy implements PhysicsStrategy {
  private readonly boundaryManager: BoundaryManager;
  private readonly walkStates = new WeakMap<Particle, WalkState>();
  private readonly pendingSteps = new WeakMap<Particle, PendingStep>();

  constructor(private readonly params: {
    speed: number;
    alpha: number;
    flightLengthScale: number;
    dimension: '1D' | '2D';
    boundaryConfig: BoundaryConfig;
  }) {
    this.boundaryManager = new BoundaryManager(params.boundaryConfig);
  }

  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (!particle.isActive) return;

    const stepStart = context.currentTime - context.dt;
    let state = this.walkStates.get(particle);
    if (!state) {
      const velocity = this.sampleVelocity(context.random);
      state = {
        velocity,
        lastTurnTime: stepStart,
        nextTurnTime: stepStart + this.sampleFlightDuration(context.random),
      };
      this.walkStates.set(particle, state);
    }

    const initialVelocity = { ...state.velocity };
    const turns: PendingTurn[] = [];
    let previousTurnTime = state.lastTurnTime;
    let nextTurnTime = state.nextTurnTime;
    let velocity = { ...state.velocity };
    let eventPosition = { ...particle.position };
    let eventPositionTime = stepStart;

    while (nextTurnTime <= context.currentTime && turns.length < 256) {
      const segmentDuration = Math.max(0, nextTurnTime - eventPositionTime);
      eventPosition.x += velocity.vx * segmentDuration;
      eventPosition.y += velocity.vy * segmentDuration;
      eventPositionTime = nextTurnTime;
      const nextVelocity = this.sampleVelocity(context.random);
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: nextTurnTime,
        kind: 'turn',
        position: { ...eventPosition },
        waitTime: Math.max(0, nextTurnTime - previousTurnTime),
        jumpLength: this.params.speed * Math.max(0, nextTurnTime - previousTurnTime),
        previousVelocity: { ...velocity },
        velocity: { ...nextVelocity },
      });
      turns.push({ time: nextTurnTime, velocity: nextVelocity });
      velocity = nextVelocity;
      previousTurnTime = nextTurnTime;
      nextTurnTime += this.sampleFlightDuration(context.random);
    }

    state.velocity = velocity;
    state.lastTurnTime = previousTurnTime;
    state.nextTurnTime = nextTurnTime;
    particle.velocity = { ...velocity };
    particle.lastEventTime = previousTurnTime;
    particle.lastCollisionTime = previousTurnTime;
    particle.nextCollisionTime = nextTurnTime;
    particle.collisionCount += turns.length;
    this.pendingSteps.set(particle, { initialVelocity, turns });
  }

  integrate(particle: Particle, dt: number, context: PhysicsContext): void {
    if (!particle.isActive) return;
    const pending = this.pendingSteps.get(particle);
    let cursor = context.currentTime - dt;
    let velocity = pending?.initialVelocity ?? { ...particle.velocity };

    for (const turn of pending?.turns ?? []) {
      if (turn.time <= cursor) {
        velocity = turn.velocity;
        continue;
      }
      const advanced = this.advanceSegment(particle, velocity, turn.time - cursor);
      velocity = advanced.velocity;
      if (advanced.absorbed) {
        particle.isActive = false;
        break;
      }
      velocity = turn.velocity;
      cursor = turn.time;
    }

    if (particle.isActive) {
      const advanced = this.advanceSegment(particle, velocity, Math.max(0, context.currentTime - cursor));
      velocity = advanced.velocity;
      if (advanced.absorbed) particle.isActive = false;
    }

    particle.velocity = { ...velocity };
    const state = this.walkStates.get(particle);
    if (state) state.velocity = { ...velocity };
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

  setBoundaries(config: BoundaryConfig): void { this.boundaryManager.updateConfig(config); }
  getBoundaries(): BoundaryConfig { return this.boundaryManager.getConfig(); }
  validateParameters(): boolean {
    return this.params.speed > 0 && this.params.alpha > 0 && this.params.flightLengthScale > 0;
  }
  getPhysicsParameters(): Record<string, number> {
    return { velocity: this.params.speed, levyAlpha: this.params.alpha, levyFlightLengthScale: this.params.flightLengthScale };
  }
  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return { collisionRate: 0, velocity: this.params.speed, jumpLength: this.params.flightLengthScale };
  }

  private sampleVelocity(random: () => number): Velocity {
    const angle = this.params.dimension === '1D' ? (random() < 0.5 ? Math.PI : 0) : random() * 2 * Math.PI;
    return { vx: this.params.speed * Math.cos(angle), vy: this.params.dimension === '1D' ? 0 : this.params.speed * Math.sin(angle) };
  }

  private sampleFlightDuration(random: () => number): number {
    const minimumDuration = this.params.flightLengthScale / this.params.speed;
    return minimumDuration / Math.pow(Math.max(random(), Number.EPSILON), 1 / this.params.alpha);
  }

  private advanceSegment(particle: Particle, velocity: Velocity, duration: number): { velocity: Velocity; absorbed: boolean } {
    particle.position = {
      x: particle.position.x + velocity.vx * duration,
      y: particle.position.y + velocity.vy * duration,
    };
    const boundary = this.boundaryManager.apply(particle);
    particle.position = boundary.position;
    return {
      velocity: boundary.velocity ?? velocity,
      absorbed: boundary.absorbed,
    };
  }
}
