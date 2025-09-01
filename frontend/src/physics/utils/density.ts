import type { Particle } from '../types/Particle';

export function getDensityProfile2D(particles: Particle[], particleCount: number, binSize: number = 10): {
  density: number[][];
  xBounds: { min: number; max: number };
  yBounds: { min: number; max: number };
  binSize: number;
} {
  const positions = particles.map(p => p.position);
  
  // console.log('[getDensityProfile2D] Input:', {
    // particleCount,
    // positionsLength: positions.length,
    // binSize,
    // firstFewPositions: positions.slice(0, 3)
  // });
  
  if (positions.length === 0) {
    console.warn('[getDensityProfile2D] No positions provided, returning empty result');
    return {
      density: [],
      xBounds: { min: 0, max: 0 },
      yBounds: { min: 0, max: 0 },
      binSize
    };
  }
  
  // Calculate bounds
  const xMin = Math.min(...positions.map(p => p.x));
  const xMax = Math.max(...positions.map(p => p.x));
  const yMin = Math.min(...positions.map(p => p.y));
  const yMax = Math.max(...positions.map(p => p.y));
  
  // console.log('[getDensityProfile2D] Bounds calculated:', {
    // xMin, xMax, yMin, yMax,
    // xRange: xMax - xMin,
    // yRange: yMax - yMin
  // });
  
  // Calculate grid dimensions
  const xBins = Math.ceil((xMax - xMin) / binSize) + 1;
  const yBins = Math.ceil((yMax - yMin) / binSize) + 1;
  
  // console.log('[getDensityProfile2D] Grid dimensions:', {
    // xBins, yBins,
    // totalBins: xBins * yBins
  // });
  
  // Initialize 2D density array
  const density: number[][] = Array(yBins).fill(null).map(() => Array(xBins).fill(0));
  
  // Bin particles
  positions.forEach(pos => {
    const xBin = Math.floor((pos.x - xMin) / binSize);
    const yBin = Math.floor((pos.y - yMin) / binSize);
    
    if (xBin >= 0 && xBin < xBins && yBin >= 0 && yBin < yBins) {
      density[yBin][xBin]++;
    }
  });
  
  // console.log('[getDensityProfile2D] Binning complete:', {
    // totalParticlesBinned: density.flat().reduce((sum, val) => sum + val, 0),
    // maxDensityInBin: Math.max(...density.flat()),
    // occupiedBins: density.flat().filter(count => count > 0).length
  // });
  
  // Normalize by bin area and total particles
  const binArea = binSize * binSize;
  const normalizedDensity = density.map(row => 
    row.map(count => count / (particleCount * binArea))
  );
  
  // console.log('[getDensityProfile2D] Normalization complete:', {
    // binArea,
    // normalizationFactor: 1 / (particleCount * binArea),
    // finalMaxDensity: Math.max(...normalizedDensity.flat()),
    // finalMinDensity: Math.min(...normalizedDensity.flat())
  // });
  
  return {
    density: normalizedDensity,
    xBounds: { min: xMin, max: xMax },
    yBounds: { min: yMin, max: yMax },
    binSize
  };
}

export function getDensityProfile1D(particles: Particle[], particleCount: number, binSize: number = 10): {
  density: number[];
  xBounds: { min: number; max: number };
  binSize: number;
} {
  const positions = particles.map(p => p.position);
  
  if (positions.length === 0) {
    return {
      density: [],
      xBounds: { min: 0, max: 0 },
      binSize
    };
  }
  
  // Calculate bounds
  const xMin = Math.min(...positions.map(p => p.x));
  const xMax = Math.max(...positions.map(p => p.x));
  const spatialRange = xMax - xMin;
  
  // Adaptive bin count based on particle count (smooth scaling)
  // Use square root scaling with a reasonable range: 15-60 bins
  const minBins = 15;
  const maxBins = 60;
  const optimalBins = Math.sqrt(particleCount) * 1.5;
  const xBins = Math.max(minBins, Math.min(maxBins, Math.round(optimalBins)));
  
  // Calculate effective bin size from adaptive bin count
  const effectiveBinSize = spatialRange / xBins;
  
  // Initialize 1D density array
  const density: number[] = Array(xBins).fill(0);
  
  // Bin particles
  positions.forEach(pos => {
    const xBin = Math.floor((pos.x - xMin) / effectiveBinSize);
    
    if (xBin >= 0 && xBin < xBins) {
      density[xBin]++;
    }
  });
  
  // Normalize by bin area and total particles
  const normalizedDensity = density.map(count => count / (particleCount * effectiveBinSize));
  
  return {
    density: normalizedDensity,
    xBounds: { min: xMin, max: xMax },
    binSize: effectiveBinSize
  };
}

export function getDensityField1D(
  particles: Particle[],
  particleCount: number,
  dx: number = 0.1,
  maxBins: number = 1000
): { error: number; rho: number[] } {
  const positions = particles.map(p => p.position);

  if (positions.length === 0 || particleCount <= 0) {
    return { error: 0, rho: [] as number[] };
  }

  const xMin = Math.min(...positions.map(p => p.x));
  const xMax = Math.max(...positions.map(p => p.x));

  // Validate bounds before creating array
  if (!isFinite(xMin) || !isFinite(xMax) || xMin >= xMax) {
    return { error: 0, rho: [] as number[] };
  }

  const range = xMax - xMin;
  const bins = Math.min(maxBins, Math.max(1, Math.ceil(range / dx)));

  const counts = new Array(bins).fill(0);
  positions.forEach(pos => {
    const bin = Math.floor(((pos.x - xMin) / range) * bins);
    if (bin >= 0 && bin < bins) {
      counts[bin]++;
    }
  });

  // Normalize by particle count and bin width
  const rho = counts.map(count => count / (particleCount * dx));
  return { error: 0.01, rho };
}
