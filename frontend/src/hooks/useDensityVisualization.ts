import { useEffect, useRef, useState } from 'react';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';

interface DensityData2D {
  density: number[][];
  xBounds: { min: number; max: number };
  yBounds: { min: number; max: number };
  binSize: number;
}

interface DensityData1D {
  density: number[];
  xBounds: { min: number; max: number };
  binSize: number;
}

export const useDensityVisualization = (
  simulatorRef: React.RefObject<RandomWalkSimulator>,
  binSize: number = 20,
  dimension: '1D' | '2D' = '2D'
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [densityData2D, setDensityData2D] = useState<DensityData2D | null>(null);
  const [densityData1D, setDensityData1D] = useState<DensityData1D | null>(null);

  const drawDensityHeatmap = (data: DensityData2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { density, xBounds, yBounds } = data;
    
    if (density.length === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling
    const xScale = canvas.width / density[0].length;
    const yScale = canvas.height / density.length;

    // Find max density for normalization
    const maxDensity = Math.max(...(density.flat() as number[]));
    
    if (maxDensity === 0) return;

    // Draw heatmap
    for (let y = 0; y < density.length; y++) {
      for (let x = 0; x < density[y].length; x++) {
        const normalizedDensity = density[y][x] / maxDensity;
        
        // Color mapping: blue (low) to red (high)
        const intensity = Math.floor(normalizedDensity * 255);
        ctx.fillStyle = `rgb(${intensity}, 0, ${255 - intensity})`;
        
        ctx.fillRect(
          x * xScale,
          y * yScale,
          xScale,
          yScale
        );
      }
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= density[0].length; x++) {
      ctx.beginPath();
      ctx.moveTo(x * xScale, 0);
      ctx.lineTo(x * xScale, canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= density.length; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * yScale);
      ctx.lineTo(canvas.width, y * yScale);
      ctx.stroke();
    }
  };

  const drawDensity1D = (data: DensityData1D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { density } = data;
    
    if (density.length === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find max density for normalization
    const maxDensity = Math.max(...density);
    
    if (maxDensity === 0) return;

    // Draw line chart
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - (density[0] / maxDensity) * canvas.height);

    for (let x = 1; x < density.length; x++) {
      const y = canvas.height - (density[x] / maxDensity) * canvas.height;
      ctx.lineTo(x * (canvas.width / density.length), y);
    }

    ctx.stroke();
  };

  const updateDensity = () => {
    if (!simulatorRef.current) return;
    
    if (dimension === '1D') {
      const data = simulatorRef.current.getDensityProfile1D(binSize);
      setDensityData1D(data);
      drawDensity1D(data);
    } else {
      const data = simulatorRef.current.getDensityProfile2D(binSize);
      setDensityData2D(data);
      drawDensityHeatmap(data);
    }
  };

  useEffect(() => {
    updateDensity();
  }, [binSize]);

  return {
    canvasRef,
    densityData1D,
    densityData2D,
    updateDensity,
    drawDensityHeatmap,
    drawDensity1D
  };
};
