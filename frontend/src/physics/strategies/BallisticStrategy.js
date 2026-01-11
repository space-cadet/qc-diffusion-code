import { BoundaryManager } from '../core/BoundaryManager';
import { simDt, simTime } from '../core/GlobalTime';
export class BallisticStrategy {
    constructor(config) {
        this.boundaryManager = new BoundaryManager(config.boundaryConfig);
        this.coordSystem = config.coordSystem;
    }
    preUpdate(_particle, _allParticles, _context) {
        // no-op: ballistic has no Phase A behavior
    }
    integrate(particle, dt, _context) {
        // Ballistic motion - straight line movement using provided timestep
        const velocity = this.coordSystem.toVector(particle.velocity);
        particle.position.x += velocity.x * dt;
        particle.position.y += velocity.y * dt;
        // Apply boundary conditions
        const boundaryResult = this.boundaryManager.apply(particle);
        particle.position = boundaryResult.position;
        if (boundaryResult.velocity) {
            particle.velocity = boundaryResult.velocity;
        }
        if (boundaryResult.absorbed) {
            particle.isActive = false;
        }
        // Record trajectory point
        particle.trajectory.push({
            position: { ...particle.position },
            timestamp: simTime()
        });
    }
    calculateStep(particle) {
        const velocity = this.coordSystem.toVector(particle.velocity);
        const dt = simDt();
        return {
            deltaX: velocity.x * dt,
            deltaY: velocity.y * dt,
            collision: { occurred: false, newDirection: 0, waitTime: Infinity, energyChange: 0, timestamp: simTime() },
            timestamp: simTime(),
            particleId: particle.id
        };
    }
    validateParameters() {
        return true;
    }
    getPhysicsParameters() {
        return {};
    }
    setBoundaries(config) {
        this.boundaryManager.updateConfig(config);
    }
    getBoundaries() {
        return this.boundaryManager.getConfig();
    }
    getParameters() {
        return {
            collisionRate: 0,
            velocity: 0,
            jumpLength: 0
        };
    }
}
