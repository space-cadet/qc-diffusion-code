import { BoundaryManager } from '../core/BoundaryManager';
import { simTime, simDt } from '../core/GlobalTime';
export class CTRWStrategy1D {
    constructor(params) {
        this.collisionRate = params.collisionRate;
        this.jumpLength = params.jumpLength;
        this.velocity = params.velocity || params.jumpLength * params.collisionRate;
        this.diffusionConstant = this.velocity ** 2 / (2 * this.collisionRate);
        this.meanWaitTime = 1 / this.collisionRate;
        if (!params.boundaryConfig) {
            console.warn('[CTRWStrategy1D] No boundaryConfig provided; using fallback defaults');
        }
        const boundaryConfig = params.boundaryConfig || {
            type: 'periodic',
            xMin: -200,
            xMax: 200,
            yMin: -200,
            yMax: 200
        };
        this.boundaryManager = new BoundaryManager(boundaryConfig);
        this.interparticleCollisions = params.interparticleCollisions || false;
        this.coordSystem = params.coordSystem;
    }
    preUpdate(particle, allParticles, _context) {
        if (this.interparticleCollisions) {
            this.handleInterparticleCollisions(particle, allParticles);
        }
        const collision = this.handleCollision(particle);
        if (collision.occurred && collision.newVelocity) {
            particle.velocity = collision.newVelocity;
            particle.lastCollisionTime = collision.timestamp;
            particle.nextCollisionTime = collision.timestamp + collision.waitTime;
            particle.collisionCount++;
        }
    }
    integrate(particle, dt, _context) {
        const velocity = this.coordSystem.toVector(particle.velocity);
        particle.position.x += velocity.x * dt;
        // Apply boundary conditions
        const boundaryResult = this.boundaryManager.apply(particle);
        particle.position = boundaryResult.position;
        if (boundaryResult.velocity) {
            particle.velocity = boundaryResult.velocity;
        }
        if (boundaryResult.absorbed) {
            particle.isActive = false;
        }
        // Record trajectory point for every update
        particle.trajectory.push({
            position: { ...particle.position },
            timestamp: simTime()
        });
    }
    handleInterparticleCollisions(particle, allParticles) {
        for (const other of allParticles) {
            if (particle.id === other.id)
                continue;
            const dist = Math.abs(particle.position.x - other.position.x);
            if (dist < (particle.radius || 1) + (other.radius || 1)) {
                // Simple elastic collision: swap velocities
                const v1 = particle.velocity.vx;
                particle.velocity.vx = other.velocity.vx;
                other.velocity.vx = v1;
            }
        }
    }
    setBoundaries(config) {
        this.boundaryManager.updateConfig(config);
    }
    getBoundaries() {
        return this.boundaryManager.getConfig();
    }
    calculateStep(particle) {
        const currentTime = simTime();
        const collision = this.handleCollision(particle);
        const timeStep = Math.min(collision.waitTime, simDt());
        const vx = this.coordSystem.toVector(particle.velocity).x;
        const dx = vx * timeStep;
        return {
            deltaX: dx,
            deltaY: 0,
            collision,
            timestamp: currentTime,
            particleId: particle.id
        };
    }
    generateCollisionTime() {
        return -Math.log(Math.random()) / this.collisionRate;
    }
    handleCollision(particle) {
        const currentTime = simTime();
        const waitTime = this.generateCollisionTime();
        const shouldCollide = currentTime >= particle.nextCollisionTime;
        if (!shouldCollide) {
            return {
                occurred: false,
                newDirection: 0,
                waitTime,
                energyChange: 0,
                timestamp: currentTime
            };
        }
        const newDirection = Math.random() < 0.5 ? -1 : 1;
        const speed = Math.abs(particle.velocity.vx);
        return {
            occurred: true,
            newDirection,
            waitTime,
            energyChange: 0,
            timestamp: currentTime,
            position: { ...particle.position },
            oldVelocity: { ...particle.velocity },
            newVelocity: {
                vx: speed * newDirection,
                vy: 0
            }
        };
    }
    validateParameters(params) {
        return (params.collisionRate > 0 &&
            params.jumpLength > 0 &&
            (!params.velocity || params.velocity > 0));
    }
    getPhysicsParameters() {
        return {
            collisionRate: this.collisionRate,
            jumpLength: this.jumpLength,
            velocity: this.velocity,
            diffusionConstant: this.diffusionConstant,
            meanWaitTime: this.meanWaitTime
        };
    }
    getParameters() {
        return {
            collisionRate: this.collisionRate,
            velocity: this.velocity,
            jumpLength: this.jumpLength
        };
    }
}
