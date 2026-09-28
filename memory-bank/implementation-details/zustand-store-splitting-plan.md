# Zustand Store Splitting Plan

*Created: 2026-05-11 11:31:20 IST*
*Last Updated: 2026-05-11 11:31:20 IST*

## Problem Statement

`appStore.ts` is a 407-line "god store" managing:
- Active tab and UI chrome
- PDE simulation params + runtime state
- Random Walk params + UI state + simulation state + history + snapshots
- React-grid-layout layouts
- Floating window geometry and z-index
- Custom text observables + visibility map
- Feature flags (`useNewEngine`, `useStreamingObservables`, `useGPU`)

A change to any slice causes all subscribers to re-render.

## Proposed Store Boundaries

### 1. `useUIStore`

**Responsibilities:**
- `activeTab`
- Mobile/desktop responsive state
- Feature flags (`useNewEngine`, `useStreamingObservables`, `useGPU`)
- Floating window geometry and z-index counter
- React-grid-layout layouts

**Persistence:** `activeTab`, feature flags, layouts

### 2. `usePdeStore`

**Responsibilities:**
- PDE simulation parameters (mesh size, solver method, boundary conditions)
- PDE runtime state (isRunning, currentTime, frameIndex)
- WebSocket connection status
- PDE UI fold states

**Persistence:** parameters only (not runtime state)

### 3. `useRandomWalkStore`

**Responsibilities:**
- Random Walk parameters (collisionRate, velocity, jumpLength, etc.)
- Simulation runtime state (time, collisions, status, particleData)
- Simulation history and snapshots
- Density history
- Observable data and custom observables

**Persistence:** parameters, history, snapshots (not transient runtime state)

### 4. `useObservablesStore` (optional)

**Responsibilities:**
- Custom text observable definitions
- Observable visibility map
- Computed observable cache

**Rationale:** Observables are cross-cutting but have their own UI (floating panels). Separating them prevents random-walk param changes from re-rendering the observables panel.

## Migration Path

### Phase 1: Extract `useUIStore`
1. Create `frontend/src/stores/uiStore.ts`
2. Move tab, layouts, floating windows, flags
3. Update `App.tsx` and layout components to use `useUIStore`
4. Update `partialize` in `appStore` to remove migrated fields

### Phase 2: Extract `usePdeStore`
1. Create `frontend/src/stores/pdeStore.ts`
2. Move PDE params and state
3. Update `PdeParameterPanel.tsx`, `PlotComponent.tsx`, `App.tsx`

### Phase 3: Extract `useRandomWalkStore`
1. Create `frontend/src/stores/randomWalkStore.ts`
2. Move all random-walk-specific state
3. Update `RandomWalkSimV2.tsx`, `RandomWalkParameterPanelV2.tsx`, `ParticleCanvasV2.tsx`
4. Rename remaining `appStore.ts` or delete it

### Phase 4: Cross-Store Subscriptions

For cases where one store needs to react to another:

```typescript
// In uiStore.ts
import { useRandomWalkStore } from './randomWalkStore';

useRandomWalkStore.subscribe((state) => {
  // React to simulation status changes
});
```

Or use combined selectors in components:

```typescript
const { isRunning, activeTab } = useCombinedStore((state) => ({
  isRunning: useRandomWalkStore.getState().isRunning,
  activeTab: useUIStore.getState().activeTab,
}));
```

## Persistence Strategy

Each store gets its own `persist` middleware with a specific `partialize`:

```typescript
// uiStore
persist(store, {
  name: 'qc-ui-store',
  partialize: (state) => ({
    activeTab: state.activeTab,
    useNewEngine: state.useNewEngine,
    layouts: state.layouts,
  }),
});

// randomWalkStore
persist(store, {
  name: 'qc-rw-store',
  partialize: (state) => ({
    params: state.params,
    history: state.history,
  }),
});
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Persisted state from old `appStore` becomes stale | Add migration functions in each new store that read legacy keys and transform |
| Components using `useAppStore()` broadly break | Search/replace `useAppStore` with domain-specific stores; TypeScript will catch misses |
| Cross-domain reactivity lost | Use `subscribe` or lift shared state into a minimal `useSharedStore` |

## Estimated Effort

- Phase 1 (UI): 2-3 hours
- Phase 2 (PDE): 2-3 hours
- Phase 3 (RandomWalk): 4-6 hours
- Phase 4 (Cross-store): 2-3 hours
- **Total: 10-15 hours**
