/**
 * useBoundaryGrowth Hook (T30)
 * Manages boundary growth simulation state, history, and playback.
 */

import { useState, useCallback } from 'react';
import { BoundaryGrowthController } from '../controllers/BoundaryGrowthController';
import { BoundaryGrowthState, BoundaryGrowthParams } from '../types/simplicial';

export function useBoundaryGrowth() {
  const [controller] = useState(() => new BoundaryGrowthController());
  const [currentState, setCurrentState] = useState<BoundaryGrowthState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxSteps, setMaxSteps] = useState(0);

  const initialize = useCallback(
    (params: BoundaryGrowthParams) => {
      console.debug('[useBoundaryGrowth] Initialize');
      controller.initialize(params);
      setCurrentState(controller.getState());
      setCurrentStep(0);
      setMaxSteps(0);
      setIsRunning(false);
    },
    [controller],
  );

  const play = useCallback(() => {
    console.debug('[useBoundaryGrowth] Play');
    controller.setRunning(true);
    setIsRunning(true);
  }, [controller]);

  const pause = useCallback(() => {
    console.debug('[useBoundaryGrowth] Pause');
    controller.setRunning(false);
    setIsRunning(false);
  }, [controller]);

  const step = useCallback(() => {
    console.debug('[useBoundaryGrowth] Step');
    const newState = controller.step();
    setCurrentState(newState);
    setCurrentStep(prev => prev + 1);
    setMaxSteps(prev => prev + 1);
  }, [controller]);

  const reset = useCallback(() => {
    console.debug('[useBoundaryGrowth] Reset');
    controller.reset();
    setCurrentState(controller.getState());
    setCurrentStep(0);
    setMaxSteps(0);
    setIsRunning(false);
  }, [controller]);

  const seek = useCallback(
    (step: number) => {
      console.debug(`[useBoundaryGrowth] Seek to ${step}`);
      const state = controller.seekToStep(step);
      setCurrentState(state);
      setCurrentStep(step);
    },
    [controller],
  );

  return {
    controller,
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
  };
}
