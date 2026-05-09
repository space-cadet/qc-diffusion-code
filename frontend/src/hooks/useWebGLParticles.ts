import { useRef, useCallback, useEffect } from "react";
import type { Container } from "@tsparticles/engine";
import { updateParticlesFromStrategies } from "../config/tsParticlesConfig";
import { WebGLParticleRenderer } from "../webgl/WebGLParticleRenderer";
import type { RandomWalkParams } from "../types/simulationTypes";
import type { RandomWalkSimulator } from "../physics/RandomWalkSimulator";
import type { PhysicsRandomWalk } from "../physics/PhysicsRandomWalk";

interface UseWebGLParticlesProps {
  simulatorRef: React.MutableRefObject<RandomWalkSimulator | null>;
  tsParticlesContainerRef: React.MutableRefObject<Container | null>;
  gridLayoutParamsRef: React.MutableRefObject<RandomWalkParams & { useGPU?: boolean }>;
  gridLayoutParams: RandomWalkParams;
  renderEnabledRef: React.MutableRefObject<boolean>;
  timeRef: React.MutableRefObject<number>;
  collisionsRef: React.MutableRefObject<number>;
  useGPU: boolean;
}

interface UseWebGLParticlesReturn {
  particlesLoaded: (container: Container) => void;
  cleanup: () => void;
  setGraphPhysicsRef: (ref: React.MutableRefObject<PhysicsRandomWalk | null>) => void;
}

export function useWebGLParticles({
  simulatorRef,
  tsParticlesContainerRef,
  gridLayoutParamsRef,
  gridLayoutParams,
  renderEnabledRef,
  timeRef,
  collisionsRef,
  useGPU,
}: UseWebGLParticlesProps): UseWebGLParticlesReturn {
  const animationFrameId = useRef<number | undefined>(undefined);
  const rendererRef = useRef<WebGLParticleRenderer | null>(null);
  const graphPhysicsRef = useRef<React.MutableRefObject<PhysicsRandomWalk | null> | null>(null);
  const localGridLayoutParamsRef = useRef(gridLayoutParams);

  // Keep local ref in sync
  useEffect(() => {
    localGridLayoutParamsRef.current = gridLayoutParams;
  }, [gridLayoutParams]);

  const cleanup = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    if (rendererRef.current) {
      rendererRef.current.destroy();
      rendererRef.current = null;
    }
  }, []);

  const startAnimation = useCallback((container: Container) => {
    console.log("[useWebGLParticles] startAnimation called");
    // Stop any previous animation loop
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }

    // Initialize WebGL renderer if not already done
    const canvas = container.canvas.element as HTMLCanvasElement | undefined;
    if (canvas && !rendererRef.current) {
      const gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        antialias: false,
      });

      if (gl) {
        try {
          rendererRef.current = new WebGLParticleRenderer(gl, 10000);
          rendererRef.current.resize(canvas.width, canvas.height);
          console.log("[useWebGLParticles] WebGL renderer initialized");
        } catch (e) {
          console.error("[useWebGLParticles] Failed to initialize WebGL:", e);
        }
      } else {
        console.warn("[useWebGLParticles] WebGL not supported");
      }
    }

    let lastRenderTime = performance.now();
    let accumulatedTime = 0;

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);

      const currentRenderTime = performance.now();
      const renderDeltaTime = (currentRenderTime - lastRenderTime) / 1000;
      lastRenderTime = currentRenderTime;

      // Get current running state from store
      const isRunning = (window as any).__appStore?.getState?.().randomWalkSimulationState?.isRunning ?? false;
      console.log("[useWebGLParticles] animate frame", { isRunning, hasRenderer: !!rendererRef.current, hasSimulator: !!simulatorRef.current });

      // PHASE A: Physics Simulation
      if (isRunning && simulatorRef.current) {
        accumulatedTime += renderDeltaTime;
        const physicsTimeStep = Math.max(1e-6, localGridLayoutParamsRef.current?.dt ?? 0.01);

        while (accumulatedTime >= physicsTimeStep) {
          simulatorRef.current.step(physicsTimeStep);
          accumulatedTime -= physicsTimeStep;
          timeRef.current += physicsTimeStep;
        }

        const stats = simulatorRef.current.getCollisionStats();
        if (stats) {
          collisionsRef.current = stats.totalCollisions || 0;
        }
      } else {
        accumulatedTime = 0;
      }

      // PHASE B: Rendering
      if (container && localGridLayoutParamsRef.current?.showAnimation !== false) {
        // Sync physics positions to tsParticles
        updateParticlesFromStrategies(container, true, isRunning || false);

        // Render via WebGL
        if (rendererRef.current) {
          console.log("[useWebGLParticles] Rendering frame", { particleCount: container.particles.count });
          rendererRef.current.updateFromTsParticles(container);
          rendererRef.current.render();
        } else {
          console.warn("[useWebGLParticles] No renderer available");
        }
      }
    };

    animationFrameId.current = requestAnimationFrame(animate);
  }, [simulatorRef, timeRef, collisionsRef]);

  const particlesLoaded = useCallback((container: Container) => {
    console.log("[useWebGLParticles] particlesLoaded called");
    cleanup();
    tsParticlesContainerRef.current = container;
    startAnimation(container);
  }, [cleanup, tsParticlesContainerRef, startAnimation]);

  const setGraphPhysicsRef = useCallback((ref: React.MutableRefObject<PhysicsRandomWalk | null>) => {
    graphPhysicsRef.current = ref;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    particlesLoaded,
    cleanup,
    setGraphPhysicsRef,
  };
}
