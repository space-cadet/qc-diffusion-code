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



  preUpdate(particle: Particle, allParticles: Particle[], _context: PhysicsContext): void {
    const collision = this.handleCollision(particle);
    
    if (collision.occurred && collision.newVelocity) {
      particle.velocity = collision.newVelocity;
      particle.lastCollisionTime = collision.timestamp;
      particle.nextCollisionTime = collision.timestamp + collision.waitTime;
      particle.collisionCount++;
    }
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    const velocity = this.coordSystem.toVector(particle.velocity);
    particle.position.x += velocity.x * dt;
    particle.position.y += velocity.y * dt;

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
    const collision = this.handleCollision(particle);
    
    const timeStep = Math.min(collision.waitTime, simDt());
    const velocity = this.coordSystem.toVector(particle.velocity);
    const dx = velocity.x * timeStep;
    const dy = velocity.y * timeStep;


     
     return {
       deltaX: dx,
       deltaY: dy,
       collision,
       timestamp: currentTime,
       particleId: particle.id
     };
   }

  private generateCollisionTime(): number {
    return -Math.log(Math.random()) / this.collisionRate;
  }

  private handleCollision(particle: Particle): CollisionEvent {
    const currentTime = simTime();
    const waitTime = this.generateCollisionTime();
    
    const shouldCollide = currentTime >= particle.nextCollisionTime;
    
    if (!shouldCollide) {
      return {
        occurred: false,
        newDirection: 0,
        waitTime,
        energyChange: 0,
        timestamp: currentTime
      };
    }
    
    const newDirection = Math.random() * 2 * Math.PI;
    const velocity = this.coordSystem.toVector(particle.velocity);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    
    const newVelocity = {
      x: speed * Math.cos(newDirection),
      y: speed * Math.sin(newDirection)
    };

    return {
      occurred: true,
      newDirection,
      waitTime,
      energyChange: 0,
      timestamp: currentTime,
      position: { ...particle.position },
      oldVelocity: { ...particle.velocity },
      newVelocity: this.coordSystem.toVelocity(newVelocity)
    };
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