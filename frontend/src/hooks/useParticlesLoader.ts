import { useCallback, useRef, useEffect } from 'react';
import type { Container } from '@tsparticles/engine';
import { updateParticlesFromStrategies } from '../config/tsParticlesConfig';
import { GPUParticleManager } from '../gpu/GPUParticleManager';

export const useParticlesLoader = ({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  simulationStateRef,
  renderEnabledRef,
  timeRef,
  collisionsRef,
  useGPU
}: {
  simulatorRef: React.MutableRefObject<any>,
  tsParticlesContainerRef: React.MutableRefObject<Container | null>,
  gridLayoutParamsRef: React.MutableRefObject<any>,
  simulationStateRef: React.MutableRefObject<any>,
  renderEnabledRef: React.MutableRefObject<boolean>,
  timeRef: React.MutableRefObject<number>,
  collisionsRef: React.MutableRefObject<number>,
  useGPU: boolean
}) => {
  const animationFrameId = useRef<number>();
  const gpuManagerRef = useRef<GPUParticleManager | null>(null);

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

  const startAnimation = useCallback((container: Container) => {
    // Stop any previous animation loop
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }

    // Store previous time for delta calculation (render timing)
    let lastRenderTime = performance.now();
    let accumulatedTime = 0; // For fixed physics timestep

    const animate = () => {
      const isRunning = simulationStateRef.current?.isRunning;
      const shouldRender = renderEnabledRef.current;
      
      // Only continue animation loop if simulation is running
      if (isRunning) {
        animationFrameId.current = requestAnimationFrame(animate);
      } else {
        // Stop the animation loop when simulation is paused
        animationFrameId.current = undefined;
        return;
      }
      
      const currentRenderTime = performance.now();
      const renderDeltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      // PHASE A: Physics Simulation - only when running
      // In GPU mode, do not require simulatorRef to be present
      if (isRunning) {
        // Accumulate time for physics steps
        accumulatedTime += renderDeltaTime;
        
        // Use fixed physics timestep from store for stability
        const physicsTimeStep = Math.max(1e-6, gridLayoutParamsRef.current?.dt ?? 0.01);

        // Step physics multiple times if accumulated time allows
        while (accumulatedTime >= physicsTimeStep) {
          if (useGPU && gpuManagerRef.current) {
            // console.log('[GPU] Using GPU physics step');
            gpuManagerRef.current.step(physicsTimeStep);
          } else if (simulatorRef.current) {
            simulatorRef.current.step(physicsTimeStep);
          }
          
          accumulatedTime -= physicsTimeStep;
          timeRef.current += physicsTimeStep;
        }
        
        // Sync collision count from physics engine
        const collisionStats = simulatorRef.current?.getCollisionStats?.();
        if (collisionStats) {
          collisionsRef.current = collisionStats.totalCollisions || 0;
        }
      } else {
        // Reset accumulator when simulation not running
        accumulatedTime = 0;
      }

      // PHASE B: Rendering - only when needed and visible
      if (shouldRender && container) {
        if (useGPU && gpuManagerRef.current) {
          // console.log('[GPU] Using GPU rendering sync');
          gpuManagerRef.current.syncToTsParticles(container);
        } else {
          updateParticlesFromStrategies(container, true, isRunning || false);
        }
        
        (container as any).draw?.(false);
      }
    };

    // Start animation loop - it will check isRunning state internally
    animationFrameId.current = requestAnimationFrame(animate);
  }, []);

  // Create restart function for when simulation resumes
  const restartAnimation = useCallback(() => {
    const container = tsParticlesContainerRef.current;
    if (container && !animationFrameId.current) {
      startAnimation(container);
    }
  }, [startAnimation]);

  // Expose restart function and return the main loader
  return useCallback((container: Container) => {
    // Stop any previous animation loop but keep the container intact
    cleanup();
    tsParticlesContainerRef.current = container;
    
    // Initialize GPU manager if needed
    console.log('[GPU Debug] useGPU check:', { 
      useGPU, 
      hasGpuManager: !!gpuManagerRef.current,
      gridLayoutParams: gridLayoutParamsRef.current 
    });
    
    if (useGPU && !gpuManagerRef.current) {
      const particleCount = gridLayoutParamsRef.current?.particles || 1000;
      console.log('[GPU] Creating GPU manager for', particleCount, 'particles');
      
      const htmlCanvas = (container as any)?.canvas?.element as HTMLCanvasElement | undefined;
      console.log('[GPU] Canvas check:', { htmlCanvas: !!htmlCanvas, container: !!container });
      
      if (htmlCanvas) {
        try {
          gpuManagerRef.current = new GPUParticleManager(htmlCanvas, particleCount);
          console.log('[GPU] GPU manager created successfully');
          // Expose temporary global for debugging in DevTools
          (window as any).gpuManager = gpuManagerRef.current;
        } catch (error) {
          console.error('[GPU] Failed to create GPU manager:', error);
          console.log('[GPU] Falling back to CPU mode');
          // Don't set gpuManagerRef.current, will use CPU path
        }
      } else {
        console.warn('[GPU] No HTMLCanvasElement available on container.canvas.element');
      }
      
      // Initialize with current particles
      if (gpuManagerRef.current && simulatorRef.current) {
        const particles = simulatorRef.current.getParticleManager().getAllParticles();
        gpuManagerRef.current.initializeParticles(particles);
        console.log('[GPU] GPU manager initialized with', particles.length, 'particles');
      }
    } else if (!useGPU && gpuManagerRef.current) {
      console.log('[GPU] Disposing GPU manager (switched to CPU)');
      gpuManagerRef.current.dispose();
      gpuManagerRef.current = null;
      // Clear global debug reference
      (window as any).gpuManager = null;
    }
    
    // Always start animation loop - it will check isRunning internally
    startAnimation(container);
    
    // Add restart method to the container reference for external access
    (container as any)._restartAnimation = restartAnimation;
  }, [cleanup, startAnimation, restartAnimation]);
};
