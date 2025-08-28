import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';
import { simTime, simDt } from '../core/GlobalTime';

export class CTRWStrategy1D implements RandomWalkStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private boundaryConfig: BoundaryConfig;
  private interparticleCollisions: boolean;

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    boundaryConfig?: BoundaryConfig;
    interparticleCollisions?: boolean;
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
    this.interparticleCollisions = params.interparticleCollisions || false;
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    if (this.interparticleCollisions) {
      this.handleInterparticleCollisions(particle, allParticles);
    }

    const step = this.calculateStep(particle);
    particle.position.x += step.dx;
    
    // Apply boundary conditions
    const boundaryResult = this.applyBoundaryCondition(particle);
    particle.position = boundaryResult.position;
    if (boundaryResult.velocity) {
      particle.velocity = boundaryResult.velocity;
    }
    if (boundaryResult.absorbed) {
      particle.isActive = false;
    }
    
    // Record trajectory point for every update
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: step.timestamp
    });
    
    if (step.collision?.occurred) {
      if (step.collision.newVelocity) {
        particle.velocity = step.collision.newVelocity;
      }
      particle.lastCollisionTime = step.collision.timestamp;
      particle.nextCollisionTime = step.collision.timestamp + step.collision.waitTime;
      particle.collisionCount++;
    }
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
    
    const timeStep = Math.min(collision.waitTime, simDt(0.01));
    const dx = particle.velocity.vx * timeStep;
    
    return {
      dx,
      dy: 0,
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
    
    const newDirection = Math.random() < 0.5 ? -1 : 1;
    const speed = Math.abs(particle.velocity.vx);
    
    return {
      occurred: true,
      newDirection,
      waitTime,
      energyChange: 0,
      timestamp: currentTime,
      position: { ...particle.position },
      oldVelocity: { ...particle.velocity },
      newVelocity: {
        vx: speed * newDirection,
        vy: 0
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
