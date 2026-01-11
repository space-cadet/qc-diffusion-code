import { lattice1D, lattice2D, path, complete } from '@spin-network/graph-core';
import { simTime, simDt } from './core/GlobalTime';
export class PhysicsRandomWalk {
    constructor(params) {
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
    generateStep(particle) {
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
    updateParticle(particle) {
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
    calculateDensity(particles) {
        // TODO: Interface with DensityCalculator
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
    getScalingLimits() {
        return {
            tau: this.meanWaitTime,
            a: this.jumpLength,
            D: this.diffusionConstant,
            v: this.velocity,
            gamma: this.collisionRate,
            scalingRegime: this.velocity > this.jumpLength * this.collisionRate ? 'ballistic' : 'diffusive'
        };
    }
    generateCollisionTime() {
        // Exponential distribution with rate λ (collisionRate)
        return -Math.log(Math.random()) / this.collisionRate;
    }
    handleCollision(particle) {
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
    createGraph(type, size) {
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
    getAvailableNodes() {
        return this.graph.getNodes();
    }
    getNeighbors(nodeId) {
        return this.graph.getAdjacentNodes(nodeId);
    }
    getGraph() {
        return this.graph;
    }
    updateParameters(params) {
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
    step(dt) {
        // Update particles and graph state by time step dt
    }
    getDensityField() {
        // Calculate and return density field
        return {};
    }
}
