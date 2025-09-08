// Boundary utilities shared by all strategies.
// NOTE: 1D strategies accept full BoundaryConfig but only use xMin/xMax. yMin/yMax
// are ignored by 1D logic. 2D strategies use both x and y bounds.
import type { BoundaryConfig, Position, Velocity, BoundaryResult } from '../types/BoundaryConfig';

export function applyPeriodicBoundary(position: Position, boundaries: BoundaryConfig): BoundaryResult {
  const { xMin, xMax, yMin, yMax } = boundaries;
  const width = xMax - xMin;
  const height = yMax - yMin;
  
  let x = position.x;
  let y = position.y;
  
  // Wrap x coordinate
  if (x < xMin) x = xMax - (xMin - x) % width;
  if (x > xMax) x = xMin + (x - xMax) % width;
  
  // Wrap y coordinate
  if (y < yMin) y = yMax - (yMin - y) % height;
  if (y > yMax) y = yMin + (y - yMax) % height;
  
  return { position: { x, y } };
}

export function applyReflectiveBoundary(
  position: Position, 
  velocity: Velocity, 
  boundaries: BoundaryConfig
): BoundaryResult {
  const { xMin, xMax, yMin, yMax } = boundaries;
  let { x, y } = position;
  let { vx, vy } = velocity;
  
  // Reflect off x boundaries
  if (x < xMin) {
    x = 2 * xMin - x;
    vx = -vx;
  }
  if (x > xMax) {
    x = 2 * xMax - x;
    vx = -vx;
  }
  
  // Reflect off y boundaries
  if (y < yMin) {
    y = 2 * yMin - y;
    vy = -vy;
  }
  if (y > yMax) {
    y = 2 * yMax - y;
    vy = -vy;
  }
  
  return { 
    position: { x, y }, 
    velocity: { vx, vy } 
  };
}

export function applyAbsorbingBoundary(position: Position, boundaries: BoundaryConfig): BoundaryResult {
  const { xMin, xMax, yMin, yMax } = boundaries;
  const { x, y } = position;
  
  // Check if particle is outside boundaries
  const absorbed = x < xMin || x > xMax || y < yMin || y > yMax;
  
  return { 
    position: { x, y }, 
    absorbed 
  };
}
