import { GraphologyAdapter } from '../../../graph-core/src/core/GraphologyAdapter';
import { IRenderNode, IRenderEdge, IRenderGraph } from './rendering';

/**
 * Props for the GraphCanvas component
 */
export interface GraphCanvasProps {
  className?: string;
  graph?: GraphologyAdapter;
  defaultNodes?: IRenderNode[];
  defaultEdges?: IRenderEdge[];
  onNodeClick?: (nodeId: string) => void;
  onEdgeClick?: (edgeId: string) => void;
}

/**
 * State for graph visualization
 */
export interface GraphState {
  renderGraph?: IRenderGraph;
  selectedNodeId?: string;
  selectedEdgeId?: string;
  isLayouting?: boolean;
}

// Note: GraphNode and GraphEdge interfaces have been replaced by IRenderNode/IRenderEdge