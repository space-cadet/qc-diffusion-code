export function adaptGraphologyLayout(graphology, options) {
    const nodes = new Map();
    const edges = new Map();
    // Convert nodes
    graphology.forEachNode((nodeId, attributes) => {
        nodes.set(nodeId, {
            id: nodeId,
            position: {
                x: attributes.x || 0,
                y: attributes.y || 0,
                z: options.dimensions === 3 ? (attributes.z || 0) : 0
            },
            renderProps: {
                color: attributes.color,
                size: attributes.size,
                label: attributes.label
            }
        });
    });
    // Convert edges
    graphology.forEachEdge((edgeId, attributes, source, target) => {
        edges.set(edgeId, {
            id: edgeId,
            source,
            target,
            renderProps: {
                color: attributes.color,
                size: attributes.size
            }
        });
    });
    return {
        nodes,
        edges,
        graph: graphology
    };
}
