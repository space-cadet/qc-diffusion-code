import { useState, useCallback } from 'react';
import { SimulationController } from '../interfaces/SimulationController';
import { TimeSeriesStore } from '../interfaces/TimeSeriesStore';
import { SimplicialGrowthController } from '../controllers/SimplicialGrowthController';
import { SimplicialGrowthState, SimplicialGrowthParams } from '../types/simplicial';

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
 * useSimplicialGrowth Hook
 * Manages simplicial growth simulation state, history, and playback
 */
export function useSimplicialGrowth(
  initialParams?: SimplicialGrowthParams
): {
  controller: SimplicialGrowthController;
  store: TimeSeriesStore<SimplicialGrowthState>;
  currentState: SimplicialGrowthState | null;
  isRunning: boolean;
  currentStep: number;
  maxSteps: number;
  initialize: (params: SimplicialGrowthParams) => void;
  play: () => void;
  pause: () => void;
  step: () => void;
  reset: () => void;
  seek: (step: number) => void;
  exportCSV: (columns: string[]) => string;
} {
  const [controller] = useState(() => new SimplicialGrowthController());
  const [store] = useState(() => new InMemoryTimeSeriesStore<SimplicialGrowthState>());
  const [currentState, setCurrentState] = useState<SimplicialGrowthState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(0);

  const initialize = useCallback(
    (params: SimplicialGrowthParams) => {
      console.debug('[useSimplicialGrowth] Initialize');
      controller.initialize(params);
      store.clear();
      setCurrentState(controller.getState());
      setCurrentStep(0);
      setMaxSteps(0);
    },
    [controller, store]
  );

  const play = useCallback(() => {
    console.debug('[useSimplicialGrowth] Play');
    (controller as any).setRunning(true);
    setIsRunning(true);
  }, [controller]);

  const pause = useCallback(() => {
    console.debug('[useSimplicialGrowth] Pause');
    (controller as any).setRunning(false);
    setIsRunning(false);
  }, [controller]);

  const step = useCallback(() => {
    console.debug('[useSimplicialGrowth] Step triggered');
    const newState = controller.step();
    store.record(newState, currentStep);
    setCurrentState(newState);
    setCurrentStep(currentStep + 1);
    setMaxSteps(currentStep + 1);
  }, [controller, store, currentStep]);

  const reset = useCallback(() => {
    console.debug('[useSimplicialGrowth] Reset');
    controller.reset();
    setCurrentState(controller.getState());
    setCurrentStep(0);
    setIsRunning(false);
  }, [controller]);

  const seek = useCallback(
    (step: number) => {
      console.debug(`[useSimplicialGrowth] Seek to ${step}`);
      const state = controller.seekToStep(step);
      setCurrentState(state);
      setCurrentStep(step);
    },
    [controller]
  );

  const exportCSV = useCallback(
    (columns: string[]) => {
      console.debug('[useSimplicialGrowth] Export CSV');
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
