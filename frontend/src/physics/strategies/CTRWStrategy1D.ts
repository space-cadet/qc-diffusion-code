import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simTime, simDt } from '../core/GlobalTime';

export class CTRWStrategy1D implements PhysicsStrategy {
  private collisionRate: number;
  private jumpLength: number;
  private velocity: number;
  private diffusionConstant: number;
  private meanWaitTime: number;
  private boundaryManager: BoundaryManager;
  private interparticleCollisions: boolean;
  private coordSystem: CoordinateSystem;

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



  preUpdate(particle: Particle, allParticles: Particle[], _context: PhysicsContext): void {
    if (this.interparticleCollisions) {
      this.handleInterparticleCollisions(particle, allParticles);
    }

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
    
    // Apply boundary conditions
    const boundaryResult = this.boundaryManager.apply(particle);
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
    const collision = this.handleCollision(particle);
    
    const timeStep = Math.min(collision.waitTime, simDt());
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
