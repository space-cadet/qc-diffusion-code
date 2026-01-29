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
 */
export function createTetrahedronGeometry(
  centerX: number,
  centerY: number,
  centerZ: number,
  scale: number,
): SimplicialComplexGeometry {
  const positions = new Map<number, VertexPosition>();
  // Regular tetrahedron centred at origin then shifted
  const h = scale * Math.sqrt(2 / 3);
  positions.set(0, { x: centerX, y: centerY - h, z: centerZ });
  positions.set(1, {
    x: centerX - scale * 0.866,
    y: centerY + h * 0.5,
    z: centerZ - scale * 0.5,
  });
  positions.set(2, {
    x: centerX + scale * 0.866,
    y: centerY + h * 0.5,
    z: centerZ - scale * 0.5,
  });
  positions.set(3, {
    x: centerX,
    y: centerY + h * 0.5,
    z: centerZ + scale,
  });
  return { positions };
}
