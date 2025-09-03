import type { Observable, CachedResult } from './interfaces/Observable';
import type { Particle } from './types/Particle';
import { TextObservable } from './observables/TextObservable';

// Simple EventEmitter for event-driven updates
type Listener = (...args: any[]) => void;
class EventEmitter {
  private events: Map<string, Listener[]> = new Map();

  on(event: string, listener: Listener): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
  }

  off(event: string, listener: Listener): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach(listener => listener(...args));
    }
  }
}

export class StreamObservableManager {
  private observers: Map<string, Observable> = new Map();
  private textObservables: TextObservable[] = [];
  private particleSnapshot: Particle[] = [];
  private currentTimestamp: number = 0;
  private bounds: { width: number; height: number };
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(bounds: { width: number; height: number }) {
    this.bounds = bounds;
  }

  // --- Event Subscription ---
  on(event: string, listener: Listener): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.eventEmitter.off(event, listener);
  }

  // --- Observable Management ---
  register(observable: Observable): void {
    this.observers.set(observable.id, observable);
    this.eventEmitter.emit('register', observable.id);
    console.log(`[StreamObservableManager] Registered: ${observable.id}`);
  }

  unregister(id: string): void {
    this.observers.delete(id);
    this.textObservables = this.textObservables.filter(obs => obs.id !== id);
    this.eventEmitter.emit('unregister', id);
    console.log(`[StreamObservableManager] Unregistered: ${id}`);
  }

  // --- Text Observables ---
  registerTextObservable(text: string): { success: boolean; errors: string[] } {
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
    } catch (error) {
      return { success: false, errors: [(error as Error).message] };
    }
  }

  unregisterTextObservable(name: string): void {
    this.unregister(`text_${name}`);
  }

  getTextObservables(): TextObservable[] {
    return [...this.textObservables];
  }

  // --- Data Calculation and Emission ---
  updateSnapshotAndCalculate(particles: Particle[], timestamp: number): void {
    if (this.observers.size === 0) return;

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
  hasObserver(id: string): boolean {
    return this.observers.has(id);
  }

  getRegisteredObservers(): string[] {
    return Array.from(this.observers.keys());
  }

  reset(): void {
    this.observers.forEach(obs => obs.reset());
    this.particleSnapshot = [];
    this.currentTimestamp = 0;
    this.eventEmitter.emit('reset');
  }
}
