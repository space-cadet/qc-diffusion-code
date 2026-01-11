import { TextObservable } from './observables/TextObservable';
class EventEmitter {
    constructor() {
        this.events = new Map();
    }
    on(event, listener) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(listener);
    }
    off(event, listener) {
        const listeners = this.events.get(event);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    emit(event, ...args) {
        const listeners = this.events.get(event);
        if (listeners) {
            listeners.forEach(listener => listener(...args));
        }
    }
}
export class StreamObservableManager {
    constructor(bounds) {
        this.observers = new Map();
        this.textObservables = [];
        this.particleSnapshot = [];
        this.currentTimestamp = 0;
        this.eventEmitter = new EventEmitter();
        this.bounds = bounds;
    }
    // --- Event Subscription ---
    on(event, listener) {
        this.eventEmitter.on(event, listener);
    }
    off(event, listener) {
        this.eventEmitter.off(event, listener);
    }
    // --- Observable Management ---
    register(observable) {
        this.observers.set(observable.id, observable);
        this.eventEmitter.emit('register', observable.id);
        console.log(`[StreamObservableManager] Registered: ${observable.id}`);
    }
    unregister(id) {
        this.observers.delete(id);
        this.textObservables = this.textObservables.filter(obs => obs.id !== id);
        this.eventEmitter.emit('unregister', id);
        console.log(`[StreamObservableManager] Unregistered: ${id}`);
    }
    // --- Text Observables ---
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
        this.unregister(`text_${name}`);
    }
    getTextObservables() {
        return [...this.textObservables];
    }
    // --- Data Calculation and Emission ---
    updateSnapshotAndCalculate(particles, timestamp) {
        if (this.observers.size === 0)
            return;
        // Store snapshot for temporal consistency
        this.particleSnapshot = particles.map(p => ({ ...p }));
        this.currentTimestamp = timestamp;
        // Calculate and emit results for all registered observers
        this.observers.forEach((observer, id) => {
            const result = observer.calculate(this.particleSnapshot, this.currentTimestamp);
            this.eventEmitter.emit('update', { id, data: result });
        });
    }
    // --- Utility Methods ---
    hasObserver(id) {
        return this.observers.has(id);
    }
    getRegisteredObservers() {
        return Array.from(this.observers.keys());
    }
    reset() {
        this.observers.forEach(obs => obs.reset());
        this.particleSnapshot = [];
        this.currentTimestamp = 0;
        this.eventEmitter.emit('reset');
    }
}
