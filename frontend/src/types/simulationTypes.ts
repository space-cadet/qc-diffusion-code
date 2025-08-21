export interface SimulationState {
  isRunning: boolean;
  time: number;
  collisions: number;
  status: 'Running' | 'Paused' | 'Stopped';
}

export interface GridLayoutParams {
  simulationType: 'continuum' | 'graph';
  collisionRate: number;
  jumpLength: number;
  velocity: number;
  particles: number;
  graphType?: string;
  graphSize?: number;
  showAnimation: boolean;
  // Add other params as needed
}
