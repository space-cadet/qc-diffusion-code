import type { RandomWalkStrategy } from './interfaces/RandomWalkStrategy';
import type { BoundaryConfig } from './types/BoundaryConfig';
import { ParticleManager } from './ParticleManager';
import { CTRWStrategy1D } from './strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from './strategies/CTRWStrategy2D';
import { ObservableManager } from './ObservableManager';
import type { Observable } from './interfaces/Observable';

interface SimulatorParams {
  collisionRate: number;
  jumpLength: number;
  velocity: number;
  particleCount: number;
  dimension: '1D' | '2D';
  interparticleCollisions: boolean;
  simulationType?: string;
  graphType?: string;
  graphSize?: number;
  strategy?: string;
  boundaryCondition?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  // Initial distribution controls (canvas space)
  initialDistType?: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid';
  distSigmaX?: number;
  distSigmaY?: number;
  distR0?: number;
  distDR?: number;
  distThickness?: number;
  distNx?: number;
  distNy?: number;
  distJitter?: number;
}

export class RandomWalkSimulator {
  private particleManager: ParticleManager;
  private strategy: RandomWalkStrategy;
  private dimension: '1D' | '2D';
  private particleCount: number;
  private time: number = 0;
  private observableManager: ObservableManager;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private initialDistType: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid' = 'uniform';
  private distSigmaX: number = 80;
  private distSigmaY: number = 80;
  private distR0: number = 150;
  private distDR: number = 20;
  private distThickness: number = 40;
  private distNx: number = 20;
  private distNy: number = 15;
  private distJitter: number = 4;
  private densityHistory: Array<{
    time: number;
    density: number[][];
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  }> = [];

  constructor(params: SimulatorParams) {
    this.dimension = params.dimension;
    const boundaryConfig = this.createBoundaryConfig(params);
    
    if (params.dimension === '1D') {
      this.strategy = new CTRWStrategy1D({
        collisionRate: params.collisionRate,
        jumpLength: params.jumpLength,
        velocity: params.velocity,
        boundaryConfig,
        interparticleCollisions: params.interparticleCollisions,
      });
    } else {
      this.strategy = new CTRWStrategy2D({
        collisionRate: params.collisionRate,
        jumpLength: params.jumpLength,
        velocity: params.velocity,
        boundaryConfig,
      });
    }
    
    this.particleManager = new ParticleManager(this.strategy, params.dimension);
    this.particleCount = params.particleCount;
    this.observableManager = new ObservableManager();
    // Ensure ParticleManager knows canvas size before seeding particles,
    // so that mapToPhysics() during initialization uses correct dimensions.
    if (params.canvasWidth && params.canvasHeight) {
      this.canvasWidth = params.canvasWidth;
      this.canvasHeight = params.canvasHeight;
      this.particleManager.setCanvasSize(this.canvasWidth, this.canvasHeight);
    }
    // Store distribution params
    if (params.initialDistType) this.initialDistType = params.initialDistType;
    if (params.distSigmaX !== undefined) this.distSigmaX = params.distSigmaX;
    if (params.distSigmaY !== undefined) this.distSigmaY = params.distSigmaY;
    if (params.distR0 !== undefined) this.distR0 = params.distR0;
    if (params.distDR !== undefined) this.distDR = params.distDR;
    if (params.distThickness !== undefined) this.distThickness = params.distThickness;
    if (params.distNx !== undefined) this.distNx = params.distNx;
    if (params.distNy !== undefined) this.distNy = params.distNy;
    if (params.distJitter !== undefined) this.distJitter = params.distJitter;
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

  private sampleCanvasPosition(i: number): { x: number; y: number } {
    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight / 2;

    if (this.dimension === '1D') {
      // For 1D, we only care about the x-coordinate.
      // We can use the existing logic for the x-coordinate and set y to a constant.
      switch (this.initialDistType) {
        case 'gaussian': {
          const bm = () => {
            let u = 0, v = 0;
            while (u === 0) u = Math.random();
            while (v === 0) v = Math.random();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          };
          const x = cx + bm() * this.distSigmaX;
          return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: cy };
        }
        case 'stripe': {
          const half = this.distThickness / 2;
          const x = cx + (Math.random() * 2 - 1) * half;
          return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: cy };
        }
        case 'grid': {
          const nx = Math.max(1, this.distNx);
          const gx = i % nx;
          const cellW = this.canvasWidth / nx;
          const jitterX = (Math.random() * 2 - 1) * this.distJitter;
          const x = (gx + 0.5) * cellW + jitterX;
          return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: cy };
        }
        case 'uniform':
        default:
          return { x: Math.random() * this.canvasWidth, y: cy };
      }
    }

    switch (this.initialDistType) {
      case 'gaussian': {
        // Box-Muller
        const bm = () => {
          let u = 0, v = 0;
          while (u === 0) u = Math.random();
          while (v === 0) v = Math.random();
          return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };
        const x = cx + bm() * this.distSigmaX;
        const y = cy + bm() * this.distSigmaY;
        return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: Math.max(0, Math.min(this.canvasHeight, y)) };
      }
      case 'ring': {
        const r0 = this.distR0;
        const dr = this.distDR;
        const r = r0 + (Math.random() - 0.5) * 2 * dr;
        const theta = Math.random() * 2 * Math.PI;
        const x = cx + r * Math.cos(theta);
        const y = cy + r * Math.sin(theta);
        return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: Math.max(0, Math.min(this.canvasHeight, y)) };
      }
      case 'stripe': {
        // vertical stripe centered at cx
        const half = this.distThickness / 2;
        const x = cx + (Math.random() * 2 - 1) * half;
        const y = Math.random() * this.canvasHeight;
        return { x: Math.max(0, Math.min(this.canvasWidth, x)), y };
      }
      case 'grid': {
        const nx = Math.max(1, this.distNx);
        const ny = Math.max(1, this.distNy);
        const gx = i % nx;
        const gy = Math.floor(i / nx) % ny;
        const cellW = this.canvasWidth / nx;
        const cellH = this.canvasHeight / ny;
        const jitterX = (Math.random() * 2 - 1) * this.distJitter;
        const jitterY = (Math.random() * 2 - 1) * this.distJitter;
        const x = (gx + 0.5) * cellW + jitterX;
        const y = (gy + 0.5) * cellH + jitterY;
        return { x: Math.max(0, Math.min(this.canvasWidth, x)), y: Math.max(0, Math.min(this.canvasHeight, y)) };
      }
      case 'uniform':
      default:
        return { x: Math.random() * this.canvasWidth, y: Math.random() * this.canvasHeight };
    }
  }

  private initializeParticles(): void {
    // Clear existing particles
    this.particleManager.clearAllParticles();
    
    // Create new particles with random positions
    // IMPORTANT: pass positions in CANVAS coordinates here.
    // ParticleManager.initializeParticle() converts canvas -> physics via mapToPhysics().
    for (let i = 0; i < this.particleCount; i++) {
      const pos = this.sampleCanvasPosition(i);
      const tsParticle = {
        id: `p${i}`,
        position: {
          x: pos.x,
          y: pos.y,
        },
        velocity: { x: 0, y: 0 },
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
    let newStrategy: RandomWalkStrategy;

    if (params.dimension === '1D') {
      newStrategy = new CTRWStrategy1D({
        collisionRate: params.collisionRate,
        jumpLength: params.jumpLength,
        velocity: params.velocity,
        boundaryConfig,
        interparticleCollisions: params.interparticleCollisions,
      });
    } else {
      newStrategy = new CTRWStrategy2D({
        collisionRate: params.collisionRate,
        jumpLength: params.jumpLength,
        velocity: params.velocity,
        boundaryConfig,
      });
    }
    
    // Check if dimension changed
    const dimensionChanged = this.dimension !== params.dimension;
    
    this.strategy = newStrategy;
    this.dimension = params.dimension;
    this.particleManager.updatePhysicsEngine(newStrategy);
    // Update canvas size if provided so future initializations/mappings are correct
    if (params.canvasWidth && params.canvasHeight) {
      this.canvasWidth = params.canvasWidth;
      this.canvasHeight = params.canvasHeight;
      this.particleManager.setCanvasSize(this.canvasWidth, this.canvasHeight);
    }
    // Update distribution params
    if (params.initialDistType) this.initialDistType = params.initialDistType;
    if (params.distSigmaX !== undefined) this.distSigmaX = params.distSigmaX;
    if (params.distSigmaY !== undefined) this.distSigmaY = params.distSigmaY;
    if (params.distR0 !== undefined) this.distR0 = params.distR0;
    if (params.distDR !== undefined) this.distDR = params.distDR;
    if (params.distThickness !== undefined) this.distThickness = params.distThickness;
    if (params.distNx !== undefined) this.distNx = params.distNx;
    if (params.distNy !== undefined) this.distNy = params.distNy;
    if (params.distJitter !== undefined) this.distJitter = params.distJitter;
    
    // Update particle count if changed or reinitialize if dimension changed
    if (this.particleCount !== params.particleCount || dimensionChanged) {
      this.particleCount = params.particleCount;
      this.initializeParticles(); // Re-initialize with new count or dimension
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

  getDensityProfile1D(binSize: number = 10): {
    density: number[];
    xBounds: { min: number; max: number };
    binSize: number;
  } {
    const particles = this.particleManager.getAllParticles();
    const positions = particles.map(p => p.position);
    
    if (positions.length === 0) {
      return {
        density: [],
        xBounds: { min: 0, max: 0 },
        binSize
      };
    }
    
    // Calculate bounds
    const xMin = Math.min(...positions.map(p => p.x));
    const xMax = Math.max(...positions.map(p => p.x));
    const spatialRange = xMax - xMin;
    
    // Adaptive bin count based on particle count (smooth scaling)
    // Use square root scaling with a reasonable range: 15-60 bins
    const minBins = 15;
    const maxBins = 60;
    const optimalBins = Math.sqrt(this.particleCount) * 1.5;
    const xBins = Math.max(minBins, Math.min(maxBins, Math.round(optimalBins)));
    
    // Calculate effective bin size from adaptive bin count
    const effectiveBinSize = spatialRange / xBins;
    
    // Initialize 1D density array
    const density: number[] = Array(xBins).fill(0);
    
    // Bin particles
    positions.forEach(pos => {
      const xBin = Math.floor((pos.x - xMin) / effectiveBinSize);
      
      if (xBin >= 0 && xBin < xBins) {
        density[xBin]++;
      }
    });
    
    // Normalize by bin area and total particles
    const normalizedDensity = density.map(count => count / (this.particleCount * effectiveBinSize));
    
    return {
      density: normalizedDensity,
      xBounds: { min: xMin, max: xMax },
      binSize: effectiveBinSize
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