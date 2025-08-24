import React, { useState, useEffect, useCallback, useRef } from "react";
import PdeParameterPanel from "./PdeParameterPanel";
import PlotComponent from "./PlotComponent";
import RandomWalkSim from "./RandomWalkSim";
import { useWebGLSolver } from "./hooks/useWebGLSolver";
import { generateInitialConditions } from "./utils/initialConditions";
import { useAppStore } from "./stores/appStore";
import type {
  AnimationFrame,
  WebSocketMessage,
  SimulationResult,
} from "./types";

export default function App() {
  const { activeTab, simulationParams, setActiveTab, setSimulationParams, pdeState, setPdeState } = useAppStore();

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null); // kept for compatibility; will mirror pdeState.lastFrame
  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initSolver, runAnimation, stop } = useWebGLSolver();

  const isWebGL = simulationParams.solver_type === 'webgl';

  const initializeConditions = useCallback((params: typeof simulationParams) => {
    console.log("Generating initial conditions with params:", params);
    const initialFrame = generateInitialConditions(params);
    console.log("Generated initial conditions:", initialFrame);
    setCurrentFrame(initialFrame);
    setPdeState({ lastFrame: initialFrame, time: 0, isRunning: false });
  }, []);

  useEffect(() => {
    // Regenerate initial conditions on any distribution-affecting change before Start
    initializeConditions(simulationParams);
  }, [
    simulationParams.distribution,
    simulationParams.x_min,
    simulationParams.x_max,
    simulationParams.mesh_size,
    simulationParams.selectedEquations,
    // per-distribution params
    simulationParams.dist_center,
    simulationParams.dist_sigma,
    simulationParams.step_left,
    simulationParams.step_right,
    simulationParams.step_height,
    simulationParams.sine_freq,
    simulationParams.sine_amp,
    simulationParams.cos_freq,
    simulationParams.cos_amp,
    simulationParams.dg_center1,
    simulationParams.dg_sigma1,
    simulationParams.dg_center2,
    simulationParams.dg_sigma2,
    simulationParams.dg_weight,
    initializeConditions
  ]);

  const connectWebSocket = useCallback(() => {
    if (!isWebGL) {
      const websocket = new WebSocket("ws://localhost:8000/ws/simulate");

      websocket.onopen = () => {
        console.log("WebSocket connected");
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);

        if (
          message.type === "animation_frame" &&
          message.data &&
          "time" in message.data
        ) {
          const frame = message.data as AnimationFrame;
          setCurrentFrame(frame);
          setPdeState({ lastFrame: frame, time: frame.time as number });
        } else if (message.type === "pause_state" && message.data && typeof message.data === 'object' && 'isRunning' in message.data && typeof message.data.isRunning === 'boolean') {
          setPdeState({ isRunning: message.data.isRunning });
        } else if (message.type === "error") {
          console.error("Simulation error:", message.message);
          setPdeState({ isRunning: false });
        }
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
        setWs(null);
        setPdeState({ isRunning: false });
      };

      return websocket;
    }
    return null;
  }, [isWebGL]);

  useEffect(() => {
    if (!isWebGL) {
      const websocket = connectWebSocket();
      return () => websocket?.close();
    }
  }, [connectWebSocket, isWebGL]);

  const handleStart = () => {
    console.log("Starting simulation with params:", simulationParams);
    setPdeState({ isRunning: true });
    
    if (isWebGL && canvasRef.current) {
      initSolver(canvasRef.current, simulationParams);
      runAnimation(
        simulationParams,
        (data: SimulationResult & { time: number }) => {
          const frame = data as unknown as AnimationFrame;
          setCurrentFrame(frame);
          setPdeState({ lastFrame: frame, time: data.time });
        },
        pdeState.time || 0
      );
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "start", params: simulationParams }));
    }
  };

  const handleStop = () => {
    console.log("Stopping simulation");
    setPdeState({ isRunning: false, time: 0 });
    
    if (isWebGL) {
      stop();
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
    setCurrentFrame(null);
    setPdeState({ lastFrame: null });
  };

  const handlePause = () => {
    const newRunningState = !pdeState.isRunning;
    console.log(pdeState.isRunning ? "Pausing simulation" : "Resuming simulation");
    setPdeState({ isRunning: newRunningState });
    
    if (isWebGL) {
      if (newRunningState) {
        // Resume WebGL animation
        runAnimation(
          simulationParams,
          (data: SimulationResult & { time: number }) => {
            const frame = data as unknown as AnimationFrame;
            setCurrentFrame(frame);
            setPdeState({ lastFrame: frame, time: data.time });
          },
          pdeState.time || 0
        );
      } else {
        // Pause WebGL animation
        stop();
      }
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "pause" }));
    }
  };

  const handleReset = () => {
    console.log("Resetting simulation");
    setPdeState({ isRunning: false, time: 0 });
    
    if (isWebGL) {
      stop();
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
    
    initializeConditions(simulationParams);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('simulation')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'simulation'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            PDE Simulation
          </button>
          <button
            onClick={() => setActiveTab('randomwalksim')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'randomwalksim'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Random Walk Sim
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeTab === 'simulation' ? (
          <div className="h-full flex">
            <div className="w-80">
              <PdeParameterPanel
                params={simulationParams}
                onChange={setSimulationParams}
              />
            </div>
            <div className="flex-1 relative">
              <PlotComponent
                frame={pdeState.lastFrame ?? currentFrame}
                isRunning={pdeState.isRunning}
                params={simulationParams}
                onChange={setSimulationParams}
                onStart={handleStart}
                onStop={handleStop}
                onPause={handlePause}
                onReset={handleReset}
              />
              {isWebGL && (
                <canvas
                  ref={canvasRef}
                  width={simulationParams.mesh_size}
                  height={1}
                  style={{ display: 'none' }}
                />
              )}
            </div>
          </div>
        ) : (
          <RandomWalkSim />
        )}
      </div>
    </div>
  );
}
