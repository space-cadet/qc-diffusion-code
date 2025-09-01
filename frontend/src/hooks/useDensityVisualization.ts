import { useEffect, useRef, useState, useCallback } from 'react';
import type { Particle } from '../physics/types/Particle';
import { getDensityProfile1D, getDensityProfile2D } from '../physics/utils/density';

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
  particles: Particle[],
  particleCount: number,
  binSize?: number,
  dimension: '1D' | '2D' = '2D'
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [densityData2D, setDensityData2D] = useState<DensityData2D | null>(null);
  const [densityData1D, setDensityData1D] = useState<DensityData1D | null>(null);

  // Remove particlesRef pattern - use particles directly for proper reactivity

  const drawDensityHeatmap = useCallback((data: DensityData2D) => {
    const canvas = canvasRef.current;
    // console.log('[drawDensityHeatmap] Starting render:', {
    //   canvasExists: !!canvas,
    //   canvasWidth: canvas?.width,
    //   canvasHeight: canvas?.height,
    //   densityRows: data.density.length,
    //   densityCols: data.density[0]?.length || 0
    // });

    if (!canvas) {
      console.error('[drawDensityHeatmap] Canvas ref is null');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[drawDensityHeatmap] Could not get 2D context');
      return;
    }

    const { density, xBounds, yBounds } = data;
    
    if (density.length === 0) {
      console.warn('[drawDensityHeatmap] Density array is empty, skipping render');
      return;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate scaling
    const xScale = canvas.width / density[0].length;
    const yScale = canvas.height / density.length;

    // console.log('[drawDensityHeatmap] Scaling calculated:', {
    //   xScale, yScale,
    //   canvasSize: { width: canvas.width, height: canvas.height },
    //   densitySize: { rows: density.length, cols: density[0].length }
    // });

    // Find max density for normalization
    const flatDensity = density.flat() as number[];
    const maxDensity = flatDensity.reduce((max, val) => Math.max(max, val), 0);
    
    // console.log('[drawDensityHeatmap] Density stats:', {
    //   maxDensity,
    //   minDensity: Math.min(...flatDensity),
    //   totalValues: flatDensity.length,
    //   zeroValues: flatDensity.filter(v => v === 0).length
    // });
    
    if (maxDensity === 0) {
      console.warn('[drawDensityHeatmap] All density values are 0, skipping render');
      return;
    }

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

    // console.log('[drawDensityHeatmap] Heatmap rendering complete');

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
  }, []);

  const drawDensity1D = useCallback((data: DensityData1D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { density } = data;
    
    if (density.length === 0) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find max density for normalization
    const maxDensity = density.reduce((max, val) => Math.max(max, val), 0);
    
    if (maxDensity === 0) return;

    const barWidth = canvas.width / density.length;
    const barSpacing = Math.max(1, barWidth * 0.1); // 10% spacing
    const actualBarWidth = barWidth - barSpacing;

    // Create single gradient once, not per bar (prevents memory leak)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#f59e0b'); // Orange top
    gradient.addColorStop(1, '#d97706'); // Darker orange bottom

    // Draw histogram bars
    for (let i = 0; i < density.length; i++) {
      const barHeight = (density[i] / maxDensity) * canvas.height * 0.85;
      const x = i * barWidth + barSpacing / 2;
      const y = canvas.height - barHeight;

      // Use the same gradient for all bars (no memory leak)
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, actualBarWidth, barHeight);

      // Draw bar border
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, actualBarWidth, barHeight);
    }
  }, []);

  const updateDensity = useCallback(() => {
    // console.log('[useDensityVisualization] updateDensity called:', {
    //   particleCount: particles.length,
    //   dimension,
    //   binSize,
    //   hasParticles: particles.length > 0
    // });

    if (dimension === '1D') {
      const data = getDensityProfile1D(particles, particleCount, binSize || 20);
      // console.log('[useDensityVisualization] 1D density data:', {
      //   densityLength: data.density.length,
      //   xBounds: data.xBounds,
      //   binSize: data.binSize,
      //   maxDensity: Math.max(...data.density),
      //   minDensity: Math.min(...data.density),
      //   hasValidData: data.density.length > 0
      // });
      setDensityData1D(data);
      drawDensity1D(data);
    } else {
      const data = getDensityProfile2D(particles, particleCount, binSize || 20);
      // console.log('[useDensityVisualization] 2D density data:', {
      //   densityRows: data.density.length,
      //   densityCols: data.density[0]?.length || 0,
      //   xBounds: data.xBounds,
      //   yBounds: data.yBounds,
      //   binSize: data.binSize,
      //   maxDensity: Math.max(...data.density.flat()),
      //   minDensity: Math.min(...data.density.flat()),
      //   hasValidData: data.density.length > 0
      // });
      setDensityData2D(data);
      drawDensityHeatmap(data);
    }
  }, [particles, particleCount, dimension, binSize, drawDensity1D, drawDensityHeatmap]);

  useEffect(() => {
    updateDensity();
    
    // Cleanup function to prevent memory leaks
    return () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear canvas and reset context
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.reset?.(); // Reset context if available (modern browsers)
        }
      }
    };
  }, [binSize, dimension, particleCount, particles, updateDensity]);

  return {
    canvasRef,
    densityData1D,
    densityData2D,
    updateDensity,
    drawDensityHeatmap,
    drawDensity1D
  };
};