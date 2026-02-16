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

// --- Overlap Detection ---

/** Check if two 2D line segments (a1-a2) and (b1-b2) intersect (proper crossing). */
function segmentsIntersect(
  a1x: number, a1y: number, a2x: number, a2y: number,
  b1x: number, b1y: number, b2x: number, b2y: number,
): boolean {
  const d1x = a2x - a1x, d1y = a2y - a1y;
  const d2x = b2x - b1x, d2y = b2y - b1y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false; // parallel
  const dx = b1x - a1x, dy = b1y - a1y;
  const t = (dx * d2y - dy * d2x) / cross;
  const u = (dx * d1y - dy * d1x) / cross;
  // Strict interior intersection (exclude endpoints to allow shared edges)
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99;
}

/** Check if point (px,py) is inside triangle (ax,ay)-(bx,by)-(cx,cy). */
function pointInTriangle(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number,
): boolean {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

/**
 * Check if a candidate triangle overlaps any existing face in the 2D complex.
 * Tests edge-edge intersection and vertex containment.
 */
export function trianglesOverlap2D(
  newP0: VertexPosition,
  newP1: VertexPosition,
  newP2: VertexPosition,
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
): boolean {
  const newVerts: [number, number][] = [
    [newP0.x, newP0.y], [newP1.x, newP1.y], [newP2.x, newP2.y],
  ];
  const newEdges: [number, number, number, number][] = [
    [newVerts[0][0], newVerts[0][1], newVerts[1][0], newVerts[1][1]],
    [newVerts[1][0], newVerts[1][1], newVerts[2][0], newVerts[2][1]],
    [newVerts[2][0], newVerts[2][1], newVerts[0][0], newVerts[0][1]],
  ];

  for (const face of topo.faces.values()) {
    const [fv0, fv1, fv2] = face.vertices;
    const fp0 = geometry.positions.get(fv0);
    const fp1 = geometry.positions.get(fv1);
    const fp2 = geometry.positions.get(fv2);
    if (!fp0 || !fp1 || !fp2) continue;

    const existEdges: [number, number, number, number][] = [
      [fp0.x, fp0.y, fp1.x, fp1.y],
      [fp1.x, fp1.y, fp2.x, fp2.y],
      [fp2.x, fp2.y, fp0.x, fp0.y],
    ];

    // Edge-edge intersection
    for (const ne of newEdges) {
      for (const ee of existEdges) {
        if (segmentsIntersect(ne[0], ne[1], ne[2], ne[3], ee[0], ee[1], ee[2], ee[3])) {
          return true;
        }
      }
    }

    // Check if new triangle centroid is inside existing face
    const cx = (newP0.x + newP1.x + newP2.x) / 3;
    const cy = (newP0.y + newP1.y + newP2.y) / 3;
    if (pointInTriangle(cx, cy, fp0.x, fp0.y, fp1.x, fp1.y, fp2.x, fp2.y)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a candidate tetrahedron overlaps existing tetrahedra using bounding-sphere proximity.
 */
export function tetrahedronOverlaps3D(
  newPositions: VertexPosition[],
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  minDistance: number,
): boolean {
  // Compute centroid of candidate tet
  const cx = newPositions.reduce((s, p) => s + p.x, 0) / newPositions.length;
  const cy = newPositions.reduce((s, p) => s + p.y, 0) / newPositions.length;
  const cz = newPositions.reduce((s, p) => s + (p.z ?? 0), 0) / newPositions.length;

  for (const tet of topo.tetrahedra.values()) {
    const verts = tet.vertices.map(v => geometry.positions.get(v)).filter(Boolean) as VertexPosition[];
    if (verts.length < 4) continue;
    const tx = verts.reduce((s, p) => s + p.x, 0) / 4;
    const ty = verts.reduce((s, p) => s + p.y, 0) / 4;
    const tz = verts.reduce((s, p) => s + (p.z ?? 0), 0) / 4;
    const dist = Math.sqrt((cx - tx) ** 2 + (cy - ty) ** 2 + (cz - tz) ** 2);
    if (dist < minDistance) {
      return true;
    }
  }
  return false;
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
 * When symmetric=true, uses edge length to form an equilateral triangle (T33).
 */
export function glueTriangle2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  edgeId: number,
  scale: number,
  symmetric = false,
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

  // T33: symmetric mode uses edge length to form equilateral triangle
  let displacement: number;
  if (symmetric) {
    const edgeLen = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2);
    displacement = edgeLen * Math.sqrt(3) / 2;
    console.debug(`[BoundaryGrowth] glueTriangle2D symmetric: edgeLen=${edgeLen.toFixed(1)}, h=${displacement.toFixed(1)}`);
  } else {
    displacement = scale;
  }

  // Place new vertex at midpoint + normal * displacement
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: midX + normal.x * displacement,
    y: midY + normal.y * displacement,
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
 * When symmetric=true, uses avg face edge length to form a regular tet (T33).
 */
export function glueTetrahedron3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
  faceId: number,
  scale: number,
  symmetric = false,
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

  // T33: symmetric mode uses avg edge length for regular tetrahedron height
  let displacement: number;
  if (symmetric) {
    const edgeLen01 = Math.sqrt((p1.x-p0.x)**2 + (p1.y-p0.y)**2 + ((p1.z??0)-(p0.z??0))**2);
    const edgeLen12 = Math.sqrt((p2.x-p1.x)**2 + (p2.y-p1.y)**2 + ((p2.z??0)-(p1.z??0))**2);
    const edgeLen20 = Math.sqrt((p0.x-p2.x)**2 + (p0.y-p2.y)**2 + ((p0.z??0)-(p2.z??0))**2);
    const avgEdgeLen = (edgeLen01 + edgeLen12 + edgeLen20) / 3;
    displacement = avgEdgeLen * Math.sqrt(2 / 3);
    console.debug(`[BoundaryGrowth] glueTetrahedron3D symmetric: avgEdge=${avgEdgeLen.toFixed(1)}, h=${displacement.toFixed(1)}`);
  } else {
    displacement = scale;
  }

  // Place new vertex at centroid + normal * displacement
  const newVId = addVertex(topo);
  geometry.positions.set(newVId, {
    x: centX + (normal.x) * displacement,
    y: centY + (normal.y) * displacement,
    z: centZ + (normal.z ?? 0) * displacement,
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

// --- Frozen Boundary Helpers (T30b) ---

/**
 * Get bottom and side boundary elements for 2D complexes.
 * Bottom = boundary edges with lowest y coordinate
 * Sides = boundary edges at x extremes
 */
export function getBottomAndSideBoundaries2D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
): number[] {
  const boundaryEdges = getBoundaryEdges2D(topo);
  if (boundaryEdges.length === 0) return [];

  let maxY = -Infinity; // T33 fix: bottom = highest y in screen coords (y-down)
  let maxX = -Infinity;
  let minX = Infinity;

  for (const eId of boundaryEdges) {
    const edge = topo.edges.get(eId);
    if (!edge) continue;
    const [v0, v1] = edge.vertices;
    const p0 = geometry.positions.get(v0);
    const p1 = geometry.positions.get(v1);
    if (!p0 || !p1) continue;

    maxY = Math.max(maxY, p0.y, p1.y);
    maxX = Math.max(maxX, p0.x, p1.x);
    minX = Math.min(minX, p0.x, p1.x);
  }

  // Use relative threshold (1% of x-span) to handle varied coordinate scales
  const xSpan = maxX - minX;
  const threshold = Math.max(0.5, xSpan * 0.02);

  const frozen: number[] = [];

  for (const eId of boundaryEdges) {
    const edge = topo.edges.get(eId);
    if (!edge) continue;
    const [v0, v1] = edge.vertices;
    const p0 = geometry.positions.get(v0);
    const p1 = geometry.positions.get(v1);
    if (!p0 || !p1) continue;

    // Bottom = highest y in screen coords; sides = x extremes
    const isBottom = Math.abs(p0.y - maxY) < threshold || Math.abs(p1.y - maxY) < threshold;
    const isSide = Math.abs(p0.x - maxX) < threshold || Math.abs(p1.x - maxX) < threshold ||
                   Math.abs(p0.x - minX) < threshold || Math.abs(p1.x - minX) < threshold;

    if (isBottom || isSide) {
      frozen.push(eId);
    }
  }

  console.debug(`[BoundaryGrowth] Frozen 2D boundaries: ${frozen.length}/${boundaryEdges.length}`);
  return frozen;
}

/**
 * Get bottom and side boundary elements for 3D complexes.
 * Bottom = boundary faces with lowest z coordinate
 * Sides = boundary faces at x/y extremes
 */
export function getBottomAndSideBoundaries3D(
  topo: SimplicialComplexTopology,
  geometry: SimplicialComplexGeometry,
): number[] {
  const boundaryFaces = getBoundaryFaces3D(topo);
  if (boundaryFaces.length === 0) return [];

  let minZ = Infinity;
  let maxX = -Infinity;
  let minX = Infinity;
  let maxY = -Infinity;
  let minY = Infinity;

  for (const fId of boundaryFaces) {
    const face = topo.faces.get(fId);
    if (!face) continue;
    for (const v of face.vertices) {
      const p = geometry.positions.get(v);
      if (!p) continue;
      minZ = Math.min(minZ, p.z ?? 0);
      maxX = Math.max(maxX, p.x);
      minX = Math.min(minX, p.x);
      maxY = Math.max(maxY, p.y);
      minY = Math.min(minY, p.y);
    }
  }

  const frozen: number[] = [];
  const threshold = 0.1;

  for (const fId of boundaryFaces) {
    const face = topo.faces.get(fId);
    if (!face) continue;

    let isBottom = false;
    let isSide = false;

    for (const v of face.vertices) {
      const p = geometry.positions.get(v);
      if (!p) continue;

      if (Math.abs((p.z ?? 0) - minZ) < threshold) isBottom = true;
      if (Math.abs(p.x - maxX) < threshold || Math.abs(p.x - minX) < threshold) isSide = true;
      if (Math.abs(p.y - maxY) < threshold || Math.abs(p.y - minY) < threshold) isSide = true;
    }

    if (isBottom || isSide) {
      frozen.push(fId);
    }
  }

  console.debug(`[BoundaryGrowth] Frozen 3D boundaries: ${frozen.length}/${boundaryFaces.length}`);
  return frozen;
}

/**
 * Check if a boundary element is frozen (constrained from evolution).
 */
export function isBoundaryFrozen(
  elementId: number,
  frozenSet: Set<number>,
): boolean {
  return frozenSet.has(elementId);
}
