import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import { useAppStore } from "./stores/appStore";
import { RandomWalkParameterPanelV2 } from "./components/RandomWalkParameterPanelV2";
import { HistoryPanel } from "./components/HistoryPanel";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvasV2 } from "./components/ParticleCanvasV2";
import { RandomWalkHeader } from "./components/RandomWalkHeader";
import type { EngineParams } from "./hooks/useOriginalPhysicsEngine";
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
  } = useAppStore();

  const isRunning = randomWalkSimulationState.isRunning;
  const timeRef = useRef(0);
  const collisionsRef = useRef(0);

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
    // The ParticleCanvasV2 will handle reset internally via key change
  };

  const handleInitialize = () => {
    // Force remount of ParticleCanvasV2 to reinitialize particles
    setRandomWalkSimulationState({ ...randomWalkSimulationState, status: 'Initialized' });
  };

  const onLayoutChange = (layout: any) => {
    setRandomWalkSimLayouts(layout);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
              onStatsUpdate={(stats) => {
                timeRef.current = stats.time;
                collisionsRef.current = stats.collisionCount;
              }}
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
