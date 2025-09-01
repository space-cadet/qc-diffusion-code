import type { BoundaryConfig, Position, BoundaryResult } from '../types/BoundaryConfig';
import type { Particle, Vector, Velocity } from '../types/Particle';
import { 
  applyPeriodicBoundary,
  applyReflectiveBoundary,
  applyAbsorbingBoundary 
} from '../utils/boundaryUtils';

interface CanvasSize {
  width: number;
  height: number;
}

export type Dimension = '1D' | '2D';

export class CoordinateSystem {
  private boundaries: BoundaryConfig;
  private canvasSize: CanvasSize;
  private dimension: Dimension;

  constructor(
    canvasSize: CanvasSize,
    boundaries: BoundaryConfig,
    dimension: Dimension,
  ) {
    this.boundaries = boundaries;
    this.canvasSize = canvasSize;
    this.dimension = dimension;
  }

  toCanvas(physics: { x: number; y: number }): { x: number; y: number } {
    const wPhys = this.boundaries.xMax - this.boundaries.xMin || 1;
    const hPhys = (this.boundaries.yMax - this.boundaries.yMin) || 1;

    const x = ((physics.x - this.boundaries.xMin) / wPhys) * this.canvasSize.width;
    const y = this.dimension === '1D'
      ? this.canvasSize.height / 2
      : ((physics.y - this.boundaries.yMin) / hPhys) * this.canvasSize.height;
    return { x, y };
  }

  toPhysics(canvas: { x: number; y: number }): { x: number; y: number } {
    const wPhys = this.boundaries.xMax - this.boundaries.xMin || 1;
    const hPhys = (this.boundaries.yMax - this.boundaries.yMin) || 1;

    const x = this.boundaries.xMin + (canvas.x / Math.max(this.canvasSize.width, 1)) * wPhys;
    const y = this.dimension === '1D'
      ? 0
      : this.boundaries.yMin + (canvas.y / Math.max(this.canvasSize.height, 1)) * hPhys;
    return { x, y };
  }

  constrainToDimension(p: { x: number; y: number }): { x: number; y: number } {
    return this.dimension === '1D' ? { x: p.x, y: 0 } : p;
  }

  isWithinBounds(p: { x: number; y: number }): boolean {
    return (
      p.x >= this.boundaries.xMin && p.x <= this.boundaries.xMax &&
      (this.dimension === '1D' || (p.y >= this.boundaries.yMin && p.y <= this.boundaries.yMax))
    );
  }

  updateBoundaries(config: BoundaryConfig): void {
    this.boundaries = config;
  }

  updateCanvasSize(size: { width: number; height: number }): void {
    this.canvasSize = size;
  }

  updateDimension(dimension: Dimension): void {
    this.dimension = dimension;
  }

  getCanvasSize(): { width: number; height: number } {
    return { ...this.canvasSize };
  }

  getBoundaries(): BoundaryConfig {
    return { ...this.boundaries };
  }

  getDimension(): Dimension {
    return this.dimension;
  }

  calculateDisplacement(pos1: Position, pos2: Position): Vector {
    return {
      x: pos2.x - pos1.x,
      y: this.dimension === '1D' ? 0 : pos2.y - pos1.y
    };
  }

  calculateVelocity(pos1: Position, pos2: Position, dt: number): Velocity {
    return this.toVelocity({
      x: (pos2.x - pos1.x) / dt,
      y: this.dimension === '1D' ? 0 : (pos2.y - pos1.y) / dt
    });
  }

  toVelocity(vector: Vector): Velocity {
    return { vx: vector.x, vy: vector.y };
  }

  toVector(velocity: Velocity): Vector {
    return { x: velocity.vx, y: velocity.vy };
  }

  applyBoundaryConditions(pos: Position, vel?: Velocity): BoundaryResult {
    // Implementation depends on boundary type from this.boundaries
    switch(this.boundaries.type) {
      case 'periodic':
        return applyPeriodicBoundary(pos, this.boundaries);
      case 'reflective':
        return vel ? applyReflectiveBoundary(pos, vel, this.boundaries) : 
                    { position: pos };
      case 'absorbing':
        return applyAbsorbingBoundary(pos, this.boundaries);
      default:
        return { position: pos };
    }
  }

  getRandomPosition(): Position {
    return {
      x: this.boundaries.xMin + Math.random() * (this.boundaries.xMax - this.boundaries.xMin),
      y: this.dimension === '1D' ? 0 : 
         this.boundaries.yMin + Math.random() * (this.boundaries.yMax - this.boundaries.yMin)
    };
  }
}
