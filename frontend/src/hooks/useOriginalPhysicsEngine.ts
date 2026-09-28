import { useRef, useCallback, useEffect } from "react";
import { PhysicsEngine, PhysicsEngineConfig } from "../physics/core/PhysicsEngine";
import { Dimension } from "../physics/core/CoordinateSystem";
import { createPhysicsStrategies } from "../physics/factories/StrategyFactory";
import type { PhysicsStrategy } from "../physics/interfaces/PhysicsStrategy";
import { ParameterManager } from "../physics/core/ParameterManager";
import { BoundaryConfig } from "../physics/types/BoundaryConfig";
import type { Particle } from "../physics/types/Particle";
import type { StrategyEvent } from "../physics/types/PhysicsContext";
import { sampleCanvasPosition } from "../physics/utils/InitDistributions";
import { SeededRandom } from "../physics/utils/SeededRandom";

export interface EngineParams {
  particleCount: number;
  dimension: "1D" | "2D";
  canvasWidth: number;
  canvasHeight: number;
  velocity: number;
  dt: number;
  temperature: number;
  boundaryCondition: "reflective" | "absorbing" | "periodic" | "unbounded";
  interparticleCollisions: boolean;
  collisionRate: number;
  collisionRadius: number;
  initialDistType: string;
  strategyType?: string;
  kacGoldsteinOrdering?: "reduced" | "derivative";
  strategies?: ('ctrw' | 'simple' | 'levy' | 'levy-walk' | 'fractional' | 'collisions' | 'kac-goldstein' | 'masoliver-lindenbergh')[];
  distSigmaX?: number;
  distSigmaY?: number;
  distR0?: number;
  distDR?: number;
  distThickness?: number;
  distNx?: number;
  distNy?: number;
  distJitter?: number;
  seed: number;
  levyAlpha: number;
  levyScale: number;
  fractionalBeta: number;
  fractionalWaitingScale: number;
  fractionalJumpLength: number;
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
  step: (dt: number, stopAtTime?: number) => void;
  reset: () => void;
  updateParams: (params: Partial<EngineParams>) => void;
  getStats: () => { time: number; collisionCount: number; interparticleCollisionCount: number; particleCount: number } | null;
}

function toVisibleSpeed(params: EngineParams): number {
  const selected = params.strategies?.find((strategy) =>
    ['simple', 'ctrw', 'levy', 'levy-walk', 'fractional', 'kac-goldstein', 'masoliver-lindenbergh'].includes(strategy)
  ) ?? params.strategyType;
  const scale = selected === 'kac-goldstein'
    ? params.canvasWidth / 12
    : Math.min(params.canvasWidth, params.canvasHeight) / 6;
  return params.velocity * Math.max(scale, 1);
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
  let strategies: ('ctrw' | 'simple' | 'levy' | 'levy-walk' | 'fractional' | 'collisions' | 'kac-goldstein' | 'masoliver-lindenbergh')[];
  if (params.strategies && params.strategies.length > 0) {
    strategies = params.strategies;
  } else if (params.strategyType) {
    strategies = [params.strategyType as 'ctrw' | 'simple' | 'levy' | 'levy-walk' | 'fractional' | 'collisions' | 'kac-goldstein' | 'masoliver-lindenbergh'];
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
    initialDistType: params.initialDistType as 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid' | 'origin' | 'centered' | 'bimodal' | 'asymmetric',
    distSigmaX: params.distSigmaX,
    distSigmaY: params.distSigmaY,
    distR0: params.distR0,
    distDR: params.distDR,
    distThickness: params.distThickness,
    distNx: params.distNx,
    distNy: params.distNy,
    distJitter: params.distJitter,
    temperature: params.temperature,
    levyAlpha: params.levyAlpha,
    levyScale: params.levyScale,
    fractionalBeta: params.fractionalBeta,
    fractionalWaitingScale: params.fractionalWaitingScale,
    fractionalJumpLength: params.fractionalJumpLength,
  });
}

function createStrategiesFromParams(params: EngineParams): PhysicsStrategy[] {
  const boundaryConfig = createBoundaryConfig(params);
  const paramManager = createParameterManager(params);
  return createPhysicsStrategies(paramManager, boundaryConfig);
}

function initializeDefaultParticles(params: EngineParams, random: () => number): Particle[] {
  const particles: Particle[] = [];
  const { particleCount, dimension, canvasWidth, canvasHeight } = params;
  const visibleSpeed = toVisibleSpeed(params);
  const selected = params.strategies?.find((strategy) => ['simple', 'ctrw', 'levy', 'levy-walk', 'fractional', 'kac-goldstein', 'masoliver-lindenbergh'].includes(strategy))
    ?? (params.strategyType as 'simple' | 'ctrw' | 'levy' | 'levy-walk' | 'fractional' | 'kac-goldstein' | 'masoliver-lindenbergh' | undefined)
    ?? (params.collisionRate > 0 ? 'ctrw' : 'simple');

  for (let i = 0; i < particleCount; i++) {
    const pos = sampleCanvasPosition(i, {
      canvasWidth,
      canvasHeight,
      dimension,
      initialDistType: params.initialDistType as "uniform" | "gaussian" | "ring" | "stripe" | "grid" | "origin" | "centered" | "bimodal" | "asymmetric",
      distSigmaX: params.distSigmaX ?? 80,
      distSigmaY: params.distSigmaY ?? 80,
      distR0: params.distR0 ?? 150,
      distDR: params.distDR ?? 20,
      distThickness: params.distThickness ?? 40,
      distNx: params.distNx ?? 20,
      distNy: params.distNy ?? 15,
      distJitter: params.distJitter ?? 4,
    }, random);
    const isKacGoldstein = selected === 'kac-goldstein';
    const angle = isKacGoldstein
      ? (random() < (params.initialDistType === 'asymmetric' ? 0.7 : 0.5) ? 0 : Math.PI)
      : random() * 2 * Math.PI;
    const speed = visibleSpeed;
    const uniform = Math.max(random(), Number.EPSILON);
    const nextCollisionTime = selected === 'fractional'
      ? params.fractionalWaitingScale / Math.pow(uniform, 1 / params.fractionalBeta)
      : selected === 'simple'
        ? Infinity
        : params.collisionRate > 0 ? -Math.log(uniform) / params.collisionRate : Infinity;

    const position = {
      x: pos.x,
      y: dimension === "1D" ? canvasHeight / 2 : pos.y,
    };
    const velocity = {
      vx: speed * Math.cos(angle),
      vy: dimension === "1D" ? 0 : speed * Math.sin(angle),
    };
    particles.push({
      id: `p-${i}`,
      position,
      velocity,
      radius: 3,
      lastCollisionTime: 0,
      lastEventTime: 0,
      nextCollisionTime,
      collisionCount: 0,
      waitingTime: 0,
      trajectory: [] as any,
      isActive: true,
      lastUpdate: 0,
      initial: { position: { ...position }, velocity: { ...velocity }, timestamp: 0 },
    });
  }

  return particles;
}

export function useOriginalPhysicsEngine({
  params,
  isRunning,
  onStrategyEvent,
}: {
  params: EngineParams;
  isRunning: boolean;
  onStrategyEvent?: (event: StrategyEvent) => void;
}): UseOriginalPhysicsEngineReturn {
  const engineRef = useRef<PhysicsEngine | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const timeRef = useRef(0);
  const collisionCountRef = useRef(0);
  const interparticleCollisionCountRef = useRef(0);
  const randomRef = useRef(new SeededRandom(params.seed));
  const accumulatorRef = useRef(0);
  const appliedParamsRef = useRef(params);

  useEffect(() => {
    const boundaryConfig = createBoundaryConfig(params);
    const strategies = createStrategiesFromParams(params);

    const config: PhysicsEngineConfig = {
      timeStep: params.dt,
      boundaries: boundaryConfig,
      canvasSize: { width: params.canvasWidth, height: params.canvasHeight },
      dimension: params.dimension as Dimension,
      strategies,
      random: () => randomRef.current.next(),
      onStrategyEvent,
    };

    engineRef.current = new PhysicsEngine(config);
    randomRef.current.reset(params.seed);
    particlesRef.current = initializeDefaultParticles(params, () => randomRef.current.next());

    console.log("[useOriginalPhysicsEngine] Engine created with", strategies.length, "strategies");

    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = useCallback(
    (dt: number, stopAtTime?: number) => {
      if (engineRef.current && isRunning) {
        accumulatorRef.current += Math.min(Math.max(dt, 0), 0.05);
        let steps = 0;
        while (
          accumulatorRef.current >= params.dt
          && steps < 10
          && (stopAtTime === undefined || timeRef.current + params.dt <= stopAtTime + 1e-12)
        ) {
          const actualDt = engineRef.current.step(particlesRef.current);
          timeRef.current += actualDt;
          accumulatorRef.current -= params.dt;
          steps++;
        }

        let collisions = 0;
        let interparticleCollisions = 0;
        for (const p of particlesRef.current) {
          collisions += p.collisionCount || 0;
          interparticleCollisions += p.interparticleCollisionCount || 0;
        }
        collisionCountRef.current = collisions;
        interparticleCollisionCountRef.current = interparticleCollisions;
      }
    },
    [isRunning, params.dt]
  );

  const reset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      randomRef.current.reset(params.seed);
      accumulatorRef.current = 0;
      particlesRef.current = initializeDefaultParticles(params, () => randomRef.current.next());
      timeRef.current = 0;
      collisionCountRef.current = 0;
      interparticleCollisionCountRef.current = 0;
    }
  }, [params]);

  const updateParams = useCallback((newParams: Partial<EngineParams>) => {
    if (!engineRef.current) return;

    const previousParams = appliedParamsRef.current;
    const updatedParams = { ...previousParams, ...newParams };

    const boundaryConfig = createBoundaryConfig(updatedParams);
    const strategies = createStrategiesFromParams(updatedParams);

    engineRef.current.updateConfiguration({
      timeStep: updatedParams.dt,
      boundaries: boundaryConfig,
      canvasSize: { width: updatedParams.canvasWidth, height: updatedParams.canvasHeight },
      dimension: updatedParams.dimension as Dimension,
      strategies,
    });

    const reinitializeKeys: Array<keyof EngineParams> = [
      'particleCount', 'dimension', 'seed', 'initialDistType', 'distSigmaX', 'distSigmaY',
      'distR0', 'distDR', 'distThickness', 'distNx', 'distNy', 'distJitter', 'strategies',
      'strategyType', 'collisionRate', 'velocity', 'levyAlpha', 'levyScale', 'fractionalBeta',
      'fractionalWaitingScale', 'fractionalJumpLength', 'kacGoldsteinOrdering',
    ];
    const shouldReinitialize = reinitializeKeys.some((key) =>
      newParams[key] !== undefined && newParams[key] !== previousParams[key]
    );
    appliedParamsRef.current = updatedParams;
    if (shouldReinitialize) {
      randomRef.current.reset(updatedParams.seed);
      particlesRef.current = initializeDefaultParticles(updatedParams, () => randomRef.current.next());
      timeRef.current = 0;
      accumulatorRef.current = 0;
      collisionCountRef.current = 0;
      interparticleCollisionCountRef.current = 0;
      engineRef.current.reset();
    }
  }, []);

  const getStats = useCallback(() => {
    return {
      time: timeRef.current,
      collisionCount: collisionCountRef.current,
      interparticleCollisionCount: interparticleCollisionCountRef.current,
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

export function adaptParticles(
  particles: Particle[],
  projectPosition?: (particle: Particle, index: number) => { x: number; y: number; color?: [number, number, number, number] },
): SimpleParticle[] {
  return particles.filter((p) => p.isActive).map((p, index) => {
    const projection = projectPosition?.(p, index);
    return {
      id: index,
      ...(projection ?? p.position),
      vx: p.velocity.vx,
      vy: p.velocity.vy,
      radius: p.radius || 3,
      color: projection?.color ?? [0.23, 0.51, 0.96, 0.8] as [number, number, number, number],
    };
  });
}
