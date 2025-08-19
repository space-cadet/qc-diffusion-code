import React, { useState, useEffect, useCallback } from "react";
import Controls from "./Controls";
import PlotComponent from "./PlotComponent";
import type {
  SimulationParams,
  SimulationResult,
  WebSocketMessage,
} from "./types";

export default function App() {
  const [params, setParams] = useState<SimulationParams>({
    collision_rate: 1.0,
    velocity: 1.0,
    diffusivity: 1.0,
    t_range: 5.0,
  });

  const [data, setData] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket("ws://localhost:8000/ws/simulate");

    websocket.onopen = () => {
      console.log("WebSocket connected");
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      if (message.type === "simulation_result" && message.data) {
        setData(message.data);
        setLoading(false);
      } else if (message.type === "error") {
        console.error("Simulation error:", message.message);
        setLoading(false);
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket disconnected");
      setWs(null);
    };

    return websocket;
  }, []);

  useEffect(() => {
    const websocket = connectWebSocket();
    return () => websocket.close();
  }, [connectWebSocket]);

  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setLoading(true);
      ws.send(JSON.stringify(params));
    }
  }, [params, ws]);

  return (
    <div className="h-screen flex">
      <div className="w-80">
        <Controls params={params} onChange={setParams} />
      </div>
      <div className="flex-1 relative">
        <PlotComponent data={data} loading={loading} />
      </div>
    </div>
  );
}
