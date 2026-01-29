import { SimulationController } from '../interfaces/SimulationController';
import {
  SimplicialGrowthState,
  SimplicialGrowthParams,
  MoveType,
} from '../types/simplicial';
import {
  SimplicialComplexTopology,
  SimplicialComplexGeometry,
  createEmptyTopology,
  createInitialTriangleTopology,
  createInitialTetrahedronTopology,
  createEmptyGeometry,
  createTriangleGeometry,
  createTetrahedronGeometry,
  PachnerMove,
  apply1to3,
  apply2to2,
  apply3to1,
  apply1to4,
  apply2to3,
  apply3to2,
  apply4to1,
  computeEulerCharacteristic,
} from '../simplicial';

export class SimplicialGrowthController implements SimulationController<SimplicialGrowthState, SimplicialGrowthParams> {
  private state: SimplicialGrowthState | null = null;
  private history: SimplicialGrowthState[] = [];
  private currentStep = 0;
  private running = false;
  private params: SimplicialGrowthParams | null = null;
  private topology: SimplicialComplexTopology | null = null;
  private geometry: SimplicialComplexGeometry | null = null;

  initialize(params: SimplicialGrowthParams): void {
    console.debug('[SimplicialGrowthController] Initialize with params:', params);
    this.params = params;
    this.currentStep = 0;
    this.running = false;
    this.history = [];

    // Initialize topology and geometry based on dimension
    if (params.dimension === 2) {
      this.topology = createInitialTriangleTopology();
      // Use reasonable initial positions for better expansion
      this.geometry = createTriangleGeometry(400, 300, 120);
    } else {
      this.topology = createInitialTetrahedronTopology();
      // Use reasonable initial positions for better expansion
      this.geometry = createTetrahedronGeometry(400, 300, 0, 80);
    }

    this.state = this.createState(null);
    this.history = [this.state];

    console.debug('[SimplicialGrowthController] Initialized:', {
      dimension: params.dimension,
      dimType: typeof params.dimension,
      vertices: this.topology.vertices.size,
      edges: this.topology.edges.size,
      faces: this.topology.faces.size,
      tets: this.topology.tetrahedra.size,
    });
  }

  step(): SimplicialGrowthState {
    if (!this.params || !this.topology || !this.geometry) {
      throw new Error('Controller not initialized');
    }

    // Select move type based on probabilities and dimension
    const moveType = this.selectMove(this.params.moveProbabilities);
    
    // Apply Pachner move using new core
    const result = this.applyPachnerMove(moveType);
    
    if (!result.success) {
      console.warn('[SimplicialGrowthController] Move failed:', result.error);
      return this.state!;
    }
    
    // Update state
    this.currentStep++;
    this.state = this.createState(moveType);
    this.state.moveCount[moveType]++;
    this.history.push(this.state);

    console.debug('[SimplicialGrowthController] Step', this.currentStep, 'move:', moveType, {
      vertices: this.topology.vertices.size,
      edges: this.topology.edges.size,
      faces: this.topology.faces.size,
      tets: this.topology.tetrahedra.size,
    });
    return this.state;
  }

  reset(): void {
    console.debug('[SimplicialGrowthController] Reset');
    if (this.params) {
      this.initialize(this.params);
    }
  }

  getState(): SimplicialGrowthState {
    if (!this.state) throw new Error('Controller not initialized');
    return this.state;
  }

  getHistory(): SimplicialGrowthState[] {
    return this.history;
  }

  seekToStep(n: number): SimplicialGrowthState {
    if (n < 0 || n >= this.history.length) {
      throw new Error(`Invalid step: ${n}`);
    }
    console.debug('[SimplicialGrowthController] Seeking to step', n);
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


  private selectMove(probabilities: SimplicialGrowthParams['moveProbabilities']): MoveType {
    const rand = Math.random();
    let cumulative = 0;
    
    if (this.params!.dimension === 2) {
      // 2D moves
      if (rand < (cumulative += probabilities['1-3'])) return '1-3';
      if (rand < (cumulative += probabilities['2-2'])) return '2-2';
      return '3-1';
    } else {
      // 3D moves
      if (rand < (cumulative += probabilities['1-4'])) return '1-4';
      if (rand < (cumulative += probabilities['2-3'])) return '2-3';
      if (rand < (cumulative += probabilities['3-2'])) return '3-2';
      return '4-1';
    }
  }

  private applyPachnerMove(moveType: MoveType): { success: boolean; error?: string } {
    if (!this.topology || !this.geometry) {
      return { success: false, error: 'Topology or geometry not initialized' };
    }

    if (this.params!.dimension === 2) {
      // 2D moves
      switch (moveType) {
        case '1-3': {
          // Select a random face
          const faceIds = Array.from(this.topology.faces.keys());
          if (faceIds.length === 0) return { success: false, error: 'No faces available' };
          const faceId = faceIds[Math.floor(Math.random() * faceIds.length)];
          return apply1to3(this.topology, this.geometry, faceId);
        }
        case '2-2': {
          // Select a random edge
          const edgeIds = Array.from(this.topology.edges.keys());
          if (edgeIds.length === 0) return { success: false, error: 'No edges available' };
          const edgeId = edgeIds[Math.floor(Math.random() * edgeIds.length)];
          return apply2to2(this.topology, this.geometry, edgeId);
        }
        case '3-1': {
          // Select a random vertex with exactly 3 incident faces
          const vertexIds = Array.from(this.topology.vertices.keys());
          for (const vertexId of vertexIds) {
            const incidentFaces: number[] = [];
            for (const [fId, f] of this.topology.faces) {
              if (f.vertices.includes(vertexId)) {
                incidentFaces.push(fId);
              }
            }
            if (incidentFaces.length === 3) {
              return apply3to1(this.topology, this.geometry, vertexId);
            }
          }
          return { success: false, error: 'No suitable vertex for 3-1 move' };
        }
        default:
          return { success: false, error: `Invalid 2D move: ${moveType}` };
      }
    } else {
      // 3D moves
      switch (moveType) {
        case '1-4': {
          const tetIds = Array.from(this.topology.tetrahedra.keys());
          if (tetIds.length === 0) return { success: false, error: 'No tetrahedra available' };
          const tetId = tetIds[Math.floor(Math.random() * tetIds.length)];
          return apply1to4(this.topology, this.geometry, tetId);
        }
        case '2-3': {
          // 2-3 move needs a face shared by exactly 2 tetrahedra
          const faceIds = Array.from(this.topology.faces.keys());
          if (faceIds.length === 0) return { success: false, error: 'No faces available' };
          // Shuffle and find a suitable face
          const shuffledFaces = faceIds.sort(() => Math.random() - 0.5);
          for (const faceId of shuffledFaces) {
            const face = this.topology.faces.get(faceId)!;
            const key = `${[...face.vertices].sort((a,b) => a-b).join(',')}`;
            const tets = this.topology.faceToTets.get(key);
            if (tets && tets.length === 2) {
              console.debug(`[SimplicialGrowthController] 2-3 move: face ${faceId} shared by 2 tets`);
              return apply2to3(this.topology, this.geometry, faceId);
            }
          }
          return { success: false, error: 'No face shared by exactly 2 tetrahedra' };
        }
        case '3-2': {
          // 3-2 move needs an edge shared by exactly 3 tetrahedra
          const edgeIds = Array.from(this.topology.edges.keys());
          if (edgeIds.length === 0) return { success: false, error: 'No edges available' };
          const shuffledEdges = edgeIds.sort(() => Math.random() - 0.5);
          for (const edgeId of shuffledEdges) {
            const edge = this.topology.edges.get(edgeId)!;
            const [v0, v1] = edge.vertices;
            let count = 0;
            for (const tet of this.topology.tetrahedra.values()) {
              if (tet.vertices.includes(v0) && tet.vertices.includes(v1)) count++;
            }
            if (count === 3) {
              console.debug(`[SimplicialGrowthController] 3-2 move: edge ${edgeId} shared by 3 tets`);
              return apply3to2(this.topology, this.geometry, edgeId);
            }
          }
          return { success: false, error: 'No edge shared by exactly 3 tetrahedra' };
        }
        case '4-1': {
          // 4-1 move needs a vertex incident to exactly 4 tetrahedra
          const vertexIds = Array.from(this.topology.vertices.keys());
          if (vertexIds.length === 0) return { success: false, error: 'No vertices available' };
          const shuffledVerts = vertexIds.sort(() => Math.random() - 0.5);
          for (const vertexId of shuffledVerts) {
            let count = 0;
            for (const tet of this.topology.tetrahedra.values()) {
              if (tet.vertices.includes(vertexId)) count++;
            }
            if (count === 4) {
              console.debug(`[SimplicialGrowthController] 4-1 move: vertex ${vertexId} incident to 4 tets`);
              return apply4to1(this.topology, this.geometry, vertexId);
            }
          }
          return { success: false, error: 'No vertex incident to exactly 4 tetrahedra' };
        }
        default:
          return { success: false, error: `Invalid 3D move: ${moveType}` };
      }
    }
  }


  private calculateMetrics(): SimplicialGrowthState['metrics'] {
    if (!this.topology) {
      return { totalSimplices: 0, vertexCount: 0, dimension: 2, volume: 0, curvature: 0 };
    }

    const vertexCount = this.topology.vertices.size;
    const dimension = this.topology.dimension;
    
    let totalSimplices = 0;
    let volume = 0;
    
    if (dimension === 2) {
      totalSimplices = this.topology.faces.size;
    } else {
      totalSimplices = this.topology.tetrahedra.size;
    }
    
    // Euler characteristic (topological invariant - should be preserved by Pachner moves)
    const curvature = computeEulerCharacteristic(this.topology);
    
    return {
      totalSimplices,
      vertexCount,
      dimension,
      volume,
      curvature,
    };
  }


  private createState(lastMove: MoveType | null): SimplicialGrowthState {
    if (!this.topology || !this.geometry) {
      throw new Error('Topology or geometry not initialized');
    }

    // Preserve previous move counts
    const prevMoveCount = this.state?.moveCount || {
      '1-4': 0,
      '2-3': 0,
      '3-2': 0,
      '4-1': 0,
      '1-3': 0,
      '2-2': 0,
      '3-1': 0,
    };

    return {
      step: this.currentStep,
      complex: {
        topology: this.topology,
        geometry: this.geometry,
      },
      lastMove,
      moveCount: prevMoveCount,
      metrics: this.calculateMetrics(),
    };
  }
}
