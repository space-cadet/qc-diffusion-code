import { useRef, useCallback, useEffect } from "react";
import { PhysicsEngine, PhysicsEngineConfig } from "../physics/core/PhysicsEngine";
import { Dimension } from "../physics/core/CoordinateSystem";
import { createPhysicsStrategies } from "../physics/factories/StrategyFactory";
import { ParameterManager } from "../physics/core/ParameterManager";
import { BoundaryConfig } from "../physics/types/BoundaryConfig";
import type { Particle } from "../physics/types/Particle";
import type { PhysicsStrategy } from "../physics/interfaces/PhysicsStrategy";
import { sampleCanvasPosition } from "../physics/utils/InitDistributions";

export interface EngineParams {
  particleCount: number;
  dimension: "1D" | "2D";
  canvasWidth: number;
  canvasHeight: number;
  velocity: number;
  dt: number;
  temperature: number;
  boundaryCondition: "reflective" | "absorbing" | "periodic";
  interparticleCollisions: boolean;
  collisionRate: number;
  collisionRadius: number;
  initialDistType: string;
  strategyType?: string;
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
  distSigmaX?: number;
  distSigmaY?: number;
  distR0?: number;
  distDR?: number;
  distThickness?: number;
  distNx?: number;
  distNy?: number;
  distJitter?: number;
}

export interface SimpleParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: [number, number, number, number];
}

interface UseOriginalPhysicsEngineReturn {
  engineRef: React.MutableRefObject<PhysicsEngine | null>;
  particlesRef: React.MutableRefObject<Particle[]>;
  step: (dt: number) => void;
  reset: () => void;
  updateParams: (params: Partial<EngineParams>) => void;
  getStats: () => { time: number; collisionCount: number; particleCount: number } | null;
}

function toVisibleSpeed(params: EngineParams): number {
  // The V2 renderer uses canvas coordinates directly, so raw "1.0" velocities are
  // visually imperceptible. Scale them into a visible pixel-space speed.
  return params.velocity * Math.max(Math.min(params.canvasWidth, params.canvasHeight) / 6, 1);
}

function createBoundaryConfig(params: EngineParams): BoundaryConfig {
  return {
    type: params.boundaryCondition,
    xMin: 0,
    xMax: params.canvasWidth,
    yMin: 0,
    yMax: params.canvasHeight,
  };
}

function createParameterManager(params: EngineParams): ParameterManager {
  // Determine strategies from params
  let strategies: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
  if (params.strategies && params.strategies.length > 0) {
    strategies = params.strategies;
  } else if (params.strategyType) {
    strategies = [params.strategyType as 'ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions'];
  } else {
    // Fallback: use collisionRate to decide
    strategies = params.collisionRate > 0 ? ['ctrw'] : ['simple'];
  }

  // Add collisions strategy if interparticleCollisions is enabled
  if (params.interparticleCollisions && !strategies.includes('collisions')) {
    strategies = [...strategies, 'collisions'];
  }

  return new ParameterManager({
    collisionRate: params.collisionRate,
    jumpLength: params.velocity * params.dt,
    velocity: params.velocity,
    dt: params.dt,
    particleCount: params.particleCount,
    dimension: params.dimension,
    interparticleCollisions: params.interparticleCollisions,
    strategies,
    boundaryCondition: params.boundaryCondition,
    canvasWidth: params.canvasWidth,
    canvasHeight: params.canvasHeight,
    initialDistType: params.initialDistType as 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid',
    distSigmaX: params.distSigmaX,
    distSigmaY: params.distSigmaY,
    distR0: params.distR0,
    distDR: params.distDR,
    distThickness: params.distThickness,
    distNx: params.distNx,
    distNy: params.distNy,
    distJitter: params.distJitter,
    temperature: params.temperature,
  });
}

function createStrategiesFromParams(params: EngineParams): PhysicsStrategy[] {
  const boundaryConfig = createBoundaryConfig(params);
  const paramManager = createParameterManager(params);
  return createPhysicsStrategies(paramManager, boundaryConfig);
}

function initializeParticles(params: EngineParams): Particle[] {
  const particles: Particle[] = [];
  const { particleCount, dimension, canvasWidth, canvasHeight } = params;
  const visibleSpeed = toVisibleSpeed(params);

  for (let i = 0; i < particleCount; i++) {
    const pos = sampleCanvasPosition(i, {
      canvasWidth,
      canvasHeight,
      dimension,
      initialDistType: params.initialDistType as "uniform" | "gaussian" | "ring" | "stripe" | "grid",
      distSigmaX: params.distSigmaX ?? 80,
      distSigmaY: params.distSigmaY ?? 80,
      distR0: params.distR0 ?? 150,
      distDR: params.distDR ?? 20,
      distThickness: params.distThickness ?? 40,
      distNx: params.distNx ?? 20,
      distNy: params.distNy ?? 15,
      distJitter: params.distJitter ?? 4,
    });
    const angle = Math.random() * 2 * Math.PI;
    const speed = visibleSpeed;

    particles.push({
      id: `p-${i}`,
      position: {
        x: pos.x,
        y: dimension === "1D" ? canvasHeight / 2 : pos.y,
      },
      velocity: {
        vx: speed * Math.cos(angle),
        vy: dimension === "1D" ? 0 : speed * Math.sin(angle),
      },
      radius: 3,
      lastCollisionTime: 0,
      nextCollisionTime: Math.random() * (1 / (params.collisionRate || 1)),
      collisionCount: 0,
      waitingTime: 0,
      trajectory: [] as any,
      isActive: true,
      lastUpdate: 0,
    });
  }

  return particles;
}

export function useOriginalPhysicsEngine({
  params,
  isRunning,
}: {
  params: EngineParams;
  isRunning: boolean;
}): UseOriginalPhysicsEngineReturn {
  const engineRef = useRef<PhysicsEngine | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const collisionCountRef = useRef(0);

  useEffect(() => {
    const boundaryConfig = createBoundaryConfig(params);
    const strategies = createStrategiesFromParams(params);

    const config: PhysicsEngineConfig = {
      timeStep: params.dt,
      boundaries: boundaryConfig,
      canvasSize: { width: params.canvasWidth, height: params.canvasHeight },
      dimension: params.dimension as Dimension,
      strategies,
    };

    engineRef.current = new PhysicsEngine(config);
    particlesRef.current = initializeParticles(params);

    console.log("[useOriginalPhysicsEngine] Engine created with", strategies.length, "strategies");

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = useCallback(
    (dt: number) => {
      if (engineRef.current && isRunning) {
        engineRef.current.updateConfiguration({ timeStep: dt });
        const actualDt = engineRef.current.step(particlesRef.current);
        timeRef.current += actualDt;

        let collisions = 0;
        for (const p of particlesRef.current) {
          collisions += p.collisionCount || 0;
        }
        collisionCountRef.current = collisions;
      }
    },
    [isRunning]
  );

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      particlesRef.current = initializeParticles(params);
      timeRef.current = 0;
      collisionCountRef.current = 0;
    }
  }, [params]);

  const updateParams = useCallback((newParams: Partial<EngineParams>) => {
    if (!engineRef.current) return;

    const updatedParams = { ...params, ...newParams };

    const boundaryConfig = createBoundaryConfig(updatedParams);
    const strategies = createStrategiesFromParams(updatedParams);

    engineRef.current.updateConfiguration({
      timeStep: updatedParams.dt,
      boundaries: boundaryConfig,
      canvasSize: { width: updatedParams.canvasWidth, height: updatedParams.canvasHeight },
      dimension: updatedParams.dimension as Dimension,
      strategies,
    });

    if (newParams.particleCount !== undefined && newParams.particleCount !== params.particleCount) {
      particlesRef.current = initializeParticles(updatedParams);
    }

    if (newParams.dimension !== undefined && newParams.dimension !== params.dimension) {
      particlesRef.current = initializeParticles(updatedParams);
    }

    const distributionChanged =
      newParams.initialDistType !== undefined && newParams.initialDistType !== params.initialDistType;
    const distributionParamsChanged =
      newParams.distSigmaX !== undefined ||
      newParams.distSigmaY !== undefined ||
      newParams.distR0 !== undefined ||
      newParams.distDR !== undefined ||
      newParams.distThickness !== undefined ||
      newParams.distNx !== undefined ||
      newParams.distNy !== undefined ||
      newParams.distJitter !== undefined;

    if (distributionChanged || distributionParamsChanged) {
      particlesRef.current = initializeParticles(updatedParams);
    }

    if (newParams.velocity !== undefined && newParams.velocity !== params.velocity) {
      const newVisibleSpeed = toVisibleSpeed(updatedParams);
      for (const particle of particlesRef.current) {
        const currentSpeed = Math.hypot(particle.velocity.vx, particle.velocity.vy);
        const angle = currentSpeed > 0
          ? Math.atan2(particle.velocity.vy, particle.velocity.vx)
          : Math.random() * 2 * Math.PI;

        particle.velocity.vx = newVisibleSpeed * Math.cos(angle);
        particle.velocity.vy = updatedParams.dimension === "1D"
          ? 0
          : newVisibleSpeed * Math.sin(angle);
      }
    }
  }, [params]);

  const getStats = useCallback(() => {
    return {
      time: timeRef.current,
      collisionCount: collisionCountRef.current,
      particleCount: particlesRef.current.length,
    };
  }, []);

  return {
    engineRef,
    particlesRef,
    step,
    reset,
    updateParams,
    getStats,
  };
}

export function adaptParticles(particles: Particle[]): SimpleParticle[] {
  return particles.map((p, index) => ({
    id: index,
    x: p.position.x,
    y: p.position.y,
    vx: p.velocity.vx,
    vy: p.velocity.vy,
    radius: p.radius || 3,
    color: [0.23, 0.51, 0.96, 0.8] as [number, number, number, number],
  }));
}
