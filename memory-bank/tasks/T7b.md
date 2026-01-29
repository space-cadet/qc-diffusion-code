# T7b: Composable Observables
*Created: 2025-09-04 00:23:44 IST*
*Last Updated: 2025-09-04 00:23:44 IST*

**Description**: Enable defining observables in terms of other observables with a safe dependency graph, streaming/polling parity, and strict parsing/validation.

**Status**: 🔄 IN PROGRESS
**Priority**: MEDIUM
**Started**: 2025-09-04
**Last Active**: 2025-09-04 00:23:44 IST
**Dependencies**: T7a

## Completion Criteria
- Parser allowlist and syntax for `sim.observables.<id>` references
- Dependency graph (topological ordering, cycle detection) across visible/registered observables
- Deterministic evaluation with caching per timestamp
- Streaming manager: topological evaluation and per-node `update` emission
- Polling manager: ordered evaluation during `getResult()` with memoization
- Error handling: clear messages for unknown references and cycles

## Related Files
- `memory-bank/implementation-details/composable-observables-plan.md`
- `frontend/src/physics/observables/TextObservableParser.ts`
- `frontend/src/physics/observables/ExpressionEvaluator.ts`
- `frontend/src/physics/ObservableManager.ts`
- `frontend/src/physics/stream-ObservableManager.ts`

## Notes
- Phase 1: scalar dependencies only; vectors later
- UI-level composition remains an alternative for quick derived displays (e.g., sqrt of MSD)
