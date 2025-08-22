import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Container } from "@tsparticles/engine";
import { useAppStore } from "./stores/appStore";
import { ParameterPanel } from "./components/ParameterPanel";
import { DensityComparison } from "./components/DensityComparison";
import { HistoryPanel } from "./components/HistoryPanel";
import { ReplayControls } from "./components/ReplayControls";
import { ExportPanel } from "./components/ExportPanel";
import { ParticleCanvas } from "./components/ParticleCanvas";
import { PhysicsRandomWalk } from "./physics/PhysicsRandomWalk";
import { RandomWalkSimulator } from "./physics/RandomWalkSimulator";
import {
  getRandomWalkConfig,
  updateParticlesWithCTRW,
  setParticleManager,
} from "./config/tsParticlesConfig";
import type { SimulationState } from "./types/simulation";

// CSS imports
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

export default function RandomWalkSim() {
  // Get parameters from Zustand store (persistent)
  const { gridLayoutParams, setGridLayoutParams } = useAppStore();

  // Physics simulation ref
  const simulatorRef = useRef<RandomWalkSimulator | null>(null);
  const tsParticlesContainerRef = useRef<any>(null);

  // Keep layout and runtime state local (non-persistent)
  const [layouts, setLayouts] = useState<Layout[]>([
    { i: "parameters", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
    { i: "canvas", x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 },
    { i: "density", x: 0, y: 8, w: 12, h: 4, minW: 8, minH: 3 },
    { i: "history", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 2 },
    { i: "replay", x: 0, y: 16, w: 8, h: 3, minW: 6, minH: 2 },
    { i: "export", x: 8, y: 16, w: 4, h: 3, minW: 4, minH: 2 },
  ]);

  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    time: 0,
    collisions: 0,
    status: "Stopped",
  });

  // Graph physics reference
  const graphPhysicsRef = useRef<PhysicsRandomWalk | null>(null);

  // Refs to track current values for animation loop
  const simulationStateRef = useRef(simulationState);
  const gridLayoutParamsRef = useRef(gridLayoutParams);

  // Update refs when state changes
  useEffect(() => {
    simulationStateRef.current = simulationState;
  }, [simulationState]);

  useEffect(() => {
    gridLayoutParamsRef.current = gridLayoutParams;
  }, [gridLayoutParams]);

  // Initialize physics simulator
  useEffect(() => {
    simulatorRef.current = new RandomWalkSimulator({
      collisionRate: gridLayoutParams.collisionRate,
      jumpLength: gridLayoutParams.jumpLength,
      velocity: gridLayoutParams.velocity,
      particleCount: gridLayoutParams.particles,
    });

    // Connect particle manager to tsParticles
    if (simulatorRef.current) {
      setParticleManager(simulatorRef.current.getParticleManager());
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
        graphType: gridLayoutParams.graphType,
        graphSize: gridLayoutParams.graphSize,
        particleCount: gridLayoutParams.particles
      });
      
      // Re-connect particle manager after parameter updates
      setParticleManager(simulatorRef.current.getParticleManager());
    }
  }, [gridLayoutParams]);

  const onLayoutChange = (layout: Layout[]) => {
    setLayouts(layout);
  };

  const handleStart = () => {
    setSimulationState((prev) => ({
      ...prev,
      isRunning: true,
      status: "Running",
    }));
  };

  const handlePause = () => {
    setSimulationState((prev) => ({
      ...prev,
      isRunning: !prev.isRunning,
      status: prev.isRunning ? "Paused" : "Running",
    }));
  };

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
    }
    setSimulationState({
      isRunning: false,
      time: 0,
      collisions: 0,
      status: "Stopped",
    });
  };

  // tsParticles initialization and integration
  useEffect(() => {
    const initEngine = async () => {
      await initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      });
    };
    initEngine();
  }, []);

  const particlesLoaded = useCallback(
    async (container?: Container) => {
      if (container) {
        tsParticlesContainerRef.current = container;

        // Connect particle manager on container load
        if (simulatorRef.current) {
          setParticleManager(simulatorRef.current.getParticleManager());
        }

        // Start CTRW physics updates
        const updateLoop = () => {
          // Always update particle display positions when animation is enabled
          if (gridLayoutParamsRef.current.showAnimation) {
            updateParticlesWithCTRW(container, gridLayoutParamsRef.current.showAnimation);
            
            // Only advance physics simulation time when running
            if (simulationStateRef.current.isRunning && simulatorRef.current) {
              simulatorRef.current.step(0.016);
            }
          }
          requestAnimationFrame(updateLoop);
        };
        requestAnimationFrame(updateLoop);
      }
    },
    []
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">
          Random Walk → Telegraph Equation
        </h1>
        <p className="text-gray-600">
          Interactive simulation showing stochastic particle motion converging
          to telegraph equation
        </p>
      </div>

      <div className="flex-1 p-4">
        <ReactGridLayout
          className="layout"
          layout={layouts}
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
            <ParameterPanel
              simulatorRef={simulatorRef}
              gridLayoutParams={gridLayoutParams}
              setGridLayoutParams={setGridLayoutParams}
              simulationState={simulationState}
              setSimulationState={setSimulationState}
              handleStart={handleStart}
              handlePause={handlePause}
              handleReset={handleReset}
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
            />
          </div>

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
                  velocity: 1.2
                }
              }}
            />
          </div>

          {/* Export Panel */}
          <div key="export">
            <ExportPanel
              simulationState={simulationState}
              onExport={(format) => console.log(`Exporting in ${format} format`)}
              onCopy={() => console.log('Copying data')}
              onShare={() => console.log('Sharing data')}
            />
          </div>
        </ReactGridLayout>
      </div>
    </div>
  );
}