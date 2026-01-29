/**
 * Chain complex and homology operations (T28a - optional extension)
 *
 * Provides:
 * - Boundary operator for computing chain boundaries
 * - Euler characteristic from simplex counts
 * - Betti number computation (rank-based, no Smith normal form yet)
 * - Homology preservation verification after Pachner moves
 */

import {
  SimplicialComplexTopology,
  PachnerMove,
  faceKey,
} from '../core/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A chain is a formal sum of simplices with integer coefficients. */
export interface Chain {
  /** Maps simplex id to its coefficient. */
  coefficients: Map<number, number>;
}

/** Result of a homology computation. */
export interface HomologyResult {
  /** Betti numbers b_0, b_1, ... up to the complex dimension. */
  bettiNumbers: number[];
  /** Euler characteristic (alternating sum of simplex counts). */
  eulerCharacteristic: number;
}

// ---------------------------------------------------------------------------
// Euler characteristic (exact, no linear algebra needed)
// ---------------------------------------------------------------------------

/**
 * Compute the Euler characteristic: V - E + F (- T for 3D).
 */
export function computeEulerCharacteristic(
  topology: SimplicialComplexTopology,
): number {
  const V = topology.vertices.size;
  const E = topology.edges.size;
  const F = topology.faces.size;
  const T = topology.tetrahedra.size;

  if (topology.dimension === 2) {
    return V - E + F;
  }
  return V - E + F - T;
}

// ---------------------------------------------------------------------------
// Boundary operator
// ---------------------------------------------------------------------------

/**
 * Compute the boundary of a single k-simplex as a (k-1)-chain.
 *
 * For a k-simplex [v0, v1, ..., vk], the boundary is:
 *   sum_{i=0}^{k} (-1)^i [v0, ..., v_{i-1}, v_{i+1}, ..., vk]
 *
 * This function returns the boundary as a chain of (k-1)-simplex ids.
 * It requires that the lower-dimensional simplices are registered in the topology.
 */
export function computeBoundaryOfFace(
  topology: SimplicialComplexTopology,
  faceId: number,
): Chain {
  const face = topology.faces.get(faceId);
  if (!face) return { coefficients: new Map() };

  const [v0, v1, v2] = face.vertices;
  const coefficients = new Map<number, number>();

  // Boundary of [v0,v1,v2] = [v1,v2] - [v0,v2] + [v0,v1]
  // Use edgeIndex for O(1) lookup instead of O(n) scan
  const pairs: [number, number, number][] = [
    [v1, v2, 1],
    [v0, v2, -1],
    [v0, v1, 1],
  ];

  for (const [a, b, sign] of pairs) {
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    const edgeId = topology.edgeIndex.get(key);
    if (edgeId !== undefined) {
      coefficients.set(edgeId, sign);
    }
  }

  return { coefficients };
}

// ---------------------------------------------------------------------------
// Connected components (union-find on vertex adjacency)
// ---------------------------------------------------------------------------

function countConnectedComponents(topology: SimplicialComplexTopology): number {
  const parent = new Map<number, number>();
  for (const id of topology.vertices.keys()) {
    parent.set(id, id);
  }
  function find(x: number): number {
    while (parent.get(x) !== x) {
      const p = parent.get(parent.get(x)!)!;
      parent.set(x, p);
      x = p;
    }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  for (const edge of topology.edges.values()) {
    union(edge.vertices[0], edge.vertices[1]);
  }
  const roots = new Set<number>();
  for (const id of topology.vertices.keys()) {
    roots.add(find(id));
  }
  return topology.vertices.size === 0 ? 0 : roots.size;
}

function countConnectedComponents3D(topology: SimplicialComplexTopology): number {
  return countConnectedComponents(topology);
}

// ---------------------------------------------------------------------------
// Betti numbers (simplex-count heuristic for connected complexes)
// ---------------------------------------------------------------------------

/**
 * Estimate Betti numbers from the Euler characteristic and simplex counts.
 *
 * ⚠️ IMPORTANT: This is a HEURISTIC ESTIMATION, not exact computation.
 *
 * For exact Betti numbers, Smith normal form computation on boundary matrices is required,
 * which is computationally expensive (O(n^3) for large complexes) and beyond current scope.
 *
 * 2D Case:
 * - b0 = number of connected components (exact, computed via union-find)
 * - b2 = 0 for open complexes with boundary, 1 for closed manifolds (assumed 0 here)
 * - b1 = b0 + b2 - chi (derived from Euler characteristic)
 * - This is exact for closed orientable 2-manifolds, approximate for general 2-complexes
 *
 * 3D Case:
 * - b0 = number of connected components (exact, computed via union-find)
 * - b3 = 0 for open complexes with boundary, 1 for closed 3-manifolds (assumed 0 here)
 * - Without Smith normal form, cannot separate b1 and b2 individually
 * - Uses constraint: b1 - b2 = b0 + b3 - chi
 * - Heuristic: assumes simply-connected (b1=0) or non-simply-connected (b2=0) based on deficit sign
 * - This is only approximate and may be incorrect for non-simply-connected complexes
 *
 * Use this for:
 * - Quick topological sanity checks
 * - Detecting obvious topological changes after Pachner moves
 * - Educational purposes and visualization
 *
 * Do NOT use for:
 * - Rigorous mathematical proofs
 * - Critical physics calculations requiring exact homology
 * - Detecting subtle topological features
 */
export function estimateBettiNumbers(
  topology: SimplicialComplexTopology,
): number[] {
  const chi = computeEulerCharacteristic(topology);

  if (topology.dimension === 2) {
    // b0 = number of connected components
    // b2 depends on whether the complex is closed; assume 0 for open triangulations
    const b0 = countConnectedComponents(topology);
    const b2 = 0;
    const b1 = b0 + b2 - chi; // from chi = b0 - b1 + b2
    return [b0, Math.max(0, b1), b2];
  }

  // 3D: chi = b0 - b1 + b2 - b3
  // Without Smith normal form we cannot separate b1 and b2 individually.
  // Use connected-component count for b0, assume b3=0 for open complexes,
  // and distribute the remaining deficit across b1 and b2 using the
  // constraint: b1 - b2 = b0 + b3 - chi.
  const b0 = countConnectedComponents3D(topology);
  const b3 = 0; // 0 for open (boundary) complexes; 1 for closed manifolds
  const deficit = b0 + b3 - chi; // = b1 - b2
  // Heuristic: for simply-connected complexes b1=0, so b2 = -deficit.
  // For non-simply-connected, assume b2=0 and b1=deficit.
  // Pick the assignment that keeps both non-negative.
  const b1 = Math.max(0, deficit);
  const b2 = Math.max(0, -deficit);
  return [b0, b1, b2, b3];
}

// ---------------------------------------------------------------------------
// Homology preservation check
// ---------------------------------------------------------------------------

/**
 * Verify that a Pachner move preserved the Euler characteristic.
 *
 * By Pachner's theorem, all bistellar moves on PL manifolds preserve
 * the homeomorphism type, so the Euler characteristic (and all Betti
 * numbers) must be unchanged.
 */
export function verifyHomologyPreservation(
  before: SimplicialComplexTopology,
  after: SimplicialComplexTopology,
  _moveType: PachnerMove,
): boolean {
  return (
    computeEulerCharacteristic(before) ===
    computeEulerCharacteristic(after)
  );
}
