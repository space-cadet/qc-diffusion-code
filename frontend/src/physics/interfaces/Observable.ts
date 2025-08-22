import type { Particle } from '../types/Particle';

export interface Observable {
  readonly id: string;
  calculate(particles: Particle[], timestamp: number): any;
  reset(): void;
}

export interface ObservableMetadata {
  name: string;
  units: string;
  description: string;
}

export interface CachedResult {
  value: any;
  timestamp: number;
  computeTime: number;
}
