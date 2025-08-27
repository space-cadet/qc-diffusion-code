// webgl-solver.d.ts - TypeScript declarations for WebGL solver
import type { BoundaryConditionType } from '../types';

export interface PlotData {
  x: number[];
  u: number[];
}

export interface SolverParameters {
  a?: number;
  v?: number;
  k?: number;
  dx?: number;
  [key: string]: number | undefined;
}

export declare class WebGLSolver {
  constructor(canvas: HTMLCanvasElement);
  
  init(width: number, height: number, bcType?: BoundaryConditionType, dirichletValue?: number): void;
  
  setupEquation(
    equationType: 'telegraph' | 'diffusion', 
    parameters: SolverParameters
  ): void;
  
  setInitialConditions(
    distribution: string, 
    xMin: number, 
    xMax: number
  ): void;
  
  setInitialProfile(u: number[]): void;
  
  step(
    dt: number, 
    parameters: SolverParameters, 
    xMin?: number, 
    xMax?: number
  ): void;
  
  extractPlotData(xMin: number, xMax: number): PlotData;
  
  readPixels(): Float32Array;
  
  getTexture(): WebGLTexture;
}
