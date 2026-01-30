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
  frozenBoundaryElements: Set<number>; // Elements that don't evolve (T30b)
  metrics: {
    totalSimplices: number;
    vertexCount: number;
    dimension: number;
    volume: number;
    curvature: number;
  };
}

export type InitialStateType = 'single-simplex' | 'triangle-strip';

export type BoundaryConstraintMode = 'none' | 'bottom-and-sides' | 'custom';

export interface BoundaryGrowthParams {
  dimension: Dimension;
  maxSteps: number;
  growthScale: number;
  tentProbability: number; // 0-1, rest is glue probability
  preventOverlap: boolean;
  initialState: InitialStateType;
  stripLength: number; // number of triangles/tets in strip (3-20)
  boundaryConstraints?: {
    mode: BoundaryConstraintMode;
    customFrozenElementIds?: Set<number>; // Face/edge IDs to freeze
  };
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
