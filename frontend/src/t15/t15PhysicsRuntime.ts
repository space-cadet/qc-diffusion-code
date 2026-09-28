import type { PhysicsEngineRuntime } from "../hooks/useOriginalPhysicsEngine";
import { T15aVelocityFlipStrategy } from "../physics/strategies/T15aVelocityFlipStrategy";
import { T15bHeadingResetStrategy } from "../physics/strategies/T15bHeadingResetStrategy";
import type { BoundaryConfig } from "../physics/types/BoundaryConfig";
import { createT15Particles, type T15Mode, type T15RunConfig } from "./t15RandomWalk";

export function createT15PhysicsRuntime(mode: T15Mode, config: T15RunConfig): PhysicsEngineRuntime {
  return {
    createStrategies: (_params, boundaries) => {
      const unbounded: BoundaryConfig = { ...boundaries, type: "unbounded" };
      return mode === "t15a"
        ? [new T15aVelocityFlipStrategy(config.ordering === "derivative" ? 0.75 : 0, unbounded)]
        : [new T15bHeadingResetStrategy(config.speed, config.resetRate, unbounded)];
    },
    initializeParticles: (_params, random) => createT15Particles(mode, config, random),
  };
}
