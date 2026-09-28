import type { TimeManager } from '../core/TimeManager';
import type { CoordinateSystem } from '../core/CoordinateSystem';

export interface StrategyEvent {
  particleId: string;
  time: number;
  kind: 'turn' | 'jump';
  position: { x: number; y: number };
  waitTime: number;
  waitPosition?: { x: number; y: number };
  jumpLength?: number;
  previousVelocity?: { vx: number; vy: number };
  velocity?: { vx: number; vy: number };
}

export interface PhysicsContext {
  timeManager: TimeManager;
  coordinateSystem: CoordinateSystem;
  currentTime: number; // seconds
  dt: number;
  random: () => number;
  onStrategyEvent?: (event: StrategyEvent) => void;
}
