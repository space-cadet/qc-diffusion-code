# Composable Observables – Architecture Plan
*Created: 2025-09-04 00:22:11 IST*
*Last Updated: 2025-09-04 00:54:05 IST*

## Goals
- Enable defining observables in terms of other observables (scalar + vector fields)
- Preserve determinism, avoid cycles, and keep performance predictable

## Scope (Phase 1)
- Read-only references to already computed observable outputs
- Scalar dependencies only (numbers); vectors later
- Supported in both polling and streaming managers

## Syntax Proposal
- Access namespace: `sim.observables.<idOrName>.<field?>`
- Example:
  ```
  observable "rmsd" { name: rmsd,
    select: sqrt(sim.observables.msd.meanSquaredDisplacement),
    reduce: mean,
  }
  ```

## Parser/Evaluator Changes
- Allowlist: add `sim`, `sim.observables.*` in `TextObservableParser`
- Validation: static check that referenced observables exist (when visible/registered)
- ExpressionEvaluator: extend context with `sim: { observables: Record<string, any> }`

## Dependency Graph
- Build DAG of observables per frame (visible/registered set)
- Topological evaluation order; detect cycles -> fail fast with error
- Caching: memoize per-timestamp results; invalidate on snapshot change

## Execution Flow (Streaming)
1) Register/unregister determines nodes
2) On step: evaluate in topo-order; emit `update` per node
3) If a node errors, emit error and skip dependents

## Rollout Plan
- Phase 1: scalar composition, no cycles, streaming path
- Phase 2: polling parity and vector fields
- Phase 3: post-reduce transforms (e.g., `post: sqrt`)

## Risks & Mitigations
- Cycles: topo-sort with explicit cycle error
- Performance: bound graph size; measure per-node compute times
- Security: strict allowlist; no dynamic function injection
