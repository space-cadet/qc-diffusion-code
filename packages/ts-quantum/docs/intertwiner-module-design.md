# Intertwiner Module Design Document

*Version 1.0 - Created: May 28, 2025*

## Overview

This document outlines the theoretical foundation and implementation design for the intertwiner module within the `packages/quantum` library. The module ports existing intertwiner functionality from `src/` and `lib/` directories into the unified quantum framework.

## Theoretical Foundation

### 1. Intertwiner Definition

In Loop Quantum Gravity and spin network theory, an **intertwiner** is an SU(2)-invariant tensor that ensures gauge invariance at network nodes. For a node with edges labeled by spins $j_1, j_2, \ldots, j_n$, an intertwiner maps:

$$\mathcal{I}: \mathcal{H}_{j_1} \otimes \mathcal{H}_{j_2} \otimes \cdots \otimes \mathcal{H}_{j_n} \rightarrow \mathbb{C}$$

where each $\mathcal{H}_{j_i}$ is a $(2j_i + 1)$-dimensional irreducible representation of SU(2).

### 2. Intertwiner Space

The space of all intertwiners at a node is called the **intertwiner space**:

$$\text{Inv}(j_1, j_2, \ldots, j_n) = \text{Hom}_{\text{SU}(2)}(\mathcal{H}_{j_1} \otimes \mathcal{H}_{j_2} \otimes \cdots \otimes \mathcal{H}_{j_n}, \mathbb{C})$$

This space has finite dimension, which determines the number of independent quantum states at the node.

### 3. Mathematical Construction

#### 3.1 Four-Valent Nodes

For a 4-valent node with edge spins $(j_1, j_2, j_3, j_4)$, the intertwiner space dimension is calculated using the recoupling scheme:

$$(j_1 \otimes j_2) \otimes (j_3 \otimes j_4) \rightarrow j = 0$$

The dimension equals the number of ways to achieve this coupling:

$$\dim(\text{Inv}(j_1, j_2, j_3, j_4)) = \sum_{j_{12}} \delta_{j_{12}, j_{34}}$$

where:
- $j_{12} \in \{|j_1 - j_2|, |j_1 - j_2| + 1, \ldots, j_1 + j_2\}$
- $j_{34} \in \{|j_3 - j_4|, |j_3 - j_4| + 1, \ldots, j_3 + j_4\}$

#### 3.2 Three-Valent Nodes

For 3-valent nodes with spins $(j_1, j_2, j_3)$, the intertwiner space is 1-dimensional if the triangle inequality is satisfied:

$$|j_1 - j_2| \leq j_3 \leq j_1 + j_2$$
$$|j_2 - j_3| \leq j_1 \leq j_2 + j_3$$
$$|j_3 - j_1| \leq j_2 \leq j_3 + j_1$$

#### 3.3 Basis State Construction

Basis states are constructed using Clebsch-Gordan coefficients:

$$|\text{intertwiner}\rangle = \sum_{m_1,m_2,m_3,m_4} \sum_{j_{12}, m_{12}} C_{j_1,m_1;j_2,m_2}^{j_{12},m_{12}} \; C_{j_3,m_3;j_4,m_4}^{j_{12},-m_{12}} \; |j_1,m_1\rangle \otimes |j_2,m_2\rangle \otimes |j_3,m_3\rangle \otimes |j_4,m_4\rangle$$

### 4. Special Cases

#### 4.1 Four Spin-1/2 Edges

The most common case has 2-dimensional intertwiner space with basis:

**Singlet-Singlet Coupling:**
$$|\psi_1\rangle = \frac{1}{2}(|\uparrow\downarrow\uparrow\downarrow\rangle - |\uparrow\downarrow\downarrow\uparrow\rangle - |\downarrow\uparrow\uparrow\downarrow\rangle + |\downarrow\uparrow\downarrow\uparrow\rangle)$$

**Triplet-Triplet Coupling:**
$$|\psi_2\rangle = \frac{1}{\sqrt{3}}|\uparrow\uparrow\downarrow\downarrow\rangle + \frac{1}{\sqrt{3}}|\downarrow\downarrow\uparrow\uparrow\rangle - \frac{1}{2\sqrt{3}}(\text{mixed terms})$$

## Implementation Design

### 1. Module Structure

```
packages/quantum/src/intertwiner/
├── index.ts              # Public API exports
├── types.ts              # TypeScript interfaces
├── core.ts               # Core dimension calculations
├── basis.ts              # Basis state construction
└── tensor.ts             # Tensor representation

packages/quantum/__tests__/intertwiner/
├── core.test.ts          # Core function tests
├── basis.test.ts         # Basis construction tests
└── tensor.test.ts        # Tensor representation tests
```

### 2. Key Interfaces

#### 2.1 IntertwinerBasisState
```typescript
export interface IntertwinerBasisState {
  intermediateJ: number;           // Intermediate angular momentum
  stateVector: StateVector;        // State in tensor product space
  recouplingScheme: string;        // e.g., "(j1,j2)(j3,j4)"
  normalization: number;           // Normalization factor
}
```

#### 2.2 IntertwinerSpace
```typescript
export interface IntertwinerSpace {
  dimension: number;               // Space dimension
  basisStates: IntertwinerBasisState[];  // Orthonormal basis
  edgeSpins: number[];            // Input edge spins
  totalJ: number;                 // Total angular momentum (0)
}
```

#### 2.3 IntertwinerTensor
```typescript
export interface IntertwinerTensor {
  dimensions: number[];           // Edge dimensions (2j+1)
  stateVector: StateVector;       // Sparse tensor as state vector
  basisState: IntertwinerBasisState;  // Associated basis information
}
```

### 3. Core Functions

#### 3.1 Dimension Calculation
```typescript
/**
 * Calculate intertwiner space dimension
 */
export function calculateDimension(edgeSpins: number[]): number;

/**
 * Check triangle inequality for three spins
 */
export function triangleInequality(j1: number, j2: number, j3: number): boolean;

/**
 * Get allowed intermediate spins when coupling j1 and j2
 */
export function allowedIntermediateSpins(j1: number, j2: number): number[];
```

#### 3.2 Basis Construction
```typescript
/**
 * Construct complete orthonormal basis for intertwiner space
 */
export function constructBasis(edgeSpins: number[]): IntertwinerSpace;

/**
 * Construct single basis vector for given intermediate coupling
 */
export function constructBasisVector(
  j1: number, j2: number, j3: number, j4: number, 
  intermediateJ: number
): IntertwinerBasisState;

/**
 * Optimized basis for four spin-1/2 edges
 */
export function getFourSpinHalfBasis(): IntertwinerSpace;
```

#### 3.3 Tensor Representation
```typescript
/**
 * Convert basis state to sparse tensor representation
 */
export function basisToTensor(basis: IntertwinerBasisState): IntertwinerTensor;

/**
 * Create intertwiner tensor from edge spins and intermediate J
 */
export function createIntertwinerTensor(
  edgeSpins: number[], 
  intermediateJ: number
): IntertwinerTensor;
```

### 4. Integration with Existing Framework

#### 4.1 Use Existing Components
- **StateVector**: Primary data structure for representing intertwiner states
- **Clebsch-Gordan coefficients**: From `angularMomentum/composition.ts`
- **Angular momentum validation**: From `angularMomentum/core.ts`
- **Complex number handling**: From `core/types.ts`

#### 4.2 Example Usage
```typescript
import { calculateDimension, constructBasis } from '@quantum/intertwiner';

// Calculate dimension for 4-valent node with spin-1/2 edges
const dimension = calculateDimension([0.5, 0.5, 0.5, 0.5]);
console.log(dimension); // Output: 2

// Construct complete basis
const space = constructBasis([0.5, 0.5, 0.5, 0.5]);
console.log(space.basisStates.length); // Output: 2
```

### 5. Port Strategy from Existing Code

#### 5.1 From `lib/core/intertwinerSpace.ts`
- **Direct port**: `triangleInequality`, `allowedIntermediateSpins`, `intertwinerDimension`
- **Adapt**: `constructBasisVector` to use quantum module's `StateVector`
- **Replace**: Custom CG coefficients with quantum module's `clebschGordan`

#### 5.2 From `lib/tensor/tensorNode.ts`
- **Extract**: Sparse tensor element logic
- **Adapt**: Convert to `StateVector` representation
- **Simplify**: Remove visualization-specific properties

#### 5.3 From `src/simulation/` files
- **Reference**: Geometric property calculations for validation
- **Integrate**: Volume/area calculations with intertwiner tensors

### 6. Testing Strategy

Tests will be located in the shared `packages/quantum/__tests__/intertwiner/` directory to maintain consistency with the existing quantum module testing structure.

#### 6.1 Unit Tests (`__tests__/intertwiner/core.test.ts`)
- **Dimension calculations**: Verify against known results
- **Triangle inequality**: Edge cases and validation
- **Allowed intermediate spins**: Coupling rule verification

#### 6.2 Basis Tests (`__tests__/intertwiner/basis.test.ts`)
- **Basis orthonormality**: Check inner products
- **Special cases**: Four spin-1/2, three-valent nodes
- **CG coefficient consistency**: Compare with direct calculations

#### 6.3 Tensor Tests (`__tests__/intertwiner/tensor.test.ts`)
- **StateVector operations**: Tensor products, normalization
- **Sparse representation**: Conversion accuracy
- **Numerical stability**: Large spin values, edge cases

#### 6.4 Regression Tests
- **Port validation**: Compare results with existing `lib/` implementation
- **Performance**: Benchmark against current code

### 7. Implementation Phases

#### Phase 1: Core Functions
1. Port basic dimension calculations
2. Implement triangle inequality checks
3. Set up module structure and types

#### Phase 2: Basis Construction
1. Port `constructBasisVector` using quantum CG coefficients
2. Implement orthonormalization using `StateVector` operations
3. Add optimized four spin-1/2 case

#### Phase 3: Tensor Integration
1. Adapt sparse tensor representation to `StateVector`
2. Implement conversion utilities
3. Add comprehensive tests

#### Phase 4: Documentation and Examples
1. Complete API documentation
2. Add usage examples
3. Integration guide for existing codebase

## Migration Benefits

1. **Unified Framework**: All quantum calculations in one module
2. **Better CG Coefficients**: Use validated implementation from quantum module
3. **Type Safety**: Comprehensive TypeScript interfaces
4. **Performance**: Optimized StateVector operations
5. **Maintainability**: Clear separation of concerns
6. **Testing**: Comprehensive test coverage

## Compatibility

The new module will maintain complete API compatibility with existing intertwiner code while providing enhanced functionality through the quantum framework's infrastructure.
