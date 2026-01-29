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
  createTriangleGeometry,
  createTetrahedronGeometry,
  computeEulerCharacteristic,
  getBoundaryEdges2D,
  getBoundaryFaces3D,
  glueTriangle2D,
  glueTetrahedron3D,
  tentMove2D,
  tentMove3D,
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

  initialize(params: BoundaryGrowthParams): void {
    console.debug('[BoundaryGrowthController] Initialize with params:', params);
    this.params = params;
    this.currentStep = 0;
    this.running = false;
    this.history = [];

    if (params.dimension === 2) {
      this.topology = createInitialTriangleTopology();
      this.geometry = createTriangleGeometry(400, 300, 120);
    } else {
      this.topology = createInitialTetrahedronTopology();
      this.geometry = createTetrahedronGeometry(400, 300, 0, 80);
    }

    this.state = this.createState(null);
    this.history = [this.state];
    console.debug('[BoundaryGrowthController] Initialized:', {
      dimension: params.dimension,
      vertices: this.topology.vertices.size,
      boundarySize: this.state.boundarySize,
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

  private applyMove(moveType: BoundaryMoveType): { success: boolean; error?: string } {
    if (!this.topology || !this.geometry || !this.params) {
      return { success: false, error: 'Not initialized' };
    }

    const scale = this.params.growthScale;

    if (this.params.dimension === 2) {
      if (moveType === 'glue') {
        const boundaryEdges = getBoundaryEdges2D(this.topology);
        if (boundaryEdges.length === 0) return { success: false, error: 'No boundary edges' };
        const edgeId = boundaryEdges[Math.floor(Math.random() * boundaryEdges.length)];
        return glueTriangle2D(this.topology, this.geometry, edgeId, scale);
      } else {
        // Tent move: pick a random boundary vertex
        const boundaryEdges = getBoundaryEdges2D(this.topology);
        const boundaryVertices = new Set<number>();
        for (const eId of boundaryEdges) {
          const edge = this.topology.edges.get(eId);
          if (edge) {
            boundaryVertices.add(edge.vertices[0]);
            boundaryVertices.add(edge.vertices[1]);
          }
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
        const faceId = boundaryFaces[Math.floor(Math.random() * boundaryFaces.length)];
        return glueTetrahedron3D(this.topology, this.geometry, faceId, scale);
      } else {
        const boundaryFaces = getBoundaryFaces3D(this.topology);
        const boundaryVertices = new Set<number>();
        for (const fId of boundaryFaces) {
          const face = this.topology.faces.get(fId);
          if (face) {
            for (const v of face.vertices) boundaryVertices.add(v);
          }
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
