# Modular and Transparent Observables System Redesign

*Created: 2025-09-01 15:25:33 IST*
*Updated: 2025-09-02 00:16:10 IST*

## Executive Summary

This document outlines a phased redesign of the observables system to achieve full transparency, modularity, and real-time visualization capabilities. The implementation follows an incremental approach starting with Phase 0 (middle-path enhancements) to provide immediate benefits while building foundation for the complete query-based system.

**PHASE 0 COMPLETED**: Text-based observable system with per-observable polling intervals successfully implemented in single session (2025-09-02).

## Current System Issues

### Transparency Problems
- ObservableManager uses complex caching and deep copying logic that's hard to debug
- Hardcoded observable classes (MSDObservable, KineticEnergyObservable, etc.)
- Users cannot create custom observables or query arbitrary particle subsets
- No way to access arbitrary physical quantities on-demand

### Modularity Problems
- Good interface separation but tight coupling between manager and implementations  
- No dynamic observable registration system
- Cannot query specific particle properties or subsets
- Missing particle selection/filtering capabilities

### Correctness Issues
- MSD calculation stores initial positions in Map but particles can be created/destroyed
- Cache invalidation tied to timestamp equality (fragile)
- Deep copying particles every update is expensive and unnecessary
- Stale particle references in hooks (recently fixed)

## Modular Observable System Design

### Core Architecture

Replace hardcoded observable classes with a flexible query builder system:

```typescript
interface ObservableQuery {
  id: string;
  selector: ParticleSelector;
  aggregator: AggregationFunction;
  metadata: ObservableMetadata;
}

interface ParticleSelector {
  filter: (particle: Particle) => boolean;
  map?: (particle: Particle) => number | Vector2D;
}

interface AggregationFunction {
  (values: any[], timestamp: number): any;
}
```

### Transparent Query API

Enable users to define observables dynamically:

```typescript
// Example usage
observables.register('subset_momentum', {
  selector: {
    filter: (p) => p.id in selectedIds,
    map: (p) => p.velocity.magnitude
  },
  aggregator: (values) => values.reduce((sum, v) => sum + v, 0)
});

observables.register('particle_42_velocity', {
  selector: {
    filter: (p) => p.id === '42',
    map: (p) => p.velocity
  },
  aggregator: (values) => values[0] || {vx: 0, vy: 0}
});

observables.register('left_half_density', {
  selector: {
    filter: (p) => p.position.x < canvasWidth / 2,
    map: (p) => p.position
  },
  aggregator: (positions, timestamp) => calculateDensity(positions, leftHalfBounds)
});

// Access results
const momentum = observables.get('subset_momentum');
const velocity = observables.get('particle_42_velocity');
const density = observables.get('left_half_density');
```

### Predefined Observable Library

Common observables available as presets:

```typescript
const StandardObservables = {
  totalKineticEnergy: {
    selector: { filter: () => true, map: (p) => 0.5 * p.mass * p.velocity.magnitudeSquared },
    aggregator: (energies) => energies.reduce((sum, e) => sum + e, 0)
  },
  centerOfMass: {
    selector: { filter: () => true, map: (p) => p.position },
    aggregator: (positions) => averagePosition(positions)
  },
  meanSquaredDisplacement: {
    selector: { filter: () => true, map: (p) => p.displacement },
    aggregator: (displacements) => meanSquare(displacements)
  }
};
```

## Real-Time Time Series Visualization

### Data Collection & Storage

```typescript
interface ObservableTimeSeries {
  id: string;
  history: CircularBuffer<TimePoint>;
  maxHistory: number;
  lastUpdate: number;
  
  addPoint(time: number, value: any): void;
  getTimeSeries(): {x: number[], y: number[]};
  clear(): void;
  decimate(factor: number): void;
}

interface TimePoint {
  timestamp: number;
  value: any;
  computeTime?: number;
}

class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private size: number = 0;
  
  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }
  
  push(item: T): void;
  toArray(): T[];
  clear(): void;
}
```

### Live Plotly Integration

```typescript
interface PlotlyTimeSeriesProps {
  observableIds: string[];
  updateFrequency: number;
  maxDataPoints: number;
  autoScale: boolean;
  paused: boolean;
}

const PlotlyTimeSeriesComponent: React.FC<PlotlyTimeSeriesProps> = ({
  observableIds,
  updateFrequency = 10, // Hz
  maxDataPoints = 1000,
  autoScale = true,
  paused = false
}) => {
  // Real-time plotting implementation
  // Multiple observable traces on same plot
  // Throttled updates for performance
  // Auto-scaling axes with zoom controls
};
```

### Observable Selection UI

```typescript
interface ObservableControlsProps {
  availableObservables: ObservableMetadata[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onClearHistory: () => void;
  onPausePlot: (paused: boolean) => void;
}

const ObservableControls: React.FC<ObservableControlsProps> = (props) => {
  // Checkbox list for observable selection  
  // Plot control buttons (pause, clear, zoom, export)
  // History length and update frequency controls
};
```

## Implementation Plan

### Phase 0: Text-Based Observable System (COMPLETED 2025-09-02)

**Objective**: Replace hardcoded observable polling with unified text-based system
**Strategy**: Configuration-driven observables + per-observable polling intervals + generic UI rendering

**COMPLETED SESSION: 2025-09-02 00:16:10 IST**

#### Implementation Summary

**Files Created**:
- `observablesConfig.ts` (73 lines) - Configuration-driven observable definitions with polling intervals
- `useObservablesPolling.ts` (117 lines) - Unified polling hook with configurable intervals per observable

**Files Modified**:
- `ObservablesPanel.tsx` (262 lines, -251 lines) - Complete refactor using text-based system with generic renderer

#### Key Achievements

1. **Unified Polling Architecture**
   - Single polling system replaces 4 separate useEffect hooks
   - Eliminated 8+ individual state variables for observable data
   - 50ms polling resolution with per-observable interval checking
   - Configurable intervals: momentum (50ms), kinetic energy (100ms), particle count (200ms), MSD (500ms)

2. **Text-Based Observable Integration**
   - Built-in observables now use same text definition system as custom observables
   - Consistent observable registration through TextObservable system
   - Fixed ID mapping issue between registration (`text_particleCount`) and retrieval (`particleCount`)

3. **Generic UI Rendering**
   - ObservableDisplay component handles any observable type through configuration
   - Field definitions specify formatting, precision, and color coding
   - Eliminated repetitive JSX patterns across observable types

4. **Performance Optimizations**
   - Reduced ObservablesPanel from 513 to 262 lines (~49% reduction)
   - Eliminated redundant polling logic and state management
   - Improved memory management with unified data flow

#### Technical Implementation

**Configuration Structure**:
```typescript
interface ObservableConfig {
  id: string;
  name: string;
  text: string;
  pollingInterval: number;
  fields: ObservableField[];
}
```

**Polling System**:
- 50ms resolution timer checks each observable's individual interval
- State management through useRef for polling coordination
- Automatic cleanup and registration lifecycle management

**Results Achieved**:
- ✅ Console errors about unregistered observers resolved
- ✅ Observables display actual data instead of "No data"
- ✅ Different polling frequencies working correctly per observable type
- ✅ Text-based observables properly integrated with built-in observables
- ✅ Maintained full backward compatibility with existing UI state management

#### Architecture Benefits

1. **Maintainability**: Single source of truth for observable configuration
2. **Extensibility**: New observables added through configuration, not code changes
3. **Performance**: Optimized polling prevents unnecessary updates
4. **Consistency**: Unified system for both built-in and custom observables
5. **Debugging**: Clear separation between configuration, polling, and rendering

This implementation provides the foundation for Phase 1 query system development while delivering immediate benefits in code maintainability and system performance.

#### Core Components

**1. Observable Registry System** (`ObservableRegistry.ts`, ~200 lines)
- Central registry for all observable types
- Dynamic loading based on configuration
- Plugin-style architecture for easy extension
- Dependency management between observables

```typescript
interface ObservableConfig {
  id: string;
  type: 'builtin' | 'template' | 'composite';
  enabled: boolean;
  config?: any;
  dependencies?: string[];
}

class ObservableRegistry {
  register(config: ObservableConfig): void;
  create(id: string): Observable;
  getDependencies(id: string): string[];
}
```

**2. Template Observable System** (`TemplateObservable.ts`, ~150 lines)
- Generic observables for particle properties
- Configurable aggregation functions
- Common patterns: mean, sum, max, min, distribution

```typescript
interface TemplateConfig {
  property: string; // 'velocity.magnitude', 'position.x', etc.
  aggregation: 'mean' | 'sum' | 'max' | 'min' | 'count';
  filter?: (particle: Particle) => boolean;
}

class TemplateObservable implements Observable {
  constructor(private config: TemplateConfig) {}
}
```

**3. Composite Observable System** (`CompositeObservable.ts`, ~120 lines)
- Combines results from existing observables
- Simple expression evaluation for basic math
- Dependencies automatically managed

```typescript
interface CompositeConfig {
  formula: string; // 'kineticEnergy.total / particleCount.active'
  dependencies: string[];
}

class CompositeObservable implements Observable {
  constructor(private config: CompositeConfig) {}
}
```

**4. Generic UI System** (`ObservablesPanel.tsx`, ~300 lines modified)
- Remove hardcoded imports and state management
- Generic rendering based on registry
- Configuration-driven observable display
- Backward compatibility with existing observables

#### Implementation Files

| File | Type | Lines | Description |
|------|------|-------|-------------|
| `Observable.ts` | MODIFY | ~50 | Add template/composite interfaces |
| `TemplateObservable.ts` | NEW | ~150 | Generic particle property observables |
| `CompositeObservable.ts` | NEW | ~120 | Observable combination system |
| `ObservableRegistry.ts` | NEW | ~200 | Central plugin system |
| `ObservableManager.ts` | MODIFY | ~100 | Registry integration |
| `ObservablesPanel.tsx` | MODIFY | ~300 | Generic rendering |
| `observableConfig.ts` | NEW | ~80 | Default configurations |
| `appStore.ts` | MODIFY | ~50 | Generic state management |

**IMPLEMENTATION COMPLETED**: 500 lines across 6 files

#### Implemented Components
1. **TextObservableParser.ts** (66 lines) - Parses text format to structured definitions
2. **ExpressionEvaluator.ts** (58 lines) - Safe expression evaluation using expr-eval
3. **TextObservable.ts** (80 lines) - Observable implementation using parsed definitions
4. **ObservableManager.ts** (+35 lines) - Integration methods for text observables
5. **appStore.ts** (+15 lines) - Zustand storage for custom observables
6. **ObservablesPanel.tsx** (+60 lines) - UI for creating/managing custom observables

#### Features Delivered
- **Text Format Support**: Simple observable definition syntax with validation
- **Safe Expression Evaluation**: expr-eval library prevents code injection
- **Persistent Storage**: Zustand integration with localStorage persistence
- **UI Integration**: Add/remove custom observables with error handling
- **Backward Compatibility**: Existing observables continue working unchanged
- **Foundation Ready**: Architecture ready for time-series visualization

#### Text Format Example
```
observable "left_momentum" {
  source: particles
  filter: position.x < bounds.width/2
  select: velocity.magnitude
  reduce: sum
}
```

#### Next Phase Requirements
- Analysis page integration for time-series plotting
- Real-time data collection and visualization
- Multiple observable selection and plotting

### Phase 1: Core Query System (Week 1-2)
1. Implement ParticleSelector and AggregationFunction interfaces
2. Create ModularObservableManager with query registration
3. Migrate template observables to full query system
4. Add basic particle filtering and selection capabilities

### Phase 2: Time Series Infrastructure (Week 2-3)
1. Implement CircularBuffer for efficient data storage
2. Add ObservableTimeSeries class with history management
3. Integrate time-series collection into simulation loop
4. Add data decimation for long-running simulations

### Phase 3: Live Visualization (Week 3-4)
1. Install and configure react-plotly.js dependency
2. Implement PlotlyTimeSeriesComponent with real-time updates
3. Add observable selection and plot control UI
4. Optimize rendering performance with throttled updates

### Phase 4: Advanced Features (Week 4-5)
1. Add preset observable library for common calculations
2. Implement observable composition (derived observables)
3. Add export capabilities (CSV, JSON, PNG)
4. Performance optimization and memory management

## Technical Considerations

### Performance Optimizations
- **Throttled Updates**: Plot updates at configurable frequency (10Hz default), not every frame
- **Data Decimation**: Automatic reduction of data points for long runs
- **Lazy Evaluation**: Observables computed only when requested
- **Memory Management**: Circular buffers prevent unbounded memory growth
- **Selective Updates**: Only update plots when data changes significantly

### Integration Points
- Hook into existing simulation loop for data collection
- Extend ObservableManager with time-series recording
- Add plot controls to existing UI panels
- Maintain backward compatibility with current observable usage

### Error Handling
- Graceful degradation when observables fail to compute
- User feedback for invalid observable queries
- Automatic recovery from plot rendering errors
- Data validation for time-series integrity

## Migration Strategy

### Phase 0 Migration (Active)
- **Backward Compatibility**: Existing ObservablesPanel continues working during transition
- **Incremental Adoption**: Observables migrated one-by-one to registry system
- **Configuration Override**: Hard-coded observables can be disabled/replaced via config
- **Fallback System**: Registry falls back to direct instantiation if config missing
- **Risk Mitigation**: All changes are additive, existing functionality preserved

### Full System Migration (Phases 1-4)
- Current observable classes wrapped in new query system
- Gradual migration of hardcoded observables to modular system
- Template observables become query system presets

### Testing Strategy
- Unit tests for all new observable query components
- Integration tests for time-series data collection
- Performance tests for large datasets and long simulations
- Visual regression tests for plot rendering

### Documentation Requirements
- API documentation for query system
- Examples of common observable patterns
- Performance tuning guidelines
- Migration guide for existing observables

## Expected Benefits

### For Users
- **Full Transparency**: Access any particle property or subset on-demand
- **Real-time Insights**: Live plots of observable evolution during simulation
- **Custom Analytics**: Define domain-specific observables without code changes
- **Better Debugging**: Visual feedback on simulation behavior and parameter effects

### For Developers  
- **Modular Design**: Easy to add new observable types and aggregation functions
- **Performance**: Efficient data structures and optimized rendering
- **Maintainability**: Clear separation of concerns between data collection and visualization
- **Extensibility**: Plugin-like architecture for custom observable definitions

## Success Criteria

1. **Transparency**: Any particle property accessible via simple query interface
2. **Modularity**: New observables added without modifying core system
3. **Performance**: Real-time plotting with <50ms update latency for 1000 particles  
4. **Usability**: Intuitive UI for observable selection and plot controls
5. **Reliability**: Stable operation during long simulations without memory leaks

This redesign transforms the observables system from a rigid, hardcoded approach to a flexible, transparent, and powerful analytics platform suitable for both interactive exploration and quantitative analysis.
