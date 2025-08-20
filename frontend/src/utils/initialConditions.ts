import type { SimulationParams, AnimationFrame } from '../types';

/**
 * Generate x-coordinates for the simulation domain
 */
export function generateMesh(x_min: number, x_max: number, mesh_size: number): number[] {
  const dx = (x_max - x_min) / (mesh_size - 1);
  return Array.from({ length: mesh_size }, (_, i) => x_min + i * dx);
}

/**
 * Gaussian distribution
 */
function gaussianDistribution(x: number[], center: number = 0, sigma: number = 1): number[] {
  return x.map(xi => Math.exp(-0.5 * Math.pow((xi - center) / sigma, 2)));
}

/**
 * Step function distribution
 */
function stepDistribution(x: number[], left: number = -1, right: number = 1): number[] {
  return x.map(xi => (xi >= left && xi <= right) ? 1.0 : 0.0);
}

/**
 * Delta function approximation (narrow Gaussian)
 */
function deltaDistribution(x: number[], center: number = 0, sigma: number = 0.1): number[] {
  const values = x.map(xi => Math.exp(-0.5 * Math.pow((xi - center) / sigma, 2)));
  // Normalize to approximate delta function
  const sum = values.reduce((acc, val) => acc + val, 0);
  const dx = (x[1] - x[0]);
  return values.map(val => val / (sum * dx));
}

/**
 * Sine wave distribution
 */
function sineDistribution(x: number[], frequency: number = 1, amplitude: number = 1): number[] {
  return x.map(xi => amplitude * Math.sin(frequency * Math.PI * xi));
}

/**
 * Generate initial conditions based on distribution type
 */
export function generateInitialConditions(params: SimulationParams): AnimationFrame {
  const { distribution, x_min, x_max, mesh_size } = params;
  
  // Generate mesh
  const x = generateMesh(x_min, x_max, mesh_size);
  
  // Generate initial distribution
  let u: number[];
  
  switch (distribution) {
    case 'gaussian':
      u = gaussianDistribution(x, 0, 1);
      break;
    case 'step':
      u = stepDistribution(x, -1, 1);
      break;
    case 'delta':
      u = deltaDistribution(x, 0, 0.1);
      break;
    case 'sine':
      u = sineDistribution(x, 1, 1);
      break;
    default:
      u = gaussianDistribution(x, 0, 1);
  }
  
  return {
    time: 0.0,
    telegraph: { x, u: [...u] },
    diffusion: { x, u: [...u] }
  };
}

/**
 * Normalize distribution to have unit integral (for probability distributions)
 */
export function normalizeDistribution(x: number[], u: number[]): number[] {
  const dx = x.length > 1 ? x[1] - x[0] : 1;
  const integral = u.reduce((sum, val) => sum + val, 0) * dx;
  
  if (integral === 0) return u;
  
  return u.map(val => val / integral);
}

/**
 * Get distribution parameters for display/debugging
 */
export function getDistributionInfo(params: SimulationParams): {
  name: string;
  description: string;
  parameters: Record<string, number>;
} {
  switch (params.distribution) {
    case 'gaussian':
      return {
        name: 'Gaussian',
        description: 'Normal distribution exp(-x²/2σ²)',
        parameters: { center: 0, sigma: 1 }
      };
    case 'step':
      return {
        name: 'Step Function',
        description: 'Uniform distribution over interval',
        parameters: { left: -1, right: 1 }
      };
    case 'delta':
      return {
        name: 'Delta Function',
        description: 'Narrow Gaussian approximation',
        parameters: { center: 0, sigma: 0.1 }
      };
    case 'sine':
      return {
        name: 'Sine Wave',
        description: 'Sinusoidal distribution',
        parameters: { frequency: 1, amplitude: 1 }
      };
    default:
      return {
        name: 'Unknown',
        description: 'Unknown distribution type',
        parameters: {}
      };
  }
}
