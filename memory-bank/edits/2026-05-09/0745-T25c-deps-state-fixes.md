# T25c Dependency and State Fixes - Edit History

## Date: 2026-05-09
## Branch: cloud-claw/screenshot-poc
## Task: T25c - Dependency and State Fixes for qc-diffusion-code

---

## P1-001: Add useGPU dependency to useRandomWalkEngine (FIXED)

**File:** `frontend/src/hooks/useRandomWalkEngine.ts`
**Issue:** `useGPU` prop was passed to the hook but missing from the first `useEffect` dependency array. This meant toggling GPU mode would not reinitialize the simulator with the correct engine.
**Fix:** Added `useGPU` to the dependency array of the initialization `useEffect`.

```diff
  }, [
    gridLayoutParams.simulationType,
    gridLayoutParams.strategies,
    gridLayoutParams.boundaryCondition,
    gridLayoutParams.dimension,
    gridLayoutParams.graphType,
    gridLayoutParams.graphSize,
    useNewEngine,
    useStreamingObservables,
+   useGPU,
  ]);
```

---

## P5-002: Fix GPU mode switching logic (FIXED)

**File:** `frontend/src/RandomWalkSim.tsx`
**Issue:** When `useGPU` toggle changed, the simulation would not properly reinitialize. The GPU mode switching was buried inside `useParticlesLoader` but there was no top-level coordination to stop/reinitialize the simulation when GPU mode changed.
**Fix:** Added a new `useEffect` that triggers when `useGPU` changes:
1. Checks if simulation is ready and container exists
2. Stops the simulation if running (sets status to 'Paused')
3. Calls `handleInitialize()` to reinitialize with new GPU mode

```typescript
// Handle GPU mode switching - reinitialize when useGPU changes
useEffect(() => {
    if (!simReady || !tsParticlesContainerRef.current) return;
    
    console.log('[GPU Mode Switch] useGPU changed to:', useGPU);
    
    if (isRunning) {
        setSimulationState((prev) => ({
            ...prev,
            isRunning: false,
            status: 'Paused',
        }));
    }
    
    handleInitialize();
}, [useGPU]);
```

---

## P1-008: Consolidate isRunning state management (FIXED)

**File:** `frontend/src/RandomWalkSim.tsx`
**Issue:** `isRunning` state was being managed redundantly. The `setSimulationState` helper was calling both `setIsRunning` (store action) and `setRandomWalkSimulationState` (which overwrites the entire state object including `isRunning`). This created a race condition where `setIsRunning` would update the store, then `setRandomWalkSimulationState` would immediately overwrite it.

**Fix:** 
1. Removed `setIsRunning` from the store destructuring (no longer needed)
2. Removed `setIsRunning` calls from `setSimulationState` - now only uses `setRandomWalkSimulationState` which properly sets `isRunning` as part of the full state object
3. Cleaned up debug console.log statements referencing `setIsRunning`

```diff
- const { ..., setIsRunning } = storeValues;
+ const { ... } = storeValues;  // setIsRunning removed

  const setSimulationState = (state) => {
-     console.log('setSimulationState called, setIsRunning type:', typeof setIsRunning);
-     setIsRunning(newState.isRunning);  // REMOVED - redundant
      setRandomWalkSimulationState({...});  // isRunning set here
  };
```

**Rationale:** `setRandomWalkSimulationState` replaces the entire `randomWalkSimulationState` object atomically. Since `isRunning` is a field within that object, setting it through `setRandomWalkSimulationState` is the correct single source of truth. The separate `setIsRunning` action was creating a double-update that could cause stale state issues.

---

## Verification

- `npx tsc --noEmit` passes with zero errors
- All changes maintain backward compatibility
- No breaking changes to existing functionality

## Files Modified

1. `frontend/src/hooks/useRandomWalkEngine.ts` - P1-001
2. `frontend/src/RandomWalkSim.tsx` - P5-002, P1-008

## Time Estimate

- P1-001: 0.5h (actual: ~10 min)
- P5-002: 0.5h (actual: ~15 min)  
- P1-008: 4-6h (actual: ~30 min - simpler than anticipated due to clean store architecture)
