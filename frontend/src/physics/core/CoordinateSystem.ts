import type { BoundaryConfig } from '../types/BoundaryConfig';

export type Dimension = '1D' | '2D';

export class CoordinateSystem {
  private boundaries: BoundaryConfig;
  private canvasSize: { width: number; height: number };
  private dimension: Dimension;

  constructor(
    boundaries: BoundaryConfig,
    canvasSize: { width: number; height: number },
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
}
