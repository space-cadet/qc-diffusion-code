export interface SimulationState {
  isRunning: boolean;
  time: number;
  collisions: number;
  status: 'Running' | 'Paused' | 'Stopped';
}
