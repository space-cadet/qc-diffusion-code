/**
 * Simplicial Complex Types
 * For simplicial growth algorithm implementation
 */

export type MoveType = '1-4' | '2-3' | '3-2' | '4-1';

export interface Simplex {
  id: number;
  vertices: number[];
  dimension: number;
}

export interface SimplicialComplex {
  simplices: Simplex[];
  vertexCount: number;
  dimension: number;
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
  initialVertices: number;
  maxSteps: number;
  moveProbabilities: {
    '1-4': number;
    '2-3': number;
    '3-2': number;
    '4-1': number;
  };
  growthRate: number;
}
