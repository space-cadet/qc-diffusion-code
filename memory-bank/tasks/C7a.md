# C7a: Modular Transparent Observable System Redesign
*Created: 2025-09-01 14:55:13 IST*
*Last Updated: 2025-09-01 15:04:07 IST*

**Description**: Redesign the current hardcoded observable system into a flexible, modular, query-based architecture that enables user-defined observables, transparent particle property access, and real-time time-series visualization with Plotly integration.

**Status**: ⬜ Not Started
**Priority**: HIGH
**Started**: 2025-09-01
**Last Active**: 2025-09-01 15:04:07 IST
**Dependencies**: C7

## Completion Criteria
- [ ] Replace hardcoded observable classes with query-based system
- [ ] Implement ParticleSelector and AggregationFunction interfaces for custom observables
- [ ] Enable transparent access to any particle property or subset on-demand
- [ ] Add real-time time-series visualization with Plotly.js integration
- [ ] Maintain backward compatibility with existing ObservablesPanel
- [ ] Achieve <50ms update latency for 1000 particles in live plots
- [ ] Implement circular buffer data storage to prevent memory leaks
- [ ] Add observable selection UI and plot control functionality

## Related Files
- `memory-bank/implementation-details/observables-modular-redesign.md`
- `frontend/src/physics/ObservableManager.ts`
- `frontend/src/physics/interfaces/Observable.ts`
- `frontend/src/physics/observables/`
- `frontend/src/components/ObservablesPanel.tsx`
- `frontend/src/components/RandomWalkParameterPanel.tsx`
- `frontend/src/stores/appStore.ts`
- `frontend/src/types/simulation.ts`

## Progress
1. ✅ Created comprehensive redesign specification document
2. ⬜ Phase 1: Core query system with ParticleSelector/AggregationFunction
3. ⬜ Phase 2: Time series infrastructure with CircularBuffer
4. ⬜ Phase 3: Live Plotly.js visualization integration
5. ⬜ Phase 4: Advanced features and performance optimization

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

## Implementation Timeline
- **Week 1-2**: Core query system and particle selection
- **Week 2-3**: Time series infrastructure and data collection
- **Week 3-4**: Live Plotly integration and UI controls
- **Week 4-5**: Advanced features and optimization
