import type { Observable } from '../interfaces/Observable';
import type { Particle } from '../types/Particle';

export interface ParticleCountResult {
  totalCount: number;
  activeCount: number;
  inactiveCount: number;
  timestamp: number;
}

export class ParticleCountObservable implements Observable {
  readonly id = 'particleCount';
  private history: ParticleCountResult[] = [];
  private maxHistory = 1000;

  calculate(particles: Particle[], timestamp: number): ParticleCountResult {
    const activeParticles = particles.filter(p => p.isActive);
    const result: ParticleCountResult = {
      totalCount: particles.length,
      activeCount: activeParticles.length,
      inactiveCount: particles.length - activeParticles.length,
      timestamp
    };

    // Store in history
    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return result;
  }

  reset(): void {
    this.history = [];
  }

  getHistory(): ParticleCountResult[] {
    return [...this.history];
  }

  getLatest(): ParticleCountResult | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }
}
