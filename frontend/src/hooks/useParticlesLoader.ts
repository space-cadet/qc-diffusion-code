import { useCallback, useRef, useEffect } from 'react';
import type { Container } from '@tsparticles/engine';
import { updateParticlesFromStrategies } from '../config/tsParticlesConfig';
import { GPUParticleManager } from '../gpu/GPUParticleManager';

export const useParticlesLoader = ({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  gridLayoutParams,
  simulationStateRef,
  renderEnabledRef,
  timeRef,
  collisionsRef,
  useGPU
}: {
  simulatorRef: React.MutableRefObject<any>,
  tsParticlesContainerRef: React.MutableRefObject<Container | null>,
  gridLayoutParamsRef: React.MutableRefObject<any>,
  gridLayoutParams: any,
  simulationStateRef: React.MutableRefObject<any>,
  renderEnabledRef: React.MutableRefObject<boolean>,
  timeRef: React.MutableRefObject<number>,
  collisionsRef: React.MutableRefObject<number>,
  useGPU: boolean
}) => {
  const animationFrameId = useRef<number>();
  const gpuManagerRef = useRef<GPUParticleManager | null>(null);

  const resetGPU = useCallback(() => {
    if (gpuManagerRef.current) {
      gpuManagerRef.current.reset();
      timeRef.current = 0;
      collisionsRef.current = 0;
    }
  }, []);

  const initializeGPU = useCallback((particles: any[]) => {
    if (gpuManagerRef.current && particles.length > 0) {
      gpuManagerRef.current.initializeParticles(particles);
    }
  }, []);

  const updateGPUParameters = useCallback((params: any) => {
    if (gpuManagerRef.current) {
      // Get bounds from the CPU-side simulator itself
      const bounds = simulatorRef.current?.getBoundaryConfig();
      
      if (!bounds) {
        console.warn('[GPU] No boundary config available from simulator during parameter update');
      }

      // Combine UI params with simulator bounds and collision state
      const fullParams = {
        ...params,
        strategies: gridLayoutParamsRef.current?.strategies || [],
        collisionRate: gridLayoutParamsRef.current?.collisionRate || 1.0,
        jumpLength: gridLayoutParamsRef.current?.jumpLength || 1.0,
        dimension: gridLayoutParamsRef.current?.dimension || '2D',
        interparticleCollisions: gridLayoutParamsRef.current?.interparticleCollisions || false,
        ...(bounds && { bounds }),
      };

      console.log('[GPU] Updating parameters:', { 
        uiParams: params, 
        simulatorBounds: bounds,
        combined: fullParams 
      });

      const needsRecreation = !gpuManagerRef.current.updateParameters(fullParams);
      if (needsRecreation) {
        console.log('[GPU] Recreating GPU manager due to parameter change.');
        gpuManagerRef.current.dispose();
        gpuManagerRef.current = null;
        // The main loader logic will handle recreation on the next frame
      }
    }
  }, [simulatorRef]);

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

  // Reactive parameter propagation: push UI changes to running sim (GPU and CPU)
  useEffect(() => {
    // Build payload from current UI params
    const ui = gridLayoutParams || {};
    const payload: any = {
      boundaryCondition: ui.boundaryCondition,
      dimension: ui.dimension,
      strategies: ui.strategies,
      collisionRate: ui.collisionRate,
      jumpLength: ui.jumpLength,
      velocity: ui.velocity,
      dt: ui.dt,
      interparticleCollisions: ui.interparticleCollisions,
      showCollisions: ui.showCollisions,
    };

    // Always include fresh bounds from simulator if available
    const bounds = simulatorRef.current?.getBoundaryConfig?.();
    if (bounds) payload.bounds = bounds;

    // GPU path: update uniforms/state on the fly (recreate only on particleCount change inside updater)
    if (useGPU) {
      updateGPUParameters(payload);
    }

    // CPU path: forward to simulator if it supports updates
    try {
      simulatorRef.current?.updateParameters?.(payload);
    } catch (e) {
      // non-fatal; older simulators may not support live updates
      // console.warn('[CPU] updateParameters not available:', e);
    }
    // list relevant dependencies; avoid particle count to prevent unintended recreation here
  }, [
    useGPU,
    gridLayoutParams?.boundaryCondition,
    gridLayoutParams?.dimension,
    gridLayoutParams?.strategies,
    gridLayoutParams?.collisionRate,
    gridLayoutParams?.jumpLength,
    gridLayoutParams?.velocity,
    gridLayoutParams?.dt,
    gridLayoutParams?.interparticleCollisions,
    gridLayoutParams?.showCollisions,
  ]);

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
        if (useGPU && gpuManagerRef.current) {
          const gpuMetrics = gpuManagerRef.current.getMetrics();
          collisionsRef.current = gpuMetrics.collisionCount;
          timeRef.current = gpuMetrics.simulationTime;
        } else {
          const collisionStats = simulatorRef.current?.getCollisionStats?.();
          if (collisionStats) {
            collisionsRef.current = collisionStats.totalCollisions || 0;
          }
        }
      } else {
        // Reset accumulator when simulation not running
        accumulatedTime = 0;
      }

      // PHASE B: Rendering - only when needed and visible
      if (shouldRender && container) {
        if (useGPU && gpuManagerRef.current) {
          // Ensure mapper is set if simulator becomes available later
          if (simulatorRef.current && (gpuManagerRef.current as any).setCanvasMapper && !(gpuManagerRef.current as any)._mapperSet) {
            const pm = simulatorRef.current.getParticleManager?.();
            if (pm) {
              (gpuManagerRef.current as any).setCanvasMapper((pos: { x: number; y: number }) => pm.mapToCanvas(pos));
              (gpuManagerRef.current as any)._mapperSet = true;
              console.log('[GPU] Canvas mapper set (late) from ParticleManager');
            }
          }
          // Verify container is ready for GPU sync
          if (container.particles && container.particles.count > 0) {
            gpuManagerRef.current.syncToTsParticles(container);
          } else {
            console.warn('[GPU] Skipping sync - container not ready');
          }
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

  // Expose restart function and return the main loader with GPU methods
  const particlesLoader = useCallback((container: Container) => {
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
      
      if (htmlCanvas && container.particles && container.particles.count > 0) {
        try {
          gpuManagerRef.current = new GPUParticleManager(htmlCanvas, particleCount);
          console.log('[GPU] GPU manager created successfully');

          // CRITICAL FIX: Set proper boundary conditions immediately after creation
          if (simulatorRef.current) {
            const bounds = simulatorRef.current.getBoundaryConfig();
            const initialParams = {
              ...gridLayoutParamsRef.current,
              interparticleCollisions: gridLayoutParamsRef.current?.interparticleCollisions || false,
              ...(bounds && { bounds }),
            };
            gpuManagerRef.current.updateParameters(initialParams);
            console.log('[GPU] Initial boundary parameters applied:', bounds);

            const particles = simulatorRef.current.getParticleManager().getAllParticles();
            gpuManagerRef.current.initializeParticles(particles);
            console.log('[GPU] GPU manager initialized with', particles.length, 'particles');

            // Provide physics->canvas mapper so GPU visuals match CPU path
            const pm = simulatorRef.current.getParticleManager?.();
            if (pm && gpuManagerRef.current.setCanvasMapper) {
              gpuManagerRef.current.setCanvasMapper((pos: { x: number; y: number }) => pm.mapToCanvas(pos));
              console.log('[GPU] Canvas mapper set from ParticleManager');
            } else {
              console.warn('[GPU] Canvas mapper not set - ParticleManager unavailable');
            }
          } else {
            console.warn('[GPU] Simulator not available during GPU init - using default boundaries');
          }

          (window as any).gpuManager = gpuManagerRef.current;
        } catch (error) {
          console.error('[GPU] Failed to create GPU manager:', error);
          console.log('[GPU] Falling back to CPU mode');
        }
      } else {
        console.warn('[GPU] Delaying GPU init - container not ready');
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

  // Expose GPU methods
  (particlesLoader as any).resetGPU = resetGPU;
  (particlesLoader as any).initializeGPU = initializeGPU;
  (particlesLoader as any).updateGPUParameters = updateGPUParameters;
  (particlesLoader as any).getGPUManager = () => gpuManagerRef.current;

  return particlesLoader;
};
