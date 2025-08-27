import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { IGraph } from '@spin-network/graph-core';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';

export class CTRWStrategy2D implements RandomWalkStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private graph?: IGraph;
  private boundaryConfig: BoundaryConfig;

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    boundaryConfig?: BoundaryConfig;
  }) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity ** 2 / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
    this.boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    const collision = this.handleCollision(particle);
    
    if (collision.occurred && collision.newVelocity) {
      particle.velocity = collision.newVelocity;
      particle.lastCollisionTime = collision.timestamp;
      particle.nextCollisionTime = collision.timestamp + collision.waitTime;
      particle.collisionCount++;
    }
    
    // Record trajectory point
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: Date.now() / 1000
    });
  }

  private applyBoundaryCondition(particle: Particle) {
    switch (this.boundaryConfig.type) {
      case 'periodic':
        return applyPeriodicBoundary(particle.position, this.boundaryConfig);
      case 'reflective':
        return applyReflectiveBoundary(particle.position, particle.velocity, this.boundaryConfig);
      case 'absorbing':
        return applyAbsorbingBoundary(particle.position, this.boundaryConfig);
      default:
        return { position: particle.position };
    }
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }

  calculateStep(particle: Particle): Step {
    const currentTime = Date.now() / 1000;
    const collision = this.handleCollision(particle);
    
    const timeStep = Math.min(collision.waitTime, 0.01);
    const dx = particle.velocity.vx * timeStep;
    const dy = particle.velocity.vy * timeStep;
    
    return {
      dx,
      dy,
      collision,
      timestamp: currentTime,
      particleId: particle.id
    };
  }

  private generateCollisionTime(): number {
    return -Math.log(Math.random()) / this.collisionRate;
  }

  private handleCollision(particle: Particle): CollisionEvent {
    const currentTime = Date.now() / 1000;
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
    const speed = Math.sqrt(particle.velocity.vx ** 2 + particle.velocity.vy ** 2);
    
    return {
      occurred: true,
      newDirection,
      waitTime,
      energyChange: 0,
      timestamp: currentTime,
      position: { ...particle.position },
      oldVelocity: { ...particle.velocity },
      newVelocity: {
        vx: speed * Math.cos(newDirection),
        vy: speed * Math.sin(newDirection)
      }
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