export interface Particle {
  id: string;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  velocity: {
    vx: number;
    vy: number;
    vz?: number;
  };
  lastCollisionTime: number;
  nextCollisionTime: number;
  collisionCount: number;
  trajectory: Array<{
    position: { x: number; y: number; z?: number };
    timestamp: number;
  }>;
  graphNodeId?: string; // For graph mode
  isActive: boolean;
}

export interface CollisionEvent {
  occurred: boolean;
  newDirection: number; // Angle in radians for 2D, direction vector for 3D
  waitTime: number; // Time until next collision
  energyChange: number; // Energy transfer (usually 0 for elastic)
  timestamp: number;
  position?: { x: number; y: number; z?: number };
  oldVelocity?: { vx: number; vy: number; vz?: number };
  newVelocity?: { vx: number; vy: number; vz?: number };
}

export interface Step {
  deltaX: number;
  deltaY?: number;
  deltaZ?: number;
  deltaVx?: number;
  deltaVy?: number;
  deltaVz?: number;
  collision: CollisionEvent;
  timestamp: number;
  particleId?: string;
}

export interface DensityField {
  x: number[]; // Spatial grid points
  y?: number[]; // For 2D/3D
  z?: number[]; // For 3D
  rho: number[]; // Density values
  u: number[]; // Velocity field
  moments: {
    mean: number;
    variance: number;
    skewness: number;
    kurtosis: number;
  };
  collisionRate: number[]; // Local collision rates
  timestamp?: number;
}

export interface ScalingParams {
  tau: number; // Mean waiting time ⟨τ⟩ = 1/λ
  a: number; // Jump length (lattice spacing)
  D: number; // Diffusion constant D = v²/(2λ)
  v: number; // Velocity v = a/⟨τ⟩
  gamma: number; // Collision rate λ (Poisson process rate)
  epsilon?: number; // Small parameter for scaling limit
  scalingRegime?: 'diffusive' | 'ballistic' | 'telegraph';
}

export interface SimulationState {
  particles: Particle[];
  currentTime: number;
  totalSteps: number;
  densityHistory: DensityField[];
  scalingParams: ScalingParams;
  isRunning: boolean;
  isPaused: boolean;
}

export interface GraphRandomWalkParams {
  graphType: 'lattice1D' | 'lattice2D' | 'path' | 'complete';
  graphSize: number | { width: number; height: number };
  periodicBoundaries: boolean;
  jumpProbabilities?: { [direction: string]: number };
}

export interface ContinuumRandomWalkParams {
  dimensions: 1 | 2 | 3;
  boundaryConditions: 'periodic' | 'reflective' | 'absorbing';
  spatialDomain: {
    xMin: number;
    xMax: number;
    yMin?: number;
    yMax?: number;
    zMin?: number;
    zMax?: number;
  };
}

export interface RandomWalkConfig {
  simulationType: 'continuum' | 'graph';
  collisionRate: number; // λ
  jumpLength: number; // a
  velocity?: number; // v (calculated if not provided)
  particleCount: number;
  maxSimulationTime: number;
  recordingInterval: number;
  graphParams?: GraphRandomWalkParams;
  continuumParams?: ContinuumRandomWalkParams;
}
