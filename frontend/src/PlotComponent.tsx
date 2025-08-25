import React, { useEffect, useRef, useState } from "react";
import Plotly from "plotly.js";
import { ConservationMonitor } from "./utils/conservationMonitor";
import ConservationDisplay from "./ConservationDisplay";
import type { AnimationFrame, PlotData, SimulationParams, EquationMetadata } from "./types";
import { useAppStore } from "./stores/appStore";

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
  const { pdeState, setPdeState } = useAppStore();
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
        xaxis: pdeState.plot.autoscale
          ? { title: "Position (x)", autorange: true as const }
          : { title: "Position (x)", range: pdeState.plot.xRange ?? [params.x_min, params.x_max] },
        yaxis: pdeState.plot.autoscale
          ? { title: "Amplitude (u)", autorange: true as const }
          : { title: "Amplitude (u)", range: pdeState.plot.yRange ?? [-0.5, 1.2] },
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

  // Persist plot ranges on zoom/pan (disabled when autoscale is on)
  useEffect(() => {
    if (!plotRef.current) return;
    const el: any = plotRef.current;
    const onRelayout = (evt: any) => {
      if (pdeState.plot.autoscale) return; // don't persist ranges while autoscaling
      const xr0 = evt?.["xaxis.range[0]"]; const xr1 = evt?.["xaxis.range[1]"];
      const yr0 = evt?.["yaxis.range[0]"]; const yr1 = evt?.["yaxis.range[1]"];
      const next: any = {};
      if (typeof xr0 === 'number' && typeof xr1 === 'number') next.xRange = [xr0, xr1] as [number, number];
      if (typeof yr0 === 'number' && typeof yr1 === 'number') next.yRange = [yr0, yr1] as [number, number];
      if (next.xRange || next.yRange) setPdeState({ plot: { ...pdeState.plot, ...next } });
    };
    el.on && el.on('plotly_relayout', onRelayout);
    return () => { el.removeAllListeners && el.removeAllListeners('plotly_relayout'); };
  }, [setPdeState, pdeState.plot]);

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
      xaxis: pdeState.plot.autoscale
        ? { title: "Position (x)", autorange: true as const }
        : { title: "Position (x)", range: pdeState.plot.xRange ?? [params.x_min, params.x_max] },
      yaxis: pdeState.plot.autoscale
        ? { title: "Amplitude (u)", autorange: true as const }
        : { title: "Amplitude (u)", range: pdeState.plot.yRange ?? [-0.5, 1.2] },
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
        <div className="flex gap-6 items-center justify-center flex-wrap">
          {/* Plot Options */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-700">Plot</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!pdeState.plot.autoscale}
                onChange={(e) => {
                  const autoscale = e.target.checked;
                  // when turning on autoscale, clear stored ranges
                  const nextPlot = autoscale ? { ...pdeState.plot, autoscale, xRange: undefined, yRange: undefined } : { ...pdeState.plot, autoscale };
                  setPdeState({ plot: nextPlot });
                }}
              />
              <span className="text-sm">Autoscale axes</span>
            </label>
          </div>

          {/* Animation Speed */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-700">Speed</h3>
            <label className="flex items-center gap-2">
              <span className="text-xs">{(params.animationSpeed || 1.0).toFixed(1)}x</span>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={params.animationSpeed || 1.0}
                onChange={(e) => onChange({ ...params, animationSpeed: parseFloat(e.target.value) })}
                className="w-20"
              />
            </label>
          </div>

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
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-medium"
              >
                {isRunning ? "Pause" : "Resume"}
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
