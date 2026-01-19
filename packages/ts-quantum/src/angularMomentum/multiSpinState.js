/**
 * Multi-Spin State Implementation
 *
 * Prototype for handling sequential coupling of multiple angular momentum states.
 * Addresses the limitations identified in T66 research for multi-spin coupling.
 */
import { createJmState } from './core';
import { addAngularMomenta } from './composition';
import { analyzeAngularState, extractJComponent } from './stateAnalysis';
/**
 * Multi-spin angular momentum state that tracks coupling history
 * and maintains knowledge of all J components present
 */
class MultiSpinState {
    constructor(spins, mValues, currentState, couplingHistory = [], availableJ = new Set()) {
        this.spins = [...spins];
        this.mValues = [...mValues];
        this.currentState = currentState;
        this.couplingHistory = [...couplingHistory];
        this.availableJ = new Set(availableJ);
    }
    /**
     * Creates a MultiSpinState from a single spin state
     * @param j Angular momentum quantum number
     * @param m Magnetic quantum number
     * @returns New MultiSpinState with single spin
     */
    static fromSingleSpin(j, m) {
        const state = createJmState(j, m);
        const availableJ = new Set([j]);
        return new MultiSpinState([j], // spins
        [m], // mValues  
        state, // currentState
        [], // couplingHistory
        availableJ // availableJ
        );
    }
    /**
     * Creates a MultiSpinState from existing coupled state (for analysis)
     * @param state Existing StateVector
     * @param spins Array of individual j values that were coupled
     * @param mValues Array of individual m values
     * @returns New MultiSpinState for analysis
     */
    static fromCoupledState(state, spins, mValues) {
        // For now, we can't determine available J values from arbitrary state
        // This would require the state decomposition functionality
        const availableJ = new Set();
        return new MultiSpinState(spins, mValues, state, [], availableJ);
    }
    /**
     * Adds another spin to this multi-spin state using proper state decomposition
     * @param j Angular momentum of spin to add
     * @param m Magnetic quantum number of spin to add
     * @returns New MultiSpinState with additional spin coupled
     */
    addSpin(j, m) {
        // Create the new spin state
        const newSpinState = createJmState(j, m);
        if (this.spins.length === 1) {
            // Simple case: first coupling, we know the effective J
            const effectiveJ = this.spins[0];
            const coupledState = addAngularMomenta(this.currentState, effectiveJ, newSpinState, j);
            // Calculate new available J values
            const jMin = Math.abs(effectiveJ - j);
            const jMax = effectiveJ + j;
            const newAvailableJ = new Set();
            for (let newJ = jMin; newJ <= jMax; newJ += 0.5) {
                newAvailableJ.add(newJ);
            }
            // Create coupling step record
            const couplingStep = {
                addedSpin: j,
                addedM: m,
                previousJ: Array.from(this.availableJ),
                resultingJ: Array.from(newAvailableJ),
                timestamp: Date.now()
            };
            // Get actual available J values from the metadata
            const metadata = coupledState.getAngularMomentumMetadata();
            const actualAvailableJ = metadata ? new Set(metadata.jComponents.keys()) : newAvailableJ;
            return new MultiSpinState([...this.spins, j], [...this.mValues, m], coupledState, [...this.couplingHistory, couplingStep], actualAvailableJ);
        }
        else {
            // Complex case: need to handle composite state with multiple j-components
            // This is the key innovation that solves the T66 problem
            // Analyze the current composite state
            const analysis = analyzeAngularState(this.currentState);
            if (!analysis.isAngularMomentum) {
                throw new Error('Cannot add spin to non-angular momentum state');
            }
            // For now, use the dominant J component (can be enhanced later)
            const dominantJ = analysis.dominantJ;
            if (dominantJ === null) {
                throw new Error('Cannot determine dominant J component');
            }
            // Extract the dominant J component as a pure state
            const extracted = extractJComponent(this.currentState, dominantJ);
            if (!extracted) {
                throw new Error(`Cannot extract J=${dominantJ} component from composite state`);
            }
            // Couple the extracted pure state with the new spin
            const coupledState = addAngularMomenta(extracted.state, dominantJ, newSpinState, j);
            // Calculate new available J values based on the dominant component
            const jMin = Math.abs(dominantJ - j);
            const jMax = dominantJ + j;
            const newAvailableJ = new Set();
            for (let newJ = jMin; newJ <= jMax; newJ += 0.5) {
                newAvailableJ.add(newJ);
            }
            // Create coupling step record
            const couplingStep = {
                addedSpin: j,
                addedM: m,
                previousJ: Array.from(this.availableJ),
                resultingJ: Array.from(newAvailableJ),
                timestamp: Date.now()
            };
            // Get actual available J values from the metadata
            const metadata = coupledState.getAngularMomentumMetadata();
            const actualAvailableJ = metadata ? new Set(metadata.jComponents.keys()) : newAvailableJ;
            return new MultiSpinState([...this.spins, j], [...this.mValues, m], coupledState, [...this.couplingHistory, couplingStep], actualAvailableJ);
        }
    }
    /**
     * Extracts a specific J component from the current state
     * @param targetJ The J value to extract
     * @returns StateVector for that J component, or null if not present
     */
    extractJComponent(targetJ) {
        if (!this.availableJ.has(targetJ)) {
            return null;
        }
        // Use the metadata-based state analysis implementation (no j1,j2 parameters needed)
        const extracted = extractJComponent(this.currentState, targetJ);
        return extracted ? extracted.state : null;
    }
    /**
     * Simple heuristic to determine dominant J value
     * Real implementation would analyze state amplitudes
     */
    getDominantJ() {
        if (this.availableJ.size === 0) {
            throw new Error('No available J values to determine dominant J');
        }
        // For prototype: return the maximum J value
        return Math.max(...Array.from(this.availableJ));
    }
    /**
     * Gets all currently available J values and their information
     * @returns Map of J values to basic information
     */
    getJComponents() {
        const result = new Map();
        for (const j of this.availableJ) {
            result.set(j, { available: true, estimated: true });
        }
        return result;
    }
    /**
     * Gets the valid intertwiner values for spin network vertices
     * These are the J values that could appear at a vertex with these incident spins
     * @returns Array of valid J values
     */
    getValidIntertwiners() {
        // For a vertex with n incident edges, the valid J values are determined
        // by successive application of triangle inequalities
        return Array.from(this.availableJ).sort((a, b) => a - b);
    }
    /**
     * Gets all individual spins in this multi-spin state
     * @returns Array of individual j values
     */
    getIndividualSpins() {
        return [...this.spins];
    }
    /**
     * Gets all individual magnetic quantum numbers
     * @returns Array of individual m values
     */
    getIndividualMs() {
        return [...this.mValues];
    }
    /**
     * Gets the coupling history showing how this state was built
     * @returns Array of coupling steps
     */
    getCouplingHistory() {
        return [...this.couplingHistory];
    }
    /**
     * Gets the current coupled state vector
     * @returns Current StateVector
     */
    getCurrentState() {
        return this.currentState;
    }
    /**
     * Gets the total dimension of the current state
     * @returns Dimension of current state vector
     */
    getDimension() {
        return this.currentState.dimension;
    }
    /**
     * Gets the number of individual spins in this state
     * @returns Number of spins
     */
    getSpinCount() {
        return this.spins.length;
    }
    /**
     * Gets the norm of the current state
     * @returns Norm of current state vector
     */
    norm() {
        return this.currentState.norm();
    }
    /**
     * Checks if the state is normalized
     * @param tolerance Numerical tolerance
     * @returns True if state is normalized
     */
    isNormalized(tolerance = 1e-10) {
        return Math.abs(this.norm() - 1.0) < tolerance;
    }
    /**
     * Returns a string representation of the multi-spin state
     * @returns Human-readable description
     */
    toString() {
        const spinInfo = this.spins.map((j, i) => `j${i + 1}=${j}`).join(', ');
        const mInfo = this.mValues.map((m, i) => `m${i + 1}=${m}`).join(', ');
        const jInfo = Array.from(this.availableJ).sort().join(', ');
        return `MultiSpinState(${this.spins.length} spins: ${spinInfo}; ${mInfo}; available J=[${jInfo}]; dim=${this.getDimension()})`;
    }
    /**
     * Returns detailed information about the state
     * @returns Detailed string representation
     */
    toDetailedString() {
        let result = this.toString() + '\n';
        result += `State: ${this.currentState.toString()}\n`;
        if (this.couplingHistory.length > 0) {
            result += 'Coupling History:\n';
            this.couplingHistory.forEach((step, i) => {
                result += `  ${i + 1}. Added j=${step.addedSpin}, m=${step.addedM}: [${step.previousJ.join(',')}] → [${step.resultingJ.join(',')}]\n`;
            });
        }
        return result;
    }
}
export { MultiSpinState };
