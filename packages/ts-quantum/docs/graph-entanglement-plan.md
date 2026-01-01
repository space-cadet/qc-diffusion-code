# Quantum Graph Entanglement Implementation Plan

*Created: 2025-05-30*
*Status: Planning Phase*

## Overview

Extend the QuantumGraph class to support genuine quantum entanglement by implementing composite state storage that spans multiple vertices. Current limitation: individual vertex storage cannot represent entangled states.

## Current Bell Chain Example

The existing Bell chain example demonstrates the limitation:

```
Bell State Chain Examples

1. 3-vertex chain (aperiodic):
   q0 ---- bell_0_1 ---- q1 ---- bell_1_2 ---- q2
   |0⟩                   |0⟩                   |0⟩

2. 4-vertex ring (periodic):
        q0 ---- bell_0_1 ---- q1
        |                      |
   bell_3_0                bell_1_2
        |                      |
        q3 ---- bell_2_3 ---- q2
       |0⟩                   |0⟩

3. 6-vertex chain (aperiodic):
   q0 ---- bell_0_1 ---- q1 ---- bell_1_2 ---- q2 ---- bell_2_3 ---- q3 ---- bell_3_4 ---- q4 ---- bell_4_5 ---- q5
   |1⟩                   |1⟩                   |1⟩                   |1⟩                   |1⟩                   |1⟩

Legend:
- Vertices (qN): Quantum states (qubits)
- Edges (bell_i_j): Bell state entanglement operators
- |0⟩, |1⟩: Initial computational basis states
```

**Issue**: Each vertex stores independent states, edges have only metadata labels.
**Goal**: Transform into genuine entangled Bell states |00⟩ + |11⟩ spanning vertex pairs.

## Current Architecture Issues

**Problem**: One vertex = one quantum object
**Need**: One quantum object across multiple vertices for entanglement

```typescript
// Current (Limited)
vertex_q0: StateVector(|0⟩)  // 2D, independent
vertex_q1: StateVector(|0⟩)  // 2D, independent

// Required (Entangled) 
composite_system: StateVector(|00⟩ + |11⟩)  // 4D, spanning q0,q1
```

## Implementation Plan

### Phase 1: Core Composite State Storage ✅ COMPLETE

**Status**: Implemented and validated in `entangledGraphPOC.ts`

**File**: `packages/quantum/examples/poc/entangledGraphPOC.ts` (~100 lines)
```typescript
class CompositeQuantumManager {
  private composites: Map<string, QuantumObject>;
  private elementToComposite: Map<string, string>;
  
  // Core operations implemented
  setComposite(elementIds: string[], obj: QuantumObject): void;
  getComposite(elementIds: string[]): QuantumObject | undefined;
  getCompositeForElement(elementId: string): QuantumObject | undefined;
}
```

**Validation Results**:
- ✅ Multi-vertex Bell states: |00⟩ + |11⟩ (dim 4, norm 1.0)
- ✅ Multi-edge plaquette operators: |0000⟩ + |1111⟩ (dim 16, norm 1.0)
- ✅ Composite priority over individual assignments
- ✅ Backward compatibility maintained

**File**: `packages/quantum/src/qgraph/types.ts` (~80 lines)
```typescript
interface ICompositeSystem {
  id: string;
  vertexIds: Set<string>;
  state: StateVector;
  dimension: number;
}

interface EntanglementOperation {
  sourceVertices: string[];
  targetVertices: string[];
  operator: IOperator;
  resultingComposite: string;
}
```

### Phase 2: QuantumGraph Integration ✅ COMPLETE

**Status**: Implemented and validated in `entangledGraphPOC.ts`

**File**: `packages/quantum/examples/poc/entangledGraphPOC.ts` (extended implementation)
```typescript
class CompositeQuantumGraph {
  private compositeManager: CompositeQuantumManager;
  
  // Composite methods implemented
  setCompositeQuantumObject(elementIds: string[], obj: QuantumObject): void;
  getCompositeQuantumObject(elementIds: string[]): QuantumObject | undefined;
  
  // Enhanced backward compatible methods
  getVertexQuantumObject(nodeId: string): QuantumObject | undefined; // composite priority
  setVertexQuantumObject(nodeId: string, obj: QuantumObject): void; // prevents overwrites
}
```

**Integration Status**:
- ✅ Composite quantum object management integrated
- ✅ Multi-element quantum states working
- ✅ Backward compatibility with single-element interface
- ✅ Composite priority prevents overlap conflicts

**Next Phase Ready**: Entanglement operations (CNOT, Bell state creation, measurement)

### Phase 3: Graph-State Entanglement Operations ✅ COMPLETE - 3-4 days) 

**Current Status**: Phase 3C Complete - QuantumGraph class wired to general operations module with test coverage.

#### Phase 3A: General Operation Infrastructure ✅ COMPLETE

**Implementation Summary**:
The general operation infrastructure provides a foundation for applying arbitrary quantum operations to arbitrary subsets of graph elements. This addresses the core requirement to create entanglement ON existing graph states rather than attaching pre-entangled objects.

**Files Implemented**:
- `packages/quantum/src/qgraph/QuantumGraph.ts` (+80 lines) - Enhanced with composite manager and operation methods
- `packages/quantum/src/qgraph/CompositeQuantumManager.ts` (30 lines) - Separate class for composite state management  
- `packages/quantum/src/qgraph/operations/general.ts` (150 lines) - General operation functions
- `packages/quantum/src/qgraph/operations/index.ts` (15 lines) - Operations module exports
- `packages/quantum/src/qgraph/types.ts` (updated) - Proper interface separation, removed class definitions

**Key Features Implemented**:
- **Three Operation Methods**: 
  - `applyVertexOperation(vertexIds[], operator)` - Apply to vertex subsets
  - `applyEdgeOperation(edgeIds[], operator)` - Apply to edge subsets  
  - `applyOperation(elementIds[], operator)` - Apply to mixed vertex/edge subsets
- **Composite State Integration**: Get/set methods check composite states first, fall back to individual
- **General Operations Module**: Eight functions for arbitrary operations on graph subsets
- **Measurement Support**: `measureSubsystem(vertexIds[], projector?)` for quantum measurements
- **Proper Type Organization**: Interfaces in types.ts, class implementations in separate files
- **Utility Functions**: Validation, dimension calculation, state extraction/insertion

**Current Capabilities**:
- Apply arbitrary quantum operators to arbitrary vertex/edge subsets
- Automatic composite state creation for multi-element operations  
- State extraction and insertion with composite priority
- Basic measurement operations with outcome calculation
- Validation and dimension calculation for subsystems
- Mixed vertex/edge operations with element type detection

**Architecture Benefits**:
- **General vs Specific**: Framework supports arbitrary operations instead of predefined gate sequences
- **Type Safety**: Proper separation of interfaces and implementations
- **Extensibility**: Operations module can be extended with domain-specific functions
- **Composability**: Basic operations can be combined to create complex quantum circuits

#### Phase 3B: Enhanced Operation Implementation ✅ COMPLETE

**Implementation Summary**:
Enhanced the general operations module to use existing quantum module functionality instead of placeholder implementations. All multi-element operations now work using proven quantum library components.

**Key Enhancements Made**:
- **`applyQuantumOperation()`**: Now handles multi-element operations using tensor products instead of throwing errors
- **`tensorProductStates()`**: Uses existing `StateVector.tensorProduct()` method for sequential tensor products  
- **`splitCompositeState()`**: Uses existing `DensityMatrixOperator.fromPureState()` and `partialTrace()` methods

**Integration with Existing Quantum Module**:
- **StateVector tensor products**: Leverages `StateVector.tensorProduct()` for combining individual states
- **Density matrix operations**: Uses `DensityMatrixOperator.fromPureState()` for pure state density matrices
- **Partial trace operations**: Uses existing `partialTrace()` implementation for subsystem extraction
- **No code duplication**: All functionality reuses existing, tested quantum library components

#### Phase 3C: QuantumGraph Integration ✅ COMPLETE

**Implementation Summary**:
Wired up the QuantumGraph class to use the general operations module instead of placeholder implementations. Added comprehensive test coverage and example code.

**Key Integration Made**:
- **QuantumGraph.applyVertexOperation()**: Now delegates to `applyQuantumOperation()`
- **QuantumGraph.applyEdgeOperation()**: Now delegates to `applyQuantumOperation()`  
- **QuantumGraph.applyOperation()**: Now delegates to `applyQuantumOperation()`
- **QuantumGraph.measureSubsystem()**: Now delegates to `partialMeasurement()`

**Test Coverage Added**:
- `packages/quantum/__tests__/qgraph/general-operations.test.ts` (148 lines) - Comprehensive test suite
- `packages/quantum/examples/qgraph/basicOperations.ts` (178 lines) - Working examples

**Current Working Functionality**:
- **Multi-element gate application**: Apply CNOT, Hadamard, or any operator to multiple graph elements
- **Automatic composite creation**: Multi-element operations automatically create composite states
- **State splitting**: Composite states can be split back into individual subsystems via partial trace
- **Tensor product composition**: Individual vertex states can be combined into entangled composite states
- **Integration consistency**: All operations use the same quantum infrastructure as the rest of the library
- **Full test coverage**: Verified functionality through comprehensive test suite
- **Working examples**: Demonstrated Bell state creation, mixed operations, measurements

#### Composite System Step-by-Step Operation

The current POC composite system works as follows:

1. **Composite Manager Structure**
   - `QCompManager` maintains two maps: `composites` (composite ID → quantum object) and `elementToComposite` (element ID → composite ID)
   - Composite ID created by sorting element IDs and joining with underscore for consistent lookup

2. **Setting Composite Relationships**
   - `setComposite(elementIds[], obj)` stores quantum object under composite ID
   - Each individual element maps to the composite ID in reverse lookup
   - Example: Bell state spanning vertices "0,0" and "0,1" creates composite ID "0,0_0,1"

3. **Retrieval with Composite Priority**
   - `getCompositeForElement(elementId)` returns composite object if element is part of one
   - `getNodeQObj(nodeId)` always returns composite state when element belongs to composite
   - Individual states only allowed if element not already in composite

4. **Composite Object Creation**
   - Current: Pre-created Bell states and plaquette operators attached to multiple elements
   - **Issue**: States created externally, then attached to graph - not generated from graph operations

#### Required Changes for Graph-State Entanglement

**Problem**: Current system attaches pre-entangled objects to graph elements instead of creating entanglement from existing graph states.

**Solution**: Transform to act ON graph states themselves:

1. **Initialize Graph with Individual States**
   - All vertices start with individual |0⟩ states
   - All edges start with individual |0⟩ states  
   - No composite objects initially - pure product state

2. **Graph-Level Gate Operations**
   - `applyVertexGate(vertexId, gate)` - acts on single vertex state
   - `applyEdgeGate(edgeId, gate)` - acts on single edge state
   - `applyTwoVertexGate(vertex1, vertex2, gate)` - creates entanglement between vertices
   - `applyMultiEdgeGate(edgeIds[], gate)` - creates entanglement between edges

3. **Entanglement Creation Process**
   - Apply Hadamard to vertex A: |0⟩ → (|0⟩ + |1⟩)/√2
   - Apply CNOT between vertex A and B: creates Bell state across both
   - System automatically converts individual states to composite when entanglement occurs

4. **State Management During Operations**
   - Detect when operations create entanglement
   - Automatically merge individual states into composites
   - Update composite manager mappings
   - Remove individual states that become part of composites

5. **Operation Interface**
   - `graph.entangleVertices([v1, v2], bellCircuit)`
   - `graph.createPlaquette([e1, e2, e3, e4], stabilizerOp)`
   - Operations work on existing graph-attached states, not external objects

**Current General Implementation**:
The implemented general operations framework provides flexible quantum operations without requiring specific pre-defined functions:

```typescript
// Create Bell state between vertices using general operations
graph.applyOperation([vertex1], hadamardOperator);  // Apply H to first vertex
graph.applyOperation([vertex1, vertex2], cnotOperator);  // Apply CNOT to both

// Create multi-vertex entangled states using general operations
graph.applyOperation([vertex1, vertex2, vertex3], ghzOperator);  // Any multi-qubit operator

// Apply arbitrary operators to arbitrary element subsets
graph.applyVertexOperation(vertexIds, operator);  // Vertex-specific operations
graph.applyEdgeOperation(edgeIds, operator);     // Edge-specific operations
graph.applyOperation(elementIds, operator);      // Mixed vertex/edge operations

// Measurement operations using general framework
const result = graph.measureSubsystem(vertexIds, projector);
```

**Design Philosophy**: Instead of implementing specific entanglement functions, the general operations framework allows users to apply any quantum operator to any subset of graph elements, providing maximum flexibility while maintaining the same functionality.

### Phase 4: Quantum Circuit Operations (2-3 days) **NEXT**

**Proposed Enhancement**: Higher-level convenience functions built on the general operations framework:

```typescript
// Convenience wrappers using the general operations
function applyCNOT(graph: QuantumGraph, controlVertex: string, targetVertex: string): void {
  graph.applyOperation([controlVertex, targetVertex], cnotOperator);
}

function applyHadamard(graph: QuantumGraph, vertex: string): void {
  graph.applyVertexOperation([vertex], hadamardOperator);
}

function applyToffoli(graph: QuantumGraph, control1: string, control2: string, target: string): void {
  graph.applyOperation([control1, control2, target], toffoliOperator);
}

// Circuit sequence execution using general framework
interface CircuitOperation {
  elementIds: string[];
  operator: IOperator;
}

function executeCircuit(graph: QuantumGraph, operations: CircuitOperation[]): void {
  operations.forEach(op => graph.applyOperation(op.elementIds, op.operator));
}
```

**Note**: These are convenience functions that internally use the general `applyOperation()`, `applyVertexOperation()`, and `applyEdgeOperation()` methods already implemented.

### Phase 5: Enhanced Bell Chain Example (1-2 days) **NEXT**

**Proposed Enhancement**: Update Bell chain example to use general operations framework:

```typescript
export function createEntangledBellChain(config: BellChainConfig): QuantumGraph {
  const graph = new QuantumGraph();
  
  // Add individual vertices with |0⟩ states
  for (let i = 0; i < config.numVertices; i++) {
    graph.addNode({id: `q${i}`, type: 'qubit', properties: {...}});
    graph.setVertexQuantumObject(`q${i}`, StateVector.computationalBasis(2, 0));
  }
  
  // Create actual Bell state entanglement using general operations
  for (let i = 0; i < config.numVertices - 1; i++) {
    // Apply Hadamard using general vertex operation
    graph.applyVertexOperation([`q${i}`], hadamardOperator);
    
    // Apply CNOT using general multi-element operation
    graph.applyOperation([`q${i}`, `q${i+1}`], cnotOperator);
    
    console.log(`Created Bell pair between q${i} and q${i+1}`);
  }
  
  // Handle periodic boundary using general operations
  if (config.periodic && config.numVertices > 2) {
    graph.applyOperation([`q${config.numVertices-1}`, `q0`], cnotOperator);
  }
  
  return graph;
}

export function verifyEntanglement(graph: QuantumGraph): void {
  // Use existing quantum module functions for verification
  // Calculate entanglement entropy using existing information.ts functions
  // Verify Bell state correlations using composite state access
  // Show composite state dimensions using existing methods
}
```

**Key Change**: Uses the implemented general operations (`applyVertexOperation`, `applyOperation`) instead of specific gate functions.

### Phase 6: Testing and Validation (2-3 days) **REMAINING**

**Proposed Testing Strategy**: Test the general operations framework functionality:

```typescript
describe('Quantum Graph General Operations', () => {
  test('Multi-element operations', () => {
    // Test applyOperation() with CNOT on two vertices
    // Verify tensor product creation
    // Validate composite state storage
  });
  
  test('Vertex and edge operations', () => {
    // Test applyVertexOperation() with Hadamard
    // Test applyEdgeOperation() with operators on edges
    // Verify element type detection and routing
  });
  
  test('Composite state management', () => {
    // Test tensorProductStates() function
    // Test splitCompositeState() function
    // Verify integration with existing quantum module components
  });
  
  test('Subsystem operations', () => {
    // Test extractSubsystemState() and insertSubsystemState()
    // Test measureSubsystem() functionality
    // Verify partial trace operations
  });
  
  test('Integration with quantum module', () => {
    // Test StateVector.tensorProduct() integration
    // Test DensityMatrixOperator.fromPureState() integration
    // Verify partialTrace() integration
  });
});
```

**Focus**: Test the implemented general operations framework rather than specific quantum circuit functions.

## Implementation Details

### 1. Composite State Identification
```typescript
// Use deterministic IDs for composite systems
function generateCompositeId(vertexIds: string[]): string {
  return `composite_${[...vertexIds].sort().join('_')}`;
}
```

### 2. State Vector Tensor Operations
```typescript
// Extend StateVector for tensor products
class StateVector {
  static tensorProduct(state1: StateVector, state2: StateVector): StateVector;
  static partialTrace(compositeState: StateVector, tracedVertices: number[]): StateVector;
}
```

### 3. Memory Management
```typescript
// Handle large composite state spaces efficiently
class CompositeStateManager {
  private maxCompositeSize: number = 10; // Limit to 2^10 = 1024 dimensions
  
  private validateCompositeSize(vertexCount: number): void {
    if (Math.pow(2, vertexCount) > Math.pow(2, this.maxCompositeSize)) {
      throw new Error(`Composite system too large: ${vertexCount} qubits`);
    }
  }
}
```

### 4. Edge Operator Integration
```typescript
// Apply edge operators to create entanglement
class QuantumGraph {
  applyEdgeOperator(edgeId: string): void {
    const edge = this.getEdge(edgeId);
    const operator = this.getEdgeQuantumObject(edgeId) as IOperator;
    
    if (operator) {
      this.applyCompositeOperation([edge.sourceId, edge.targetId], operator);
    }
  }
}
```

## Success Criteria

1. **Genuine Bell State Creation**: |00⟩ + |11⟩ stored as single composite state ✅ **ACHIEVED**
2. **Multi-element Operations**: CNOT, Hadamard, and arbitrary operators work across vertices ✅ **ACHIEVED**
3. **Composite State Tracking**: System knows which vertices are entangled together ✅ **ACHIEVED**
4. **Existing Library Integration**: All operations use proven quantum module components ✅ **ACHIEVED**
5. **Tensor Product Composition**: Individual states combine into entangled composites ✅ **ACHIEVED**
6. **State Splitting**: Composite states can be decomposed via partial trace ✅ **ACHIEVED**

**Remaining Criteria for Full Implementation**:
7. **Measurement Correlations**: Measuring one qubit instantly affects its partner (Phase 4)
8. **Circuit Operations**: High-level quantum circuit operations (Phase 4)
9. **Memory Efficiency**: No redundant storage of individual states for entangled systems (Phase 5)

## File Structure Summary

```
packages/quantum/src/qgraph/
├── CompositeQuantumManager.ts    # ✅ Core composite state storage
├── QuantumGraph.ts              # ✅ Enhanced with general operation support  
├── operations/
│   ├── general.ts               # ✅ General operation functions (implemented)
│   └── index.ts                 # ✅ Operations module exports
└── types.ts                     # ✅ Interface definitions

packages/quantum/examples/qgraph/
├── bellStateChain.ts            # ✅ Basic example (static structure)
├── basicOperations.ts           # ✅ Working examples with test coverage
└── entangledBellChain.ts        # 🔄 Enhanced example using general operations (next)

packages/quantum/__tests__/qgraph/
└── general-operations.test.ts   # ✅ Comprehensive test suite (complete)

packages/quantum/docs/
└── graph-entanglement-plan.md   # ✅ This document (updated)
```

**Legend**: ✅ Complete, 🔄 Next phase

## Dependencies

- **T73**: Core QuantumGraph implementation
- **StateVector**: Tensor product and partial trace operations
- **Operator**: Multi-qubit gate applications
- **Measurement**: Composite system measurements

## Timeline

**Total Estimated Time**: 13-19 days

- Phase 1-2: Core infrastructure (5-7 days) ✅ **COMPLETE**
- Phase 3: Operations implementation (3-4 days) ✅ **COMPLETE**
- Phase 4: Quantum circuit operations (2-3 days) **NEXT**
- Phase 5-6: Examples and testing (3-5 days) **REMAINING**

## Notes

This implementation transforms the QuantumGraph from a static structure with quantum labels into a dynamic quantum computational framework capable of representing and manipulating genuine quantum entanglement across graph topologies.
