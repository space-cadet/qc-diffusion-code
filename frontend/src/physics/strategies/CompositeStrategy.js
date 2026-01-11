export class CompositeStrategy {
    constructor(strategies) {
        if (strategies.length === 0) {
            throw new Error('CompositeStrategy requires at least one strategy');
        }
        this.strategies = strategies;
        this.primaryStrategy = strategies[0]; // Use first strategy for boundary/parameter methods
    }
    preUpdate(particle, allParticles, context) {
        for (const strategy of this.strategies) {
            strategy.preUpdate(particle, allParticles, context);
        }
    }
    integrate(particle, dt, context) {
        for (const strategy of this.strategies) {
            strategy.integrate(particle, dt, context);
        }
    }
    calculateStep(particle) {
        return this.primaryStrategy.calculateStep(particle);
    }
    setBoundaries(config) {
        for (const strategy of this.strategies) {
            strategy.setBoundaries(config);
        }
    }
    getBoundaries() {
        const primaryBounds = this.primaryStrategy.getBoundaries();
        // In a composite strategy, ensuring consistent boundaries is crucial.
        // Here we'll just return the primary's but a more robust implementation
        // might validate or merge them.
        return primaryBounds;
    }
    validateParameters(params) {
        return this.strategies.every(strategy => strategy.validateParameters(params));
    }
    getPhysicsParameters() {
        return this.strategies.reduce((acc, strategy) => {
            return { ...acc, ...strategy.getPhysicsParameters() };
        }, {});
    }
    getParameters() {
        const combined = this.strategies.reduce((acc, strategy) => {
            const params = strategy.getParameters();
            Object.assign(acc, params);
            return acc;
        }, {});
        return {
            collisionRate: combined.collisionRate || 0,
            velocity: combined.velocity || 0,
            jumpLength: combined.jumpLength || 0,
        };
    }
}
