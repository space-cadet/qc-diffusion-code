/**
 * Core type definitions for the graph-core package
 */

import { Matrix } from 'mathjs';

// --- Base Property Types ---

/**
 * Generic type for graph property values
 */
export type PropertyValue = string | number | boolean | object | null;

/**
 * Interface for property maps on graph elements
 */
export interface IPropertyMap {
  readonly [key: string]: PropertyValue;
}

// --- Logical Position Types (NO RENDERING COORDINATES) ---

/**
 * Abstract lattice position identifiers (NOT pixel coordinates)
 */
export interface ILatticePosition {
  readonly i: number;
  readonly j: number;
  readonly k?: number;  // For 3D lattices
}

/**
 * Hierarchical position in tree-like structures
 */
export interface IHierarchyPosition {
  readonly level: number;
  readonly index: number;
}

/**
 * Logical identifiers for abstract positioning (NO visual coordinates)
 */
export interface ILogicalIdentifiers {
  readonly latticePosition?: ILatticePosition;
  readonly hierarchyPosition?: IHierarchyPosition;
  readonly networkId?: string;
}

// --- Graph Metadata Types ---

/**
 * Mathematical topology types
 */
export type GraphTopology = 'planar' | 'torus' | 'sphere' | 'hyperbolic' | 'tree';

/**
 * Graph metadata describing mathematical properties (NO visual properties)
 */
export interface IGraphMetadata {
  readonly type: string;                    // Graph type identifier
  readonly topology: GraphTopology;         // Mathematical topology
  readonly dimensions: number;               // Logical dimensionality (2D, 3D, etc.)
  readonly parameters: IPropertyMap;        // Construction parameters
  readonly isFinite: boolean;                // Whether graph has finite size
  readonly isPeriodic?: boolean;             // Whether graph has periodic boundaries
}

// --- Base Element Types ---

/**
 * Base interface for all graph elements (nodes, edges, faces)
 */
export interface IGraphElement {
  readonly id: string;
  readonly properties: IPropertyMap;
}

/**
 * Interface for a node in the graph
 */
export interface IGraphNode extends IGraphElement {
  readonly type: string;  // Base type identifier for specialized nodes
}

/**
 * Interface for an edge in the graph
 */
export interface IGraphEdge extends IGraphElement {
  readonly sourceId: string;
  readonly targetId: string;
  readonly directed: boolean;
  readonly type: string;  // Base type identifier for specialized edges
}

// --- Typed Graph Elements ---

/**
 * Type-safe node interface with constrained type parameter
 */
export interface ITypedNode<T extends string> extends IGraphNode {
  readonly type: T;
}

/**
 * Type-safe edge interface with constrained type parameter
 */
export interface ITypedEdge<T extends string> extends IGraphEdge {
  readonly type: T;
}

// --- Higher Dimensional Structures ---

/**
 * Interface for 2D faces in the graph
 */
export interface IFace extends IGraphElement {
  readonly edgeIds: readonly string[];  // Ordered for orientation
  readonly nodeIds: readonly string[];  // Vertices of the face
}

/**
 * Interface for n-dimensional simplices
 */
export interface ISimplex extends IGraphElement {
  readonly dimension: number;
  readonly boundaryIds: readonly string[];  // IDs of lower-dimensional simplices
  readonly coFaceIds: readonly string[];    // IDs of higher-dimensional simplices
}

// --- Ordered Subgraph Support ---

/**
 * Interface for subgraphs with ordered elements
 */
export interface IOrderedSubgraph extends IGraphElement {
  readonly nodeIds: readonly string[];      // Nodes in specific order
  readonly edgeIds: readonly string[];      // Edges in specific order
  readonly order: ReadonlyMap<string, number>; // Maps elements to their position
}

// --- Pattern Matching & Rewrite Rules ---

/**
 * Represents a match of a pattern in the graph
 */
export interface IMatch {
  readonly nodeMapping: ReadonlyMap<string, string>;  // Pattern node ID -> Graph node ID
  readonly edgeMapping: ReadonlyMap<string, string>;  // Pattern edge ID -> Graph edge ID
  readonly faceMapping?: ReadonlyMap<string, string>; // Pattern face ID -> Graph face ID
  readonly context: IPropertyMap;  // Additional match context/constraints
}

/**
 * Defines a graph rewrite rule
 */
export interface IRewritePattern {
  readonly name: string;
  readonly fromGraph: IGraph;  // Pattern to match
  readonly toGraph: IGraph;    // Pattern to rewrite to
  readonly constraints?: (match: IMatch) => boolean;
  readonly invariants?: (before: IGraph, after: IGraph, match: IMatch) => boolean;
}

// --- Traversal Options ---

/**
 * Options for graph traversal operations
 */
export interface ITraversalOptions {
  /** Maximum depth to traverse (undefined for no limit) */
  maxDepth?: number;
  
  /** Whether to follow directed edges only in their direction */
  respectEdgeDirection?: boolean;
  
  /** Custom filter function for nodes */
  nodeFilter?: (node: IGraphNode) => boolean;
  
  /** Custom filter function for edges */
  edgeFilter?: (edge: IGraphEdge) => boolean;
}

/**
 * Function type for calculating edge weights
 */
export type EdgeWeightFunction = (edge: IGraphEdge) => number;

/**
 * Strategy for applying multiple rewrite rules
 */
export interface IRewriteStrategy {
  maxSteps?: number;
  priority?: (pattern: IRewritePattern) => number;
  termination?: (graph: IGraph) => boolean;
}

// --- Core Graph Interface ---

/**
 * Core interface for basic graph operations
 */
export interface IGraph {
  /**
   * Whether the graph is directed
   */
  readonly isDirected: boolean;

  /**
   * The number of nodes in the graph
   */
  readonly nodeCount: number;

  /**
   * The number of edges in the graph
   */
  readonly edgeCount: number;

  // Basic graph operations
  addNode(node: IGraphNode): IGraph;
  removeNode(nodeId: string): IGraph;
  addEdge(edge: IGraphEdge): IGraph;
  removeEdge(edgeId: string): IGraph;
  
  // Query operations
  getNode(nodeId: string): IGraphNode | undefined;
  getEdge(edgeId: string): IGraphEdge | undefined;
  getNodes(): readonly IGraphNode[];
  getEdges(): readonly IGraphEdge[];
  
  // Traversal operations
  getAdjacentNodes(nodeId: string, options?: ITraversalOptions): readonly IGraphNode[];
  getConnectedEdges(nodeId: string, options?: ITraversalOptions): readonly IGraphEdge[];
  findPath(fromId: string, toId: string, options?: ITraversalOptions): readonly IGraphElement[];
  
  // Matrix operations
  toAdjacencyMatrix(weightFn?: EdgeWeightFunction): Matrix;
  toLaplacianMatrix(weightFn?: EdgeWeightFunction): Matrix;
  
  // Metadata operations (NO rendering knowledge)
  setMetadata(metadata: IGraphMetadata): IGraph;
  getMetadata(): IGraphMetadata | undefined;
  
  // Utility operations
  hasNode(nodeId: string): boolean;
  hasEdge(edgeId: string): boolean;
  areNodesAdjacent(sourceId: string, targetId: string, options?: ITraversalOptions): boolean;
  getNodeDegree(nodeId: string, options?: ITraversalOptions): number;
  clone(): IGraph;
  clear(): IGraph;
}

// --- Specialized Graph Interfaces ---

/**
 * Interface for type-safe graph operations
 */
export interface ITypedGraph<NodeType extends string, EdgeType extends string> extends IGraph {
  // Type-safe operations
  addTypedNode(node: ITypedNode<NodeType>): ITypedGraph<NodeType, EdgeType>;
  addTypedEdge(edge: ITypedEdge<EdgeType>): ITypedGraph<NodeType, EdgeType>;
  
  // Type-safe queries
  getTypedNode(nodeId: string): ITypedNode<NodeType> | undefined;
  getTypedEdge(edgeId: string): ITypedEdge<EdgeType> | undefined;
  
  // Type filtering
  getNodesOfType(type: NodeType): readonly ITypedNode<NodeType>[];
  getEdgesOfType(type: EdgeType): readonly ITypedEdge<EdgeType>[];
}

/**
 * Interface for graphs supporting ordered substructures
 */
export interface IOrderedGraph extends IGraph {
  // Ordered subgraph operations
  createOrderedSubgraph(elements: IGraphElement[]): IOrderedSubgraph;
  getElementOrder(subgraphId: string, elementId: string): number | undefined;
  reorderElements(subgraphId: string, newOrder: string[]): IOrderedGraph;
  
  // Query ordered structures
  getOrderedSubgraphs(): readonly IOrderedSubgraph[];
  getElementsByOrder(subgraphId: string): readonly IGraphElement[];
}

/**
 * Interface for graphs with higher-dimensional structures
 */
export interface ISimplicialGraph extends IGraph {
  readonly faceCount: number;
  readonly simplexCount: number;

  // Face operations
  addFace(face: IFace): ISimplicialGraph;
  removeFace(faceId: string): ISimplicialGraph;
  getFace(faceId: string): IFace | undefined;
  getFaces(): readonly IFace[];

  // Simplex operations
  addSimplex(simplex: ISimplex): ISimplicialGraph;
  removeSimplex(simplexId: string): ISimplicialGraph;
  getSimplex(simplexId: string): ISimplex | undefined;
  getSimplices(dimension?: number): readonly ISimplex[];
  
  // Topological queries
  getFacesByVertex(vertexId: string): readonly IFace[];
  getFacesByEdge(edgeId: string): readonly IFace[];
  getSimplicesByBoundary(boundaryId: string): readonly ISimplex[];
  getSimplexBoundary(simplexId: string): readonly ISimplex[];
}

/**
 * Interface for graphs supporting rewrite rules
 */
export interface IRewriteableGraph extends IGraph {
  // Pattern matching
  findMatches(pattern: IRewritePattern): readonly IMatch[];
  
  // Rule application
  applyRewrite(pattern: IRewritePattern, match: IMatch): IRewriteableGraph;
  
  // Batch operations
  applyRewrites(patterns: IRewritePattern[], strategy?: IRewriteStrategy): IRewriteableGraph;
  
  // Rule validation
  validateRewrite(pattern: IRewritePattern, match: IMatch): boolean;
}

/**
 * Combined interface supporting all graph features
 */
export interface IExtendedGraph<NodeType extends string, EdgeType extends string> 
  extends ITypedGraph<NodeType, EdgeType>,
          IOrderedGraph,
          ISimplicialGraph,
          IRewriteableGraph {
  // This interface combines all functionality from the specialized interfaces
  // Additional operations specific to the combination can be added here
}