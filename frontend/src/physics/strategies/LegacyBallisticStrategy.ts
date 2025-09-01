import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { Particle } from '../types/Particle';
import type { Step } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';

export class LegacyBallisticStrategy implements RandomWalkStrategy {
  private boundaryConfig: BoundaryConfig;

  constructor(config?: { boundaryConfig?: BoundaryConfig }) {
    this.boundaryConfig = config?.boundaryConfig || { type: 'periodic', xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  }

  updateParticle(particle: Particle, allParticles?: Particle[]): void {
    // Ballistic motion: position updates based on velocity
    const dt = 0.01; // Use small timestep to prevent massive jumps
    
    // Debug first particle velocity
    if (particle.id === 'p0') {
      console.log('[Ballistic] p0 update', {
        beforePos: { x: particle.position.x, y: particle.position.y },
        velocity: { vx: particle.velocity.vx, vy: particle.velocity.vy },
        dt
      });
    }
    
    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;
    
    // Apply boundary conditions to prevent infinite coordinates
    this.applyBoundaryConditions(particle);
    
    // Debug after boundary conditions
    // if (particle.id === 'p0') {
    //   console.log('[Ballistic] p0 after boundaries', {
    //     afterPos: { x: particle.position.x.toFixed(4), y: particle.position.y.toFixed(4) },
    //     boundaryType: this.boundaryConfig.type
    //   });
    // }
  }

  updateParticleWithDt(particle: Particle, allParticles: Particle[], dt: number): void {
    // Debug first particle velocity
    // if (particle.id === 'p0') {
    //   console.log('[Ballistic] p0 updateParticleWithDt', {
    //     beforePos: { x: particle.position.x.toFixed(4), y: particle.position.y.toFixed(4) },
    //     velocity: { vx: particle.velocity.vx.toFixed(4), vy: particle.velocity.vy.toFixed(4) },
    //     dt,
    //     deltaPos: { dx: (particle.velocity.vx * dt).toFixed(4), dy: (particle.velocity.vy * dt).toFixed(4) }
    //   });
    // }
    
    // Ballistic motion with proper dt from physics engine
    particle.position.x += particle.velocity.vx * dt;
    particle.position.y += particle.velocity.vy * dt;
    
    // Apply boundary conditions to prevent infinite coordinates
    this.applyBoundaryConditions(particle);
    
    // Debug after boundary conditions
    // if (particle.id === 'p0') {
    //   console.log('[Ballistic] p0 after boundaries', {
    //     afterPos: { x: particle.position.x, y: particle.position.y }
    //   });
    // }
  }

  private applyBoundaryConditions(particle: Particle): void {
    const { xMin, xMax, yMin, yMax, type } = this.boundaryConfig;
    
    if (type === 'periodic') {
      // Periodic boundaries
      if (particle.position.x < xMin) particle.position.x = xMax - (xMin - particle.position.x);
      if (particle.position.x > xMax) particle.position.x = xMin + (particle.position.x - xMax);
      if (particle.position.y < yMin) particle.position.y = yMax - (yMin - particle.position.y);
      if (particle.position.y > yMax) particle.position.y = yMin + (particle.position.y - yMax);
    } else if (type === 'reflective') {
      // Reflective boundaries
      if (particle.position.x < xMin) {
        particle.position.x = xMin;
        particle.velocity.vx *= -1;
      }
      if (particle.position.x > xMax) {
        particle.position.x = xMax;
        particle.velocity.vx *= -1;
      }
      if (particle.position.y < yMin) {
        particle.position.y = yMin;
        particle.velocity.vy *= -1;
      }
      if (particle.position.y > yMax) {
        particle.position.y = yMax;
        particle.velocity.vy *= -1;
      }
    } else if (type === 'absorbing') {
      // Absorbing boundaries - stop particle if it hits boundary
      if (particle.position.x < xMin || particle.position.x > xMax ||
          particle.position.y < yMin || particle.position.y > yMax) {
        particle.velocity.vx = 0;
        particle.velocity.vy = 0;
        particle.isActive = false;
      }
    }
  }

  calculateStep(particle: Particle): Step {
    // No discrete steps in pure ballistic motion, so we return a step that represents no change.
    return {
      dx: 0,
      dy: 0,
      collision: {
        occurred: false,
        newDirection: 0,
        waitTime: Infinity,
        energyChange: 0,
        timestamp: 0,
      },
      timestamp: 0,
      particleId: particle.id,
    };
  }

  validateParameters(params: any): boolean {
    return true; // No parameters to validate
  }

  getPhysicsParameters(): Record<string, number> {
    return {}; // No specific physics parameters
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryConfig = config;
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryConfig;
  }
}
