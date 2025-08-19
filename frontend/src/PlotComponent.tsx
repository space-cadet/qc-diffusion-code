import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js';
import type { SimulationResult, PlotData } from './types';

interface PlotComponentProps {
  data: SimulationResult | null;
  loading: boolean;
}

export default function PlotComponent({ data, loading }: PlotComponentProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const plotInitialized = useRef(false);

  useEffect(() => {
    if (!plotRef.current) return;
    const plotElement = plotRef.current;

    if (!plotInitialized.current) {
      // Initialize empty plot
      const layout = {
        title: 'Telegraph vs Diffusion Equation Comparison',
        xaxis: { title: 'Position (x)' },
        yaxis: { title: 'Amplitude (u)' },
        showlegend: true,
        height: 500,
      };

      const config: Partial<Plotly.Config> = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['pan2d', 'lasso2d'] as Plotly.ModeBarDefaultButtons[],
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
      type: 'scatter',
      mode: 'lines',
      name: 'Telegraph Equation',
      line: { color: '#ef4444' },
    };

    const diffusionTrace: PlotData = {
      x: data.diffusion.x,
      y: data.diffusion.u,
      type: 'scatter',
      mode: 'lines',
      name: 'Diffusion Equation',
      line: { color: '#3b82f6' },
    };

    Plotly.redraw(plotElement).then(() => {
      Plotly.animate(plotElement, {
        data: [telegraphTrace, diffusionTrace],
      }, {
        transition: { duration: 300 },
        frame: { duration: 300 },
      });
    });
  }, [data]);

  return (
    <div className="flex-1 p-4">
      {loading && (
        <div className="absolute top-4 right-4 bg-blue-100 text-blue-800 px-3 py-1 rounded">
          Computing...
        </div>
      )}
      <div ref={plotRef} className="w-full" />
      
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Telegraph Equation:</strong> ∂²u/∂t² + 2a∂u/∂t = v²∇²u (finite velocity)</p>
        <p><strong>Diffusion Equation:</strong> ∂u/∂t = k∇²u (infinite velocity)</p>
      </div>
    </div>
  );
}
