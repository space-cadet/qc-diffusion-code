import React, { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js";
import { ConservationMonitor } from "./utils/conservationMonitor";
import ConservationDisplay from "./ConservationDisplay";
import type { AnimationFrame, PlotData, SimulationParams, EquationMetadata } from "./types";

interface PlotComponentProps {
  frame: AnimationFrame | null;
  isRunning: boolean;
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onReset: () => void;
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
  onChange,
  onStart,
  onStop,
  onPause,
  onReset,
}: PlotComponentProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInitialized = useRef(false);
  const conservationMonitor = useRef(new ConservationMonitor());
  const [conservationData, setConservationData] = useState<{
    currentQuantities: any;
    errors: any;
    isStable: boolean;
  }>({
    currentQuantities: null,
    errors: null,
    isStable: true
  });
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

    // Only update conservation monitoring during actual simulation (not initial conditions)
    if (isRunning && data.time && (data.time as number) > 0) {
      conservationMonitor.current.addFrame(data, params);
      const currentQuantities = conservationMonitor.current.getCurrentQuantities();
      const errors = conservationMonitor.current.getConservationErrors();
      const isStable = conservationMonitor.current.isStable();
      
      setConservationData({
        currentQuantities,
        errors,
        isStable
      });
    } else if (!isRunning && (!data.time || (data.time as number) === 0)) {
      // Reset conservation data when not running and at initial conditions
      setConservationData({
        currentQuantities: null,
        errors: { mass_telegraph_error: 0, mass_diffusion_error: 0, energy_telegraph_error: 0 },
        isStable: true
      });
    }

    const traces: PlotData[] = selectedEquations.map(equationType => {
      const frameData = data[equationType] as { x: number[], u: number[] };
      const metadata = equationMetadata[equationType];
      
      // Skip if no data for this equation type
      if (!frameData || !frameData.x || !frameData.u) {
        return null;
      }
      
      return {
        x: frameData.x,
        y: frameData.u,
        type: "scatter",
        mode: "lines",
        name: metadata.displayName,
        line: { color: metadata.color },
      };
    }).filter(trace => trace !== null) as PlotData[];

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
  }, [data, selectedEquations, params]);

  return (
    <div className="flex-1 p-4 flex flex-col">
      {isRunning && (
        <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded">
          Running...
        </div>
      )}
      <div ref={plotRef} className="w-full flex-1" />

      <div className="mt-2 text-sm text-gray-600 mb-3">
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

      {/* Bottom Controls */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex gap-6 items-center justify-center">
          {/* Solver Type */}
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-gray-700">Solver Type</h3>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="solver"
                  value="python"
                  checked={params.solver_type !== 'webgl'}
                  onChange={() => onChange({ ...params, solver_type: 'python' })}
                  className="mr-2"
                />
                <span className="text-sm">Python</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="solver"
                  value="webgl"
                  checked={params.solver_type === 'webgl'}
                  onChange={() => onChange({ ...params, solver_type: 'webgl' })}
                  className="mr-2"
                />
                <span className="text-sm">WebGL</span>
              </label>
            </div>
          </div>

          {/* Simulation Control */}
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-semibold text-gray-700">Simulation Control</h3>
            <div className="flex gap-2">
              <button
                onClick={onStart}
                disabled={isRunning}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium"
              >
                Start
              </button>
              <button
                onClick={onPause}
                disabled={!isRunning}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300 text-sm font-medium"
              >
                Pause
              </button>
              <button
                onClick={onStop}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium"
              >
                Stop
              </button>
              <button
                onClick={() => {
                  conservationMonitor.current.reset();
                  setConservationData({
                    currentQuantities: null,
                    errors: { mass_telegraph_error: 0, mass_diffusion_error: 0, energy_telegraph_error: 0 },
                    isStable: true
                  });
                  onReset();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conservation Quantities Display */}
      <ConservationDisplay
        currentQuantities={conservationData.currentQuantities}
        errors={conservationData.errors}
        isStable={conservationData.isStable}
      />
    </div>
  );
}
