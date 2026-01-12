import React, { useState, useEffect, useRef, useMemo } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import { useAppStore } from "./stores/appStore";
import { RandomWalkParameterPanel } from "./components/RandomWalkParameterPanel";
import { DensityComparison } from "./components/DensityComparison";
import { HistoryPanel } from "./components/HistoryPanel";
import { ReplayControls } from "./components/ReplayControls";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvas } from "./components/ParticleCanvas";
import { StreamObservablesPanel } from "./components/stream-ObservablesPanel";
import { ObservablesPanel } from "./components/ObservablesPanel";
import { CustomObservablesPanel } from "./components/CustomObservablesPanel";
import { FloatingPanel } from "./components/common/FloatingPanel";
import { RandomWalkHeader } from "./components/RandomWalkHeader";
import { updateParticlesFromStrategies, } from "./config/tsParticlesConfig";
import { useParticlesLoader } from './hooks/useParticlesLoader';
import { useTemperatureHandler } from './hooks/useTemperatureHandler';
import { useRandomWalkEngine } from './hooks/useRandomWalkEngine';
import { useRandomWalkControls } from './hooks/useRandomWalkControls';
import { useRandomWalkPanels } from './hooks/useRandomWalkPanels';
import { useRandomWalkStateSync } from './lib/useRandomWalkStateSync';
// CSS imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
const ReactGridLayout = WidthProvider(RGL);
export default function RandomWalkSim() {
    // Get parameters from Zustand store (persistent)
    const { gridLayoutParams, setGridLayoutParams, randomWalkSimLayouts, setRandomWalkSimLayouts, randomWalkSimulationState, setRandomWalkSimulationState, updateSimulationMetrics, saveSimulationSnapshot, useNewEngine, useStreamingObservables, useGPU, setSelectedHistoryIndex, setIsRunning } = useAppStore();
    const { selectedHistoryIndex } = randomWalkSimulationState;
    const selectedRun = randomWalkSimulationState.history?.[selectedHistoryIndex] || null;

    const handleSelectRun = (index: number) => {
        setSelectedHistoryIndex(index);
    };

    // State declarations
    const [boundaryRect, setBoundaryRect] = useState(null);
    const [tempNotice, setTempNotice] = useState(null);
    const [simReady, setSimReady] = useState(false);
    // Use isRunning from store instead of local state
    const isRunning = randomWalkSimulationState.isRunning;
    // Container ref
    const tsParticlesContainerRef = useRef(null);
    // Runtime state refs
    const timeRef = useRef(0);
    const collisionsRef = useRef(0);
    const renderEnabledRef = useRef(true);

    const setSimulationState = (state) => {
        if (typeof state === 'function') {
            const newState = state(randomWalkSimulationState);
            setIsRunning(newState.isRunning);
            setRandomWalkSimulationState({
                isRunning: newState.isRunning,
                time: newState.time,
                collisions: newState.collisions,
                interparticleCollisions: newState.interparticleCollisions ?? 0,
                status: newState.status,
                particleData: newState.particleData || [],
                densityHistory: newState.densityHistory || [],
                observableData: newState.observableData || {},
                selectedHistoryIndex: newState.selectedHistoryIndex ?? -1,
                history: newState.history || [],
            });
        }
        else {
            setIsRunning(state.isRunning);
            setRandomWalkSimulationState({
                isRunning: state.isRunning,
                time: state.time,
                collisions: state.collisions,
                interparticleCollisions: state.interparticleCollisions ?? 0,
                status: state.status,
                particleData: state.particleData || [],
                densityHistory: state.densityHistory || [],
                observableData: state.observableData || {},
                selectedHistoryIndex: state.selectedHistoryIndex ?? -1,
                history: state.history || [],
            });
        }
    };
    // Extract hooks
    const { simulatorRef, graphPhysicsRef } = useRandomWalkEngine({
        gridLayoutParams,
        useNewEngine,
        useStreamingObservables,
        tsParticlesContainerRef,
        setBoundaryRect,
        setSimReady,
        useGPU
    });
    const particlesLoaded = useParticlesLoader({
        simulatorRef,
        tsParticlesContainerRef,
        gridLayoutParamsRef: { current: { ...gridLayoutParams, useGPU } },
        gridLayoutParams,
        renderEnabledRef,
        timeRef,
        collisionsRef,
        useGPU
    });
    
    // Wire graph physics ref to particles loader after it's initialized
    useEffect(() => {
        if (particlesLoaded && (particlesLoaded as any).setGraphPhysicsRef) {
            (particlesLoaded as any).setGraphPhysicsRef(graphPhysicsRef);
        }
    }, [particlesLoaded, graphPhysicsRef]);
    const { handleStart, handlePause, handleReset, handleInitialize } = useRandomWalkControls({
        simulatorRef,
        tsParticlesContainerRef,
        gridLayoutParams,
        simulationState: randomWalkSimulationState,
        setSimulationState,
        updateSimulationMetrics,
        saveSimulationSnapshot,
        timeRef,
        collisionsRef,
        randomWalkSimulationState,
        useGPU,
        particlesLoaded
    });
    const { observablesWindow, observablesCollapsed, handleObservablesDragStop, handleObservablesResizeStop, handleObservablesMouseDown, handleObservablesToggleCollapse, customObservablesWindow, customObservablesCollapsed, handleCustomObservablesDragStop, handleCustomObservablesResizeStop, handleCustomObservablesMouseDown, handleCustomObservablesToggleCollapse } = useRandomWalkPanels();
    // State sync hook
    useRandomWalkStateSync({
        simulatorRef,
        isRunning,
        timeRef,
        collisionsRef,
        randomWalkSimulationState,
        updateSimulationMetrics,
        saveSimulationSnapshot
    });
    const lastTempRef = useTemperatureHandler({
        gridLayoutParams,
        simulatorRef,
        tsParticlesContainerRef,
        setTempNotice
    });
    // Layout change handler
    const onLayoutChange = (layout) => {
        setRandomWalkSimLayouts(layout);
    };
    // Manage rendering when tab/window visibility changes
    useEffect(() => {
        const onVisibility = () => {
            const container = tsParticlesContainerRef.current;
            if (!container)
                return;
            if (document.hidden) {
                renderEnabledRef.current = false;
                container.pause?.();
            }
            else {
                renderEnabledRef.current = true;
                try {
                    updateParticlesFromStrategies(container, true, false);
                }
                catch { }
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);
    // Pause/Play rendering when simulation pauses/resumes
    useEffect(() => {
        const container = tsParticlesContainerRef.current;
        if (!container)
            return;
        if (!isRunning) {
            try {
                container.draw?.(false);
            }
            catch { }
            container.pause?.();
        }
        else {
            try {
                updateParticlesFromStrategies(container, true, isRunning);
            }
            catch { }
        }
    }, [isRunning]);
    return (<div className="h-screen flex flex-col bg-gray-50">
      {/* Temperature change prompt */}
      {tempNotice && (<div className="fixed top-4 right-4 z-50 bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded shadow">
          {tempNotice}
        </div>)}
      
      <RandomWalkHeader />

      <div className="flex-1 p-4 relative">
        <ReactGridLayout className="layout" layout={randomWalkSimLayouts} onLayoutChange={onLayoutChange} cols={12} rowHeight={50} isDraggable={true} isResizable={true} margin={[10, 10]} containerPadding={[0, 0]} draggableHandle=".drag-handle">
          {/* Parameters Panel */}
          <div key="parameters">
            <RandomWalkParameterPanel simulatorRef={simulatorRef} gridLayoutParams={gridLayoutParams} setGridLayoutParams={setGridLayoutParams} simulationState={randomWalkSimulationState} setSimulationState={setSimulationState} handleStart={handleStart} handlePause={handlePause} handleReset={handleReset} handleInitialize={handleInitialize}/>
          </div>

          {/* Canvas Panel */}
          <div key="canvas">
            <ParticleCanvas key={`canvas-${gridLayoutParams.dimension}`} gridLayoutParams={gridLayoutParams} simulationStatus={randomWalkSimulationState.status} tsParticlesContainerRef={tsParticlesContainerRef} particlesLoaded={particlesLoaded} graphPhysicsRef={graphPhysicsRef} dimension={gridLayoutParams.dimension}/>
          </div>

          {/* Density Panel */}
          <div key="density">
            <DensityComparison 
              particles={[]} 
              particleCount={0} 
              simulatorRef={simulatorRef} 
              gridLayoutParams={gridLayoutParams} 
              simulationState={{
                status: randomWalkSimulationState.status
              }} 
              particlesLoaded={particlesLoaded}
            />
          </div>

          {/* History Panel */}
          <div key="history">
            <HistoryPanel simulationState={randomWalkSimulationState}/>
          </div>

          {/* Replay Panel */}
          <div key="replay">
            <ReplayControls 
              simulationState={randomWalkSimulationState} 
              selectedRun={selectedRun}
              onSelectRun={handleSelectRun}
            />
          </div>

          {/* Export Panel */}
          <div key="export">
            <ExportPanel simulationState={randomWalkSimulationState} onExport={(format) => console.log(`Exporting in ${format} format`)} onCopy={() => console.log("Copying data")} onShare={() => console.log("Sharing data")}/>
          </div>
        </ReactGridLayout>

        {/* Floating Observables Panel */}
        <FloatingPanel title="Observables" position={{ x: observablesWindow.left, y: observablesWindow.top }} size={{ width: observablesWindow.width, height: observablesWindow.height }} zIndex={observablesWindow.zIndex} isCollapsed={observablesCollapsed} onToggleCollapse={handleObservablesToggleCollapse} onDragStop={handleObservablesDragStop} onResizeStop={handleObservablesResizeStop} onMouseDown={handleObservablesMouseDown}>
          {useStreamingObservables ? (<StreamObservablesPanel simulatorRef={simulatorRef} simReady={simReady}/>) : (<ObservablesPanel simulatorRef={simulatorRef} isRunning={randomWalkSimulationState.isRunning} simulationStatus={randomWalkSimulationState.status} simReady={simReady}/>)}
        </FloatingPanel>

        {/* Floating Custom Observables Panel */}
        <FloatingPanel title="Custom Observables" position={{ x: customObservablesWindow.left, y: customObservablesWindow.top }} size={{ width: customObservablesWindow.width, height: customObservablesWindow.height }} zIndex={customObservablesWindow.zIndex} isCollapsed={customObservablesCollapsed} onToggleCollapse={handleCustomObservablesToggleCollapse} onDragStop={handleCustomObservablesDragStop} onResizeStop={handleCustomObservablesResizeStop} onMouseDown={handleCustomObservablesMouseDown}>
          <CustomObservablesPanel simulatorRef={simulatorRef} simReady={simReady}/>
        </FloatingPanel>
      </div>
    </div>);
}
