export class ParticleCountObservable {
    constructor() {
        this.id = 'particleCount';
        this.history = [];
        this.maxHistory = 1000;
    }
    calculate(particles, timestamp) {
        const activeParticles = particles.filter(p => p.isActive);
        const result = {
            totalCount: particles.length,
            activeCount: activeParticles.length,
            inactiveCount: particles.length - activeParticles.length,
            timestamp
        };
        // Store in history
        this.history.push(result);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        return result;
    }
    reset() {
        this.history = [];
    }
    getHistory() {
        return [...this.history];
    }
    getLatest() {
        return this.history.length > 0 ? this.history[this.history.length - 1] : null;
    }
}
