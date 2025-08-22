export interface CollisionEvent {
  occurred: boolean;
  newDirection: number;
  waitTime: number;
  energyChange: number;
  timestamp: number;
  position?: { x: number; y: number };
  oldVelocity?: { vx: number; vy: number };
  newVelocity?: { vx: number; vy: number };
}

export interface Step {
  dx: number;
  dy?: number;
  collision: CollisionEvent;
  timestamp: number;
  particleId: string;
}