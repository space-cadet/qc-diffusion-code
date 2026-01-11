// Feature flags for physics engine migration
export const FEATURE_FLAGS = {
    // Enable new two-phase physics engine
    TWO_PHASE_ENGINE: 'TWO_PHASE_ENGINE',
    // Enable boundary phase extraction
    BOUNDARY_PHASE: 'BOUNDARY_PHASE',
    // Enable performance benchmarking
    PERFORMANCE_BENCHMARKS: 'PERFORMANCE_BENCHMARKS'
};
export class FeatureFlagManager {
    static isEnabled(flag) {
        return this.flags[flag];
    }
    static enable(flag) {
        this.flags[flag] = true;
    }
    static disable(flag) {
        this.flags[flag] = false;
    }
    static set(flag, enabled) {
        this.flags[flag] = enabled;
    }
}
FeatureFlagManager.flags = {
    TWO_PHASE_ENGINE: false,
    BOUNDARY_PHASE: false,
    PERFORMANCE_BENCHMARKS: false
};
