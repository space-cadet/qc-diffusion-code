import type { RandomWalkStrategy } from './interfaces/RandomWalkStrategy';
import type { BoundaryConfig } from './types/BoundaryConfig';
import { ParticleManager } from './ParticleManager';
import { CTRWStrategy } from './strategies/CTRWStrategy';
import { ObservableManager } from './ObservableManager';
import type { Observable } from './interfaces/Observable';

interface SimulatorParams {
  collisionRate: number;
  jumpLength: number;
  velocity: number;
  particleCount: number;
  simulationType?: string;
  graphType?: string;
  graphSize?: number;
  strategy?: string;
  boundaryCondition?: string;
  canvasWidth?: number;
  canvasHeight?: number;
}

export class RandomWalkSimulator {
  private particleManager: ParticleManager;
  private strategy: RandomWalkStrategy;
  private particleCount: number;
  private time: number = 0;
  private observableManager: ObservableManager;
  private densityHistory: Array<{
    time: number;
    density: number[][];
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  }> = [];

  constructor(params: SimulatorParams) {
    const boundaryConfig = this.createBoundaryConfig(params);
    
    this.strategy = new CTRWStrategy({
      collisionRate: params.collisionRate,
      jumpLength: params.jumpLength,
      velocity: params.velocity,
      boundaryConfig
    });
    
    this.particleManager = new ParticleManager(this.strategy);
    this.particleCount = params.particleCount;
    this.observableManager = new ObservableManager();
    this.initializeParticles();
  }

  private createBoundaryConfig(params: SimulatorParams): BoundaryConfig {
    return {
      type: (params.boundaryCondition || 'periodic') as 'periodic' | 'reflective' | 'absorbing',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
  }

  private initializeParticles(): void {
    // Clear existing particles
    this.particleManager.clearAllParticles();
    
    // Create new particles with random positions
    for (let i = 0; i < this.particleCount; i++) {
      const tsParticle = {
        id: `p${i}`,
        position: { 
          x: (Math.random() - 0.5) * 400, // Random position in -200 to 200 range
          y: (Math.random() - 0.5) * 400 
        },
        velocity: { x: 0, y: 0 }
      };
      this.particleManager.initializeParticle(tsParticle);
    }
  }

  step(dt: number): void {
    this.time += dt;
    const particles = this.particleManager.getAllParticles();
    particles.forEach(particle => {
      this.particleManager.updateParticle({
        id: particle.id,
        position: particle.position,
        velocity: { x: particle.velocity.vx, y: particle.velocity.vy }
      });
    });
    
    // Update observable snapshot after physics step
    this.observableManager.updateSnapshot(particles, this.time);
  }

  reset(): void {
    this.time = 0;
    this.initializeParticles();
  }

  updateParameters(params: SimulatorParams): void {
    const boundaryConfig = this.createBoundaryConfig(params);
    
    const newStrategy = new CTRWStrategy({
      collisionRate: params.collisionRate,
      jumpLength: params.jumpLength,
      velocity: params.velocity,
      boundaryConfig
    });
    
    this.strategy = newStrategy;
    this.particleManager.updatePhysicsEngine(newStrategy);
    
    // Update particle count if changed
    if (this.particleCount !== params.particleCount) {
      this.particleCount = params.particleCount;
      this.initializeParticles(); // Re-initialize with new count
    }
  }

  getDensityField() {
    const particles = this.particleManager.getAllParticles();
    const positions = particles.map(p => p.position);
    const dx = 0.1;
    const xMin = Math.min(...positions.map(p => p.x)) - dx;
    const xMax = Math.max(...positions.map(p => p.x)) + dx;
    const bins = Math.ceil((xMax - xMin) / dx);
    
    const rho = new Array(bins).fill(0);
    positions.forEach(pos => {
      const bin = Math.floor((pos.x - xMin) / dx);
      if (bin >= 0 && bin < bins) {
        rho[bin]++;
      }
    });
    
    return {
      error: 0.01,
      rho: rho.map(count => count / (this.particleCount * dx))
    };
  }

  getDensityProfile2D(binSize: number = 10): {
    density: number[][];
    xBounds: { min: number; max: number };
    yBounds: { min: number; max: number };
    binSize: number;
  } {
    const particles = this.particleManager.getAllParticles();
    const positions = particles.map(p => p.position);
    
    if (positions.length === 0) {
      return {
        density: [],
        xBounds: { min: 0, max: 0 },
        yBounds: { min: 0, max: 0 },
        binSize
      };
    }
    
    // Calculate bounds
    const xMin = Math.min(...positions.map(p => p.x));
    const xMax = Math.max(...positions.map(p => p.x));
    const yMin = Math.min(...positions.map(p => p.y));
    const yMax = Math.max(...positions.map(p => p.y));
    
    // Calculate grid dimensions
    const xBins = Math.ceil((xMax - xMin) / binSize) + 1;
    const yBins = Math.ceil((yMax - yMin) / binSize) + 1;
    
    // Initialize 2D density array
    const density: number[][] = Array(yBins).fill(null).map(() => Array(xBins).fill(0));
    
    // Bin particles
    positions.forEach(pos => {
      const xBin = Math.floor((pos.x - xMin) / binSize);
      const yBin = Math.floor((pos.y - yMin) / binSize);
      
      if (xBin >= 0 && xBin < xBins && yBin >= 0 && yBin < yBins) {
        density[yBin][xBin]++;
      }
    });
    
    // Normalize by bin area and total particles
    const binArea = binSize * binSize;
    const normalizedDensity = density.map(row => 
      row.map(count => count / (this.particleCount * binArea))
    );
    
    return {
      density: normalizedDensity,
      xBounds: { min: xMin, max: xMax },
      yBounds: { min: yMin, max: yMax },
      binSize
    };
  }

  getCollisionStats() {
    return this.particleManager.getCollisionStats();
  }

  getTime(): number {
    return this.time;
  }

  getParticleManager(): ParticleManager {
    return this.particleManager;
  }

  // Observable management methods
  registerObservable(observable: Observable): void {
    this.observableManager.register(observable);
  }

  unregisterObservable(id: string): void {
    this.observableManager.unregister(id);
  }

  getObservableData(id: string): any {
    return this.observableManager.getResult(id);
  }

  recordDensitySnapshot(binSize: number = 15): void {
    const profile = this.getDensityProfile2D(binSize);
    if (profile.density.length > 0) {
      this.densityHistory.push({
        time: this.time,
        density: profile.density,
        bounds: {
          xMin: profile.xBounds.min,
          xMax: profile.xBounds.max,
          yMin: profile.yBounds.min,
          yMax: profile.yBounds.max
        }
      });
      
      // Keep only last 100 snapshots to manage memory
      if (this.densityHistory.length > 100) {
        this.densityHistory.shift();
      }
    }
  }

  getDensityHistory(): Array<{
    time: number;
    density: number[][];
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  }> {
    return this.densityHistory;
  }

  clearDensityHistory(): void {
    this.densityHistory = [];
  }

  analyzeWaveFrontSpeed(): { measuredSpeed: number; theoreticalSpeed: number; error: number } {
    if (this.densityHistory.length < 2) {
      return { measuredSpeed: 0, theoreticalSpeed: 0, error: 0 };
    }

    // Calculate theoretical speed: c = 1/√(τε) where τ is collision time, ε is jump length factor
    const collisionRate = this.strategy.getParameters?.()?.collisionRate || 1;
    const velocity = this.strategy.getParameters?.()?.velocity || 1;
    const theoreticalSpeed = velocity; // Simplified for now

    // Measure wavefront propagation from density history
    const recent = this.densityHistory.slice(-10); // Last 10 snapshots
    if (recent.length < 2) {
      return { measuredSpeed: 0, theoreticalSpeed, error: 0 };
    }

    // Find center of mass movement over time
    let totalSpeedMeasurements = 0;
    let speedSum = 0;

    for (let i = 1; i < recent.length; i++) {
      const prev = recent[i - 1];
      const curr = recent[i];
      const dt = curr.time - prev.time;
      
      if (dt > 0) {
        // Calculate center of mass for each snapshot
        const prevCM = this.calculateCenterOfMass(prev.density);
        const currCM = this.calculateCenterOfMass(curr.density);
        
        const distance = Math.sqrt(
          Math.pow(currCM.x - prevCM.x, 2) + Math.pow(currCM.y - prevCM.y, 2)
        );
        
        const speed = distance / dt;
        speedSum += speed;
        totalSpeedMeasurements++;
      }
    }

    const measuredSpeed = totalSpeedMeasurements > 0 ? speedSum / totalSpeedMeasurements : 0;
    const error = Math.abs(measuredSpeed - theoreticalSpeed) / theoreticalSpeed;

    return { measuredSpeed, theoreticalSpeed, error };
  }

  private calculateCenterOfMass(density: number[][]): { x: number; y: number } {
    let totalMass = 0;
    let xSum = 0;
    let ySum = 0;

    for (let y = 0; y < density.length; y++) {
      for (let x = 0; x < density[y].length; x++) {
        const mass = density[y][x];
        totalMass += mass;
        xSum += x * mass;
        ySum += y * mass;
      }
    }

    return totalMass > 0 
      ? { x: xSum / totalMass, y: ySum / totalMass }
      : { x: 0, y: 0 };
  }
}