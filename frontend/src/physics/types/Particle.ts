import { CircularBuffer } from '../utils/CircularBuffer';

export interface Vector {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface TrajectoryPoint {
  position: Vector;
  timestamp: number;
}

export interface InitialState {
  position: Vector;
  velocity: Velocity;
  timestamp: number;
}

export interface Particle {
  id: string;
  position: Vector;
  velocity: Velocity;
  radius?: number;
  lastCollisionTime: number;
  nextCollisionTime: number;
  // CTRW scattering count
  collisionCount: number;
  // Actual inter-particle collisions (elastic swaps etc.)
  interparticleCollisionCount?: number;
  // Timestamp of last interparticle collision for visual effects
  lastInterparticleCollisionTime?: number;
  waitingTime: number;
  trajectory: CircularBuffer<TrajectoryPoint>;
  isActive: boolean;
  lastUpdate: number;
  initial?: InitialState; // Optional for backward compatibility
}