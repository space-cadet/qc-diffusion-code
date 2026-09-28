import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simTime, simDt } from '../core/GlobalTime';
import { advanceCTWRSegment } from './advanceCTWRSegment';

export class CTRWStrategy1D implements PhysicsStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private boundaryManager: BoundaryManager;
  private interparticleCollisions: boolean;
  private coordSystem: CoordinateSystem;
  private stepPaths = new WeakMap<Particle, {
    startPosition: { x: number; y: number };
    position: { x: number; y: number };
    absorbed: boolean;
  }>();

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    boundaryConfig?: BoundaryConfig;
    interparticleCollisions?: boolean;
    coordSystem: CoordinateSystem;
  }) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity ** 2 / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
    if (!params.boundaryConfig) {
      console.warn('[CTRWStrategy1D] No boundaryConfig provided; using fallback defaults');
    }
    const boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
    this.boundaryManager = new BoundaryManager(boundaryConfig);
    this.interparticleCollisions = params.interparticleCollisions || false;
    this.coordSystem = params.coordSystem;
  }



  preUpdate(particle: Particle, allParticles: Particle[], context: PhysicsContext): void {
    if (this.interparticleCollisions) {
      this.handleInterparticleCollisions(particle, allParticles);
    }

    if (this.collisionRate <= 0 || !particle.isActive) return;
    let nextTime = particle.nextCollisionTime;
    let events = 0;
    const speed = Math.abs(particle.velocity.vx);
    let eventVelocity = { ...particle.velocity };
    let eventPosition = { ...particle.position };
    let cursorTime = context.currentTime - context.dt;
    let previousEventTime = particle.lastEventTime ?? particle.lastCollisionTime;
    let absorbed = false;
    while (nextTime <= context.currentTime && events < 256 && !absorbed) {
      const eventTime = nextTime;
      const segment = advanceCTWRSegment(
        eventPosition,
        eventVelocity,
        Math.max(0, eventTime - cursorTime),
        this.boundaryManager,
        '1D',
      );
      eventPosition = segment.position;
      eventVelocity = segment.velocity;
      cursorTime = eventTime;
      if (segment.absorbed) {
        absorbed = true;
        break;
      }
      const nextVelocity = { vx: (context.random() < 0.5 ? -1 : 1) * speed, vy: 0 };
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: eventTime,
        kind: 'turn',
        position: { ...eventPosition },
        waitTime: Math.max(0, eventTime - previousEventTime),
        jumpLength: speed * Math.max(0, eventTime - previousEventTime),
        previousVelocity: { ...eventVelocity },
        velocity: { ...nextVelocity },
      });
      eventVelocity = nextVelocity;
      previousEventTime = eventTime;
      nextTime += this.generateCollisionTime(context.random);
      events++;
    }
    if (!absorbed && events > 0) {
      const segment = advanceCTWRSegment(
        eventPosition,
        eventVelocity,
        Math.max(0, context.currentTime - cursorTime),
        this.boundaryManager,
        '1D',
      );
      eventPosition = segment.position;
      eventVelocity = segment.velocity;
      absorbed = segment.absorbed;
    }
    if (events > 0 || absorbed) {
      this.stepPaths.set(particle, {
        startPosition: { ...particle.position },
        position: eventPosition,
        absorbed,
      });
      particle.velocity = eventVelocity;
      if (events > 0) {
        particle.lastEventTime = previousEventTime;
        particle.lastCollisionTime = context.currentTime;
        particle.nextCollisionTime = nextTime;
        particle.collisionCount += events;
      }
    }
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    const velocity = this.coordSystem.toVector(particle.velocity);
    const path = this.stepPaths.get(particle);
    this.stepPaths.delete(particle);
    if (path) {
      particle.position = path.absorbed
        ? path.position
        : {
            x: path.position.x + particle.position.x - path.startPosition.x,
            y: path.position.y + particle.position.y - path.startPosition.y,
          };
      if (path.absorbed) particle.isActive = false;
    } else if (particle.isActive) {
      particle.position.x += velocity.x * dt;

      // Apply the boundary on steps without stochastic events.
      const boundaryResult = this.boundaryManager.apply(particle);
      particle.position = boundaryResult.position;
      if (boundaryResult.velocity) particle.velocity = boundaryResult.velocity;
      if (boundaryResult.absorbed) particle.isActive = false;
    }
    
    // Record trajectory point for every update
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: simTime()
    });
  }



  private handleInterparticleCollisions(particle: Particle, allParticles: Particle[]): void {
    for (const other of allParticles) {
      if (particle.id === other.id) continue;

      const dist = Math.abs(particle.position.x - other.position.x);
      if (dist < (particle.radius || 1) + (other.radius || 1)) {
        // Simple elastic collision: swap velocities
        const v1 = particle.velocity.vx;
        particle.velocity.vx = other.velocity.vx;
        other.velocity.vx = v1;
      }
    }
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryManager.updateConfig(config);
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryManager.getConfig();
  }

  calculateStep(particle: Particle): Step {
    const currentTime = simTime();
    const collision = { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: currentTime };
    const timeStep = simDt();
    const vx = this.coordSystem.toVector(particle.velocity).x;
    const dx = vx * timeStep;
    
    return {
      deltaX: dx,
      deltaY: 0,
      collision,
      timestamp: currentTime,
      particleId: particle.id
    };
  }

  private generateCollisionTime(random: () => number): number {
    return -Math.log(Math.max(random(), Number.EPSILON)) / this.collisionRate;
  }

  validateParameters(params: any): boolean {
    return (
      params.collisionRate > 0 &&
      params.jumpLength > 0 &&
      (!params.velocity || params.velocity > 0)
    );
  }

  getPhysicsParameters(): Record<string, number> {
    return {
      collisionRate: this.collisionRate,
      jumpLength: this.jumpLength,
      velocity: this.velocity,
      diffusionConstant: this.diffusionConstant,
      meanWaitTime: this.meanWaitTime
    };
  }

  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return {
      collisionRate: this.collisionRate,
      velocity: this.velocity,
      jumpLength: this.jumpLength
    };
  }
}
