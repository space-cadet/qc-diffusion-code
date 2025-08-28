import type { Particle } from '../types/Particle';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { PhysicsContext } from '../types/PhysicsContext';

export class StrategyOrchestrator {
  private collisionStrategies: PhysicsStrategy[] = [];
  private motionStrategies: PhysicsStrategy[] = [];
  private boundaryStrategies: PhysicsStrategy[] = [];

  constructor(strategies: PhysicsStrategy[] = []) {
    this.categorizeStrategies(strategies);
  }

  setStrategies(strategies: PhysicsStrategy[]): void {
    this.collisionStrategies = [];
    this.motionStrategies = [];
    this.boundaryStrategies = [];
    this.categorizeStrategies(strategies);
  }

  private categorizeStrategies(strategies: PhysicsStrategy[]): void {
    // Simple default classification: rely on method presence.
    // Callers can control order by the input array ordering within each phase.
    for (const s of strategies) {
      if (typeof s.preUpdate === 'function') {
        this.collisionStrategies.push(s);
      }
      if (typeof s.integrate === 'function') {
        this.motionStrategies.push(s);
      }
    }
  }

  // Phase A: collisions/scattering (velocity updates only)
  executePhaseA(particles: Particle[], context: PhysicsContext): void {
    for (const p of particles) {
      for (const s of this.collisionStrategies) {
        s.preUpdate?.(p, particles, context);
      }
    }
  }

  // Phase B: motion integration and boundary enforcement
  executePhaseB(particles: Particle[], dt: number, context: PhysicsContext): void {
    for (const p of particles) {
      for (const s of this.motionStrategies) {
        s.integrate?.(p, dt, context);
      }
      for (const s of this.boundaryStrategies) {
        s.integrate?.(p, dt, context);
      }
    }
  }
}
