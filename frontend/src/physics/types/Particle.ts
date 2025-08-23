import { CircularBuffer } from '../utils/CircularBuffer';

export interface TrajectoryPoint {
  position: { x: number; y: number };
  timestamp: number;
}

export interface Particle {
  id: string;
  position: {
    x: number;
    y: number;
  };
  velocity: {
    vx: number;
    vy: number;
  };
  lastCollisionTime: number;
  nextCollisionTime: number;
  collisionCount: number;
  waitingTime: number;
  trajectory: CircularBuffer<TrajectoryPoint>;
  isActive: boolean;
}