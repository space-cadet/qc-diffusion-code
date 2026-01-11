export class MomentumObservable {
    constructor() {
        this.id = 'momentum';
        this.history = [];
        this.maxHistory = 1000;
        this.particleMass = 1.0; // Default mass, could be configurable
    }
    calculate(particles, timestamp) {
        const activeParticles = particles.filter(p => p.isActive);
        if (activeParticles.length === 0) {
            return {
                totalMomentumX: 0,
                totalMomentumY: 0,
                totalMomentumMagnitude: 0,
                averageMomentumX: 0,
                averageMomentumY: 0,
                averageMomentumMagnitude: 0,
                activeParticleCount: 0,
                timestamp
            };
        }
        // Calculate momentum for each particle: p = m * v
        let totalPx = 0;
        let totalPy = 0;
        activeParticles.forEach(particle => {
            totalPx += this.particleMass * particle.velocity.vx;
            totalPy += this.particleMass * particle.velocity.vy;
        });
        const totalMomentumMagnitude = Math.sqrt(totalPx * totalPx + totalPy * totalPy);
        const averagePx = totalPx / activeParticles.length;
        const averagePy = totalPy / activeParticles.length;
        const averageMomentumMagnitude = Math.sqrt(averagePx * averagePx + averagePy * averagePy);
        const result = {
            totalMomentumX: totalPx,
            totalMomentumY: totalPy,
            totalMomentumMagnitude,
            averageMomentumX: averagePx,
            averageMomentumY: averagePy,
            averageMomentumMagnitude,
            activeParticleCount: activeParticles.length,
            timestamp
        };
        // Minimal console logging
        if (this.history.length % 100 === 0) {
            console.log(`[Momentum] t=${timestamp.toFixed(1)}s |P|=${totalMomentumMagnitude.toFixed(2)}`);
        }
        // Store in history
        this.history.push(result);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        return result;
    }
    reset() {
        this.history = [];
        console.log('[Momentum] Observable reset');
    }
    getHistory() {
        return [...this.history];
    }
    getLatest() {
        return this.history.length > 0 ? this.history[this.history.length - 1] : null;
    }
    setParticleMass(mass) {
        this.particleMass = mass;
    }
    getParticleMass() {
        return this.particleMass;
    }
    // Get momentum component histories
    getTotalMomentumXHistory() {
        return this.history.map(result => result.totalMomentumX);
    }
    getTotalMomentumYHistory() {
        return this.history.map(result => result.totalMomentumY);
    }
    getTotalMomentumMagnitudeHistory() {
        return this.history.map(result => result.totalMomentumMagnitude);
    }
    // Statistical analysis
    getMomentumStatistics() {
        if (this.history.length === 0)
            return null;
        const pxValues = this.getTotalMomentumXHistory();
        const pyValues = this.getTotalMomentumYHistory();
        const magnitudeValues = this.getTotalMomentumMagnitudeHistory();
        const meanPx = pxValues.reduce((sum, p) => sum + p, 0) / pxValues.length;
        const meanPy = pyValues.reduce((sum, p) => sum + p, 0) / pyValues.length;
        const meanMagnitude = magnitudeValues.reduce((sum, p) => sum + p, 0) / magnitudeValues.length;
        const variancePx = pxValues.reduce((sum, p) => sum + Math.pow(p - meanPx, 2), 0) / pxValues.length;
        const variancePy = pyValues.reduce((sum, p) => sum + Math.pow(p - meanPy, 2), 0) / pyValues.length;
        const varianceMagnitude = magnitudeValues.reduce((sum, p) => sum + Math.pow(p - meanMagnitude, 2), 0) / magnitudeValues.length;
        return {
            meanPx,
            meanPy,
            meanMagnitude,
            stddevPx: Math.sqrt(variancePx),
            stddevPy: Math.sqrt(variancePy),
            stddevMagnitude: Math.sqrt(varianceMagnitude)
        };
    }
}
