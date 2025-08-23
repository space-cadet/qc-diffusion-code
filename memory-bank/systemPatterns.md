# System Patterns
*Created: 2025-08-20 08:31:32 IST*
*Last Updated: 2025-08-24 00:02:35 IST*

## Architecture Overview
Advanced hybrid client-server architecture with GPU acceleration, modular physics engines, and comprehensive state management for high-performance scientific computing simulations.

## Core Design Patterns

### 1. Strategy Pattern Physics Engine
**Implementation**: `frontend/src/physics/strategies/`
**Purpose**: Modular physics simulation architectures supporting multiple random walk approaches
**Key Components**:
- `RandomWalkStrategy` interface defining common physics operations
- `CTRWStrategy.ts` - Continuous Time Random Walk implementation with exponential collision timing
- `SimpleStrategy.ts` - Basic random walk for educational comparison
- `LévyStrategy.ts` - Lévy flight implementation for anomalous diffusion
- `FractionalStrategy.ts` - Fractional derivative random walks

**Benefits**:
- Runtime strategy switching without code changes
- Isolated testing of individual physics approaches
- Easy extension for new physics models
- Parameter-specific optimization per strategy

### 2. Observer Pattern for Numerical Observables
**Implementation**: `frontend/src/physics/ObservableManager.ts`
**Purpose**: Lazy evaluation system for numerical quantities with temporal consistency
**Architecture**:
```typescript
interface Observable {
  id: string;
  calculate(particles: Particle[], time: number): number;
  reset(): void;
}

class ObservableManager {
  private observables: Map<string, Observable>;
  private cache: Map<string, {value: number, timestamp: number}>;
  
  registerObservable(observable: Observable): void;
  updateAll(particles: Particle[], time: number): void;
  getValue(id: string): number;
}
```

**Implemented Observables**:
- `ParticleCountObservable` - Real-time particle tracking
- `KineticEnergyObservable` - Energy conservation monitoring
- `MomentumObservable` - Momentum conservation tracking
- `DensityMomentsObservable` - Statistical moment calculations

### 3. GPU-Accelerated WebGL Solver Pattern
**Implementation**: `frontend/src/webgl/webgl-solver.js`
**Purpose**: Fragment shader-based PDE solving with 100x performance improvement
**Pipeline Architecture**:
```
Parameter Updates → Shader Compilation → GPU Texture Upload → 
Fragment Shader Execution → Texture Download → Visualization Update
```

**Key Features**:
- Dynamic GLSL shader generation for different equation types
- Double-buffered texture system for temporal evolution
- Multi-equation support (telegraph, diffusion, Wheeler-DeWitt)
- Conservation monitoring with real-time validation
- Floating-point texture support with cross-platform fallbacks

### 4. Advanced State Management Pattern
**Implementation**: `frontend/src/stores/appStore.ts`
**Purpose**: Comprehensive application state with persistence and restoration
**Architecture**:
```typescript
interface AppState {
  // UI state with grid layout persistence
  randomWalkSimLayouts: Layout[];
  randomWalkUIState: CollapsibleStates;
  
  // Physics simulation state
  randomWalkSimulationState: {
    particles: ParticleData[];
    densityHistory: DensitySnapshot[];
    observableData: ObservableSnapshot[];
    simulationTime: number;
    collisionCounts: number;
  };
}
```

**Features**:
- Automatic localStorage persistence with 2-second intervals
- Complete simulation state restoration across browser sessions
- UI layout preservation (panel positions, sizes, collapsed states)
- Physics data persistence (particle positions, velocities, collision histories)

### 5. Coordinate System Abstraction Pattern
**Implementation**: `frontend/src/physics/ParticleManager.ts`
**Purpose**: Clean separation between physics simulation space and rendering coordinates
**Mapping Functions**:
```typescript
class ParticleManager {
  // Physics space: [-200, +200] for mathematical calculations
  // Canvas space: [0, canvasWidth] for rendering and UI
  
  mapToCanvas(physicsPos: number): number;
  mapToPhysics(canvasPos: number): number;
  setCanvasSize(width: number, height: number): void;
}
```

**Benefits**:
- Physics calculations in natural mathematical coordinates
- Rendering in pixel-based canvas coordinates
- Automatic scaling for different canvas sizes
- Boundary condition enforcement in physics space

### 6. Dual Visualization Architecture
**Implementation**: `frontend/src/RandomWalkSim.tsx`
**Purpose**: Support for both continuum particle simulations and discrete graph networks
**Rendering Systems**:
- **tsParticles Integration**: Real-time particle visualization with custom physics override
- **Sigma.js Integration**: Graph network visualization with arbitrary topologies
- **Conditional Rendering**: UI components adapt to selected simulation type
- **Graph-Core Integration**: Support for lattice, path, complete, and custom graph structures

## Advanced Architectural Patterns

### 7. Tessellation-Based GPU AMR (Planned)
**Purpose**: Adaptive mesh refinement using gaming industry GPU tessellation techniques
**Implementation Strategy**:
```glsl
// Tessellation Control Shader - determines subdivision levels
layout(vertices = 4) out;
uniform float adaptiveThreshold;
uniform sampler2D gradientTexture;

void main() {
    vec4 gradients = texture(gradientTexture, patchCoords[gl_InvocationID]);
    float tessLevel = computeAdaptiveLevel(gradients, adaptiveThreshold);
    gl_TessLevelOuter[gl_InvocationID] = tessLevel;
}
```

**Hardware Acceleration**: Leverages dedicated GPU tessellation units for real-time adaptive subdivision

### 8. Component Composition Architecture
**Implementation**: React component composition with separation of concerns
**Structure**:
```
RandomWalkSim (Container)
├── ParameterPanel (Physics Controls)
├── ParticleCanvas (Visualization)
├── DensityComparison (Analysis)
├── ObservablesPanel (Monitoring)
├── HistoryPanel (Session Management)
└── ExportPanel (Data Export)
```

**Benefits**:
- Modular component development and testing
- Independent state management per component
- Reusable UI components across different simulation types
- Clean separation between physics, visualization, and controls

## Technology Stack Evolution

### Core Technologies
- **Frontend**: React 18.3.1, TypeScript, Vite 5.4.1, WebGL 2.0
- **Physics**: Custom CTRW implementation, tsParticles, Sigma.js
- **State Management**: Zustand with localStorage persistence
- **Visualization**: Canvas 2D, WebGL shaders, Plotly.js
- **Testing**: Jest with comprehensive unit and integration tests
- **Build**: pnpm workspace with monorepo architecture
- **Deployment**: Vercel with optimized build pipeline

### Mathematical Libraries
- **@spin-network/graph-core**: Graph theory and network topologies
- **Box-Muller Transform**: Gaussian random number generation
- **Spatial Binning**: Custom 2D density calculation algorithms
- **Conservation Monitoring**: Energy and momentum tracking systems

### Performance Optimizations
- **WebGL GPU Acceleration**: 100x improvement over CPU PDE solving
- **Real-time Animation**: 60fps particle simulation with efficient rendering
- **Memory Management**: Circular buffers for trajectory storage
- **Lazy Evaluation**: Observer pattern prevents unnecessary calculations
- **Coordinate Caching**: Optimized coordinate transformation algorithms

## Design Principles

### Scientific Computing Focus
- **Mathematical Accuracy**: Proper scaling limits and conservation laws
- **Numerical Stability**: Error monitoring and adaptive timestep control
- **Reproducibility**: Deterministic random number generation with seed control
- **Validation**: Comparison against analytical solutions for verification

### Educational Visualization
- **Interactive Exploration**: Real-time parameter adjustment with immediate visual feedback
- **Conceptual Clarity**: Clear demonstration of stochastic-to-deterministic transitions
- **Professional Presentation**: Modern UI with scientific visualization standards
- **Data Export**: Research-quality figure generation and data extraction

### Production Quality
- **Type Safety**: TypeScript strict mode across entire codebase
- **Testing Coverage**: Unit tests, integration tests, and mathematical verification
- **Error Handling**: Comprehensive error boundaries and graceful degradation
- **Performance Monitoring**: Real-time FPS and computation time tracking
- **Cross-Platform**: Browser compatibility with WebGL acceleration support

### Maintainable Architecture
- **Separation of Concerns**: Clear boundaries between physics, visualization, and UI
- **Modular Design**: Independent components with well-defined interfaces  
- **Documentation**: Comprehensive inline documentation and memory bank system
- **Version Control**: Semantic versioning with detailed changelog maintenance
