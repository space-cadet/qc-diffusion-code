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
}

export interface SolutionData {
  x: number[];
  u: number[];
  time: number;
}

export interface SimulationResult {
  telegraph: SolutionData;
  diffusion: SolutionData;
}

export interface FrameData {
  x: number[];
  u: number[];
}

export interface AnimationFrame {
  time: number;
  telegraph: FrameData;
  diffusion: FrameData;
}

export interface WebSocketMessage {
  type: 'simulation_result' | 'animation_frame' | 'error';
  data?: SimulationResult | AnimationFrame;
  message?: string;
}

export interface PlotData {
  x: number[];
  y: number[];
  type: 'scatter';
  mode: 'lines';
  name: string;
  line?: {
    color: string;
  };
}
