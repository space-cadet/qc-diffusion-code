import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js";
import type { AnimationFrame, PlotData, SimulationParams, EquationMetadata } from "./types";

interface PlotComponentProps {
  frame: AnimationFrame | null;
  isRunning: boolean;
  params: SimulationParams;
}

const equationMetadata: { [key: string]: EquationMetadata } = {
  telegraph: {
    name: "telegraph",
    displayName: "Telegraph Equation",
    color: "#ef4444",
    parameters: ["collision_rate", "velocity"]
  },
  diffusion: {
    name: "diffusion",
    displayName: "Diffusion Equation", 
    color: "#3b82f6",
    parameters: ["diffusivity"]
  },
  "wheeler-dewitt": {
    name: "wheeler-dewitt",
    displayName: "Wheeler-DeWitt",
    color: "#10b981",
    parameters: []
  }
};

export default function PlotComponent({
  frame: data,
  isRunning,
  params,
}: PlotComponentProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInitialized = useRef(false);
  const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];

  useEffect(() => {
    if (!plotRef.current) return;
    const plotElement = plotRef.current;

    if (!plotInitialized.current) {
      const title = selectedEquations.length > 1 
        ? `${selectedEquations.map(eq => equationMetadata[eq]?.displayName).join(' vs ')} Comparison`
        : equationMetadata[selectedEquations[0]]?.displayName || "Equation Simulation";

      const layout: Partial<Plotly.Layout> = {
        title,
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
  }, [selectedEquations]);

  useEffect(() => {
    if (!plotRef.current || !data) return;
    const plotElement = plotRef.current;

    const traces: PlotData[] = selectedEquations.map(equationType => {
      const frameData = data[equationType] as { x: number[], u: number[] };
      const metadata = equationMetadata[equationType];
      
      return {
        x: frameData.x,
        y: frameData.u,
        type: "scatter",
        mode: "lines",
        name: metadata.displayName,
        line: { color: metadata.color },
      };
    });

    const title = selectedEquations.length > 1 
      ? `${selectedEquations.map(eq => equationMetadata[eq]?.displayName).join(' vs ')} Comparison`
      : equationMetadata[selectedEquations[0]]?.displayName || "Equation Simulation";

    const layout: Partial<Plotly.Layout> = {
      title,
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
          text: `t = ${(data.time as number).toFixed(2)}`,
          showarrow: false,
          font: { size: 14, color: "#333" },
          bgcolor: "rgba(255,255,255,0.8)",
          bordercolor: "#ccc",
          borderwidth: 1,
        },
      ],
    };

    Plotly.react(plotElement, traces, layout);
  }, [data, selectedEquations]);

  return (
    <div className="flex-1 p-4">
      {isRunning && (
        <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded">
          Running...
        </div>
      )}
      <div ref={plotRef} className="w-full" />

      <div className="mt-4 text-sm text-gray-600">
        {selectedEquations.includes('telegraph') && (
          <p>
            <strong>Telegraph Equation:</strong> ∂²u/∂t² + 2a∂u/∂t = v²∇²u (finite velocity)
          </p>
        )}
        {selectedEquations.includes('diffusion') && (
          <p>
            <strong>Diffusion Equation:</strong> ∂u/∂t = k∇²u (infinite velocity)
          </p>
        )}
      </div>
    </div>
  );
}
