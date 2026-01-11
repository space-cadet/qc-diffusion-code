import { TextObservable } from './observables/TextObservable';
export class ObservableManager {
    constructor(bounds) {
        this.observers = new Map();
        this.textObservables = [];
        this.particleSnapshot = [];
        this.currentTimestamp = 0;
        this.cachedResults = new Map();
        this.snapshotValid = false;
        this.bounds = bounds;
        this.observers = new Map();
    }
    register(observable) {
        this.observers.set(observable.id, observable);
        console.log(`[ObservableManager] Registered observer: ${observable.id}`);
    }
    unregister(id) {
        this.observers.delete(id);
        this.cachedResults.delete(id);
        // Also remove from text observables if it's a text observable
        this.textObservables = this.textObservables.filter(obs => obs.id !== id);
        console.log(`[ObservableManager] Unregistered observer: ${id}`);
    }
    loadTextObservables(textDefinitions) {
        // Clear existing text observables
        this.textObservables.forEach(obs => this.unregister(obs.id));
        this.textObservables = [];
        // Load new text observables
        textDefinitions.forEach(text => {
            try {
                const observables = TextObservable.fromText(text, this.bounds);
                observables.forEach(obs => {
                    this.textObservables.push(obs);
                    this.register(obs);
                });
            }
            catch (error) {
                console.error(`[ObservableManager] Failed to load text observable:`, error);
            }
        });
    }
    registerTextObservable(text) {
        const validation = TextObservable.validate(text);
        if (!validation.valid) {
            return { success: false, errors: validation.errors };
        }
        try {
            const observables = TextObservable.fromText(text, this.bounds);
            observables.forEach(obs => {
                this.textObservables.push(obs);
                this.register(obs);
            });
            return { success: true, errors: [] };
        }
        catch (error) {
            return { success: false, errors: [error.message] };
        }
    }
    unregisterTextObservable(name) {
        const textObsId = `text_${name}`;
        this.unregister(textObsId);
    }
    getTextObservables() {
        return [...this.textObservables];
    }
    updateSnapshot(particles, timestamp) {
        if (this.observers.size === 0) {
            this.snapshotValid = false;
            return;
        }
        // Deep copy particles for temporal consistency
        this.particleSnapshot = particles.map(p => ({
            ...p,
            position: { ...p.position },
            velocity: { ...p.velocity },
            trajectory: p.trajectory // Shallow copy is ok for CircularBuffer
        }));
        this.currentTimestamp = timestamp;
        this.snapshotValid = true;
        // Clear cache when new snapshot arrives
        this.cachedResults.clear();
    }
    getResult(id) {
        const observer = this.observers.get(id);
        if (!observer) {
            console.warn(`[ObservableManager] No observer registered for id: ${id}`);
            return null;
        }
        if (!this.snapshotValid) {
            console.warn(`[ObservableManager] No valid snapshot available for calculation`);
            return null;
        }
        // Check cache first
        const cached = this.cachedResults.get(id);
        if (cached && cached.timestamp === this.currentTimestamp) {
            return cached.value;
        }
        // Calculate and cache
        const startTime = performance.now();
        const result = observer.calculate(this.particleSnapshot, this.currentTimestamp);
        const computeTime = performance.now() - startTime;
        this.cachedResults.set(id, {
            value: result,
            timestamp: this.currentTimestamp,
            computeTime
        });
        return result;
    }
    hasObserver(id) {
        return this.observers.has(id);
    }
    getRegisteredObservers() {
        return Array.from(this.observers.keys());
    }
    reset() {
        this.observers.forEach(obs => obs.reset());
        this.cachedResults.clear();
        this.particleSnapshot = [];
        this.snapshotValid = false;
        this.currentTimestamp = 0;
    }
    clearCache() {
        this.cachedResults.clear();
    }
    // Debug info
    getStats() {
        return {
            activeObservers: this.observers.size,
            cachedResults: this.cachedResults.size,
            snapshotSize: this.particleSnapshot.length,
            snapshotValid: this.snapshotValid,
            lastTimestamp: this.currentTimestamp
        };
    }
    // Performance metrics
    getPerformanceMetrics() {
        const metrics = {};
        this.cachedResults.forEach((result, id) => {
            metrics[id] = result.computeTime;
        });
        return metrics;
    }
}
