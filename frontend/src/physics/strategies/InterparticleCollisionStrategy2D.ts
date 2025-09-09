import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { Particle, Vector, Velocity } from '../types/Particle';
import type { Step, CollisionEvent } from '../types/CollisionEvent';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import type { PhysicsContext } from '../types/PhysicsContext';
import { BoundaryManager } from '../core/BoundaryManager';
import { simTime } from '../core/GlobalTime';
import { SpatialGrid } from '../utils/SpatialGrid';

export class InterparticleCollisionStrategy2D implements PhysicsStrategy {
  private boundaryManager: BoundaryManager;
  private coordSystem: CoordinateSystem;
  private spatialGrid: SpatialGrid;
  private idCache: Map<string, number> = new Map();

  constructor(params: { boundaryConfig: BoundaryConfig; coordSystem: CoordinateSystem }) {
    this.boundaryManager = new BoundaryManager(params.boundaryConfig);
    this.coordSystem = params.coordSystem;
    this.spatialGrid = new SpatialGrid(1000, 20); // Grid size, cell size
  }

  private detectCollision(p1: Particle, p2: Particle): boolean {
    const dx = p1.position.x - p2.position.x;
    const dy = p1.position.y - p2.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const r = (p1.radius || 3) + (p2.radius || 3);
    return distance < r; // Use consistent per-particle radii as in grid path
  }

  

  preUpdate(particle: Particle, allParticles: Particle[], _context: PhysicsContext): void {
    // Handle inter-particle collisions in the preUpdate phase
    this.handleInterparticleCollisions(particle, allParticles);
  }

  integrate(particle: Particle, dt: number, _context: PhysicsContext): void {
    // No-op: collision strategy only modifies velocities, not positions
  }

  private getNumericId(particle: Particle): number {
    let id = this.idCache.get(particle.id);
    if (id === undefined) {
      id = parseInt(String(particle.id).replace(/\D+/g, ''), 10) || 0;
      this.idCache.set(particle.id, id);
      // console.log(`[Collision2D] Cached ID: ${particle.id} -> ${id}`);
    }
    return id;
  }

  private handleInterparticleCollisions(particle: Particle, allParticles: Particle[]): void {
    // Build spatial grid
    this.spatialGrid.clear();
    for (const p of allParticles) {
      this.spatialGrid.insert(p);
    }

    const pid = this.getNumericId(particle);
    const particleVel = this.coordSystem.toVector(particle.velocity);
    const nearby = this.spatialGrid.getNearbyParticles(particle);
    const totalParticles = allParticles.length;
    const nearbyCount = nearby.length;

    // Log spatial grid efficiency (every 100th particle to avoid spam)
    // if (Math.random() < 0.00001) {
    //   console.log(`[Collision2D] Spatial grid: ${nearbyCount}/${totalParticles} nearby particles for p${pid}`);
    // }

    for (const other of nearby) {
      if (particle.id === other.id) continue;
      const oid = this.getNumericId(other);
      if (!(pid < oid)) continue; // only handle pair once when pid < oid

      const dx = particle.position.x - other.position.x;
      const dy = particle.position.y - other.position.y;
      const distSquared = dx * dx + dy * dy;
      const collisionRadius = (particle.radius || 3) + (other.radius || 3);
      const collisionRadiusSquared = collisionRadius * collisionRadius;

      if (distSquared < collisionRadiusSquared && distSquared > 0) {
        const dist = Math.sqrt(distSquared);
        const otherVel = this.coordSystem.toVector(other.velocity);
        
        // 2D elastic collision with momentum conservation
        const [v1x, v1y, v2x, v2y] = this.elasticCollision2D(
          particleVel.x, particleVel.y,
          otherVel.x, otherVel.y,
          1, 1
        );
        
        particle.velocity = this.coordSystem.toVelocity({ x: v1x, y: v1y });
        other.velocity = this.coordSystem.toVelocity({ x: v2x, y: v2y });

        // Separate particles to prevent overlap
        const overlap = collisionRadius - dist;
        const separationFactor = overlap / (2 * dist);
        particle.position.x += dx * separationFactor;
        particle.position.y += dy * separationFactor;
        other.position.x -= dx * separationFactor;
        other.position.y -= dy * separationFactor;

        // Count collisions and mark timestamp
        particle.interparticleCollisionCount = (particle.interparticleCollisionCount || 0) + 1;
        other.interparticleCollisionCount = (other.interparticleCollisionCount || 0) + 1;
        const currentTime = simTime();
        particle.lastInterparticleCollisionTime = currentTime;
        other.lastInterparticleCollisionTime = currentTime;

        // if(Math.random() < 0.01) {
        //   console.log(`[Collision2D] Collision: p${pid} <-> p${oid}, dist=${dist.toFixed(2)}`);
        // }
      }
    }
  }

  private elasticCollision2D(v1x: number, v1y: number, v2x: number, v2y: number, m1: number, m2: number): [number, number, number, number] {
    const totalMass = m1 + m2;
    const newV1x = ((m1 - m2) * v1x + 2 * m2 * v2x) / totalMass;
    const newV1y = ((m1 - m2) * v1y + 2 * m2 * v2y) / totalMass;
    const newV2x = ((m2 - m1) * v2x + 2 * m1 * v1x) / totalMass;
    const newV2y = ((m2 - m1) * v2y + 2 * m1 * v1y) / totalMass;
    
    return [newV1x, newV1y, newV2x, newV2y];
  }

  calculateStep(particle: Particle): Step {
    return {
      deltaX: 0,
      deltaY: 0,
      collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: simTime() },
      timestamp: simTime(),
      particleId: particle.id
    };
  }

  setBoundaries(config: BoundaryConfig): void {
    this.boundaryManager.updateConfig(config);
  }

  getBoundaries(): BoundaryConfig {
    return this.boundaryManager.getConfig();
  }

  validateParameters(): boolean {
    return true;
  }

  getPhysicsParameters(): Record<string, number> {
    return {};
  }

  getParameters(): { collisionRate: number; velocity: number; jumpLength: number } {
    return {
      collisionRate: 0,
      velocity: 0,
      jumpLength: 0
    };
  }
}
