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
 *
 * Also builds vertex-to-halfedge index for O(1) adjacency queries.
 */
export function buildHalfEdgeStructure(topo: SimplicialComplexTopology): void {
  topo.halfEdges.clear();
  topo.nextHalfEdgeId = 0;

  // Map from edgeKey+direction -> half-edge id for twin pairing
  // Key: "origin,dest" (NOT sorted) to distinguish direction
  const directedEdgeMap = new Map<string, number>();

  // Map from vertex id -> half-edge ids for O(1) adjacency queries
  const vertexToHalfEdges = new Map<number, number[]>();

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

      // Build vertex-to-halfedge index
      if (!vertexToHalfEdges.has(origin)) {
        vertexToHalfEdges.set(origin, []);
      }
      vertexToHalfEdges.get(origin)!.push(he.id);
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
 * Uses vertex-to-halfedge index for O(1) lookup.
 */
export function getVertexHalfEdges(
  topo: SimplicialComplexTopology,
  vertexId: number,
): HalfEdge[] {
  // Build vertex-to-halfedge index on-demand if not present
  if (!topo.vertexToHalfEdges) {
    topo.vertexToHalfEdges = new Map<number, number[]>();
    for (const [, he] of topo.halfEdges) {
      if (!topo.vertexToHalfEdges.has(he.origin)) {
        topo.vertexToHalfEdges.set(he.origin, []);
      }
      topo.vertexToHalfEdges.get(he.origin)!.push(he.id);
    }
  }

  const heIds = topo.vertexToHalfEdges.get(vertexId);
  if (!heIds) return [];

  const result: HalfEdge[] = [];
  for (const id of heIds) {
    const he = topo.halfEdges.get(id);
    if (he) result.push(he);
  }
  return result;
}

/**
 * Get the 3 half-edges of a face.
 * Uses face-to-halfedge index for O(1) lookup.
 */
export function getFaceHalfEdges(
  topo: SimplicialComplexTopology,
  faceId: number,
): HalfEdge[] {
  // Build face-to-halfedge index on-demand if not present
  if (!topo.faceToHalfEdges) {
    topo.faceToHalfEdges = new Map<number, number[]>();
    for (const [, he] of topo.halfEdges) {
      if (he.face !== null) {
        if (!topo.faceToHalfEdges.has(he.face)) {
          topo.faceToHalfEdges.set(he.face, []);
        }
        topo.faceToHalfEdges.get(he.face)!.push(he.id);
      }
    }
  }

  const heIds = topo.faceToHalfEdges.get(faceId);
  if (!heIds) return [];

  const result: HalfEdge[] = [];
  for (const id of heIds) {
    const he = topo.halfEdges.get(id);
    if (he) result.push(he);
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
