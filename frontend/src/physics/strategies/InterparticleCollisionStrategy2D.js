import { BoundaryManager } from '../core/BoundaryManager';
import { simTime } from '../core/GlobalTime';
import { SpatialGrid } from '../utils/SpatialGrid';
export class InterparticleCollisionStrategy2D {
    constructor(params) {
        this.idCache = new Map();
        this.boundaryManager = new BoundaryManager(params.boundaryConfig);
        this.coordSystem = params.coordSystem;
        this.spatialGrid = new SpatialGrid(1000, 20); // Grid size, cell size
    }
    detectCollision(p1, p2) {
        const dx = p1.position.x - p2.position.x;
        const dy = p1.position.y - p2.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const r = (p1.radius || 3) + (p2.radius || 3);
        return distance < r; // Use consistent per-particle radii as in grid path
    }
    preUpdate(particle, allParticles, _context) {
        // Build the spatial grid ONCE per update pass using the first particle call
        // Assumes engine calls preUpdate sequentially over the same allParticles array
        if (allParticles.length > 0 && particle.id === allParticles[0].id) {
            this.spatialGrid.clear();
            for (const p of allParticles) {
                this.spatialGrid.insert(p);
            }
        }
        // Handle inter-particle collisions using the prebuilt spatial grid
        this.handleInterparticleCollisions(particle, allParticles);
    }
    integrate(particle, dt, _context) {
        // No-op: collision strategy only modifies velocities, not positions
    }
    getNumericId(particle) {
        let id = this.idCache.get(particle.id);
        if (id === undefined) {
            id = parseInt(String(particle.id).replace(/\D+/g, ''), 10) || 0;
            this.idCache.set(particle.id, id);
            // console.log(`[Collision2D] Cached ID: ${particle.id} -> ${id}`);
        }
        return id;
    }
    handleInterparticleCollisions(particle, allParticles) {
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
            if (particle.id === other.id)
                continue;
            const oid = this.getNumericId(other);
            if (!(pid < oid))
                continue; // only handle pair once when pid < oid
            const dx = particle.position.x - other.position.x;
            const dy = particle.position.y - other.position.y;
            const distSquared = dx * dx + dy * dy;
            const collisionRadius = (particle.radius || 3) + (other.radius || 3);
            const collisionRadiusSquared = collisionRadius * collisionRadius;
            if (distSquared < collisionRadiusSquared && distSquared > 0) {
                const dist = Math.sqrt(distSquared);
                const otherVel = this.coordSystem.toVector(other.velocity);
                // Correct 2D elastic collision (equal masses) via normal/tangent projection
                const [v1x, v1y, v2x, v2y] = this.elasticCollision2D(particleVel.x, particleVel.y, otherVel.x, otherVel.y, dx / dist, dy / dist // collision normal components
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
    elasticCollision2D(v1x, v1y, v2x, v2y, nx, ny // unit normal from other -> particle
    ) {
        // Unit tangent
        const tx = -ny;
        const ty = nx;
        // Project initial velocities onto normal and tangent
        const v1n = v1x * nx + v1y * ny;
        const v1t = v1x * tx + v1y * ty;
        const v2n = v2x * nx + v2y * ny;
        const v2t = v2x * tx + v2y * ty;
        // Equal masses: swap normal components, tangential components unchanged
        const v1nAfter = v2n;
        const v2nAfter = v1n;
        const v1tAfter = v1t;
        const v2tAfter = v2t;
        // Recompose into x,y
        const newV1x = v1nAfter * nx + v1tAfter * tx;
        const newV1y = v1nAfter * ny + v1tAfter * ty;
        const newV2x = v2nAfter * nx + v2tAfter * tx;
        const newV2y = v2nAfter * ny + v2tAfter * ty;
        return [newV1x, newV1y, newV2x, newV2y];
    }
    calculateStep(particle) {
        return {
            deltaX: 0,
            deltaY: 0,
            collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: simTime() },
            timestamp: simTime(),
            particleId: particle.id
        };
    }
    setBoundaries(config) {
        this.boundaryManager.updateConfig(config);
    }
    getBoundaries() {
        return this.boundaryManager.getConfig();
    }
    validateParameters() {
        return true;
    }
    getPhysicsParameters() {
        return {};
    }
    getParameters() {
        return {
            collisionRate: 0,
            velocity: 0,
            jumpLength: 0
        };
    }
}
