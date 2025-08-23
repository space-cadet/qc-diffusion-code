import Graphology from 'graphology';
import { 
  empty as emptyGenerator, 
  path as pathGenerator 
} from 'graphology-generators/classic';
import { erdosRenyi } from 'graphology-generators/random';
import { GraphologyAdapter } from './GraphologyAdapter';
import { ILatticePosition } from './types';

export function empty(nodeCount: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const generatedGraph = emptyGenerator(Graphology, nodeCount);
  adapter.setGraph(generatedGraph);
  
  // Add metadata for empty graph
  adapter.setMetadata({
    type: 'empty_graph',
    topology: 'planar',
    dimensions: 2,
    parameters: { nodeCount },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function complete(nodeCount: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  
  // First create all nodes
  for (let i = 0; i < nodeCount; i++) {
    adapter.addNode({
      id: `n${i}`,
      type: 'default',
      properties: {}
    });
  }
  
  // Then create edges between all pairs of nodes
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      adapter.addEdge({
        id: `e${i}-${j}`,
        sourceId: `n${i}`,
        targetId: `n${j}`,
        type: 'default',
        directed: false,
        properties: {}
      });
    }
  }
  
  // Add metadata for complete graph
  adapter.setMetadata({
    type: 'complete_graph',
    topology: 'planar',
    dimensions: 2,
    parameters: { nodeCount },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function path(nodeCount: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const generatedGraph = pathGenerator(Graphology, nodeCount);
  adapter.setGraph(generatedGraph);
  
  // Add metadata for path graph  
  adapter.setMetadata({
    type: 'path_graph',
    topology: 'tree',
    dimensions: 1,
    parameters: { nodeCount },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function random(nodeCount: number, probability: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const generatedGraph = erdosRenyi(Graphology, {order: nodeCount, probability});
  adapter.setGraph(generatedGraph);
  
  // Add metadata for random graph
  adapter.setMetadata({
    type: 'random_graph',
    topology: 'planar',
    dimensions: 2,
    parameters: { nodeCount, probability },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function randomSparse(nodeCount: number, probability: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const generatedGraph = erdosRenyi.sparse(Graphology, {order: nodeCount, probability});
  adapter.setGraph(generatedGraph);
  
  // Add metadata for sparse random graph
  adapter.setMetadata({
    type: 'random_sparse_graph',
    topology: 'planar',
    dimensions: 2,
    parameters: { nodeCount, probability },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

// === Lattice Generators ===

export function lattice1D(length: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const graph = new Graphology();
  
  for (let i = 0; i < length; i++) {
    const latticePosition: ILatticePosition = { i, j: 0 };
    graph.addNode(i.toString(), { 
      latticePosition,
      type: 'lattice' 
    });
  }
  
  for (let i = 0; i < length - 1; i++) {
    graph.addEdge(i.toString(), (i + 1).toString(), { type: 'lattice_edge' });
  }
  
  adapter.setGraph(graph);
  
  adapter.setMetadata({
    type: '1d_lattice',
    topology: 'tree',
    dimensions: 1,
    parameters: { length },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function lattice2D(width: number, height: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const graph = new Graphology();
  
  // Create nodes with logical lattice identifiers (NO coordinates)
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      const latticePosition: ILatticePosition = { i, j };
      graph.addNode(nodeId, { 
        latticePosition,
        type: 'lattice' 
      });
    }
  }
  
  // Add edges to 4-neighbors (up, down, left, right)
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      
      // Right neighbor
      if (i < width - 1) {
        const rightId = `${i + 1},${j}`;
        graph.addEdge(nodeId, rightId, { type: 'lattice_edge' });
      }
      
      // Down neighbor  
      if (j < height - 1) {
        const downId = `${i},${j + 1}`;
        graph.addEdge(nodeId, downId, { type: 'lattice_edge' });
      }
    }
  }
  
  adapter.setGraph(graph);
  
  // Add metadata describing mathematical structure
  adapter.setMetadata({
    type: '2d_lattice',
    topology: 'planar',
    dimensions: 2,
    parameters: { width, height },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}

export function lattice1DPeriodic(length: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const graph = new Graphology();
  
  // Create nodes with logical lattice identifiers (NO coordinates)
  for (let i = 0; i < length; i++) {
    const latticePosition: ILatticePosition = { i, j: 0 };
    graph.addNode(i.toString(), { 
      latticePosition,
      type: 'lattice' 
    });
  }
  
  // Add edges including wraparound
  for (let i = 0; i < length; i++) {
    const nextI = (i + 1) % length;
    graph.addEdge(i.toString(), nextI.toString(), { type: 'lattice_edge' });
  }
  
  adapter.setGraph(graph);
  
  // Add metadata describing 1D periodic structure
  adapter.setMetadata({
    type: '1d_periodic_lattice',
    topology: 'torus',
    dimensions: 1,
    parameters: { length },
    isFinite: true,
    isPeriodic: true
  });
  
  return adapter;
}

export function lattice2DPeriodic(width: number, height: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const graph = new Graphology();
  
  // Create nodes with logical lattice identifiers (NO coordinates)
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      const latticePosition: ILatticePosition = { i, j };
      graph.addNode(nodeId, { 
        latticePosition,
        type: 'lattice' 
      });
    }
  }
  
  // Add edges with periodic boundary conditions (torus)
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      
      // Right neighbor (with wraparound)
      const rightI = (i + 1) % width;
      const rightId = `${rightI},${j}`;
      graph.addEdge(nodeId, rightId, { type: 'lattice_edge' });
      
      // Down neighbor (with wraparound)
      const downJ = (j + 1) % height;
      const downId = `${i},${downJ}`;
      graph.addEdge(nodeId, downId, { type: 'lattice_edge' });
    }
  }
  
  adapter.setGraph(graph);
  
  // Add metadata describing torus topology
  adapter.setMetadata({
    type: '2d_periodic_lattice',
    topology: 'torus',
    dimensions: 2,
    parameters: { width, height },
    isFinite: true,
    isPeriodic: true
  });
  
  return adapter;
}

export function triangularLattice(width: number, height: number): GraphologyAdapter {
  const adapter = new GraphologyAdapter();
  const graph = new Graphology();
  
  // Create nodes with logical lattice identifiers (NO coordinates)
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      const latticePosition: ILatticePosition = { i, j };
      graph.addNode(nodeId, { 
        latticePosition,
        type: 'triangular_lattice' 
      });
    }
  }
  
  // Add edges: 4-neighbors + 2 diagonal neighbors for triangular lattice
  for (let i = 0; i < width; i++) {
    for (let j = 0; j < height; j++) {
      const nodeId = `${i},${j}`;
      
      // Right neighbor
      if (i < width - 1) {
        graph.addEdge(nodeId, `${i + 1},${j}`, { type: 'triangular_edge' });
      }
      
      // Down neighbor
      if (j < height - 1) {
        graph.addEdge(nodeId, `${i},${j + 1}`, { type: 'triangular_edge' });
      }
      
      // Diagonal neighbors for triangular lattice
      if (i < width - 1 && j < height - 1) {
        graph.addEdge(nodeId, `${i + 1},${j + 1}`, { type: 'triangular_edge' });
      }
      
      if (i > 0 && j < height - 1) {
        graph.addEdge(nodeId, `${i - 1},${j + 1}`, { type: 'triangular_edge' });
      }
    }
  }
  
  adapter.setGraph(graph);
  
  // Add metadata describing triangular structure
  adapter.setMetadata({
    type: 'triangular_lattice',
    topology: 'planar',
    dimensions: 2,
    parameters: { width, height },
    isFinite: true,
    isPeriodic: false
  });
  
  return adapter;
}
