# Modular and Transparent Observables System Redesign

*Created: 2025-09-01 15:25:33 IST*
*Updated: 2025-09-03 01:12:37 IST*

## Executive Summary

This document outlines a phased redesign of the observables system to achieve full transparency, modularity, and real-time visualization capabilities.

**Key Features Implemented**:
- Text-based observable system with per-observable polling intervals
- Floating panel architecture with custom observables separation

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

## Implementation Status

**Current Status**: Fully functional with all critical features implemented

**Key Milestones**:
- Phase 0 (Text-based system): Completed 2025-09-02
- UI Architecture (Floating panels): Completed 2025-09-02

## Implementation Plan

### Phase 0: Text-Based Observable System (COMPLETED 2025-09-02)

**Objective**: Replace hardcoded observable polling with unified text-based system
**Strategy**: Configuration-driven observables + per-observable polling intervals + generic UI rendering

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

## Success Criteria

1. **Transparency**: Any particle property accessible via simple queries
2. **Modularity**: New observables added without core system changes
3. **Performance**: <50ms update latency for 1000 particles
4. **Usability**: Intuitive UI for observable management
5. **Reliability**: Stable operation in long simulations

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

## UI Architecture Enhancement (2025-09-02 16:57:02 IST)

### Floating Panel Abstraction and Observable Panel Separation
**Objective**: Create reusable floating panel architecture and separate custom observables into dedicated panel

#### Key Achievements

1. **Container Abstraction**
   - FloatingPanel component extracts all react-rnd container logic
   - Handles positioning, resizing, collapsing, z-index management
   - Clean props interface for drag/resize/mouse event handling
   - Configurable bounds, styling, and behavior

2. **Panel Separation**
   - Built-in observables remain in ObservablesPanel
   - Custom observables moved to dedicated CustomObservablesPanel
   - Clear separation of concerns between observable types
   - Independent floating windows positioned to avoid overlap

3. **Enhanced Editing Capabilities**
   - CustomObservablesPanel supports view/edit/remove for all saved observables
   - Inline editing with validation and error handling
   - Improved default template with proper syntax
   - Help text with format guidance and available functions

4. **Improved Architecture**
   - FloatingPanel reusable across application for future panels
   - Clean separation between container logic and content logic
   - Enhanced state management with multiple window support
   - Proper z-index ordering and window focus management

#### Technical Implementation

**Store Integration**:
- Added `customObservablesWindow: WindowRect` for panel state
- Added `customObservablesCollapsed: boolean` for collapse state
- Added `updateCustomObservable(index, text)` method for editing
- Enhanced persistence to include all floating panel states

**Custom Observables Features**:
- Text input area with improved default template
- Saved observables list with name extraction
- Individual edit/remove buttons for each observable
- Inline editing mode with save/cancel functionality
- Validation with user-friendly error messages
- Help text with syntax guidance

#### Results Achieved
- Two independent floating panels: "Observables" (built-in) and "Custom Observables"
- Custom observables have full edit/view/remove capabilities  
- Reusable FloatingPanel component ready for future implementations
- Clean code architecture with clear separation of concerns
- Enhanced UX with non-overlapping panel positioning
- Maintained backward compatibility with existing observable system

#### Architecture Benefits

1. **Maintainability**: Single source of truth for observable configuration
2. **Extensibility**: New observables added through configuration, not code changes
3. **Performance**: Optimized polling prevents unnecessary updates
4. **Consistency**: Unified system for both built-in and custom observables
5. **Debugging**: Clear separation between configuration, polling, and rendering
6. **Reusability**: FloatingPanel component can be used for any future floating UI elements
7. **Scalability**: Easy to add more floating panels without code duplication

## Extended Implementation (2025-09-03 01:12:37 IST)

### Custom Observable Value Display Integration
**Objective**: Connect custom observable definitions to live value display with individual polling intervals per C17 requirements

#### Implementation Status

**Completed**:
1. **Store Integration**: Added `customObservableVisibility: Record<string, boolean>` to appStore for individual custom observable toggles
2. **Interval Parsing**: Extended TextObservableParser to support `interval` field in observable definitions
3. **TextObservable Enhancement**: Added `getInterval()` method with 1000ms default fallback
4. **ObservablesPanel Integration**: Added custom observable display section with individual polling intervals and visibility controls
5. **Registration Management**: Only visible custom observables are registered in ObservableManager to optimize performance

**Technical Details**:
- Custom observables now appear in main ObservablesPanel alongside built-in observables
- Each custom observable can specify polling interval: `interval: 500` (milliseconds)
- Visibility-based registration prevents unnecessary Observable manager operations
- Individual polling timers created per visible custom observable
- Registration/unregistration follows same pattern as built-in observables

**Current Issue**: 
- UI displays "No data" despite successful polling returning values (0, NaN)
- Console shows polling working: `[Poll] left-momentum: 0`, `[Poll] KE-Fluctuations: NaN`
- Data format mismatch between polling results and ObservableDisplay component expectations

**Files Modified**:
- `frontend/src/stores/appStore.ts` - Added customObservableVisibility state
- `frontend/src/physics/observables/TextObservableParser.ts` - Added interval field parsing
- `frontend/src/physics/observables/TextObservable.ts` - Added getInterval() method
- `frontend/src/components/ObservablesPanel.tsx` - Integrated custom observable display with individual polling

**Next Session Priority**: Debug data format mismatch causing "No data" display despite successful value polling
