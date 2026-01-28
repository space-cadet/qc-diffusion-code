import { useState, useCallback } from 'react';
import { SimulationController } from '../interfaces/SimulationController';
import { TimeSeriesStore } from '../interfaces/TimeSeriesStore';

/**
 * Simple in-memory TimeSeriesStore implementation
 */
class InMemoryTimeSeriesStore<T> implements TimeSeriesStore<T> {
  private data: { timestamp: number; state: T }[] = [];

  record(state: T, timestamp: number): void {
    console.debug(`[TimeSeriesStore] Recording state at ${timestamp}, total records: ${this.data.length + 1}`);
    this.data.push({ timestamp, state });
  }

  clear(): void {
    console.debug('[TimeSeriesStore] Clearing all records');
    this.data = [];
  }

  seek(step: number): T | null {
    if (step < 0 || step >= this.data.length) {
      console.debug(`[TimeSeriesStore] Seek out of bounds: ${step} (size: ${this.data.length})`);
      return null;
    }
    console.debug(`[TimeSeriesStore] Seeking to step ${step}`);
    return this.data[step].state;
  }

  getRange(start: number, end: number): T[] {
    console.debug(`[TimeSeriesStore] Getting range [${start}, ${end}]`);
    return this.data.slice(start, end + 1).map((d) => d.state);
  }

  toArray(): { timestamp: number; state: T }[] {
    return [...this.data];
  }

  toCSV(columns: string[]): string {
    console.debug(`[TimeSeriesStore] Exporting CSV with ${columns.length} columns`);
    const header = ['timestamp', ...columns].join(',');
    const rows = this.data.map((d) => {
      const values = columns.map((col) => {
        const val = (d.state as any)[col];
        return typeof val === 'number' ? val.toFixed(6) : val;
      });
      return [d.timestamp, ...values].join(',');
    });
    return [header, ...rows].join('\n');
  }

  size(): number {
    return this.data.length;
  }
}

/**
 * Mock SimulationController for demo purposes
 */
class DemoController<TState, TParams> implements SimulationController<TState, TParams> {
  private state: TState | null = null;
  private history: TState[] = [];
  private currentStep = 0;
  private running = false;

  initialize(params: TParams): void {
    console.debug('[DemoController] Initialize with params:', params);
    this.state = { step: 0, value: Math.random() * 100 } as any;
    this.history = [this.state];
    this.currentStep = 0;
  }

  step(): TState {
    if (!this.state) throw new Error('Controller not initialized');
    const newState = { ...this.state, step: this.currentStep + 1, value: Math.random() * 100 } as any;
    this.state = newState;
    this.history.push(newState);
    this.currentStep++;
    console.debug(`[DemoController] Step ${this.currentStep}, state:`, newState);
    return this.state;
  }

  reset(): void {
    console.debug('[DemoController] Reset');
    this.currentStep = 0;
    if (this.history.length > 0) {
      this.state = this.history[0];
    }
  }

  getState(): TState {
    if (!this.state) throw new Error('Controller not initialized');
    return this.state;
  }

  getHistory(): TState[] {
    return [...this.history];
  }

  seekToStep(n: number): TState {
    if (n < 0 || n >= this.history.length) {
      throw new Error(`Step ${n} out of bounds [0, ${this.history.length - 1}]`);
    }
    this.currentStep = n;
    this.state = this.history[n];
    console.debug(`[DemoController] Seek to step ${n}`);
    return this.state;
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }
}

/**
 * useSimulation Hook
 * Manages simulation state, history, and playback
 */
export function useSimulation<TState, TParams>(
  initialParams?: TParams
): {
  controller: SimulationController<TState, TParams>;
  store: TimeSeriesStore<TState>;
  currentState: TState | null;
  isRunning: boolean;
  currentStep: number;
  maxSteps: number;
  initialize: (params: TParams) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  seek: (step: number) => void;
  exportCSV: (columns: string[]) => string;
} {
  const [controller] = useState(() => new DemoController<TState, TParams>());
  const [store] = useState(() => new InMemoryTimeSeriesStore<TState>());
  const [currentState, setCurrentState] = useState<TState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(0);

  const initialize = useCallback(
    (params: TParams) => {
      console.debug('[useSimulation] Initialize');
      controller.initialize(params);
      store.clear();
      setCurrentState(controller.getState());
      setCurrentStep(0);
      setMaxSteps(0);
    },
    [controller, store]
  );

  const play = useCallback(() => {
    console.debug('[useSimulation] Play');
    (controller as any).setRunning(true);
    setIsRunning(true);
  }, [controller]);

  const pause = useCallback(() => {
    console.debug('[useSimulation] Pause');
    (controller as any).setRunning(false);
    setIsRunning(false);
  }, [controller]);

  const step = useCallback(() => {
    if (!isRunning) {
      console.debug('[useSimulation] Single step');
      const newState = controller.step();
      store.record(newState, currentStep);
      setCurrentState(newState);
      setCurrentStep(currentStep + 1);
      setMaxSteps(currentStep + 1);
    }
  }, [controller, store, currentStep, isRunning]);

  const reset = useCallback(() => {
    console.debug('[useSimulation] Reset');
    controller.reset();
    setCurrentState(controller.getState());
    setCurrentStep(0);
    setIsRunning(false);
  }, [controller]);

  const seek = useCallback(
    (step: number) => {
      console.debug(`[useSimulation] Seek to ${step}`);
      const state = controller.seekToStep(step);
      setCurrentState(state);
      setCurrentStep(step);
    },
    [controller]
  );

  const exportCSV = useCallback(
    (columns: string[]) => {
      console.debug('[useSimulation] Export CSV');
      return store.toCSV(columns);
    },
    [store]
  );

  return {
    controller,
    store,
    currentState,
    isRunning,
    currentStep,
    maxSteps,
    initialize,
    play,
    pause,
    step,
    reset,
    seek,
    exportCSV,
  };
}
