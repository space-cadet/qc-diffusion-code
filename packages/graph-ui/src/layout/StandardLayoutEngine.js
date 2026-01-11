/**
 * StandardLayoutEngine - Transforms logical graphs to render graphs
 * Handles coordinate computation for all graph types with proper topology preservation
 */
import { RenderGraph } from '../rendering/RenderGraph';
/**
 * Standard layout engine implementation
 */
export class StandardLayoutEngine {
    transformToRender(logicalGraph, options) {
        const renderGraph = new RenderGraph(logicalGraph);
        const metadata = logicalGraph.getMetadata();
        // Transform each node using appropriate algorithm
        logicalGraph.getNodes().forEach(node => {
            const renderPos = this.computeVisualPosition(node, metadata, options);
            renderGraph.setNodePosition(node.id, renderPos);
        });
        return renderGraph;
    }
    updateLayout(renderGraph, options) {
        // For now, recreate the layout. Future optimization: incremental updates
        return this.transformToRender(renderGraph.getLogicalGraph(), options);
    }
    supportsGraphType(graphType) {
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
    computeVisualPosition(node, metadata, options) {
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
    applyLatticeLayout(node, metadata, options) {
        const spacing = options.spacing || 100;
        const latticePos = node.properties?.latticePosition;
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
    applyForceDirectedLayout(node, options) {
        // Basic force-directed layout (can be enhanced with physics simulation)
        const bounds = options.bounds || { width: 800, height: 600 };
        return {
            x: Math.random() * bounds.width,
            y: Math.random() * bounds.height,
            z: options.dimensions === 3 ? Math.random() * (bounds.depth || 400) : 0
        };
    }
    applyCircularLayout(node, options) {
        // Simple circular layout (needs node index for proper positioning)
        const radius = 200;
        const angle = Math.random() * 2 * Math.PI;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z: 0
        };
    }
    applyRandomLayout(node, options) {
        const bounds = options.bounds || { width: 800, height: 600 };
        return {
            x: Math.random() * bounds.width,
            y: Math.random() * bounds.height,
            z: options.dimensions === 3 ? Math.random() * (bounds.depth || 400) : 0
        };
    }
    applyDefaultLayout(node, options) {
        // Default to random layout
        return this.applyRandomLayout(node, options);
    }
}
