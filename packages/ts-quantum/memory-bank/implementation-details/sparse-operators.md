# Sparse Operator Implementation Details
*Created: 2026-01-01 17:15:00 IST*

## Overview
Implemented native sparse matrix support in `ts-quantum` to optimize quantum mechanics simulations that involve high-dimensional but low-density operators (e.g., Quantum Random Walks).

## Components

### 1. `SparseOperator` Class
- **Location**: `src/operators/sparseOperator.ts`
- **Mechanism**: Implements `IOperator` using `ISparseMatrix` from `src/operators/sparse.ts`.
- **Complexity**: $O(nnz)$ for `apply()`, significantly better than $O(N^2)$ for dense matrices.
- **Mixed Mode**: Automatically falls back to `MatrixOperator` for operations involving dense matrices.

### 2. Automatic Optimization
- **`MatrixOperator.createOptimized`**: Now includes a density check.
- **Threshold**: Matrices with $< 10\%$ non-zero elements are automatically converted to `SparseOperator`.

### 3. Identity Operator Enhancements
- **`IdentityOperator.tensorProduct`**: Refactored to return a `SparseOperator`. This prevents the $O(N^2)$ explosion when expanding a state space (e.g., $I_{pos} \otimes H_{coin}$).

### 4. Public API
- All sparse utilities (`createSparseMatrix`, `sparseVectorMultiply`, etc.) and the `SparseOperator` class are now exported from `src/index.ts`.

## Performance Impact
In a 1D Quantum Walk with 200 steps ($N=401$, total dimension $D=802$):
- **Dense**: Processing $\approx 643,000$ elements per step.
- **Sparse**: Processing $\approx 1,600$ elements per step.
- **Result**: ~400x speedup in the evolution loop.
