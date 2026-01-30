/**
 * Geometric types for simplicial complexes (T28a)
 *
 * Geometry is optional -- a complex can exist as pure topology.
 * Positions are needed for visualization and geometric quality checks.
 */

export interface VertexPosition {
  x: number;
  y: number;
  z?: number; // present for 3D embeddings
}

export interface SimplicialComplexGeometry {
  positions: Map<number, VertexPosition>;
}

/** Create an empty geometry container. */
export function createEmptyGeometry(): SimplicialComplexGeometry {
  return { positions: new Map() };
}

/**
 * Create initial 2D geometry for a single equilateral triangle (vertices 0,1,2).
 */
export function createTriangleGeometry(
  centerX: number,
  centerY: number,
  radius: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>();
  positions.set(0, { x: centerX, y: centerY - radius });
  positions.set(1, { x: centerX - radius * 0.866, y: centerY + radius * 0.5 });
  positions.set(2, { x: centerX + radius * 0.866, y: centerY + radius * 0.5 });
  return { positions };
}

/**
 * Create initial 3D geometry for a regular tetrahedron (vertices 0,1,2,3).
 *
 * Uses the inscribed-in-cube construction: pick four alternating vertices of
 * a cube with half-side = scale/sqrt(3), giving edge length = scale * sqrt(2).
 * All six edges are equal.
 */
/**
 * Create geometry for a 2D triangle strip with n triangles.
 * Zigzag pattern: bottom vertices on one row, top vertices on another.
 */
export function createTriangleStripGeometry(
  n: number,
  centerX: number,
  centerY: number,
  scale: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>();
  if (n < 1) n = 1;

  const halfWidth = (n * scale * 0.5) / 2;
  const halfHeight = scale * 0.433; // equilateral triangle height / 2

  // V0 = bottom-left, V1 = top-left
  positions.set(0, { x: centerX - halfWidth, y: centerY + halfHeight });
  positions.set(1, { x: centerX - halfWidth, y: centerY - halfHeight });

  let bottomX = centerX - halfWidth;
  let topX = centerX - halfWidth;
  let nextId = 2;
  const dx = scale * 0.5;

  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) {
      // New bottom-right vertex
      bottomX += dx;
      positions.set(nextId, { x: bottomX, y: centerY + halfHeight });
    } else {
      // New top-right vertex
      topX += dx;
      positions.set(nextId, { x: topX, y: centerY - halfHeight });
    }
    nextId++;
  }

  return { positions };
}

export function createTetrahedronGeometry(
  centerX: number,
  centerY: number,
  centerZ: number,
  scale: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>();
  // Regular tetrahedron: four alternating vertices of a cube centred at origin.
  // s = scale / sqrt(3) so that the edge length equals scale * sqrt(2).
  const s = scale / Math.sqrt(3);
  positions.set(0, { x: centerX + s, y: centerY + s, z: centerZ + s });
  positions.set(1, { x: centerX + s, y: centerY - s, z: centerZ - s });
  positions.set(2, { x: centerX - s, y: centerY + s, z: centerZ - s });
  positions.set(3, { x: centerX - s, y: centerY - s, z: centerZ + s });
  return { positions };
}

/**
 * Create geometry for a 3D tet strip with n tetrahedra.
 * Each tet extends along the x-axis, alternating displacement direction.
 */
export function createTetStripGeometry(
  n: number,
  centerX: number,
  centerY: number,
  centerZ: number,
  scale: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>();
  if (n < 1) n = 1;

  const s = scale / Math.sqrt(3);
  const halfLen = (n * s) / 2;

  // First tet: 4 vertices
  positions.set(0, { x: centerX - halfLen, y: centerY + s, z: centerZ + s });
  positions.set(1, { x: centerX - halfLen, y: centerY - s, z: centerZ - s });
  positions.set(2, { x: centerX - halfLen + s, y: centerY, z: centerZ });
  positions.set(3, { x: centerX - halfLen, y: centerY - s, z: centerZ + s });

  let nextId = 4;
  for (let i = 1; i < n; i++) {
    const xOff = centerX - halfLen + (i + 1) * s;
    // Alternate y/z displacement for visual separation
    const yOff = (i % 2 === 0) ? s : -s;
    positions.set(nextId, { x: xOff, y: centerY + yOff, z: centerZ + (i % 2 === 0 ? s : -s) });
    nextId++;
  }

  return { positions };
}
