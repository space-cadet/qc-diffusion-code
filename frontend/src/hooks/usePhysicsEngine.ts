import { useRef, useCallback, useEffect } from "react";
import { PhysicsEngineV2, EngineParamsV2 } from "../physics/PhysicsEngineV2";

interface UsePhysicsEngineProps {
  params: EngineParamsV2;
  isRunning: boolean;
}

interface UsePhysicsEngineReturn {
  engineRef: React.MutableRefObject<PhysicsEngineV2 | null>;
  step: (dt: number) => void;
  reset: () => void;
  updateParams: (params: Partial<EngineParamsV2>) => void;
  getStats: () => { time: number; collisionCount: number; particleCount: number } | null;
}

export function usePhysicsEngine({
  params,
  isRunning,
}: UsePhysicsEngineProps): UsePhysicsEngineReturn {
  const engineRef = useRef<PhysicsEngineV2 | null>(null);

  // Initialize engine once on mount
  useEffect(() => {
    engineRef.current = new PhysicsEngineV2(params);
    console.log("[usePhysicsEngine] Engine created, particles:", engineRef.current.particles.length);

    return () => {
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only create once on mount

  const step = useCallback(
    (dt: number) => {
      if (engineRef.current && isRunning) {
        engineRef.current.step(dt);
      }
    },
    [isRunning]
  );

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
    }
  }, []);

  const updateParams = useCallback((newParams: Partial<EngineParamsV2>) => {
    if (engineRef.current) {
      engineRef.current.updateParams(newParams);
    }
  }, []);

  const getStats = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current.getStats();
    }
    return null;
  }, []);

  return {
    engineRef,
    step,
    reset,
    updateParams,
    getStats,
  };
}
