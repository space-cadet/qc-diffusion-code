/**
 * Simplicial complex foundation (T28a)
 *
 * Re-exports core types, validators, geometry, and algebraic modules.
 */

// Core topological types and factories
export {
  type Vertex,
  type Edge,
  type Face,
  type Tetrahedron,
  type HalfEdge,
  type FaceToTetMap,
  type SimplicialComplexTopology,
  type PachnerMove2D,
  type PachnerMove3D,
  type PachnerMove,
  type ValidationResult,
  faceKey,
  createEmptyTopology,
  addVertex,
  addEdge,
  addFace,
  addTetrahedron,
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
} from './core/types';

// Validation
export {
  validateSimplicialComplex,
  validatePachnerMovePreconditions,
} from './core/validators';

// Geometry
export {
  type VertexPosition,
  type SimplicialComplexGeometry,
  createEmptyGeometry,
  createTriangleGeometry,
  createTetrahedronGeometry,
} from './geometry/types';

export {
  validateConvexQuadrilateral,
  triangleArea,
  validateTriangleArea,
  tetrahedronVolume,
  validateTetrahedronVolume,
} from './geometry/quality';

// Algebraic (optional)
export {
  type Chain,
  type HomologyResult,
  computeEulerCharacteristic,
  computeBoundaryOfFace,
  estimateBettiNumbers,
  verifyHomologyPreservation,
} from './algebraic/ChainComplex';
