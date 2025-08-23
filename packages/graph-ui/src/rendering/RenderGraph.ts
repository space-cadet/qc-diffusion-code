/**
 * RenderGraph - Wraps logical graph with visual coordinates
 * Manages the transformation from logical structure to visual representation
 */

import { IGraph } from '../../../graph-core/src/core/types';
import { 
  IRenderGraph, 
  IRenderNode, 
  IRenderEdge, 
  IRenderPosition, 
  IRenderProperties 
} from '../types/rendering';

/**
 * Implementation of IRenderGraph that manages visual representation
 */
export class RenderGraph implements IRenderGraph {
  private readonly logicalGraph: IGraph;
  private renderNodes: Map<string, IRenderNode> = new Map();
  private renderEdges: Map<string, IRenderEdge> = new Map();

  constructor(logicalGraph: IGraph) {
    this.logicalGraph = logicalGraph;
    this.initializeFromLogicalGraph();
  }

  getLogicalGraph(): IGraph {
    return this.logicalGraph;
  }

  getAllRenderNodes(): readonly [string, IRenderNode][] {
    return Array.from(this.renderNodes.entries());
  }

  getAllRenderEdges(): readonly [string, IRenderEdge][] {
    return Array.from(this.renderEdges.entries());
  }

  getRenderNode(nodeId: string): IRenderNode | undefined {
    return this.renderNodes.get(nodeId);
  }

  getRenderEdge(edgeId: string): IRenderEdge | undefined {
    return this.renderEdges.get(edgeId);
  }

  getNodePosition(nodeId: string): IRenderPosition | undefined {
    return this.renderNodes.get(nodeId)?.position;
  }

  setNodePosition(nodeId: string, position: IRenderPosition): void {
    const existingNode = this.renderNodes.get(nodeId);
    if (existingNode) {
      this.renderNodes.set(nodeId, {
        ...existingNode,
        position
      });
    } else {
      // Create render node from logical node
      const logicalNode = this.logicalGraph.getNode(nodeId);
      if (logicalNode) {
        this.renderNodes.set(nodeId, {
          id: nodeId,
          position,
          metadata: logicalNode.properties
        });
      }
    }
  }

  setNodeRenderProps(nodeId: string, props: IRenderProperties): void {
    const existingNode = this.renderNodes.get(nodeId);
    if (existingNode) {
      this.renderNodes.set(nodeId, {
        ...existingNode,
        renderProps: { ...existingNode.renderProps, ...props }
      });
    }
  }

  setEdgeRenderProps(edgeId: string, props: IRenderProperties): void {
    const existingEdge = this.renderEdges.get(edgeId);
    if (existingEdge) {
      this.renderEdges.set(edgeId, {
        ...existingEdge,
        renderProps: { ...existingEdge.renderProps, ...props }
      });
    }
  }

  /**
   * Initialize render elements from logical graph structure
   */
  private initializeFromLogicalGraph(): void {
    // Initialize nodes with default positions (will be overridden by layout engine)
    this.logicalGraph.getNodes().forEach(node => {
      this.renderNodes.set(node.id, {
        id: node.id,
        position: { x: 0, y: 0, z: 0 }, // Default position
        metadata: node.properties
      });
    });

    // Initialize edges using edge IDs instead of direct edge objects
    this.logicalGraph.getEdges().forEach(edge => {
      this.renderEdges.set(edge.id, {
        source: edge.sourceId,
        target: edge.targetId,
        metadata: edge.properties
      });
    });
  }
}
