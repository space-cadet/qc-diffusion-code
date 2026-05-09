// Boundary configuration types used across all random-walk and PDE strategies.
//
// IMPORTANT: 1D strategies (e.g., CTRWStrategy1D) accept the full BoundaryConfig
// but only use xMin/xMax. The yMin/yMax fields are ignored by 1D strategies.
// 2D strategies use both x and y bounds. Callers should always provide the full
// config to keep a single source of truth across the system.
export type BoundaryType = 'periodic' | 'reflective' | 'absorbing';

export interface BoundaryConfig {
  /**
   * Boundary behavior to apply.
   * - periodic: wrap around domain
   * - reflective: reflect position and flip corresponding velocity component
   * - absorbing: mark as absorbed when outside domain (caller sets isActive=false)
   */
  type: BoundaryType;
  /** Minimum x-bound (used by 1D and 2D). */
  xMin: number;
  /** Maximum x-bound (used by 1D and 2D). */
  xMax: number;
  /** Minimum y-bound (ignored by 1D strategies, used by 2D). */
  yMin: number;
  /** Maximum y-bound (ignored by 1D strategies, used by 2D). */
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

export function validateBoundaryConfig(config: BoundaryConfig): void {
  if (config.xMin >= config.xMax) {
    throw new Error(`Invalid boundary: xMin (${config.xMin}) must be less than xMax (${config.xMax})`);
  }
  if (config.yMin >= config.yMax) {
    throw new Error(`Invalid boundary: yMin (${config.yMin}) must be less than yMax (${config.yMax})`);
  }
  if (!['periodic', 'reflective', 'absorbing'].includes(config.type)) {
    throw new Error(`Invalid boundary type: ${config.type}`);
  }
}
