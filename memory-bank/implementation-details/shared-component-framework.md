# Shared Component Framework

*Created: 2026-01-28 22:11:28 IST*
*Last Updated: 2026-01-28 22:11:28 IST*

## Overview

Comprehensive shared component framework for simulation lab pages, providing reusable UI patterns for consistent user experience across PDE, Classical Walk, and Quantum Walk pages.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Shared Component Framework                       │
├─────────────────────────────────────────────────────────────────────┤
│  Core Components                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │  MetricsGrid    │  │ TimelineSlider  │  │ ControlButtons  │     │
│  │  (Display)      │  │ (Navigation)    │  │ (Actions)       │     │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │
│           │                    │                    │               │
│           └────────────────────┼────────────────────┘               │
│                                ▼                                    │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Parameter & Analysis Components                   │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │ │
│  │  │ ParameterPanel  │  │ AnalysisTable   │  │TabNavigation│  │ │
│  │  │ (Controls)      │  │ (Data Display)  │  │(View Switch)│  │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────┘  │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Catalog

### 1. MetricsGrid

**Purpose**: Display simulation state metrics in a responsive grid layout

**Location**: `frontend/src/lab/components/MetricsGrid.tsx`

**Props Interface**:
```typescript
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

**Usage Example**:
```tsx
<MetricsGrid
  columns={4}
  metrics={[
    { label: 'Step', value: currentStep, color: 'blue' },
    { label: 'Spread Width', value: spreadWidth.toFixed(3), color: 'purple' },
    { label: 'Regime', value: regime, color: 'emerald' },
    { label: 'Variance', value: variance.toFixed(3), color: 'red' }
  ]}
/>
```

**Features**:
- Responsive 2-column or 4-column layout
- Color-coded metrics for visual distinction
- Monospace font for numerical precision
- Automatic value formatting

### 2. TimelineSlider

**Purpose**: Timeline navigation with step seeking and progress indication

**Location**: `frontend/src/lab/components/TimelineSlider.tsx`

**Props Interface**:
```typescript
interface TimelineSliderProps {
  currentStep: number;
  maxStep: number;
  onSeek: (step: number) => void;
  label?: string;
}
```

**Usage Example**:
```tsx
<TimelineSlider
  currentStep={currentStep}
  maxStep={maxSteps}
  onSeek={handleSeek}
  label="Step"
/>
```

**Features**:
- Real-time step seeking
- Progress bar visualization
- Step counter display
- Keyboard navigation support

### 3. ControlButtons

**Purpose**: Standard simulation control buttons (Play, Pause, Step, Reset)

**Location**: `frontend/src/lab/components/ControlButtons.tsx`

**Props Interface**:
```typescript
interface ControlButtonsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
  disabled?: boolean;
}
```

**Usage Example**:
```tsx
<ControlButtons
  isRunning={isRunning}
  onPlayPause={togglePlayPause}
  onStep={handleStep}
  onReset={handleReset}
  disabled={currentStep >= maxSteps}
/>
```

**Features**:
- Play/Pause toggle with icon switching
- Step forward button
- Reset to initial state
- Disabled state handling
- Consistent button styling

### 4. ParameterPanel

**Purpose**: Reusable parameter control panel for simulation settings

**Location**: `frontend/src/lab/components/ParameterPanel.tsx`

**Props Interface**:
```typescript
interface ParameterConfig {
  key: string;
  label: string;
  type: 'slider' | 'select' | 'toggle' | 'text';
  value: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  onChange: (value: any) => void;
}

interface ParameterPanelProps {
  parameters: ParameterConfig[];
  title?: string;
}
```

**Usage Example**:
```tsx
<ParameterPanel
  title="Simulation Parameters"
  parameters={[
    {
      key: 'latticeSize',
      label: 'Lattice Size',
      type: 'slider',
      value: latticeSize,
      min: 10,
      max: 200,
      step: 10,
      onChange: setLatticeSize
    },
    {
      key: 'coinType',
      label: 'Coin Type',
      type: 'select',
      value: coinType,
      options: [
        { value: 'hadamard', label: 'Hadamard' },
        { value: 'grover', label: 'Grover' }
      ],
      onChange: setCoinType
    }
  ]}
/>
```

**Features**:
- Multiple input types (slider, select, toggle, text)
- Configurable ranges and steps
- Dynamic option lists
- Consistent styling across pages
- Automatic state management

### 5. AnalysisTable

**Purpose**: Tabular display of analysis data with sorting and filtering

**Location**: `frontend/src/lab/components/AnalysisTable.tsx`

**Props Interface**:
```typescript
interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: any) => string;
}

interface AnalysisTableProps {
  columns: TableColumn[];
  data: Record<string, any>[];
  sortable?: boolean;
  pageSize?: number;
}
```

**Usage Example**:
```tsx
<AnalysisTable
  columns={[
    { key: 'step', label: 'Step', sortable: true },
    { key: 'spreadWidth', label: 'Spread Width', sortable: true, format: (v) => v.toFixed(3) },
    { key: 'regime', label: 'Regime' }
  ]}
  data={analysisData}
  sortable={true}
  pageSize={20}
/>
```

**Features**:
- Column sorting
- Pagination support
- Custom value formatting
- Responsive table layout
- Empty state handling

### 6. TabNavigation

**Purpose**: Tab-based view switching for multi-page components

**Location**: `frontend/src/lab/components/TabNavigation.tsx`

**Props Interface**:
```typescript
interface TabConfig {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabNavigationProps {
  tabs: TabConfig[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}
```

**Usage Example**:
```tsx
<TabNavigation
  tabs={[
    {
      id: 'visualization',
      label: 'Visualization',
      content: <VisualizationView />
    },
    {
      id: 'analysis',
      label: 'Analysis',
      content: <AnalysisView />
    }
  ]}
  defaultTab="visualization"
  onTabChange={(tabId) => console.log('Switched to', tabId)}
/>
```

**Features**:
- Dynamic tab rendering
- Active tab highlighting
- Tab change callbacks
- Content lazy loading
- Consistent styling

## Integration Patterns

### Pattern 1: Controller-Based Integration

Components integrate with SimulationController for state management:

```tsx
const controller = useSimulation(new QuantumWalkController());

<MetricsGrid metrics={controller.getMetrics()} />
<TimelineSlider
  currentStep={controller.getCurrentStep()}
  maxStep={controller.getMaxSteps()}
  onSeek={(step) => controller.seekToStep(step)}
/>
<ControlButtons
  isRunning={controller.isRunning()}
  onPlayPause={() => controller.togglePlayPause()}
  onStep={() => controller.step()}
  onReset={() => controller.reset()}
/>
```

### Pattern 2: Parameter Panel Integration

ParameterPanel connects to controller state:

```tsx
<ParameterPanel
  parameters={[
    {
      key: 'latticeSize',
      label: 'Lattice Size',
      type: 'slider',
      value: controller.params.latticeSize,
      min: 10,
      max: 200,
      step: 10,
      onChange: (value) => controller.updateParam('latticeSize', value)
    }
  ]}
/>
```

### Pattern 3: Tab Navigation Integration

TabNavigation switches between different views:

```tsx
<TabNavigation
  tabs={[
    {
      id: 'visualization',
      label: 'Visualization',
      content: (
        <>
          <MetricsGrid metrics={controller.getMetrics()} />
          <TimelineSlider {...} />
          <ControlButtons {...} />
        </>
      )
    },
    {
      id: 'analysis',
      label: 'Analysis',
      content: <AnalysisTable columns={...} data={...} />
    }
  ]}
/>
```

## Design Principles

1. **Composability**: Components are designed to work independently or together
2. **Reusability**: Generic interfaces support multiple simulation types
3. **Consistency**: Unified styling and interaction patterns
4. **Type Safety**: Full TypeScript support with strict typing
5. **Performance**: Optimized rendering with memoization where needed

## Migration Checklist

When migrating a page to the shared framework:

- [ ] Extract simulation logic into SimulationController
- [ ] Replace inline metrics with MetricsGrid
- [ ] Replace custom timeline with TimelineSlider
- [ ] Replace custom controls with ControlButtons
- [ ] Extract parameters to ParameterPanel
- [ ] Use TabNavigation for multi-view pages
- [ ] Use AnalysisTable for data displays
- [ ] Verify all functionality preserved
- [ ] Update documentation

## Future Enhancements

- [ ] Add export functionality to AnalysisTable
- [ ] Implement parameter presets in ParameterPanel
- [ ] Add keyboard shortcuts to ControlButtons
- [ ] Support custom column renderers in AnalysisTable
- [ ] Add tab persistence in TabNavigation
- [ ] Create theme variants for components

## Related Documentation

- `simulation-lab-framework.md` - Core framework architecture
- `quantum-walk-implementation.md` - Original Quantum Walk implementation
- `tasks/T27.md` - Simulation Lab Framework task

## Notes

Shared components significantly reduce code duplication and provide consistent user experience across all simulation pages. The framework is designed to be extensible, allowing new components to be added following established patterns.
