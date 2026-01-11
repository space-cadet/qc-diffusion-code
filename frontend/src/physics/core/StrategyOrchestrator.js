export class StrategyOrchestrator {
    constructor(strategies = []) {
        this.collisionStrategies = [];
        this.motionStrategies = [];
        this.categorizeStrategies(strategies);
    }
    setStrategies(strategies) {
        this.collisionStrategies = [];
        this.motionStrategies = [];
        this.categorizeStrategies(strategies);
    }
    categorizeStrategies(strategies) {
        // Simple default classification: rely on method presence.
        // Callers can control order by the input array ordering within each phase.
        for (const s of strategies) {
            if (typeof s.preUpdate === 'function') {
                this.collisionStrategies.push(s);
            }
            if (typeof s.integrate === 'function') {
                this.motionStrategies.push(s);
            }
        }
    }
    // Phase A: collisions/scattering (velocity updates only)
    executePhaseA(particles, context) {
        for (const p of particles) {
            for (const s of this.collisionStrategies) {
                s.preUpdate?.(p, particles, context);
            }
        }
    }
    // Phase B: motion integration
    executePhaseB(particles, dt, context) {
        for (const p of particles) {
            for (const s of this.motionStrategies) {
                s.integrate?.(p, dt, context);
            }
        }
    }
}
