import { useCallback, useRef, useEffect } from 'react';
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
  const animationFrameId = useRef<number>();

  const cleanup = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    // Do NOT destroy the container here. The owner (ParticleCanvas) manages its lifecycle.
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return useCallback((container: Container) => {
    // Stop any previous animation loop but keep the container intact
    cleanup();
    tsParticlesContainerRef.current = container;

    // Store previous time for delta calculation (render timing)
    let lastRenderTime = performance.now();
    let accumulatedTime = 0; // For fixed physics timestep

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      
      const currentRenderTime = performance.now();
      const renderDeltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      // Accumulate time for physics steps (migration plan: unified time)
      accumulatedTime += renderDeltaTime;

      // PHASE A: Physics Simulation (migration plan: controlled by simulation state)
      // Only step physics when simulation is actually running
      if (simulatorRef.current && simulationStateRef.current?.isRunning) {
        // Use fixed physics timestep from store for stability
        const physicsTimeStep = Math.max(1e-6, gridLayoutParamsRef.current?.dt ?? 0.01);

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
        updateParticlesFromStrategies(container, true, simulationStateRef.current?.isRunning || false);
        (container as any).draw?.(false);
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
  }, [timeRef, collisionsRef, cleanup]);
};
