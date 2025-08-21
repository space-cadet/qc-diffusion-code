export interface CollisionEvent {
  occurred: boolean;
  newDirection: number;
  waitTime: number;
  energyChange: number;
  timestamp: number;
}

export interface Step {
  deltaX: number;
  deltaV: number;
  collision: CollisionEvent;
  timestamp: number;
}
