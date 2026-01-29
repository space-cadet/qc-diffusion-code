/**
 * Geometric quality checks for simplicial complexes (T28a)
 *
 * These are optional checks used before/after Pachner moves to ensure
 * the resulting geometry is non-degenerate.
 */

import { SimplicialComplexGeometry, VertexPosition } from './types';

/**
 * Check whether the quadrilateral (vA, vC, vB, vD) is strictly convex.
 * Used before a 2-2 edge flip to ensure the flip produces valid triangles.
 *
 * The four vertices must be supplied in the order that traces the quad boundary.
 * Returns true if all four cross-product signs are the same (all positive or
 * all negative), meaning no reflex angle.
 */
export function validateConvexQuadrilateral(
  geometry: SimplicialComplexGeometry,
  v0: number,
  v1: number,
  v2: number,
  v3: number,
): boolean {
  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  const p2 = geometry.positions.get(v2);
  const p3 = geometry.positions.get(v3);

  if (!p0 || !p1 || !p2 || !p3) return false;

  const cross = (a: VertexPosition, b: VertexPosition, c: VertexPosition) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);

  const c0 = cross(p0, p1, p2);
  const c1 = cross(p1, p2, p3);
  const c2 = cross(p2, p3, p0);
  const c3 = cross(p3, p0, p1);

  const allPositive = c0 > 0 && c1 > 0 && c2 > 0 && c3 > 0;
  const allNegative = c0 < 0 && c1 < 0 && c2 < 0 && c3 < 0;

  return allPositive || allNegative;
}

/**
 * Compute the signed area of a triangle given three vertex ids.
 * Returns the absolute area.
 */
export function triangleArea(
  geometry: SimplicialComplexGeometry,
  v0: number,
  v1: number,
  v2: number,
): number {
  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  const p2 = geometry.positions.get(v2);

  if (!p0 || !p1 || !p2) return 0;

  return (
    0.5 *
    Math.abs(
      (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y),
    )
  );
}

/**
 * Check that a triangle exceeds a minimum area threshold.
 */
export function validateTriangleArea(
  geometry: SimplicialComplexGeometry,
  face: [number, number, number],
  minArea: number,
): boolean {
  return triangleArea(geometry, face[0], face[1], face[2]) > minArea;
}

/**
 * Compute the volume of a tetrahedron given four vertex ids.
 * Uses the scalar triple product: V = |det([v1-v0, v2-v0, v3-v0])| / 6
 */
export function tetrahedronVolume(
  geometry: SimplicialComplexGeometry,
  v0: number,
  v1: number,
  v2: number,
  v3: number,
): number {
  const p0 = geometry.positions.get(v0);
  const p1 = geometry.positions.get(v1);
  const p2 = geometry.positions.get(v2);
  const p3 = geometry.positions.get(v3);

  if (!p0 || !p1 || !p2 || !p3) return 0;

  const z0 = p0.z ?? 0;
  const z1 = p1.z ?? 0;
  const z2 = p2.z ?? 0;
  const z3 = p3.z ?? 0;

  // Edge vectors from v0
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const az = z1 - z0;

  const bx = p2.x - p0.x;
  const by = p2.y - p0.y;
  const bz = z2 - z0;

  const cx = p3.x - p0.x;
  const cy = p3.y - p0.y;
  const cz = z3 - z0;

  const det = ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);

  return Math.abs(det) / 6;
}

/**
 * Check that a tetrahedron exceeds a minimum volume threshold.
 */
export function validateTetrahedronVolume(
  geometry: SimplicialComplexGeometry,
  tet: [number, number, number, number],
  minVolume: number,
): boolean {
  return tetrahedronVolume(geometry, tet[0], tet[1], tet[2], tet[3]) > minVolume;
}
