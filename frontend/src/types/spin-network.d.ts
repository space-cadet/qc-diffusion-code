declare module '@spin-network/graph-core' {
  export interface IGraphEdge {
    id: string;
    sourceId: string;
    targetId: string;
  }

  export interface IGraph {
    nodes: IGraphNode[];
    edges: IGraphEdge[];
    addNode(node: IGraphNode): void;
    addEdge(from: number, to: number, weight?: number): void;
    getNode(id: string): IGraphNode | undefined;
    getNodes(): readonly Array<{ id: string }>;
    getEdges(): readonly IGraphEdge[];
    getNeighbors(nodeId: number): number[];
    getAdjacentNodes(nodeId: string): readonly IGraphNode[];
  }
  
  export interface IGraphNode {
    id: string;
    x?: number;
    y?: number;
    z?: number;
    data?: any;
  }
  
  export function lattice1D(size: number): IGraph;
  export function lattice2D(width: number, height: number): IGraph;
  export function path(size: number): IGraph;
  export function complete(size: number): IGraph;
}
