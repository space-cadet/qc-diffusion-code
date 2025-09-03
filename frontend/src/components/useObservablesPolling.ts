import { useState, useEffect, useRef, useCallback } from 'react';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import { BUILT_IN_OBSERVABLES } from './observablesConfig';

interface ObservableData {
  [key: string]: any;
  timestamp?: number;
}

interface CustomObservableConfig {
  name: string;
  interval: number;
  valid: boolean;
}

interface ObservablePollingState {
  nextPollTime: number;
  interval: number;
  data: ObservableData | null;
}

const DELTA_MIN = 25; // 25ms minimum polling interval

export function useObservablesPolling(
  simulatorRef: React.RefObject<RandomWalkSimulator | null>,
  visibleObservables: string[],
  customObservableConfigs: CustomObservableConfig[],
  isRunning: boolean,
  simReady: boolean
) {
  const [observableData, setObservableData] = useState<Record<string, ObservableData | null>>({});
  const pollingStatesRef = useRef<Record<string, ObservablePollingState>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Round interval to nearest multiple of DELTA_MIN
  const roundToMultiple = useCallback((interval: number) => {
    return Math.max(DELTA_MIN, Math.round(interval / DELTA_MIN) * DELTA_MIN);
  }, []);

  // Initialize polling states for all visible observables
  const initializePollingStates = useCallback(() => {
    const newStates: Record<string, ObservablePollingState> = {};
    const now = Date.now();
    
    // Built-in observables
    visibleObservables.forEach(observableId => {
      const config = BUILT_IN_OBSERVABLES[observableId];
      if (config) {
        newStates[observableId] = {
          nextPollTime: now,
          interval: roundToMultiple(config.pollingInterval),
          data: pollingStatesRef.current[observableId]?.data || null
        };
      }
    });

    // Custom observables
    customObservableConfigs
      .filter(config => config.valid)
      .forEach(config => {
        const observableId = `text_${config.name}`;
        if (visibleObservables.includes(observableId)) {
          newStates[observableId] = {
            nextPollTime: now,
            interval: roundToMultiple(config.interval),
            data: pollingStatesRef.current[observableId]?.data || null
          };
        }
      });

    pollingStatesRef.current = newStates;
  }, [visibleObservables, customObservableConfigs, roundToMultiple]);

  // Poll a single observable
  const pollObservable = useCallback((observableId: string) => {
    if (!simulatorRef.current) return;

    const observableManager = simulatorRef.current.getObservableManager();
    if (!('getResult' in observableManager)) {
      return;
    }

    // For built-in observables that now use text system, try text_ prefix
    let data = simulatorRef.current.getObservableData(observableId);
    if (!data && (observableId === 'particleCount' || observableId === 'kineticEnergy')) {
      data = simulatorRef.current.getObservableData(`text_${observableId}`);
    }

    if (data) {
      setObservableData(prev => ({
        ...prev,
        [observableId]: data
      }));

      const state = pollingStatesRef.current[observableId];
      if (state) {
        state.data = data;
      }
    }
  }, [simulatorRef]);

  // Single timer with 25ms resolution
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      
      Object.keys(pollingStatesRef.current).forEach(observableId => {
        const state = pollingStatesRef.current[observableId];
        if (now >= state.nextPollTime) {
          pollObservable(observableId);
          state.nextPollTime = now + state.interval;
        }
      });
    }, DELTA_MIN);
  }, [pollObservable]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize polling states when observables change
  useEffect(() => {
    initializePollingStates();
  }, [initializePollingStates]);

  // Start/stop polling based on running state
  useEffect(() => {
    if (!simReady) return;

    if (isRunning && Object.keys(pollingStatesRef.current).length > 0) {
      startPolling();
    } else {
      stopPolling();
      // Get final data when stopped
      Object.keys(pollingStatesRef.current).forEach(observableId => {
        pollObservable(observableId);
      });
    }

    return () => stopPolling();
  }, [isRunning, simReady, startPolling, stopPolling, pollObservable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return observableData;
}
