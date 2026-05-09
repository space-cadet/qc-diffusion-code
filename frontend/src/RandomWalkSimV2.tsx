import React, { useRef, useCallback, useMemo, useState } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import { useAppStore } from "./stores/appStore";
import { RandomWalkParameterPanelV2 } from "./components/RandomWalkParameterPanelV2";
import { HistoryPanel } from "./components/HistoryPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvasV2 } from "./components/ParticleCanvasV2";
import { DensityComparison } from "./components/DensityComparison";
import { RandomWalkHeader } from "./components/RandomWalkHeader";
import type { EngineParams } from "./hooks/useOriginalPhysicsEngine";
import type { Particle } from "./physics/types/Particle";
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

  const handleStatsUpdate = useCallback((stats: { time: number; collisionCount: number; particleCount: number }) => {
    timeRef.current = stats.time;
    collisionsRef.current = stats.collisionCount;
    updateSimulationMetrics(
      stats.time,
      stats.collisionCount,
      isRunning ? 'Running' : randomWalkSimulationState.status,
      randomWalkSimulationState.interparticleCollisions ?? 0
    );
  }, [
    isRunning,
    randomWalkSimulationState.status,
    randomWalkSimulationState.interparticleCollisions,
    updateSimulationMetrics,
  ]);

  const onLayoutChange = (layout: any) => {
    setRandomWalkSimLayouts(layout);
  };

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
            />
          </div>

          {/* Canvas Panel */}
          <div key="canvas">
            <ParticleCanvasV2
              key={`v2-${gridLayoutParams.dimension}`}
              params={engineParams}
              isRunning={isRunning}
              initializeVersion={initializeVersion}
              resetVersion={resetVersion}
              liveParticlesRef={liveParticlesRef}
              onStatsUpdate={handleStatsUpdate}
            />
          </div>

          {/* Density Panel */}
          <div key="density">
            <DensityComparison
              particles={liveParticlesRef.current}
              particleCount={liveParticlesRef.current.length}
              gridLayoutParams={gridLayoutParams}
              simulationState={randomWalkSimulationState}
            />
          </div>

          {/* History Panel */}
          <div key="history">
            <HistoryPanel simulationState={randomWalkSimulationState} />
          </div>

          {/* Export Panel */}
          <div key="export">
            <ExportPanel
              simulationState={randomWalkSimulationState}
              onExport={() => console.log('Export')}
              onCopy={() => console.log('Copy')}
              onShare={() => console.log('Share')}
            />
          </div>
        </ReactGridLayout>
      </div>
    </div>
  );
}
