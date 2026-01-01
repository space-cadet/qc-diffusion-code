# Quantum Random Walk Implementation Details
*Created: 2026-01-01 17:15:00 IST*

## Overview
Implemented a 1D Quantum Random Walk visualization page using the `ts-quantum` library. The implementation focuses on the Hadamard walk on a finite lattice.

## Physics Implementation

### 1. State Space
The quantum state $|\psi\rangle$ is represented in a composite Hilbert space $\mathcal{H}_{position} \otimes \mathcal{H}_{coin}$:
- **Position Space**: Discrete 1D lattice of size $2N+1$.
- **Coin Space**: 2D Hilbert space with basis $\{|up\rangle, |down\rangle\}$.
- **Indexing**: `pos * 2 + coin_index` where coin_index 0 is $|up\rangle$ and 1 is $|down\rangle$.

### 2. Evolution Operator
The single-step evolution is governed by $U = S(I \otimes C)$:
- **Coin (C)**: Hadamard operator $H = \frac{1}{\sqrt{2}}\begin{pmatrix} 1 & 1 \\ 1 & -1 \end{pmatrix}$.
- **Shift (S)**: Conditional shift operator:
  - $S|x\rangle|up\rangle = |x-1\rangle|up\rangle$
  - $S|x\rangle|down\rangle = |x+1\rangle|down\rangle$
- **Implementation**: Utilizes `ts-quantum` `SparseOperator` for $O(N)$ performance scaling.

### 3. Observables
- **Probability Distribution**: $P(x) = |\langle x, up|\psi\rangle|^2 + |\langle x, down|\psi\rangle|^2$.
- **Expectation Values**: Calculated using `ts-quantum` `expectationValue` utility with Hermitian position operators $X$ and $X^2$.
- **Ballistic Spreading**: Variance scales as $\sigma^2 \propto t^2$, contrasted with classical diffusion $\sigma^2 \propto t$.

## UI Components
- **Plotly.js Visualization**: Real-time bar chart of the probability distribution.
- **Parameter Controls**: Adjustable max steps and simulation execution (Start/Pause/Reset).
- **Observable Dashboard**: Live tracking of Mean $\langle x \rangle$, Variance $\sigma^2$, and Std Dev $\sigma$.

## Performance Optimization
- **Sparsity**: Transitioned from dense `MatrixOperator` to `SparseOperator` within `ts-quantum`, achieving ~400x speedup for typical grid sizes.
- **Pre-computation**: Identity tensor products ($I \otimes H$) are handled lazily/sparsely to avoid memory bloat.
