Q: I want to understand how diff eqns with Dirichlet BCs be solved. If the value of the solution is fixed at the boundary, then how should the solution be evolved in the interior? Give me a brief, pedagogical explanation. Use Latex for math.

A: For a PDE with Dirichlet BCs, the boundary values are fixed while the interior evolves. Consider the 1D heat equation:

$$
\frac{\partial u}{\partial t} = k \frac{\partial^2 u}{\partial x^2}

$$

With Dirichlet BCs:

$$
u(0,t) = a, \quad u(L,t) = b

$$

**Numerical Approach:**

1. Discretize space (grid points $x_i$) and time ($t_n$)
2. At each time step:
   - Keep boundary points fixed: $u_0^{n+1} = a$, $u_N^{n+1} = b$
   - Update interior points using the finite difference scheme (e.g. for Forward Euler):
     $$
     u_i^{n+1} = u_i^n + \frac{k\Delta t}{(\Delta x)^2}(u_{i+1}^n - 2u_i^n + u_{i-1}^n)

     $$
   - The stencil at $i=1$ and $i=N-1$ uses the fixed boundary values

The key is that boundary values never change - they're constraints that affect how the interior evolves through the finite difference stencil.

Q: So does one evolve starting from the boundary and then moving inwards?

A: No, the evolution doesn't proceed from boundary inward. The key points are:

1. **Simultaneous Update**: All interior points are updated simultaneously using the finite difference stencil, while boundary points remain fixed.
2. **Stencil Dependence**: For point $u_i$, the update depends on neighbors $u_{i-1}$ and $u_{i+1}$:

   - Near boundaries ($i=1$ and $i=N-1$), one neighbor is a fixed boundary value
   - Interior points use values from the previous time step
3. **Matrix Form**: The system can be written as:

   $$
   \mathbf{u}^{n+1} = \mathbf{u}^n + \mathbf{A}\mathbf{u}^n

   $$

   where $\mathbf{A}$ encodes the stencil and boundary conditions

The boundary values act as constraints but don't dictate an "inward propagation" direction - all interior points evolve in parallel at each time step.

Q: What is a "stencil"?

A: A stencil is the pattern of grid points used in a finite difference scheme to approximate derivatives. For the heat equation example:

1. **Central Difference Stencil** (for 2nd derivative):

   $$
   [u_{i-1}^n, u_i^n, u_{i+1}^n]
   $$

   This represents the three-point template used to compute:

   $$
   \frac{\partial^2 u}{\partial x^2} \approx \frac{u_{i+1}^n - 2u_i^n + u_{i-1}^n}{(\Delta x)^2}
   $$

2. **Key Properties**:

   - Width: Number of points (3 for this 2nd-order stencil)
   - Symmetry: Central differences are typically symmetric
   - Boundary Adaptation: Stencils adjust near boundaries (e.g., using one-sided differences)
3. **Visualization**:

   ```
   O---O---O   ← Stencil "footprint"
   i-1  i  i+1
   ```

The stencil determines both accuracy and stability properties of the numerical scheme.

Q: What happens if one starts with an initial state which does not obey the given Dirichlet bcs?

A: When the initial state violates the Dirichlet boundary conditions:

1. **Immediate Discontinuity**: There will be a jump discontinuity at the boundaries at t=0, since:
   - Initial condition: $u(x,0) = f(x)$ with $f(0) \neq a$ and/or $f(L) \neq b$
   - Boundary condition requires: $u(0,t) = a$, $u(L,t) = b$ for all $t > 0$

2. **Numerical Behavior**:
   - First time step will enforce BCs: $u_0^1 = a$, $u_N^1 = b$ regardless of initial values
   - This creates sharp gradients near boundaries
   - For diffusion equations, these discontinuities smooth out rapidly over time

3. **Mathematical Implications**:
   - The solution is not classical (not C1 continuous)
   - Weak solutions may exist but require careful interpretation
   - Energy norms may show initial spikes

4. **Practical Recommendation**:
   - Always initialize with BC-compliant conditions when possible
   - If unavoidable, monitor solution near boundaries for stability
   - The system will typically converge to satisfy BCs within a few time steps for parabolic equations

## Implementation Notes (2025-08-27 01:35:44 IST)

**Current Implementation Status:**
- DirichletBC class refactored with `sampleWithBC` pattern for shader integration
- Boundary detection using texel-based coordinate checking
- Post-processing pass for direct boundary value enforcement via scissor test
- Test infrastructure added for validation of BC implementations
- Integration with ForwardEuler, CrankNicolson, and LaxWendroff solvers completed

**Key Implementation Details:**
- Shader function `sampleWithBC` replaces direct texture sampling
- Boundary detection via `isBoundaryPixel` using texel size calculations
- Post-processing uses scissor test for direct pixel clearing at boundaries
- No texture wrapping mode dependencies - handled purely in shader logic
