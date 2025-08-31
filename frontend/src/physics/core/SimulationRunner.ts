import type { Particle } from '../types/Particle';
import type { PhysicsEngine } from './PhysicsEngine';
import type { ParticleManager } from '../ParticleManager';

export interface SimulationRunner {
  step(dt: number): number;
}

export class LegacySimulationRunner implements SimulationRunner {
  private particleManager: ParticleManager;
  
  constructor(particleManager: ParticleManager) {
    this.particleManager = particleManager;
  }

  step(dt: number): number {
    console.log('[LSR] step called', { dt, hasParticleManager: !!this.particleManager });
    this.particleManager.update(dt);
    console.log('[LSR] step completed');
    return dt;
  }
}

export class NewEngineSimulationRunner implements SimulationRunner {
  #physicsEngine: PhysicsEngine;
  #particleManager: ParticleManager;
  
  constructor(physicsEngine: PhysicsEngine, particleManager: ParticleManager) {
    this.#physicsEngine = physicsEngine;
    this.#particleManager = particleManager;
  }

  step(dt: number): number {
    console.log('[NESR] step called', { dt, hasPhysicsEngine: !!this.#physicsEngine, hasParticleManager: !!this.#particleManager });
    const particles = this.#particleManager.getAllParticles();
    const physicsTimeStep = this.#physicsEngine.step(particles);
    
    // Also update particles through ParticleManager for consistency with LegacySimulationRunner
    this.#particleManager.update(dt);
    console.log('[NESR] step completed', { physicsTimeStep });
    return physicsTimeStep;
  }
}
