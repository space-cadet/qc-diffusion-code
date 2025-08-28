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
  radius?: number;
  lastCollisionTime: number;
  nextCollisionTime: number;
  // CTRW scattering count
  collisionCount: number;
  // Actual inter-particle collisions (elastic swaps etc.)
  interparticleCollisionCount?: number;
  waitingTime: number;
  trajectory: CircularBuffer<TrajectoryPoint>;
  isActive: boolean;
}