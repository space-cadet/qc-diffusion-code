import React, { useRef, useCallback, useMemo, useState } from "react";
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
  DEFAULT_T15_RUN_CONFIG,
  T15_REFERENCE_SEEDS,
  normalizeT15RunConfig,
  type T15Diagnostics,
  type T15Mode,
  type T15RunConfig,
} from "./t15/t15RandomWalk";
import { T15DiagnosticsPanel, T15RandomWalkCanvas } from "./t15/T15RandomWalkMode";
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

  // Convert gridLayoutParams to EngineParams
  const engineParams: EngineParams = useMemo(() => ({
    particleCount: gridLayoutParams.particles,
    dimension: gridLayoutParams.dimension,
    canvasWidth: 800,
    canvasHeight: 600,
    velocity: gridLayoutParams.velocity,
    dt: gridLayoutParams.dt,
    temperature: gridLayoutParams.temperature,
    boundaryCondition: gridLayoutParams.boundaryCondition as "reflective" | "absorbing" | "periodic",
    interparticleCollisions: gridLayoutParams.interparticleCollisions,
    collisionRate: gridLayoutParams.collisionRate,
    collisionRadius: gridLayoutParams.collisionRate || 5,
    initialDistType: gridLayoutParams.initialDistType || "uniform",
    strategyType: (gridLayoutParams as any).strategyType,
    strategies: gridLayoutParams.strategies,
    distSigmaX: gridLayoutParams.distSigmaX,
    distSigmaY: gridLayoutParams.distSigmaY,
    distR0: gridLayoutParams.distR0,
    distDR: gridLayoutParams.distDR,
    distThickness: gridLayoutParams.distThickness,
    distNx: gridLayoutParams.distNx,
    distNy: gridLayoutParams.distNy,
    distJitter: gridLayoutParams.distJitter,
  }), [gridLayoutParams]);

  const handleStart = () => {
    const horizon = processMode === "t15a" ? 1 : 4;
    if (processMode !== "standard" && (t15Diagnostics?.time ?? 0) >= horizon) {
      timeRef.current = 0;
      setInitializeVersion((version) => version + 1);
    }
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: true, status: 'Running' });
  };

  const handlePause = () => {
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, status: 'Paused' });
  };

  const handleReset = () => {
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, status: 'Stopped' });
    timeRef.current = 0;
    collisionsRef.current = 0;
    updateSimulationMetrics(0, 0, 'Stopped', 0);
    setResetVersion((version) => version + 1);
  };

  const handleInitialize = () => {
    timeRef.current = 0;
    collisionsRef.current = 0;
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
    setProcessMode(mode);
    if (mode !== "standard") {
      setT15Config((current) => ({ ...current, seed: T15_REFERENCE_SEEDS[mode] }));
    }
    setT15Diagnostics(null);
    timeRef.current = 0;
    collisionsRef.current = 0;
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, collisions: 0, interparticleCollisions: 0, status: "Initialized" });
    updateSimulationMetrics(0, 0, "Initialized", 0);
    setInitializeVersion((version) => version + 1);
  }, [randomWalkSimulationState, setRandomWalkSimulationState, updateSimulationMetrics]);

  const handleT15ConfigChange = useCallback((config: T15RunConfig) => {
    setT15Config(normalizeT15RunConfig(config));
    setT15Diagnostics(null);
    timeRef.current = 0;
    setRandomWalkSimulationState({ ...randomWalkSimulationState, isRunning: false, time: 0, collisions: 0, interparticleCollisions: 0, status: "Initialized" });
    updateSimulationMetrics(0, 0, "Initialized", 0);
  }, [randomWalkSimulationState, setRandomWalkSimulationState, updateSimulationMetrics]);

  const handleT15Diagnostics = useCallback((diagnostics: T15Diagnostics) => {
    setT15Diagnostics(diagnostics);
  }, []);

  const handleT15Stats = useCallback((time: number, events: number) => {
    timeRef.current = time;
    collisionsRef.current = events;
    const horizon = processMode === "t15a" ? 1 : 4;
    const status = time >= horizon ? "Paused" : isRunning ? "Running" : randomWalkSimulationState.status;
    updateSimulationMetrics(time, events, status, 0);
  }, [isRunning, processMode, randomWalkSimulationState.status, updateSimulationMetrics]);

  const handleT15Complete = useCallback((time: number, events: number) => {
    const horizon = processMode === "t15a" ? 1 : 4;
    const currentState = useAppStore.getState().randomWalkSimulationState;
    setRandomWalkSimulationState({ ...currentState, isRunning: false, time: Math.min(horizon, time), collisions: events, status: "Paused" });
    updateSimulationMetrics(Math.min(horizon, time), events, "Paused", 0);
  }, [processMode, setRandomWalkSimulationState, updateSimulationMetrics]);

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
              />
            ) : (
              <T15RandomWalkCanvas
                key={`t15-${processMode}`}
                mode={processMode}
                config={t15Config}
                isRunning={isRunning}
                initializeVersion={initializeVersion}
                resetVersion={resetVersion}
                onDiagnostics={handleT15Diagnostics}
                onStats={handleT15Stats}
                onComplete={handleT15Complete}
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
