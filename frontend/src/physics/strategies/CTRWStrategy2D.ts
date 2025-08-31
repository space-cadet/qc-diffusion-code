import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { IGraph } from '@spin-network/graph-core';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';
import { simTime, simDt } from '../core/GlobalTime';

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

  updateParticle(particle: Particle, allParticles: Particle[] = []): void {
    this.updateParticleWithDt(particle, allParticles, simDt());
  }

  updateParticleWithDt(particle: Particle, allParticles: Particle[], dt: number): void {
    const collision = this.handleCollision(particle);
    
    if (collision.occurred && collision.newVelocity) {
      particle.velocity = collision.newVelocity;
      particle.lastCollisionTime = collision.timestamp;
      particle.nextCollisionTime = collision.timestamp + collision.waitTime;
      particle.collisionCount++;
    }

    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;

    const { position: newPosition, velocity: newVelocity } = this.applyBoundaryCondition(particle);
    particle.position = newPosition;
    if (newVelocity) {
      particle.velocity = newVelocity;
    }
    
    // Record trajectory point
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: simTime()
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
    const currentTime = simTime();
    const collision = this.handleCollision(particle);
    
    const timeStep = Math.min(collision.waitTime, simDt());
    const dx = particle.velocity.vx * timeStep;
    const dy = particle.velocity.vy * timeStep;

    // DIAG: occasional log for p0 to inspect CTRW2D motion inputs
    if ((particle.id === 'p0') && (Math.floor(currentTime / Math.max(timeStep, 1e-6)) % 60 === 0)) {
      const speed = Math.hypot(particle.velocity.vx, particle.velocity.vy);
      console.log('[CTRW2D] p0', {
        simTime: currentTime.toFixed(3),
        dt: timeStep.toExponential(3),
        vx: particle.velocity.vx.toFixed(4),
        vy: particle.velocity.vy.toFixed(4),
        speed: speed.toFixed(4),
        dx: dx.toExponential(3),
        dy: dy.toExponential(3),
        nextCollisionTime: particle.nextCollisionTime.toFixed(3),
        collided: collision.occurred,
      });
    }
     
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