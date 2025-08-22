import { useEffect, useRef, useState } from 'react';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';

interface DensityData {
  density: number[][];
  xBounds: { min: number; max: number };
  yBounds: { min: number; max: number };
  binSize: number;
}

export const useDensityVisualization = (
  simulatorRef: React.RefObject<RandomWalkSimulator>,
  binSize: number = 20
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [densityData, setDensityData] = useState<DensityData | null>(null);

  const drawDensityHeatmap = (data: DensityData) => {
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
    const maxDensity = Math.max(...density.flat());
    
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

  const updateDensity = () => {
    if (!simulatorRef.current) return;
    
    const data = simulatorRef.current.getDensityProfile2D(binSize);
    setDensityData(data);
    drawDensityHeatmap(data);
  };

  useEffect(() => {
    updateDensity();
  }, [simulatorRef.current, binSize]);

  return {
    canvasRef,
    densityData,
    updateDensity,
    drawDensityHeatmap
  };
};
