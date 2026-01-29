/**
 * Half-edge structure for 2D triangulations (T28b)
 *
 * Builds and queries half-edge adjacency from face data.
 */

import { SimplicialComplexTopology, HalfEdge, edgeKey } from './types';

/**
 * Populate topo.halfEdges from existing faces.
 * For each triangular face, creates 3 half-edges forming a cycle.
 * Twin pairing connects half-edges sharing the same edge in opposite directions.
 */
export function buildHalfEdgeStructure(topo: SimplicialComplexTopology): void {
  topo.halfEdges.clear();
  topo.nextHalfEdgeId = 0;

  // Map from edgeKey+direction -> half-edge id for twin pairing
  // Key: "origin,dest" (NOT sorted) to distinguish direction
  const directedEdgeMap = new Map<string, number>();

  for (const [faceId, face] of topo.faces) {
    const [v0, v1, v2] = face.vertices;
    const verts = [v0, v1, v2];

    // Create 3 half-edges for this face
    const heIds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const id = topo.nextHalfEdgeId++;
      heIds.push(id);
    }

    for (let i = 0; i < 3; i++) {
      const origin = verts[i];
      const dest = verts[(i + 1) % 3];
      const he: HalfEdge = {
        id: heIds[i],
        origin,
        face: faceId,
        next: heIds[(i + 1) % 3],
        twin: null,
      };
      topo.halfEdges.set(he.id, he);
      directedEdgeMap.set(`${origin},${dest}`, he.id);
    }
  }

  // Twin pairing: for each half-edge origin->dest, find dest->origin
  for (const [, he] of topo.halfEdges) {
    if (he.twin !== null) continue;
    const face = topo.faces.get(he.face!);
    if (!face) continue;
    const verts = face.vertices;
    const idx = verts.indexOf(he.origin);
    const dest = verts[(idx + 1) % 3];
    const twinKey = `${dest},${he.origin}`;
    const twinId = directedEdgeMap.get(twinKey);
    if (twinId !== undefined) {
      he.twin = twinId;
      const twinHe = topo.halfEdges.get(twinId)!;
      twinHe.twin = he.id;
    }
  }
}

/**
 * Get all half-edges originating from a vertex.
 */
export function getVertexHalfEdges(
  topo: SimplicialComplexTopology,
  vertexId: number,
): HalfEdge[] {
  const result: HalfEdge[] = [];
  for (const [, he] of topo.halfEdges) {
    if (he.origin === vertexId) {
      result.push(he);
    }
  }
  return result;
}

/**
 * Get the 3 half-edges of a face.
 */
export function getFaceHalfEdges(
  topo: SimplicialComplexTopology,
  faceId: number,
): HalfEdge[] {
  const result: HalfEdge[] = [];
  for (const [, he] of topo.halfEdges) {
    if (he.face === faceId) {
      result.push(he);
    }
  }
  return result;
}

/**
 * Get faces sharing an edge with the given face (via twin half-edges).
 */
export function getAdjacentFaces(
  topo: SimplicialComplexTopology,
  faceId: number,
): number[] {
  const result: number[] = [];
  for (const [, he] of topo.halfEdges) {
    if (he.face === faceId && he.twin !== null) {
      const twin = topo.halfEdges.get(he.twin)!;
      if (twin.face !== null && !result.includes(twin.face)) {
        result.push(twin.face);
      }
    }
  }
  return result;
}

/**
 * Get all faces incident to a vertex.
 */
export function getVertexFaces(
  topo: SimplicialComplexTopology,
  vertexId: number,
): number[] {
  const result: number[] = [];
  for (const [, face] of topo.faces) {
    if (face.vertices.includes(vertexId)) {
      result.push(face.id);
    }
  }
  return result;
}
