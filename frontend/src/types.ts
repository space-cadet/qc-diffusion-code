export interface SimulationParams {
  collision_rate: number;
  velocity: number;
  diffusivity: number;
  t_range: number;
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

export interface WebSocketMessage {
  type: 'simulation_result' | 'error';
  data?: SimulationResult;
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
