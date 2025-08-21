export interface Particle {
  id: number;
  position: number;
  velocity: number;
  direction: number;
  lastCollisionTime: number;
  timeSinceCollision: number;
  trajectory: number[];
  collisionHistory: any[]; // Avoid circular import
}
