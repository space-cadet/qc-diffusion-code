import React, { useRef, useCallback, useMemo, useState, useEffect } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import { useAppStore } from "./stores/appStore";
import { RandomWalkParameterPanelV2 } from "./components/RandomWalkParameterPanelV2";
import { HistoryPanel } from "./components/HistoryPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvasV2 } from "./components/ParticleCanvasV2";
import { DensityComparison } from "./components/DensityComparison";
import { RandomWalkHeader } from "./components/RandomWalkHeader";
import { FloatingPanel } from "./components/common/FloatingPanel";
import { ObservablesPanel } from "./components/ObservablesPanel";
import { CustomObservablesPanel } from "./components/CustomObservablesPanel";
import { useRandomWalkPanels } from "./hooks/useRandomWalkPanels";
import { ObservableManager } from "./physics/ObservableManager";
import type { EngineParams } from "./hooks/useOriginalPhysicsEngine";
import type { Particle } from "./physics/types/Particle";
import {
  calculatePersistentWalkDiagnostics,
  type PersistentWalkDiagnostics,
  type PersistentWalkMode,
  type PersistentWalkRunConfig,
} from "./persistentWalk/persistentWalkRandomWalk";
import { PersistentWalkDiagnosticsPanel } from "./persistentWalk/PersistentWalkRandomWalkMode";
import { StrategyDiagnosticsPanel } from "./components/StrategyDiagnosticsPanel";
import {
  StrategyDiagnosticsRecorder,
  type DiagnosticsConfig,
  type StrategyDiagnosticsSnapshot,
} from "./physics/diagnostics/strategyDiagnostics";
import type { StrategyEvent } from "./physics/types/PhysicsContext";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WALK_STRATEGIES = ["kac-goldstein", "masoliver-lindenbergh"] as const;
type WalkStrategy = typeof WALK_STRATEGIES[number];

function isWalkStrategy(strategy: string): strategy is WalkStrategy {
  return WALK_STRATEGIES.includes(strategy as WalkStrategy);
}

export default function RandomWalkSimV2() {
  const {
    gridLayoutParams,
    setGridLayoutParams,
    randomWalkSimLayouts,
    setRandomWalkSimLayouts,
    randomWalkSimulationState,
    setRandomWalkSimulationState,
    updateSimulationMetrics,
  } = useAppStore();

  const isRunning = randomWalkSimulationState.isRunning;
  const strategy = gridLayoutParams.strategies?.find((value) =>
    ["simple", "ctrw", "levy", "levy-walk", "fractional", ...WALK_STRATEGIES].includes(value),
  ) ?? "simple";
  const walkMode: PersistentWalkMode | null = isWalkStrategy(strategy) ? strategy : null;
  const isKacGoldstein = walkMode === "kac-goldstein";
  const isMasoliverLindenbergh = walkMode === "masoliver-lindenbergh";

  const timeRef = useRef(0);
  const liveParticlesRef = useRef<Particle[]>([]);
  const [initializeVersion, setInitializeVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [simReady] = useState(true);
  const [walkDiagnostics, setWalkDiagnostics] = useState<PersistentWalkDiagnostics | null>(null);
  const diagnosticsRecorderRef = useRef<StrategyDiagnosticsRecorder | null>(null);
  const [strategyDiagnostics, setStrategyDiagnostics] = useState<StrategyDiagnosticsSnapshot | null>(null);
  const [diagnosticComparison, setDiagnosticComparison] = useState<StrategyDiagnosticsSnapshot | null>(null);
  const lastWalkDiagnosticsTimeRef = useRef(0);

  const engineParams: EngineParams = useMemo(() => ({
    particleCount: gridLayoutParams.particles,
    dimension: gridLayoutParams.dimension,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    velocity: gridLayoutParams.velocity,
    dt: gridLayoutParams.dt,
    temperature: gridLayoutParams.temperature,
    boundaryCondition: gridLayoutParams.boundaryCondition,
    interparticleCollisions: gridLayoutParams.interparticleCollisions,
    collisionRate: gridLayoutParams.collisionRate,
    collisionRadius: gridLayoutParams.collisionRate || 5,
    initialDistType: gridLayoutParams.initialDistType || "uniform",
    strategyType: (gridLayoutParams as any).strategyType,
    strategies: gridLayoutParams.strategies,
    seed: gridLayoutParams.seed ?? 42,
    levyAlpha: gridLayoutParams.levyAlpha ?? 1.5,
    levyScale: gridLayoutParams.levyScale ?? 20,
    fractionalBeta: gridLayoutParams.fractionalBeta ?? 0.7,
    fractionalWaitingScale: gridLayoutParams.fractionalWaitingScale ?? 0.1,
    fractionalJumpLength: gridLayoutParams.fractionalJumpLength ?? 10,
    distSigmaX: gridLayoutParams.distSigmaX,
    distSigmaY: gridLayoutParams.distSigmaY,
    distR0: gridLayoutParams.distR0,
    distDR: gridLayoutParams.distDR,
    distThickness: gridLayoutParams.distThickness,
    distNx: gridLayoutParams.distNx,
    distNy: gridLayoutParams.distNy,
    distJitter: gridLayoutParams.distJitter,
    kacGoldsteinOrdering: gridLayoutParams.kacGoldsteinOrdering ?? "reduced",
  }), [gridLayoutParams]);

  const walkConfig = useMemo<PersistentWalkRunConfig>(() => ({
    walkers: gridLayoutParams.particles,
    seed: gridLayoutParams.seed ?? 42,
    profile: gridLayoutParams.initialDistType === "bimodal" || gridLayoutParams.initialDistType === "asymmetric"
      ? gridLayoutParams.initialDistType
      : "centered",
    ordering: gridLayoutParams.kacGoldsteinOrdering ?? "reduced",
    flipRate: gridLayoutParams.collisionRate,
    speed: gridLayoutParams.velocity,
    resetRate: gridLayoutParams.collisionRate,
    boundaryCondition: gridLayoutParams.boundaryCondition,
    initialDistType: gridLayoutParams.initialDistType,
    distSigmaX: gridLayoutParams.distSigmaX,
    distSigmaY: gridLayoutParams.distSigmaY,
    distR0: gridLayoutParams.distR0,
    distDR: gridLayoutParams.distDR,
    distThickness: gridLayoutParams.distThickness,
    distNx: gridLayoutParams.distNx,
    distNy: gridLayoutParams.distNy,
    distJitter: gridLayoutParams.distJitter,
  }), [gridLayoutParams]);

  const diagnosticsConfig = useMemo<DiagnosticsConfig>(() => ({
    strategy,
    dimension: engineParams.dimension,
    boundary: engineParams.boundaryCondition,
    seed: engineParams.seed,
    particleCount: engineParams.particleCount,
    initialDistribution: engineParams.initialDistType,
    parameters: {
      velocity: engineParams.velocity,
      collisionRate: engineParams.collisionRate,
      levyAlpha: engineParams.levyAlpha,
      levyScale: engineParams.levyScale,
      fractionalBeta: engineParams.fractionalBeta,
      fractionalWaitingScale: engineParams.fractionalWaitingScale,
      fractionalJumpLength: engineParams.fractionalJumpLength,
      kacGoldsteinOrdering: engineParams.kacGoldsteinOrdering === "derivative" ? 1 : 0,
      interparticleCollisions: engineParams.interparticleCollisions ? 1 : 0,
    },
  }), [engineParams, strategy]);

  useEffect(() => {
    diagnosticsRecorderRef.current = new StrategyDiagnosticsRecorder(diagnosticsConfig);
    setStrategyDiagnostics(diagnosticsRecorderRef.current.snapshot());
  }, [diagnosticsConfig]);

  const resetStrategyDiagnostics = useCallback(() => {
    diagnosticsRecorderRef.current?.reset();
    setStrategyDiagnostics(diagnosticsRecorderRef.current?.snapshot() ?? null);
  }, []);

  const handleStrategyEvent = useCallback((event: StrategyEvent) => {
    diagnosticsRecorderRef.current?.recordEvent(event);
  }, []);

  const handleCaptureDiagnosticComparison = useCallback(() => {
    if (strategyDiagnostics) setDiagnosticComparison(strategyDiagnostics);
  }, [strategyDiagnostics]);

  const projectWalkPosition = useCallback((
    particle: Particle,
    _index: number,
    size: { width: number; height: number },
    time: number,
  ) => {
    if (isKacGoldstein) {
      const beta = (particle.position.x - CANVAS_WIDTH / 2) * 12 / CANVAS_WIDTH;
      const radius = gridLayoutParams.boundaryCondition === "unbounded"
        ? Math.max(3, Math.abs(gridLayoutParams.velocity * time), ...liveParticlesRef.current.map((item) => Math.abs((item.position.x - CANVAS_WIDTH / 2) * 12 / CANVAS_WIDTH)))
        : 6;
      return {
        x: ((beta + radius) / (2 * radius)) * size.width,
        y: size.height / 2,
        color: (particle.velocity.vx > 0 ? [0.12, 0.42, 0.92, 0.9] : [0.95, 0.38, 0.08, 0.9]) as [number, number, number, number],
      };
    }
    if (isMasoliverLindenbergh) {
      const unitScale = Math.max(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 6, 1);
      const x = particle.position.x - CANVAS_WIDTH / 2;
      const y = CANVAS_HEIGHT / 2 - particle.position.y;
      const radius = gridLayoutParams.boundaryCondition === "unbounded"
        ? Math.max(gridLayoutParams.velocity * time, 0.5, ...liveParticlesRef.current.map((item) => Math.hypot(item.position.x - CANVAS_WIDTH / 2, item.position.y - CANVAS_HEIGHT / 2) / unitScale))
        : 3;
      const scale = Math.min(size.width, size.height) / (2 * radius * 1.08);
      return { x: size.width / 2 + (x / unitScale) * scale, y: size.height / 2 - (y / unitScale) * scale };
    }
    return { x: particle.position.x, y: particle.position.y };
  }, [gridLayoutParams.boundaryCondition, gridLayoutParams.velocity, isKacGoldstein, isMasoliverLindenbergh]);

  const walkOverlay = useMemo(() => {
    if (isKacGoldstein) {
      return <>
        <div className="absolute left-2 right-2 top-1/2 border-t border-slate-300" />
        <span className="absolute left-2 top-2 rounded bg-white/80 px-1 text-xs text-slate-700"><span className="text-blue-700">■ →</span> <span className="text-orange-600">■ ←</span> · dot color changes at each flip</span>
        <span className="absolute left-2 bottom-2 text-xs text-slate-700">β = −6</span>
        <span className="absolute right-2 bottom-2 text-xs text-slate-700">β = 6</span>
      </>;
    }
    if (isMasoliverLindenbergh) {
      const displayRadius = Math.max(
        gridLayoutParams.velocity * (walkDiagnostics?.time ?? 0),
        0.5,
        ...liveParticlesRef.current.map((particle) => Math.hypot(particle.position.x - CANVAS_WIDTH / 2, particle.position.y - CANVAS_HEIGHT / 2) / Math.max(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 6, 1)),
      );
      const circleRadius = Math.min(46, ((walkDiagnostics?.frontRadius ?? 0) / displayRadius) * 46);
      return <>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          {gridLayoutParams.initialDistType === "origin" && <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="#f97316" strokeDasharray="5 4" />}
        </svg>
        <span className="absolute left-2 top-2 rounded bg-white/80 px-1 text-xs text-slate-700">{gridLayoutParams.initialDistType === "origin" ? `Causal front r = vt = ${(walkDiagnostics?.frontRadius ?? 0).toFixed(2)}` : "Distributed initial condition"}</span>
      </>;
    }
    return null;
  }, [gridLayoutParams.initialDistType, gridLayoutParams.velocity, isKacGoldstein, isMasoliverLindenbergh, walkDiagnostics?.frontRadius, walkDiagnostics?.time]);

  const handleStart = () => setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: true, status: "Running" });
  const handlePause = () => setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, status: "Paused" });

  const handleReset = () => {
    resetStrategyDiagnostics();
    setWalkDiagnostics(null);
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, status: "Stopped" });
    timeRef.current = 0;
    updateSimulationMetrics(0, 0, "Stopped", 0);
    setResetVersion((version) => version + 1);
  };

  const handleInitialize = () => {
    resetStrategyDiagnostics();
    setWalkDiagnostics(null);
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, collisions: 0, status: "Initialized" });
    timeRef.current = 0;
    lastWalkDiagnosticsTimeRef.current = 0;
    updateSimulationMetrics(0, 0, "Initialized", 0);
    setInitializeVersion((version) => version + 1);
  };

  const handleEngineFrame = useCallback((particles: Particle[], stats: {
    time: number;
    collisionCount: number;
    interparticleCollisionCount: number;
    particleCount: number;
  }) => {
    timeRef.current = stats.time;
    updateSimulationMetrics(
      stats.time,
      stats.collisionCount,
      isRunning ? "Running" : randomWalkSimulationState.status,
      stats.interparticleCollisionCount,
    );
    const recorder = diagnosticsRecorderRef.current;
    const forcePublish = !isRunning;
    recorder?.recordFrame(particles, stats.time, forcePublish);
    if (recorder?.shouldPublish(performance.now(), forcePublish)) setStrategyDiagnostics(recorder.snapshot());
    if (!walkMode) return;

    const now = performance.now();
    if (now - lastWalkDiagnosticsTimeRef.current < 200 && stats.time !== 0) return;
    const unitScale = Math.max(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 6, 1);
    const modelParticles = particles.map((particle) => ({
      ...particle,
      position: walkMode === "kac-goldstein"
        ? { x: (particle.position.x - CANVAS_WIDTH / 2) * 12 / CANVAS_WIDTH, y: 0 }
        : { x: (particle.position.x - CANVAS_WIDTH / 2) / unitScale, y: (CANVAS_HEIGHT / 2 - particle.position.y) / unitScale },
      velocity: walkMode === "kac-goldstein"
        ? { ...particle.velocity, vx: Math.sign(particle.velocity.vx) }
        : { vx: particle.velocity.vx / unitScale, vy: particle.velocity.vy / unitScale },
    }));
    setWalkDiagnostics(calculatePersistentWalkDiagnostics(walkMode, walkConfig, stats.time, modelParticles));
    lastWalkDiagnosticsTimeRef.current = now;
  }, [isRunning, randomWalkSimulationState.status, updateSimulationMetrics, walkConfig, walkMode]);

  const observableManagerRef = useRef(
    new ObservableManager({ width: engineParams.canvasWidth, height: engineParams.canvasHeight }),
  );
  const simulatorLikeRef = useRef<any>({
    getObservableManager: () => observableManagerRef.current,
    getParticleManager: () => ({ getAllParticles: () => liveParticlesRef.current }),
    getTime: () => timeRef.current,
    getObservableData: (id: string) => observableManagerRef.current.getResult(id),
  });

  const {
    observablesWindow,
    observablesCollapsed,
    handleObservablesDragStop,
    handleObservablesResizeStop,
    handleObservablesMouseDown,
    handleObservablesToggleCollapse,
    customObservablesWindow,
    customObservablesCollapsed,
    handleCustomObservablesDragStop,
    handleCustomObservablesResizeStop,
    handleCustomObservablesMouseDown,
    handleCustomObservablesToggleCollapse,
  } = useRandomWalkPanels();

  const onLayoutChange = (layout: any) => setRandomWalkSimLayouts(layout);

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <RandomWalkHeader />
      <div className="flex-1 p-4 relative">
        <ReactGridLayout
          className="layout"
          layout={randomWalkSimLayouts}
          onLayoutChange={onLayoutChange}
          cols={12}
          rowHeight={50}
          isDraggable={true}
          isResizable={true}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          draggableHandle=".drag-handle"
        >
          <div key="parameters" id="random-walk-parameters">
            <RandomWalkParameterPanelV2
              gridLayoutParams={gridLayoutParams}
              setGridLayoutParams={setGridLayoutParams}
              simulationState={randomWalkSimulationState}
              handleStart={handleStart}
              handlePause={handlePause}
              handleReset={handleReset}
              handleInitialize={handleInitialize}
            />
          </div>
          <div key="canvas" id="random-walk-canvas">
            <ParticleCanvasV2
              key={`walk-${gridLayoutParams.dimension}`}
              params={engineParams}
              projectPosition={projectWalkPosition}
              overlay={walkOverlay}
              isRunning={isRunning}
              initializeVersion={initializeVersion}
              resetVersion={resetVersion}
              liveParticlesRef={liveParticlesRef}
              onEngineFrame={handleEngineFrame}
              onStrategyEvent={handleStrategyEvent}
            />
          </div>
          <div key="density" id="density">
            <DensityComparison
              particles={liveParticlesRef.current}
              particleCount={liveParticlesRef.current.length}
              gridLayoutParams={gridLayoutParams}
              simulationState={randomWalkSimulationState}
              binSize={isKacGoldstein ? 800 / 120 : isMasoliverLindenbergh ? 5 : undefined}
            />
          </div>
          <div key="history" id="history">
            <HistoryPanel simulationState={randomWalkSimulationState} />
            {walkMode && <PersistentWalkDiagnosticsPanel mode={walkMode} config={walkConfig} diagnostics={walkDiagnostics} />}
          </div>
          <div key="export" id="export">
            <ExportPanel
              simulationState={randomWalkSimulationState}
              onExport={() => console.log("Export")}
              onCopy={() => console.log("Copy")}
              onShare={() => console.log("Share")}
            />
          </div>
        </ReactGridLayout>

        <div id="diagnostics">
          <StrategyDiagnosticsPanel
            snapshot={strategyDiagnostics}
            comparison={diagnosticComparison}
            onCaptureComparison={() => strategyDiagnostics && setDiagnosticComparison(strategyDiagnostics)}
            onClearComparison={() => setDiagnosticComparison(null)}
          />
        </div>

        <FloatingPanel
          title="Observables"
          position={{ x: observablesWindow.left, y: observablesWindow.top }}
          size={{ width: observablesWindow.width, height: observablesWindow.height }}
          zIndex={observablesWindow.zIndex}
          isCollapsed={observablesCollapsed}
          onToggleCollapse={handleObservablesToggleCollapse}
          onDragStop={handleObservablesDragStop}
          onResizeStop={handleObservablesResizeStop}
          onMouseDown={handleObservablesMouseDown}
        >
          <ObservablesPanel
            simulatorRef={simulatorLikeRef}
            isRunning={isRunning}
            simulationStatus={randomWalkSimulationState.status}
            simulationTime={randomWalkSimulationState.time}
            simReady={simReady}
          />
        </FloatingPanel>

        <FloatingPanel
          title="Custom Observables"
          position={{ x: customObservablesWindow.left, y: customObservablesWindow.top }}
          size={{ width: customObservablesWindow.width, height: customObservablesWindow.height }}
          zIndex={customObservablesWindow.zIndex}
          isCollapsed={customObservablesCollapsed}
          onToggleCollapse={handleCustomObservablesToggleCollapse}
          onDragStop={handleCustomObservablesDragStop}
          onResizeStop={handleCustomObservablesResizeStop}
          onMouseDown={handleCustomObservablesMouseDown}
        >
          <CustomObservablesPanel simulatorRef={simulatorLikeRef} simReady={simReady} />
        </FloatingPanel>
      </div>
    </div>
  );
}
