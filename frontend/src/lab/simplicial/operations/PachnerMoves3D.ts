/**
 * 3D Pachner Moves (T28c)
 *
 * Pure functions for 1-4, 2-3, 3-2, and 4-1 Pachner moves on tetrahedral complexes.
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
import { SimplicialComplexGeometry } from '../geometry/types';
import {
  getTetrahedronFaces,
  getFaceTetrahedra,
  getVertexTetrahedra,
  getEdgeTetrahedra,
} from '../core/TetrahedralStructure';

export interface PachnerMoveResult3D {
  success: boolean;
  error?: string;
  newVertexId?: number;
  removedVertexId?: number;
}

/**
 * Remove a tetrahedron and clean up its faceToTets entries.
 */
function removeTetrahedron(
  topo: SimplicialComplexTopology,
  tetId: number,
): void {
  const faces = getTetrahedronFaces(topo, tetId);
  for (const [a, b, c] of faces) {
    const key = faceKey(a, b, c);
    const arr = topo.faceToTets.get(key);
    if (arr) {
      const filtered = arr.filter((id) => id !== tetId);
      if (filtered.length === 0) {
        topo.faceToTets.delete(key);
      } else {
        topo.faceToTets.set(key, filtered);
      }
    }
  }
  topo.tetrahedra.delete(tetId);
}

/**
 * Remove a face from topo.faces and topo.faceIndex by its vertex triple.
 */
function removeFaceByVertices(
  topo: SimplicialComplexTopology,
  a: number,
  b: number,
  c: number,
): void {
  const key = faceKey(a, b, c);
  const faceId = topo.faceIndex.get(key);
  if (faceId !== undefined) {
    topo.faces.delete(faceId);
    topo.faceIndex.delete(key);
  }
}

/**
 * Remove an edge from topo.edges and topo.edgeIndex.
 */
function removeEdgeByVertices(
  topo: SimplicialComplexTopology,
  a: number,
  b: number,
): void {
  const key = edgeKey(a, b);
  const eid = topo.edgeIndex.get(key);
  if (eid !== undefined) {
    topo.edges.delete(eid);
    topo.edgeIndex.delete(key);
  }
}

/**
 * 1-4 move: Split one tetrahedron into 4 by inserting a vertex at its centroid.
 */
export function apply1to4(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  tetId: number,
): PachnerMoveResult3D {
  const tet = topo.tetrahedra.get(tetId);
  if (!tet) {
    return { success: false, error: `Tetrahedron ${tetId} not found` };
  }

  const [v0, v1, v2, v3] = tet.vertices;

  // Create new vertex
  const newV = addVertex(topo);

  // Set geometry at centroid
  if (geo) {
    const positions = [v0, v1, v2, v3].map((v) => geo.positions.get(v));
    if (positions.every((p) => p !== undefined)) {
      const ps = positions as { x: number; y: number; z?: number }[];
      geo.positions.set(newV, {
        x: (ps[0].x + ps[1].x + ps[2].x + ps[3].x) / 4,
        y: (ps[0].y + ps[1].y + ps[2].y + ps[3].y) / 4,
        z: ((ps[0].z ?? 0) + (ps[1].z ?? 0) + (ps[2].z ?? 0) + (ps[3].z ?? 0)) / 4,
      });
    }
  }

  // Remove old tetrahedron
  removeTetrahedron(topo, tetId);

  // Add 4 new edges from original vertices to newV
  addEdge(topo, v0, newV);
  addEdge(topo, v1, newV);
  addEdge(topo, v2, newV);
  addEdge(topo, v3, newV);

  // Add 6 new internal faces (each pair of original vertices + newV)
  const origVerts = [v0, v1, v2, v3];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      addFace(topo, origVerts[i], origVerts[j], newV);
    }
  }

  // Create 4 new tetrahedra
  addTetrahedron(topo, v0, v1, v2, newV);
  addTetrahedron(topo, v0, v1, v3, newV);
  addTetrahedron(topo, v0, v2, v3, newV);
  addTetrahedron(topo, v1, v2, v3, newV);

  return { success: true, newVertexId: newV };
}

/**
 * 2-3 move: Replace 2 tetrahedra sharing a face with 3 tetrahedra sharing an edge.
 *
 * faceId here is identified by looking up the face from the faceIndex.
 * We accept the face id (from topo.faces).
 */
export function apply2to3(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  faceId: number,
): PachnerMoveResult3D {
  const face = topo.faces.get(faceId);
  if (!face) {
    return { success: false, error: `Face ${faceId} not found` };
  }

  const [a, b, c] = face.vertices;
  const tets = getFaceTetrahedra(topo, a, b, c);
  if (tets.length !== 2) {
    return {
      success: false,
      error: `Face must be shared by exactly 2 tetrahedra, found ${tets.length}`,
    };
  }

  const t1 = topo.tetrahedra.get(tets[0])!;
  const t2 = topo.tetrahedra.get(tets[1])!;

  // The shared face vertices are [a,b,c].
  // Find the opposite vertex in each tet.
  const sharedSet = new Set([a, b, c]);
  const v3 = t1.vertices.find((v) => !sharedSet.has(v))!;
  const v4 = t2.vertices.find((v) => !sharedSet.has(v))!;

  // Remove 2 old tets
  removeTetrahedron(topo, tets[0]);
  removeTetrahedron(topo, tets[1]);

  // Remove the shared face
  removeFaceByVertices(topo, a, b, c);

  // Add new edge (v3, v4)
  addEdge(topo, v3, v4);

  // Add new internal faces containing the new edge
  // Each shared-face vertex paired with v3 and v4
  addFace(topo, a, v3, v4);
  addFace(topo, b, v3, v4);
  addFace(topo, c, v3, v4);

  // Create 3 new tets
  addTetrahedron(topo, a, b, v3, v4);
  addTetrahedron(topo, a, c, v3, v4);
  addTetrahedron(topo, b, c, v3, v4);

  return { success: true };
}

/**
 * 3-2 move: Replace 3 tetrahedra sharing an edge with 2 tetrahedra sharing a face.
 *
 * edgeId is the id from topo.edges.
 */
export function apply3to2(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  edgeId: number,
): PachnerMoveResult3D {
  const edge = topo.edges.get(edgeId);
  if (!edge) {
    return { success: false, error: `Edge ${edgeId} not found` };
  }

  const [e0, e1] = edge.vertices;
  const tets = getEdgeTetrahedra(topo, e0, e1);
  if (tets.length !== 3) {
    return {
      success: false,
      error: `Edge must be shared by exactly 3 tetrahedra, found ${tets.length}`,
    };
  }

  // Collect the "ring" vertices (vertices of the 3 tets that are not e0 or e1)
  const ringSet = new Set<number>();
  for (const tetId of tets) {
    const tet = topo.tetrahedra.get(tetId)!;
    for (const v of tet.vertices) {
      if (v !== e0 && v !== e1) ringSet.add(v);
    }
  }
  const ring = Array.from(ringSet);
  if (ring.length !== 3) {
    return {
      success: false,
      error: `Expected 3 ring vertices around edge, found ${ring.length}`,
    };
  }
  const [v2, v3, v4] = ring;

  // Remove 3 old tets
  for (const tetId of tets) {
    removeTetrahedron(topo, tetId);
  }

  // Remove the shared edge
  removeEdgeByVertices(topo, e0, e1);

  // Remove internal faces that contain both e0 and e1
  for (const rv of ring) {
    removeFaceByVertices(topo, e0, e1, rv);
  }

  // Add new face (v2, v3, v4) - shared by the 2 new tets
  addFace(topo, v2, v3, v4);

  // Add any needed edges/faces for new tets (addEdge/addFace dedup)
  addEdge(topo, v2, v3);
  addEdge(topo, v2, v4);
  addEdge(topo, v3, v4);

  // Create 2 new tets
  addTetrahedron(topo, e0, v2, v3, v4);
  addTetrahedron(topo, e1, v2, v3, v4);

  return { success: true };
}

/**
 * 4-1 move: Collapse 4 tetrahedra around a vertex into 1 tetrahedron.
 */
export function apply4to1(
  topo: SimplicialComplexTopology,
  geo: SimplicialComplexGeometry | null,
  vertexId: number,
): PachnerMoveResult3D {
  const tets = getVertexTetrahedra(topo, vertexId);
  if (tets.length !== 4) {
    return {
      success: false,
      error: `Vertex must be incident to exactly 4 tetrahedra, found ${tets.length}`,
    };
  }

  // Collect outer vertices (not the target vertex)
  const outerSet = new Set<number>();
  for (const tetId of tets) {
    const tet = topo.tetrahedra.get(tetId)!;
    for (const v of tet.vertices) {
      if (v !== vertexId) outerSet.add(v);
    }
  }
  const outer = Array.from(outerSet);
  if (outer.length !== 4) {
    return {
      success: false,
      error: `Expected 4 outer vertices, found ${outer.length}`,
    };
  }

  // Remove 4 old tets
  for (const tetId of tets) {
    removeTetrahedron(topo, tetId);
  }

  // Remove edges from target vertex to outer vertices
  for (const v of outer) {
    removeEdgeByVertices(topo, vertexId, v);
  }

  // Remove internal faces containing the target vertex
  // These are all faces with vertexId + any 2 outer vertices
  for (let i = 0; i < outer.length; i++) {
    for (let j = i + 1; j < outer.length; j++) {
      removeFaceByVertices(topo, vertexId, outer[i], outer[j]);
    }
  }

  // Remove the target vertex
  topo.vertices.delete(vertexId);

  // Remove vertex position from geometry
  if (geo) {
    geo.positions.delete(vertexId);
  }

  // Ensure edges and faces for the new tet exist (dedup handles existing ones)
  const [o0, o1, o2, o3] = outer;
  addEdge(topo, o0, o1);
  addEdge(topo, o0, o2);
  addEdge(topo, o0, o3);
  addEdge(topo, o1, o2);
  addEdge(topo, o1, o3);
  addEdge(topo, o2, o3);

  addFace(topo, o0, o1, o2);
  addFace(topo, o0, o1, o3);
  addFace(topo, o0, o2, o3);
  addFace(topo, o1, o2, o3);

  // Create 1 new tet
  addTetrahedron(topo, o0, o1, o2, o3);

  return { success: true, removedVertexId: vertexId };
}
