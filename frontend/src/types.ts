export interface SolverConfig {
  telegraph: string;
  diffusion: string;
  wheeler_dewitt?: string;
}

export interface SimulationParams {
  collision_rate: number;
  velocity: number;
  diffusivity: number;
  t_range: number;
  dt: number;
  distribution: string;
  // Distribution parameters (1D)
  dist_center?: number;      // for gaussian/delta
  dist_sigma?: number;       // for gaussian/delta
  step_left?: number;        // for step
  step_right?: number;       // for step
  step_height?: number;      // for step height
  sine_freq?: number;        // for sine
  sine_amp?: number;         // for sine
  cos_freq?: number;         // for cosine
  cos_amp?: number;          // for cosine
  dg_center1?: number;       // for double_gaussian
  dg_sigma1?: number;
  dg_center2?: number;
  dg_sigma2?: number;
  dg_weight?: number;        // mix weight of first vs second
  x_min: number;
  x_max: number;
  mesh_size: number;
  solver_type?: 'python' | 'webgl';
  solver_config?: SolverConfig;
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

export type WebSocketMessage = {
  type: "animation_frame" | "simulation_result" | "error" | "pause_state";
  data?: AnimationFrame | SimulationResult | { isRunning: boolean };
  message?: string;
};

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
