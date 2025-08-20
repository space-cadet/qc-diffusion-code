import React, { useState, useEffect, useCallback, useRef } from "react";
import Controls from "./Controls";
import PlotComponent from "./PlotComponent";
import { useWebGLSolver } from "./hooks/useWebGLSolver";
import { generateInitialConditions } from "./utils/initialConditions";
import type {
  SimulationParams,
  AnimationFrame,
  WebSocketMessage,
  SimulationResult,
} from "./types";

export default function App() {
  const [params, setParams] = useState<SimulationParams>({
    collision_rate: 1.0,
    velocity: 1.0,
    diffusivity: 1.0,
    t_range: 5.0,
    dt: 0.01,
    distribution: "gaussian",
    x_min: -5.0,
    x_max: 5.0,
    mesh_size: 64,
    selectedEquations: ['telegraph', 'diffusion'],
  });

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { initSolver, runAnimation, stop } = useWebGLSolver();

  const isWebGL = params.solver_type === 'webgl';

  const initializeConditions = useCallback((params: SimulationParams) => {
    console.log("Generating initial conditions with params:", params);
    const initialFrame = generateInitialConditions(params);
    console.log("Generated initial conditions:", initialFrame);
    setCurrentFrame(initialFrame);
  }, []);

  useEffect(() => {
    initializeConditions(params);
  }, [params.distribution, params.x_min, params.x_max, params.mesh_size, params.selectedEquations, initializeConditions]);

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
    console.log("Starting simulation with params:", params);
    setIsRunning(true);
    
    if (isWebGL && canvasRef.current) {
      initSolver(canvasRef.current, params);
      runAnimation(params, (data: SimulationResult & { time: number }) => {
        setCurrentFrame(data);
      });
    } else if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "start", params: params }));
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
    console.log("Pausing simulation");
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsRunning(false);
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
    
    initializeConditions(params);
  };

  return (
    <div className="h-screen flex">
      <div className="w-80">
        <Controls
          params={params}
          onChange={setParams}
          isRunning={isRunning}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
          onReset={handleReset}
        />
      </div>
      <div className="flex-1 relative">
        <PlotComponent
          frame={currentFrame}
          isRunning={isRunning}
          params={params}
        />
        {isWebGL && (
          <canvas
            ref={canvasRef}
            width={params.mesh_size}
            height={1}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
