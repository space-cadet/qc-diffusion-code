import { matrix, Matrix } from 'mathjs';
import Graphology from 'graphology';
import { IGraph, IGraphNode, IGraphEdge, IGraphElement, IPropertyMap, EdgeWeightFunction, ITraversalOptions, IGraphMetadata } from './types';

type GraphNodeAttributes = {
  type: string;
  [key: string]: any;
};

type GraphEdgeAttributes = {
  type: string;
  directed: boolean;
  [key: string]: any;
};

export class GraphologyAdapter implements IGraph {
  private graph: Graphology<GraphNodeAttributes, GraphEdgeAttributes>;
  private metadata?: IGraphMetadata;

  constructor() {
    this.graph = new Graphology<GraphNodeAttributes, GraphEdgeAttributes>({
      allowSelfLoops: true,
      multi: false,
      type: 'undirected'
    });
  }

  // Expose the internal Graphology instance for Sigma
  getGraphologyInstance(): Graphology {
    return this.graph as unknown as Graphology;
  }

  // Allow setting the internal graph (used by builders)
  setGraph(graph: Graphology): IGraph {
    // Validate that all edges have valid source and target nodes
    graph.forEachEdge((_edge, _attributes, source, target) => {
      if (!graph.hasNode(source)) {
        throw new Error(`Graph.edge: could not find the "${source}" source node in the graph.`);
      }
      if (!graph.hasNode(target)) {
        throw new Error(`Graph.edge: could not find the "${target}" target node in the graph.`);
      }
    });
    
    this.graph = graph as unknown as Graphology<GraphNodeAttributes, GraphEdgeAttributes>;
    return this;
  }



  get isDirected(): boolean {
    return this.graph.type === 'directed';
  }

  get nodeCount(): number {
    return this.graph.order;
  }

  get edgeCount(): number {
    return this.graph.size;
  }

  addNode(node: IGraphNode): IGraph {
    this.graph.addNode(node.id, { 
      ...node.properties,
      type: node.type 
    } as GraphNodeAttributes);
    return this;
  }

  removeNode(nodeId: string): IGraph {
    if (this.graph.hasNode(nodeId)) {
      this.graph.dropNode(nodeId);
    }
    return this;
  }

  addEdge(edge: IGraphEdge): IGraph {
    // Validate that source and target nodes exist
    if (!this.hasNode(edge.sourceId)) {
      throw new Error(`Graph.edge: could not find the "${edge.sourceId}" source node in the graph.`);
    }
    if (!this.hasNode(edge.targetId)) {
      throw new Error(`Graph.edge: could not find the "${edge.targetId}" target node in the graph.`);
    }

    // Check if edge already exists to avoid duplicate error
    if (!this.graph.hasEdge(edge.id)) {
      this.graph.addEdgeWithKey(edge.id, edge.sourceId, edge.targetId, {
        ...edge.properties,
        type: edge.type,
        directed: edge.directed
      } as GraphEdgeAttributes);
    }
    return this;
  }

  removeEdge(edgeId: string): IGraph {
    if (this.graph.hasEdge(edgeId)) {
      this.graph.dropEdge(edgeId);
    }
    return this;
  }

  getNode(nodeId: string): IGraphNode | undefined {
    if (!this.graph.hasNode(nodeId)) return undefined;
    
    const attributes = this.graph.getNodeAttributes(nodeId);
    return {
      id: nodeId,
      type: attributes?.type || 'default',
      properties: attributes ? this.extractProperties(attributes) : {}
    };
  }

  getEdge(edgeId: string): IGraphEdge | undefined {
    if (!this.graph.hasEdge(edgeId)) return undefined;

    const attributes = this.graph.getEdgeAttributes(edgeId);
    const [sourceId, targetId] = this.graph.extremities(edgeId);
    
    return {
      id: edgeId,
      sourceId,
      targetId,
      type: attributes?.type || 'default',
      directed: attributes?.directed ?? false,
      properties: attributes ? this.extractProperties(attributes) : {}
    };
  }

  getNodes(): readonly IGraphNode[] {
    return this.graph.nodes().map(nodeId => this.getNode(nodeId)!);
  }

  getEdges(): readonly IGraphEdge[] {
    return this.graph.edges().map(edgeId => this.getEdge(edgeId)!);
  }

  getAdjacentNodes(nodeId: string, _options?: ITraversalOptions): readonly IGraphNode[] {
    const neighbors = this.graph.neighbors(nodeId);
    return neighbors.map(id => this.getNode(id)!);
  }

  getConnectedEdges(nodeId: string, _options?: ITraversalOptions): readonly IGraphEdge[] {
    const edges = this.graph.edges(nodeId);
    return edges.map(id => this.getEdge(id)!);
  }

  findPath(fromId: string, toId: string, _options?: ITraversalOptions): readonly IGraphElement[] {
    // Basic BFS implementation
    const queue: Array<{node: string, path: IGraphElement[]}> = [{node: fromId, path: []}];
    const visited = new Set<string>([fromId]);

    while (queue.length > 0) {
      const {node, path} = queue.shift()!;
      
      if (node === toId) {
        return path;
      }

      const neighbors = this.graph.neighbors(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          const edgeId = this.graph.edge(node, neighbor) || this.graph.edge(neighbor, node);
          if (edgeId) {
            const edge = this.getEdge(edgeId);
            if (edge) {
              queue.push({
                node: neighbor,
                path: [...path, edge]
              });
            }
          }
        }
      }
    }

    return [];
  }

  toAdjacencyMatrix(weightFn?: EdgeWeightFunction): Matrix {
    const nodes = this.graph.nodes();
    const size = nodes.length;
    const data: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    
    const nodeIndex = new Map(nodes.map((id, index) => [id, index]));
    
    this.graph.forEachEdge((edgeId, _attributes, source, target) => {
      const i = nodeIndex.get(source);
      const j = nodeIndex.get(target);
      
      if (i === undefined || j === undefined) return;
      
      const edge = this.getEdge(edgeId);
      if (!edge) return;
      
      const weight = weightFn ? weightFn(edge) : 1;
      
      data[i][j] = weight;
      if (!this.isDirected) {
        data[j][i] = weight;
      }
    });
    
    return matrix(data);
  }

  toLaplacianMatrix(weightFn?: EdgeWeightFunction): Matrix {
    const adjMatrix = this.toAdjacencyMatrix(weightFn);
    const size = adjMatrix.size()[0];
    const laplacian = adjMatrix.clone();
    
    // Create Laplacian: L = D - A (degree matrix minus adjacency matrix)
    for (let i = 0; i < size; i++) {
      let degree = 0;
      for (let j = 0; j < size; j++) {
        if (i === j) continue;
        degree += adjMatrix.get([i, j]);
        // Negate off-diagonal elements
        laplacian.set([i, j], -adjMatrix.get([i, j]));
      }
      // Set diagonal to degree
      laplacian.set([i, i], degree);
    }
    
    return laplacian;
  }

  hasNode(nodeId: string): boolean {
    return this.graph.hasNode(nodeId);
  }

  hasEdge(edgeId: string): boolean {
    return this.graph.hasEdge(edgeId);
  }

  areNodesAdjacent(sourceId: string, targetId: string, _options?: ITraversalOptions): boolean {
    return this.graph.hasEdge(sourceId, targetId);
  }

  getNodeDegree(nodeId: string, _options?: ITraversalOptions): number {
    return this.graph.degree(nodeId);
  }

  clone(): IGraph {
    const newAdapter = new GraphologyAdapter();
    newAdapter.graph = this.graph.copy();
    return newAdapter;
  }

  clear(): IGraph {
    this.graph.clear();
    return this;
  }

  // --- Metadata Operations (NO rendering knowledge) ---

  setMetadata(metadata: IGraphMetadata): IGraph {
    this.metadata = metadata;
    return this;
  }

  getMetadata(): IGraphMetadata | undefined {
    return this.metadata;
  }

  private extractProperties(attributes: GraphNodeAttributes | GraphEdgeAttributes): IPropertyMap {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, directed, ...properties } = attributes;
    return properties as IPropertyMap;
  }
}