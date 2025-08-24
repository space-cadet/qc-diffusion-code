import React, { useState, useEffect, useCallback, useRef } from "react";
import Controls from "./Controls";
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
  const { activeTab, simulationParams, setActiveTab, setSimulationParams } = useAppStore();

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initSolver, runAnimation, stop } = useWebGLSolver();

  const isWebGL = simulationParams.solver_type === 'webgl';

  const initializeConditions = useCallback((params: typeof simulationParams) => {
    console.log("Generating initial conditions with params:", params);
    const initialFrame = generateInitialConditions(params);
    console.log("Generated initial conditions:", initialFrame);
    setCurrentFrame(initialFrame);
  }, []);

  useEffect(() => {
    initializeConditions(simulationParams);
  }, [simulationParams.distribution, simulationParams.x_min, simulationParams.x_max, simulationParams.mesh_size, simulationParams.selectedEquations, initializeConditions]);

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
          setCurrentFrame(message.data as AnimationFrame);
        } else if (message.type === "pause_state" && message.data && typeof message.data === 'object' && 'isRunning' in message.data && typeof message.data.isRunning === 'boolean') {
          setIsRunning(message.data.isRunning);
        } else if (message.type === "error") {
          console.error("Simulation error:", message.message);
          setIsRunning(false);
        }
      };

      websocket.onclose = () => {
        console.log("WebSocket disconnected");
        setWs(null);
        setIsRunning(false);
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
    setIsRunning(true);
    
    if (isWebGL && canvasRef.current) {
      initSolver(canvasRef.current, simulationParams);
      runAnimation(simulationParams, (data: SimulationResult & { time: number }) => {
        setCurrentFrame(data);
      });
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "start", params: simulationParams }));
    }
  };

  const handleStop = () => {
    console.log("Stopping simulation");
    setIsRunning(false);
    
    if (isWebGL) {
      stop();
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "stop" }));
    }
    setCurrentFrame(null);
  };

  const handlePause = () => {
    const newRunningState = !isRunning;
    console.log(isRunning ? "Pausing simulation" : "Resuming simulation");
    setIsRunning(newRunningState);
    
    if (isWebGL) {
      if (newRunningState) {
        // Resume WebGL animation
        runAnimation(simulationParams, (data: SimulationResult & { time: number }) => {
          setCurrentFrame(data);
        });
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
    setIsRunning(false);
    
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
              <Controls
                params={simulationParams}
                onChange={setSimulationParams}
              />
            </div>
            <div className="flex-1 relative">
              <PlotComponent
                frame={currentFrame}
                isRunning={isRunning}
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
