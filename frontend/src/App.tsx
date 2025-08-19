import React, { useState, useEffect, useCallback } from "react";
import Controls from "./Controls";
import PlotComponent from "./PlotComponent";
import type {
  SimulationParams,
  AnimationFrame,
  WebSocketMessage,
} from "./types";

export default function App() {
  const [params, setParams] = useState<SimulationParams>({
    collision_rate: 1.0,
    velocity: 1.0,
    diffusivity: 1.0,
    t_range: 5.0,
  });

  const [currentFrame, setCurrentFrame] = useState<AnimationFrame | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket("ws://localhost:8000/ws/simulate");

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      if (message.type === "animation_frame" && message.data && 'time' in message.data) {
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
  }, []);

  useEffect(() => {
    const websocket = connectWebSocket();
    return () => websocket.close();
  }, [connectWebSocket]);

  const handleStart = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsRunning(true);
      ws.send(JSON.stringify({
        type: "start",
        params: params
      }));
    }
  };

  const handleStop = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsRunning(false);
      setCurrentFrame(null);
      ws.send(JSON.stringify({ type: "stop" }));
    }
  };

  const handlePause = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setIsRunning(false);
      ws.send(JSON.stringify({ type: "pause" }));
    }
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
        />
      </div>
      <div className="flex-1 relative">
        <PlotComponent frame={currentFrame} isRunning={isRunning} />
      </div>
    </div>
  );
}
