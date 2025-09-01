export interface SimulationState {
  isRunning: boolean;
  time: number;
  collisions: number;
  interparticleCollisions?: number;
  status: 'Running' | 'Paused' | 'Stopped' | 'Initialized';
  particleData: {
    id: string;
    position: { x: number; y: number };
    velocity: { vx: number; vy: number };
    collisionCount: number;
    lastCollisionTime: number;
    waitingTime: number;
  }[] | null;
  densityHistory: any[] | null;
  observableData: Record<string, any> | null;
}
