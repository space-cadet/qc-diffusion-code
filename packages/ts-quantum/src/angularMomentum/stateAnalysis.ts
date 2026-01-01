/**
 * State Analysis and Decomposition for Angular Momentum States
 * 
 * Phase 1 implementation for T66: Multi-Spin Coupling and Intertwiner Implementation
 * Provides functions to analyze composite angular momentum states and extract j-components.
 */

import { Complex, toComplex } from '../core/types';
import { StateVector } from '../states/stateVector';
import { clebschGordan } from './composition';
import * as math from 'mathjs';

/**
 * Analysis results for an angular momentum state
 */
interface AngularStateAnalysis {
  /** Whether this state has angular momentum structure */
  isAngularMomentum: boolean;
  /** Map of j values to their component information */
  components: Map<number, JComponentInfo>;
  /** The j value with the largest amplitude */
  dominantJ: number | null;
  /** Whether this is a pure j-eigenstate or mixed superposition */
  isPure: boolean;
  /** Original coupling information if available */
  couplingInfo?: {
    j1: number;
    j2: number;
    originalStates?: StateVector[];
  };
}

/**
 * Information about a specific j-component
 */
interface JComponentInfo {
  /** Angular momentum quantum number */
  j: number;
  /** Expected dimension (2j+1) */
  dimension: number;
  /** Total amplitude for this j-component */
  totalAmplitude: Complex;
  /** Magnitude of total amplitude */
  magnitude: number;
  /** Individual m-state amplitudes */
  mStates: Map<number, Complex>;
  /** Whether this component is present */
  isPresent: boolean;
}

/**
 * Enhanced state vector with j-component extraction capability
 */
interface ExtractedJComponent {
  /** The extracted j-component as a pure state */
  state: StateVector;
  /** Angular momentum quantum number */
  j: number;
  /** Normalization factor applied */
  normalizationFactor: number;
  /** Original magnitude in composite state */
  originalMagnitude: number;
}

/**
 * Analyzes a StateVector to determine its angular momentum structure
 * 
 * This is the core function that enables multi-spin coupling by identifying
 * what j-components are present in a composite angular momentum state.
 * 
 * @param state The state vector to analyze
 * @param j1 First angular momentum (if known from coupling history) - optional for backwards compatibility
 * @param j2 Second angular momentum (if known from coupling history) - optional for backwards compatibility
 * @returns Analysis results showing j-component structure
 */
function analyzeAngularState(
  state: StateVector, 
  j1?: number, 
  j2?: number
): AngularStateAnalysis {
  
  // First try to get metadata from the state itself
  const metadata = state.getAngularMomentumMetadata();
  
  if (metadata) {
    // Use metadata-based analysis (preferred)
    return analyzeFromMetadata(state, metadata);
  }
  
  // Fallback to legacy analysis requiring j1, j2 parameters
  const properties = (state as any).properties;
  let couplingInfo: { j1: number; j2: number } | undefined;
  
  if (properties?.type === 'angular_momentum' && properties.j1 !== undefined && properties.j2 !== undefined) {
    couplingInfo = { j1: properties.j1, j2: properties.j2 };
  } else if (j1 !== undefined && j2 !== undefined) {
    couplingInfo = { j1, j2 };
  }
  
  if (!couplingInfo) {
    // Cannot analyze without knowing the original coupling
    return {
      isAngularMomentum: false,
      components: new Map(),
      dominantJ: null,
      isPure: false
    };
  }
  
  // Calculate possible j values from triangle inequality
  const jMin = Math.abs(couplingInfo.j1 - couplingInfo.j2);
  const jMax = couplingInfo.j1 + couplingInfo.j2;
  const possibleJ: number[] = [];
  
  for (let j = jMin; j <= jMax; j += 0.5) {
    possibleJ.push(j);
  }
  
  // Analyze each possible j-component
  const components = new Map<number, JComponentInfo>();
  let dominantJ: number | null = null;
  let dominantMagnitude = 0;
  
  for (const j of possibleJ) {
    const componentInfo = analyzeJComponent(state, j, couplingInfo.j1, couplingInfo.j2);
    components.set(j, componentInfo);
    
    if (componentInfo.isPresent && componentInfo.magnitude > dominantMagnitude) {
      dominantMagnitude = componentInfo.magnitude;
      dominantJ = j;
    }
  }
  
  // Determine if this is a pure state (only one j-component present)
  const presentComponents = Array.from(components.values()).filter(c => c.isPresent);
  const isPure = presentComponents.length === 1;
  
  return {
    isAngularMomentum: true,
    components,
    dominantJ,
    isPure,
    couplingInfo
  };
}

/**
 * Analyzes angular momentum state using metadata (preferred method)
 */
function analyzeFromMetadata(state: StateVector, metadata: any): AngularStateAnalysis {
  const components = new Map<number, JComponentInfo>();
  let dominantJ: number | null = null;
  let dominantMagnitude = 0;
  
  // Analyze each J component from metadata
  for (const [j, componentMetadata] of metadata.jComponents) {
    const componentInfo = analyzeJComponentFromMetadata(state, j, componentMetadata);
    components.set(j, componentInfo);
    
    if (componentInfo.isPresent && componentInfo.magnitude > dominantMagnitude) {
      dominantMagnitude = componentInfo.magnitude;
      dominantJ = j;
    }
  }
  
  // Determine if this is a pure state
  const presentComponents = Array.from(components.values()).filter(c => c.isPresent);
  const isPure = presentComponents.length === 1;
  
  // Get latest coupling info from history
  const latestCoupling = getLatestCoupling(metadata.couplingHistory);
  
  return {
    isAngularMomentum: true,
    components,
    dominantJ,
    isPure,
    couplingInfo: latestCoupling
  };
}

/**
 * Analyzes a J component using metadata
 */
function analyzeJComponentFromMetadata(
  state: StateVector,
  j: number,
  componentMetadata: any
): JComponentInfo {
  const dimension = componentMetadata.dimension;
  const startIndex = componentMetadata.startIndex;
  const mStates = new Map<number, Complex>();
  let totalAmplitudeSquared = 0;
  
  // Extract amplitudes for each m value of this j-component
  for (let mIndex = 0; mIndex < dimension; mIndex++) {
    const m = j - mIndex; // m goes from +j to -j
    const amplitudeIndex = startIndex + mIndex;
    
    if (amplitudeIndex < state.dimension) {
      const amplitude = state.amplitudes[amplitudeIndex];
      mStates.set(m, amplitude);
      totalAmplitudeSquared += (math.abs(amplitude) as unknown as number) ** 2;
    } else {
      mStates.set(m, math.complex(0, 0));
    }
  }
  
  const magnitude = Math.sqrt(totalAmplitudeSquared);
  const totalAmplitude = math.complex(magnitude, 0);
  
  return {
    j: j,
    dimension,
    totalAmplitude,
    magnitude,
    mStates,
    isPresent: magnitude > 1e-10
  };
}

/**
 * Gets the latest coupling information from coupling history
 */
function getLatestCoupling(couplingHistory: any[]): { j1: number; j2: number } | undefined {
  for (let i = couplingHistory.length - 1; i >= 0; i--) {
    const record = couplingHistory[i];
    if (record.operation === 'coupling' && record.j1 !== undefined && record.j2 !== undefined) {
      return { j1: record.j1, j2: record.j2 };
    }
  }
  return undefined;
}

/**
 * Analyzes a specific j-component within a composite state
 * 
 * Uses the inverse Clebsch-Gordan transformation to determine how much
 * of the given j-component is present in the composite state.
 * 
 * @param state Composite state to analyze
 * @param targetJ The j value to analyze
 * @param j1 First original angular momentum
 * @param j2 Second original angular momentum
 * @returns Information about this j-component
 */
function analyzeJComponent(
  state: StateVector,
  targetJ: number,
  j1: number,
  j2: number
): JComponentInfo {
  
  const dimension = Math.floor(2 * targetJ + 1);
  const mStates = new Map<number, Complex>();
  let totalAmplitudeSquared = 0;
  
  // Calculate expected position of this j-component in the state vector
  const jMin = Math.abs(j1 - j2);
  const jMax = j1 + j2;
  
  let stateIndex = 0;
  let targetStartIndex = -1;
  
  // Find where this j-component starts in the amplitude array
  for (let j = jMax; j >= jMin; j -= 0.5) {
    if (Math.abs(j - targetJ) < 1e-10) {
      targetStartIndex = stateIndex;
      break;
    }
    stateIndex += Math.floor(2 * j + 1);
  }
  
  if (targetStartIndex === -1) {
    // This j value is not possible for this coupling
    return {
      j: targetJ,
      dimension,
      totalAmplitude: math.complex(0, 0),
      magnitude: 0,
      mStates,
      isPresent: false
    };
  }
  
  // Extract amplitudes for each m value of this j-component
  for (let m = targetJ; m >= -targetJ; m -= 1) {
    const index = targetStartIndex + Math.floor(targetJ - m);
    
    if (index < state.dimension) {
      const amplitude = state.amplitudes[index];
      mStates.set(m, amplitude);
      totalAmplitudeSquared += (math.abs(amplitude) as unknown as number) ** 2;
    } else {
      mStates.set(m, math.complex(0, 0));
    }
  }
  
  const magnitude = Math.sqrt(totalAmplitudeSquared);
  const totalAmplitude = math.complex(magnitude, 0); // Simplified for prototype
  
  return {
    j: targetJ,
    dimension,
    totalAmplitude,
    magnitude,
    mStates,
    isPresent: magnitude > 1e-10
  };
}

/**
 * Extracts a specific j-component from a composite angular momentum state
 * 
 * This is the key function that enables multi-spin coupling by extracting
 * pure j-components that can be used with existing addAngularMomenta function.
 * 
 * @param state Composite state containing multiple j-components
 * @param targetJ The j value to extract
 * @param j1 First original angular momentum (optional for backwards compatibility)
 * @param j2 Second original angular momentum (optional for backwards compatibility)
 * @returns Extracted pure j-component state, or null if not present
 */
function extractJComponent(
  state: StateVector,
  targetJ: number,
  j1?: number,
  j2?: number
): ExtractedJComponent | null {
  
  // First try metadata-based extraction (preferred)
  const metadata = state.getAngularMomentumMetadata();
  
  if (metadata) {
    return extractJComponentFromMetadata(state, targetJ, metadata);
  }
  
  // Fallback to legacy analysis
  const analysis = analyzeAngularState(state, j1, j2);
  
  if (!analysis.isAngularMomentum) {
    return null;
  }
  
  const componentInfo = analysis.components.get(targetJ);
  
  if (!componentInfo || !componentInfo.isPresent) {
    return null;
  }
  
  // Create pure state vector for this j-component
  const pureDimension = Math.floor(2 * targetJ + 1);
  const pureAmplitudes: Complex[] = [];
  
  // Extract amplitudes in proper order for pure j-state
  for (let m = targetJ; m >= -targetJ; m -= 1) {
    const amplitude = componentInfo.mStates.get(m) || math.complex(0, 0);
    pureAmplitudes.push(amplitude);
  }
  
  // Create the pure state vector
  const pureState = new StateVector(pureDimension, pureAmplitudes, `|${targetJ}⟩`);
  
  // Normalize the extracted component
  const norm = pureState.norm();
  
  if (norm < 1e-10) {
    return null; // Component is essentially zero
  }
  
  const normalizedState = pureState.normalize();
  
  return {
    state: normalizedState,
    j: targetJ,
    normalizationFactor: 1 / norm,
    originalMagnitude: componentInfo.magnitude
  };
}

/**
 * Extracts J component using metadata (preferred method)
 */
function extractJComponentFromMetadata(
  state: StateVector,
  targetJ: number,
  metadata: any
): ExtractedJComponent | null {
  
  const componentMetadata = metadata.jComponents.get(targetJ);
  
  if (!componentMetadata) {
    return null;
  }
  
  const { startIndex, dimension } = componentMetadata;
  
  // Extract amplitudes directly using metadata indices
  const pureAmplitudes: Complex[] = [];
  let totalAmplitudeSquared = 0;
  
  for (let i = 0; i < dimension; i++) {
    const amplitudeIndex = startIndex + i;
    if (amplitudeIndex < state.dimension) {
      const amplitude = state.amplitudes[amplitudeIndex];
      pureAmplitudes.push(amplitude);
      totalAmplitudeSquared += (math.abs(amplitude) as unknown as number) ** 2;
    } else {
      pureAmplitudes.push(math.complex(0, 0));
    }
  }
  
  const magnitude = Math.sqrt(totalAmplitudeSquared);
  
  if (magnitude < 1e-10) {
    return null; // Component is essentially zero
  }
  
  // Create the pure state vector
  const pureState = new StateVector(dimension, pureAmplitudes, `|${targetJ}⟩`);
  
  // Add metadata to extracted state
  const extractedMetadata = {
    type: 'angular_momentum' as const,
    j: targetJ,
    mRange: [-targetJ, targetJ] as [number, number],
    couplingHistory: [...metadata.couplingHistory],
    jComponents: new Map([[targetJ, {
      j: targetJ,
      startIndex: 0,
      dimension: dimension,
      normalizationFactor: 1
    }]]),
    isComposite: false
  };
  
  pureState.setAngularMomentumMetadata(extractedMetadata);
  
  // Normalize the extracted component
  const normalizedState = pureState.normalize();
  
  return {
    state: normalizedState,
    j: targetJ,
    normalizationFactor: 1 / magnitude,
    originalMagnitude: magnitude
  };
}

/**
 * Determines if a StateVector has angular momentum decomposition information
 * 
 * @param state StateVector to check
 * @returns True if state has angular momentum metadata
 */
function hasAngularMomentumData(state: StateVector): boolean {
  const properties = (state as any).properties;
  return properties?.type === 'angular_momentum' && 
         properties.j1 !== undefined && 
         properties.j2 !== undefined;
}

/**
 * Gets coupling information from a StateVector if available
 * 
 * @param state StateVector to examine
 * @returns Coupling information or null if not available
 */
function getCouplingInfo(state: StateVector): { j1: number; j2: number } | null {
  const properties = (state as any).properties;
  
  if (properties?.type === 'angular_momentum' && 
      properties.j1 !== undefined && 
      properties.j2 !== undefined) {
    return { j1: properties.j1, j2: properties.j2 };
  }
  
  return null;
}

/**
 * Creates a detailed string representation of the analysis results
 * 
 * @param analysis Analysis results from analyzeAngularState
 * @returns Human-readable description
 */
function analysisToString(analysis: AngularStateAnalysis): string {
  if (!analysis.isAngularMomentum) {
    return 'Not an angular momentum state';
  }
  
  let result = `Angular Momentum State Analysis:\n`;
  result += `  Type: ${analysis.isPure ? 'Pure' : 'Mixed'} state\n`;
  result += `  Dominant J: ${analysis.dominantJ}\n`;
  
  if (analysis.couplingInfo) {
    result += `  Original coupling: j1=${analysis.couplingInfo.j1}, j2=${analysis.couplingInfo.j2}\n`;
  }
  
  result += `  Components:\n`;
  
  for (const [j, info] of analysis.components) {
    if (info.isPresent) {
      result += `    J=${j}: magnitude=${info.magnitude.toFixed(4)}, dim=${info.dimension}\n`;
    }
  }
  
  return result;
}

// Export the public API
export {
  analyzeAngularState,
  extractJComponent,
  hasAngularMomentumData,
  getCouplingInfo,
  analysisToString,
  AngularStateAnalysis,
  JComponentInfo,
  ExtractedJComponent
};
