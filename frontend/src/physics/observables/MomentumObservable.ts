import type { Observable } from '../interfaces/Observable';
import type { Particle } from '../types/Particle';

export interface MomentumResult {
  totalMomentumX: number;
  totalMomentumY: number;
  totalMomentumMagnitude: number;
  averageMomentumX: number;
  averageMomentumY: number;
  averageMomentumMagnitude: number;
  activeParticleCount: number;
  timestamp: number;
}

export class MomentumObservable implements Observable {
  readonly id = 'momentum';
  private history: MomentumResult[] = [];
  private maxHistory = 1000;
  private particleMass = 1.0; // Default mass, could be configurable

  calculate(particles: Particle[], timestamp: number): MomentumResult {
    const activeParticles = particles.filter(p => p.isActive);
    
    if (activeParticles.length === 0) {
      return {
        totalMomentumX: 0,
        totalMomentumY: 0,
        totalMomentumMagnitude: 0,
        averageMomentumX: 0,
        averageMomentumY: 0,
        averageMomentumMagnitude: 0,
        activeParticleCount: 0,
        timestamp
      };
    }

    // Calculate momentum for each particle: p = m * v
    let totalPx = 0;
    let totalPy = 0;
    
    activeParticles.forEach(particle => {
      totalPx += this.particleMass * particle.velocity.vx;
      totalPy += this.particleMass * particle.velocity.vy;
    });

    const totalMomentumMagnitude = Math.sqrt(totalPx * totalPx + totalPy * totalPy);
    const averagePx = totalPx / activeParticles.length;
    const averagePy = totalPy / activeParticles.length;
    const averageMomentumMagnitude = Math.sqrt(averagePx * averagePx + averagePy * averagePy);

    const result: MomentumResult = {
      totalMomentumX: totalPx,
      totalMomentumY: totalPy,
      totalMomentumMagnitude,
      averageMomentumX: averagePx,
      averageMomentumY: averagePy,
      averageMomentumMagnitude,
      activeParticleCount: activeParticles.length,
      timestamp
    };

    // Minimal console logging
    if (this.history.length % 100 === 0) {
      console.log(`[Momentum] t=${timestamp.toFixed(1)}s |P|=${totalMomentumMagnitude.toFixed(2)}`);
    }

    // Store in history
    this.history.push(result);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    return result;
  }

  reset(): void {
    this.history = [];
    console.log('[Momentum] Observable reset');
  }

  getHistory(): MomentumResult[] {
    return [...this.history];
  }

  getLatest(): MomentumResult | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  setParticleMass(mass: number): void {
    this.particleMass = mass;
  }

  getParticleMass(): number {
    return this.particleMass;
  }

  // Get momentum component histories
  getTotalMomentumXHistory(): number[] {
    return this.history.map(result => result.totalMomentumX);
  }

  getTotalMomentumYHistory(): number[] {
    return this.history.map(result => result.totalMomentumY);
  }

  getTotalMomentumMagnitudeHistory(): number[] {
    return this.history.map(result => result.totalMomentumMagnitude);
  }

  // Statistical analysis
  getMomentumStatistics(): {
    meanPx: number;
    meanPy: number;
    meanMagnitude: number;
    stddevPx: number;
    stddevPy: number;
    stddevMagnitude: number;
  } | null {
    if (this.history.length === 0) return null;

    const pxValues = this.getTotalMomentumXHistory();
    const pyValues = this.getTotalMomentumYHistory();
    const magnitudeValues = this.getTotalMomentumMagnitudeHistory();

    const meanPx = pxValues.reduce((sum, p) => sum + p, 0) / pxValues.length;
    const meanPy = pyValues.reduce((sum, p) => sum + p, 0) / pyValues.length;
    const meanMagnitude = magnitudeValues.reduce((sum, p) => sum + p, 0) / magnitudeValues.length;

    const variancePx = pxValues.reduce((sum, p) => sum + Math.pow(p - meanPx, 2), 0) / pxValues.length;
    const variancePy = pyValues.reduce((sum, p) => sum + Math.pow(p - meanPy, 2), 0) / pyValues.length;
    const varianceMagnitude = magnitudeValues.reduce((sum, p) => sum + Math.pow(p - meanMagnitude, 2), 0) / magnitudeValues.length;

    return {
      meanPx,
      meanPy,
      meanMagnitude,
      stddevPx: Math.sqrt(variancePx),
      stddevPy: Math.sqrt(variancePy),
      stddevMagnitude: Math.sqrt(varianceMagnitude)
    };
  }
}
