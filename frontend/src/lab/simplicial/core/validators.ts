/**
 * Validation functions for simplicial complexes (T28a)
 *
 * Pure functions that check structural integrity and move preconditions.
 */

import {
  SimplicialComplexTopology,
  PachnerMove,
  ValidationResult,
  faceKey,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(): ValidationResult {
  return { valid: true, errors: [], warnings: [] };
}

function fail(errors: string[], warnings: string[] = []): ValidationResult {
  return { valid: false, errors, warnings };
}

function merge(results: ValidationResult[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const r of results) {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Topological validation
// ---------------------------------------------------------------------------

/**
 * Validate overall structural integrity of a simplicial complex.
 *
 * Checks:
 * - All vertex references in edges/faces/tets resolve to existing vertices
 * - No duplicate simplices (same vertex set)
 * - For 3D: faceToTets consistency (every registered tet exists, at most 2 per face)
 */
export function validateSimplicialComplex(
  topology: SimplicialComplexTopology,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check edge vertex references
  for (const [id, edge] of topology.edges) {
    for (const v of edge.vertices) {
      if (!topology.vertices.has(v)) {
        errors.push(`Edge ${id} references missing vertex ${v}`);
      }
    }
  }

  // Check face vertex references
  for (const [id, face] of topology.faces) {
    for (const v of face.vertices) {
      if (!topology.vertices.has(v)) {
        errors.push(`Face ${id} references missing vertex ${v}`);
      }
    }
    // Check for degenerate face (duplicate vertices)
    const unique = new Set(face.vertices);
    if (unique.size !== 3) {
      errors.push(`Face ${id} has duplicate vertices: [${face.vertices}]`);
    }
  }

  // Check tetrahedron vertex references
  for (const [id, tet] of topology.tetrahedra) {
    for (const v of tet.vertices) {
      if (!topology.vertices.has(v)) {
        errors.push(`Tetrahedron ${id} references missing vertex ${v}`);
      }
    }
    const unique = new Set(tet.vertices);
    if (unique.size !== 4) {
      errors.push(`Tetrahedron ${id} has duplicate vertices: [${tet.vertices}]`);
    }
  }

  // Check faceToTets consistency
  for (const [key, tets] of topology.faceToTets) {
    if (tets.length > 2) {
      errors.push(`Face key ${key} has ${tets.length} incident tetrahedra (max 2 for manifold)`);
    }
    for (const tetId of tets) {
      if (!topology.tetrahedra.has(tetId)) {
        errors.push(`faceToTets key ${key} references missing tetrahedron ${tetId}`);
      }
    }
  }

  // Check duplicate faces (same sorted vertex triple)
  const faceKeys = new Set<string>();
  for (const [id, face] of topology.faces) {
    const key = faceKey(face.vertices[0], face.vertices[1], face.vertices[2]);
    if (faceKeys.has(key)) {
      warnings.push(`Duplicate face detected for vertices ${key} (face ${id})`);
    }
    faceKeys.add(key);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Pachner move precondition validation
// ---------------------------------------------------------------------------

/**
 * Validate preconditions for a specific Pachner move.
 *
 * @param topology - the current complex
 * @param moveType - which move to validate
 * @param targetId - the id of the target simplex (face for 2D moves, tet for 3D moves)
 */
export function validatePachnerMovePreconditions(
  topology: SimplicialComplexTopology,
  moveType: PachnerMove,
  targetId: number,
): ValidationResult {
  switch (moveType) {
    case '1-3':
      return validate1to3(topology, targetId);
    case '2-2':
      return validate2to2(topology, targetId);
    case '3-1':
      return validate3to1(topology, targetId);
    case '1-4':
      return validate1to4(topology, targetId);
    case '2-3':
      return validate2to3(topology, targetId);
    case '3-2':
      return validate3to2(topology, targetId);
    case '4-1':
      return validate4to1(topology, targetId);
  }
}

// --- 2D move preconditions ---

function validate1to3(
  topology: SimplicialComplexTopology,
  faceId: number,
): ValidationResult {
  if (topology.dimension !== 2) {
    return fail(['1-3 move requires a 2D complex']);
  }
  if (!topology.faces.has(faceId)) {
    return fail([`Target face ${faceId} does not exist`]);
  }
  return ok();
}

function validate2to2(
  topology: SimplicialComplexTopology,
  edgeId: number,
): ValidationResult {
  if (topology.dimension !== 2) {
    return fail(['2-2 move requires a 2D complex']);
  }
  if (!topology.edges.has(edgeId)) {
    return fail([`Target edge ${edgeId} does not exist`]);
  }
  // The edge must be shared by exactly 2 faces (interior edge)
  const edge = topology.edges.get(edgeId)!;
  const [v0, v1] = edge.vertices;
  let adjacentFaceCount = 0;
  for (const face of topology.faces.values()) {
    const vs = face.vertices;
    if (vs.includes(v0) && vs.includes(v1)) {
      adjacentFaceCount++;
    }
  }
  if (adjacentFaceCount !== 2) {
    return fail([
      `Edge ${edgeId} is adjacent to ${adjacentFaceCount} faces (need exactly 2 for a 2-2 flip)`,
    ]);
  }
  return ok();
}

function validate3to1(
  topology: SimplicialComplexTopology,
  vertexId: number,
): ValidationResult {
  if (topology.dimension !== 2) {
    return fail(['3-1 move requires a 2D complex']);
  }
  if (!topology.vertices.has(vertexId)) {
    return fail([`Target vertex ${vertexId} does not exist`]);
  }
  // Vertex must be incident to exactly 3 faces
  let count = 0;
  for (const face of topology.faces.values()) {
    if (face.vertices.includes(vertexId)) {
      count++;
    }
  }
  if (count !== 3) {
    return fail([
      `Vertex ${vertexId} is incident to ${count} faces (need exactly 3 for a 3-1 move)`,
    ]);
  }
  return ok();
}

// --- 3D move preconditions ---

function validate1to4(
  topology: SimplicialComplexTopology,
  tetId: number,
): ValidationResult {
  if (topology.dimension !== 3) {
    return fail(['1-4 move requires a 3D complex']);
  }
  if (!topology.tetrahedra.has(tetId)) {
    return fail([`Target tetrahedron ${tetId} does not exist`]);
  }
  return ok();
}

function validate2to3(
  topology: SimplicialComplexTopology,
  faceId: number,
): ValidationResult {
  if (topology.dimension !== 3) {
    return fail(['2-3 move requires a 3D complex']);
  }
  if (!topology.faces.has(faceId)) {
    return fail([`Target face ${faceId} does not exist`]);
  }
  const face = topology.faces.get(faceId)!;
  const key = faceKey(face.vertices[0], face.vertices[1], face.vertices[2]);
  const tets = topology.faceToTets.get(key);
  if (!tets || tets.length !== 2) {
    return fail([
      `Face ${faceId} is shared by ${tets?.length ?? 0} tetrahedra (need exactly 2 for a 2-3 move)`,
    ]);
  }
  return ok();
}

function validate3to2(
  topology: SimplicialComplexTopology,
  edgeId: number,
): ValidationResult {
  if (topology.dimension !== 3) {
    return fail(['3-2 move requires a 3D complex']);
  }
  if (!topology.edges.has(edgeId)) {
    return fail([`Target edge ${edgeId} does not exist`]);
  }
  // The edge must be shared by exactly 3 tetrahedra
  const edge = topology.edges.get(edgeId)!;
  const [v0, v1] = edge.vertices;
  const incidentTets = new Set<number>();
  for (const [, tet] of topology.tetrahedra) {
    if (tet.vertices.includes(v0) && tet.vertices.includes(v1)) {
      incidentTets.add(tet.id);
    }
  }
  if (incidentTets.size !== 3) {
    return fail([
      `Edge ${edgeId} is shared by ${incidentTets.size} tetrahedra (need exactly 3 for a 3-2 move)`,
    ]);
  }
  return ok();
}

function validate4to1(
  topology: SimplicialComplexTopology,
  vertexId: number,
): ValidationResult {
  if (topology.dimension !== 3) {
    return fail(['4-1 move requires a 3D complex']);
  }
  if (!topology.vertices.has(vertexId)) {
    return fail([`Target vertex ${vertexId} does not exist`]);
  }
  // Vertex must be incident to exactly 4 tetrahedra
  let count = 0;
  for (const tet of topology.tetrahedra.values()) {
    if (tet.vertices.includes(vertexId)) {
      count++;
    }
  }
  if (count !== 4) {
    return fail([
      `Vertex ${vertexId} is incident to ${count} tetrahedra (need exactly 4 for a 4-1 move)`,
    ]);
  }
  return ok();
}
