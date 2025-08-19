import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js";
import type { AnimationFrame, PlotData, SimulationParams } from "./types";

interface PlotComponentProps {
  frame: AnimationFrame | null;
  isRunning: boolean;
  params: SimulationParams;
}

export default function PlotComponent({
  frame: data,
  isRunning,
  params,
}: PlotComponentProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInitialized = useRef(false);

  useEffect(() => {
    if (!plotRef.current) return;
    const plotElement = plotRef.current;

    if (!plotInitialized.current) {
      // Initialize empty plot
      const layout: Partial<Plotly.Layout> = {
        title: "Telegraph vs Diffusion Equation Comparison",
        xaxis: { title: "Position (x)", range: [params.x_min, params.x_max] },
        yaxis: { title: "Amplitude (u)", range: [-0.5, 1.2] },
        showlegend: true,
        height: 500,
        annotations: [
          {
            x: 0.02,
            y: 0.98,
            xref: "paper" as const,
            yref: "paper" as const,
            text: "t = 0.00",
            showarrow: false,
            font: { size: 14, color: "#333" },
            bgcolor: "rgba(255,255,255,0.8)",
            bordercolor: "#ccc",
            borderwidth: 1,
          },
        ],
      };

      const config: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: [
          "pan2d",
          "lasso2d",
        ] as Plotly.ModeBarDefaultButtons[],
      };

      Plotly.newPlot(plotElement, [], layout, config);
      plotInitialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (!plotRef.current || !data) return;
    const plotElement = plotRef.current;

    const telegraphTrace: PlotData = {
      x: data.telegraph.x,
      y: data.telegraph.u,
      type: "scatter",
      mode: "lines",
      name: "Telegraph Equation",
      line: { color: "#ef4444" },
    };

    const diffusionTrace: PlotData = {
      x: data.diffusion.x,
      y: data.diffusion.u,
      type: "scatter",
      mode: "lines",
      name: "Diffusion Equation",
      line: { color: "#3b82f6" },
    };

    const layout: Partial<Plotly.Layout> = {
      title: "Telegraph vs Diffusion Equation Comparison",
      xaxis: { title: "Position (x)", range: [params.x_min, params.x_max] },
      yaxis: { title: "Amplitude (u)", range: [-0.5, 1.2] },
      showlegend: true,
      height: 500,
      annotations: [
        {
          x: 0.02,
          y: 0.98,
          xref: "paper" as const,
          yref: "paper" as const,
          text: `t = ${data.time.toFixed(2)}`,
          showarrow: false,
          font: { size: 14, color: "#333" },
          bgcolor: "rgba(255,255,255,0.8)",
          bordercolor: "#ccc",
          borderwidth: 1,
        },
      ],
    };

    // Update plot data and time annotation
    Plotly.react(plotElement, [telegraphTrace, diffusionTrace], layout);
  }, [data]);

  return (
    <div className="flex-1 p-4">
      {isRunning && (
        <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded">
          Running...
        </div>
      )}
      <div ref={plotRef} className="w-full" />

      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Telegraph Equation:</strong> ∂²u/∂t² + 2a∂u/∂t = v²∇²u (finite
          velocity)
        </p>
        <p>
          <strong>Diffusion Equation:</strong> ∂u/∂t = k∇²u (infinite velocity)
        </p>
      </div>
    </div>
  );
}
