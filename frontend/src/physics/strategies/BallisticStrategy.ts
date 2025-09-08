import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle } from '../types/Particle';
import type { PhysicsContext } from '../types/PhysicsContext';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { Step } from '../types/CollisionEvent';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import { BoundaryManager } from '../core/BoundaryManager';
import { simDt, simTime } from '../core/GlobalTime';

export class BallisticStrategy implements PhysicsStrategy {
  private boundaryManager: BoundaryManager;
  private coordSystem: CoordinateSystem;

  constructor(config: { boundaryConfig: BoundaryConfig; coordSystem: CoordinateSystem }) {
    this.boundaryManager = new BoundaryManager(config.boundaryConfig);
    this.coordSystem = config.coordSystem;
  }

  preUpdate(_particle: Particle, _allParticles: Particle[], _context: PhysicsContext): void {
    // no-op: ballistic has no Phase A behavior
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    // Ballistic motion - straight line movement using provided timestep
    const velocity = this.coordSystem.toVector(particle.velocity);
    particle.position.x += velocity.x * dt;
    particle.position.y += velocity.y * dt;
    
    // Apply boundary conditions
    const boundaryResult = this.boundaryManager.apply(particle);
    particle.position = boundaryResult.position;
    if (boundaryResult.velocity) {
      particle.velocity = boundaryResult.velocity;
    }
    if (boundaryResult.absorbed) {
      particle.isActive = false;
    }
    
    // Record trajectory point
    particle.trajectory.push({
      position: { ...particle.position },
      timestamp: simTime()
    });
  }

  calculateStep(particle: Particle): Step {
    const velocity = this.coordSystem.toVector(particle.velocity);
    const dt = simDt();
    return {
      deltaX: velocity.x * dt,
      deltaY: velocity.y * dt,
      collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
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