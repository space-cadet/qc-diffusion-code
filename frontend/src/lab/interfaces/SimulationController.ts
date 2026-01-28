/**
 * SimulationController Interface
 * Core protocol for all simulation types in the lab framework
 */

export interface SimulationController<TState, TParams> {
  // Lifecycle management
  initialize(params: TParams): void;
  step(): TState;
  reset(): void;

  // State access
  getState(): TState;
  getHistory(): TState[];
  seekToStep(n: number): TState;

  // Status queries
  isRunning(): boolean;
  getCurrentStep(): number;
}
