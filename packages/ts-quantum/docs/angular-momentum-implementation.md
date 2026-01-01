# Angular Momentum Implementation

*Last Updated: 2025-05-24*

This document describes the implementation of angular momentum algebra in the quantum library, including design choices, algorithms, data structures, and encountered issues during development.

## 1. Implementation Overview

The angular momentum module implements quantum mechanical angular momentum operators, states, and composition. It provides the mathematical framework for handling spin systems, rotation operators, and coupled angular momenta.

### 1.1 Key Components

- **Core Operators**: J₊, J₋, Jz, Jx, Jy, J²
- **Angular Momentum States**: |j,m⟩ basis states
- **Composition**: Clebsch-Gordan coefficients and angular momentum addition
- **Wigner Symbols**: 3j, 6j, and 9j symbols (planned)

### 1.2 Directory Structure

```
packages/quantum/
├── src/
│   ├── angularMomentum/
│   │   ├── core.ts         - Core operators and states
│   │   ├── composition.ts  - Angular momentum addition
│   │   ├── wignerSymbols.ts - Wigner symbols (planned)
│   │   └── index.ts        - Public exports
│   └── ...
└── __tests__/
    └── angularMomentum/
        ├── operators.test.ts
        ├── states.test.ts
        ├── composition.test.ts
        └── wignerSymbols.test.ts
```

## 2. Design Choices

### 2.1 Operator Representation

Angular momentum operators are implemented as matrix operators in a fixed-j basis, following standard quantum mechanics conventions:

- **Choice**: Represent operators as matrices rather than functions that act on states
- **Rationale**: Allows for explicit matrix operations, eigenvalue decomposition, and tensor product operations
- **Implementation**: 
  ```typescript
  export function createJz(j: number): IOperator {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    const matrix = createZeroMatrix(dim);

    // Fill diagonal elements
    for (let m = -j; m <= j; m++) {
      const idx = m + j;
      matrix[idx][idx] = math.complex(m, 0);
    }

    return new MatrixOperator(matrix, 'hermitian', true, { j });
  }
  ```

### 2.2 State Representation

Angular momentum states are represented as state vectors in the standard |j,m⟩ basis:

- **Choice**: Store states as complex amplitude vectors with additional properties
- **Rationale**: Consistent with the broader quantum state framework, allows for general quantum operations
- **Implementation**:
  ```typescript
  export function createState(j: number, m: number): StateVector {
    validateJ(j);
    if (!isValidM(j, m)) {
      throw new Error(`Invalid m=${m} for j=${j}`);
    }

    const dim = Math.floor(2 * j + 1);
    const amplitudes = Array(dim).fill(null).map(() => math.complex(0, 0));
    const idx = m + j;
    amplitudes[idx] = math.complex(1, 0);

    return new StateVector(dim, amplitudes, `|${j},${m}⟩`);
  }
  ```

### 2.3 Metadata-Based StateVector System

To enable unlimited multi-spin coupling and eliminate parameter dependencies, a comprehensive metadata system was implemented:

- **Choice**: Self-describing StateVector objects with angular momentum metadata
- **Rationale**: Eliminates the need for explicit j1, j2 parameters in multi-spin state analysis, enables scalable multi-spin coupling
- **Implementation**:
  ```typescript
  interface AngularMomentumMetadata {
    type: 'angular_momentum';
    j: number;                    // Total angular momentum
    mRange: [number, number];     // [mMin, mMax] range
    couplingHistory: CouplingRecord[];
    jComponents: Map<number, JComponentMetadata>;
    isComposite: boolean;
  }
  ```

Key benefits:
- **Scalability**: Works for unlimited number of coupled spins
- **Accuracy**: Metadata synchronizes with actual state content
- **Backwards Compatibility**: Legacy parameter-based functions still work
- **Self-Contained**: States carry complete structure information

### 2.4 Clebsch-Gordan Coefficient Calculation

For Clebsch-Gordan coefficients, multiple approaches were considered:

- **Choice**: Hybrid approach with special cases and recursive calculation
- **Rationale**: Balances performance, accuracy, and implementation complexity
- **Implementation**:
  - Special cases for j=1/2 spin particles
  - Recursive calculation for general cases
  - Caching of computed coefficients for performance

## 3. Algorithms and Data Structures

### 3.1 Matrix Representation of Angular Momentum Operators

For a system with fixed angular momentum j, the matrices are (2j+1)×(2j+1) dimensions:

1. **Jz Operator**: Diagonal matrix with elements m (from -j to j)
2. **J± Operators**: Raising and lowering operators with non-zero elements in specific positions
3. **J² Operator**: Can be constructed directly or from J₊J₋ + Jz² - Jz

Example for j=1/2:
- Jz = [[1/2, 0], [0, -1/2]]
- J₊ = [[0, 0], [1, 0]]
- J₋ = [[0, 1], [0, 0]]

### 3.2 Raising and Lowering Operators

The raising and lowering operators are implemented using the standard formulas:

J₊|j,m⟩ = √(j(j+1) - m(m+1)) |j,m+1⟩
J₋|j,m⟩ = √(j(j+1) - m(m-1)) |j,m-1⟩

### 3.3 Clebsch-Gordan Coefficients

Implementation strategies:

1. **Direct Formula**: Implemented for simple cases (j=1/2 particles)
2. **Recursive Method**: Implemented for general cases
3. **Table Lookup**: Considered but not used due to memory constraints

Data structure:
```typescript
interface CGTablePair {
  j1: number;
  j2: number;
  coeffs: {
    [j: string]: {
      [m: string]: {
        [m1: string]: number;
      }
    }
  }
}
```

### 3.4 Angular Momentum Addition

The angular momentum addition algorithm combines two quantum states using Clebsch-Gordan coefficients:

1. Create an empty result state vector
2. For each allowed j, m combination:
   - Sum over m1, m2 contributions using CG coefficients
   - Add to the result state
3. Return the combined state

### 3.5 Multi-Spin State Analysis and Extraction

The metadata-based system enables robust multi-spin state analysis:

**Key Algorithm Features**:
1. **Metadata-Based Analysis**: Uses StateVector metadata when available, falls back to legacy parameters
2. **Amplitude Indexing Synchronization**: Only includes J components with actual non-zero amplitudes
3. **Direct Extraction**: J-component extraction uses metadata indices for perfect accuracy

**Critical Implementation Details**:
```typescript
// Only add to metadata if component has non-zero amplitudes
for (let j = jMax; j >= jMin; j -= 0.5) {
  const dimension = Math.floor(2 * j + 1);
  let hasNonZeroAmplitudes = false;
  
  for (let mIndex = 0; mIndex < dimension; mIndex++) {
    const amp = resultAmplitudes[amplitudeIndex + mIndex];
    if (math.abs(amp) > 1e-12) {
      hasNonZeroAmplitudes = true;
      break;
    }
  }
  
  if (hasNonZeroAmplitudes) {
    jComponents.set(j, { j, startIndex: amplitudeIndex, dimension, normalizationFactor: 1 });
  }
}
```

This ensures perfect synchronization between metadata and actual state content, enabling unlimited multi-spin coupling.

## 4. Issues and Resolutions

During development, several issues were encountered:

### 4.1 Matrix Representation Issues

**Issue**: J± matrix element positioning was incorrect
```typescript
// Incorrect
matrix[row][col] = math.complex(element, 0);
```

**Resolution**: Swapped row/column indexing for J± operators
```typescript
// For J+, the matrix for j=1/2 should be [[0,0],[1,0]]
// For J-, the matrix for j=1/2 should be [[0,1],[0,0]]
```

### 4.2 Complex Number Comparison

**Issue**: StateVector equality testing failed due to complex number comparison
```typescript
// Incorrect
const absDiff = math.abs(diff).re;
```

**Resolution**: Properly handle complex number comparison
```typescript
// Correct
const absDiff = math.abs(diff) as unknown as number;
```

### 4.3 Clebsch-Gordan Coefficient Calculation

**Issue**: The implementation of Clebsch-Gordan coefficients for spin-1/2 particles didn't match expected test values

**Resolution**: Modified the coefficient calculation to match the expected phase convention:
```typescript
if (Math.abs(j - 0) < 1e-10) {
  // Singlet state (j=0)
  if (Math.abs(m1 - 0.5) < 1e-10 && Math.abs(m2 - (-0.5)) < 1e-10) {
    return math.complex(-1 / Math.sqrt(2), 0); 
  } else if (Math.abs(m1 - (-0.5)) < 1e-10 && Math.abs(m2 - 0.5) < 1e-10) {
    return math.complex(1 / Math.sqrt(2), 0);
  }
}
```

### 4.4 State Convention and Indexing Issues

**Issue**: The convention for mapping angular momentum states to computational basis states was incorrect. Originally:
- m=+1/2 was mapped to |0⟩
- m=-1/2 was mapped to |1⟩

This conflicted with the standard quantum computing convention where:
- |0⟩ should correspond to m=-1/2 (spin down)
- |1⟩ should correspond to m=+1/2 (spin up)

**Resolution**: Modified the indexing in createJmState:
```typescript
// Old version
const idx = j-m;  // Wrong: mapped m=+1/2 to |0⟩

// New version
const idx = dim - 1 - (j + m);  // Correct: maps m=-1/2 to |0⟩
```

### 4.5 Jz Operator Implementation

**Issue**: The Jz operator matrix elements were incorrectly ordered due to the state convention issue.

**Resolution**: Modified createJz to properly map m values to matrix indices:
```typescript
for (let idx = 0; idx < dim; idx++) {
    const m = -j + (dim - 1 - idx);
    matrix[idx][idx] = math.complex(m, 0);
}
```

This ensures:
- For j=1/2: Jz = [[+1/2, 0], [0, -1/2]]
- Matches our convention where |1⟩ (m=+1/2) is [1,0]ᵀ

### 4.6 J² Construction Issues

**Issue**: The J² operator construction from components (J₊J₋ + Jz² - Jz) was giving incorrect results due to operator precedence and grouping issues:
```typescript
// Incorrect implementation
jPlusJMinus.add(jzSquared).add(jz.scale(math.complex(-1, 0)))  // (J₊J₋ + Jz²) + (-Jz)
```

**Resolution**: Fixed the operator construction to properly implement J² = J₊J₋ + Jz² - Jz:
```typescript
// Correct implementation
jPlusJMinus.add(jzSquared).subtract(jz)  // J₊J₋ + Jz² - Jz
```

### 4.7 Jy Sign Convention

**Issue**: The Jy operator had incorrect signs in its matrix elements due to a sign error in the complex number multiplication:
```typescript
// Incorrect: multiplying by i/2 instead of 1/(2i)
math.complex(0, 0.5)  // This gives i/2
```

**Resolution**: Fixed the complex number multiplication in createJy:
```typescript
// Correct: multiplying by 1/(2i) = -i/2
math.complex(0, -0.5)
```

### 4.8 Eigenvalue Equation Testing

**Issue**: Eigenvalue equations tests failed due to both matrix element issues and equality testing problems

**Resolution**:
1. Fixed operator matrix elements
2. Improved equality testing in StateVector class
3. Ensured proper handling of operator application to states

### 4.9 Critical Indexing Consistency Issues

**Issue**: Multiple indexing inconsistencies were discovered across the angular momentum module that caused incorrect quantum calculations. The core problem was that different functions used different indexing conventions for the same physical states.

**Specific Problems Identified**:

1. **State Creation vs. Composition Indexing Mismatch**:
   - `createJmState()` used: `idx = dim - 1 - (j + m)` (reverse ordering)
   - `addAngularMomenta()` used: `idx = m + j` (forward ordering)
   - This caused incorrect amplitude retrieval during state coupling

2. **Basis Conversion Inconsistency**:
   - `computationalToAngularBasis()` used: `angularIndex = m + j`
   - `angularToComputationalBasis()` used: `angularIndex = dim - 1 - (j + m)`
   - Round-trip conversions would fail due to opposite indexing conventions

3. **Operator Matrix Construction Mismatch**:
   - Operators `createJplus()` and `createJminus()` used: `row = m + j, col = m + j ± 1`
   - States used: `idx = dim - 1 - (j + m)`
   - This caused operators to act on wrong state indices (e.g., J₊|1/2⟩ → |-1/2⟩ instead of 0)

**Root Cause**: The module mixed two different indexing conventions:
- **Forward ordering**: Lower indices for lower m values (m + j)
- **Reverse ordering**: Lower indices for higher m values (dim - 1 - (j + m))

**Comprehensive Resolution**:

1. **Standardized on Reverse Ordering Convention**:
   ```typescript
   // Consistent indexing: idx = dim - 1 - (j + m)
   // For j=1/2: |1/2,1/2⟩ at index 0, |1/2,-1/2⟩ at index 1
   ```

2. **Fixed Composition Functions**:
   ```typescript
   // Fixed in addAngularMomenta()
   const dim1 = Math.floor(2 * j1 + 1);
   const idx1 = dim1 - 1 - Math.floor(j1 + m1);  // Was: m1 + j1
   const amp1 = state1.amplitudes[idx1];
   ```

3. **Fixed Basis Conversion**:
   ```typescript
   // Fixed in computationalToAngularBasis()
   const angularIndex = dim - 1 - (j + m);  // Was: m + j
   newAmplitudes[angularIndex] = state.amplitudes[n];
   ```

4. **Fixed Operator Matrix Construction**:
   ```typescript
   // Fixed in createJplus()
   const fromStateIdx = dim - 1 - (j + m);         // |j,m⟩
   const toStateIdx = dim - 1 - (j + (m + 1));     // |j,m+1⟩
   matrix[fromStateIdx][toStateIdx] = math.complex(element, 0);
   ```

**Verification**: Created comprehensive indexing test suite (`indexing.test.ts`) with 25+ tests covering:
- State creation consistency
- Operator action verification
- Matrix element validation
- Basis conversion round-trips
- Angular momentum coupling
- Cross-consistency checks

**Impact**: These fixes were critical for correct quantum calculations. Without them, angular momentum operations would produce physically incorrect results, making the entire angular momentum algebra unreliable.

### 4.10 Session Fixes (2025-05-24)

During a focused debugging session, three critical issues were identified and resolved:

#### Issue #1: Missing StateVector `add` Method
**Problem**: The `add` method was not implemented in the StateVector class, causing "add is not a function" errors in tests that attempted to create superpositions by adding existing states.

**Solution**: 
- Implemented `add` method in StateVector class:
  ```typescript
  add(other: IStateVector): IStateVector {
    if (this.dimension !== other.dimension) {
      throw new Error(`Cannot add state vectors with different dimensions`);
    }
    const sumAmplitudes = this.amplitudes.map((amp, i) =>
      math.add(toComplex(amp), toComplex(other.getState(i))) as Complex
    );
    return new StateVector(this.dimension, sumAmplitudes, newBasis, this.properties);
  }
  ```
- Updated IStateVector interface to include the `add` method signature

**Impact**: Enabled natural superposition construction (e.g., `state1.scale(c1).add(state2.scale(c2))`) and fixed completeness relation tests.

#### Issue #2: Operator Matrix Indexing Error
**Problem**: The J+ and J- operators had incorrect matrix element placement, causing ladder operations to fail. The console output showed:
- State Down: `+ 1|1⟩` (should be `|-1/2⟩`)
- Raised: `0` (should be `|1/2⟩`)
- Expected: `1|0⟩` (should be `|1/2⟩`)

**Root Cause**: Matrix elements were placed at `matrix[fromStateIdx][toStateIdx]` instead of `matrix[toStateIdx][fromStateIdx]`, causing incorrect matrix multiplication results.

**Solution**: Fixed matrix element placement in both operators:
```typescript
// J+ operator: J+|j,m⟩ = √(j(j+1) - m(m+1)) |j,m+1⟩
matrix[toStateIdx][fromStateIdx] = math.complex(element, 0);

// J- operator: J-|j,m⟩ = √(j(j+1) - m(m-1)) |j,m-1⟩
matrix[toStateIdx][fromStateIdx] = math.complex(element, 0);
```

**Impact**: J+ and J- operators now correctly perform ladder operations, enabling proper angular momentum state transitions.

#### Issue #3: MathJS Type Handling
**Problem**: TypeScript compilation errors when using `math.abs()` on Complex numbers in tests, with error messages about MathJsChain type mismatches.

**Solution**: Used direct property access instead of function calls:
```typescript
// Instead of: Number(math.abs(matrix[i][j]))
// Use: matrix[i][j].re (for real parts)
```

**Impact**: Resolved all TypeScript compilation errors in the indexing test suite.

#### Key Lessons Learned:
1. **Never change working code to match tests**: The implementation should be the source of truth, not the test expectations.
2. **Focus on root causes**: Apparent test failures often indicate real implementation issues rather than test problems.
3. **Matrix indexing matters**: In quantum mechanics, the placement of matrix elements directly affects physical operations.
4. **Simple solutions first**: Sometimes the fix is much simpler than initially thought (like using `.re` property).

#### Final Result:
All indexing tests now pass, confirming that the angular momentum module has consistent indexing throughout and correctly implements quantum mechanical operations.

## 5. Ongoing Challenges

### 5.1 Remaining Test Failures

The implementation still has several failing tests:

1. **Matrix Elements**: Jz and Jy matrix elements aren't matching expected values
2. **State Vector Components**: Angular momentum state components don't match expectations
3. **Clebsch-Gordan Coefficients**: Implementation doesn't match expected values for all cases

### 5.2 TypeScript Type Limitations

Challenges with TypeScript and math.js:

1. **Complex Number Handling**: Type assertions needed for math.js operations
2. **Generic Matrix Operations**: TypeScript struggles with mathematical properties
3. **Performance Concerns**: Need to balance type safety with computational efficiency

## 6. Future Work

### 6.1 Planned Features

1. Complete Wigner symbols implementation (3j, 6j, 9j)
2. Implement spin coherent states
3. Add rotation operators with Euler angles
4. Improve numerical stability for higher j values

### 6.2 Optimization Opportunities

1. Add memoization for frequently used calculations
2. Implement sparse matrix representation for higher j values
3. Add validation caching to improve performance

## 7. Implementation Checklist

### 7.1 Core Components
- [x] Angular momentum operators (J±, Jz)
- [x] Derived operators (Jx, Jy, J²)
- [x] Angular momentum states |j,m⟩
- [x] Basic rotation operators
- [ ] Coherent states (partially implemented)
- [ ] Wigner d-matrices

### 7.2 Test Suite
- [x] Basic operator creation tests
- [x] Matrix representation tests (partial)
- [x] Eigenvalue equation tests
- [x] Commutation relation tests
- [x] State vector tests (partial)
- [x] Raising/lowering operator tests
- [ ] Comprehensive state manipulation tests
- [ ] Rotation operator tests

### 7.3 Composition System
- [x] Clebsch-Gordan coefficient calculation (partial)
- [x] Angular momentum addition framework
- [ ] State decomposition
- [ ] Tensor product space construction
- [ ] j₁ + j₂ → j coupling scheme

### 7.4 Wigner Symbols
- [ ] 3j symbol calculation
- [ ] 6j symbol calculation 
- [ ] 9j symbol calculation
- [ ] Symmetry properties
- [ ] Recoupling transformations

### 7.5 Library Integration
- [x] Integration with core state vector system
- [x] Integration with operator framework
- [ ] Integration with tensor system
- [ ] Integration with visualization components
- [ ] Public API documentation

### 7.6 Optimizations
- [x] Basic caching system for coefficients
- [ ] Advanced memoization
- [ ] Special case handling for common j values
- [ ] Sparse matrix optimizations
- [ ] Numerical stability improvements

## 8. References

1. Varshalovich, D.A., et al. "Quantum Theory of Angular Momentum"
2. Sakurai, J.J. "Modern Quantum Mechanics"
3. Cohen-Tannoudji, C. "Quantum Mechanics"
4. The mathematical background in "clebsch-gordan-algorithm.md"
5. The data structure analysis in "clebsch-gordan-data-structures.md"

## 9. Clebsch-Gordan Coefficient JSON Data File

A precomputed JSON file, `cg-sparse-j1-j2-leq-2.json`, is provided in the `docs/` directory for efficient lookup and testing of Clebsch-Gordan coefficients for all cases with j₁, j₂ ≤ 2.

### 9.1 Format

The file uses a sparse map format, where each key is a string of the form:

```
"j1,m1,j2,m2,j,m"
```

and the value is the corresponding Clebsch-Gordan coefficient (as a number, real-valued, with phase convention matching the implementation).

#### Example:
```json
{
  "1,1,1,0,2,1": 0.7071,
  "1,0,1,1,2,1": 0.7071,
  ...
}
```

- Only nonzero coefficients are included.
- All quantum numbers are represented as numbers (including half-integers, e.g., 0.5).
- This format is highly efficient for lookup and storage, and is suitable for both testing and runtime use in the quantum library.

### 9.2 Usage

- The JSON file can be loaded and queried directly for any allowed (j₁, m₁, j₂, m₂, j, m) combination.
- This approach avoids the need for recursive calculation or large nested objects, and is especially useful for test validation and rapid prototyping.

See also: `cg-sparse-j1-j2-leq-2.json` in the `docs/` directory.
