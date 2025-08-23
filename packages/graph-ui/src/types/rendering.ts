/**
 * Rendering types for graph-ui package
 * These types handle ALL visual representation concerns
 */

import { IGraph } from '../../../graph-core/src/core/types';

// --- Rendering Coordinates (Visual Space) ---

/**
 * Visual position in rendering space
 */
export interface IRenderPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;  // Always required for consistent 3D support (use 0 for 2D)
}

/**
 * Visual properties for rendering elements
 */
export interface IRenderProperties {
  readonly color?: string;
  readonly size?: number;
  readonly label?: string;
  readonly visible?: boolean;
  readonly opacity?: number;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly shape?: string;
  readonly selected?: boolean;
  readonly hovered?: boolean;
  readonly [key: string]: any;  // Additional custom properties
}

// --- Render Graph Elements ---

/**
 * Complete rendering node (combines logical structure + visual coordinates)
 */
export interface IRenderNode {
  readonly id: string;                     // Maps to IGraphNode.id
  readonly position: IRenderPosition;       // Visual coordinates
  readonly renderProps?: IRenderProperties; // Visual properties
  readonly metadata?: Record<string, any>;  // Original node metadata
}

/**
 * Complete rendering edge (combines logical structure + visual properties)
 */
export interface IRenderEdge {
  readonly source: string;                 // Maps to IGraphEdge.source
  readonly target: string;                 // Maps to IGraphEdge.target
  readonly renderProps?: IRenderProperties; // Visual properties
  readonly metadata?: Record<string, any>;  // Original edge metadata
}



// --- Layout Configuration ---

export type LayoutAlgorithm = 
  | 'preserve_logical'
  | 'force_directed'
  | 'circular'
  | 'hierarchical'
  | 'random';

export interface ILayoutOptions {
  readonly algorithm: LayoutAlgorithm;
  readonly dimensions: 2 | 3;
  readonly spacing?: number;
  readonly bounds?: { 
    readonly width: number; 
    readonly height: number; 
    readonly depth?: number; 
  };
}

// --- Render Graph Interface ---

export interface IRenderGraph {
  getLogicalGraph(): IGraph;
  getAllRenderNodes(): readonly [string, IRenderNode][];
  getAllRenderEdges(): readonly [string, IRenderEdge][];
  getRenderNode(nodeId: string): IRenderNode | undefined;
  getRenderEdge(edgeId: string): IRenderEdge | undefined;
  getNodePosition(nodeId: string): IRenderPosition | undefined;
  setNodePosition(nodeId: string, position: IRenderPosition): void;
  setNodeRenderProps(nodeId: string, props: IRenderProperties): void;
  setEdgeRenderProps(edgeId: string, props: IRenderProperties): void;
}

// --- Layout Engine Interface ---

/**
 * Interface for transforming logical graphs to render graphs
 */
export interface ILayoutEngine {
  /**
   * Transform a logical graph to a render graph with visual coordinates
   */
  transformToRender(logicalGraph: IGraph, options: ILayoutOptions): IRenderGraph;
  
  /**
   * Update existing render graph with new layout options
   */
  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph;
  
  /**
   * Check if algorithm supports given graph type
   */
  supportsGraphType(graphType: string): boolean;
}

// --- Component Props (UI Integration) ---

/**
 * Props for graph canvas components
 */
export interface IGraphCanvasProps {
  readonly logicalGraph: IGraph;
  readonly renderMode: '2d' | '3d';
  readonly layoutOptions?: ILayoutOptions;
  readonly className?: string;
  readonly onNodeClick?: (nodeId: string) => void;
  readonly onEdgeClick?: (edgeId: string) => void;
  readonly onNodeHover?: (nodeId: string | null) => void;
  readonly onBackgroundClick?: () => void;
}

/**
 * Props for specific renderer components
 */
export interface IRendererProps {
  readonly renderGraph: IRenderGraph;
  readonly onNodeClick?: (nodeId: string) => void;
  readonly onEdgeClick?: (edgeId: string) => void;
  readonly onNodeHover?: (nodeId: string | null) => void;
  readonly className?: string;
}
