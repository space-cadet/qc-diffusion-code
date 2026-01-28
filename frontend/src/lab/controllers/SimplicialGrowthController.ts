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

    // Initialize based on dimension
    const initialComplex: SimplicialComplex = {
      simplices: params.dimension === 2 ? this.createInitialTriangle() : this.createInitialTetrahedron(),
      vertexCount: params.initialVertices,
      dimension: params.dimension,
      vertexPositions: this.createInitialVertexPositions(params.dimension, params.initialVertices),
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

  private createInitialTriangle(): Simplex[] {
    const simplices: Simplex[] = [];
    
    // Create a single triangle (3 vertices, 1 face)
    simplices.push({
      id: this.nextSimplexId++,
      vertices: [0, 1, 2],
      dimension: 2, // In 2D, triangles are 2-simplices
    });

    return simplices;
  }

  private createInitialVertexPositions(dimension: number, vertexCount: number): Map<number, { x: number; y: number }> {
    const positions = new Map<number, { x: number; y: number }>();
    
    if (dimension === 2) {
      // For 2D, create an equilateral triangle for initial state
      if (vertexCount === 3) {
        const centerX = 300;
        const centerY = 200;
        const radius = 100;
        
        positions.set(0, { x: centerX, y: centerY - radius });
        positions.set(1, { x: centerX - radius * 0.866, y: centerY + radius * 0.5 });
        positions.set(2, { x: centerX + radius * 0.866, y: centerY + radius * 0.5 });
      } else {
        // For more vertices, use circular layout
        const centerX = 300;
        const centerY = 200;
        const radius = 100;
        
        for (let i = 0; i < vertexCount; i++) {
          const angle = (2 * Math.PI * i) / vertexCount;
          positions.set(i, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          });
        }
      }
    }
    
    return positions;
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

    // Handle 2D moves
    if (complex.dimension === 2) {
      switch (moveType) {
        case '1-3':
          // 1-3 move: Replace 1 triangle with 3 triangles
          return this.apply1to3Move(newComplex);
        case '2-2':
          // 2-2 move: Replace 2 triangles with 2 triangles (flip edge)
          return this.apply2to2Move(newComplex);
        case '3-1':
          // 3-1 move: Replace 3 triangles with 1 triangle
          return this.apply3to1Move(newComplex);
        default:
          // Invalid move for 2D
          console.warn(`[SimplicialGrowthController] Invalid 2D move: ${moveType}`);
          return newComplex;
      }
    }

    // Handle 3D moves
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
      default:
        // Invalid move for 3D
        console.warn(`[SimplicialGrowthController] Invalid 3D move: ${moveType}`);
        return newComplex;
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
    // Simplified volume calculation
    if (simplex.dimension === 2 && simplex.vertices.length === 3) {
      return 1.0; // Unit area for triangles
    }
    return 0.5; // Default volume
  }

  // 2D Pachner moves for triangulations
  private apply1to3Move(complex: SimplicialComplex): SimplicialComplex {
    // 1-3 move: Subdivide one triangle into three triangles by adding a vertex at the center
    if (complex.simplices.length === 0) return complex;
    
    const idx = Math.floor(Math.random() * complex.simplices.length);
    const simplex = complex.simplices[idx];
    
    // Get positions of the triangle's vertices
    const pos0 = complex.vertexPositions.get(simplex.vertices[0]);
    const pos1 = complex.vertexPositions.get(simplex.vertices[1]);
    const pos2 = complex.vertexPositions.get(simplex.vertices[2]);
    
    if (!pos0 || !pos1 || !pos2) return complex;
    
    // Calculate centroid position
    const centroidX = (pos0.x + pos1.x + pos2.x) / 3;
    const centroidY = (pos0.y + pos1.y + pos2.y) / 3;
    
    // Create new vertex at centroid
    const centroidVertex = this.nextVertexId++;
    const newPositions = new Map(complex.vertexPositions);
    newPositions.set(centroidVertex, { x: centroidX, y: centroidY });
    
    const [v0, v1, v2] = simplex.vertices;
    
    // Create 3 new triangles from the original
    const newSimplices: Simplex[] = [
      { id: this.nextSimplexId++, vertices: [v0, v1, centroidVertex], dimension: 2 },
      { id: this.nextSimplexId++, vertices: [v1, v2, centroidVertex], dimension: 2 },
      { id: this.nextSimplexId++, vertices: [v2, v0, centroidVertex], dimension: 2 },
    ];
    
    // Replace original with new simplices
    const newComplex = { 
      ...complex, 
      simplices: [...complex.simplices],
      vertexPositions: newPositions,
    };
    newComplex.simplices.splice(idx, 1, ...newSimplices);
    newComplex.vertexCount++;
    
    return newComplex;
  }

  private apply2to2Move(complex: SimplicialComplex): SimplicialComplex {
    const triangles = complex.simplices.filter(s => s.dimension === 2);
    if (triangles.length < 2) return complex;

    // Find two adjacent triangles sharing a common edge
    for (let i = 0; i < triangles.length; i++) {
      for (let j = i + 1; j < triangles.length; j++) {
        const t1 = triangles[i];
        const t2 = triangles[j];

        const commonVertices = t1.vertices.filter(v => t2.vertices.includes(v));

        if (commonVertices.length === 2) {
          // Found two triangles sharing a common edge
          const [vA, vB] = commonVertices;
          const vC = t1.vertices.find(v => v !== vA && v !== vB)!;
          const vD = t2.vertices.find(v => v !== vA && v !== vB)!;

          // Ensure vC and vD are distinct (no self-loops or degenerate cases)
          if (vC === vD) continue;

          // Create two new triangles with the flipped edge (vC-vD becomes the new edge)
          const newSimplex1: Simplex = { id: this.nextSimplexId++, vertices: [vA, vC, vD], dimension: 2 };
          const newSimplex2: Simplex = { id: this.nextSimplexId++, vertices: [vB, vC, vD], dimension: 2 };

          // Create a new complex to avoid modifying the original directly
          const newComplex = {
            ...complex,
            simplices: complex.simplices.filter(s => s.id !== t1.id && s.id !== t2.id),
            vertexPositions: new Map(complex.vertexPositions),
          };

          // Add the new flipped triangles
          newComplex.simplices.push(newSimplex1, newSimplex2);

          return newComplex;
        }
      }
    }

    // No adjacent triangles found, return original complex
    return complex;
  }

  private apply3to1Move(complex: SimplicialComplex): SimplicialComplex {
    const triangles = complex.simplices.filter(s => s.dimension === 2);
    if (triangles.length < 3) return complex;

    // Find a vertex that is shared by exactly three triangles
    for (let vertexId = 0; vertexId < complex.vertexCount; vertexId++) {
      const trianglesAroundVertex = triangles.filter(t => t.vertices.includes(vertexId));
      
      if (trianglesAroundVertex.length === 3) {
        // Found three triangles around this vertex
        const [t1, t2, t3] = trianglesAroundVertex;
        
        // Get the other vertices (not the central one)
        const otherVertices = [
          t1.vertices.find(v => v !== vertexId)!,
          t2.vertices.find(v => v !== vertexId)!,
          t3.vertices.find(v => v !== vertexId)!
        ];
        
        // Ensure we have three distinct other vertices
        const uniqueOthers = [...new Set(otherVertices)];
        if (uniqueOthers.length === 3) {
          // Create one larger triangle from the three outer vertices
          const newSimplex: Simplex = {
            id: this.nextSimplexId++,
            vertices: uniqueOthers,
            dimension: 2,
          };
          
          // Create new complex without the three original triangles
          const newComplex = {
            ...complex,
            simplices: complex.simplices.filter(s => 
              s.id !== t1.id && s.id !== t2.id && s.id !== t3.id
            ),
            vertexPositions: new Map(complex.vertexPositions),
          };
          
          // Add the new merged triangle
          newComplex.simplices.push(newSimplex);
          
          return newComplex;
        }
      }
    }

    // No suitable vertex found, return original complex
    return complex;
  }

  private createState(complex: SimplicialComplex, lastMove: MoveType | null): SimplicialGrowthState {
    return {
      step: this.currentStep,
      complex: {
        simplices: [...complex.simplices],
        vertexCount: complex.vertexCount,
        dimension: complex.dimension,
        vertexPositions: new Map(complex.vertexPositions),
      },
      lastMove,
      moveCount: {
        '1-4': 0,
        '2-3': 0,
        '3-2': 0,
        '4-1': 0,
        '1-3': 0,
        '2-2': 0,
        '3-1': 0,
      },
      metrics: this.calculateMetrics(complex),
    };
  }
}
