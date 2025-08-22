export type BoundaryType = 'periodic' | 'reflective' | 'absorbing';

export interface BoundaryConfig {
  type: BoundaryType;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface BoundaryResult {
  position: Position;
  velocity?: Velocity;
  absorbed?: boolean;
}
