import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import type { Container } from "@tsparticles/engine";
import type { Particle } from "./physics/types/Particle";
import { Rnd } from "react-rnd";
import { useAppStore } from "./stores/appStore";
import { RandomWalkParameterPanel } from "./components/RandomWalkParameterPanel";
import { DensityComparison } from "./components/DensityComparison";
import { HistoryPanel } from "./components/HistoryPanel";
import { ReplayControls } from "./components/ReplayControls";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvas } from "./components/ParticleCanvas";
import { ObservablesPanel } from "./components/ObservablesPanel";
import { PhysicsRandomWalk } from "./physics/PhysicsRandomWalk";
import { RandomWalkSimulator } from "./physics/RandomWalkSimulator";
import { ParticleCountObservable } from "./physics/observables/ParticleCountObservable";
import {
  updateParticlesFromStrategies,
  setParticleManager,
} from "./config/tsParticlesConfig";
import type { SimulationState } from "./types/simulation";
import { PhysicsEngine } from "./physics/core/PhysicsEngine";
import { useParticlesLoader } from './hooks/useParticlesLoader';
import { ParticleInitializer } from './physics/utils/ParticleInitializer';
import { useTemperatureHandler } from './hooks/useTemperatureHandler';

// CSS imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

export default function RandomWalkSim() {
  // Get parameters from Zustand store (persistent)
  const { 
    gridLayoutParams, 
    setGridLayoutParams, 
    randomWalkSimLayouts, 
    setRandomWalkSimLayouts,
    randomWalkSimulationState,
    setRandomWalkSimulationState,
    updateSimulationMetrics,
    saveSimulationSnapshot,
    observablesWindow,
    setObservablesWindow,
    zCounter,
    setZCounter,
    observablesCollapsed,
    setObservablesCollapsed
  } = useAppStore();

  // State declarations should come before refs
  const [boundaryRect, setBoundaryRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [tempNotice, setTempNotice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [simReady, setSimReady] = useState(false);
  
  // Create combined simulation state
  const simulationState: SimulationState = useMemo(() => ({
    isRunning,
    ...randomWalkSimulationState,
  }), [isRunning, randomWalkSimulationState]);
  
  // Then declare refs
  const simulatorRef = useRef<RandomWalkSimulator | null>(null);
  const tsParticlesContainerRef = useRef<any>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const graphPhysicsRef = useRef<PhysicsRandomWalk | null>(null);
  
  // Runtime state refs
  const timeRef = useRef(0);
  const collisionsRef = useRef(0);
  const simulationStateRef = useRef(simulationState);
  const gridLayoutParamsRef = useRef(gridLayoutParams);
  const renderEnabledRef = useRef(true);

  // Move this function before its usage
  const onLayoutChange = (layout: Layout[]) => {
    setRandomWalkSimLayouts(layout);
  };

  // Fix ReactGridLayout props - remove enableResizing as it's already covered by isResizable
  const gridLayoutProps = {
    className: "layout",
    layout: randomWalkSimLayouts,
    onLayoutChange,
    cols: 12,
    rowHeight: 50,
    isDraggable: true,
    isResizable: true,
    margin: [10, 10] as [number, number],
    containerPadding: [0, 0] as [number, number],
    draggableHandle: ".drag-handle"
  };

  const setSimulationState = (state: SimulationState | ((prev: SimulationState) => SimulationState)) => {
    if (typeof state === 'function') {
      const newState = state(simulationState);
      setIsRunning(newState.isRunning);
      setRandomWalkSimulationState({
        time: newState.time,
        collisions: newState.collisions,
        status: newState.status,
        particleData: newState.particleData || [],
        densityHistory: newState.densityHistory || [],
        observableData: newState.observableData || {}
      });
    } else {
      setIsRunning(state.isRunning);
      setRandomWalkSimulationState({
        time: state.time,
        collisions: state.collisions,
        status: state.status,
        particleData: state.particleData || [],
        densityHistory: state.densityHistory || [],
        observableData: state.observableData || {}
      });
    }
  };

  // Update refs when state changes
  useEffect(() => {
    simulationStateRef.current = simulationState;
  }, [simulationState, isRunning, randomWalkSimulationState]);

  useEffect(() => {
    gridLayoutParamsRef.current = gridLayoutParams;
  }, [gridLayoutParams]);

  // Manage rendering when tab/window visibility changes
  useEffect(() => {
    const onVisibility = () => {
      const container = tsParticlesContainerRef.current;
      if (!container) return;

      if (document.hidden) {
        renderEnabledRef.current = false;
        // Stop tsParticles' internal RAF (rendering only)
        container.pause?.();
      } else {
        renderEnabledRef.current = true;
        // Sync one frame and resume rendering
        try {
          // Internal RAF stays disabled; draw a single frame to sync
          updateParticlesFromStrategies(container, true, false);
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Pause/Play rendering when simulation pauses/resumes (physics handled separately)
  useEffect(() => {
    const container = tsParticlesContainerRef.current;
    if (!container) return;

    if (isRunning) {
      // Keep tsParticles internal RAF disabled; our own loop drives rendering
    } else if (!isRunning) {
      // Draw one last frame then pause internal RAF
      try { (container as any).draw?.(false); } catch {}
      container.pause?.();
    } else {
      // Keep tsParticles internal RAF disabled; our own loop drives rendering
      // Draw a frame to sync particle positions
      try {
        updateParticlesFromStrategies(container, true, isRunning);
      } catch {}
    }
  }, [isRunning]);

  // Periodically save simulation state and sync metrics when running
  useEffect(() => {
    if (!isRunning) return;
    
    const saveInterval = setInterval(() => {
      if (simulatorRef.current) {
        const particles = simulatorRef.current.getParticleManager().getAllParticles();
        const particleData = particles.map((p: Particle) => ({
          id: p.id,
          position: p.position,
          velocity: { vx: p.velocity.vx, vy: p.velocity.vy },
          collisionCount: p.collisionCount || 0,
          lastCollisionTime: p.lastCollisionTime || 0,
          waitingTime: p.waitingTime || 0
        }));
        
        const densityHistory = simulatorRef.current.getDensityHistory();
        saveSimulationSnapshot(particleData, densityHistory, {});
      }
    }, 2000); // Save every 2 seconds
    
    const metricsInterval = setInterval(() => {
      // Sync refs to state every 1 second
      updateSimulationMetrics(timeRef.current, collisionsRef.current, 'Running');
    }, 1000);
    
    return () => {
      clearInterval(saveInterval);
      clearInterval(metricsInterval);
    };
  }, [isRunning, saveSimulationSnapshot, updateSimulationMetrics]);

  // Initialize physics simulator
  useEffect(() => {
    const canvasWidth = tsParticlesContainerRef.current?.canvas?.size?.width || 800;
    const canvasHeight = tsParticlesContainerRef.current?.canvas?.size?.height || 600;
    // simulator is being (re)created
    setSimReady(false);
    
    simulatorRef.current = new RandomWalkSimulator({
      collisionRate: gridLayoutParams.collisionRate,
      jumpLength: gridLayoutParams.jumpLength,
      velocity: gridLayoutParams.velocity,
      particleCount: gridLayoutParams.particles,
      dimension: gridLayoutParams.dimension,
      interparticleCollisions: gridLayoutParams.interparticleCollisions,
      strategies: gridLayoutParams.strategies,
      boundaryCondition: gridLayoutParams.boundaryCondition,
      canvasWidth,
      canvasHeight,
      temperature: gridLayoutParams.temperature,
      // initial distribution wiring
      initialDistType: gridLayoutParams.initialDistType,
      distSigmaX: gridLayoutParams.distSigmaX,
      distSigmaY: gridLayoutParams.distSigmaY,
      distR0: gridLayoutParams.distR0,
      distDR: gridLayoutParams.distDR,
      distThickness: gridLayoutParams.distThickness,
      distNx: gridLayoutParams.distNx,
      distNy: gridLayoutParams.distNy,
      distJitter: gridLayoutParams.distJitter,
    });

    // mark simulator as ready for dependent components
    setSimReady(true);

    // Connect particle manager to tsParticles
    if (simulatorRef.current) {
      setParticleManager(simulatorRef.current.getParticleManager());
      
      // If a container already exists, propagate canvas size and update overlay rect
      if (tsParticlesContainerRef.current) {
        const container = tsParticlesContainerRef.current;
        const pm = simulatorRef.current.getParticleManager();
        const w = container.canvas.size.width;
        const h = container.canvas.size.height;
        (pm as any).setCanvasSize?.(w, h);
        const bounds = (pm as any).getBoundaries?.();
        if (bounds) {
          const widthPhysics = Math.max(bounds.xMax - bounds.xMin, 1);
          const heightPhysics = Math.max(bounds.yMax - bounds.yMin, 1);
          const x = ((bounds.xMin - bounds.xMin) / widthPhysics) * w;
          const y = ((bounds.yMin - bounds.yMin) / heightPhysics) * h;
          const rectW = (widthPhysics / widthPhysics) * w;
          const rectH = (heightPhysics / heightPhysics) * h;
          setBoundaryRect({ x, y, w: rectW, h: rectH });
          console.log("[RWS] simulator init", {
            canvas: { w, h },
            params: {
              particles: gridLayoutParams.particles,
              strategies: gridLayoutParams.strategies,
              boundaryCondition: gridLayoutParams.boundaryCondition,
            },
            bounds,
            overlay: { x, y, w: rectW, h: rectH },
            restoredState: !!randomWalkSimulationState.particleData
          });
        }
      }
    }

    // Initialize graph physics when in graph mode
    if (gridLayoutParams.simulationType === "graph") {
      graphPhysicsRef.current = new PhysicsRandomWalk({
        collisionRate: gridLayoutParams.collisionRate,
        jumpLength: gridLayoutParams.jumpLength,
        velocity: gridLayoutParams.velocity,
        simulationType: "graph",
        graphType: gridLayoutParams.graphType,
        graphSize: gridLayoutParams.graphSize,
      });
    }
  }, [
    gridLayoutParams.simulationType,
    gridLayoutParams.strategies,
    gridLayoutParams.boundaryCondition,
    gridLayoutParams.graphType,
    gridLayoutParams.graphSize,
  ]);

  // Update physics parameters when store changes
  useEffect(() => {
    if (simulatorRef.current) {
      simulatorRef.current.updateParameters({
        collisionRate: gridLayoutParams.collisionRate,
        jumpLength: gridLayoutParams.jumpLength,
        velocity: gridLayoutParams.velocity,
        simulationType: gridLayoutParams.simulationType,
        dimension: gridLayoutParams.dimension,
        interparticleCollisions: gridLayoutParams.interparticleCollisions,
        strategies: gridLayoutParams.strategies,
        graphType: gridLayoutParams.graphType,
        graphSize: gridLayoutParams.graphSize,
        particleCount: gridLayoutParams.particles,
        temperature: gridLayoutParams.temperature,
        // pass through distribution params as they change
        initialDistType: gridLayoutParams.initialDistType,
        distSigmaX: gridLayoutParams.distSigmaX,
        distSigmaY: gridLayoutParams.distSigmaY,
        distR0: gridLayoutParams.distR0,
        distDR: gridLayoutParams.distDR,
        distThickness: gridLayoutParams.distThickness,
        distNx: gridLayoutParams.distNx,
        distNy: gridLayoutParams.distNy,
        distJitter: gridLayoutParams.distJitter,
      });

      // Re-connect particle manager after parameter updates
      setParticleManager(simulatorRef.current.getParticleManager());
    }
  }, [gridLayoutParams]);

  const handleStart = () => {
    setSimulationState((prev) => ({
      ...prev,
      isRunning: true,
      status: "Running",
    }));
    
    // Update state when starting
    updateSimulationMetrics(timeRef.current, collisionsRef.current, 'Running');
  };

  const handlePause = () => {
    // Save state when pausing
    if (simulationState.isRunning && simulatorRef.current) {
      const particles = simulatorRef.current.getParticleManager().getAllParticles();
      const particleData = particles.map((p: Particle) => ({
        id: p.id,
        position: p.position,
        velocity: { vx: p.velocity.vx, vy: p.velocity.vy },
        collisionCount: p.collisionCount || 0,
        lastCollisionTime: p.lastCollisionTime || 0,
        waitingTime: p.waitingTime || 0
      }));
      
      const densityHistory = simulatorRef.current.getDensityHistory();
      saveSimulationSnapshot(particleData, densityHistory, {});
    }
    
    const newStatus = simulationState.isRunning ? "Paused" : "Running";
    setSimulationState((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
      status: newStatus,
    }));
    
    // Update metrics when pausing/resuming
    updateSimulationMetrics(timeRef.current, collisionsRef.current, newStatus);
  };

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
      // Reset all registered observables
      const observableManager = (simulatorRef.current as any).observableManager;
      if (observableManager) {
        observableManager.reset();
      }
    }
    
    // Reset refs
    timeRef.current = 0;
    collisionsRef.current = 0;
    
    setSimulationState({
      isRunning: false,
      time: 0,
      collisions: 0,
      status: "Stopped",
      particleData: [],
      densityHistory: [],
      observableData: {}
    });
    
    // Update metrics when resetting
    updateSimulationMetrics(0, 0, 'Stopped');
  };

  const handleInitialize = () => {
    console.log("handleInitialize: START");

    // Stop any running simulation
    setSimulationState((prev) => ({
      ...prev,
      isRunning: false,
      status: "Initialized",
    }));

    console.log("handleInitialize: checking refs", {
      hasSimulator: !!simulatorRef.current,
      hasContainer: !!tsParticlesContainerRef.current,
    });

    // Reinitialize the physics simulator with current parameters
    if (simulatorRef.current && tsParticlesContainerRef.current) {
      const container = tsParticlesContainerRef.current;
      const canvasWidth = container.canvas.size.width;
      const canvasHeight = container.canvas.size.height;

      console.log("handleInitialize: container info", {
        canvasWidth,
        canvasHeight,
        containerType: typeof container,
        particlesAPI: !!container.particles,
      });

      // Update physics parameters
      simulatorRef.current.updateParameters({
        collisionRate: gridLayoutParams.collisionRate,
        jumpLength: gridLayoutParams.jumpLength,
        velocity: gridLayoutParams.velocity,
        particleCount: gridLayoutParams.particles,
        simulationType: gridLayoutParams.simulationType,
        dimension: gridLayoutParams.dimension,
        interparticleCollisions: gridLayoutParams.interparticleCollisions,
        strategies: gridLayoutParams.strategies,
        boundaryCondition: gridLayoutParams.boundaryCondition,
        graphType: gridLayoutParams.graphType,
        graphSize: gridLayoutParams.graphSize,
        canvasWidth: container.canvas.size.width,
        canvasHeight: container.canvas.size.height,
        temperature: gridLayoutParams.temperature,
        // ensure distribution used for reseeding
        initialDistType: gridLayoutParams.initialDistType,
        distSigmaX: gridLayoutParams.distSigmaX,
        distSigmaY: gridLayoutParams.distSigmaY,
        distR0: gridLayoutParams.distR0,
        distDR: gridLayoutParams.distDR,
        distThickness: gridLayoutParams.distThickness,
        distNx: gridLayoutParams.distNx,
        distNy: gridLayoutParams.distNy,
        distJitter: gridLayoutParams.distJitter,
      });

      // Clear existing particles
      container.particles.clear();
      
      // Reset physics state and get fresh distribution
      simulatorRef.current.reset();
      
      // Re-connect particle manager and ensure canvas size
      const pm = simulatorRef.current.getParticleManager();
      setParticleManager(pm);
      pm.setCanvasSize(canvasWidth, canvasHeight);
      
      // Get particles from simulator's distribution
      const particles = pm.getAllParticles();
      
      // Add to tsParticles in canvas coordinates
      for (const p of particles) {
        const canvasPos = pm.mapToCanvas(p.position);
        container.particles.addParticle({ x: canvasPos.x, y: canvasPos.y }, { color: { value: "#3b82f6" } });
      }

      // Save the initialized particle state
      const particleData = particles.map((p: Particle) => ({
        id: p.id,
        position: p.position,
        velocity: { vx: p.velocity.vx, vy: p.velocity.vy },
        collisionCount: p.collisionCount || 0,
        lastCollisionTime: p.lastCollisionTime || 0,
        waitingTime: p.waitingTime || 0
      }));
      
      saveSimulationSnapshot(particleData, [], {});
      
    } else {
      console.log("handleInitialize: FAILED - missing refs", {
        hasSimulator: !!simulatorRef.current,
        hasContainer: !!tsParticlesContainerRef.current,
      });
    }

    // Reset simulation state
    setSimulationState({
      isRunning: false,
      time: 0,
      collisions: 0,
      status: "Initialized",
      particleData: [],
      densityHistory: [],
      observableData: {}
    });

    console.log("Physics engine initialized with parameters:", {
      particles: gridLayoutParams.particles,
      collisionRate: gridLayoutParams.collisionRate,
      jumpLength: gridLayoutParams.jumpLength,
      velocity: gridLayoutParams.velocity,
      simulationType: gridLayoutParams.simulationType,
    });
  };

  // Replace particlesLoaded with hook
  const particlesLoaded = useParticlesLoader({
    simulatorRef,
    tsParticlesContainerRef,
    gridLayoutParamsRef,
    simulationStateRef,
    renderEnabledRef,
    timeRef,
    collisionsRef
  });

  const lastTempRef = useTemperatureHandler({
    gridLayoutParams,
    simulatorRef,
    tsParticlesContainerRef,
    setTempNotice
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Temperature change prompt */}
      {tempNotice && (
        <div className="fixed top-4 right-4 z-50 bg-amber-100 border border-amber-300 text-amber-900 px-3 py-2 rounded shadow">
          {tempNotice}
        </div>
      )}
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">
          Random Walk → Telegraph Equation
        </h1>
        <p className="text-gray-600">
          Interactive simulation showing stochastic particle motion converging
          to telegraph equation
        </p>
      </div>

      <div className="flex-1 p-4 relative">
        <ReactGridLayout
          className="layout"
          layout={randomWalkSimLayouts}
          onLayoutChange={onLayoutChange}
          cols={12}
          rowHeight={50}
          isDraggable={true}
          isResizable={true}
          margin={[10, 10] as [number, number]}
          containerPadding={[0, 0] as [number, number]}
          draggableHandle=".drag-handle"
        >
          {/* Parameters Panel */}
          <div key="parameters">
            <RandomWalkParameterPanel
              simulatorRef={simulatorRef}
              gridLayoutParams={gridLayoutParams}
              setGridLayoutParams={setGridLayoutParams}
              simulationState={simulationState}
              setSimulationState={setSimulationState}
              handleStart={handleStart}
              handlePause={handlePause}
              handleReset={handleReset}
              handleInitialize={handleInitialize}
            />
          </div>

          {/* Canvas Panel */}
          <div key="canvas">
            <ParticleCanvas
              gridLayoutParams={gridLayoutParams}
              simulationStatus={simulationState.status}
              tsParticlesContainerRef={tsParticlesContainerRef}
              particlesLoaded={particlesLoaded}
              graphPhysicsRef={graphPhysicsRef}
              
              dimension={gridLayoutParams.dimension}
            />
          </div>

          {/* Observables Panel placeholder kept to preserve RGL layout key.
              Original block retained for future reference:
              <div key="observables">
                <ObservablesPanel ... />
              </div>
          */}
          <div key="observables" />

          {/* Density Panel */}
          <div key="density">
            <DensityComparison
              simulatorRef={simulatorRef}
              gridLayoutParams={gridLayoutParams}
            />
          </div>

          {/* History Panel */}
          <div key="history">
            <HistoryPanel simulationState={simulationState} />
          </div>

          {/* Replay Panel */}
          <div key="replay">
            <ReplayControls
              simulationState={simulationState}
              selectedRun={{
                startTime: 5.2,
                endTime: 12.8,
                parameters: {
                  collisionRate: 3.0,
                  jumpLength: 0.1,
                  velocity: 1.2,
                },
              }}
            />
          </div>

          {/* Export Panel */}
          <div key="export">
            <ExportPanel
              simulationState={simulationState}
              onExport={(format) =>
                console.log(`Exporting in ${format} format`)
              }
              onCopy={() => console.log("Copying data")}
              onShare={() => console.log("Sharing data")}
            />
          </div>
        </ReactGridLayout>

        {/* Floating Observables Window via react-rnd */}
        <Rnd
          bounds="parent"
          size={{ width: observablesWindow.width, height: observablesCollapsed ? 40 : observablesWindow.height }}
          position={{ x: observablesWindow.left, y: observablesWindow.top }}
          onDragStop={(e: any, d: any) => {
            setObservablesWindow({
              ...observablesWindow,
              left: d.x,
              top: d.y,
            });
          }}
          onResizeStop={(e: any, dir: any, ref: any, delta: any, position: any) => {
            setObservablesWindow({
              ...observablesWindow,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              left: position.x,
              top: position.y,
            });
          }}
          onMouseDown={() => {
            const nextZ = zCounter + 1;
            setZCounter(nextZ);
            setObservablesWindow({ ...observablesWindow, zIndex: nextZ });
          }}
          dragHandleClassName="drag-handle"
          enableResizing={observablesCollapsed ? { top: false, right: false, bottom: false, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false } : { top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
          style={{ zIndex: observablesWindow.zIndex }}
          className="shadow-lg rounded-md bg-white border border-gray-200 overflow-hidden"
        >
          <div className="drag-handle flex items-center justify-between cursor-move select-none px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium">
            <span>Observables</span>
            <button
              type="button"
              className="ml-2 cursor-pointer rounded px-2 py-0.5 text-xs border border-gray-300 bg-white hover:bg-gray-50"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setObservablesCollapsed(!observablesCollapsed);
              }}
            >
              {observablesCollapsed ? 'Expand' : 'Collapse'}
            </button>
          </div>
          {!observablesCollapsed && (
            <div className="p-3 overflow-y-auto" style={{ maxHeight: observablesWindow.height ? observablesWindow.height - 40 : undefined }}>
              <ObservablesPanel
                simulatorRef={simulatorRef}
                isRunning={simulationState.isRunning}
                simulationStatus={simulationState.status}
                simReady={simReady}
              />
            </div>
          )}
        </Rnd>
      </div>
    </div>
  );
}
