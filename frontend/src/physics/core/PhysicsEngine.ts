import type { Particle } from '../types/Particle';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { PhysicsContext } from '../types/PhysicsContext';
import { TimeManager } from './TimeManager';
import { CoordinateSystem, type Dimension } from './CoordinateSystem';
import { StrategyOrchestrator } from './StrategyOrchestrator';

export interface PhysicsEngineConfig {
  timeStep: number; // seconds
  boundaries: BoundaryConfig;
  canvasSize: { width: number; height: number };
  dimension: Dimension;
  strategies: PhysicsStrategy[];
}

export class PhysicsEngine {
  private timeManager: TimeManager;
  private coordinateSystem: CoordinateSystem;
  private orchestrator: StrategyOrchestrator;

  constructor(config: PhysicsEngineConfig) {
    this.timeManager = new TimeManager(config.timeStep);
    this.coordinateSystem = new CoordinateSystem(
      config.boundaries,
      config.canvasSize,
      config.dimension,
    );
    this.orchestrator = new StrategyOrchestrator(config.strategies);
  }

  step(particles: Particle[]): number {
    const dt = this.timeManager.advance();
    const context: PhysicsContext = {
      timeManager: this.timeManager,
      coordinateSystem: this.coordinateSystem,
      currentTime: this.timeManager.getCurrentTime(),
    };

    // Phase A: collision/scattering
    this.orchestrator.executePhaseA(particles, context);

    // Phase B: integration + boundaries
    this.orchestrator.executePhaseB(particles, dt, context);

    return dt;
  }

  reset(): void {
    this.timeManager.reset();
  }

  updateConfiguration(partial: Partial<Omit<PhysicsEngineConfig, 'strategies'>> & { strategies?: PhysicsStrategy[] }): void {
    if (partial.timeStep !== undefined) {
      this.timeManager.setTimeStep(partial.timeStep);
    }
    if (partial.boundaries || partial.canvasSize || partial.dimension) {
      if (partial.boundaries) this.coordinateSystem.updateBoundaries(partial.boundaries);
      if (partial.canvasSize) this.coordinateSystem.updateCanvasSize(partial.canvasSize);
      if (partial.dimension) this.coordinateSystem.updateDimension(partial.dimension);
    }
    if (partial.strategies) {
      this.orchestrator.setStrategies(partial.strategies);
    }
  }
}
