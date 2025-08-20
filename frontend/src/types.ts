export interface SimulationParams {
  collision_rate: number;
  velocity: number;
  diffusivity: number;
  t_range: number;
  dt: number;
  distribution: string;
  x_min: number;
  x_max: number;
  mesh_size: number;
  solver_type?: 'python' | 'webgl';
  selectedEquations?: string[];
}

export interface SolutionData {
  time: number;
  x: number[];
  u: number[];
  w?: number[];
  [key: string]: any;
}

export type SimulationResult = {
  [equationType: string]: SolutionData;
} & { time: number };

export interface FrameData {
  x: number[];
  u: number[];
  w?: number[]; // Velocity field for telegraph equation
}

export interface AnimationFrame {
  time: number;
  [equationType: string]: FrameData | number;
}

export interface EquationMetadata {
  name: string;
  displayName: string;
  color: string;
  parameters: string[];
}

export interface WebSocketMessage {
  type: 'simulation_result' | 'animation_frame' | 'error';
  data?: SimulationResult | AnimationFrame;
  message?: string;
}

export interface PlotData {
  x: number[];
  y: number[];
  w?: number[];
  type: 'scatter';
  mode: 'lines';
  name: string;
  line?: {
    color: string;
  };
}
