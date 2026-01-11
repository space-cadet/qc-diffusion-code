import { BoundaryManager } from '../core/BoundaryManager';
import { simTime } from '../core/GlobalTime';
export class InterparticleCollisionStrategy1D {
    constructor(params) {
        this.boundaryManager = new BoundaryManager(params.boundaryConfig);
        this.coordSystem = params.coordSystem;
    }
    preUpdate(particle, allParticles, _context) {
        // Handle inter-particle collisions in the preUpdate phase
        this.handleCollisions(particle, allParticles);
    }
    integrate(particle, dt, _context) {
        // No-op: collision strategy only modifies velocities, not positions
    }
    handleCollisions(particle, allParticles = []) {
        // Simple 1D elastic collisions: swap vx when overlapping
        // Ensure each pair is processed only once per frame using numeric id ordering
        const toNum = (id) => typeof id === 'number' ? id : (parseInt(String(id).replace(/\D+/g, ''), 10) || 0);
        const pid = toNum(particle.id);
        for (const other of allParticles) {
            if (other.id === particle.id)
                continue;
            const oid = toNum(other.id);
            if (!(pid < oid))
                continue; // only handle pair once when pid < oid
            const dx = particle.position.x - other.position.x;
            const dist = Math.abs(dx);
            const r = (particle.radius || 1) + (other.radius || 1);
            if (dist < r) {
                // Only count when approaching each other
                const relV = particle.velocity.vx - other.velocity.vx;
                if (relV * dx < 0) {
                    // Swap velocities (elastic, equal mass)
                    const v1 = particle.velocity.vx;
                    particle.velocity.vx = other.velocity.vx;
                    other.velocity.vx = v1;
                    // Separate positions to remove overlap and avoid immediate re-collision
                    const overlap = r - dist;
                    const sign = dx === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(dx);
                    const push = (overlap / 2) * sign;
                    particle.position.x += push;
                    other.position.x -= push;
                    // Count actual inter-particle collisions on both participants
                    particle.interparticleCollisionCount = (particle.interparticleCollisionCount || 0) + 1;
                    other.interparticleCollisionCount = (other.interparticleCollisionCount || 0) + 1;
                }
            }
        }
    }
    calculateStep(particle) {
        // No intrinsic displacement; purely modifies velocities
        return {
            deltaX: 0,
            deltaY: 0,
            collision: { occurred: false, newDirection: 0, waitTime: 0, energyChange: 0, timestamp: simTime() },
            timestamp: simTime(),
            particleId: particle.id,
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
