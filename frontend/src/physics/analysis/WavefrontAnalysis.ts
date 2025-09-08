
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';

type DensitySnapshot = {
  time: number;
  density: number[][];
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number };
};

function calculateCenterOfMass(density: number[][]): { x: number; y: number } {
  let totalMass = 0;
  let xSum = 0;
  let ySum = 0;

  for (let y = 0; y < density.length; y++) {
    for (let x = 0; x < density[y].length; x++) {
      const mass = density[y][x];
      totalMass += mass;
      xSum += x * mass;
      ySum += y * mass;
    }
  }

  return totalMass > 0 
    ? { x: xSum / totalMass, y: ySum / totalMass }
    : { x: 0, y: 0 };
}

export function analyzeWaveFrontSpeed(
  densityHistory: DensitySnapshot[],
  currentStrategy: RandomWalkStrategy
): { measuredSpeed: number; theoreticalSpeed: number; error: number } {
  if (densityHistory.length < 2) {
    return { measuredSpeed: 0, theoreticalSpeed: 0, error: 0 };
  }

  // Calculate theoretical speed
  const parameters = currentStrategy.getParameters ? currentStrategy.getParameters() : { collisionRate: 1, velocity: 1 };
  const velocity = parameters?.velocity || 1;
  const theoreticalSpeed = velocity; // Simplified for now

  // Measure wavefront propagation from density history
  const recent = densityHistory.slice(-10); // Last 10 snapshots
  if (recent.length < 2) {
    return { measuredSpeed: 0, theoreticalSpeed, error: 0 };
  }

  // Find center of mass movement over time
  let totalSpeedMeasurements = 0;
  let speedSum = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const curr = recent[i];
    const dt = curr.time - prev.time;
    
    if (dt > 0) {
      // Calculate center of mass for each snapshot
      const prevCM = calculateCenterOfMass(prev.density);
      const currCM = calculateCenterOfMass(curr.density);
      
      const distance = Math.sqrt(
        Math.pow(currCM.x - prevCM.x, 2) + Math.pow(currCM.y - prevCM.y, 2)
      );
      
      const speed = distance / dt;
      speedSum += speed;
      totalSpeedMeasurements++;
    }
  }

  const measuredSpeed = totalSpeedMeasurements > 0 ? speedSum / totalSpeedMeasurements : 0;
  const error = theoreticalSpeed > 0 ? Math.abs(measuredSpeed - theoreticalSpeed) / theoreticalSpeed : 0;

  return { measuredSpeed, theoreticalSpeed, error };
}
