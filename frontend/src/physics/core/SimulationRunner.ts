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
    this.particleManager.update(dt);
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
    const particles = this.#particleManager.getAllParticles();
    return this.#physicsEngine.step(particles);
  }
}
