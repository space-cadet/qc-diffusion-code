import { useCallback, useRef } from 'react';
import type { Container } from '@tsparticles/engine';
import { updateParticlesFromStrategies } from '../config/tsParticlesConfig';

export const useParticlesLoader = ({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  simulationStateRef,
  renderEnabledRef,
  timeRef,
  collisionsRef
}: {
  simulatorRef: React.MutableRefObject<any>,
  tsParticlesContainerRef: React.MutableRefObject<Container | null>,
  gridLayoutParamsRef: React.MutableRefObject<any>,
  simulationStateRef: React.MutableRefObject<any>,
  renderEnabledRef: React.MutableRefObject<boolean>,
  timeRef: React.MutableRefObject<number>,
  collisionsRef: React.MutableRefObject<number>
}) => {
  return useCallback((container: Container) => {
    tsParticlesContainerRef.current = container;

    // Store previous time for delta calculation (render timing)
    let lastRenderTime = performance.now();
    let accumulatedTime = 0; // For fixed physics timestep

    const animate = () => {
      const currentRenderTime = performance.now();
      const renderDeltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      // Accumulate time for physics steps (migration plan: unified time)
      accumulatedTime += renderDeltaTime;

      // PHASE A: Physics Simulation (migration plan: controlled by simulation state)
      // Only step physics when simulation is actually running
      if (simulatorRef.current && simulationStateRef.current?.isRunning) {
        // Use fixed physics timestep for stability (migration plan: parity with 0.01)
        const physicsTimeStep = 0.01;

        // Step physics multiple times if accumulated time allows
        while (accumulatedTime >= physicsTimeStep) {
          simulatorRef.current.step(physicsTimeStep);
          accumulatedTime -= physicsTimeStep;
          
          // Update time ref
          timeRef.current += physicsTimeStep;
        }
        
        // Sync collision count from physics engine
        const collisionStats = simulatorRef.current.getCollisionStats();
        if (collisionStats) {
          collisionsRef.current = collisionStats.totalCollisions || 0;
        }
      } else {
        // Reset accumulator when simulation not running
        accumulatedTime = 0;
      }

      // PHASE B: Rendering (migration plan: controlled by visibility)
      // Only render when tab is visible (can pause when hidden)
      if (renderEnabledRef.current && container) {
        // Sync visual particles from physics state
        updateParticlesFromStrategies(container, true, simulationStateRef.current?.isRunning || false);

        // Render to canvas
        (container as any).draw?.(false);
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [timeRef, collisionsRef]);
};
