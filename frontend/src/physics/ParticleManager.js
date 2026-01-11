import { CircularBuffer } from "./utils/CircularBuffer";
import { TimeManager } from "./core/TimeManager";
import { simTime } from "./core/GlobalTime";
export class ParticleManager {
    constructor(strategy, dimension, coordSystem) {
        this.particles = new Map();
        this.diagCounter = 0;
        this.strategy = strategy;
        this.dimension = dimension;
        this.coordSystem = coordSystem;
        this.timeManager = new TimeManager();
    }
    getCoordinateSystem() {
        return this.coordSystem;
    }
    getStrategy() {
        return this.strategy;
    }
    // Update the canvas size so we can convert physics coordinates -> canvas pixels
    setCanvasSize(width, height) {
        this.coordSystem.updateCanvasSize({ width, height });
        try {
            const b = this.strategy.getBoundaries();
            console.log("[PM] setCanvasSize", { width, height, bounds: b });
        }
        catch (_) {
            console.log("[PM] setCanvasSize", { width, height });
        }
    }
    // Map physics coordinates (defined by strategy boundaries) to canvas pixel coordinates
    mapToCanvas(pos) {
        return this.coordSystem.toCanvas(pos);
    }
    initializeParticle(tsParticle) {
        // Use velocities passed from RandomWalkSimulator (thermal with momentum conservation)
        // If no velocity provided, fall back to zero velocity for compatibility
        const vx = tsParticle.velocity?.vx ?? 0;
        const vy = tsParticle.velocity?.vy ?? 0;
        const currentTime = simTime();
        // Convert initial canvas position to physics coordinates
        const physicsPos = this.coordSystem.toPhysics({
            x: tsParticle.position.x,
            y: tsParticle.position.y,
        });
        if (tsParticle.id === "p0") {
            console.log("[PM] initializeParticle p0", {
                canvasPos: { x: tsParticle.position.x, y: tsParticle.position.y },
                physicsPos,
                canvasSize: this.coordSystem.getCanvasSize(),
                bounds: this.strategy.getBoundaries(),
            });
        }
        const particle = {
            id: tsParticle.id,
            position: {
                x: physicsPos.x,
                y: physicsPos.y,
            },
            velocity: {
                vx: vx,
                vy: vy,
            },
            initial: {
                position: { x: physicsPos.x, y: physicsPos.y },
                velocity: { vx, vy },
                timestamp: currentTime,
            },
            lastCollisionTime: currentTime,
            nextCollisionTime: currentTime + Math.random() * 0.5,
            collisionCount: 0,
            trajectory: new CircularBuffer(100),
            waitingTime: 0,
            isActive: true,
            lastUpdate: currentTime
        };
        tsParticle.velocity.x = particle.velocity.vx;
        tsParticle.velocity.y = particle.velocity.vy;
        this.particles.set(particle.id, particle);
        return particle;
    }
    updateParticle(particleData) {
        const particle = this.particles.get(particleData.id);
        if (particle) {
            // Use coordinate system for all position/velocity updates
            const physicsPos = this.coordSystem.toPhysics(particleData.position);
            particle.position = physicsPos;
            particle.velocity = {
                vx: particleData.velocity.x,
                vy: particleData.velocity.y
            };
            particle.lastUpdate = simTime();
        }
    }
    update(dt) {
        // console.log('[PM] update called', { dt, particleCount: this.particles.size, strategy: this.strategy.constructor.name });
        const allParticles = this.getAllParticles();
        const activeParticles = allParticles.filter(p => p.isActive);
        // console.log('[PM] particles status', { total: allParticles.length, active: activeParticles.length });
        const physicsContext = {
            timeManager: this.timeManager,
            coordinateSystem: this.coordSystem,
            currentTime: simTime(),
        };
        for (const particle of allParticles) {
            if (particle.isActive) {
                this.strategy.preUpdate(particle, allParticles, physicsContext);
                this.strategy.integrate(particle, dt, physicsContext);
            }
            else {
                console.log('[PM] particle inactive', particle.id);
            }
        }
    }
    getAllParticles() {
        return Array.from(this.particles.values());
    }
    updatePhysicsEngine(newStrategy) {
        this.strategy = newStrategy;
        try {
            console.log("[PM] updatePhysicsEngine: new bounds", this.strategy.getBoundaries());
        }
        catch { }
    }
    getDensityData() {
        return {
            error: 0,
            effectiveDiffusion: 0,
            effectiveVelocity: 0,
            x: [],
            rho: [],
            u: [],
            moments: { mean: 0, variance: 0, skewness: 0, kurtosis: 0 },
            collisionRate: [],
        };
    }
    clearAllParticles() {
        this.particles.clear();
    }
    getCollisionStats() {
        const particles = this.getAllParticles();
        const totalCollisions = particles.reduce((sum, p) => sum + (p.collisionCount || 0), 0);
        const avgCollisions = particles.length > 0 ? totalCollisions / particles.length : 0;
        const perParticleInter = particles.reduce((sum, p) => sum + (p.interparticleCollisionCount || 0), 0);
        // Each pair collision increments both particles once → divide by 2 for pair count
        const totalInterparticleCollisions = Math.floor(perParticleInter / 2);
        const avgInterparticleCollisions = particles.length > 0 ? perParticleInter / (2 * particles.length) : 0;
        return {
            // CTRW scattering events (backward compatible)
            totalCollisions,
            avgCollisions,
            // Actual inter-particle collisions (pair count)
            totalInterparticleCollisions,
            avgInterparticleCollisions,
            activeParticles: particles.filter((p) => p.isActive).length,
        };
    }
}
