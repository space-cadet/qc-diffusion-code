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
  type TelegraphModeSnapshot,
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

function DockedPanel({ title, collapsed, onToggleCollapse, autoUpdate, onToggleAutoUpdate, children }: {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  autoUpdate?: boolean;
  onToggleAutoUpdate?: () => void;
  children: React.ReactNode;
}) {
  return <section className="h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <header className="drag-handle flex h-10 cursor-move select-none items-center justify-between border-b border-slate-200 bg-slate-50 px-3 text-sm font-semibold">
      <span>{title}</span>
      <div className="flex items-center gap-2">
        {onToggleAutoUpdate && <button type="button" aria-pressed={autoUpdate} className={`cursor-pointer rounded border px-2 py-0.5 text-xs ${autoUpdate ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"}`} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onToggleAutoUpdate(); }}>
          Auto {autoUpdate ? "ON" : "OFF"}
        </button>}
        <button type="button" className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-100" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onToggleCollapse(); }}>
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
    </header>
    <div hidden={collapsed} className="h-[calc(100%-2.5rem)] overflow-auto p-2">{children}</div>
  </section>;
}

function isWalkStrategy(strategy: string): strategy is WalkStrategy {
  return WALK_STRATEGIES.includes(strategy as WalkStrategy);
}

export default function RandomWalkSimV2() {
  const {
    gridLayoutParams,
    setGridLayoutParams,
    randomWalkSimLayouts,
    setRandomWalkSimLayouts,
    randomWalkSimCollapsed,
    setRandomWalkSimCollapsed,
    randomWalkViewportZoom,
    setRandomWalkViewportZoom,
    randomWalkSimulationState,
    setRandomWalkSimulationState,
    updateSimulationMetrics,
    randomWalkUIState,
    setRandomWalkUIState,
  } = useAppStore();

  const particleViewAutoUpdate = randomWalkUIState.particleViewAutoUpdate ?? true;
  const persistentDiagnosticsAutoUpdate = randomWalkUIState.persistentDiagnosticsAutoUpdate ?? true;
  const strategyDiagnosticsAutoUpdate = randomWalkUIState.strategyDiagnosticsAutoUpdate ?? true;
  const particleViewCollapsed = Boolean(randomWalkSimCollapsed.canvas);
  const densityCollapsed = Boolean(randomWalkSimCollapsed.density);
  const persistentDiagnosticsCollapsed = Boolean(randomWalkSimCollapsed.persistentDiagnostics);
  const strategyDiagnosticsCollapsed = Boolean(randomWalkSimCollapsed.diagnostics);
  const particleViewUpdatesEnabled = particleViewAutoUpdate && !particleViewCollapsed;
  const persistentDiagnosticsUpdatesEnabled = persistentDiagnosticsAutoUpdate && !persistentDiagnosticsCollapsed;
  const strategyDiagnosticsUpdatesEnabled = strategyDiagnosticsAutoUpdate && !strategyDiagnosticsCollapsed;

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
  const [particleViewWalkDiagnostics, setParticleViewWalkDiagnostics] = useState<PersistentWalkDiagnostics | null>(null);
  const walkDiagnosticsRef = useRef<PersistentWalkDiagnostics | null>(null);
  const [telegraphModeHistory, setTelegraphModeHistory] = useState<TelegraphModeSnapshot[]>([]);
  const telegraphModeHistoryRef = useRef<TelegraphModeSnapshot[]>([]);
  const diagnosticsRecorderRef = useRef<StrategyDiagnosticsRecorder | null>(null);
  const spaceTimeDensityEnabledRef = useRef(false);
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
    interparticleCollisions: gridLayoutParams.interparticleCollisions,
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
  }, [diagnosticsConfig]);

  useEffect(() => {
    if (strategyDiagnosticsAutoUpdate && !strategyDiagnosticsCollapsed) {
      setStrategyDiagnostics(diagnosticsRecorderRef.current?.snapshot() ?? null);
    }
  }, [diagnosticsConfig, strategyDiagnosticsAutoUpdate, strategyDiagnosticsCollapsed]);

  useEffect(() => {
    if (!persistentDiagnosticsAutoUpdate || persistentDiagnosticsCollapsed) return;
    setWalkDiagnostics(walkDiagnosticsRef.current);
    setTelegraphModeHistory(telegraphModeHistoryRef.current);
  }, [persistentDiagnosticsAutoUpdate, persistentDiagnosticsCollapsed]);

  useEffect(() => {
    telegraphModeHistoryRef.current = [];
    walkDiagnosticsRef.current = null;
    setTelegraphModeHistory([]);
    setWalkDiagnostics(null);
    setParticleViewWalkDiagnostics(null);
  }, [walkConfig]);

  const resetStrategyDiagnostics = useCallback(() => {
    diagnosticsRecorderRef.current?.reset();
    if (strategyDiagnosticsAutoUpdate && !strategyDiagnosticsCollapsed) {
      setStrategyDiagnostics(diagnosticsRecorderRef.current?.snapshot() ?? null);
    }
  }, [strategyDiagnosticsAutoUpdate, strategyDiagnosticsCollapsed]);

  const handleStrategyEvent = useCallback((event: StrategyEvent) => {
    if (strategyDiagnosticsUpdatesEnabled) diagnosticsRecorderRef.current?.recordEvent(event);
  }, [strategyDiagnosticsUpdatesEnabled]);

  const handleCaptureDiagnosticComparison = useCallback(() => {
    if (strategyDiagnostics) setDiagnosticComparison(strategyDiagnostics);
  }, [strategyDiagnostics]);

  const handleSpaceTimeDensityChange = useCallback((enabled: boolean) => {
    if (spaceTimeDensityEnabledRef.current === enabled) return;
    spaceTimeDensityEnabledRef.current = enabled;
    const recorder = diagnosticsRecorderRef.current;
    recorder?.clearSpaceTimeDensity();
    setStrategyDiagnostics(recorder?.snapshot() ?? null);
  }, []);

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
    return {
      x: particle.position.x * size.width / CANVAS_WIDTH,
      y: particle.position.y * size.height / CANVAS_HEIGHT,
    };
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
        gridLayoutParams.velocity * (particleViewWalkDiagnostics?.time ?? 0),
        0.5,
        ...liveParticlesRef.current.map((particle) => Math.hypot(particle.position.x - CANVAS_WIDTH / 2, particle.position.y - CANVAS_HEIGHT / 2) / Math.max(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 6, 1)),
      );
      const circleRadius = Math.min(46, ((particleViewWalkDiagnostics?.frontRadius ?? 0) / displayRadius) * 46);
      return <>
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
          {gridLayoutParams.initialDistType === "origin" && <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="#f97316" strokeDasharray="5 4" />}
        </svg>
        <span className="absolute left-2 top-2 rounded bg-white/80 px-1 text-xs text-slate-700">{gridLayoutParams.initialDistType === "origin" ? `Causal front r = vt = ${(particleViewWalkDiagnostics?.frontRadius ?? 0).toFixed(2)}` : "Distributed initial condition"}</span>
      </>;
    }
    return null;
  }, [gridLayoutParams.initialDistType, gridLayoutParams.velocity, isKacGoldstein, isMasoliverLindenbergh, particleViewWalkDiagnostics?.frontRadius, particleViewWalkDiagnostics?.time]);

  const handleStart = () => setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: true, status: "Running" });
  const handlePause = () => setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, status: "Paused" });

  const handleReset = () => {
    resetStrategyDiagnostics();
    setWalkDiagnostics(null);
    walkDiagnosticsRef.current = null;
    setParticleViewWalkDiagnostics(null);
    telegraphModeHistoryRef.current = [];
    setTelegraphModeHistory([]);
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, status: "Stopped" });
    timeRef.current = 0;
    updateSimulationMetrics(0, 0, "Stopped", 0);
    setResetVersion((version) => version + 1);
  };

  const handleInitialize = () => {
    resetStrategyDiagnostics();
    setWalkDiagnostics(null);
    walkDiagnosticsRef.current = null;
    setParticleViewWalkDiagnostics(null);
    telegraphModeHistoryRef.current = [];
    setTelegraphModeHistory([]);
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
    if (strategyDiagnosticsUpdatesEnabled) {
      recorder?.recordFrame(particles, stats.time, forcePublish, spaceTimeDensityEnabledRef.current);
      if (recorder?.shouldPublish(performance.now(), forcePublish)) setStrategyDiagnostics(recorder.snapshot());
    }
    if (!walkMode) return;
    if (!persistentDiagnosticsUpdatesEnabled && !particleViewUpdatesEnabled) return;

    const now = performance.now();
    if (now - lastWalkDiagnosticsTimeRef.current < 200 && stats.time !== 0) return;
    const unitScale = Math.max(Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 6, 1);
    const modelParticles = particles.map((particle) => ({
      ...particle,
      position: walkMode === "kac-goldstein"
        ? { x: (particle.position.x - CANVAS_WIDTH / 2) * 12 / CANVAS_WIDTH, y: 0 }
        : { x: (particle.position.x - CANVAS_WIDTH / 2) / unitScale, y: (CANVAS_HEIGHT / 2 - particle.position.y) / unitScale },
      initial: particle.initial ? {
        ...particle.initial,
        position: walkMode === "kac-goldstein"
          ? { x: (particle.initial.position.x - CANVAS_WIDTH / 2) * 12 / CANVAS_WIDTH, y: 0 }
          : { x: (particle.initial.position.x - CANVAS_WIDTH / 2) / unitScale, y: (CANVAS_HEIGHT / 2 - particle.initial.position.y) / unitScale },
      } : undefined,
      velocity: walkMode === "kac-goldstein"
        ? { ...particle.velocity, vx: Math.sign(particle.velocity.vx) }
        : { vx: particle.velocity.vx / unitScale, vy: particle.velocity.vy / unitScale },
    }));
    const nextWalkDiagnostics = calculatePersistentWalkDiagnostics(walkMode, walkConfig, stats.time, modelParticles);
    walkDiagnosticsRef.current = nextWalkDiagnostics;
    if (persistentDiagnosticsUpdatesEnabled) setWalkDiagnostics(nextWalkDiagnostics);
    if (particleViewUpdatesEnabled) setParticleViewWalkDiagnostics(nextWalkDiagnostics);
    if (nextWalkDiagnostics.telegraphModes) {
      const previous = telegraphModeHistoryRef.current;
      if (!previous.length || nextWalkDiagnostics.time - previous[previous.length - 1].time >= 0.05) {
        const next = [...previous, nextWalkDiagnostics.telegraphModes].slice(-240);
        telegraphModeHistoryRef.current = next;
        if (persistentDiagnosticsUpdatesEnabled) setTelegraphModeHistory(next);
      }
    }
    lastWalkDiagnosticsTimeRef.current = now;
  }, [isRunning, particleViewUpdatesEnabled, persistentDiagnosticsUpdatesEnabled, randomWalkSimulationState.status, strategyDiagnosticsUpdatesEnabled, updateSimulationMetrics, walkConfig, walkMode]);

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

  const defaultPanelLayouts = useMemo(() => [
    { i: "parameters", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
    { i: "canvas", x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 },
    { i: "density", x: 0, y: 8, w: 8, h: 5, minW: 6, minH: 3 },
    { i: "history", x: 8, y: 8, w: 4, h: 5, minW: 3, minH: 3 },
    { i: "persistentDiagnostics", x: 0, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: "diagnostics", x: 6, y: 13, w: 6, h: 5, minW: 4, minH: 3 },
    { i: "export", x: 0, y: 18, w: 12, h: 3, minW: 4, minH: 2 },
  ], []);
  const savedLayouts = useMemo(() => defaultPanelLayouts.map((defaultLayout) => ({
    ...defaultLayout,
    ...randomWalkSimLayouts.find((item) => item.i === defaultLayout.i),
  })), [defaultPanelLayouts, randomWalkSimLayouts]);
  const renderedLayouts = useMemo(() => savedLayouts.map((item) => ({
    ...item,
    h: randomWalkSimCollapsed[item.i] ? 1 : item.h,
  })), [savedLayouts, randomWalkSimCollapsed]);
  const onLayoutChange = useCallback((layout: any[]) => {
    setRandomWalkSimLayouts(layout.map((item) => {
      const saved = savedLayouts.find((candidate) => candidate.i === item.i);
      return randomWalkSimCollapsed[item.i] ? { ...item, h: saved?.h ?? item.h } : item;
    }));
  }, [randomWalkSimCollapsed, savedLayouts, setRandomWalkSimLayouts]);
  const togglePanel = useCallback((panel: string) => {
    setRandomWalkSimCollapsed(panel, !randomWalkSimCollapsed[panel]);
  }, [randomWalkSimCollapsed, setRandomWalkSimCollapsed]);

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <RandomWalkHeader />
      <div className="flex-1 p-4 relative">
        <ReactGridLayout
          className="layout"
          layout={renderedLayouts}
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
            <DockedPanel title="Parameters" collapsed={Boolean(randomWalkSimCollapsed.parameters)} onToggleCollapse={() => togglePanel("parameters")}>
            <RandomWalkParameterPanelV2
              gridLayoutParams={gridLayoutParams}
              setGridLayoutParams={setGridLayoutParams}
              simulationState={randomWalkSimulationState}
              handleStart={handleStart}
              handlePause={handlePause}
              handleReset={handleReset}
              handleInitialize={handleInitialize}
              viewportZoom={randomWalkViewportZoom}
              onViewportZoomChange={setRandomWalkViewportZoom}
            />
            </DockedPanel>
          </div>
          <div key="canvas" id="random-walk-canvas">
            <DockedPanel title="Particle View" collapsed={Boolean(randomWalkSimCollapsed.canvas)} onToggleCollapse={() => togglePanel("canvas")} autoUpdate={particleViewAutoUpdate} onToggleAutoUpdate={() => setRandomWalkUIState({ particleViewAutoUpdate: !particleViewAutoUpdate })}>
            <ParticleCanvasV2
              key={`walk-${gridLayoutParams.dimension}`}
              params={engineParams}
              autoRender={particleViewAutoUpdate && !particleViewCollapsed}
              projectPosition={projectWalkPosition}
              viewportZoom={randomWalkViewportZoom}
              overlay={walkOverlay}
              isRunning={isRunning}
              initializeVersion={initializeVersion}
              resetVersion={resetVersion}
              liveParticlesRef={liveParticlesRef}
              onEngineFrame={handleEngineFrame}
              onStrategyEvent={handleStrategyEvent}
            />
            </DockedPanel>
          </div>
          <div key="density" id="density">
            <DockedPanel title="Density" collapsed={Boolean(randomWalkSimCollapsed.density)} onToggleCollapse={() => togglePanel("density")}>
            <DensityComparison
              particles={liveParticlesRef.current}
              particlesRef={liveParticlesRef}
              particleCount={liveParticlesRef.current.length}
              gridLayoutParams={gridLayoutParams}
              simulationState={randomWalkSimulationState}
              updatesEnabled={!densityCollapsed}
              binSize={isKacGoldstein ? 800 / 120 : isMasoliverLindenbergh ? 5 : undefined}
            />
            </DockedPanel>
          </div>
          <div key="history" id="history">
            <DockedPanel title="History" collapsed={Boolean(randomWalkSimCollapsed.history)} onToggleCollapse={() => togglePanel("history")}>
            <HistoryPanel simulationState={randomWalkSimulationState} />
            </DockedPanel>
          </div>
          <div key="persistentDiagnostics" id="persistent-diagnostics">
            <DockedPanel title="Persistent Walk Diagnostics" collapsed={Boolean(randomWalkSimCollapsed.persistentDiagnostics)} onToggleCollapse={() => togglePanel("persistentDiagnostics")} autoUpdate={persistentDiagnosticsAutoUpdate} onToggleAutoUpdate={() => setRandomWalkUIState({ persistentDiagnosticsAutoUpdate: !persistentDiagnosticsAutoUpdate })}>
              {walkMode ? <PersistentWalkDiagnosticsPanel mode={walkMode} config={walkConfig} diagnostics={walkDiagnostics} telegraphModeHistory={telegraphModeHistory} /> : <p className="text-sm text-slate-500">Select Kac–Goldstein or Masoliver-Lindenbergh to view walk diagnostics.</p>}
            </DockedPanel>
          </div>
          <div key="diagnostics" id="diagnostics">
            <DockedPanel title="Strategy Diagnostics" collapsed={Boolean(randomWalkSimCollapsed.diagnostics)} onToggleCollapse={() => togglePanel("diagnostics")} autoUpdate={strategyDiagnosticsAutoUpdate} onToggleAutoUpdate={() => setRandomWalkUIState({ strategyDiagnosticsAutoUpdate: !strategyDiagnosticsAutoUpdate })}>
              <StrategyDiagnosticsPanel
                snapshot={strategyDiagnostics}
                comparison={diagnosticComparison}
                onCaptureComparison={handleCaptureDiagnosticComparison}
                onClearComparison={() => setDiagnosticComparison(null)}
                onSpaceTimeDensityChange={handleSpaceTimeDensityChange}
              />
            </DockedPanel>
          </div>
          <div key="export" id="export">
            <DockedPanel title="Export" collapsed={Boolean(randomWalkSimCollapsed.export)} onToggleCollapse={() => togglePanel("export")}>
            <ExportPanel
              simulationState={randomWalkSimulationState}
              onExport={() => console.log("Export")}
              onCopy={() => console.log("Copy")}
              onShare={() => console.log("Share")}
            />
            </DockedPanel>
          </div>
        </ReactGridLayout>

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
