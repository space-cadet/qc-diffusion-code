import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { IGraph } from '@spin-network/graph-core';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simTime, simDt } from '../core/GlobalTime';

export class CTRWStrategy2D implements PhysicsStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private graph?: IGraph;
  private boundaryManager: BoundaryManager;
  private coordSystem: CoordinateSystem;
  private stepDisplacements = new WeakMap<Particle, { x: number; y: number }>();

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    boundaryConfig?: BoundaryConfig;
    coordSystem: CoordinateSystem;
  }) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity ** 2 / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
    if (!params.boundaryConfig) {
      console.warn('[CTRWStrategy2D] No boundaryConfig provided; using fallback defaults');
    }
    const boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
    this.boundaryManager = new BoundaryManager(boundaryConfig);
    this.coordSystem = params.coordSystem;
  }



  preUpdate(particle: Particle, _allParticles: Particle[], context: PhysicsContext): void {
    if (this.collisionRate <= 0 || !particle.isActive) return;
    let nextTime = particle.nextCollisionTime;
    let events = 0;
    const startVelocity = this.coordSystem.toVector(particle.velocity);
    const speed = Math.hypot(startVelocity.x, startVelocity.y);
    let eventVelocity = { ...particle.velocity };
    let eventPosition = { ...particle.position };
    let cursorTime = context.currentTime - context.dt;
    let previousEventTime = particle.lastEventTime ?? particle.lastCollisionTime;

    while (nextTime <= context.currentTime && events < 256) {
      const eventTime = nextTime;
      const worldVelocity = this.coordSystem.toVector(eventVelocity);
      const waitTime = Math.max(0, eventTime - previousEventTime);
      eventPosition.x += worldVelocity.x * Math.max(0, eventTime - cursorTime);
      eventPosition.y += worldVelocity.y * Math.max(0, eventTime - cursorTime);
      cursorTime = eventTime;
      const angle = context.random() * 2 * Math.PI;
      const nextVelocity = this.coordSystem.toVelocity({ x: speed * Math.cos(angle), y: speed * Math.sin(angle) });
      context.onStrategyEvent?.({
        particleId: particle.id,
        time: eventTime,
        kind: 'turn',
        position: { ...eventPosition },
        waitTime,
        jumpLength: speed * waitTime,
        previousVelocity: { ...eventVelocity },
        velocity: { ...nextVelocity },
      });
      eventVelocity = nextVelocity;
      previousEventTime = eventTime;
      nextTime += this.generateCollisionTime(context.random);
      events++;
    }

    if (events > 0) {
      const finalVelocity = this.coordSystem.toVector(eventVelocity);
      const remainingTime = Math.max(0, context.currentTime - cursorTime);
      eventPosition.x += finalVelocity.x * remainingTime;
      eventPosition.y += finalVelocity.y * remainingTime;
      this.stepDisplacements.set(particle, {
        x: eventPosition.x - particle.position.x,
        y: eventPosition.y - particle.position.y,
      });
      particle.velocity = eventVelocity;
      particle.lastCollisionTime = context.currentTime;
      particle.lastEventTime = previousEventTime;
      particle.nextCollisionTime = nextTime;
      particle.collisionCount += events;
    }
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    const velocity = this.coordSystem.toVector(particle.velocity);
    const displacement = this.stepDisplacements.get(particle);
    this.stepDisplacements.delete(particle);
    particle.position.x += displacement?.x ?? velocity.x * dt;
    particle.position.y += displacement?.y ?? velocity.y * dt;

    const boundaryResult = this.boundaryManager.apply(particle);
    particle.position = boundaryResult.position;
    if (boundaryResult.velocity) {
      particle.velocity = boundaryResult.velocity;
    }
    if (boundaryResult.absorbed) {
      particle.isActive = false;
    }
    
    // Record trajectory point (CircularBuffer auto-manages capacity)
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: simTime()
    });
  }



  setBoundaries(config: BoundaryConfig): void {
    console.log('[CTRWStrategy2D] setBoundaries called with:', config.type);
    this.boundaryManager.updateConfig(config);
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryManager.getConfig();
  }

  calculateStep(particle: Particle): Step {
    const currentTime = simTime();
    const timeStep = simDt();
    const velocity = this.coordSystem.toVector(particle.velocity);
    const dx = velocity.x * timeStep;
    const dy = velocity.y * timeStep;


     
     return {
       deltaX: dx,
       deltaY: dy,
       collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: currentTime },
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
