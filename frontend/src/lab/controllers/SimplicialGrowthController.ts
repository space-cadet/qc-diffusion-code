import { SimulationController } from '../interfaces/SimulationController';
import {
  SimplicialGrowthState,
  SimplicialGrowthParams,
  Simplex,
  SimplicialComplex,
  MoveType,
} from '../types/simplicial';

export class SimplicialGrowthController implements SimulationController<SimplicialGrowthState, SimplicialGrowthParams> {
  private state: SimplicialGrowthState | null = null;
  private history: SimplicialGrowthState[] = [];
  private currentStep = 0;
  private running = false;
  private params: SimplicialGrowthParams | null = null;
  private nextSimplexId = 0;
  private nextVertexId = 0;

  initialize(params: SimplicialGrowthParams): void {
    console.debug('[SimplicialGrowthController] Initialize with params:', params);
    this.params = params;
    this.currentStep = 0;
    this.running = false;
    this.history = [];
    this.nextSimplexId = 0;
    this.nextVertexId = params.initialVertices;

    // Initialize with a single tetrahedron (4 vertices, 4 faces)
    const initialComplex: SimplicialComplex = {
      simplices: this.createInitialTetrahedron(),
      vertexCount: params.initialVertices,
      dimension: 3,
    };

    this.state = this.createState(initialComplex, null);
    this.history = [this.state];

    console.debug('[SimplicialGrowthController] Initialized');
  }

  step(): SimplicialGrowthState {
    if (!this.params || !this.state) {
      throw new Error('Controller not initialized');
    }

    // Select move type based on probabilities
    const moveType = this.selectMove(this.params.moveProbabilities);
    
    // Apply Pachner move
    const newComplex = this.applyPachnerMove(this.state.complex, moveType);
    
    // Update state
    this.currentStep++;
    this.state = this.createState(newComplex, moveType);
    this.state.moveCount[moveType]++;
    this.history.push(this.state);

    console.debug('[SimplicialGrowthController] Step', this.currentStep, 'move:', moveType);
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

  private createInitialTetrahedron(): Simplex[] {
    const simplices: Simplex[] = [];
    
    // Create 4 vertices (0, 1, 2, 3)
    // Create all 4 faces (triangles)
    const faces = [
      [0, 1, 2],
      [0, 1, 3],
      [0, 2, 3],
      [1, 2, 3],
    ];

    faces.forEach((vertices, idx) => {
      simplices.push({
        id: this.nextSimplexId++,
        vertices,
        dimension: 2,
      });
    });

    return simplices;
  }

  private selectMove(probabilities: SimplicialGrowthParams['moveProbabilities']): MoveType {
    const rand = Math.random();
    let cumulative = 0;
    
    if (rand < (cumulative += probabilities['1-4'])) return '1-4';
    if (rand < (cumulative += probabilities['2-3'])) return '2-3';
    if (rand < (cumulative += probabilities['3-2'])) return '3-2';
    return '4-1';
  }

  private applyPachnerMove(complex: SimplicialComplex, moveType: MoveType): SimplicialComplex {
    const newComplex = { ...complex, simplices: [...complex.simplices] };

    switch (moveType) {
      case '1-4':
        // 1-4 move: Replace 1 tetrahedron with 4 tetrahedra
        return this.apply1to4Move(newComplex);
      case '2-3':
        // 2-3 move: Replace 2 tetrahedra with 3 tetrahedra
        return this.apply2to3Move(newComplex);
      case '3-2':
        // 3-2 move: Replace 3 tetrahedra with 2 tetrahedra
        return this.apply3to2Move(newComplex);
      case '4-1':
        // 4-1 move: Replace 4 tetrahedra with 1 tetrahedron
        return this.apply4to1Move(newComplex);
    }
  }

  private apply1to4Move(complex: SimplicialComplex): SimplicialComplex {
    // Select a random simplex to subdivide
    if (complex.simplices.length === 0) return complex;
    
    const idx = Math.floor(Math.random() * complex.simplices.length);
    const simplex = complex.simplices[idx];
    
    // Create new vertex at centroid
    const centroidVertex = this.nextVertexId++;
    const [v0, v1, v2] = simplex.vertices;
    
    // Create 4 new simplices from the original
    const newSimplices: Simplex[] = [
      { id: this.nextSimplexId++, vertices: [v0, v1, centroidVertex], dimension: 2 },
      { id: this.nextSimplexId++, vertices: [v0, v2, centroidVertex], dimension: 2 },
      { id: this.nextSimplexId++, vertices: [v1, v2, centroidVertex], dimension: 2 },
    ];
    
    // Replace original with new simplices
    const newComplex = { ...complex, simplices: [...complex.simplices] };
    newComplex.simplices.splice(idx, 1, ...newSimplices);
    newComplex.vertexCount++;
    
    return newComplex;
  }

  private apply2to3Move(complex: SimplicialComplex): SimplicialComplex {
    // Simplified implementation
    return this.apply1to4Move(complex);
  }

  private apply3to2Move(complex: SimplicialComplex): SimplicialComplex {
    // Simplified implementation
    return this.apply1to4Move(complex);
  }

  private apply4to1Move(complex: SimplicialComplex): SimplicialComplex {
    // Simplified implementation
    return this.apply1to4Move(complex);
  }

  private calculateMetrics(complex: SimplicialComplex): SimplicialGrowthState['metrics'] {
    const totalSimplices = complex.simplices.length;
    const vertexCount = complex.vertexCount;
    const dimension = complex.dimension;
    
    // Calculate volume (sum of simplex volumes)
    const volume = complex.simplices.reduce((sum, simplex) => {
      return sum + this.calculateSimplexVolume(simplex);
    }, 0);
    
    // Calculate curvature (simplified)
    const curvature = totalSimplices > 0 ? (vertexCount - totalSimplices) / vertexCount : 0;
    
    return {
      totalSimplices,
      vertexCount,
      dimension,
      volume,
      curvature,
    };
  }

  private calculateSimplexVolume(simplex: Simplex): number {
    // Simplified volume calculation for triangles
    if (simplex.dimension === 2 && simplex.vertices.length === 3) {
      return 1.0; // Unit area
    }
    return 0.5;
  }

  private createState(complex: SimplicialComplex, lastMove: MoveType | null): SimplicialGrowthState {
    return {
      step: this.currentStep,
      complex: {
        simplices: [...complex.simplices],
        vertexCount: complex.vertexCount,
        dimension: complex.dimension,
      },
      lastMove,
      moveCount: {
        '1-4': 0,
        '2-3': 0,
        '3-2': 0,
        '4-1': 0,
      },
      metrics: this.calculateMetrics(complex),
    };
  }
}
