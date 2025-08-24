import type { Observable } from '../interfaces/Observable';
import type { Particle } from '../types/Particle';

export interface MSDResult {
  meanSquaredDisplacement: number;
  rootMeanSquaredDisplacement: number;
  averageDisplacementX: number;
  averageDisplacementY: number;
  maxDisplacement: number;
  minDisplacement: number;
  activeParticleCount: number;
  timestamp: number;
}

export class MSDObservable implements Observable {
  readonly id = 'msd';
  private history: MSDResult[] = [];
  private maxHistory = 1000;
  private initialPositions: Map<string, { x: number; y: number }> = new Map();
  private hasInitialized = false;

  calculate(particles: Particle[], timestamp: number): MSDResult {
    const activeParticles = particles.filter(p => p.isActive);
    
    // Initialize reference positions on first calculation
    if (!this.hasInitialized && activeParticles.length > 0) {
      activeParticles.forEach(particle => {
        this.initialPositions.set(particle.id, {
          x: particle.position.x,
          y: particle.position.y
        });
      });
      this.hasInitialized = true;
      console.log(`[MSD] Initialized with ${this.initialPositions.size} reference positions`);
    }

    if (activeParticles.length === 0 || !this.hasInitialized) {
      return {
        meanSquaredDisplacement: 0,
        rootMeanSquaredDisplacement: 0,
        averageDisplacementX: 0,
        averageDisplacementY: 0,
        maxDisplacement: 0,
        minDisplacement: 0,
        activeParticleCount: 0,
        timestamp
      };
    }

    // Calculate displacement for each particle from initial position
    const displacements: number[] = [];
    const displacementsX: number[] = [];
    const displacementsY: number[] = [];

    activeParticles.forEach(particle => {
      const initial = this.initialPositions.get(particle.id);
      if (initial) {
        const dx = particle.position.x - initial.x;
        const dy = particle.position.y - initial.y;
        const displacement = Math.sqrt(dx * dx + dy * dy);
        
        displacements.push(displacement);
        displacementsX.push(dx);
        displacementsY.push(dy);
      }
    });

    if (displacements.length === 0) {
      return {
        meanSquaredDisplacement: 0,
        rootMeanSquaredDisplacement: 0,
        averageDisplacementX: 0,
        averageDisplacementY: 0,
        maxDisplacement: 0,
        minDisplacement: 0,
        activeParticleCount: 0,
        timestamp
      };
    }

    // Calculate MSD: <r²> = average of (displacement)²
    const squaredDisplacements = displacements.map(d => d * d);
    const msd = squaredDisplacements.reduce((sum, d2) => sum + d2, 0) / squaredDisplacements.length;
    const rmsd = Math.sqrt(msd);

    const avgDx = displacementsX.reduce((sum, dx) => sum + dx, 0) / displacementsX.length;
    const avgDy = displacementsY.reduce((sum, dy) => sum + dy, 0) / displacementsY.length;
    const maxDisplacement = Math.max(...displacements);
    const minDisplacement = Math.min(...displacements);

    const result: MSDResult = {
      meanSquaredDisplacement: msd,
      rootMeanSquaredDisplacement: rmsd,
      averageDisplacementX: avgDx,
      averageDisplacementY: avgDy,
      maxDisplacement,
      minDisplacement,
      activeParticleCount: displacements.length,
      timestamp
    };

    // Minimal console logging
    if (this.history.length % 150 === 0) {
      console.log(`[MSD] t=${timestamp.toFixed(1)}s MSD=${msd.toFixed(1)} RMSD=${rmsd.toFixed(1)}`);
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
    this.initialPositions.clear();
    this.hasInitialized = false;
    console.log('[MSD] Observable reset - cleared reference positions');
  }

  getHistory(): MSDResult[] {
    return [...this.history];
  }

  getLatest(): MSDResult | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  // Get MSD time series for analysis
  getMSDHistory(): number[] {
    return this.history.map(result => result.meanSquaredDisplacement);
  }

  getRMSDHistory(): number[] {
    return this.history.map(result => result.rootMeanSquaredDisplacement);
  }

  getTimeHistory(): number[] {
    return this.history.map(result => result.timestamp);
  }

  // Calculate diffusion coefficient from MSD slope: D = MSD/(4t) for 2D
  getDiffusionCoefficient(): number | null {
    if (this.history.length < 2) return null;

    const recent = this.history.slice(-10); // Use last 10 points
    if (recent.length < 2) return null;

    const firstPoint = recent[0];
    const lastPoint = recent[recent.length - 1];
    
    const deltaMSD = lastPoint.meanSquaredDisplacement - firstPoint.meanSquaredDisplacement;
    const deltaT = lastPoint.timestamp - firstPoint.timestamp;
    
    if (deltaT <= 0) return null;
    
    // For 2D: MSD = 4Dt, so D = MSD/(4t)
    return deltaMSD / (4 * deltaT);
  }

  // Statistical analysis
  getMSDStatistics(): {
    meanMSD: number;
    stddevMSD: number;
    slopeMSD: number;
  } | null {
    if (this.history.length === 0) return null;

    const msdValues = this.getMSDHistory();
    const meanMSD = msdValues.reduce((sum, msd) => sum + msd, 0) / msdValues.length;
    const varianceMSD = msdValues.reduce((sum, msd) => sum + Math.pow(msd - meanMSD, 2), 0) / msdValues.length;

    // Linear regression slope for MSD vs time
    let slopeMSD = 0;
    if (this.history.length > 1) {
      const timeValues = this.getTimeHistory();
      const n = msdValues.length;
      const sumX = timeValues.reduce((sum, t) => sum + t, 0);
      const sumY = msdValues.reduce((sum, msd) => sum + msd, 0);
      const sumXY = timeValues.reduce((sum, t, i) => sum + t * msdValues[i], 0);
      const sumX2 = timeValues.reduce((sum, t) => sum + t * t, 0);
      
      const denominator = n * sumX2 - sumX * sumX;
      if (denominator !== 0) {
        slopeMSD = (n * sumXY - sumX * sumY) / denominator;
      }
    }

    return {
      meanMSD,
      stddevMSD: Math.sqrt(varianceMSD),
      slopeMSD
    };
  }
}
