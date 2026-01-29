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
