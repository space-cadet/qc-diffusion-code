/**
 * StandardLayoutEngine - Transforms logical graphs to render graphs
 * Handles coordinate computation for all graph types with proper topology preservation
 */

import { IGraph, IGraphNode, IGraphMetadata, ILatticePosition } from '../../../graph-core/src/core/types';
import { 
  ILayoutEngine, 
  ILayoutOptions, 
  IRenderGraph, 
  IRenderPosition,
  LayoutAlgorithm 
} from '../types/rendering';
import { RenderGraph } from '../rendering/RenderGraph';

/**
 * Standard layout engine implementation
 */
export class StandardLayoutEngine implements ILayoutEngine {
  
  transformToRender(logicalGraph: IGraph, options: ILayoutOptions): IRenderGraph {
    const renderGraph = new RenderGraph(logicalGraph);
    const metadata = logicalGraph.getMetadata();
    
    // Transform each node using appropriate algorithm
    logicalGraph.getNodes().forEach(node => {
      const renderPos = this.computeVisualPosition(node, metadata, options);
      renderGraph.setNodePosition(node.id, renderPos);
    });
    
    return renderGraph;
  }
  
  updateLayout(renderGraph: IRenderGraph, options: ILayoutOptions): IRenderGraph {
    // For now, recreate the layout. Future optimization: incremental updates
    return this.transformToRender(renderGraph.getLogicalGraph(), options);
  }
  
  supportsGraphType(graphType: string): boolean {
    const supportedTypes = [
      '2d_lattice',
      '2d_periodic_lattice', 
      'triangular_lattice',
      '1d_periodic_lattice',
      'complete_graph',
      'random_graph'
    ];
    return supportedTypes.includes(graphType);
  }
  
  private computeVisualPosition(
    node: IGraphNode, 
    metadata: IGraphMetadata | undefined, 
    options: ILayoutOptions
  ): IRenderPosition {
    
    if (!metadata) {
      return this.applyDefaultLayout(node, options);
    }
    
    // Handle lattice-based graphs with preserve_logical algorithm
    if (options.algorithm === 'preserve_logical' && metadata.type.includes('lattice')) {
      return this.applyLatticeLayout(node, metadata, options);
    }
    
    // Handle other algorithms
    switch (options.algorithm) {
      case 'force_directed':
        return this.applyForceDirectedLayout(node, options);
      case 'circular':
        return this.applyCircularLayout(node, options);
      case 'random':
        return this.applyRandomLayout(node, options);
      default:
        return this.applyDefaultLayout(node, options);
    }
  }
  
  private applyLatticeLayout(
    node: IGraphNode,
    metadata: IGraphMetadata,
    options: ILayoutOptions
  ): IRenderPosition {
    const spacing = options.spacing || 100;
    const latticePos = node.properties?.latticePosition as ILatticePosition;
    
    if (!latticePos) {
      return this.applyDefaultLayout(node, options);
    }
    
    const x = latticePos.i * spacing;
    const y = latticePos.j * spacing;
    
    // For 2D graphs in 3D space, preserve planarity (z=0)
    const z = options.dimensions === 3 ? 
      (metadata.dimensions === 2 ? 0 : (latticePos.k || 0) * spacing) : 
      0;
    
    return { x, y, z };
  }
  
  private applyForceDirectedLayout(
    node: IGraphNode,
    options: ILayoutOptions
  ): IRenderPosition {
    // Basic force-directed layout (can be enhanced with physics simulation)
    const bounds = options.bounds || { width: 800, height: 600 };
    return {
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height,
      z: options.dimensions === 3 ? Math.random() * (bounds.depth || 400) : 0
    };
  }
  
  private applyCircularLayout(
    node: IGraphNode,
    options: ILayoutOptions
  ): IRenderPosition {
    // Simple circular layout (needs node index for proper positioning)
    const radius = 200;
    const angle = Math.random() * 2 * Math.PI;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0
    };
  }
  
  private applyRandomLayout(
    node: IGraphNode,
    options: ILayoutOptions
  ): IRenderPosition {
    const bounds = options.bounds || { width: 800, height: 600 };
    return {
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height,
      z: options.dimensions === 3 ? Math.random() * (bounds.depth || 400) : 0
    };
  }
  
  private applyDefaultLayout(
    node: IGraphNode,
    options: ILayoutOptions
  ): IRenderPosition {
    // Default to random layout
    return this.applyRandomLayout(node, options);
  }
}
