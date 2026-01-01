# Provost-Vallee Quantum State Geometry Examples

*Paper*: "Riemannian Structure on Manifolds of Quantum States" (Provost & Vallee, 1980)

This directory contains implementations of quantum state geometry concepts from the foundational Provost-Vallee paper. The examples demonstrate how quantum states can be viewed as points on a Riemannian manifold with geometric distance relating to quantum distinguishability.

## Key Concepts

### Quantum Distance
The paper introduces a gauge-invariant distance between quantum states:
```
D²(ψ₁,ψ₂) = 2 - 2|⟨ψ₁|ψ₂⟩|
```

This distance:
- Is independent of global phase (gauge-invariant)
- Ranges from 0 (identical states) to 2√2 (orthogonal states)
- Provides geometric structure on projective Hilbert space

### Physical Interpretation
- Distance relates to quantum distinguishability
- Metric tensor components connect to quantum fluctuations
- Curvature indicates quantum dispersion properties

## Examples in This Directory

### `basicDistance.ts`
- Two-level quantum systems
- Bloch sphere geometry
- Distance calculations and verification

### Implementation Status
- ✅ Phase 1: Basic distance calculations
- ⬜ Phase 2: Coherent state manifolds  
- ⬜ Phase 3: Advanced curvature analysis

## Usage

```typescript
import { quantumDistance, TwoLevelSystem } from './basicDistance';

// Create quantum states
const ground = TwoLevelSystem.ground();  // |0⟩
const excited = TwoLevelSystem.excited(); // |1⟩

// Calculate distance
const distance = quantumDistance(ground, excited);
console.log(distance); // Should be √2 for orthogonal states
```

## References

1. Provost, J.P. & Vallee, G. "Riemannian structure on manifolds of quantum states." Commun. Math. Phys. 76, 289-301 (1980)
2. Implementation plan: `../../docs/papers/provost-vallee-implementation-plan.md`
3. Task tracking: `../../../memory-bank/tasks/T68.md`
