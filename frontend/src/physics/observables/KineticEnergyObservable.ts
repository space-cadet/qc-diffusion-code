import type { Observable } from '../interfaces/Observable';
import type { Particle } from '../types/Particle';

export interface KineticEnergyResult {
  totalKineticEnergy: number;
  averageKineticEnergy: number;
  maxKineticEnergy: number;
  minKineticEnergy: number;
  activeParticleCount: number;
  particleEnergies: number[];
  timestamp: number;
}

export class KineticEnergyObservable implements Observable {
  readonly id = 'kineticEnergy';
  private history: KineticEnergyResult[] = [];
  private maxHistory = 1000;
  private particleMass = 1.0; // Default mass, could be configurable

  calculate(particles: Particle[], timestamp: number): KineticEnergyResult {
    const activeParticles = particles.filter(p => p.isActive);
    
    if (activeParticles.length === 0) {
      return {
        totalKineticEnergy: 0,
        averageKineticEnergy: 0,
        maxKineticEnergy: 0,
        minKineticEnergy: 0,
        activeParticleCount: 0,
        particleEnergies: [],
        timestamp
      };
    }

    // Calculate kinetic energy for each particle: KE = (1/2) * m * v²
    const particleEnergies = activeParticles.map(particle => {
      const vSquared = particle.velocity.vx * particle.velocity.vx + 
                      particle.velocity.vy * particle.velocity.vy;
      return 0.5 * this.particleMass * vSquared;
    });

    const totalKineticEnergy = particleEnergies.reduce((sum, energy) => sum + energy, 0);
    const averageKineticEnergy = particleEnergies.length > 0 ? totalKineticEnergy / particleEnergies.length : 0;
    const maxKineticEnergy = particleEnergies.length > 0 ? Math.max(...particleEnergies) : 0;
    const minKineticEnergy = particleEnergies.length > 0 ? Math.min(...particleEnergies) : 0;

    const result: KineticEnergyResult = {
      totalKineticEnergy,
      averageKineticEnergy,
      maxKineticEnergy,
      minKineticEnergy,
      activeParticleCount: activeParticles.length,
      particleEnergies: [...particleEnergies],
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

  getHistory(): KineticEnergyResult[] {
    return [...this.history];
  }

  getLatest(): KineticEnergyResult | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  setParticleMass(mass: number): void {
    this.particleMass = mass;
  }

  getParticleMass(): number {
    return this.particleMass;
  }

  // Statistical methods for analysis
  getTotalEnergyHistory(): number[] {
    return this.history.map(result => result.totalKineticEnergy);
  }

  getAverageEnergyHistory(): number[] {
    return this.history.map(result => result.averageKineticEnergy);
  }

  getEnergyStatistics(): {
    meanTotal: number;
    meanAverage: number;
    stddevTotal: number;
    stddevAverage: number;
  } | null {
    if (this.history.length === 0) return null;

    const totalEnergies = this.getTotalEnergyHistory();
    const avgEnergies = this.getAverageEnergyHistory();

    const meanTotal = totalEnergies.reduce((sum, e) => sum + e, 0) / totalEnergies.length;
    const meanAverage = avgEnergies.reduce((sum, e) => sum + e, 0) / avgEnergies.length;

    const varianceTotal = totalEnergies.reduce((sum, e) => sum + Math.pow(e - meanTotal, 2), 0) / totalEnergies.length;
    const varianceAverage = avgEnergies.reduce((sum, e) => sum + Math.pow(e - meanAverage, 2), 0) / avgEnergies.length;

    return {
      meanTotal,
      meanAverage,
      stddevTotal: Math.sqrt(varianceTotal),
      stddevAverage: Math.sqrt(varianceAverage)
    };
  }
}
