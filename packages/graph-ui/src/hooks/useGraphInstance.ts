import { useEffect, useState } from 'react';
import { GraphologyAdapter } from '../../../graph-core/src/core/GraphologyAdapter';
import { GraphNode, GraphEdge } from '../types/graph';

export interface UseGraphInstanceProps {
  initialNodes?: GraphNode[];
  initialEdges?: GraphEdge[];
}

export const useGraphInstance = ({ initialNodes = [], initialEdges = [] }: UseGraphInstanceProps = {}) => {
  const [graph, setGraph] = useState<GraphologyAdapter | null>(null);

  useEffect(() => {
    // Initialize graph instance
    const newGraph = new GraphologyAdapter();

    // Add initial nodes
    initialNodes.forEach(node => {
      newGraph.addNode({
        id: node.id,
        type: 'default',
        properties: {
          label: node.label || '',
          x: node.x ?? Math.random() * 100,
          y: node.y ?? Math.random() * 100,
          size: node.size ?? 10,
          color: node.color || '#6366f1'
        }
      });
    });

    // Add initial edges
    initialEdges.forEach(edge => {
      newGraph.addEdge({
        id: `${edge.source}-${edge.target}`,
        sourceId: edge.source,
        targetId: edge.target,
        type: 'default',
        directed: false,
        properties: {
          size: edge.size ?? 2,
          color: edge.color ?? '#94a3b8'
        }
      });
    });

    setGraph(newGraph);

    return () => {
      setGraph(null);
    };
  }, []);

  return { graph };
};