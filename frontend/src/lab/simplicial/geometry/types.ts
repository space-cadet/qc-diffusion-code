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
