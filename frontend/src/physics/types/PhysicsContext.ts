import type { TimeManager } from '../core/TimeManager';
import type { CoordinateSystem } from '../core/CoordinateSystem';

export interface PhysicsContext {
  timeManager: TimeManager;
  coordinateSystem: CoordinateSystem;
  currentTime: number; // seconds
}
