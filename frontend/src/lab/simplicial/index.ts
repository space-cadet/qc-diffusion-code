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
  edgeKey,
  createEmptyTopology,
  addVertex,
  addEdge,
  addFace,
  addTetrahedron,
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
  createTriangleStripTopology,
  createTetStripTopology,
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
  createTriangleStripGeometry,
  createTetStripGeometry,
} from './geometry/types';

export {
  validateConvexQuadrilateral,
  triangleArea,
  validateTriangleArea,
  tetrahedronVolume,
  validateTetrahedronVolume,
} from './geometry/quality';

// Half-edge structure (T28b)
export {
  buildHalfEdgeStructure,
  getVertexHalfEdges,
  getFaceHalfEdges,
  getAdjacentFaces,
  getVertexFaces,
} from './core/HalfEdgeStructure';

// 2D Pachner moves (T28b)
export {
  type PachnerMoveResult,
  apply1to3,
  apply2to2,
  apply3to1,
} from './operations/PachnerMoves2D';

// Tetrahedral structure (T28c)
export {
  getTetrahedronFaces,
  getTetrahedronNeighbors,
  getFaceTetrahedra,
  getVertexTetrahedra,
  getEdgeTetrahedra,
} from './core/TetrahedralStructure';

// 3D Pachner moves (T28c)
export {
  type PachnerMoveResult3D,
  apply1to4,
  apply2to3,
  apply3to2,
  apply4to1,
} from './operations/PachnerMoves3D';

// Boundary growth operations (T30, T30b)
export {
  type GlueResult,
  getBoundaryEdges2D,
  getBoundaryFaces3D,
  getBoundaryEdgesAtVertex2D,
  getBoundaryFacesAtVertex3D,
  computeOutwardNormal2D,
  computeOutwardNormal3D,
  glueTriangle2D,
  glueTetrahedron3D,
  tentMove2D,
  tentMove3D,
  trianglesOverlap2D,
  tetrahedronOverlaps3D,
  getBottomAndSideBoundaries2D,
  getBottomAndSideBoundaries3D,
  isBoundaryFrozen,
} from './operations/BoundaryGrowth';

// Algebraic (optional)
export {
  type Chain,
  type HomologyResult,
  computeEulerCharacteristic,
  computeBoundaryOfFace,
  estimateBettiNumbers,
  verifyHomologyPreservation,
} from './algebraic/ChainComplex';
