# C7a: Modular Transparent Observable System Redesign
*Created: 2025-09-01 14:55:13 IST*
*Last Updated: 2025-09-02 00:16:10 IST*

**Description**: Redesign the current hardcoded observable system into a flexible, modular architecture through incremental phases. Phase 0 implements plugin-style loading with template and composite observables as foundation for full query-based system.

**Status**: 🔄 Active - Phase 0 Complete
**Priority**: HIGH
**Started**: 2025-09-01
**Last Active**: 2025-09-02 00:16:10 IST
**Dependencies**: C7

## Completion Criteria
- [x] Replace hardcoded observable classes with query-based system
- [x] Implement text-based observable definitions for custom observables
- [x] Enable transparent access to any particle property or subset on-demand
- [ ] Add real-time time-series visualization with Plotly.js integration
- [x] Maintain backward compatibility with existing ObservablesPanel
- [x] Achieve configurable polling intervals per observable type
- [x] Implement unified polling system to prevent memory leaks
- [ ] Add observable selection UI and plot control functionality

## Related Files
- `memory-bank/implementation-details/observables-modular-redesign.md`
- `frontend/src/physics/ObservableManager.ts`
- `frontend/src/physics/interfaces/Observable.ts`
- `frontend/src/physics/observables/`
- `frontend/src/components/ObservablesPanel.tsx`
- `frontend/src/components/observablesConfig.ts`
- `frontend/src/components/useObservablesPolling.ts`
- `frontend/src/components/RandomWalkParameterPanel.tsx`
- `frontend/src/stores/appStore.ts`
- `frontend/src/types/simulation.ts`

## Progress
1. ✅ Created comprehensive redesign specification document
2. ✅ Phase 0: Text-based observable system with per-observable polling intervals
3. ⬜ Phase 1: Core query system with ParticleSelector/AggregationFunction
4. ⬜ Phase 2: Time series infrastructure with CircularBuffer
5. ⬜ Phase 3: Live Plotly.js visualization integration
6. ⬜ Phase 4: Advanced features and performance optimization

### Phase 0 Implementation Complete (2025-09-02)
**Scope**: Text-based observables + Configurable polling intervals + Unified architecture
**Files**: 3 new files, 1 major refactor, ~400 lines total
**Timeline**: 1 session (6 hours)

**Key Files**:
- NEW: `observablesConfig.ts` (~73 lines) - Configuration-driven observable definitions
- NEW: `useObservablesPolling.ts` (~117 lines) - Unified polling system with per-observable intervals
- REFACTOR: `ObservablesPanel.tsx` (~262 lines) - Text-based system integration with generic renderer
- MODIFY: `ObservableManager.ts` - Text observable registration support

**Benefits**: Eliminated repetitive code, configurable polling, unified text-based system

## Context
Current system issues identified: lack of transparency (hardcoded observables), limited modularity (tight coupling), and correctness problems (cache invalidation, memory leaks). New system will provide:

- Dynamic observable registration with query syntax
- Real-time plotting capabilities for any observable
- Efficient data structures for time-series storage
- User-friendly interface for custom observable definitions
- Full backward compatibility during migration

The redesign transforms the rigid, hardcoded approach into a flexible analytics platform suitable for interactive exploration and quantitative analysis.

## Technical Architecture
- **Query System**: ParticleSelector filters + AggregationFunction reducers
- **Time Series**: CircularBuffer with configurable history length
- **Visualization**: react-plotly.js with throttled updates (10Hz default)
- **Performance**: Lazy evaluation, data decimation, memory management
- **API**: `observables.register(id, {selector, aggregator})` interface

## Recent Implementation (2025-09-01 15:04:07 IST)

### Interparticle Collision Metrics Integration
**Files Modified**:
- `frontend/src/stores/appStore.ts` - Added interparticleCollisions to RandomWalkSimulationState
- `frontend/src/types/simulation.ts` - Extended SimulationState with optional interparticleCollisions
- `frontend/src/components/RandomWalkParameterPanel.tsx` - Display interparticle collision count from simulation state
- `frontend/src/RandomWalkSim.tsx` - Periodic syncing of interparticle collision metrics from simulator

**Key Changes**:
1. **State Management**: Extended app store to track interparticle collisions alongside boundary collisions
2. **Metrics Display**: Parameter panel now shows interparticle collision count with safe formatting
3. **Data Flow**: RandomWalkSim retrieves collision stats from simulator and updates store every 1 second
4. **Type Safety**: Added optional interparticleCollisions to SimulationState interface

### ObservablesPanel UI Improvements
**Files Modified**:
- `frontend/src/components/ObservablesPanel.tsx` - Simplified display logic with consistent null safety

**Key Changes**:
1. **Consistent Display**: Replaced conditional rendering with always-on value rows using optional chaining
2. **Null Safety**: All observable values now use `?.` and `?? 'No data'` fallback pattern
3. **Enhanced KE Display**: Added Total/Average/Max/Min kinetic energy with color coding and metadata
4. **Simplified Logic**: Removed complex conditional blocks in favor of uniform value display

These changes lay groundwork for the modular observable system by establishing consistent data flow patterns and improving UI reliability.

## Latest Implementation (2025-09-02 00:16:10 IST)

### Text-Based Observable System with Per-Observable Polling
**Files Created**:
- `frontend/src/components/observablesConfig.ts` - Configuration-driven observable definitions with polling intervals
- `frontend/src/components/useObservablesPolling.ts` - Unified polling hook with configurable intervals per observable

**Files Modified**:
- `frontend/src/components/ObservablesPanel.tsx` - Complete refactor to use text-based system with generic renderer

**Key Achievements**:
1. **Unified Architecture**: Single polling system replaces 4 separate useEffect hooks and 8+ state variables
2. **Configurable Intervals**: Different polling frequencies per observable type (momentum: 50ms, kinetic energy: 100ms, particle count: 200ms, MSD: 500ms)
3. **Text-Based System**: Built-in observables now use same text definition system as custom observables
4. **Generic Renderer**: ObservableDisplay component handles any observable type through configuration
5. **ID Mapping Fix**: Resolved text_ prefix mismatch between registration and data retrieval
6. **Performance Optimized**: Eliminated redundant polling and improved memory management

**Technical Details**:
- Reduced ObservablesPanel from 513 to 262 lines (~49% reduction)
- Eliminated repetitive polling logic across 4 observable types
- Implemented 50ms polling resolution with per-observable interval checking
- Fixed TextObservable ID mapping issue (text_particleCount vs particleCount)
- Maintained full backward compatibility with existing UI state management

**Results**:
- ✅ Console errors about unregistered observers resolved
- ✅ Observables display actual data instead of "No data"
- ✅ Different polling frequencies working correctly
- ✅ Text-based observables properly integrated with built-in observables

## Implementation Timeline
- **Phase 0 (Complete)**: Text-based system with configurable polling - COMPLETED 2025-09-02
- **Phase 1 (Week 1-2)**: Core query system and particle selection
- **Phase 2 (Week 2-3)**: Time series infrastructure and data collection  
- **Phase 3 (Week 3-4)**: Live Plotly integration and UI controls
- **Phase 4 (Week 4-5)**: Advanced features and optimization
