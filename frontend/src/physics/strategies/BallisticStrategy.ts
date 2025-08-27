import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';

export class BallisticStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig;

  constructor(params: { boundaryConfig?: BoundaryConfig }) {
    this.boundaryConfig = params.boundaryConfig || {
      type: 'periodic',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
  }

  updateParticle(particle: Particle, allParticles: Particle[]): void {
    const timeStep = 0.01; // Fixed time step for ballistic motion
    
    // Update position with current velocity
    particle.position.x += particle.velocity.vx * timeStep;
    particle.position.y += particle.velocity.vy * timeStep;
    
    // Apply boundary conditions
    const boundaryResult = this.applyBoundaryCondition(particle);
    particle.position = boundaryResult.position;
    if (boundaryResult.velocity) {
      particle.velocity = boundaryResult.velocity;
    }
    if (boundaryResult.absorbed) {
      particle.isActive = false;
    }
    
    // Record trajectory
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

  calculateStep(particle: Particle): Step {
    const timeStep = 0.01;
    return {
      dx: particle.velocity.vx * timeStep,
      dy: particle.velocity.vy * timeStep,
      collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: Date.now() / 1000 },
      timestamp: Date.now() / 1000,
      particleId: particle.id
    };
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }

  validateParameters(): boolean {
    return true;
  }

  getPhysicsParameters(): Record<string, number> {
    return {};
  }
}
