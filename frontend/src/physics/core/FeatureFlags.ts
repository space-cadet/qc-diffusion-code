// Feature flags for physics engine migration
export const FEATURE_FLAGS = {
  // Enable new two-phase physics engine
  TWO_PHASE_ENGINE: 'TWO_PHASE_ENGINE',
  // Enable boundary phase extraction
  BOUNDARY_PHASE: 'BOUNDARY_PHASE',
  // Enable performance benchmarking
  PERFORMANCE_BENCHMARKS: 'PERFORMANCE_BENCHMARKS'
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export class FeatureFlagManager {
  private static flags: Record<FeatureFlag, boolean> = {
    TWO_PHASE_ENGINE: false,
    BOUNDARY_PHASE: false,
    PERFORMANCE_BENCHMARKS: false
  };

  static isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag];
  }

  static enable(flag: FeatureFlag): void {
    this.flags[flag] = true;
  }

  static disable(flag: FeatureFlag): void {
    this.flags[flag] = false;
  }

  static set(flag: FeatureFlag, enabled: boolean): void {
    this.flags[flag] = enabled;
  }
}
