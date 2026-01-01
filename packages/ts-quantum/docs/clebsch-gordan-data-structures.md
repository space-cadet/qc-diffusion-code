# Data Structures for Clebsch-Gordan Coefficients

*Last Updated: May 17, 2025*

This document explores various data structure options for storing and accessing Clebsch-Gordan coefficients in the context of spin network calculations.

## Requirements

### Quantum Numbers
- j1, j2: Angular momenta of the two systems being coupled
- m1, m2: Magnetic quantum numbers (-j1 ≤ m1 ≤ j1 and -j2 ≤ m2 ≤ j2)
- j: Total angular momentum (|j1-j2| ≤ j ≤ j1+j2)
- m: Total magnetic quantum number (m = m1 + m2, -j ≤ m ≤ j)

### Usage Patterns in Spin Networks
1. Fixed j1, j2 values for extended calculations
2. Need all m-values for state vector computations
3. Frequent access to coefficients for various m-combinations
4. Used heavily in intertwiner calculations
5. Need fast access for graph state compositions

## Option 1: Four-Dimensional Array

```typescript
type CGTable = number[][][][];  // [j1_idx][j2_idx][j_idx][m_idx]

// Index mapping
function getIndices(j1: number, m1: number, j2: number, m2: number, j: number): [number, number, number, number] {
    return [
        Math.round(m1 + j1),    // j1_idx
        Math.round(m2 + j2),    // j2_idx
        Math.round(j - Math.abs(j1-j2)), // j_idx
        Math.round(m1 + m2 + j)  // m_idx
    ];
}
```

### Pros
- Direct array indexing is fast
- Natural for generating complete coefficient sets
- Good cache locality for sequential access
- Simple to implement

### Cons
- Many empty/unused entries due to selection rules
- Fixed size regardless of actual non-zero coefficients
- Extra dimension for j1,j2 indices usually not needed
- Memory inefficient

### Usage Example
```typescript
const table: CGTable = Array(2*j1+1).fill(null)
    .map(() => Array(2*j2+1).fill(null)
        .map(() => Array(Math.floor(j1+j2)-Math.floor(Math.abs(j1-j2))+1).fill(null)
            .map(() => Array(2*Math.floor(j1+j2)+1).fill(0))));

const [j1_idx, j2_idx, j_idx, m_idx] = getIndices(j1, m1, j2, m2, j);
const coeff = table[j1_idx][j2_idx][j_idx][m_idx];
```

## Option 2: Sparse Map

```typescript
type CGSparseTable = Map<string, number>;

// Key format: "j1,m1,j2,m2,j,m"
function makeKey(j1: number, m1: number, j2: number, m2: number, j: number, m: number): string {
    return `${j1},${m1},${j2},${m2},${j},${m}`;
}
```

### Pros
- Only stores non-zero coefficients
- Flexible for any combination of quantum numbers
- Memory efficient
- Easy to add new coefficients

### Cons
- String key comparisons are slower than array indexing
- Need to parse strings for lookup
- Not cache-friendly
- Overhead for Map data structure

### Usage Example
```typescript
const table = new Map<string, number>();
table.set(makeKey(0.5, 0.5, 0.5, -0.5, 0, 0), 1/Math.sqrt(2));
const coeff = table.get(makeKey(j1, m1, j2, m2, j, m)) ?? 0;
```

## Option 3: Three-Dimensional Array

```typescript
type CGArray = number[][][];  // [m1_idx][m2_idx][j_idx]

interface CGDimensions {
    j1: number;
    j2: number;
    dims: {
        m1_size: number;    // 2*j1 + 1
        m2_size: number;    // 2*j2 + 1
        j_size: number;     // j1 + j2 - |j1-j2| + 1
    }
}
```

### Pros
- Direct indexing for m1, m2
- Compact for fixed j1, j2
- Good cache locality
- Simpler than 4D array

### Cons
- Still has unused entries due to selection rules
- Less intuitive mapping from quantum numbers
- Fixed size regardless of sparsity
- Less flexible for varying j1, j2

### Usage Example
```typescript
const dims: CGDimensions = {
    j1: 0.5,
    j2: 0.5,
    dims: {
        m1_size: 2,
        m2_size: 2,
        j_size: 2
    }
};

const table: CGArray = Array(dims.dims.m1_size)
    .fill(null)
    .map(() => Array(dims.dims.m2_size)
        .fill(null)
        .map(() => Array(dims.dims.j_size)
            .fill(0)));

const [m1_idx, m2_idx, j_idx] = getIndices(j1, m1, j2, m2, j);
const coeff = table[m1_idx][m2_idx][j_idx];
```

## Option 4: Structured Object

```typescript
interface CGTablePair {
    j1: number;
    j2: number;
    coeffs: {
        [j: number]: {            // total angular momentum
            [m: number]: {        // total m
                [m1: number]: number;  // coefficient for given m1
            }
        }
    }
}
```

### Pros
- Direct mapping to quantum numbers
- Natural for fixed j1, j2
- Only stores needed coefficients
- Clear structure matching physical meaning
- Easy to understand and maintain

### Cons
- Object property lookup vs array indexing
- More complex to initialize
- Nested object access can be slower
- Floating point keys can be problematic

### Usage Example
```typescript
const table: CGTablePair = {
    j1: 0.5,
    j2: 0.5,
    coeffs: {
        0: {  // singlet
            0: {  // m = 0
                0.5: 1/Math.sqrt(2),   // m1 = 1/2
                -0.5: -1/Math.sqrt(2)  // m1 = -1/2
            }
        },
        1: {  // triplet
            1: { 0.5: 1 },
            0: { 
                0.5: 1/Math.sqrt(2),
                -0.5: 1/Math.sqrt(2)
            },
            -1: { -0.5: 1 }
        }
    }
};

// Access with helper function
function getCG(table: CGTablePair, j: number, m: number, m1: number): number {
    return table.coeffs[j]?.[m]?.[m1] ?? 0;
}
```

## Option 5: Flat Array with Index Calculation

```typescript
interface CGFlatTable {
    j1: number;
    j2: number;
    data: Float64Array;
    dims: {
        m1_size: number;
        m2_size: number;
        j_size: number;
    }
}

function getIndex(dims: CGFlatTable['dims'], j: number, m: number, m1: number): number {
    const m1_idx = Math.round(m1 + dims.m1_size/2);
    const m2_idx = Math.round((m - m1) + dims.m2_size/2);
    const j_idx = Math.round(j - Math.abs(j1-j2));
    return m1_idx + dims.m1_size * (m2_idx + dims.m2_size * j_idx);
}
```

### Pros
- Best performance for array access
- Cache-friendly memory layout
- No nested objects or complex data structures
- Efficient memory usage
- Good for vectorized operations

### Cons
- Complex index calculations
- Less intuitive structure
- Fixed size allocation
- Harder to inspect/debug

### Usage Example
```typescript
const table: CGFlatTable = {
    j1: 0.5,
    j2: 0.5,
    dims: {
        m1_size: 2,
        m2_size: 2,
        j_size: 2
    },
    data: new Float64Array(8)  // 2 * 2 * 2
};

const idx = getIndex(table.dims, j, m, m1);
const coeff = table.data[idx];
```

## Option 6: Tuple Array

```typescript
type CGTuple = [j: number, m: number, m1: number, coeff: number];
interface CGTupleTable {
    j1: number;
    j2: number;
    coeffs: CGTuple[];
}
```

### Pros
- Simple structure
- Easy to iterate
- Only stores non-zero coefficients
- Good for serialization
- Easy to extend with additional data

### Cons
- Linear search for lookups
- No direct indexing
- Redundant storage of quantum numbers
- Less efficient for large tables

### Usage Example
```typescript
const table: CGTupleTable = {
    j1: 0.5,
    j2: 0.5,
    coeffs: [
        [0, 0, 0.5, 1/Math.sqrt(2)],
        [0, 0, -0.5, -1/Math.sqrt(2)],
        [1, 1, 0.5, 1],
        [1, 0, 0.5, 1/Math.sqrt(2)],
        [1, 0, -0.5, 1/Math.sqrt(2)],
        [1, -1, -0.5, 1]
    ]
};

function getCG(table: CGTupleTable, j: number, m: number, m1: number): number {
    return table.coeffs.find(([j_, m_, m1_]) => 
        j_ === j && m_ === m && m1_ === m1
    )?.[3] ?? 0;
}
```

## Recommendations

### For Spin Network Calculations
Option 4 (Structured Object) or Option 5 (Flat Array) are recommended:

1. **Option 4** when:
   - Clarity and maintainability are priorities
   - Working with variable j1, j2 combinations
   - Need easy inspection of coefficients
   - Memory efficiency is less critical

2. **Option 5** when:
   - Performance is critical
   - Working with fixed j1, j2 for many calculations
   - Memory layout optimization is important
   - Implementing vectorized operations

### Implementation Strategy

Recommend implementing both:
1. `CGTablePair` for coefficient generation and storage
2. `CGFlatTable` for performance-critical calculations

```typescript
// Generation and storage
const storedTable: CGTablePair = generateCGTable(j1, j2);

// Convert to flat array for calculations
const flatTable: CGFlatTable = convertToFlat(storedTable);
```

This gives us the best of both worlds: clear structure for generation and maintenance, with optimized performance for calculations.

## References

1. Butler, P.H., Point Group Symmetry Applications, Methods and Tables (1981)
2. Varshalovich, D.A., et al., Quantum Theory of Angular Momentum (1988)