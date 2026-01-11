/**
 * RenderGraph - Wraps logical graph with visual coordinates
 * Manages the transformation from logical structure to visual representation
 */
/**
 * Implementation of IRenderGraph that manages visual representation
 */
export class RenderGraph {
    constructor(logicalGraph) {
        this.renderNodes = new Map();
        this.renderEdges = new Map();
        this.logicalGraph = logicalGraph;
        this.initializeFromLogicalGraph();
    }
    getLogicalGraph() {
        return this.logicalGraph;
    }
    getAllRenderNodes() {
        return Array.from(this.renderNodes.entries());
    }
    getAllRenderEdges() {
        return Array.from(this.renderEdges.entries());
    }
    getRenderNode(nodeId) {
        return this.renderNodes.get(nodeId);
    }
    getRenderEdge(edgeId) {
        return this.renderEdges.get(edgeId);
    }
    getNodePosition(nodeId) {
        return this.renderNodes.get(nodeId)?.position;
    }
    setNodePosition(nodeId, position) {
        const existingNode = this.renderNodes.get(nodeId);
        if (existingNode) {
            this.renderNodes.set(nodeId, {
                ...existingNode,
                position
            });
        }
        else {
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
    setNodeRenderProps(nodeId, props) {
        const existingNode = this.renderNodes.get(nodeId);
        if (existingNode) {
            this.renderNodes.set(nodeId, {
                ...existingNode,
                renderProps: { ...existingNode.renderProps, ...props }
            });
        }
    }
    setEdgeRenderProps(edgeId, props) {
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
    initializeFromLogicalGraph() {
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
