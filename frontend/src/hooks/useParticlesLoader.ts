import { useCallback, useRef, useEffect } from 'react';
import type { Container } from '@tsparticles/engine';
import { GPUParticleManager } from '../gpu/GPUParticleManager';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import type { RandomWalkParams } from '../types/simulationTypes';
import { updateParticlesFromStrategies } from '../config/tsParticlesConfig';
import { useAppStore } from '../stores/appStore';

export interface ParticlesLoader {
  (container: Container): void;
  resetGPU: () => void;
  initializeGPU: (particles: { position: { x: number; y: number }; velocity: { vx: number; vy: number } }[]) => void;
  updateGPUParameters: (params: Record<string, unknown>) => void;
  getGPUManager: () => GPUParticleManager | null;
  setGraphPhysicsRef: (ref: GraphPhysicsRef | null) => void;
}

export interface GraphPhysicsRef {
  current: {
    step: (dt: number) => void;
  } | null;
}

export interface UseParticlesLoaderProps {
  simulatorRef: React.MutableRefObject<RandomWalkSimulator | null>;
  tsParticlesContainerRef: React.MutableRefObject<Container | null>;
  gridLayoutParamsRef: React.MutableRefObject<RandomWalkParams | null>;
  gridLayoutParams: RandomWalkParams;
  renderEnabledRef: React.MutableRefObject<boolean>;
  timeRef: React.MutableRefObject<number>;
  collisionsRef: React.MutableRefObject<number>;
  useGPU: boolean;
}

export const useParticlesLoader = ({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  gridLayoutParams,
  renderEnabledRef,
  timeRef,
  collisionsRef,
  useGPU
}: UseParticlesLoaderProps) => {
  const animationFrameId = useRef<number | undefined>(undefined);
  const gpuManagerRef = useRef<GPUParticleManager | null>(null);
  const graphPhysicsRef = useRef<GraphPhysicsRef['current']>(null); // Add graph physics ref
  // Use a local ref to avoid stale closure issues with gridLayoutParamsRef
  const localGridLayoutParamsRef = useRef<RandomWalkParams | null>(null);
  
  // Keep local ref in sync with the passed ref
  useEffect(() => {
    localGridLayoutParamsRef.current = gridLayoutParamsRef.current;
  }, [gridLayoutParamsRef]);

  const resetGPU = useCallback(() => {
    if (gpuManagerRef.current) {
      gpuManagerRef.current.reset();
      timeRef.current = 0;
      collisionsRef.current = 0;
    }
  }, []);

  const setGraphPhysicsRef = useCallback((ref: GraphPhysicsRef['current']) => {
    graphPhysicsRef.current = ref;
  }, []);

  const initializeGPU = useCallback((particles: { position: { x: number; y: number }; velocity: { vx: number; vy: number } }[]) => {
    if (gpuManagerRef.current && particles.length > 0) {
      gpuManagerRef.current.initializeParticles(particles as any);
    }
  }, []);

  const updateGPUParameters = useCallback((params: Record<string, unknown>) => {
    if (gpuManagerRef.current) {
      // Get bounds from the CPU-side simulator itself
      const bounds = simulatorRef.current?.getBoundaryConfig();
      
      if (!bounds) {
        console.warn('[GPU] No boundary config available from simulator during parameter update');
      }

      // Combine UI params with simulator bounds and collision state
      const fullParams: Record<string, unknown> = {
        ...params,
        strategies: localGridLayoutParamsRef.current?.strategies || [],
        collisionRate: localGridLayoutParamsRef.current?.collisionRate || 1.0,
        jumpLength: localGridLayoutParamsRef.current?.jumpLength || 1.0,
        dimension: localGridLayoutParamsRef.current?.dimension || '2D',
        interparticleCollisions: localGridLayoutParamsRef.current?.interparticleCollisions || false,
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
    const ui = gridLayoutParams;
    const payload: Record<string, unknown> = {
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
      // Get isRunning directly from store
      const isRunning = useAppStore.getState().randomWalkSimulationState.isRunning;
      const shouldRender = renderEnabledRef.current;
      
      // CRITICAL LOG: Is the loop running at all?
      if (!(animate as { _firstRun?: boolean })._firstRun !== false) {
          console.log('[useParticlesLoader Log] Animation loop active', { isRunning, shouldRender, useGPU, hasContainer: !!container });
          (animate as { _firstRun?: boolean })._firstRun = false;
      }
      
      // Always continue animation loop to maintain rendering capability
      animationFrameId.current = requestAnimationFrame(animate);
      
      const currentRenderTime = performance.now();
      const renderDeltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      // PHASE A: Physics Simulation - only when running
      // In GPU mode, do not require simulatorRef to be present
      if (isRunning) {
        // Accumulate time for physics steps
        accumulatedTime += renderDeltaTime;
        
        // Use fixed physics timestep from store for stability
        const physicsTimeStep = Math.max(1e-6, localGridLayoutParamsRef.current?.dt ?? 0.01);

        // Step physics multiple times if accumulated time allows
        while (accumulatedTime >= physicsTimeStep) {
          if (useGPU && gpuManagerRef.current) {
            // console.log('[GPU] Using GPU physics step');
            gpuManagerRef.current.step(physicsTimeStep);
          } else if (simulatorRef.current) {
            simulatorRef.current.step(physicsTimeStep);
          }
          
          // Also step graph physics if available and simulation type is graph (runs on both GPU and CPU paths)
          if (graphPhysicsRef.current && localGridLayoutParamsRef.current?.simulationType === 'graph') {
            graphPhysicsRef.current.step(physicsTimeStep);
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

    // PHASE B: Rendering - always render when container exists and animation enabled
      if (container && localGridLayoutParamsRef.current?.showAnimation !== false) {
        if ((animate as { _frameCounter?: number })._frameCounter !== undefined && (animate as { _frameCounter?: number })._frameCounter! % 100 === 0) {
          console.log('[useParticlesLoader Log] Phase B Rendering', { 
            useGPU, 
            hasGpuManager: !!gpuManagerRef.current,
            particleCount: container.particles?.count,
            isRunning
          });
        }
        if (useGPU && gpuManagerRef.current) {
          // Ensure mapper is set if simulator becomes available later
          if (simulatorRef.current && gpuManagerRef.current.setCanvasMapper && !(gpuManagerRef.current as { _mapperSet?: boolean })._mapperSet) {
            const pm = simulatorRef.current.getParticleManager?.();
            if (pm) {
              gpuManagerRef.current.setCanvasMapper((pos: { x: number; y: number }) => pm.mapToCanvas(pos));
              (gpuManagerRef.current as { _mapperSet?: boolean })._mapperSet = true;
              console.log('[GPU] Canvas mapper set (late) from ParticleManager');
            }
          }
          if (container.particles && container.particles.count > 0) {
            if (!(container as { _frameCounter?: number })._frameCounter) (container as { _frameCounter?: number })._frameCounter = 0;
            (container as { _frameCounter?: number })._frameCounter!++;
            (window as { _gpuFrameCount?: number })._gpuFrameCount = (container as { _frameCounter?: number })._frameCounter!; // Fallback for GPUSync
            
            const hasMapper = !!(gpuManagerRef.current as any).canvasMapper;
            if ((container as { _frameCounter?: number })._frameCounter! % 100 === 0) {
              console.log('[useParticlesLoader Log] GPU Sync loop:', {
                frameCount: (container as { _frameCounter?: number })._frameCounter,
                hasMapper,
                particleCount: container.particles.count,
                useGPU,
                isRunning
              });
            }
            gpuManagerRef.current.syncToTsParticles(container);
          } else {
            console.warn('[GPU] Skipping sync - container not ready');
          }
        } else {
          // CPU mode - update particles from strategies
          // Defensive: if simulator not set yet, retry next frame
          if (!simulatorRef.current) {
            console.warn('[CPU] Simulator not set yet, skipping sync');
          } else {
            updateParticlesFromStrategies(container, true, isRunning || false);
          }
        }
        
        // Always draw for smooth UI updates
        (container as { draw?: (force: boolean) => void }).draw?.(false);
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
  const particlesLoaderCallback = useCallback((container: Container) => {
    // Stop any previous animation loop but keep the container intact
    cleanup();
    tsParticlesContainerRef.current = container;
    
    // Initialize GPU manager if needed
    console.log('[GPU Debug] useGPU check:', { 
      useGPU, 
      hasGpuManager: !!gpuManagerRef.current,
      gridLayoutParams: localGridLayoutParamsRef.current 
    });
    
    if (useGPU && !gpuManagerRef.current) {
      const particleCount = localGridLayoutParamsRef.current?.particles || 1000;
      console.log('[GPU] Creating GPU manager for', particleCount, 'particles');
      
      const htmlCanvas = container?.canvas?.element as HTMLCanvasElement | undefined;
      console.log('[GPU] Canvas check:', { htmlCanvas: !!htmlCanvas, container: !!container });
      
      if (htmlCanvas && container.particles && container.particles.count > 0) {
        try {
          gpuManagerRef.current = new GPUParticleManager(htmlCanvas, particleCount);
          console.log('[GPU] GPU manager created successfully');

          // CRITICAL FIX: Set proper boundary conditions immediately after creation
          if (simulatorRef.current) {
            const bounds = simulatorRef.current.getBoundaryConfig();
            const initialParams: Record<string, unknown> = {
              ...localGridLayoutParamsRef.current,
              interparticleCollisions: localGridLayoutParamsRef.current?.interparticleCollisions || false,
              ...(bounds && { bounds }),
            };
            gpuManagerRef.current.updateParameters(initialParams);
            console.log('[GPU] Initial boundary parameters applied:', bounds);

            const particles = simulatorRef.current?.getParticleManager?.()?.getAllParticles?.() || [];
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

          (window as { gpuManager?: GPUParticleManager | null }).gpuManager = gpuManagerRef.current;
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
      (window as { gpuManager?: GPUParticleManager | null }).gpuManager = null;
    }
    
    // Always start animation loop - it will check isRunning internally
    startAnimation(container);
    
    // Add restart method to the container reference for external access
    (container as { _restartAnimation?: () => void })._restartAnimation = restartAnimation;
  }, [cleanup, startAnimation, restartAnimation]);

  // Expose GPU methods
  const particlesLoader = Object.assign(
    particlesLoaderCallback,
    {
      resetGPU,
      initializeGPU,
      updateGPUParameters,
      getGPUManager: () => gpuManagerRef.current as GPUParticleManager | null,
      setGraphPhysicsRef,
    }
  ) as unknown as ParticlesLoader;

  return particlesLoader;
};
