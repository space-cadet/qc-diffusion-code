import type { Particle, CollisionEvent, Step, ScalingParams } from './types';
import type { IGraph, IGraphNode } from '@spin-network/graph-core';
import { lattice1D, lattice2D, path, complete } from '@spin-network/graph-core';
import { simTime, simDt } from './core/GlobalTime';

export interface DensityField {
  error: number;
  effectiveDiffusion: number;
  effectiveVelocity: number;
  x: number[];
  rho: number[];
  u: number[];
  moments: { mean: number, variance: number, skewness: number, kurtosis: number };
  collisionRate: number[];
}

export class PhysicsRandomWalk {
  private graph: IGraph;
  private simulationType: 'continuum' | 'graph';
  private collisionRate: number;  // λ (Poisson process rate)
  private jumpLength: number;     // a (lattice spacing)
  private velocity: number;       // v = a/⟨τ⟩
  private diffusionConstant: number; // D = v²/(2λ)
  private meanWaitTime: number;   // ⟨τ⟩ = 1/λ

  constructor(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    simulationType?: 'continuum' | 'graph';
    graphType?: 'lattice1D' | 'lattice2D' | 'path' | 'complete';
    graphSize?: number | { width: number; height: number };
  }) {
    this.graph = lattice1D(1); // Default empty graph
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity * this.velocity / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
    this.simulationType = params.simulationType || 'continuum';
    
    if (this.simulationType === 'graph') {
      this.graph = this.createGraph(params.graphType || 'lattice1D', params.graphSize || 10);
    }
  }

  generateStep(particle: Particle): Step {
    const currentTime = simTime(); // unified simulated time
    const collision = this.handleCollision(particle);
    
    // Calculate position change based on velocity and time step
    const timeStep = Math.min(collision.waitTime, simDt(0.01)); // Max 10ms steps (feature-flag-resolved)
    const deltaX = particle.velocity.vx * timeStep;
    const deltaY = particle.velocity.vy * timeStep;
    
    return {
      deltaX,
      deltaY,
      collision,
      timestamp: currentTime,
      particleId: particle.id
    };
  }

  updateParticle(particle: Particle): void {
    const step = this.generateStep(particle);
    
    // Update position
    particle.position.x += step.deltaX;
    particle.position.y += step.deltaY || 0;
    
    // Handle collision if occurred
    if (step.collision.occurred) {
      particle.velocity.vx = step.collision.newVelocity?.vx || particle.velocity.vx;
      particle.velocity.vy = step.collision.newVelocity?.vy || particle.velocity.vy;
      particle.lastCollisionTime = step.collision.timestamp;
      particle.nextCollisionTime = step.collision.timestamp + step.collision.waitTime;
      particle.collisionCount++;
    }
    
    // Record trajectory
    particle.trajectory.push({
      position: { x: particle.position.x, y: particle.position.y },
      timestamp: step.timestamp
    });
  }

  calculateDensity(particles: Particle[]): DensityField {
    if (particles.length === 0) {
      return {
        error: 0,
        effectiveDiffusion: 0,
        effectiveVelocity: 0,
        x: [],
        rho: [],
        u: [],
        moments: { mean: 0, variance: 0, skewness: 0, kurtosis: 0 },
        collisionRate: []
      };
    }

    // Simple density calculation on graph nodes
    const nodeDensity = new Map<string, number>();
    const nodeVelocity = new Map<string, { vx: number, vy: number }>();
    
    particles.forEach(particle => {
      // For graph simulation, we'd need to map particle position to nearest node
      // For now, use position as key (this is a simplified implementation)
      const key = `${Math.round(particle.position.x)},${Math.round(particle.position.y)}`;
      nodeDensity.set(key, (nodeDensity.get(key) || 0) + 1);
      
      if (!nodeVelocity.has(key)) {
        nodeVelocity.set(key, { vx: 0, vy: 0 });
      }
      const vel = nodeVelocity.get(key)!;
      vel.vx += particle.velocity.vx;
      vel.vy += particle.velocity.vy;
    });

    // Convert to arrays
    const x: number[] = [];
    const rho: number[] = [];
    const u: number[] = [];
    
    nodeDensity.forEach((density, key) => {
      const [xPos, yPos] = key.split(',').map(Number);
      x.push(xPos);
      rho.push(density);
      
      const vel = nodeVelocity.get(key)!;
      const avgVel = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy) / density;
      u.push(avgVel);
    });

    // Calculate moments
    const mean = rho.reduce((sum, val) => sum + val, 0) / rho.length;
    const variance = rho.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rho.length;
    const skewness = rho.reduce((sum, val) => sum + Math.pow((val - mean) / Math.sqrt(variance), 3), 0) / rho.length;
    const kurtosis = rho.reduce((sum, val) => sum + Math.pow((val - mean) / Math.sqrt(variance), 4), 0) / rho.length;

    return {
      error: 0,
      effectiveDiffusion: this.diffusionConstant,
      effectiveVelocity: this.velocity,
      x,
      rho,
      u,
      moments: { mean, variance, skewness, kurtosis },
      collisionRate: Array(rho.length).fill(this.collisionRate)
    };
  }

  getScalingLimits(): ScalingParams {
    return {
      tau: this.meanWaitTime,
      a: this.jumpLength,
      D: this.diffusionConstant,
      v: this.velocity,
      gamma: this.collisionRate,
      scalingRegime: this.velocity > this.jumpLength * this.collisionRate ? 'ballistic' : 'diffusive'
    };
  }

  private generateCollisionTime(): number {
    // Exponential distribution with rate λ (collisionRate)
    return -Math.log(Math.random()) / this.collisionRate;
  }

  private handleCollision(particle: Particle): CollisionEvent {
    const currentTime = simTime();
    const waitTime = this.generateCollisionTime();
    
    // Check if collision should occur based on timing
    const shouldCollide = currentTime >= particle.nextCollisionTime;
    
    if (!shouldCollide) {
      return {
        occurred: false,
        newDirection: 0,
        waitTime: waitTime,
        energyChange: 0,
        timestamp: currentTime
      };
    }
    
    // Generate random direction (isotropic scattering)
    const newDirection = Math.random() * 2 * Math.PI;
    const speed = Math.sqrt(particle.velocity.vx ** 2 + particle.velocity.vy ** 2);
    
    return {
      occurred: true,
      newDirection,
      waitTime,
      energyChange: 0, // Elastic collisions
      timestamp: currentTime,
      position: { ...particle.position },
      oldVelocity: { ...particle.velocity },
      newVelocity: {
        vx: speed * Math.cos(newDirection),
        vy: speed * Math.sin(newDirection)
      }
    };
  }

  private createGraph(type: string, size: number | { width: number; height: number }): IGraph {
    switch (type) {
      case 'lattice1D':
        return lattice1D(typeof size === 'number' ? size : 10);
      case 'lattice2D':
        const sizeNum = typeof size === 'number' ? size : 10;
        return lattice2D(sizeNum, sizeNum);
      case 'path':
        return path(typeof size === 'number' ? size : 10);
      case 'complete':
        return complete(typeof size === 'number' ? size : 10);
      default:
        return lattice1D(10);
    }
  }

  getAvailableNodes(): readonly IGraphNode[] {
    return this.graph.getNodes();
  }

  getNeighbors(nodeId: string): readonly IGraphNode[] {
    return this.graph.getAdjacentNodes(nodeId);
  }

  getGraph(): IGraph {
    return this.graph;
  }

  updateParameters(params: {
    collisionRate: number;
    jumpLength: number;
    velocity?: number;
    simulationType?: 'continuum' | 'graph';
    graphType?: 'lattice1D' | 'lattice2D' | 'path' | 'complete';
    graphSize?: number;
    particleCount?: number;
  }) {
    this.collisionRate = params.collisionRate;
    this.jumpLength = params.jumpLength;
    this.velocity = params.velocity || params.jumpLength * params.collisionRate;
    this.diffusionConstant = this.velocity * this.velocity / (2 * this.collisionRate);
    this.meanWaitTime = 1 / this.collisionRate;
    this.simulationType = params.simulationType || 'continuum';
    
    if (this.simulationType === 'graph') {
      this.graph = this.createGraph(params.graphType || 'lattice1D', params.graphSize || 10);
    }
  }

  reset() {
    // Reset particles and graph state
  }

  step(dt: number) {
    // Update particles and graph state by time step dt
  }

  getDensityField(): DensityField {
    // For now, return empty field - would need access to current particles
    return {
      error: 0,
      effectiveDiffusion: this.diffusionConstant,
      effectiveVelocity: this.velocity,
      x: [],
      rho: [],
      u: [],
      moments: { mean: 0, variance: 0, skewness: 0, kurtosis: 0 },
      collisionRate: []
    };
  }
}
