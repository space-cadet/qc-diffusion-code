export type Dimension = '1D' | '2D';

// Box-Muller transform for Gaussian random numbers
export function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate thermal velocities scaled by temperature; optional momentum centering parameter in future
export function generateThermalVelocities(
  count: number,
  dimension: Dimension,
  temperature: number
): Array<{ vx: number; vy: number }> {
  const thermalSpeed = 50 * Math.sqrt(temperature);
  const velocities: Array<{ vx: number; vy: number }> = [];

  for (let i = 0; i < count; i++) {
    const vx = thermalSpeed * gaussianRandom();
    const vy = dimension === '1D' ? 0 : thermalSpeed * gaussianRandom();
    velocities.push({ vx, vy });
  }

  return velocities;
}
