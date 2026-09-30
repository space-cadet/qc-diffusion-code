export type Dimension = '1D' | '2D';

// Box-Muller transform for Gaussian random numbers
export function gaussianRandom(random: () => number = Math.random): number {
  let u = 0, v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate thermal velocities scaled by temperature; optional momentum centering parameter in future
export function generateThermalVelocities(
  count: number,
  dimension: Dimension,
  temperature: number,
  random: () => number = Math.random
): Array<{ vx: number; vy: number }> {
  const thermalSpeed = 50 * Math.sqrt(temperature);
  const velocities: Array<{ vx: number; vy: number }> = [];

  for (let i = 0; i < count; i++) {
    const vx = thermalSpeed * gaussianRandom(random);
    const vy = dimension === '1D' ? 0 : thermalSpeed * gaussianRandom(random);
    velocities.push({ vx, vy });
  }

  return velocities;
}
