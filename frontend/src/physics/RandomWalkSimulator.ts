import type { RandomWalkStrategy } from './interfaces/RandomWalkStrategy';
import type { BoundaryConfig } from './types/BoundaryConfig';
import { ParticleManager } from './ParticleManager';
import { CTRWStrategy1D } from './strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from './strategies/CTRWStrategy2D';
import { LegacyBallisticStrategy as BallisticStrategy } from './strategies/LegacyBallisticStrategy';
import { LegacyRandomWalkStrategy } from './strategies/LegacyRandomWalkStrategy';
import { CompositeStrategy } from './strategies/CompositeStrategy';
import { InterparticleCollisionStrategy } from './strategies/InterparticleCollisionStrategy';
import { InterparticleCollisionStrategy1D } from './strategies/InterparticleCollisionStrategy1D';
import { ObservableManager } from './ObservableManager';
import type { Observable } from './interfaces/Observable';
// New engine scaffolding (feature-flagged, no behavior change)
import { USE_NEW_ENGINE } from './config/flags';
import { PhysicsEngine } from './core/PhysicsEngine';
import { LegacyStrategyAdapter } from './adapters/LegacyStrategyAdapter';
import { CoordinateSystem } from './core/CoordinateSystem';

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
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
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
  // Temperature control for thermal velocity distribution
  temperature?: number;
}

export class RandomWalkSimulator {
  private particleManager: ParticleManager;
  private strategies: RandomWalkStrategy[] = [];
  private currentStrategy: RandomWalkStrategy;
  private boundaryConfig: BoundaryConfig;
  private dimension: '1D' | '2D';
  private particleCount: number;
  private physicsEngine?: PhysicsEngine;
  private time: number = 0;
  private observableManager: ObservableManager;
  private canvasWidth: number = 800;
  private canvasHeight: number = 600;
  private readonly useNewEngine: boolean = USE_NEW_ENGINE === true;
  private initialDistType: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid' = 'uniform';
  private distSigmaX: number = 80;
  private distSigmaY: number = 80;
  private distR0: number = 150;
  private distDR: number = 20;
  private distThickness: number = 40;
  private distNx: number = 20;
  private distNy: number = 15;
  private distJitter: number = 4;
  private temperature: number = 1.0; // Thermal temperature parameter (default: 1.0)
  private densityHistory: Array<{
    time: number;
    density: number[][];
    bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
  }> = [];

  constructor(config: SimulatorParams) {
    this.canvasWidth = config.canvasWidth || 800;
    this.canvasHeight = config.canvasHeight || 600;
    this.dimension = config.dimension || '2D';
    this.particleCount = config.particleCount || 100;
    
    // Initialize boundary config
    this.boundaryConfig = {
      type: (config.boundaryCondition || 'reflective') as 'periodic' | 'reflective' | 'absorbing',
      xMin: -200,
      xMax: 200,
      yMin: -200,
      yMax: 200
    };
    
    // Initialize strategies
    this.initializeStrategies(config);
    this.currentStrategy = this.strategies[0];
    
    // Initialize coordinate system (centralized or fallback)
    let coordinateSystem: CoordinateSystem;
    
    // Initialize new engine (flagged). Behavior unchanged: engine not used in step() yet.
    if (this.useNewEngine) {
      try {
        const adapter = new LegacyStrategyAdapter(
          this.currentStrategy,
          () => this.particleManager.getAllParticles()
        );
        this.physicsEngine = new PhysicsEngine({
          timeStep: 0.01,
          boundaries: this.boundaryConfig,
          canvasSize: { width: this.canvasWidth, height: this.canvasHeight },
          dimension: this.dimension,
          strategies: [adapter],
        });
        // Use centralized coordinate system from PhysicsEngine
        coordinateSystem = this.physicsEngine.getCoordinateSystem();
      } catch (e) {
        console.warn('[RandomWalkSimulator] Failed to initialize PhysicsEngine (fallback to legacy path):', e);
        this.physicsEngine = undefined;
        // Fallback: create local coordinate system
        coordinateSystem = new CoordinateSystem(
          this.boundaryConfig,
          { width: this.canvasWidth, height: this.canvasHeight },
          this.dimension
        );
      }
    } else {
      // Legacy path: create local coordinate system
      coordinateSystem = new CoordinateSystem(
        this.boundaryConfig,
        { width: this.canvasWidth, height: this.canvasHeight },
        this.dimension
      );
    }
    
    this.particleManager = new ParticleManager(this.currentStrategy, this.dimension, coordinateSystem);
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

  private initializeStrategies(config: SimulatorParams): void {
    const selectedStrategies = config.strategies || [];

    // For 1D, compose strategies: base is CTRW1D if selected else Ballistic; collisions added if selected
    if (config.dimension === '1D') {
      const oneDStrategies: RandomWalkStrategy[] = [];
      if (selectedStrategies.includes('ctrw')) {
        oneDStrategies.push(new CTRWStrategy1D({
          collisionRate: 1,
          jumpLength: 1,
          velocity: 1,
          boundaryConfig: this.boundaryConfig,
          interparticleCollisions: false, // collisions handled via separate 1D strategy below
        }));
      } else {
        oneDStrategies.push(new BallisticStrategy({ boundaryConfig: this.boundaryConfig }));
      }
      if (selectedStrategies.includes('collisions')) {
        oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: this.boundaryConfig }));
      }
      this.strategies = oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies)];
    }

    // For 2D, compose strategies: base is Ballistic; others are added if selected
    else {
      const twoDStrategies: RandomWalkStrategy[] = [new BallisticStrategy({ boundaryConfig: this.boundaryConfig })];

      if (selectedStrategies.includes('ctrw')) {
        twoDStrategies.push(new CTRWStrategy2D({
          collisionRate: 1,
          jumpLength: 1,
          velocity: 1,
          boundaryConfig: this.boundaryConfig,
        }));
      }

      if (selectedStrategies.includes('collisions')) {
        twoDStrategies.push(new InterparticleCollisionStrategy({ boundaryConfig: this.boundaryConfig }));
      }

      this.strategies = twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies)];
    }
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

    // Generate thermal velocities with momentum conservation
    const thermalVelocities = this.generateThermalVelocities(this.particleCount, this.dimension);

    // Create new particles with random positions and thermal velocities
    // IMPORTANT: pass positions in CANVAS coordinates here.
    // ParticleManager.initializeParticle() converts canvas -> physics via mapToPhysics().
    const positions: {x: number, y: number}[] = [];
    
    // Clear any existing particles first
    this.particleManager.clearAllParticles();
    
    for (let i = 0; i < this.particleCount; i++) {
      const pos = this.sampleCanvasPosition(i);
      positions.push(pos);
      const thermalVelocity = thermalVelocities[i];
      
      // Log first few particle positions and velocities
      if (i < 3) {
        console.log('[RWS] init particle', i, {
          position: pos,
          velocity: thermalVelocity,
          canvasSize: { width: this.canvasWidth, height: this.canvasHeight }
        });
      }
      
      const tsParticle = {
        id: `p${i}`,
        position: pos,
        velocity: thermalVelocity
      };
      this.particleManager.initializeParticle(tsParticle);
    }
    
    // Log detailed coordinate statistics
    const xCoords = positions.map(p => p.x);
    const yCoords = positions.map(p => p.y);
    console.log('[RWS] Initial particle coordinate statistics:', {
      xMin: Math.min(...xCoords),
      xMax: Math.max(...xCoords),
      yMin: Math.min(...yCoords),
      yMax: Math.max(...yCoords),
      hasNaN: xCoords.some(isNaN) || yCoords.some(isNaN),
      hasInfinity: xCoords.some(x => !isFinite(x)) || yCoords.some(y => !isFinite(y)),
      particleCount: this.particleCount,
      positionsSample: positions.slice(0, 3),
      canvasSize: { width: this.canvasWidth, height: this.canvasHeight }
    });
  }

  private generateThermalVelocities(count: number, dimension: '1D' | '2D'): Array<{vx: number, vy: number}> {
    // Use temperature to scale thermal velocities (Maxwell-Boltzmann distribution)
    const thermalSpeed = 50 * Math.sqrt(this.temperature); // Scale base speed by sqrt(T)
    const velocities: Array<{vx: number, vy: number}> = [];

    // Generate individual thermal velocities (Maxwell-Boltzmann-like)
    for (let i = 0; i < count; i++) {
      const vx = thermalSpeed * this.gaussianRandom();
      const vy = dimension === '1D' ? 0 : thermalSpeed * this.gaussianRandom();
      velocities.push({ vx, vy });
    }

    // DIAG: stats before momentum correction
    if (count > 0) {
      const speeds = velocities.map(v => Math.hypot(v.vx, v.vy));
      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const max = Math.max(...speeds);
      const min = Math.min(...speeds);
      console.log('[RWS] thermal pre-center stats', {
        temperature: this.temperature,
        thermalSpeed,
        avg: avg.toFixed(4),
        min: min.toFixed(4),
        max: max.toFixed(4),
        sample: velocities.slice(0, 3).map(v => ({ vx: v.vx.toFixed(4), vy: v.vy.toFixed(4) })),
      });
    }

    // TEMPORARILY DISABLE momentum conservation for debugging
    // Apply momentum conservation (center of mass velocity = 0)
    const totalVx = velocities.reduce((sum, v) => sum + v.vx, 0);
    const totalVy = velocities.reduce((sum, v) => sum + v.vy, 0);
    const avgVx = totalVx / count;
    const avgVy = totalVy / count;

    console.log('[RWS] momentum conservation disabled for debugging');
    // // Subtract center-of-mass velocity from each particle
    // velocities.forEach(v => {
    //   v.vx -= avgVx;
    //   v.vy -= avgVy;
    // });

    // DIAG: stats after momentum correction
    if (count > 0) {
      const speeds = velocities.map(v => Math.hypot(v.vx, v.vy));
      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      const max = Math.max(...speeds);
      const min = Math.min(...speeds);
      const cm = {
        vx: avgVx.toFixed(6),
        vy: avgVy.toFixed(6),
      };
      console.log('[RWS] thermal post-center stats', {
        temperature: this.temperature,
        thermalSpeed,
        avg: avg.toFixed(4),
        min: min.toFixed(4),
        max: max.toFixed(4),
        centerOfMass: cm,
        sample: velocities.slice(0, 3).map(v => ({ vx: v.vx.toFixed(4), vy: v.vy.toFixed(4) })),
      });
    }

    return velocities;
  }

  private gaussianRandom(): number {
    // Box-Muller transform for Gaussian random numbers
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  step(dt: number): void {
    console.log('[RWS] step called', { dt, time: this.time, useNewEngine: this.useNewEngine });
    
    if (this.useNewEngine && this.physicsEngine) {
      // New engine path
      console.log('[RWS] using new engine path');
      const particles = this.particleManager.getAllParticles();
      const engineDt = this.physicsEngine.step(particles);
      this.time += engineDt;
    } else {
      // Legacy path (current implementation)
      console.log('[RWS] using legacy path, calling particleManager.update');
      this.time += dt;
      this.particleManager.update(dt);
    }
    
    // Update observable snapshot after physics step
    const particles = this.particleManager.getAllParticles();
    this.observableManager.updateSnapshot(particles, this.time);
  }

  reset(): void {
    this.time = 0;
    this.initializeParticles();
  }

  updateParameters(params: SimulatorParams): void {
    const boundaryConfig = this.createBoundaryConfig(params);
    this.initializeStrategies(params);
    this.currentStrategy = this.strategies[0];
    
    // Check if dimension changed
    const dimensionChanged = this.dimension !== params.dimension;
    
    this.dimension = params.dimension;
    this.particleManager.updatePhysicsEngine(this.currentStrategy);
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
    if (params.temperature !== undefined) this.temperature = params.temperature;
    
    // Update particle count if changed or reinitialize if dimension changed
    if (this.particleCount !== params.particleCount || dimensionChanged) {
      this.particleCount = params.particleCount;
      this.initializeParticles(); // Re-initialize with new count or dimension
    }
  }

  getDensityField() {
    const particles = this.particleManager.getAllParticles();
    if (particles.length === 0 || this.particleCount <= 0) {
      return { error: 0, rho: [] as number[] };
    }
    
    const positions = particles.map(p => p.position);
    const dx = 0.1;
    const xMin = Math.min(...positions.map(p => p.x));
    const xMax = Math.max(...positions.map(p => p.x));
    
    // Validate bounds before creating array
    if (!isFinite(xMin) || !isFinite(xMax) || xMin >= xMax) {
      console.error('[DensityField] Invalid bounds:', {xMin, xMax, positions});
      return { error: 0, rho: [] as number[] };
    }
    
    const range = xMax - xMin;
    const bins = Math.min(1000, Math.max(1, Math.ceil(range / dx))); // Limit bins to 1000 maximum
    
    const rho = new Array(bins).fill(0);
    positions.forEach(pos => {
      const bin = Math.floor(((pos.x - xMin) / range) * bins);
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

  // Expose physics engine (feature-flagged); may be undefined if flag is off or init failed
  getPhysicsEngine(): PhysicsEngine | undefined {
    return this.physicsEngine;
  }

  getParticleCount(): number {
    return this.particleCount;
  }

  getDimension(): '1D' | '2D' {
    return this.dimension;
  }

  public getStrategy(): string {
    return this.currentStrategy.constructor.name;
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
      
      // Keep only last 10 snapshots to prevent memory leaks
      // Reduced from 100 to 10 to prevent GB-level memory usage
      if (this.densityHistory.length > 10) {
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

  // Memory cleanup method to prevent leaks
  dispose(): void {
    this.clearDensityHistory();
    // Clear all observables using available methods
    this.observableManager.reset();
    // Clear any other potential memory references
    if (this.physicsEngine) {
      // Note: PhysicsEngine disposal would need to be implemented there
      this.physicsEngine = undefined;
    }
  }



  analyzeWaveFrontSpeed(): { measuredSpeed: number; theoreticalSpeed: number; error: number } {
    if (this.densityHistory.length < 2) {
      return { measuredSpeed: 0, theoreticalSpeed: 0, error: 0 };
    }

    // Calculate theoretical speed: c = 1/√(τε) where τ is collision time, ε is jump length factor
    const parameters = this.currentStrategy.getParameters ? this.currentStrategy.getParameters() : { collisionRate: 1, velocity: 1 };
    const collisionRate = parameters?.collisionRate || 1;
    const velocity = parameters?.velocity || 1;
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