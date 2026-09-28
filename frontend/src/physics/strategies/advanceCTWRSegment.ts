import type { BoundaryManager } from '../core/BoundaryManager';
import type { Dimension } from '../core/CoordinateSystem';
import type { Particle, Vector, Velocity } from '../types/Particle';

export interface CTWRSegmentResult {
  position: Vector;
  velocity: Velocity;
  absorbed: boolean;
}

export function advanceCTWRSegment(
  start: Vector,
  velocity: Velocity,
  duration: number,
  boundaryManager: BoundaryManager,
  dimension: Dimension,
): CTWRSegmentResult {
  const end = {
    x: start.x + velocity.vx * duration,
    y: dimension === '1D' ? start.y : start.y + velocity.vy * duration,
  };
  const result = boundaryManager.apply({ position: end, velocity } as Particle);
  const nextPosition = result.absorbed
    ? findAbsorptionPoint(start, end, boundaryManager.getConfig(), dimension)
    : result.position;

  return {
    position: nextPosition,
    velocity: result.velocity ?? velocity,
    absorbed: result.absorbed ?? false,
  };
}

function findAbsorptionPoint(
  start: Vector,
  end: Vector,
  boundaries: ReturnType<BoundaryManager['getConfig']>,
  dimension: Dimension,
): Vector {
  const crossings: number[] = [];
  const axes: Array<{ from: number; to: number; min: number; max: number }> = [
    { from: start.x, to: end.x, min: boundaries.xMin, max: boundaries.xMax },
  ];
  if (dimension === '2D') {
    axes.push({ from: start.y, to: end.y, min: boundaries.yMin, max: boundaries.yMax });
  }

  for (const axis of axes) {
    const delta = axis.to - axis.from;
    if (axis.to < axis.min && delta < 0) crossings.push((axis.min - axis.from) / delta);
    if (axis.to > axis.max && delta > 0) crossings.push((axis.max - axis.from) / delta);
  }

  const fraction = Math.max(0, Math.min(1, crossings.length ? Math.min(...crossings) : 1));
  return {
    x: start.x + (end.x - start.x) * fraction,
    y: start.y + (end.y - start.y) * fraction,
  };
}
