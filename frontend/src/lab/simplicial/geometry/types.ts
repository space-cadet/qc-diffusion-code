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
 * Generates 2*(n+1) vertices in two layers forming non-degenerate tets.
 * Bottom layer: vertices 0, 1, ..., n  (shared edge of strip)
 * Top layer: vertices n+1, n+2, ..., 2n+1  (alternating above/below)
 *
 * Each tet i uses vertices (i, i+1, n+1+i, n+2+i).
 * The cube-inscribed approach ensures proper 3D volume visible from default
 * camera at (0,0,300) by spreading vertices in all three axes.
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

  // s controls the tet size; matches createTetrahedronGeometry convention
  const s = scale / Math.sqrt(3);
  const edgeSpacing = s * 2; // spacing along x for the strip

  const halfLen = (n * edgeSpacing) / 2;

  // Bottom layer (vertices 0..n): zigzag in y, flat in z
  // Alternating y gives the shared edge between successive tets a non-trivial shape
  for (let i = 0; i <= n; i++) {
    const x = centerX - halfLen + i * edgeSpacing;
    const y = centerY + (i % 2 === 0 ? -s : s);
    positions.set(i, { x, y, z: centerZ });
  }

  // Top layer (vertices n+1..2n+1): offset in both y and z for 3D depth
  // Each top vertex is displaced perpendicular to the bottom strip plane
  for (let i = 0; i <= n; i++) {
    const x = centerX - halfLen + i * edgeSpacing;
    const y = centerY + (i % 2 === 0 ? s : -s);
    const z = centerZ + (i % 2 === 0 ? s * 1.5 : -s * 1.5);
    positions.set(n + 1 + i, { x, y, z });
  }

  console.debug(
    `[createTetStripGeometry] Created ${n} tets, ${2 * (n + 1)} vertices, scale=${scale}, s=${s.toFixed(2)}`
  );
  return { positions };
}
