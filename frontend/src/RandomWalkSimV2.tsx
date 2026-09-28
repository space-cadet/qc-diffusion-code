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
import { createT15PhysicsRuntime } from "./t15/t15PhysicsRuntime";
import type { Particle } from "./physics/types/Particle";
import {
  calculateT15Diagnostics,
  DEFAULT_T15_RUN_CONFIG,
  T15_REFERENCE_SEEDS,
  normalizeT15RunConfig,
  type T15Diagnostics,
  type T15Mode,
  type T15RunConfig,
} from "./t15/t15RandomWalk";
import { T15DiagnosticsPanel } from "./t15/T15RandomWalkMode";
import { StrategyDiagnosticsPanel } from "./components/StrategyDiagnosticsPanel";
import {
  StrategyDiagnosticsRecorder,
  type DiagnosticsConfig,
  type StrategyDiagnosticsSnapshot,
} from "./physics/diagnostics/strategyDiagnostics";
import type { StrategyEvent } from "./physics/types/PhysicsContext";
// CSS imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

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
  const timeRef = useRef(0);
  const collisionsRef = useRef(0);
  const liveParticlesRef = useRef<Particle[]>([]);
  const [initializeVersion, setInitializeVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [simReady] = useState(true);
  const [processMode, setProcessMode] = useState<"standard" | T15Mode>("standard");
  const [t15Config, setT15Config] = useState<T15RunConfig>(DEFAULT_T15_RUN_CONFIG);
  const [t15Diagnostics, setT15Diagnostics] = useState<T15Diagnostics | null>(null);
  const diagnosticsRecorderRef = useRef<StrategyDiagnosticsRecorder | null>(null);
  const [strategyDiagnostics, setStrategyDiagnostics] = useState<StrategyDiagnosticsSnapshot | null>(null);
  const [diagnosticComparison, setDiagnosticComparison] = useState<StrategyDiagnosticsSnapshot | null>(null);
  const lastT15DiagnosticsTimeRef = useRef(0);
  const t15CompleteRef = useRef(false);

  // Convert gridLayoutParams to EngineParams
  const engineParams: EngineParams = useMemo(() => ({
    particleCount: gridLayoutParams.particles,
    dimension: gridLayoutParams.dimension,
    canvasWidth: 800,
    canvasHeight: 600,
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
  }), [gridLayoutParams]);

  const t15EngineParams = useMemo<EngineParams>(() => ({
    ...engineParams,
    particleCount: t15Config.walkers,
    dimension: processMode === "t15a" ? "1D" : "2D",
    velocity: processMode === "t15a" ? 1 : t15Config.speed,
    dt: 0.01,
    boundaryCondition: "unbounded",
    interparticleCollisions: false,
    collisionRate: processMode === "t15a"
      ? (t15Config.ordering === "derivative" ? 0.75 : 0)
      : t15Config.resetRate,
    initialDistType: "uniform",
    strategies: ["simple"],
  }), [engineParams, processMode, t15Config]);

  const t15Runtime = useMemo(() => processMode === "standard"
    ? undefined
    : createT15PhysicsRuntime(processMode, t15Config), [processMode, t15Config]);

  const diagnosticsConfig = useMemo<DiagnosticsConfig>(() => {
    if (processMode !== "standard") {
      return {
        strategy: processMode,
        dimension: processMode === "t15a" ? "1D" : "2D",
        boundary: "unbounded",
        seed: t15Config.seed,
        particleCount: t15Config.walkers,
        initialDistribution: processMode === "t15a" ? t15Config.profile : "origin",
        parameters: processMode === "t15a"
          ? { flipRate: t15Config.ordering === "derivative" ? 0.75 : 0, ordering: t15Config.ordering === "derivative" ? 1 : 0 }
          : { speed: t15Config.speed, resetRate: t15Config.resetRate },
      };
    }
    const strategy = engineParams.strategies?.find((value) => ["simple", "ctrw", "levy", "fractional"].includes(value))
      ?? engineParams.strategyType
      ?? (engineParams.collisionRate > 0 ? "ctrw" : "simple");
    return {
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
      },
    };
  }, [engineParams, processMode, t15Config]);

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

  const projectT15Position = useCallback((
    particle: Particle,
    _index: number,
    size: { width: number; height: number },
    time: number,
  ) => {
    if (processMode === "t15a") {
      return {
        x: ((particle.position.x + 6) / 12) * size.width,
        y: size.height / 2 + (particle.velocity.vx > 0 ? -7 : 7),
      };
    }
    const radius = Math.max(t15Config.speed * time, 0.5);
    const scale = Math.min(size.width, size.height) / (2 * radius * 1.08);
    return {
      x: size.width / 2 + particle.position.x * scale,
      y: size.height / 2 - particle.position.y * scale,
    };
  }, [processMode, t15Config.speed]);

  const t15Overlay = useMemo(() => processMode === "t15a" ? (
    <>
      <div className="absolute left-2 right-2 top-1/2 border-t border-slate-300" />
      <span className="absolute left-2 bottom-2 text-xs text-slate-700">β = −6</span>
      <span className="absolute right-2 bottom-2 text-xs text-slate-700">β = 6 · viewport only</span>
    </>
  ) : processMode === "t15b" ? (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full">
        <circle cx="50" cy="50" r="46.3" fill="none" stroke="#f97316" strokeDasharray="5 4" />
      </svg>
      <span className="absolute left-2 top-2 rounded bg-white/80 px-1 text-xs text-slate-700">Causal front r = vt = {(t15Diagnostics?.frontRadius ?? 0).toFixed(2)}</span>
    </>
  ) : null, [processMode, t15Diagnostics?.frontRadius]);

  const handleStart = () => {
    const horizon = processMode === "t15a" ? 1 : 4;
    if (processMode !== "standard" && (t15Diagnostics?.time ?? 0) >= horizon) {
      timeRef.current = 0;
      t15CompleteRef.current = false;
      setInitializeVersion((version) => version + 1);
    }
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: true, status: 'Running' });
  };

  const handlePause = () => {
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, status: 'Paused' });
  };

  const handleReset = () => {
    resetStrategyDiagnostics();
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, status: 'Stopped' });
    timeRef.current = 0;
    collisionsRef.current = 0;
    t15CompleteRef.current = false;
    lastT15DiagnosticsTimeRef.current = 0;
    if (processMode !== "standard") setT15Diagnostics(null);
    updateSimulationMetrics(0, 0, 'Stopped', 0);
    setResetVersion((version) => version + 1);
  };

  const handleInitialize = () => {
    resetStrategyDiagnostics();
    timeRef.current = 0;
    collisionsRef.current = 0;
    t15CompleteRef.current = false;
    lastT15DiagnosticsTimeRef.current = 0;
    if (processMode !== "standard") setT15Diagnostics(null);
    setRandomWalkSimulationState({
      ...randomWalkSimulationState,
      isRunning: false,
      time: 0,
      collisions: 0,
      status: 'Initialized',
    });
    updateSimulationMetrics(0, 0, 'Initialized', 0);
    setInitializeVersion((version) => version + 1);
  };

  const handleProcessModeChange = useCallback((mode: "standard" | T15Mode) => {
    resetStrategyDiagnostics();
    setProcessMode(mode);
    if (mode !== "standard") {
      setT15Config((current) => ({ ...current, seed: T15_REFERENCE_SEEDS[mode] }));
    }
    setT15Diagnostics(null);
    t15CompleteRef.current = false;
    lastT15DiagnosticsTimeRef.current = 0;
    timeRef.current = 0;
    collisionsRef.current = 0;
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, collisions: 0, interparticleCollisions: 0, status: "Initialized" });
    updateSimulationMetrics(0, 0, "Initialized", 0);
    setInitializeVersion((version) => version + 1);
  }, [randomWalkSimulationState, resetStrategyDiagnostics, setRandomWalkSimulationState, updateSimulationMetrics]);

  const handleT15ConfigChange = useCallback((config: T15RunConfig) => {
    resetStrategyDiagnostics();
    setT15Config(normalizeT15RunConfig(config));
    setT15Diagnostics(null);
    t15CompleteRef.current = false;
    lastT15DiagnosticsTimeRef.current = 0;
    timeRef.current = 0;
    setInitializeVersion((version) => version + 1);
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, collisions: 0, interparticleCollisions: 0, status: "Initialized" });
    updateSimulationMetrics(0, 0, "Initialized", 0);
  }, [randomWalkSimulationState, resetStrategyDiagnostics, setRandomWalkSimulationState, updateSimulationMetrics]);

  const handleT15Diagnostics = useCallback((diagnostics: T15Diagnostics) => {
    setT15Diagnostics(diagnostics);
  }, []);

  const handleT15Stats = useCallback((time: number, events: number) => {
    const horizon = processMode === "t15a" ? 1 : 4;
    const modelTime = Math.min(horizon, time);
    timeRef.current = modelTime;
    collisionsRef.current = events;
    const status = modelTime >= horizon ? "Paused" : isRunning ? "Running" : randomWalkSimulationState.status;
    updateSimulationMetrics(modelTime, events, status, 0);
  }, [isRunning, processMode, randomWalkSimulationState.status, updateSimulationMetrics]);

  const handleT15Complete = useCallback((time: number, events: number) => {
    const horizon = processMode === "t15a" ? 1 : 4;
    const currentState = useAppStore.getState().randomWalkSimulationState;
    setRandomWalkSimulationState({ ...currentState, isRunning: false, time: Math.min(horizon, time), collisions: events, status: "Paused" });
    updateSimulationMetrics(Math.min(horizon, time), events, "Paused", 0);
  }, [processMode, setRandomWalkSimulationState, updateSimulationMetrics]);

  const handleT15EngineFrame = useCallback((particles: Particle[], stats: {
    time: number;
    collisionCount: number;
    interparticleCollisionCount: number;
    particleCount: number;
  }) => {
    const recorder = diagnosticsRecorderRef.current;
    const horizon = processMode === "t15a" ? 1 : processMode === "t15b" ? 4 : Infinity;
    const terminalFrame = stats.time >= horizon - 1e-9;
    const forcePublish = !isRunning || terminalFrame;
    recorder?.recordFrame(particles, stats.time, forcePublish);
    if (recorder?.shouldPublish(performance.now(), forcePublish)) {
      setStrategyDiagnostics(recorder.snapshot());
    }
    if (processMode === "standard") return;
    const modelTime = stats.time >= horizon - 1e-9 ? horizon : stats.time;
    const now = performance.now();
    if (now - lastT15DiagnosticsTimeRef.current >= 200 || modelTime === 0 || modelTime === horizon) {
      setT15Diagnostics(calculateT15Diagnostics(processMode as T15Mode, t15Config, modelTime, particles));
      lastT15DiagnosticsTimeRef.current = now;
    }
    handleT15Stats(modelTime, stats.collisionCount);
    if (modelTime >= horizon && !t15CompleteRef.current) {
      t15CompleteRef.current = true;
      handleT15Complete(modelTime, stats.collisionCount);
    }
  }, [handleT15Complete, handleT15Stats, isRunning, processMode, t15Config]);

  // Observable manager and simulator shim for floating panels
  const observableManagerRef = useRef(
    new ObservableManager({ width: engineParams.canvasWidth, height: engineParams.canvasHeight })
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

  const handleStatsUpdate = useCallback((stats: { time: number; collisionCount: number; interparticleCollisionCount: number; particleCount: number }) => {
    timeRef.current = stats.time;
    collisionsRef.current = stats.collisionCount;
    updateSimulationMetrics(
      stats.time,
      stats.collisionCount,
      isRunning ? 'Running' : randomWalkSimulationState.status,
      stats.interparticleCollisionCount
    );
  }, [
    isRunning,
    randomWalkSimulationState.status,
    updateSimulationMetrics,
  ]);

  const onLayoutChange = (layout: any) => {
    if (processMode === "standard") setRandomWalkSimLayouts(layout);
  };

  const displayedLayout = processMode === "standard" ? randomWalkSimLayouts : [
    { i: "parameters", x: 0, y: 0, w: 3, h: 9, minW: 3, minH: 6 },
    { i: "canvas", x: 3, y: 0, w: 9, h: 9, minW: 6, minH: 6 },
    { i: "density", x: 0, y: 9, w: 12, h: 5, minW: 8, minH: 4 },
  ];

  return (
    <div className="min-h-full flex flex-col bg-gray-50">
      <RandomWalkHeader />

      <div className="flex-1 p-4 relative">
        <ReactGridLayout
          className="layout"
          layout={displayedLayout}
          onLayoutChange={onLayoutChange}
          cols={12}
          rowHeight={50}
          isDraggable={true}
          isResizable={true}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          draggableHandle=".drag-handle"
        >
          {/* Parameters Panel */}
          <div key="parameters">
            <RandomWalkParameterPanelV2
              gridLayoutParams={gridLayoutParams}
              setGridLayoutParams={setGridLayoutParams}
              simulationState={randomWalkSimulationState}
              setSimulationState={setRandomWalkSimulationState}
              handleStart={handleStart}
              handlePause={handlePause}
              handleReset={handleReset}
              handleInitialize={handleInitialize}
              processMode={processMode}
              onProcessModeChange={handleProcessModeChange}
              t15Config={t15Config}
              onT15ConfigChange={handleT15ConfigChange}
            />
          </div>

          {/* Canvas Panel */}
          <div key="canvas">
            {processMode === "standard" ? (
              <ParticleCanvasV2
                key={`v2-${gridLayoutParams.dimension}`}
                params={engineParams}
                isRunning={isRunning}
                initializeVersion={initializeVersion}
                resetVersion={resetVersion}
                liveParticlesRef={liveParticlesRef}
                onStatsUpdate={handleStatsUpdate}
                onEngineFrame={handleT15EngineFrame}
                onStrategyEvent={handleStrategyEvent}
              />
            ) : (
              <ParticleCanvasV2
                key={`t15-${processMode}`}
                params={t15EngineParams}
                runtime={t15Runtime}
                projectPosition={projectT15Position}
                overlay={t15Overlay}
                isRunning={isRunning}
                stopAtTime={processMode === "t15a" ? 1 : 4}
                initializeVersion={initializeVersion}
                resetVersion={resetVersion}
                liveParticlesRef={liveParticlesRef}
                onEngineFrame={handleT15EngineFrame}
                onStrategyEvent={handleStrategyEvent}
              />
            )}
          </div>

          {/* Density Panel */}
          <div key="density">
            {processMode === "standard" ? (
              <DensityComparison
                particles={liveParticlesRef.current}
                particleCount={liveParticlesRef.current.length}
                gridLayoutParams={gridLayoutParams}
                simulationState={randomWalkSimulationState}
              />
            ) : (
              <T15DiagnosticsPanel mode={processMode} config={t15Config} diagnostics={t15Diagnostics} />
            )}
          </div>

          {/* History Panel */}
          {processMode === "standard" && <div key="history">
            <HistoryPanel simulationState={randomWalkSimulationState} />
          </div>}

          {/* Export Panel */}
          {processMode === "standard" && <div key="export">
            <ExportPanel
              simulationState={randomWalkSimulationState}
              onExport={() => console.log('Export')}
              onCopy={() => console.log('Copy')}
              onShare={() => console.log('Share')}
            />
          </div>}
        </ReactGridLayout>

        <StrategyDiagnosticsPanel
          snapshot={strategyDiagnostics}
          comparison={diagnosticComparison}
          onCaptureComparison={handleCaptureDiagnosticComparison}
          onClearComparison={() => setDiagnosticComparison(null)}
        />

        {processMode === "standard" && <>
        {/* Floating Observables Panel */}
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

        {/* Floating Custom Observables Panel */}
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
        </>}
      </div>
    </div>
  );
}
