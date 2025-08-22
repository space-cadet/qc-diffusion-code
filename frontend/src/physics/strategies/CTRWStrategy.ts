import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { IGraph } from '@spin-network/graph-core';

export class CTRWStrategy implements RandomWalkStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private graph?: IGraph;

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
  }) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity ** 2 / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
  }

  updateParticle(particle: Particle): void {
    const step = this.calculateStep(particle);
    particle.position.x += step.dx;
    if (step.dy) particle.position.y += step.dy;
    
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
}