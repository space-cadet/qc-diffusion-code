/**
 * Core Simplicial Complex Types (T28a)
 *
 * Purely topological types for simplicial complexes.
 * Geometry (positions) is kept separate -- see ../geometry/types.ts
 */

// --- Simplex types (purely combinatorial) ---

export interface Vertex {
  id: number;
}

export interface Edge {
  id: number;
  vertices: [number, number]; // ordered pair for orientation
}

export interface Face {
  id: number;
  vertices: [number, number, number]; // ordered triple for orientation
}

export interface Tetrahedron {
  id: number;
  vertices: [number, number, number, number];
}

// --- Half-edge adjacency (used by 2D triangulations) ---

export interface HalfEdge {
  id: number;
  origin: number; // vertex id
  face: number | null; // incident face id (null = boundary)
  next: number; // next half-edge id in face cycle
  twin: number | null; // opposite half-edge id (null = boundary)
}

// --- 3D face-to-tetrahedron adjacency ---

/**
 * Maps a sorted vertex triple key "v0,v1,v2" to the ids of incident tetrahedra.
 * At most 2 tetrahedra share a face in a valid 3-manifold.
 */
export type FaceToTetMap = Map<string, number[]>;

/** Produce the canonical key for a face given three vertex ids. */
export function faceKey(a: number, b: number, c: number): string {
  return [a, b, c].sort((x, y) => x - y).join(',');
}

/** Produce the canonical key for an edge given two vertex ids. */
export function edgeKey(a: number, b: number): string {
  return a < b ? `${a},${b}` : `${b},${a}`;
}

// --- Top-level topology container ---

export interface SimplicialComplexTopology {
  vertices: Map<number, Vertex>;
  edges: Map<number, Edge>;
  faces: Map<number, Face>;
  tetrahedra: Map<number, Tetrahedron>;
  halfEdges: Map<number, HalfEdge>;
  faceToTets: FaceToTetMap;
  /** Maps edgeKey(v0,v1) -> edge id for O(1) duplicate detection. */
  edgeIndex: Map<string, number>;
  /** Maps faceKey(v0,v1,v2) -> face id for O(1) duplicate detection. */
  faceIndex: Map<string, number>;
  dimension: 2 | 3;
  nextVertexId: number;
  nextEdgeId: number;
  nextFaceId: number;
  nextTetId: number;
  nextHalfEdgeId: number;
}

// --- Move types ---

export type PachnerMove2D = '1-3' | '2-2' | '3-1';
export type PachnerMove3D = '1-4' | '2-3' | '3-2' | '4-1';
export type PachnerMove = PachnerMove2D | PachnerMove3D;

// --- Validation result ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// --- Factory helpers ---

/** Create an empty topology of the given dimension. */
export function createEmptyTopology(dimension: 2 | 3): SimplicialComplexTopology {
  return {
    vertices: new Map(),
    edges: new Map(),
    faces: new Map(),
    tetrahedra: new Map(),
    halfEdges: new Map(),
    faceToTets: new Map(),
    edgeIndex: new Map(),
    faceIndex: new Map(),
    dimension,
    nextVertexId: 0,
    nextEdgeId: 0,
    nextFaceId: 0,
    nextTetId: 0,
    nextHalfEdgeId: 0,
  };
}

/** Add a vertex to the topology, returning the assigned id. */
export function addVertex(topo: SimplicialComplexTopology): number {
  const id = topo.nextVertexId++;
  topo.vertices.set(id, { id });
  return id;
}

/** Add an edge between two existing vertices. Returns existing id if duplicate. */
export function addEdge(
  topo: SimplicialComplexTopology,
  v0: number,
  v1: number,
): number {
  const key = edgeKey(v0, v1);
  const existing = topo.edgeIndex.get(key);
  if (existing !== undefined) return existing;
  const id = topo.nextEdgeId++;
  topo.edges.set(id, { id, vertices: [v0, v1] });
  topo.edgeIndex.set(key, id);
  return id;
}

/** Add a triangular face with three existing vertices. Returns existing id if duplicate. */
export function addFace(
  topo: SimplicialComplexTopology,
  v0: number,
  v1: number,
  v2: number,
): number {
  const key = faceKey(v0, v1, v2);
  const existing = topo.faceIndex.get(key);
  if (existing !== undefined) return existing;
  const id = topo.nextFaceId++;
  topo.faces.set(id, { id, vertices: [v0, v1, v2] });
  topo.faceIndex.set(key, id);
  return id;
}

/** Add a tetrahedron with four existing vertices and register its faces in faceToTets. */
export function addTetrahedron(
  topo: SimplicialComplexTopology,
  v0: number,
  v1: number,
  v2: number,
  v3: number,
): number {
  const id = topo.nextTetId++;
  topo.tetrahedra.set(id, { id, vertices: [v0, v1, v2, v3] });

  // Register each of the 4 bounding faces
  const faceTriples: [number, number, number][] = [
    [v0, v1, v2],
    [v0, v1, v3],
    [v0, v2, v3],
    [v1, v2, v3],
  ];
  for (const [a, b, c] of faceTriples) {
    const key = faceKey(a, b, c);
    const existing = topo.faceToTets.get(key);
    if (existing) {
      existing.push(id);
    } else {
      topo.faceToTets.set(key, [id]);
    }
  }

  return id;
}

/**
 * Build a minimal 2D topology: a single triangle with vertices 0,1,2.
 */
export function createInitialTriangleTopology(): SimplicialComplexTopology {
  const topo = createEmptyTopology(2);
  const v0 = addVertex(topo);
  const v1 = addVertex(topo);
  const v2 = addVertex(topo);
  addEdge(topo, v0, v1);
  addEdge(topo, v1, v2);
  addEdge(topo, v2, v0);
  addFace(topo, v0, v1, v2);
  return topo;
}

/**
 * Build a minimal 3D topology: a single tetrahedron with vertices 0,1,2,3.
 */
export function createInitialTetrahedronTopology(): SimplicialComplexTopology {
  const topo = createEmptyTopology(3);
  const v0 = addVertex(topo);
  const v1 = addVertex(topo);
  const v2 = addVertex(topo);
  const v3 = addVertex(topo);

  // 6 edges of a tetrahedron
  addEdge(topo, v0, v1);
  addEdge(topo, v0, v2);
  addEdge(topo, v0, v3);
  addEdge(topo, v1, v2);
  addEdge(topo, v1, v3);
  addEdge(topo, v2, v3);

  // 4 faces
  addFace(topo, v0, v1, v2);
  addFace(topo, v0, v1, v3);
  addFace(topo, v0, v2, v3);
  addFace(topo, v1, v2, v3);

  // 1 tetrahedron
  addTetrahedron(topo, v0, v1, v2, v3);

  return topo;
}
