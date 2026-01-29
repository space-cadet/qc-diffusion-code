/**
 * 2D Pachner moves (T28b)
 *
 * Pure functions: 1-3 (face subdivision), 2-2 (edge flip), 3-1 (vertex removal).
 */

import {
  SimplicialComplexTopology,
  addVertex,
  addEdge,
  addFace,
  edgeKey,
  faceKey,
  validatePachnerMovePreconditions,
} from '../core/types';
import { SimplicialComplexGeometry } from '../geometry/types';
import { validateConvexQuadrilateral } from '../geometry/quality';
import { buildHalfEdgeStructure } from '../core/HalfEdgeStructure';

export interface PachnerMoveResult {
  success: boolean;
  error?: string;
  newVertexId?: number;
  removedVertexId?: number;
}

/**
 * 1-3 move: subdivide a face into 3 by inserting a vertex at the centroid.
 */
export function apply1to3(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  faceId: number,
): PachnerMoveResult {
  const validation = validatePachnerMovePreconditions(topo, '1-3', faceId);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const face = topo.faces.get(faceId)!;
  const [v0, v1, v2] = face.vertices;

  // Create new vertex
  const newV = addVertex(topo);

  // Set position to centroid if geometry present
  if (geo) {
    const p0 = geo.positions.get(v0);
    const p1 = geo.positions.get(v1);
    const p2 = geo.positions.get(v2);
    if (p0 && p1 && p2) {
      geo.positions.set(newV, {
        x: (p0.x + p1.x + p2.x) / 3,
        y: (p0.y + p1.y + p2.y) / 3,
      });
    }
  }

  // Remove old face
  topo.faces.delete(faceId);
  topo.faceIndex.delete(faceKey(v0, v1, v2));

  // Add 3 new edges from original vertices to new vertex
  addEdge(topo, v0, newV);
  addEdge(topo, v1, newV);
  addEdge(topo, v2, newV);

  // Add 3 new faces
  addFace(topo, v0, v1, newV);
  addFace(topo, v1, v2, newV);
  addFace(topo, v2, v0, newV);

  // Rebuild half-edges
  buildHalfEdgeStructure(topo);

  return { success: true, newVertexId: newV };
}

/**
 * 2-2 move: flip an interior edge shared by 2 faces.
 */
export function apply2to2(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  edgeId: number,
): PachnerMoveResult {
  const validation = validatePachnerMovePreconditions(topo, '2-2', edgeId);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  const edge = topo.edges.get(edgeId)!;
  const [vA, vB] = edge.vertices;

  // Find the 2 faces sharing this edge
  const sharedFaces: number[] = [];
  for (const [fId, f] of topo.faces) {
    if (f.vertices.includes(vA) && f.vertices.includes(vB)) {
      sharedFaces.push(fId);
    }
  }

  // Find opposite vertices
  const face1 = topo.faces.get(sharedFaces[0])!;
  const face2 = topo.faces.get(sharedFaces[1])!;
  const vC = face1.vertices.find(v => v !== vA && v !== vB)!;
  const vD = face2.vertices.find(v => v !== vA && v !== vB)!;

  // Check convex quadrilateral if geometry present
  if (geo) {
    // Quad boundary order: vA, vC, vB, vD
    if (!validateConvexQuadrilateral(geo, vA, vC, vB, vD)) {
      return { success: false, error: 'Quadrilateral is not convex; flip would produce degenerate triangles' };
    }
  }

  // Remove 2 old faces
  topo.faces.delete(sharedFaces[0]);
  topo.faceIndex.delete(faceKey(face1.vertices[0], face1.vertices[1], face1.vertices[2]));
  topo.faces.delete(sharedFaces[1]);
  topo.faceIndex.delete(faceKey(face2.vertices[0], face2.vertices[1], face2.vertices[2]));

  // Remove old edge
  topo.edges.delete(edgeId);
  topo.edgeIndex.delete(edgeKey(vA, vB));

  // Create new edge (vC, vD)
  addEdge(topo, vC, vD);

  // Create 2 new faces with correct orientation
  // Triangle (vA, vC, vD) and (vB, vD, vC)
  addFace(topo, vA, vC, vD);
  addFace(topo, vB, vD, vC);

  // Rebuild half-edges
  buildHalfEdgeStructure(topo);

  return { success: true };
}

/**
 * 3-1 move: remove a vertex with exactly 3 incident faces, replacing with 1 face.
 */
export function apply3to1(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  vertexId: number,
): PachnerMoveResult {
  const validation = validatePachnerMovePreconditions(topo, '3-1', vertexId);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') };
  }

  // Find the 3 incident faces
  const incidentFaces: number[] = [];
  for (const [fId, f] of topo.faces) {
    if (f.vertices.includes(vertexId)) {
      incidentFaces.push(fId);
    }
  }

  // Collect outer vertices (not the target vertex)
  const outerVertexSet = new Set<number>();
  for (const fId of incidentFaces) {
    const f = topo.faces.get(fId)!;
    for (const v of f.vertices) {
      if (v !== vertexId) outerVertexSet.add(v);
    }
  }
  const outerVertices = Array.from(outerVertexSet);

  // Remove the 3 faces
  for (const fId of incidentFaces) {
    const f = topo.faces.get(fId)!;
    topo.faceIndex.delete(faceKey(f.vertices[0], f.vertices[1], f.vertices[2]));
    topo.faces.delete(fId);
  }

  // Remove edges connecting target vertex to outer vertices
  for (const ov of outerVertices) {
    const key = edgeKey(vertexId, ov);
    const eId = topo.edgeIndex.get(key);
    if (eId !== undefined) {
      topo.edges.delete(eId);
      topo.edgeIndex.delete(key);
    }
  }

  // Remove the vertex
  topo.vertices.delete(vertexId);

  // Remove vertex position from geometry
  if (geo) {
    geo.positions.delete(vertexId);
  }

  // Ensure edges exist between outer vertices (they should already from original triangulation)
  addEdge(topo, outerVertices[0], outerVertices[1]);
  addEdge(topo, outerVertices[1], outerVertices[2]);
  addEdge(topo, outerVertices[2], outerVertices[0]);

  // Add 1 new face
  addFace(topo, outerVertices[0], outerVertices[1], outerVertices[2]);

  // Rebuild half-edges
  buildHalfEdgeStructure(topo);

  return { success: true, removedVertexId: vertexId };
}
