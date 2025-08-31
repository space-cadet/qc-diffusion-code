
import type { BoundaryConfig } from '../types/BoundaryConfig';

export interface SimulatorParams {
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
  initialDistType?: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid';
  distSigmaX?: number;
  distSigmaY?: number;
  distR0?: number;
  distDR?: number;
  distThickness?: number;
  distNx?: number;
  distNy?: number;
  distJitter?: number;
  temperature?: number;
}

export class ParameterManager {
  public collisionRate: number;
  public jumpLength: number;
  public velocity: number;
  public particleCount: number;
  public dimension: '1D' | '2D';
  public interparticleCollisions: boolean;
  public simulationType?: string;
  public graphType?: string;
  public graphSize?: number;
  public strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
  public boundaryCondition?: string;
  public canvasWidth: number;
  public canvasHeight: number;
  public initialDistType: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid';
  public distSigmaX: number;
  public distSigmaY: number;
  public distR0: number;
  public distDR: number;
  public distThickness: number;
  public distNx: number;
  public distNy: number;
  public distJitter: number;
  public temperature: number;

  constructor(params: SimulatorParams) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity;
    this.particleCount = params.particleCount;
    this.dimension = params.dimension;
    this.interparticleCollisions = params.interparticleCollisions;
    this.simulationType = params.simulationType;
    this.graphType = params.graphType;
    this.graphSize = params.graphSize;
    this.strategies = params.strategies;
    this.boundaryCondition = params.boundaryCondition;
    this.canvasWidth = params.canvasWidth || 800;
    this.canvasHeight = params.canvasHeight || 600;
    this.initialDistType = params.initialDistType || 'uniform';
    this.distSigmaX = params.distSigmaX || 80;
    this.distSigmaY = params.distSigmaY || 80;
    this.distR0 = params.distR0 || 150;
    this.distDR = params.distDR || 20;
    this.distThickness = params.distThickness || 40;
    this.distNx = params.distNx || 20;
    this.distNy = params.distNy || 15;
    this.distJitter = params.distJitter || 4;
    this.temperature = params.temperature || 1.0;
  }

  public updateParameters(params: Partial<SimulatorParams>): boolean {
    let needsReinitialization = false;

    if (params.dimension && params.dimension !== this.dimension) {
      this.dimension = params.dimension;
      needsReinitialization = true;
    }

    if (params.particleCount && params.particleCount !== this.particleCount) {
      this.particleCount = params.particleCount;
      needsReinitialization = true;
    }

    if (params.canvasWidth) {
      this.canvasWidth = params.canvasWidth;
    }
    if (params.canvasHeight) {
      this.canvasHeight = params.canvasHeight;
    }
    if (params.initialDistType) {
      this.initialDistType = params.initialDistType;
    }
    if (params.distSigmaX !== undefined) {
      this.distSigmaX = params.distSigmaX;
    }
    if (params.distSigmaY !== undefined) {
      this.distSigmaY = params.distSigmaY;
    }
    if (params.distR0 !== undefined) {
      this.distR0 = params.distR0;
    }
    if (params.distDR !== undefined) {
      this.distDR = params.distDR;
    }
    if (params.distThickness !== undefined) {
      this.distThickness = params.distThickness;
    }
    if (params.distNx !== undefined) {
      this.distNx = params.distNx;
    }
    if (params.distNy !== undefined) {
      this.distNy = params.distNy;
    }
    if (params.distJitter !== undefined) {
      this.distJitter = params.distJitter;
    }
    if (params.temperature !== undefined) {
      this.temperature = params.temperature;
    }
    if (params.strategies) {
        this.strategies = params.strategies;
    }
    if (params.boundaryCondition) {
        this.boundaryCondition = params.boundaryCondition;
    }

    return needsReinitialization;
  }

  public getPhysicsParameters(): { collisionRate: number; jumpLength: number; velocity: number } {
    return {
      collisionRate: this.collisionRate,
      jumpLength: this.jumpLength,
      velocity: this.velocity
    };
  }

  public validatePhysicsParameters(): boolean {
    return this.collisionRate > 0 && this.jumpLength > 0 && this.velocity > 0;
  }

  public getBoundaryConfig(): BoundaryConfig {
    const halfWidth = this.canvasWidth / 2;
    const halfHeight = this.canvasHeight / 2;
    return {
      type: (this.boundaryCondition || 'periodic') as 'periodic' | 'reflective' | 'absorbing',
      xMin: -halfWidth,
      xMax: halfWidth,
      yMin: -halfHeight,
      yMax: halfHeight
    };
  }
}
