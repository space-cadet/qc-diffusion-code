# Simulation Lab Framework Design

*Created: 2026-01-19 23:49:00 IST*
*Last Updated: 2026-01-28 22:53:56 IST*

## Overview

Shared infrastructure for numerical simulation pages (PDE, Classical Walk, Quantum Walk, Simplicial Growth) providing consistent patterns for simulation control, data management, and visualization.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Layer                            │
├──────────────────┬──────────────────┬──────────────────┬─────────────┤
│   PDE Page       │  Classical Walk  │   Quantum Walk   │ Simplicial   │
│   (PlotComponent)│  (RandomWalkSim) │    (Page)        │   Growth    │
└────────┬─────────┴────────┬─────────┴────────────┬─────────────────┘
         │                  │                      │
         ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Shared Lab Framework                            │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ SimulationCtrl  │  │ TimeSeriesStore │  │ ObservableEngine│     │
│  │ Interface       │  │                 │  │ (existing T7a)  │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│  ┌────────▼────────────────────▼────────────────────▼────────┐     │
│  │                    Shared UI Components                    │     │
│  │  ┌────────────┐ ┌──────────────┐ ┌───────────┐ ┌────────┐ │     │
│  │  │MetricsGrid │ │TimelineSlider│ │PlotPanel  │ │Export  │ │     │
│  │  └────────────┘ └──────────────┘ └───────────┘ └────────┘ │     │
│  └───────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### SimulationController

```typescript
interface SimulationController<TState, TParams> {
  // Lifecycle
  initialize(params: TParams): void;
  step(): TState;
  reset(): void;

  // State access
  getState(): TState;
  getHistory(): TState[];
  seekToStep(n: number): TState;

  // Status
  isRunning(): boolean;
  getCurrentStep(): number;
}
```

### TimeSeriesStore

```typescript
interface TimeSeriesStore<T> {
  // Recording
  record(state: T, timestamp: number): void;
  clear(): void;

  // Replay
  seek(step: number): T | null;
  getRange(start: number, end: number): T[];

  // Export
  toArray(): { timestamp: number; state: T }[];
  toCSV(columns: string[]): string;
}
```

## Data Flow

```
┌──────────────┐     step()      ┌──────────────┐
│   UI Event   │ ───────────────▶│  Controller  │
│  (Run/Step)  │                 │              │
└──────────────┘                 └──────┬───────┘
                                        │
                                        ▼
                                ┌──────────────┐
                                │  New State   │
                                └──────┬───────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
    │ TimeSeriesStore  │    │ ObservableEngine │    │   UI Updates     │
    │  (history)       │    │  (metrics calc)  │    │  (plots/grids)   │
    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Component Extraction Plan

### From QuantumWalkPage (target: MetricsGrid)

Current inline implementation (lines 598-617):
```tsx
// Extract to: frontend/src/lab/components/MetricsGrid.tsx
interface MetricConfig {
  label: string;
  value: string | number;
  color: 'blue' | 'red' | 'purple' | 'emerald' | 'gray';
}
interface MetricsGridProps {
  metrics: MetricConfig[];
  columns?: 2 | 4;
}
```

### From QuantumWalkPage (target: TimelineSlider)

Current inline implementation (lines 488):
```tsx
// Extract to: frontend/src/lab/components/TimelineSlider.tsx
interface TimelineSliderProps {
  currentStep: number;
  maxStep: number;
  onSeek: (step: number) => void;
  label?: string;
}
```

## Existing Components to Reuse

| Component | Location | Status |
|-----------|----------|--------|
| FloatingPanel | `components/common/FloatingPanel.tsx` | Ready |
| PlotlyChart | `components/PlotlyChart.tsx` | Ready |
| TextObservable | `physics/observables/TextObservable.ts` | Needs context abstraction |
| StreamObservableManager | `physics/stream-ObservableManager.ts` | Ready |
| ExportPanel | `components/ExportPanel.tsx` | Needs data-agnostic refactor |

## Migration Priority

1. **QuantumWalkPage** - cleanest, newest, best starting point ✅
2. **SimplicialGrowthPage** - framework validation ✅
3. **PlotComponent (PDE)** - well-structured, limited state ✅
4. **RandomWalkSim** - most complex, migrate last ⬜

## Integration with Existing Work

- **T7/T7a**: Observable system provides metrics calculation
- **T17**: AnalysisPage shares PlotlyChart, grid layout patterns
- **T18**: Streaming framework provides real-time data flow
- **T7b**: Future composable observables build on this foundation

## File Structure (Planned)

```
frontend/src/lab/
├── interfaces/
│   ├── SimulationController.ts
│   └── TimeSeriesStore.ts
├── components/
│   ├── MetricsGrid.tsx
│   ├── TimelineSlider.tsx
│   └── ControlButtons.tsx
├── hooks/
│   └── useSimulation.ts
└── services/
    └── ExportService.ts
```

## Estimated Effort

| Phase | Tasks | Days | Status |
|-------|-------|------|---------|
| 1 | Core interfaces + useSimulation hook | 1 | ✅ |
| 2 | TimeSeriesStore + MetricsGrid extraction | 1.5 | ✅ |
| 3 | TimelineSlider + ExportService | 1 | ✅ |
| 4 | Quantum Walk migration | 1 | ✅ |
| 5 | Simplicial Growth migration (validation) | 1 | ✅ |
| 6 | PDE page migration | 1.5 | ✅ |
| 7 | Classical Walk migration | 2 | ⬜ |
| **Total** | | **8.5 days** | **6/7 complete** |
