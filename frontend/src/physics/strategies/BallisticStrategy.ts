import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { Step } from '../types/CollisionEvent';
import { BoundaryManager } from '../core/BoundaryManager';
import { simDt, simTime } from '../core/GlobalTime';

export class BallisticStrategy implements RandomWalkStrategy, PhysicsStrategy {
  private boundaryManager: BoundaryManager;

  constructor(config?: { boundaryConfig?: BoundaryConfig }) {
    const boundaryConfig = config?.boundaryConfig || {
      type: 'reflective',
      xMin: -Infinity,
      xMax: Infinity,
      yMin: -Infinity,
      yMax: Infinity
    };
    this.boundaryManager = new BoundaryManager(boundaryConfig);
  }

  preUpdate(_particle: Particle, _allParticles: Particle[], _context: PhysicsContext): void {
    // no-op: ballistic has no Phase A behavior
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    this.updateParticleWithDt(particle, [], dt);
  }

  updateParticle(particle: Particle, allParticles?: Particle[]): void {
    // Use default global timestep when no dt provided
    const dt = simDt(0.01);
    this.updateParticleWithDt(particle, allParticles || [], dt);
  }

  updateParticleWithDt(particle: Particle, allParticles: Particle[], dt: number): void {
    // Ballistic motion - straight line movement using provided timestep
    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;
    
    // Apply boundary conditions
    const { position: newPosition, velocity: newVelocity } = this.boundaryManager.apply(particle);
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

  calculateStep(particle: Particle): Step {
    return {
      dx: particle.velocity.vx,
      dy: particle.velocity.vy,
      collision: {
        occurred: false,
        newDirection: 0,
        waitTime: 0,
        energyChange: 0,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      particleId: particle.id
    };
  }

  validateParameters(): boolean {
    return true;
  }

  getPhysicsParameters(): Record<string, number> {
    return {};
  }

  reset(): void {
    // No state to reset
  }

  getBoundaryConfig(): BoundaryConfig {
    return this.boundaryManager.getConfig();
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryManager.updateConfig(config);
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryManager.getConfig();
  }
}