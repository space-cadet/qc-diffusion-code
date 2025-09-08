import type { BoundaryConfig, BoundaryResult } from '../types/BoundaryConfig';
import type { Particle } from '../types/Particle';
import type { CoordinateSystem } from '../core/CoordinateSystem';
import { validateBoundaryConfig } from '../types/BoundaryConfig';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';

export class BoundaryManager {
  private config: BoundaryConfig;
  

  constructor(config: BoundaryConfig) {
    validateBoundaryConfig(config);
    console.log('[BoundaryManager] Created with:', config.type);
    this.config = config;
  }

  apply(particle: Particle): BoundaryResult {
    switch (this.config.type) {
      case 'periodic':
        return applyPeriodicBoundary(particle.position, this.config);
      case 'reflective':
        return applyReflectiveBoundary(particle.position, particle.velocity, this.config);
      case 'absorbing':
        return applyAbsorbingBoundary(particle.position, this.config);
      default:
        console.warn('[BoundaryManager] Unknown boundary type:', this.config.type, '- returning unchanged position');
        return { position: particle.position };
    }
  }

  updateConfig(config: BoundaryConfig): void {
    validateBoundaryConfig(config);
    console.log('[BoundaryManager] Config updated:', config.type);
    this.config = config;
  }

  getConfig(): BoundaryConfig {
    return this.config;
  }
}
