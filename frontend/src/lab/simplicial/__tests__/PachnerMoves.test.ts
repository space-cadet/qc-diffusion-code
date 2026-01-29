/**
 * Pachner Move Correctness Tests
 *
 * Verifies all 7 Pachner moves (3 in 2D, 4 in 3D) preserve topology
 * and produce correct simplex counts.
 */

import { describe, test, expect } from 'vitest';
import {
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
  createTriangleGeometry,
  createTetrahedronGeometry,
  createEmptyTopology,
  createEmptyGeometry,
  addVertex,
  addEdge,
  addFace,
  addTetrahedron,
  apply1to3,
  apply2to2,
  apply3to1,
  apply1to4,
  apply2to3,
  apply3to2,
  apply4to1,
  computeEulerCharacteristic,
  faceKey,
} from '../index';

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function counts(topo: ReturnType<typeof createInitialTriangleTopology>) {
  return {
    V: topo.vertices.size,
    E: topo.edges.size,
    F: topo.faces.size,
    T: topo.tetrahedra.size,
  };
}

/**
 * Build 3 triangles sharing a center vertex (fan configuration).
 * Enables 3-1 move on the center vertex.
 */
function createTriangleFan() {
  const topo = createEmptyTopology(2);
  const geo = createEmptyGeometry();

  const c = addVertex(topo); // center
  const v0 = addVertex(topo);
  const v1 = addVertex(topo);
  const v2 = addVertex(topo);

  geo.positions.set(c, { x: 200, y: 200 });
  geo.positions.set(v0, { x: 200, y: 100 });
  geo.positions.set(v1, { x: 300, y: 250 });
  geo.positions.set(v2, { x: 100, y: 250 });

  addEdge(topo, v0, v1);
  addEdge(topo, v1, v2);
  addEdge(topo, v2, v0);
  addEdge(topo, c, v0);
  addEdge(topo, c, v1);
  addEdge(topo, c, v2);

  addFace(topo, c, v0, v1);
  addFace(topo, c, v1, v2);
  addFace(topo, c, v2, v0);

  return { topo, geo, center: c };
}

/**
 * Build 2 triangles sharing an edge (enables 2-2 edge flip).
 */
function createTwoTriangles() {
  const topo = createEmptyTopology(2);
  const geo = createEmptyGeometry();

  const v0 = addVertex(topo);
  const v1 = addVertex(topo);
  const v2 = addVertex(topo);
  const v3 = addVertex(topo);

  geo.positions.set(v0, { x: 100, y: 100 });
  geo.positions.set(v1, { x: 300, y: 100 });
  geo.positions.set(v2, { x: 200, y: 300 });
  geo.positions.set(v3, { x: 200, y: 50 });

  addEdge(topo, v0, v1);
  addEdge(topo, v1, v2);
  addEdge(topo, v2, v0);
  addEdge(topo, v0, v3);
  addEdge(topo, v1, v3);

  addFace(topo, v0, v1, v2);
  addFace(topo, v0, v1, v3);

  return { topo, geo, sharedEdgeVerts: [v0, v1] as [number, number] };
}

/**
 * Build 2 tetrahedra sharing a face (enables 2-3 move).
 */
function createTwoTetrahedra() {
  const topo = createEmptyTopology(3);
  const geo = createEmptyGeometry();

  const v0 = addVertex(topo);
  const v1 = addVertex(topo);
  const v2 = addVertex(topo);
  const v3 = addVertex(topo);
  const v4 = addVertex(topo);

  geo.positions.set(v0, { x: 100, y: 100, z: 0 });
  geo.positions.set(v1, { x: 300, y: 100, z: 0 });
  geo.positions.set(v2, { x: 200, y: 300, z: 0 });
  geo.positions.set(v3, { x: 200, y: 200, z: -100 });
  geo.positions.set(v4, { x: 200, y: 200, z: 100 });

  // All edges
  for (const [a, b] of [[v0,v1],[v0,v2],[v0,v3],[v0,v4],[v1,v2],[v1,v3],[v1,v4],[v2,v3],[v2,v4]]) {
    addEdge(topo, a, b);
  }

  // Shared face + other faces
  addFace(topo, v0, v1, v2); // shared
  addFace(topo, v0, v1, v3);
  addFace(topo, v0, v2, v3);
  addFace(topo, v1, v2, v3);
  addFace(topo, v0, v1, v4);
  addFace(topo, v0, v2, v4);
  addFace(topo, v1, v2, v4);

  addTetrahedron(topo, v0, v1, v2, v3);
  addTetrahedron(topo, v0, v1, v2, v4);

  return { topo, geo, sharedFaceVerts: [v0, v1, v2] as [number, number, number] };
}


// ────────────────────────────────────────────────────────────────
// 2D Tests
// ────────────────────────────────────────────────────────────────

describe('2D Pachner Moves', () => {
  test('1-3 move: 1 face -> 3 faces, +1 vertex, +3 edges', () => {
    const topo = createInitialTriangleTopology();
    const geo = createTriangleGeometry(200, 200, 100);
    const chi0 = computeEulerCharacteristic(topo);
    const before = counts(topo);

    const result = apply1to3(topo, geo, 0);
    expect(result.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V + 1);
    expect(after.E).toBe(before.E + 3);
    expect(after.F).toBe(before.F + 2); // removed 1, added 3 = net +2
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });

  test('2-2 move: edge flip preserves counts, Euler char', () => {
    const { topo, geo, sharedEdgeVerts } = createTwoTriangles();
    const chi0 = computeEulerCharacteristic(topo);
    const before = counts(topo);

    // Find the shared edge id
    const edgeKey_ = sharedEdgeVerts[0] < sharedEdgeVerts[1]
      ? `${sharedEdgeVerts[0]},${sharedEdgeVerts[1]}`
      : `${sharedEdgeVerts[1]},${sharedEdgeVerts[0]}`;
    const edgeId = topo.edgeIndex.get(edgeKey_)!;

    const result = apply2to2(topo, geo, edgeId);
    expect(result.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V);
    expect(after.E).toBe(before.E); // removes 1 edge, adds 1
    expect(after.F).toBe(before.F); // removes 2 faces, adds 2
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });

  test('3-1 move: 3 faces -> 1 face, -1 vertex', () => {
    const { topo, geo, center } = createTriangleFan();
    const chi0 = computeEulerCharacteristic(topo);
    const before = counts(topo);

    const result = apply3to1(topo, geo, center);
    expect(result.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V - 1);
    expect(after.F).toBe(before.F - 2); // removed 3, added 1 = net -2
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });

  test('1-3 then 3-1 round-trip preserves simplex counts', () => {
    const topo = createInitialTriangleTopology();
    const geo = createTriangleGeometry(200, 200, 100);
    const before = counts(topo);

    // 1-3 on the single face
    const r1 = apply1to3(topo, geo, 0);
    expect(r1.success).toBe(true);
    const newV = r1.newVertexId!;

    // 3-1 on the new vertex (should have exactly 3 incident faces)
    const r2 = apply3to1(topo, geo, newV);
    expect(r2.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V);
    expect(after.E).toBe(before.E);
    expect(after.F).toBe(before.F);
  });
});

// ────────────────────────────────────────────────────────────────
// 3D Tests
// ────────────────────────────────────────────────────────────────

describe('3D Pachner Moves', () => {
  test('1-4 move: 1 tet -> 4 tets, +1 vertex', () => {
    const topo = createInitialTetrahedronTopology();
    const geo = createTetrahedronGeometry(200, 200, 0, 80);
    const chi0 = computeEulerCharacteristic(topo);
    const before = counts(topo);

    const result = apply1to4(topo, geo, 0);
    expect(result.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V + 1);
    expect(after.T).toBe(before.T + 3); // removed 1, added 4 = net +3
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });

  test('2-3 move: 2 tets -> 3 tets, preserves Euler char', () => {
    const { topo, geo, sharedFaceVerts } = createTwoTetrahedra();
    const chi0 = computeEulerCharacteristic(topo);
    const before = counts(topo);

    // Find face id for the shared face
    const key = faceKey(sharedFaceVerts[0], sharedFaceVerts[1], sharedFaceVerts[2]);
    const faceId = topo.faceIndex.get(key)!;

    const result = apply2to3(topo, geo, faceId);
    expect(result.success).toBe(true);

    const after = counts(topo);
    expect(after.T).toBe(before.T + 1); // 2 -> 3
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });

  test('1-4 then 4-1 round-trip preserves simplex counts', () => {
    const topo = createInitialTetrahedronTopology();
    const geo = createTetrahedronGeometry(200, 200, 0, 80);
    const before = counts(topo);

    const r1 = apply1to4(topo, geo, 0);
    expect(r1.success).toBe(true);
    const newV = r1.newVertexId!;

    // The new vertex should be incident to exactly 4 tets
    const r2 = apply4to1(topo, geo, newV);
    expect(r2.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V);
    expect(after.E).toBe(before.E);
    expect(after.F).toBe(before.F);
    expect(after.T).toBe(before.T);
  });

  test('2-3 then 3-2 round-trip preserves simplex counts', () => {
    const { topo, geo, sharedFaceVerts } = createTwoTetrahedra();
    const before = counts(topo);
    const chi0 = computeEulerCharacteristic(topo);

    // 2-3: find the shared face
    const key = faceKey(sharedFaceVerts[0], sharedFaceVerts[1], sharedFaceVerts[2]);
    const faceId = topo.faceIndex.get(key)!;
    const r1 = apply2to3(topo, geo, faceId);
    expect(r1.success).toBe(true);

    // After 2-3, there should be a new edge shared by exactly 3 tets
    // Find it
    let targetEdgeId: number | null = null;
    for (const [eid, edge] of topo.edges) {
      const [v0, v1] = edge.vertices;
      let tetCount = 0;
      for (const tet of topo.tetrahedra.values()) {
        if (tet.vertices.includes(v0) && tet.vertices.includes(v1)) tetCount++;
      }
      if (tetCount === 3) {
        targetEdgeId = eid;
        break;
      }
    }
    expect(targetEdgeId).not.toBeNull();

    const r2 = apply3to2(topo, geo, targetEdgeId!);
    expect(r2.success).toBe(true);

    const after = counts(topo);
    expect(after.V).toBe(before.V);
    expect(after.T).toBe(before.T);
    expect(computeEulerCharacteristic(topo)).toBe(chi0);
  });
});

// ────────────────────────────────────────────────────────────────
// Euler Characteristic Invariant
// ────────────────────────────────────────────────────────────────

describe('Euler Characteristic Invariance', () => {
  test('2D: chi = 1 for single triangle', () => {
    const topo = createInitialTriangleTopology();
    // V=3, E=3, F=1 -> chi = 3-3+1 = 1
    expect(computeEulerCharacteristic(topo)).toBe(1);
  });

  test('3D: chi = 1 for single tetrahedron', () => {
    const topo = createInitialTetrahedronTopology();
    // V=4, E=6, F=4, T=1 -> chi = 4-6+4-1 = 1
    expect(computeEulerCharacteristic(topo)).toBe(1);
  });

  test('2D: chi preserved through 10 random 1-3 moves', () => {
    const topo = createInitialTriangleTopology();
    const geo = createTriangleGeometry(200, 200, 100);
    const chi0 = computeEulerCharacteristic(topo);

    for (let i = 0; i < 10; i++) {
      const faceIds = Array.from(topo.faces.keys());
      const faceId = faceIds[Math.floor(Math.random() * faceIds.length)];
      const result = apply1to3(topo, geo, faceId);
      expect(result.success).toBe(true);
      expect(computeEulerCharacteristic(topo)).toBe(chi0);
    }
  });

  test('3D: chi preserved through 10 random 1-4 moves', () => {
    const topo = createInitialTetrahedronTopology();
    const geo = createTetrahedronGeometry(200, 200, 0, 80);
    const chi0 = computeEulerCharacteristic(topo);

    for (let i = 0; i < 10; i++) {
      const tetIds = Array.from(topo.tetrahedra.keys());
      const tetId = tetIds[Math.floor(Math.random() * tetIds.length)];
      const result = apply1to4(topo, geo, tetId);
      expect(result.success).toBe(true);
      expect(computeEulerCharacteristic(topo)).toBe(chi0);
    }
  });
});
