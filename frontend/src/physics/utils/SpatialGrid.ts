import type { Particle } from '../types/Particle';

export class SpatialGrid {
  private gridSize: number;
  private cellSize: number;
  private grid: Map<string, Particle[]> = new Map();

  constructor(gridSize: number, cellSize: number) {
    this.gridSize = gridSize;
    this.cellSize = cellSize;
    console.log(`[SpatialGrid] Initialized: gridSize=${gridSize}, cellSize=${cellSize}`);
  }

  clear(): void {
    this.grid.clear();
  }

  private getGridKey(x: number, y: number): string {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    return `${gx},${gy}`;
  }

  insert(particle: Particle): void {
    const key = this.getGridKey(particle.position.x, particle.position.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(particle);
  }

  getNearbyParticles(particle: Particle): Particle[] {
    const nearby: Particle[] = [];
    const gx = Math.floor(particle.position.x / this.cellSize);
    const gy = Math.floor(particle.position.y / this.cellSize);

    // Check 3x3 grid around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const particles = this.grid.get(key);
        if (particles) {
          nearby.push(...particles);
        }
      }
    }
    
    // Log grid query efficiency occasionally
    if (Math.random() < 0.000001) { // 1% chance
      console.log(`[SpatialGrid] Query grid(${gx},${gy}): found ${nearby.length} nearby particles`);
    }
    
    return nearby;
  }
}
