/**
 * Boundary Growth Operations (T30)
 *
 * Implements outward growth of simplicial complexes by gluing new simplices
 * onto boundary faces, following arXiv:1108.1974v2 (Dittrich & Hoehn).
 */

import {
  SimplicialComplexTopology,
  addVertex,
  addEdge,
  addFace,
  addTetrahedron,
  faceKey,
  edgeKey,
} from '../core/types';
import { SimplicialComplexGeometry, VertexPosition } from '../geometry/types';

// --- Boundary Detection ---

/**
 * Find all boundary edges in a 2D complex.
 * A boundary edge belongs to exactly 1 face.
 */
export function getBoundaryEdges2D(topo: SimplicialComplexTopology): number[] {
  const edgeFaceCount = new Map<number, number>();

  for (const face of topo.faces.values()) {
    const [v0, v1, v2] = face.vertices;
    const pairs: [number, number][] = [[v0, v1], [v1, v2], [v2, v0]];
    for (const [a, b] of pairs) {
      const key = edgeKey(a, b);
      const eId = topo.edgeIndex.get(key);
      if (eId !== undefined) {
        edgeFaceCount.set(eId, (edgeFaceCount.get(eId) || 0) + 1);
      }
    }
  }

  const boundary: number[] = [];
  for (const [eId, count] of edgeFaceCount) {
    if (count === 1) {
      boundary.push(eId);
    }
  }
  console.debug(`[BoundaryGrowth] 2D boundary edges: ${boundary.length}`);
  return boundary;
}

/**
 * Find all boundary faces in a 3D complex.
 * A boundary face belongs to exactly 1 tetrahedron.
 */
export function getBoundaryFaces3D(topo: SimplicialComplexTopology): number[] {
  const boundary: number[] = [];
  for (const [fId, face] of topo.faces) {
    const key = faceKey(face.vertices[0], face.vertices[1], face.vertices[2]);
    const tets = topo.faceToTets.get(key);
    if (tets && tets.length === 1) {
      boundary.push(fId);
    }
  }
  console.debug(`[BoundaryGrowth] 3D boundary faces: ${boundary.length}`);
  return boundary;
}

/**
 * Find boundary edges incident to a given vertex in 2D.
 */
export function getBoundaryEdgesAtVertex2D(
  topo: SimplicialComplexTopology,
  vertexId: number,
  boundaryEdgeIds: number[],
): number[] {
  const boundarySet = new Set(boundaryEdgeIds);
  const result: number[] = [];
  for (const [eId, edge] of topo.edges) {
    if (boundarySet.has(eId) && edge.vertices.includes(vertexId)) {
      result.push(eId);
    }
  }
  return result;
}

/**
 * Find boundary faces incident to a given vertex in 3D.
 */
export function getBoundaryFacesAtVertex3D(
  topo: SimplicialComplexTopology,
  vertexId: number,
  boundaryFaceIds: number[],
): number[] {
  const boundarySet = new Set(boundaryFaceIds);
  const result: number[] = [];
  for (const [fId, face] of topo.faces) {
    if (boundarySet.has(fId) && face.vertices.includes(vertexId)) {
      result.push(fId);
    }
  }
  return result;
}

// --- Outward Normal Computation ---

/**
 * Compute outward normal for a 2D boundary edge.
 * Returns a unit vector pointing away from the interior face.
 */
export function computeOutwardNormal2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  edgeId: number,
): VertexPosition | null {
  const edge = topo.edges.get(edgeId);
  if (!edge) return null;
  const [v0, v1] = edge.vertices;
  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  if (!p0 || !p1) return null;

  // Find the face containing this edge
  let interiorVertex: number | null = null;
  for (const face of topo.faces.values()) {
    const fv = face.vertices;
    if (fv.includes(v0) && fv.includes(v1)) {
      interiorVertex = fv.find(v => v !== v0 && v !== v1) ?? null;
      break;
    }
  }
  if (interiorVertex === null) return null;

  const pInterior = geometry.positions.get(interiorVertex);
  if (!pInterior) return null;

  // Edge perpendicular
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  // Two candidates: (dy, -dx) and (-dy, dx)
  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;

  let nx = dy;
  let ny = -dx;

  // Orient away from interior vertex
  const toInterior_x = pInterior.x - midX;
  const toInterior_y = pInterior.y - midY;
  if (nx * toInterior_x + ny * toInterior_y > 0) {
    nx = -nx;
    ny = -ny;
  }

  // Normalize
  const len = Math.sqrt(nx * nx + ny * ny);
  if (len < 1e-10) return null;
  return { x: nx / len, y: ny / len };
}

/**
 * Compute outward normal for a 3D boundary face.
 * Returns a unit vector pointing away from the interior tetrahedron.
 */
export function computeOutwardNormal3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  faceId: number,
): VertexPosition | null {
  const face = topo.faces.get(faceId);
  if (!face) return null;
  const [v0, v1, v2] = face.vertices;
  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  const p2 = geometry.positions.get(v2);
  if (!p0 || !p1 || !p2) return null;

  // Find the single tet containing this face
  const key = faceKey(v0, v1, v2);
  const tets = topo.faceToTets.get(key);
  if (!tets || tets.length !== 1) return null;

  const tet = topo.tetrahedra.get(tets[0]);
  if (!tet) return null;

  // The 4th vertex (interior side)
  const interiorV = tet.vertices.find(v => v !== v0 && v !== v1 && v !== v2);
  if (interiorV === undefined) return null;
  const pInterior = geometry.positions.get(interiorV);
  if (!pInterior) return null;

  // Cross product of two edge vectors on the face
  const e1 = { x: p1.x - p0.x, y: p1.y - p0.y, z: (p1.z ?? 0) - (p0.z ?? 0) };
  const e2 = { x: p2.x - p0.x, y: p2.y - p0.y, z: (p2.z ?? 0) - (p0.z ?? 0) };

  let nx = e1.y * e2.z - e1.z * e2.y;
  let ny = e1.z * e2.x - e1.x * e2.z;
  let nz = e1.x * e2.y - e1.y * e2.x;

  // Orient away from interior vertex
  const centX = (p0.x + p1.x + p2.x) / 3;
  const centY = (p0.y + p1.y + p2.y) / 3;
  const centZ = ((p0.z ?? 0) + (p1.z ?? 0) + (p2.z ?? 0)) / 3;

  const toInterior_x = pInterior.x - centX;
  const toInterior_y = pInterior.y - centY;
  const toInterior_z = (pInterior.z ?? 0) - centZ;

  if (nx * toInterior_x + ny * toInterior_y + nz * toInterior_z > 0) {
    nx = -nx;
    ny = -ny;
    nz = -nz;
  }

  const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (len < 1e-10) return null;
  return { x: nx / len, y: ny / len, z: nz / len };
}

// --- Gluing Operations ---

export interface GlueResult {
  success: boolean;
  error?: string;
  newVertexId?: number;
}

/**
 * Glue a new triangle onto a 2D boundary edge.
 * Creates a new vertex displaced outward from the boundary edge.
 */
export function glueTriangle2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  edgeId: number,
  scale: number,
): GlueResult {
  const edge = topo.edges.get(edgeId);
  if (!edge) return { success: false, error: 'Edge not found' };
  const [v0, v1] = edge.vertices;

  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  if (!p0 || !p1) return { success: false, error: 'Edge vertex positions missing' };

  const normal = computeOutwardNormal2D(topo, geometry, edgeId);
  if (!normal) return { success: false, error: 'Could not compute outward normal' };

  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;

  // Place new vertex at midpoint + normal * scale
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: midX + normal.x * scale,
    y: midY + normal.y * scale,
  });

  // Add edges
  addEdge(topo, v0, newVId);
  addEdge(topo, v1, newVId);

  // Add face
  addFace(topo, v0, v1, newVId);

  console.debug(`[BoundaryGrowth] Glued triangle: edge(${v0},${v1}) -> newV=${newVId}`);
  return { success: true, newVertexId: newVId };
}

/**
 * Glue a new tetrahedron onto a 3D boundary face.
 * Creates a new vertex displaced outward from the boundary face.
 */
export function glueTetrahedron3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  faceId: number,
  scale: number,
): GlueResult {
  const face = topo.faces.get(faceId);
  if (!face) return { success: false, error: 'Face not found' };
  const [v0, v1, v2] = face.vertices;

  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  const p2 = geometry.positions.get(v2);
  if (!p0 || !p1 || !p2) return { success: false, error: 'Face vertex positions missing' };

  const normal = computeOutwardNormal3D(topo, geometry, faceId);
  if (!normal) return { success: false, error: 'Could not compute outward normal' };

  const centX = (p0.x + p1.x + p2.x) / 3;
  const centY = (p0.y + p1.y + p2.y) / 3;
  const centZ = ((p0.z ?? 0) + (p1.z ?? 0) + (p2.z ?? 0)) / 3;

  // Place new vertex at centroid + normal * scale
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: centX + (normal.x) * scale,
    y: centY + (normal.y) * scale,
    z: centZ + (normal.z ?? 0) * scale,
  });

  // Add edges from face vertices to new vertex
  addEdge(topo, v0, newVId);
  addEdge(topo, v1, newVId);
  addEdge(topo, v2, newVId);

  // Add 3 new faces
  addFace(topo, v0, v1, newVId);
  addFace(topo, v0, v2, newVId);
  addFace(topo, v1, v2, newVId);

  // Add tetrahedron
  addTetrahedron(topo, v0, v1, v2, newVId);

  console.debug(`[BoundaryGrowth] Glued tetrahedron: face(${v0},${v1},${v2}) -> newV=${newVId}`);
  return { success: true, newVertexId: newVId };
}

// --- Tent Move ---

/**
 * Perform a tent move on a 2D boundary vertex.
 * Creates a "future copy" v' displaced outward and glues triangles
 * for each boundary edge incident to the vertex.
 */
export function tentMove2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  vertexId: number,
  scale: number,
): GlueResult {
  const boundaryEdges = getBoundaryEdges2D(topo);
  const incidentBoundary = getBoundaryEdgesAtVertex2D(topo, vertexId, boundaryEdges);

  if (incidentBoundary.length < 2) {
    return { success: false, error: 'Vertex not on boundary or insufficient boundary edges' };
  }

  const pOld = geometry.positions.get(vertexId);
  if (!pOld) return { success: false, error: 'Vertex position missing' };

  // Compute average outward normal at this vertex
  let avgNx = 0;
  let avgNy = 0;
  let count = 0;
  for (const eId of incidentBoundary) {
    const n = computeOutwardNormal2D(topo, geometry, eId);
    if (n) {
      avgNx += n.x;
      avgNy += n.y;
      count++;
    }
  }
  if (count === 0) return { success: false, error: 'Could not compute normals' };
  avgNx /= count;
  avgNy /= count;
  const len = Math.sqrt(avgNx * avgNx + avgNy * avgNy);
  if (len < 1e-10) return { success: false, error: 'Degenerate normal' };
  avgNx /= len;
  avgNy /= len;

  // Create future copy vertex
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: pOld.x + avgNx * scale,
    y: pOld.y + avgNy * scale,
  });

  // For each boundary edge at this vertex, create a new triangle
  for (const eId of incidentBoundary) {
    const edge = topo.edges.get(eId);
    if (!edge) continue;
    const otherV = edge.vertices[0] === vertexId ? edge.vertices[1] : edge.vertices[0];

    addEdge(topo, otherV, newVId);
    addFace(topo, vertexId, otherV, newVId);
  }
  // Also add edge from old vertex to new vertex
  addEdge(topo, vertexId, newVId);

  console.debug(`[BoundaryGrowth] Tent move 2D: v=${vertexId} -> v'=${newVId}, ${incidentBoundary.length} triangles`);
  return { success: true, newVertexId: newVId };
}

/**
 * Perform a tent move on a 3D boundary vertex.
 * Creates a "future copy" v' displaced outward and glues tetrahedra
 * for each boundary face incident to the vertex.
 */
export function tentMove3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  vertexId: number,
  scale: number,
): GlueResult {
  const boundaryFaces = getBoundaryFaces3D(topo);
  const incidentBoundary = getBoundaryFacesAtVertex3D(topo, vertexId, boundaryFaces);

  if (incidentBoundary.length < 2) {
    return { success: false, error: 'Vertex not on boundary or insufficient boundary faces' };
  }

  const pOld = geometry.positions.get(vertexId);
  if (!pOld) return { success: false, error: 'Vertex position missing' };

  // Compute average outward normal at this vertex
  let avgNx = 0;
  let avgNy = 0;
  let avgNz = 0;
  let count = 0;
  for (const fId of incidentBoundary) {
    const n = computeOutwardNormal3D(topo, geometry, fId);
    if (n) {
      avgNx += n.x;
      avgNy += n.y;
      avgNz += (n.z ?? 0);
      count++;
    }
  }
  if (count === 0) return { success: false, error: 'Could not compute normals' };
  avgNx /= count;
  avgNy /= count;
  avgNz /= count;
  const len = Math.sqrt(avgNx * avgNx + avgNy * avgNy + avgNz * avgNz);
  if (len < 1e-10) return { success: false, error: 'Degenerate normal' };
  avgNx /= len;
  avgNy /= len;
  avgNz /= len;

  // Create future copy vertex
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: pOld.x + avgNx * scale,
    y: pOld.y + avgNy * scale,
    z: (pOld.z ?? 0) + avgNz * scale,
  });

  // Edge from old to new vertex
  addEdge(topo, vertexId, newVId);

  // For each boundary face at this vertex, create a new tetrahedron
  for (const fId of incidentBoundary) {
    const face = topo.faces.get(fId);
    if (!face) continue;
    const otherVerts = face.vertices.filter(v => v !== vertexId);
    if (otherVerts.length !== 2) continue;
    const [a, b] = otherVerts;

    // Add edges from face vertices to new vertex
    addEdge(topo, a, newVId);
    addEdge(topo, b, newVId);

    // Add new faces
    addFace(topo, vertexId, a, newVId);
    addFace(topo, vertexId, b, newVId);
    addFace(topo, a, b, newVId);

    // Add tetrahedron
    addTetrahedron(topo, vertexId, a, b, newVId);
  }

  console.debug(`[BoundaryGrowth] Tent move 3D: v=${vertexId} -> v'=${newVId}, ${incidentBoundary.length} tets`);
  return { success: true, newVertexId: newVId };
}
