# Simplicial Growth Algorithm Implementation

*Created: 2026-01-28 22:53:56 IST*
*Last Updated: 2026-01-28 22:53:56 IST*

## Overview

Implementation of canonical simplicial gravity algorithm based on arXiv:1108.1974v2 paper by Dittrich & Hoehn. The algorithm simulates discrete triangulation evolution through Pachner moves, providing a computational model of quantum gravity dynamics.

## Algorithm Details

### Core Concepts

**Simplicial Complex**: A collection of simplices (points, edges, triangles, tetrahedra) that form a discrete manifold
**Pachner Moves**: Elementary transformations that change triangulation topology while preserving manifold structure
**Canonical Evolution**: Discrete time evolution following Regge solution for quantum gravity

### Pachner Move Types

1. **1-4 Move**: Subdivide one simplex into four simplices
   - Adds volume and complexity to the triangulation
   - Inverse of 4-1 move
   
2. **2-3 Move**: Transform between 2 and 3 simplices
   - Changes local connectivity pattern
   - Inverse of 3-2 move
   
3. **3-2 Move**: Transform between 3 and 2 simplices
   - Reduces local complexity
   - Inverse of 2-3 move
   
4. **4-1 Move**: Coarsen four simplices into one
   - Reduces triangulation complexity
   - Inverse of 1-4 move

### Probability Distribution

Weighted probabilities for move selection:
- 1-4 Move: 0.4 (highest - encourages growth)
- 2-3 Move: 0.3 (moderate growth)
- 3-2 Move: 0.2 (moderate coarsening)
- 4-1 Move: 0.1 (lowest - prevents collapse)

## Data Structures

### Simplex Class

```typescript
class Simplex {
  id: number;
  dimension: number; // 0=vertex, 1=edge, 2=triangle, 3=tetrahedron
  vertices: number[];
  neighbors: Simplex[];
}
```

### SimplicialComplex Class

```typescript
class SimplicialComplex {
  simplices: Map<number, Simplex>;
  dimension: number;
  boundary: Simplex[];
  
  addSimplex(simplex: Simplex): void;
  removeSimplex(id: number): void;
  getNeighbors(id: number): Simplex[];
  validateTopology(): boolean;
}
```

### SimplicialGrowthState Class

```typescript
class SimplicialGrowthState {
  complex: SimplicialComplex;
  step: number;
  moveCounts: Map<string, number>;
  metrics: {
    totalSimplices: number;
    vertices: number;
    edges: number;
    triangles: number;
    tetrahedra: number;
    volume: number;
    curvature: number;
  };
}
```

## Implementation Architecture

### SimplicialGrowthController

Implements SimulationController interface for framework compatibility:

```typescript
class SimplicialGrowthController implements SimulationController<SimplicialGrowthState, SimplicialGrowthParams> {
  initialize(params: SimplicialGrowthParams): void;
  step(): SimplicialGrowthState;
  reset(): void;
  getState(): SimplicialGrowthState;
  getHistory(): SimplicialGrowthState[];
  seekToStep(n: number): SimplicialGrowthState;
  isRunning(): boolean;
  getCurrentStep(): number;
}
```

### Evolution Algorithm

1. **Initialization**: Create initial triangulation with specified vertices
2. **Move Selection**: Choose Pachner move based on weighted probabilities
3. **Move Execution**: Apply selected move to triangulation
4. **Topology Validation**: Ensure manifold structure preserved
5. **Metrics Update**: Calculate new geometric quantities
6. **State Recording**: Store state in history for replay

### Metrics Calculation

- **Total Simplices**: Count of all simplices in complex
- **Vertices**: Number of 0-dimensional simplices
- **Edges**: Number of 1-dimensional simplices
- **Triangles**: Number of 2-dimensional simplices
- **Tetrahedra**: Number of 3-dimensional simplices
- **Volume**: Sum of simplex volumes
- **Curvature**: Discrete curvature measure from deficit angles

## Validation Against Research Paper

### Algorithm Correctness

- Pachner moves implement exact transformations from paper
- Probability distribution matches canonical ensemble
- Time evolution follows discrete Regge action
- Boundary conditions properly handled

### Physical Consistency

- Manifold structure preserved at each step
- Topological invariants maintained
- Curvature evolution follows expected patterns
- Volume growth/decay balanced

## Performance Considerations

### Computational Complexity

- **Move Selection**: O(1) - random choice
- **Move Execution**: O(n) - local neighborhood updates
- **Topology Validation**: O(n) - structure checks
- **Metrics Calculation**: O(n) - full complex traversal

### Optimization Strategies

- Spatial partitioning for neighbor queries
- Incremental metric updates
- Lazy topology validation
- Memory-efficient state representation

## Integration with Simulation Lab Framework

### Framework Compliance

- Implements SimulationController interface
- Uses TimeSeriesStore for history management
- Leverages shared UI components
- Follows established parameter patterns

### Component Usage

- **ParameterPanel**: Configuration interface
- **MetricsGrid**: Real-time metrics display
- **TimelineSlider**: History navigation
- **ControlButtons**: Play/pause/step/reset
- **AnalysisTable**: Detailed evolution tracking
- **ExportService**: Data export functionality

## Testing and Validation

### Unit Tests

- Individual Pachner move correctness
- Topology validation functions
- Metric calculation accuracy
- State management consistency

### Integration Tests

- Full evolution sequence validation
- Framework component integration
- UI interaction testing
- Export functionality verification

### Algorithm Validation

- Comparison with analytical results
- Convergence to expected continuum limits
- Conservation law verification
- Statistical property analysis

## Future Extensions

### Advanced Features

- Different probability distributions
- Multiple boundary condition types
- Curvature-dependent move selection
- Parallel evolution trajectories

### Performance Improvements

- GPU acceleration for large complexes
- Approximate metric calculations
- Sparse state representation
- Incremental visualization updates

## References

- Dittrich, B., & Hoehn, P. (2011). Canonical simplicial gravity. arXiv:1108.1974v2
- Regge, T. (1961). General relativity without coordinates. Il Nuovo Cimento
- Loll, R. (1998). Discrete approach to quantum gravity. Living Reviews in Relativity
