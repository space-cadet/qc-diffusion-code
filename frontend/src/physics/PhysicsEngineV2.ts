import { BoundaryConfig } from "./types/BoundaryConfig";

export interface ParticleV2 {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: [number, number, number, number]; // RGBA
}

export interface EngineParamsV2 {
  particleCount: number;
  dimension: "1D" | "2D";
  canvasWidth: number;
  canvasHeight: number;
  velocity: number;
  dt: number;
  temperature: number;
  boundaryCondition: "reflective" | "absorbing" | "periodic";
  interparticleCollisions: boolean;
  collisionRadius: number;
  initialDistType: "uniform" | "gaussian" | "ring" | "stripe" | "grid";
  // Distribution params
  distSigmaX?: number;
  distSigmaY?: number;
  distR0?: number;
  distDR?: number;
  distThickness?: number;
  distNx?: number;
  distNy?: number;
  distJitter?: number;
}

export class PhysicsEngineV2 {
  public particles: ParticleV2[] = [];
  public time: number = 0;
  public collisionCount: number = 0;
  
  private params: EngineParamsV2;
  private boundaryConfig: BoundaryConfig;
  private rng: () => number; // Random number generator

  constructor(params: EngineParamsV2) {
    this.params = { ...params };
    this.rng = Math.random;
    this.boundaryConfig = this.createBoundaryConfig();
    this.initializeParticles();
  }

  private createBoundaryConfig(): BoundaryConfig {
    const { canvasWidth, canvasHeight, boundaryCondition } = this.params;
    
    return {
      type: boundaryCondition,
      xMin: 0,
      xMax: canvasWidth,
      yMin: 0,
      yMax: canvasHeight,
    };
  }

  private initializeParticles(): void {
    this.particles = [];
    const { particleCount, dimension, canvasWidth, canvasHeight } = this.params;

    for (let i = 0; i < particleCount; i++) {
      const pos = this.samplePosition(i);
      const vel = this.sampleVelocity();

      this.particles.push({
        id: i,
        x: pos.x,
        y: dimension === "1D" ? canvasHeight / 2 : pos.y,
        vx: vel.vx,
        vy: dimension === "1D" ? 0 : vel.vy,
        radius: 3,
        color: [0.23, 0.51, 0.96, 0.8], // Default blue #3b82f6
      });
    }

    this.time = 0;
    this.collisionCount = 0;
  }

  private samplePosition(index: number): { x: number; y: number } {
    const { canvasWidth, canvasHeight, initialDistType } = this.params;

    switch (initialDistType) {
      case "gaussian":
        return this.sampleGaussian();
      case "ring":
        return this.sampleRing();
      case "stripe":
        return this.sampleStripe(index);
      case "grid":
        return this.sampleGrid(index);
      case "uniform":
      default:
        return {
          x: this.rng() * canvasWidth,
          y: this.rng() * canvasHeight,
        };
    }
  }

  private sampleGaussian(): { x: number; y: number } {
    const { canvasWidth, canvasHeight, distSigmaX = 80, distSigmaY = 80 } = this.params;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    // Box-Muller transform
    const u1 = this.rng();
    const u2 = this.rng();
    const r = Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    
    return {
      x: centerX + r * Math.cos(theta) * distSigmaX,
      y: centerY + r * Math.sin(theta) * distSigmaY,
    };
  }

  private sampleRing(): { x: number; y: number } {
    const { canvasWidth, canvasHeight, distR0 = 150, distDR = 20 } = this.params;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const angle = this.rng() * 2 * Math.PI;
    const radius = distR0 + (this.rng() - 0.5) * distDR;
    
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  }

  private sampleStripe(index: number): { x: number; y: number } {
    const { canvasWidth, canvasHeight, distThickness = 40 } = this.params;
    const centerY = canvasHeight / 2;
    
    return {
      x: (index / this.params.particleCount) * canvasWidth,
      y: centerY + (this.rng() - 0.5) * distThickness,
    };
  }

  private sampleGrid(index: number): { x: number; y: number } {
    const { canvasWidth, canvasHeight, distNx = 20, distNy = 15, distJitter = 4 } = this.params;
    const col = index % distNx;
    const row = Math.floor(index / distNx);
    
    const spacingX = canvasWidth / (distNx + 1);
    const spacingY = canvasHeight / (distNy + 1);
    
    return {
      x: spacingX * (col + 1) + (this.rng() - 0.5) * distJitter,
      y: spacingY * (row + 1) + (this.rng() - 0.5) * distJitter,
    };
  }

  private sampleVelocity(): { vx: number; vy: number } {
    const { velocity, temperature } = this.params;
    const speed = velocity * (1 + (this.rng() - 0.5) * temperature);
    const angle = this.rng() * 2 * Math.PI;
    
    return {
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
    };
  }

  step(dt: number): void {
    const { interparticleCollisions, collisionRadius } = this.params;
    
    // Update positions
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // Apply boundary conditions
    this.applyBoundaries();

    // Handle interparticle collisions if enabled
    if (interparticleCollisions) {
      this.handleCollisions(collisionRadius);
    }

    this.time += dt;
  }

  private applyBoundaries(): void {
    const { boundaryCondition } = this.params;
    
    switch (boundaryCondition) {
      case "reflective":
        this.applyReflectingBoundaries();
        break;
      case "absorbing":
        this.applyAbsorbingBoundaries();
        break;
      case "periodic":
        this.applyPeriodicBoundaries();
        break;
    }
  }

  private applyReflectingBoundaries(): void {
    const { xMin, xMax, yMin, yMax } = this.boundaryConfig;
    
    for (const p of this.particles) {
      if (p.x < xMin) {
        p.x = xMin + (xMin - p.x);
        p.vx = Math.abs(p.vx);
      } else if (p.x > xMax) {
        p.x = xMax - (p.x - xMax);
        p.vx = -Math.abs(p.vx);
      }
      
      if (p.y < yMin) {
        p.y = yMin + (yMin - p.y);
        p.vy = Math.abs(p.vy);
      } else if (p.y > yMax) {
        p.y = yMax - (p.y - yMax);
        p.vy = -Math.abs(p.vy);
      }
    }
  }

  private applyAbsorbingBoundaries(): void {
    const { xMin, xMax, yMin, yMax } = this.boundaryConfig;
    
    for (const p of this.particles) {
      if (p.x < xMin || p.x > xMax || p.y < yMin || p.y > yMax) {
        // Reset to center with random velocity
        p.x = (xMax - xMin) / 2;
        p.y = (yMax - yMin) / 2;
        const vel = this.sampleVelocity();
        p.vx = vel.vx;
        p.vy = vel.vy;
      }
    }
  }

  private applyPeriodicBoundaries(): void {
    const { xMin, xMax, yMin, yMax } = this.boundaryConfig;
    const width = xMax - xMin;
    const height = yMax - yMin;
    
    for (const p of this.particles) {
      if (p.x < xMin) p.x += width;
      else if (p.x > xMax) p.x -= width;
      
      if (p.y < yMin) p.y += height;
      else if (p.y > yMax) p.y -= height;
    }
  }

  private handleCollisions(collisionRadius: number): void {
    const count = this.particles.length;
    const radiusSq = collisionRadius * collisionRadius;
    
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < radiusSq && distSq > 0) {
          // Elastic collision
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;
          
          // Relative velocity
          const dvx = p1.vx - p2.vx;
          const dvy = p1.vy - p2.vy;
          
          // Velocity along normal
          const dvAlong = dvx * nx + dvy * ny;
          
          if (dvAlong > 0) continue; // Moving apart
          
          // Exchange momentum
          const impulse = dvAlong;
          p1.vx -= impulse * nx;
          p1.vy -= impulse * ny;
          p2.vx += impulse * nx;
          p2.vy += impulse * ny;
          
          this.collisionCount++;
        }
      }
    }
  }

  // Update parameters without wiping particles
  updateParams(params: Partial<EngineParamsV2>): void {
    const oldCount = this.params.particleCount;
    
    // Update params
    Object.assign(this.params, params);
    
    // Update boundary config if canvas size changed
    if (params.canvasWidth || params.canvasHeight || params.boundaryCondition) {
      this.boundaryConfig = this.createBoundaryConfig();
    }
    
    // Handle particle count changes
    if (params.particleCount !== undefined && params.particleCount !== oldCount) {
      if (params.particleCount > oldCount) {
        // Add new particles
        for (let i = oldCount; i < params.particleCount; i++) {
          const pos = this.samplePosition(i);
          const vel = this.sampleVelocity();
          this.particles.push({
            id: i,
            x: pos.x,
            y: this.params.dimension === "1D" ? this.params.canvasHeight / 2 : pos.y,
            vx: vel.vx,
            vy: this.params.dimension === "1D" ? 0 : vel.vy,
            radius: 3,
            color: [0.23, 0.51, 0.96, 0.8],
          });
        }
      } else if (params.particleCount < oldCount) {
        // Remove excess particles
        this.particles.splice(params.particleCount);
      }
    }
  }

  reset(): void {
    this.initializeParticles();
  }

  getParams(): EngineParamsV2 {
    return { ...this.params };
  }

  getStats(): { time: number; collisionCount: number; particleCount: number } {
    return {
      time: this.time,
      collisionCount: this.collisionCount,
      particleCount: this.particles.length,
    };
  }
}
