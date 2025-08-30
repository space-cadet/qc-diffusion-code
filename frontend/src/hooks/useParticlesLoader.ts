import { useCallback, useRef } from 'react';
import type { Container } from '@tsparticles/engine';
import { updateParticlesFromStrategies } from '../config/tsParticlesConfig';

export const useParticlesLoader = ({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  simulationStateRef,
  renderEnabledRef
}: {
  simulatorRef: React.MutableRefObject<any>,
  tsParticlesContainerRef: React.MutableRefObject<Container | null>,
  gridLayoutParamsRef: React.MutableRefObject<any>,
  simulationStateRef: React.MutableRefObject<any>,
  renderEnabledRef: React.MutableRefObject<boolean>
}) => {
  return useCallback((container: Container) => {
    tsParticlesContainerRef.current = container;
    
    // Rest of particlesLoaded implementation...
    // [Previous lines 567-665 would go here]
    
    const updateLoop = () => {
      if (simulatorRef.current) {
        // Physics update and rendering logic
      }
      requestAnimationFrame(updateLoop);
    };
    requestAnimationFrame(updateLoop);
  }, []);
};
