import React, { useEffect, useRef } from 'react';
import Sigma from 'sigma';
import { NodeCircleProgram, EdgeLineProgram } from 'sigma/rendering';
import { GraphCanvasProps } from '../../types/graph';
import { useGraphInstance } from '../../hooks/useGraphInstance';

const DEFAULT_NODES = [
  { id: '1', label: 'Node 1', x: 0, y: -100 },
  { id: '2', label: 'Node 2', x: 87, y: 50 },
  { id: '3', label: 'Node 3', x: -87, y: 50 }
];

const DEFAULT_EDGES = [
  { source: '1', target: '2' },
  { source: '2', target: '3' },
  { source: '3', target: '1' }
];

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  className,
  graph: externalGraph,
  defaultNodes = DEFAULT_NODES,
  defaultEdges = DEFAULT_EDGES,
  onNodeClick,
  onEdgeClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const { graph: internalGraph } = useGraphInstance({
    initialNodes: defaultNodes,
    initialEdges: defaultEdges
  });

  const graph = externalGraph || internalGraph;

  // Initialize Sigma when container and graph are ready
  useEffect(() => {
    if (!containerRef.current || !graph) return;

    const graphInstance = graph.getGraphologyInstance();
    
    // Kill existing Sigma instance
    if (sigmaRef.current) {
      sigmaRef.current.kill();
      sigmaRef.current = null;
    }
    
    // Initialize Sigma with the current graph
    sigmaRef.current = new Sigma(graphInstance, containerRef.current, {
      nodeProgramClasses: {
        default: NodeCircleProgram,
        circle: NodeCircleProgram
      },
      edgeProgramClasses: {
        default: EdgeLineProgram,
        line: EdgeLineProgram
      },
      renderEdgeLabels: true,
      nodeReducer: (node, data) => ({
        ...data,
        size: data.size || 10,
        color: data.color || '#6366f1',
      }),
      edgeReducer: (edge, data) => ({
        ...data,
        size: data.size || 2,
        color: data.color || '#94a3b8',
      }),
    });

    // Add click handlers
    if (onNodeClick) {
      sigmaRef.current.on('clickNode', ({ node }) => onNodeClick(node));
    }
    if (onEdgeClick) {
      sigmaRef.current.on('clickEdge', ({ edge }) => onEdgeClick(edge));
    }

    return () => {
      sigmaRef.current?.kill();
      sigmaRef.current = null;
    };
  }, [graph, onNodeClick, onEdgeClick]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full bg-gray-50 rounded-lg shadow-inner ${className || ''}`}
      style={{ minHeight: '400px' }}
    />
  );
};