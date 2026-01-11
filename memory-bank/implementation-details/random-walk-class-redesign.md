# Random Walk Class Redesign Implementation Plan

## Motivation and Goals

### Current Problems

- **No State Persistence** - Parameter updates destroy all particle state, causing animation freezes
- **Mixed Responsibilities** - PhysicsRandomWalk handles physics, graph creation, and configuration
- **Tight Coupling** - ParticleManager directly manipulates tsParticle objects with `any` typing
- **CTRW-Specific Contamination** - General interfaces polluted with CTRW-only concepts
- **Memory Issues** - Unbounded trajectory arrays and object creation in hot paths
- **Poor Extensibility** - Single class with conditional logic prevents adding new walk types

### Design Goals

1. **State Preservation** - Parameter updates maintain particle positions and physics state
2. **Separation of Concerns** - Each class has single, well-defined responsibility
3. **Type Safety** - Eliminate `any` typing and provide proper interfaces for each walk type
4. **Memory Efficiency** - Use circular buffers and avoid object allocation in update loops
5. **Extensibility** - Abstract hierarchy supports quantum walks, spin networks, etc.
6. **Performance** - Clean abstractions without runtime overhead

### Success Criteria

- Animation pause/resume works without particle reinitialization
- Parameter sliders update physics without destroying state
- New random walk types can be added with minimal code changes
- Memory usage remains bounded during long simulations
- Type checking catches physics/particle mismatches at compile time

## Abstract Hierarchy Design

### Base Classes

```typescript
// Base abstraction - universal concepts
abstract class AbstractRandomWalk {
  protected currentTime: number;
  protected stepCount: number;
  protected particles: Map<string, Particle> = new Map();

  abstract updateParticle(particle: Particle): void;
  abstract calculateStep(particle: Particle): Step;
  abstract getPhysicsParameters(): Record<string, number>;
  abstract validateParameters(params: any): boolean;
}
```

### Concrete Implementations

```typescript
class CTRWalk extends AbstractRandomWalk {
  private collisionRate: number;
  private velocity: number;
  private jumpLength: number;
}

class StandardBrownianWalk extends AbstractRandomWalk {
  private diffusionConstant: number;
  private fixedTimeStep: number;
}

class GraphRandomWalk extends AbstractRandomWalk {
  private graphManager: GraphManager;
  private transitionProbabilities: Map<string, number>;
}
```

## Implementation Steps

### Phase 1: Create Abstractions

1. `AbstractRandomWalk.ts` - base class with universal methods (~40 lines)
2. `RandomWalkFactory.ts` - factory pattern for walk creation (~50 lines)

### Phase 2: Extract Supporting Classes

5. `GraphManager.ts` - extract graph logic from PhysicsRandomWalk (~80 lines)
6. `PhysicsConfig.ts` - parameter validation and derived calculations (~40 lines)

### Phase 3: Implement Concrete Classes

7. `CTRWalk.ts` - move current PhysicsRandomWalk logic here (~80 lines)
8. `StandardBrownianWalk.ts` - fixed timestep implementation (~60 lines)
9. `GraphRandomWalk.ts` - discrete graph-based walks (~70 lines)

### Phase 4: Update Integration

10. `RandomWalkSimulator.ts` - use factory, preserve state in updateParameters
11. `ParticleManager.ts` - work with AbstractRandomWalk interface
12. `types.ts` - add new interfaces for different walk types

### Phase 5: Cleanup

13. Delete `PhysicsRandomWalk.ts`
14. Update imports in all dependent files
15. Test parameter updates preserve particle state

## Factory Pattern

```typescript
class RandomWalkFactory {
  static create(
    type: "ctrw" | "brownian" | "graph" | "quantum",
    params: any
  ): AbstractRandomWalk {
    switch (type) {
      case "ctrw":
        return new CTRWalk(params);
      case "brownian":
        return new StandardBrownianWalk(params);
      case "graph":
        return new GraphRandomWalk(params);
      case "quantum":
        return new QuantumWalk(params);
      default:
        throw new Error(`Unknown walk type: ${type}`);
    }
  }
}
```

## React Component Implementation vs Class-Based Architecture

### QuantumWalkPage.tsx Implementation (2026-01-11)

**Structure:**
```typescript
const QuantumWalkPage: React.FC = () => {
  // React hooks for state management
  const [quantumData, setQuantumData] = useState<QuantumWalk1DData | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  // Refs for simulation state buffers
  const quantumStateRef = useRef<QuantumWalkState | null>(null);
  
  // Callbacks for simulation logic
  const stepWalk = useCallback(() => {
    // Implementation using ts-quantum library
  }, [decoherence]);
  
  // JSX component structure
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Parameter Panel, Visualization, Analysis, Education views */}
    </div>
  );
};
```

**Key Differences from Class-Based Approach:**
1. **State Management**: React hooks (`useState`, `useRef`, `useCallback`) instead of class properties
2. **UI Integration**: Direct JSX rendering with Tailwind CSS styling
3. **Library Integration**: Uses ts-quantum library for quantum operations instead of custom classes
4. **Component Lifecycle**: useEffect hooks for initialization and cleanup
5. **Styling**: Unified with existing application design system

**Benefits:**
- Seamless integration with existing React application
- Consistent styling and UI patterns
- Leverages existing Plotly.js and component library
- Better state management with React DevTools support
- Simplified deployment and maintenance

**Files:**
- `frontend/src/QuantumWalkPage.tsx` - Main React component (813 lines)
- `memory-bank/implementation-details/quantum-walk-implementation.md` - Technical documentation

## Architecture Approach Comparison

### Approach 1: Abstract Inheritance Hierarchy (Original Proposal)

**Structure:**

```typescript
abstract class AbstractRandomWalk {
  abstract updateParticle(particle: Particle): void;
  abstract calculateStep(particle: Particle): Step;
}

class CTRWalk extends AbstractRandomWalk {
  private collisionRate: number;
  private velocity: number;
}
```

**Benefits:**

- Enforces consistent interface through inheritance
- Code reuse through base class implementations
- Clear conceptual hierarchy (temporal vs spatial)

### Approach 2: Strategy Pattern (Recommended)

**Structure:**

```typescript
interface RandomWalkStrategy {
  updateParticle(particle: Particle): void;
  calculateStep(particle: Particle): Step;
  validateParameters(params: any): boolean;
}

class CTRWStrategy implements RandomWalkStrategy {
  private collisionRate: number;
  private velocity: number;
  private jumpLength: number;
}

class RandomWalkSimulator {
  private strategy: RandomWalkStrategy;
  private particles: Map<string, Particle>;

  updateParameters(params: any): void {
    // Preserve particle state - core problem solved
    this.strategy = StrategyFactory.create(params.type, params);
  }
}
```

**Benefits:**

- Composition over inheritance (more flexible)
- Easy to swap algorithms at runtime
- Single responsibility principle
- No artificial hierarchy constraints
- Solves core state persistence problem directly

### Detailed Comparison Table


| Aspect                   | Abstract Hierarchy              | Strategy Pattern                    | Winner    |
| -------------------------- | --------------------------------- | ------------------------------------- | ----------- |
| **Complexity**           | Moderate (3 inheritance levels) | Low (interfaces + composition)      | Strategy  |
| **State Preservation**   | Requires careful design         | Natural - swap strategy, keep state | Strategy  |
| **Extensibility**        | Clear inheritance paths         | Add new strategies easily           | Strategy  |
| **Code Reuse**           | Base class methods              | Composition and helper utilities    | Hierarchy |
| **Type Safety**          | Strong through inheritance      | Strong through interfaces           | Tie       |
| **Memory Usage**         | Multiple object hierarchies     | Single context + strategy           | Strategy  |
| **Testing**              | Test class hierarchy            | Mock strategy interface only        | Strategy  |
| **Design Clarity**       | Clear conceptual structure      | Simple interface-based              | Hierarchy |
| **Maintenance**          | Changes affect multiple levels  | Changes isolated to strategies      | Strategy  |
| **Implementation Speed** | More upfront structure          | Faster initial implementation       | Strategy  |

### Implementation Effort Comparison


| Task                 | Abstract Hierarchy                | Strategy Pattern                    | Winner    |
| ---------------------- | ----------------------------------- | ------------------------------------- | ----------- |
| Base Infrastructure  | 8-10 files (~300 lines)           | 3-4 files (~150 lines)              | Strategy  |
| Adding New Walk Type | Extend base class, modify factory | Implement interface, add to factory | Tie       |
| Parameter Updates    | State management across hierarchy | Swap strategy object                | Strategy  |
| Testing              | Test inheritance chain            | Test strategy in isolation          | Strategy  |
| Debugging            | Navigate inheritance levels       | Single strategy class               | Strategy  |
| Code Organization    | Clear conceptual structure        | Flatter structure                   | Hierarchy |

### Functional vs OOP Comparison


| Aspect               | Strategy (OOP)                   | Pure Functional                   | Trade-off                |
| ---------------------- | ---------------------------------- | ----------------------------------- | -------------------------- |
| **Syntax**           | `strategy.updateParticle(p)`     | `updateParticle(walkFunction, p)` | OOP: familiar            |
| **State Management** | Strategy object holds parameters | Parameters passed to functions    | Functional: cleaner      |
| **Performance**      | Object creation overhead         | Function call overhead            | Similar                  |
| **Type Safety**      | Interface enforcement            | Function signature types          | Similar                  |
| **Composability**    | Strategy composition             | Function composition              | Functional: more natural |
| **Debugging**        | Object method debugging          | Function call tracing             | Similar                  |

### Recommendation: Strategy Pattern

**Reasons:**

1. **Solves actual problem** - state preservation during parameter updates
2. **Simpler implementation** - fewer files and less code to maintain
3. **Easy migration path** - can refactor current PhysicsRandomWalk incrementally
4. **Better performance** - less object creation overhead
5. **Easier testing** - isolated strategy testing vs full hierarchy

### Migration Plan for Strategy Pattern

**Phase 1: Extract Strategy Interface**

```typescript
interface RandomWalkStrategy {
  updateParticle(particle: Particle): void;
  calculateStep(particle: Particle): Step;
  getPhysicsParameters(): Record<string, number>;
}
```

**Phase 2: Convert PhysicsRandomWalk to CTRWStrategy**

```typescript
class CTRWStrategy implements RandomWalkStrategy {
  // Move existing PhysicsRandomWalk logic here
  // Focus only on CTRW-specific implementation
}
```

**Phase 3: Update RandomWalkSimulator**

```typescript
class RandomWalkSimulator {
  private strategy: RandomWalkStrategy;
  private particles: Map<string, Particle> = new Map();

  updateParameters(params: any): void {
    const newStrategy = this.createStrategy(params.type, params);
    // Key insight: particles persist, only strategy changes
    this.strategy = newStrategy;
  }
}
```

**Phase 4: Update Integration Points**

- RandomWalkSimulator uses RandomWalkStrategy instead of PhysicsRandomWalk
- Parameter updates go through RandomWalkSimulator.updateParameters()
- UI components remain unchanged (same interface)

### Key Benefits of Strategy Approach

1. **Eliminates conditional logic** - no more `if (simulationType === 'graph')`
2. **Type safety** - different parameter sets for each strategy
3. **State preservation** - updateParameters() preserves particle state naturally
4. **Right-sized extensibility** - easy to add strategies when actually needed
5. **Separation of concerns** - each strategy handles one walk type only
6. **Simple testing** - test strategies in isolation
7. # **Functional-style composition** - more modular than inheritance

## File Structure Changes

**New Files:**

- `physics/abstracts/AbstractRandomWalk.ts`
- `physics/implementations/CTRWalk.ts`
- `physics/implementations/StandardBrownianWalk.ts`
- `physics/implementations/GraphRandomWalk.ts`
- `physics/factories/RandomWalkFactory.ts`
- `physics/managers/GraphManager.ts`
- `physics/config/PhysicsConfig.ts`

**Modified Files:**

- `RandomWalkSimulator.ts` - use factory pattern
- `ParticleManager.ts` - work with abstract interface
- `types.ts` - add new type definitions

**Deleted Files:**

- `PhysicsRandomWalk.ts` - logic moved to CTRWalk.ts

## Particle Interface Cleanup

### Current Issues

**1. Inconsistent Particle Definitions**

- `types.ts` has comprehensive 2D/3D Particle interface
- `types/Particle.ts` has minimal 1D interface
- No shared base or proper inheritance

**2. CTRW-Specific Contamination**

- `Particle` includes `lastCollisionTime`, `nextCollisionTime` - only needed for CTRW
- `CollisionEvent` is CTRW-specific but in general types
- `ScalingParams` is CTRW-specific

**3. Memory Issues**

- `trajectory` array grows unbounded
- `CollisionEvent` creates objects on every step

### Proposed Solution

**Unified Particle Interface**

```typescript
interface Particle {
  readonly id: string;
  position: Vector;
  velocity: Vector;
  isActive: boolean;
  trajectory: CircularBuffer<Vector>; // Fixed-size circular buffer
}
```

**Support Classes**

```typescript
class Vector {
  x: number;
  y?: number;
  z?: number;
  magnitude(): number;
  normalize(): Vector;
}

class CircularBuffer<T> {
  private buffer: T[];
  private size: number;
  private index: number;

  push(item: T): void;
  getHistory(): T[];
  clear(): void;
}
```

**Walk-Specific State Management**

```typescript
// CTRW-specific state managed by CTRWStrategy
class CTRWStrategy implements RandomWalkStrategy {
  private collisionTimes: Map<string, number> = new Map(); // particleId -> nextCollisionTime
  private collisionCounts: Map<string, number> = new Map(); // particleId -> count

  updateParticle(particle: Particle): void {
    // Strategy manages its own state, particle stays generic
  }
}
```

### Benefits

- **Single particle interface** - all walk types use the same Particle
- **Memory efficiency** - circular buffers prevent unbounded growth
- **Clean separation** - walk-specific state managed by strategies
- **Performance** - avoid object creation in hot paths
- **Simple maintenance** - one particle definition to maintain

## Final Recommendation

**Choose Strategy Pattern** for the following reasons:

1. **Solves the actual problem** - state persistence during parameter updates
2. **Right-sized complexity** - addresses current needs without over-engineering
3. **Incremental migration** - can refactor existing PhysicsRandomWalk step by step
4. **Maintainable** - simpler to understand, test, and modify
5. **Extensible when needed** - easy to add new strategies for future requirements

## Estimated Implementation Time

**Strategy Pattern Approach**: 4-6 hours total

- Phase 1: Extract interface (1 hour)
- Phase 2: Convert to CTRWStrategy (2 hours)
- Phase 3: Create PhysicsEngine context (1 hour)
- Phase 4: Update integration points (1-2 hours)

**Abstract Hierarchy Approach**: 8-10 hours total (not recommended)

- Significantly more complex with questionable benefits for current needs

## Engine Architecture Implementation

### Dual Engine Execution Flow

```
                               RandomWalkSimulator
                                       |
                          ┌────────────┴────────────┐
                          │                         │
                    LEGACY ENGINE              NEW ENGINE
                   (useNewEngine=false)      (useNewEngine=true)
                          │                         │
                          │                         │
                ┌─────────┴─────────┐     ┌─────────┴─────────┐
                │ LegacySimulation  │     │ EngineSimulation  │
                │ Runner            │     │ Runner            │
                └─────────┬─────────┘     └─────────┬─────────┘
                          │                         │
                          │                         │
                ┌─────────▼─────────┐               │
                │ ParticleManager   │               │
                │   .update(dt)     │               │
                └─────────┬─────────┘               │
                          │                         │
                ┌─────────▼─────────┐               │
                │ CompositeStrategy │◄──────────────┤
                │ (legacy wrapper)  │               │
                └─────────┬─────────┘               │
                          │                         │
                          ├─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                          │                         │                         │
          ┌───────────────▼───────────────┐ ┌───────▼───────┐ ┌───────────────▼───────────────┐
          │ LegacyBallisticStrategy      │ │ PhysicsEngine  │ │ BallisticStrategy             │
          │                              │ │                │ │ (implements both interfaces) │
          │ updateParticle() {           │ │ .step() {      │ │                              │
          │   console.log("[Ballistic]   │ │   Phase A      │ │ preUpdate() - no-op          │
          │     p0 update", ...)         │ │   Phase B      │ │ integrate() - ballistic      │
          │   pos += vel * 0.01          │ │ }              │ │                              │
          │ }                            │ │                │ │ updateParticleWithDt() {     │
          │                              │ │                │ │   pos += vel * dt            │
          │ updateParticleWithDt() {     │ │                │ │ }                            │
          │   pos += vel * dt            │ │                │ │                              │
          │ }                            │ └────────────────┘ │                              │
          └──────────────────────────────┘                    └──────────────────────────────┘
```

### Key Runtime Characteristics

**Legacy Path**

- ParticleManager drives updates via strategy.updateParticleWithDt()
- Fixed timestep (0.01) if using updateParticle() fallback
- CompositeStrategy wraps multiple strategies

**New Engine Path**

- PhysicsEngine orchestrates phased execution (collision → integration)
- Proper variable timestep handling
- Strategies implement both RandomWalkStrategy and PhysicsStrategy

### Verification Logs

```
[RWS] setupSimulationRunner { useNewEngine: false/true }
[RWS] Using LegacySimulationRunner (flag disabled)
[RWS] Using EngineSimulationRunner with direct PhysicsStrategies
[PM] updatePhysicsEngine: new bounds {...}
```
