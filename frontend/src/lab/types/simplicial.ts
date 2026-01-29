import {
  SimplicialComplexTopology,
  SimplicialComplexGeometry,
  PachnerMove,
} from '../simplicial';

export type MoveType = PachnerMove;

export type Dimension = 2 | 3;

export interface SimplicialComplex {
  topology: SimplicialComplexTopology;
  geometry: SimplicialComplexGeometry;
}

export interface SimplicialGrowthState {
  step: number;
  complex: SimplicialComplex;
  lastMove: MoveType | null;
  moveCount: {
    '1-4': number;
    '2-3': number;
    '3-2': number;
    '4-1': number;
    '1-3': number;
    '2-2': number;
    '3-1': number;
  };
  metrics: {
    totalSimplices: number;
    vertexCount: number;
    dimension: number;
    volume: number;
    curvature: number;
  };
}

// --- Boundary Growth Types (T30) ---

export type BoundaryMoveType = 'glue' | 'tent';

export interface BoundaryGrowthState {
  step: number;
  complex: SimplicialComplex;
  lastMove: BoundaryMoveType | null;
  moveCount: { glue: number; tent: number };
  boundarySize: number;
  metrics: {
    totalSimplices: number;
    vertexCount: number;
    dimension: number;
    volume: number;
    curvature: number;
  };
}

export interface BoundaryGrowthParams {
  dimension: Dimension;
  maxSteps: number;
  growthScale: number;
  tentProbability: number; // 0-1, rest is glue probability
}

// --- Original Interior Growth Types ---

export interface SimplicialGrowthParams {
  dimension: Dimension;
  initialVertices: number;
  maxSteps: number;
  moveProbabilities: {
    '1-4': number;
    '2-3': number;
    '3-2': number;
    '4-1': number;
    '1-3': number;
    '2-2': number;
    '3-1': number;
  };
  growthRate: number;
}
