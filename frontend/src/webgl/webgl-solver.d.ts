// webgl-solver.d.ts - TypeScript declarations for WebGL solver

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
  setBoundaryCondition(bc: any): void;
  
  init(width: number, height: number): void;
  
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
