# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

**Build and Testing:**
```bash
pnpm build                # Build TypeScript to dist/
pnpm test                 # Run all tests with Vitest
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage report
pnpm clean                # Clean build artifacts
```

**Run Individual Tests:**
```bash
# Test specific modules
pnpm exec vitest run __tests__/stateVector.test.ts
pnpm exec vitest run __tests__/angularMomentum/
pnpm exec vitest run --reporter=verbose    # Detailed test output
```

## Architecture Overview

This is a TypeScript quantum mechanics library implementing core quantum state operations, operators, and angular momentum algebra. The codebase follows a strict hierarchical dependency structure:

**Level 0 (Core):** `src/core/` - Type definitions and interfaces
**Level 1 (Utils):** `src/utils/` - Mathematical utilities using math.js
**Level 2 (States):** `src/states/` - Quantum state implementations
**Level 3 (Operators):** `src/operators/` - Quantum operators and gates
**Level 4 (Specialized):** `src/angularMomentum/` - Angular momentum algebra

### Key Design Patterns

**Math.js Integration:** All complex number operations use math.js for numerical stability. Use `math.complex()`, `math.add()`, `math.multiply()`, etc.

**Immutable States:** Quantum operations return new state objects rather than modifying existing ones:
```typescript
const evolvedState = operator.apply(initialState); // Creates new state
```

**Interface-First Design:** All components implement core interfaces (`IStateVector`, `IOperator`, `IDensityMatrix`) defined in `src/core/types.ts`.

## Critical Implementation Details

**Angular Momentum Module:** Located in `src/angularMomentum/`, implements Wigner symbols, Clebsch-Gordan coefficients, and angular momentum operators. This is crucial for spin network applications.

**Dimension Validation:** Always validate Hilbert space dimensions match between states and operators before operations.

**Normalization:** State vectors must maintain normalization (`norm() === 1`). The `normalize()` method should be called after state manipulations.

**Operator Types:** Use the `OperatorType` enum for proper operator classification - affects eigendecomposition and validation.

## Testing Guidelines

- Tests use Vitest with comprehensive coverage requirements (80% minimum)
- Test fixtures available in `__tests__/utils/testFixtures.ts`
- Angular momentum tests require careful numerical tolerance due to Wigner symbol precision
- Integration tests in examples/ directory demonstrate real usage patterns

## Important Files to Reference

- `src/core/types.ts` - Core interfaces and type definitions
- `src/index.ts` - Public API exports (check here for available functions)
- `docs/architecture.md` - Detailed architectural documentation
- `examples/` - Working usage examples for complex operations

## Common Development Patterns

When implementing new quantum operations:
1. Define interfaces in `src/core/types.ts` first
2. Implement utilities in `src/utils/` using math.js
3. Build on existing state/operator classes
4. Add comprehensive tests with numerical tolerance checking
5. Update public exports in `src/index.ts`

## Dependencies

- **mathjs**: Core mathematical operations (complex numbers, matrices)
- **vitest**: Testing framework with coverage reporting
- **typescript**: Strict typing with ESNext target

The package is designed for integration with graph-core and tensor network packages in the spin-network monorepo.