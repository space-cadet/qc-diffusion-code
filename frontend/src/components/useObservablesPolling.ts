import { useState, useEffect, useRef, useCallback } from 'react';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import { BUILT_IN_OBSERVABLES } from './observablesConfig';

interface ObservableData {
  [key: string]: any;
  timestamp?: number;
}

interface PollingState {
  lastPollTime: number;
  data: ObservableData | null;
}

export function useObservablesPolling(
  simulatorRef: React.RefObject<RandomWalkSimulator | null>,
  visibleObservables: string[],
  isRunning: boolean,
  simReady: boolean
) {
  const [observableData, setObservableData] = useState<Record<string, ObservableData | null>>({});
  const pollingStatesRef = useRef<Record<string, PollingState>>({});
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize polling states for visible observables
  const initializePollingStates = useCallback(() => {
    const newStates: Record<string, PollingState> = {};
    visibleObservables.forEach(observableId => {
      if (BUILT_IN_OBSERVABLES[observableId]) {
        newStates[observableId] = {
          lastPollTime: 0,
          data: pollingStatesRef.current[observableId]?.data || null
        };
      }
    });
    pollingStatesRef.current = newStates;
  }, [visibleObservables]);

  // Poll a single observable
  const pollObservable = useCallback((observableId: string) => {
    if (!simulatorRef.current) return;

    // Use text_ prefixed ID for built-in observables
    const managerId = BUILT_IN_OBSERVABLES[observableId] ? `text_${observableId}` : observableId;
    const data = simulatorRef.current.getObservableData(managerId);
    if (data) {
      setObservableData(prev => ({
        ...prev,
        [observableId]: data
      }));

      pollingStatesRef.current[observableId] = {
        ...pollingStatesRef.current[observableId],
        data,
        lastPollTime: Date.now()
      };
    }
  }, [simulatorRef]);

  // Main polling loop
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling

    const POLLING_RESOLUTION = 50; // Check every 50ms

    intervalRef.current = setInterval(() => {
      const currentTime = Date.now();

      visibleObservables.forEach(observableId => {
        const config = BUILT_IN_OBSERVABLES[observableId];
        const state = pollingStatesRef.current[observableId];

        if (!config || !state) return;

        // Check if it's time to poll this observable
        if (currentTime - state.lastPollTime >= config.pollingInterval) {
          pollObservable(observableId);
        }
      });
    }, POLLING_RESOLUTION);
  }, [visibleObservables, pollObservable]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initialize polling states when visible observables change
  useEffect(() => {
    initializePollingStates();
  }, [initializePollingStates]);

  // Start/stop polling based on running state
  useEffect(() => {
    if (!simReady) return;

    if (isRunning && visibleObservables.length > 0) {
      startPolling();
    } else {
      stopPolling();
      // Get final data when stopped
      visibleObservables.forEach(observableId => {
        pollObservable(observableId);
      });
    }

    return () => stopPolling();
  }, [isRunning, simReady, visibleObservables, startPolling, stopPolling, pollObservable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return observableData;
}
