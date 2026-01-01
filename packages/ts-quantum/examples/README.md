# Quantum Module Examples

This directory contains example programs demonstrating the capabilities of the quantum module in the Spin Network library.

## Basic Examples

### Composition Demo
Demonstrates Hilbert space composition operations:
- Creating quantum spaces
- Tensor product composition
- Space decomposition
```bash
pnpm tsx basic/composition-demo.ts
```

### Operator Demo
Shows quantum operator functionality:
- Creating basic operators
- Operator composition
- Adjoint operations
```bash
pnpm tsx basic/operator-demo.ts
```

### State Demo
Illustrates quantum state manipulations:
- State initialization
- State transformations
- Inner products
```bash
pnpm tsx basic/state-demo.ts
```

### Measurement Demo
Shows quantum measurement operations:
- Projective measurements
- Expectation values
- State collapse
```bash
pnpm tsx basic/measurement-demo.ts
```

## Running Examples
From the project root:
```bash
cd /Users/deepak/code/spin_network_app
pnpm tsx packages/quantum/examples/basic/[example-name].ts
```

## Dependencies
All examples use only the core quantum module features. No additional dependencies required.