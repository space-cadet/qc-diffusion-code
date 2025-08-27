export interface SimulationState {
  isRunning: boolean;
  time: number;
  collisions: number;
  status: 'Running' | 'Paused' | 'Stopped' | 'Initialized';
}

export interface RandomWalkParams {
  simulationType: 'continuum' | 'graph';
  dimension: '1D' | '2D';
  interparticleCollisions: boolean;
  collisionRate: number;
  jumpLength: number;
  velocity: number;
  particles: number;
  maxParticles: number;
  minParticles: number;
  graphType: 'lattice1D' | 'lattice2D' | 'path' | 'complete';
  graphSize: number;
  isPeriodic: boolean;
  showEdgeWeights: boolean;
  showAnimation: boolean;
  strategies: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
  boundaryCondition: 'periodic' | 'reflective' | 'absorbing';
  initialDistType: 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid';
  distSigmaX: number;
  distSigmaY: number;
  distR0: number;
  distDR: number;
  distThickness: number;
  distNx: number;
  distNy: number;
  distJitter: number;
  solverType: 'gpu_explicit' | 'gpu_explicit_substep' | 'cpu_crank_nicolson';
  solverParams: {
    substeps: number;
    cnTheta: number;
    tolerance: number;
    maxIter: number;
  };
}
