/**
 * Core Intertwiner Space Calculations
 * 
 * Fundamental functions for calculating intertwiner space dimensions and
 * validating angular momentum coupling rules in spin network theory.
 */

/**
 * Check if three angular momenta satisfy the triangle inequality.
 * Required for valid angular momentum coupling in quantum mechanics.
 * 
 * @param j1 First angular momentum quantum number
 * @param j2 Second angular momentum quantum number  
 * @param j3 Third angular momentum quantum number
 * @returns True if triangle inequality is satisfied
 */
export function triangleInequality(j1: number, j2: number, j3: number): boolean {
  return (j1 + j2 >= j3) && (j2 + j3 >= j1) && (j3 + j1 >= j2);
}

/**
 * Calculate allowed intermediate spins when coupling j1 and j2.
 * Returns array of possible j values according to angular momentum addition rules.
 * 
 * @param j1 First angular momentum quantum number
 * @param j2 Second angular momentum quantum number
 * @returns Array of allowed intermediate angular momentum values
 */
export function allowedIntermediateSpins(j1: number, j2: number): number[] {
  const j_min = Math.abs(j1 - j2);
  const j_max = j1 + j2;
  
  // Check if j1 + j2 is an integer
  const sumJ = j1 + j2;
  const isIntegerSum = Math.abs(sumJ - Math.round(sumJ)) < 1e-10;
  
  // Generate all possible intermediate j values (integers or half-integers)
  const step = isIntegerSum ? 1 : 0.5;
  const result: number[] = [];
  
  for (let j = j_min; j <= j_max + 1e-10; j += step) {
    result.push(j);
  }
  
  return result;
}

/**
 * Calculate the dimension of the intertwiner space for a node with given edge spins.
 * Dispatches to appropriate calculation based on node valence.
 * 
 * @param edgeSpins Array of angular momentum quantum numbers for node edges
 * @returns Dimension of the intertwiner space
 */
export function calculateDimension(edgeSpins: number[]): number {
  const valence = edgeSpins.length;
  
  switch (valence) {
    case 2:
      // Two-valent: dimension 1 if spins are equal, 0 otherwise
      return Math.abs(edgeSpins[0] - edgeSpins[1]) < 1e-10 ? 1 : 0;
      
    case 3:
      // Three-valent: dimension 1 if triangle inequality satisfied, 0 otherwise
      const [j1, j2, j3] = edgeSpins;
      return triangleInequality(j1, j2, j3) ? 1 : 0;
      
    case 4:
      // Four-valent: use full intertwiner dimension calculation
      const [ja, jb, jc, jd] = edgeSpins;
      return intertwinerDimension(ja, jb, jc, jd);
      
    default:
      console.warn(`Intertwiner dimension calculation for ${valence}-valent nodes not implemented`);
      return 1;
  }
}

/**
 * Calculate the dimension of the intertwiner space for a 4-valent node
 * with edges labeled j1, j2, j3, j4.
 * 
 * Uses the recoupling scheme: (j1 ⊗ j2) ⊗ (j3 ⊗ j4) → j = 0
 * 
 * @param j1 First edge angular momentum
 * @param j2 Second edge angular momentum
 * @param j3 Third edge angular momentum
 * @param j4 Fourth edge angular momentum
 * @returns Dimension of the intertwiner space
 */
function intertwinerDimension(j1: number, j2: number, j3: number, j4: number): number {
  // Get allowed intermediate spins for each pair
  const j12_values = allowedIntermediateSpins(j1, j2);
  const j34_values = allowedIntermediateSpins(j3, j4);
  
  // Count overlapping values that can couple to j=0
  let dimension = 0;
  for (const j12 of j12_values) {
    if (j34_values.some(j34 => Math.abs(j12 - j34) < 1e-10)) {
      dimension++;
    }
  }
  
  return dimension;
}
