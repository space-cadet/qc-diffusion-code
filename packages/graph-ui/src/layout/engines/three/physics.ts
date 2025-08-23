import { IGraph } from '@spin-network/graph-core';
import { IRenderGraph, IRenderNode, IRenderPosition } from '../../../types/rendering';
import { IThreeLayoutOptions, IPhysicsOptions } from './types';

const DEFAULT_PHYSICS: IPhysicsOptions = {
  gravity: -0.5,
  spring: 100,
  damping: 0.1
};

export class PhysicsSimulation {
  private positions: Map<string, IRenderPosition>;
  private velocities: Map<string, IRenderPosition>;
  private forces: Map<string, IRenderPosition>;

  constructor() {
    this.positions = new Map();
    this.velocities = new Map();
    this.forces = new Map();
  }

  computeLayout(graph: IGraph, options: IThreeLayoutOptions): IRenderGraph {
    const physics = options.physics || DEFAULT_PHYSICS;
    this.initializePositions(graph);
    
    // Run simulation for a fixed number of steps
    for (let i = 0; i < 100; i++) {
      this.updateForces(graph, physics);
      this.updatePositions(physics.damping);
    }

    return this.createRenderGraph(graph);
  }

  private initializePositions(graph: IGraph): void {
    graph.forEachNode((node) => {
      const pos = {
        x: Math.random() * 100 - 50,
        y: Math.random() * 100 - 50,
        z: Math.random() * 100 - 50
      };
      this.positions.set(node.id, pos);
      this.velocities.set(node.id, { x: 0, y: 0, z: 0 });
      this.forces.set(node.id, { x: 0, y: 0, z: 0 });
    });
  }

  private updateForces(graph: IGraph, physics: IPhysicsOptions): void {
    // Reset forces
    graph.forEachNode((node) => {
      this.forces.set(node.id, { x: 0, y: 0, z: 0 });
    });

    // Apply spring forces between connected nodes
    graph.forEachEdge((edge) => {
      const sourcePos = this.positions.get(edge.source)!;
      const targetPos = this.positions.get(edge.target)!;
      
      const dx = targetPos.x - sourcePos.x;
      const dy = targetPos.y - sourcePos.y;
      const dz = targetPos.z - sourcePos.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      const force = (distance - 50) * physics.spring; // 50 is rest length
      
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      const fz = (dz / distance) * force;
      
      const sourceForce = this.forces.get(edge.source)!;
      const targetForce = this.forces.get(edge.target)!;
      
      sourceForce.x += fx;
      sourceForce.y += fy;
      sourceForce.z += fz;
      
      targetForce.x -= fx;
      targetForce.y -= fy;
      targetForce.z -= fz;
    });

    // Apply gravity towards center
    graph.forEachNode((node) => {
      const pos = this.positions.get(node.id)!;
      const force = this.forces.get(node.id)!;
      
      force.x += pos.x * physics.gravity;
      force.y += pos.y * physics.gravity;
      force.z += pos.z * physics.gravity;
    });
  }

  private updatePositions(damping: number): void {
    this.positions.forEach((pos, nodeId) => {
      const vel = this.velocities.get(nodeId)!;
      const force = this.forces.get(nodeId)!;
      
      vel.x = (vel.x + force.x) * damping;
      vel.y = (vel.y + force.y) * damping;
      vel.z = (vel.z + force.z) * damping;
      
      pos.x += vel.x;
      pos.y += vel.y;
      pos.z += vel.z;
    });
  }

  private createRenderGraph(graph: IGraph): IRenderGraph {
    const nodes = new Map<string, IRenderNode>();
    
    graph.forEachNode((node) => {
      nodes.set(node.id, {
        id: node.id,
        position: this.positions.get(node.id)!,
        renderProps: {
          color: '#666666',
          size: 5
        }
      });
    });

    return {
      nodes,
      edges: new Map(), // Add edges if needed
      graph
    };
  }
}