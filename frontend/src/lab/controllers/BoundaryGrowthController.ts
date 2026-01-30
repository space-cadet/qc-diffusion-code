/**
 * Boundary Growth Controller (T30)
 *
 * Grows a simplicial complex outward by gluing simplices onto boundary faces.
 * Follows arXiv:1108.1974v2 (Dittrich & Hoehn).
 */

import { SimulationController } from '../interfaces/SimulationController';
import {
  BoundaryGrowthState,
  BoundaryGrowthParams,
  BoundaryMoveType,
} from '../types/simplicial';
import {
  SimplicialComplexTopology,
  SimplicialComplexGeometry,
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
  createTriangleStripTopology,
  createTetStripTopology,
  createTriangleGeometry,
  createTetrahedronGeometry,
  createTriangleStripGeometry,
  createTetStripGeometry,
  computeEulerCharacteristic,
  getBoundaryEdges2D,
  getBoundaryFaces3D,
  glueTriangle2D,
  glueTetrahedron3D,
  tentMove2D,
  tentMove3D,
  trianglesOverlap2D,
  tetrahedronOverlaps3D,
  computeOutwardNormal2D,
  computeOutwardNormal3D,
  getBottomAndSideBoundaries2D,
  getBottomAndSideBoundaries3D,
  isBoundaryFrozen,
  type VertexPosition,
} from '../simplicial';

export class BoundaryGrowthController
  implements SimulationController<BoundaryGrowthState, BoundaryGrowthParams>
{
  private state: BoundaryGrowthState | null = null;
  private history: BoundaryGrowthState[] = [];
  private currentStep = 0;
  private running = false;
  private params: BoundaryGrowthParams | null = null;
  private topology: SimplicialComplexTopology | null = null;
  private geometry: SimplicialComplexGeometry | null = null;
  private frozenBoundaryElements: Set<number> = new Set(); // T30b: Frozen boundary constraints

  initialize(params: BoundaryGrowthParams): void {
    console.debug('[BoundaryGrowthController] Initialize with params:', params);
    this.params = params;
    this.currentStep = 0;
    this.running = false;
    this.history = [];

    if (params.dimension === 2) {
      if (params.initialState === 'triangle-strip') {
        this.topology = createTriangleStripTopology(params.stripLength);
        this.geometry = createTriangleStripGeometry(params.stripLength, 400, 300, 120);
        console.debug(`[BoundaryGrowthController] Using triangle strip, length=${params.stripLength}`);
      } else {
        this.topology = createInitialTriangleTopology();
        this.geometry = createTriangleGeometry(400, 300, 120);
      }
    } else {
      if (params.initialState === 'triangle-strip') {
        this.topology = createTetStripTopology(params.stripLength);
        this.geometry = createTetStripGeometry(params.stripLength, 400, 300, 0, 80);
        console.debug(`[BoundaryGrowthController] Using tet strip, length=${params.stripLength}`);
      } else {
        this.topology = createInitialTetrahedronTopology();
        this.geometry = createTetrahedronGeometry(400, 300, 0, 80);
      }
    }

    // T30b: Initialize frozen boundary constraints
    this.frozenBoundaryElements.clear();
    const constraintMode = params.boundaryConstraints?.mode ?? 'none';
    if (constraintMode === 'bottom-and-sides') {
      if (params.dimension === 2) {
        const frozenIds = getBottomAndSideBoundaries2D(this.topology, this.geometry);
        this.frozenBoundaryElements = new Set(frozenIds);
      } else {
        const frozenIds = getBottomAndSideBoundaries3D(this.topology, this.geometry);
        this.frozenBoundaryElements = new Set(frozenIds);
      }
    } else if (constraintMode === 'custom' && params.boundaryConstraints?.customFrozenElementIds) {
      this.frozenBoundaryElements = new Set(params.boundaryConstraints.customFrozenElementIds);
    }

    this.state = this.createState(null);
    this.history = [this.state];
    console.debug('[BoundaryGrowthController] Initialized:', {
      dimension: params.dimension,
      vertices: this.topology.vertices.size,
      boundarySize: this.state.boundarySize,
      frozenBoundaries: this.frozenBoundaryElements.size,
    });
  }

  step(): BoundaryGrowthState {
    if (!this.params || !this.topology || !this.geometry) {
      throw new Error('Controller not initialized');
    }

    const moveType: BoundaryMoveType =
      Math.random() < this.params.tentProbability ? 'tent' : 'glue';

    const result = this.applyMove(moveType);

    if (!result.success) {
      console.debug('[BoundaryGrowthController] Move failed:', result.error);
      // Try the other move type as fallback
      const fallback: BoundaryMoveType = moveType === 'glue' ? 'tent' : 'glue';
      const fallbackResult = this.applyMove(fallback);
      if (!fallbackResult.success) {
        console.warn('[BoundaryGrowthController] Both move types failed');
        return this.state!;
      }
      this.currentStep++;
      this.state = this.createState(fallback);
      this.state.moveCount[fallback]++;
      this.history.push(this.state);
      return this.state;
    }

    this.currentStep++;
    this.state = this.createState(moveType);
    this.state.moveCount[moveType]++;
    this.history.push(this.state);

    console.debug('[BoundaryGrowthController] Step', this.currentStep, 'move:', moveType, {
      vertices: this.topology.vertices.size,
      boundary: this.state.boundarySize,
    });
    return this.state;
  }

  reset(): void {
    console.debug('[BoundaryGrowthController] Reset');
    if (this.params) {
      this.initialize(this.params);
    }
  }

  getState(): BoundaryGrowthState {
    if (!this.state) throw new Error('Controller not initialized');
    return this.state;
  }

  getHistory(): BoundaryGrowthState[] {
    return this.history;
  }

  seekToStep(n: number): BoundaryGrowthState {
    if (n < 0 || n >= this.history.length) {
      throw new Error(`Invalid step: ${n}`);
    }
    this.currentStep = n;
    this.state = this.history[n];
    return this.state;
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  private readonly MAX_OVERLAP_RETRIES = 10;

  /**
   * Compute candidate new vertex position for a 2D glue without mutating topology.
   * Returns null if position cannot be computed.
   */
  private computeCandidatePosition2D(edgeId: number, scale: number): { p0: VertexPosition; p1: VertexPosition; newP: VertexPosition } | null {
    if (!this.topology || !this.geometry) return null;
    const edge = this.topology.edges.get(edgeId);
    if (!edge) return null;
    const [v0, v1] = edge.vertices;
    const p0 = this.geometry.positions.get(v0);
    const p1 = this.geometry.positions.get(v1);
    if (!p0 || !p1) return null;

    const normal = computeOutwardNormal2D(this.topology, this.geometry, edgeId);
    if (!normal) return null;

    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    return { p0, p1, newP: { x: midX + normal.x * scale, y: midY + normal.y * scale } };
  }

  /**
   * Compute candidate new vertex position for a 3D glue without mutating topology.
   */
  private computeCandidatePosition3D(faceId: number, scale: number): { faceVerts: VertexPosition[]; newP: VertexPosition } | null {
    if (!this.topology || !this.geometry) return null;
    const face = this.topology.faces.get(faceId);
    if (!face) return null;
    const [v0, v1, v2] = face.vertices;
    const p0 = this.geometry.positions.get(v0);
    const p1 = this.geometry.positions.get(v1);
    const p2 = this.geometry.positions.get(v2);
    if (!p0 || !p1 || !p2) return null;

    const normal = computeOutwardNormal3D(this.topology, this.geometry, faceId);
    if (!normal) return null;

    const cx = (p0.x + p1.x + p2.x) / 3;
    const cy = (p0.y + p1.y + p2.y) / 3;
    const cz = ((p0.z ?? 0) + (p1.z ?? 0) + (p2.z ?? 0)) / 3;
    return {
      faceVerts: [p0, p1, p2],
      newP: { x: cx + normal.x * scale, y: cy + normal.y * scale, z: cz + (normal.z ?? 0) * scale },
    };
  }

  private applyMove(moveType: BoundaryMoveType): { success: boolean; error?: string } {
    if (!this.topology || !this.geometry || !this.params) {
      return { success: false, error: 'Not initialized' };
    }

    const scale = this.params.growthScale;
    const checkOverlap = this.params.preventOverlap;

    if (this.params.dimension === 2) {
      if (moveType === 'glue') {
        const boundaryEdges = getBoundaryEdges2D(this.topology);
        if (boundaryEdges.length === 0) return { success: false, error: 'No boundary edges' };

        // Shuffle for retry
        const shuffled = [...boundaryEdges].sort(() => Math.random() - 0.5);
        const maxTries = checkOverlap ? Math.min(this.MAX_OVERLAP_RETRIES, shuffled.length) : 1;

        for (let attempt = 0; attempt < maxTries; attempt++) {
          const edgeId = shuffled[attempt % shuffled.length];

          // T30b: Skip frozen boundaries
          if (isBoundaryFrozen(edgeId, this.frozenBoundaryElements)) {
            console.debug(`[BoundaryGrowthController] Skipped frozen edge (attempt ${attempt + 1})`);
            continue;
          }

          if (checkOverlap) {
            const candidate = this.computeCandidatePosition2D(edgeId, scale);
            if (candidate) {
              const overlaps = trianglesOverlap2D(candidate.p0, candidate.p1, candidate.newP, this.topology, this.geometry);
              if (overlaps) {
                console.debug(`[BoundaryGrowthController] Overlap rejected (attempt ${attempt + 1})`);
                continue;
              }
            }
          }

          return glueTriangle2D(this.topology, this.geometry, edgeId, scale);
        }
        return { success: false, error: 'All glue attempts overlapped' };
      } else {
        const boundaryEdges = getBoundaryEdges2D(this.topology);
        const boundaryVertices = new Set<number>();
        for (const eId of boundaryEdges) {
          const edge = this.topology.edges.get(eId);
          if (edge) { boundaryVertices.add(edge.vertices[0]); boundaryVertices.add(edge.vertices[1]); }
        }
        const verts = Array.from(boundaryVertices);
        if (verts.length === 0) return { success: false, error: 'No boundary vertices' };
        const vertexId = verts[Math.floor(Math.random() * verts.length)];
        return tentMove2D(this.topology, this.geometry, vertexId, scale);
      }
    } else {
      if (moveType === 'glue') {
        const boundaryFaces = getBoundaryFaces3D(this.topology);
        if (boundaryFaces.length === 0) return { success: false, error: 'No boundary faces' };

        const shuffled = [...boundaryFaces].sort(() => Math.random() - 0.5);
        const maxTries = checkOverlap ? Math.min(this.MAX_OVERLAP_RETRIES, shuffled.length) : 1;

        for (let attempt = 0; attempt < maxTries; attempt++) {
          const faceId = shuffled[attempt % shuffled.length];

          // T30b: Skip frozen boundaries
          if (isBoundaryFrozen(faceId, this.frozenBoundaryElements)) {
            console.debug(`[BoundaryGrowthController] Skipped frozen face (attempt ${attempt + 1})`);
            continue;
          }

          if (checkOverlap) {
            const candidate = this.computeCandidatePosition3D(faceId, scale);
            if (candidate) {
              const allPos = [...candidate.faceVerts, candidate.newP];
              const minDist = scale * 0.3;
              if (tetrahedronOverlaps3D(allPos, this.topology, this.geometry, minDist)) {
                console.debug(`[BoundaryGrowthController] 3D overlap rejected (attempt ${attempt + 1})`);
                continue;
              }
            }
          }

          return glueTetrahedron3D(this.topology, this.geometry, faceId, scale);
        }
        return { success: false, error: 'All glue attempts overlapped' };
      } else {
        const boundaryFaces = getBoundaryFaces3D(this.topology);
        const boundaryVertices = new Set<number>();
        for (const fId of boundaryFaces) {
          const face = this.topology.faces.get(fId);
          if (face) { for (const v of face.vertices) boundaryVertices.add(v); }
        }
        const verts = Array.from(boundaryVertices);
        if (verts.length === 0) return { success: false, error: 'No boundary vertices' };
        const vertexId = verts[Math.floor(Math.random() * verts.length)];
        return tentMove3D(this.topology, this.geometry, vertexId, scale);
      }
    }
  }

  private getBoundarySize(): number {
    if (!this.topology) return 0;
    if (this.params?.dimension === 2) {
      return getBoundaryEdges2D(this.topology).length;
    } else {
      return getBoundaryFaces3D(this.topology).length;
    }
  }

  private createState(lastMove: BoundaryMoveType | null): BoundaryGrowthState {
    if (!this.topology || !this.geometry) {
      throw new Error('Not initialized');
    }

    const prevMoveCount = this.state?.moveCount || { glue: 0, tent: 0 };
    const dimension = this.topology.dimension;
    const totalSimplices =
      dimension === 2 ? this.topology.faces.size : this.topology.tetrahedra.size;

    return {
      step: this.currentStep,
      complex: { topology: this.topology, geometry: this.geometry },
      lastMove,
      moveCount: { ...prevMoveCount },
      boundarySize: this.getBoundarySize(),
      frozenBoundaryElements: new Set(this.frozenBoundaryElements), // T30b: snapshot frozen set
      metrics: {
        totalSimplices,
        vertexCount: this.topology.vertices.size,
        dimension,
        volume: 0,
        curvature: computeEulerCharacteristic(this.topology),
      },
    };
  }
}
