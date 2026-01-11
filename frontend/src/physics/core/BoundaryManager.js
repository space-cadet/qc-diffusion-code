import { validateBoundaryConfig } from '../types/BoundaryConfig';
import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';
export class BoundaryManager {
    constructor(config) {
        validateBoundaryConfig(config);
        console.log('[BoundaryManager] Created with:', config.type);
        this.config = config;
    }
    apply(particle) {
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
    updateConfig(config) {
        validateBoundaryConfig(config);
        console.log('[BoundaryManager] Config updated:', config.type);
        this.config = config;
    }
    getConfig() {
        return this.config;
    }
}
