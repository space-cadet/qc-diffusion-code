# Commit Message: Observable System Critical Bug Fixes

*Generated: 2025-09-02 01:16:23 IST*

## Brief Commit Message
```
fix: resolve observable system critical bugs - data shape mismatch, MSD initialization, infinite re-renders

- Replace TextObservable with concrete observables for structured data
- Make registration idempotent to prevent MSD reference position reset  
- Memoize visibleObservables to eliminate infinite re-render loop
- Update ID resolution for exact matching with fallback compatibility
- All observables now display live updating values during simulation
```

## Technical Summary
Fixed four critical issues preventing observable system functionality:

1. **Data Shape Mismatch**: UI expected structured objects but TextObservable returned scalars
2. **MSD Zero Values**: Re-registration was resetting reference positions on visibility changes
3. **Infinite Re-renders**: Dependency array changes caused "Maximum update depth exceeded" warnings
4. **ID Resolution**: Polling used `text_` prefix but concrete observables register with exact IDs

## Files Modified
- `frontend/src/components/ObservablesPanel.tsx` - Idempotent registration, memoized dependencies
- `frontend/src/components/useObservablesPolling.ts` - Dual ID resolution strategy

## Result
Observable system now fully functional with live updating structured data for all built-in observables (Particle Count, Kinetic Energy, Momentum, MSD) while preserving custom TextObservable support.
