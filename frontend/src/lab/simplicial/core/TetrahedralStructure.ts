/**
 * Tetrahedral Structure queries (T28c)
 *
 * Query operations for 3D tetrahedral complexes using faceToTets adjacency.
 */

import { SimplicialComplexTopology, faceKey } from './types';

/**
 * Return the 4 face vertex triples of a tetrahedron.
 */
export function getTetrahedronFaces(
  topo: SimplicialComplexTopology,
  tetId: number,
): [number, number, number][] {
  const tet = topo.tetrahedra.get(tetId);
  if (!tet) return [];
  const [v0, v1, v2, v3] = tet.vertices;
  return [
    [v0, v1, v2],
    [v0, v1, v3],
    [v0, v2, v3],
    [v1, v2, v3],
  ];
}

/**
 * For each of the 4 faces of a tet, return the other tet sharing that face (or null if boundary).
 */
export function getTetrahedronNeighbors(
  topo: SimplicialComplexTopology,
  tetId: number,
): (number | null)[] {
  const faces = getTetrahedronFaces(topo, tetId);
  return faces.map(([a, b, c]) => {
    const key = faceKey(a, b, c);
    const tets = topo.faceToTets.get(key) ?? [];
    const other = tets.find((id) => id !== tetId);
    return other !== undefined ? other : null;
  });
}

/**
 * Return tet ids sharing a given face.
 */
export function getFaceTetrahedra(
  topo: SimplicialComplexTopology,
  v0: number,
  v1: number,
  v2: number,
): number[] {
  const key = faceKey(v0, v1, v2);
  return topo.faceToTets.get(key) ?? [];
}

/**
 * All tets incident to a vertex.
 */
export function getVertexTetrahedra(
  topo: SimplicialComplexTopology,
  vertexId: number,
): number[] {
  const result: number[] = [];
  for (const [id, tet] of topo.tetrahedra) {
    if (tet.vertices.includes(vertexId)) {
      result.push(id);
    }
  }
  return result;
}

/**
 * All tets containing both vertices of an edge.
 */
export function getEdgeTetrahedra(
  topo: SimplicialComplexTopology,
  v0: number,
  v1: number,
): number[] {
  const result: number[] = [];
  for (const [id, tet] of topo.tetrahedra) {
    if (tet.vertices.includes(v0) && tet.vertices.includes(v1)) {
      result.push(id);
    }
  }
  return result;
}
