# Clebsch-Gordan Coefficient Algorithm

*Last Updated: May 17, 2025*

## Introduction

This document describes the algorithm for calculating Clebsch-Gordan coefficients, which are fundamental to quantum angular momentum coupling. They represent the transformation coefficients between uncoupled and coupled basis states in quantum mechanics.

## Notation and Operators

### Coefficient Notation

We use two equivalent notations for Clebsch-Gordan coefficients:

1. **Bracket Notation**:
   $$\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix}$$

2. **C-Notation**:
   $$C^{j, m}_{j_1, m_1;j_2, m_2}$$

These notations are completely equivalent:
$$\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix} = C^{j, m}_{j_1, m_1;j_2, m_2}$$

### Physical Meaning

These coefficients represent the expansion of coupled angular momentum states in terms of uncoupled states:

$$|(j_1,j_2)j,m\rangle = \sum_{m_1,m_2} C^{j, m}_{j_1, m_1;j_2, m_2} |j_1,m_1\rangle |j_2,m_2\rangle$$

where:
- $j_1, j_2$ are the angular momentum quantum numbers of two systems
- $m_1, m_2$ are their respective z-components
- $j$ is the total angular momentum quantum number of the coupled system
- $m$ is the z-component of the total angular momentum

### Abbreviated Notation

For brevity, we use the following notation throughout this document:
- $|m_1;m_2\rangle := |j_1,m_1;j_2,m_2\rangle$ (uncoupled basis)
- $|j,m\rangle := |(j_1,j_2)j,m\rangle$ (coupled basis)
- $|j_1;j_2\rangle \equiv |j_1,j_1;j_2,j_2\rangle$ (maximal magnetic quantum numbers: $m_1 = j_1$ and $m_2 = j_2$)

### Angular Momentum Operators

The total angular momentum operators are constructed from the individual angular momentum operators:

1. **z-component**: 
   $$J_z = J^1_z + J^2_z$$
   where $J^1_z$ acts on the first particle and $J^2_z$ acts on the second particle.

2. **Raising and lowering operators**:
   $$J_\pm = J^1_\pm + J^2_\pm$$
   where $J^i_\pm$ ($i \in \{1,2\}$) are the ladder operators for each particle.

These operators act on states according to:

$$J^i_\pm|j_i,m_i\rangle = \sqrt{j_i(j_i+1) - m_i(m_i\pm1)}|j_i,m_i\pm1\rangle$$

To derive this, recall that:
$$J^i_\pm = J^i_x \pm iJ^i_y$$

And the commutation relations:
$$[J^i_z, J^i_\pm] = \pm J^i_\pm$$

The eigenvalue equation for $J^i_z$ is:
$$J^i_z|j_i,m_i\rangle = m_i|j_i,m_i\rangle$$

For the combined system, the z-component eigenvalue is additive:
$$J_z|j_1,m_1;j_2,m_2\rangle = (m_1 + m_2)|j_1,m_1;j_2,m_2\rangle$$

This follows directly from:
$$(J^1_z + J^2_z)|j_1,m_1;j_2,m_2\rangle = J^1_z|j_1,m_1\rangle \otimes |j_2,m_2\rangle + |j_1,m_1\rangle \otimes J^2_z|j_2,m_2\rangle$$
$$= m_1|j_1,m_1\rangle \otimes |j_2,m_2\rangle + |j_1,m_1\rangle \otimes m_2|j_2,m_2\rangle$$
$$= (m_1 + m_2)|j_1,m_1;j_2,m_2\rangle$$

## Selection Rules

A Clebsch-Gordan coefficient $C^{j, m}_{j_1, m_1;j_2, m_2}$ is zero if any of these conditions are met:

1. $m \neq m_1 + m_2$ (magnetic quantum number conservation)
   
   This follows from the fact that $J_z = J^1_z + J^2_z$, so the eigenvalue of $J_z$ must be the sum of the eigenvalues of $J^1_z$ and $J^2_z$.

2. $j > j_1 + j_2$ (triangle inequality upper bound)
   
   This arises from the quantum mechanical rules for adding angular momenta, which limit the maximum total angular momentum.

3. $j < |j_1 - j_2|$ (triangle inequality lower bound)
   
   Similarly, this sets the minimum possible total angular momentum when coupling two systems.

These selection rules can be visualized as requiring the three angular momenta $(j_1, j_2, j)$ to form a triangle in vector space.

## Algorithm

The algorithm proceeds recursively, starting from maximal $j$ values and using lowering operators to generate all coefficients.

### 1. Maximal J Case ($j = j_1 + j_2$)

#### a) Initial State
For the state with maximal $j$ and maximal $m = j$:

$$|j,j\rangle = |j_1;j_2\rangle = |j_1,j_1\rangle|j_2,j_2\rangle$$

This means that the highest weight state in the coupled basis is exactly equal to the product of the highest weight states in the uncoupled basis. Therefore:

$$C^{j_1+j_2,j_1+j_2}_{j_1,j_1;j_2,j_2} = \begin{pmatrix} j_1 & j_2 & j_1+j_2 \\ j_1 & j_2 & j_1+j_2 \end{pmatrix} = 1$$

This choice of +1 (rather than -1) establishes our phase convention, known as the Condon-Shortley convention.

#### b) Apply Lowering Operator
We use the total lowering operator $J_- = J^1_- + J^2_-$ which acts on the highest weight coupled state as:

$$J_-|j,j\rangle = \sqrt{j(j+1) - j(j-1)}|j,j-1\rangle = \sqrt{2j}|j,j-1\rangle$$

Let's verify this step:
- For a state $|j,m\rangle$, the action of $J_-$ is:
  $$J_-|j,m\rangle = \sqrt{j(j+1) - m(m-1)}|j,m-1\rangle$$
- With $m = j$, this gives:
  $$J_-|j,j\rangle = \sqrt{j(j+1) - j(j-1)}|j,j-1\rangle$$
- Simplifying:
  $$\sqrt{j(j+1) - j(j-1)} = \sqrt{j(j+1) - j^2 + j} = \sqrt{2j}$$

Now, we apply the operator to the uncoupled basis:
$$J_-|j_1;j_2\rangle = (J^1_- + J^2_-)|j_1,j_1\rangle|j_2,j_2\rangle$$

Using the action of the individual lowering operators:
$$J^1_-|j_1,j_1\rangle = \sqrt{2j_1}|j_1,j_1-1\rangle$$
$$J^2_-|j_2,j_2\rangle = \sqrt{2j_2}|j_2,j_2-1\rangle$$

Therefore:
$$J_-|j_1;j_2\rangle = J^1_-|j_1,j_1\rangle \otimes |j_2,j_2\rangle + |j_1,j_1\rangle \otimes J^2_-|j_2,j_2\rangle$$
$$= \sqrt{2j_1}|j_1,j_1-1\rangle|j_2,j_2\rangle + \sqrt{2j_2}|j_1,j_1\rangle|j_2,j_2-1\rangle$$
$$= \sqrt{2j_1}|j_1-1;j_2\rangle + \sqrt{2j_2}|j_1;j_2-1\rangle$$

Combining our results and equating the two expressions:
$$\sqrt{2j}|j,j-1\rangle = \sqrt{2j_1}|j_1-1;j_2\rangle + \sqrt{2j_2}|j_1;j_2-1\rangle$$

where $j = j_1 + j_2$ in this maximal case.

#### c) Generate Coefficients
We can now extract the Clebsch-Gordan coefficients by projecting this equation onto the uncoupled basis states.

For the projection onto $|j_1-1;j_2\rangle$:
$$\langle j_1-1;j_2|\sqrt{2j}|j,j-1\rangle = \langle j_1-1;j_2|\sqrt{2j_1}|j_1-1;j_2\rangle + \langle j_1-1;j_2|\sqrt{2j_2}|j_1;j_2-1\rangle$$

Since the uncoupled basis states are orthonormal, we have:
$$\langle j_1-1;j_2|\sqrt{2j}|j,j-1\rangle = \sqrt{2j_1}$$

Therefore:
$$\sqrt{2j} \cdot C^{j,j-1}_{j_1,j_1 - 1;j_2,j_2} = \sqrt{2j_1}$$

Solving for the coefficient:
$$C^{j,j-1}_{j_1,j_1 - 1;j_2,j_2} = \sqrt{\frac{j_1}{j}} = \sqrt{\frac{j_1}{j_1+j_2}}$$

Similarly, projecting onto $|j_1;j_2-1\rangle$:
$$\langle j_1;j_2-1|\sqrt{2j}|j,j-1\rangle = \langle j_1;j_2-1|\sqrt{2j_1}|j_1-1;j_2\rangle + \langle j_1;j_2-1|\sqrt{2j_2}|j_1;j_2-1\rangle$$

This yields:
$$\sqrt{2j} \cdot C^{j,j-1}_{j_1,j_1;j_2,j_2-1} = \sqrt{2j_2}$$

Solving:
$$C^{j,j-1}_{j_1,j_1;j_2,j_2-1} = \sqrt{\frac{j_2}{j}} = \sqrt{\frac{j_2}{j_1+j_2}}$$

In bracket notation:
$$\begin{pmatrix} j_1 & j_2 & j_1+j_2 \\ j_1-1 & j_2 & j_1+j_2-1 \end{pmatrix} = \sqrt{\frac{j_1}{j_1+j_2}}$$

$$\begin{pmatrix} j_1 & j_2 & j_1+j_2 \\ j_1 & j_2-1 & j_1+j_2-1 \end{pmatrix} = \sqrt{\frac{j_2}{j_1+j_2}}$$

#### d) Generate All Coefficients

We continue this process by repeatedly applying the $J_-$ operator. Each application lowers the $m$ value by 1.

For $|j,j-2\rangle$, we can apply $J_-$ to $|j,j-1\rangle$:
$$J_-|j,j-1\rangle = \sqrt{j(j+1) - (j-1)(j-2)}|j,j-2\rangle = \sqrt{2j-1}|j,j-2\rangle$$

We again express this in terms of the action on the uncoupled basis states, which gives us equations for the next set of coefficients.

By continuing this process, applying $J_-$ operator a total of $2j = 2(j_1+j_2)$ times (to cover all possible $m$ values from $j$ down to $-j$), we can generate all coefficients for this $j$ value.

### 2. Next J Value ($j = j_1 + j_2 - 1$)

For the next highest $j$ value, the approach is slightly different because we need to first determine the form of the state $|j,j\rangle$ where $j = j_1 + j_2 - 1$.

#### a) State Expression

We begin by expressing the state $|j,j\rangle$ where $j = j_1 + j_2 - 1$ and $m = j$ as a linear combination of uncoupled basis states. Since $m = j = j_1 + j_2 - 1$, we need to combine states where $m_1 + m_2 = j_1 + j_2 - 1$.

There are two such states:
1. $|j_1-1;j_2\rangle = |j_1,j_1-1\rangle|j_2,j_2\rangle$ with $m_1 = j_1-1$ and $m_2 = j_2$
2. $|j_1;j_2-1\rangle = |j_1,j_1\rangle|j_2,j_2-1\rangle$ with $m_1 = j_1$ and $m_2 = j_2-1$

Therefore:
$$|j,j\rangle = \alpha|j_1;j_2-1\rangle + \beta|j_1-1;j_2\rangle$$

where $\alpha$ and $\beta$ are real coefficients that we need to determine (Clebsch-Gordan coefficients are real by definition in the standard convention).

#### b) Determine Coefficients

Three conditions determine $\alpha$ and $\beta$:

1. **Normalization**:
   Since $|j,j\rangle$ is normalized, and the uncoupled basis states are orthonormal:
   $$\langle j,j|j,j\rangle = |\alpha|^2 + |\beta|^2 = 1$$

2. **Condon-Shortley phase convention**:
   We choose $\alpha \geq 0$ to fix the phase.

3. **Orthogonality to the maximum $j$ state**:
   The state $|j,j\rangle$ with $j = j_1 + j_2 - 1$ must be orthogonal to the maximum $j$ state $|j',j'\rangle$ with $j' = j_1 + j_2$.
   
   We can use the raising operator $J_+$ to express this condition. Since $J_+|j,j\rangle = 0$ (because raising the highest weight state gives zero), we get:
   
   $$0 = J_+|j,j\rangle = (J^1_+ + J^2_+)(\alpha|j_1;j_2-1\rangle + \beta|j_1-1;j_2\rangle)$$
   
   Let's expand this:
   
   $$J^1_+|j_1,j_1\rangle = 0$$ (raising the highest weight state gives zero)
   
   $$J^2_+|j_2,j_2\rangle = 0$$ (raising the highest weight state gives zero)
   
   $$J^1_+|j_1,j_1-1\rangle = \sqrt{2j_1}|j_1,j_1\rangle$$
   
   $$J^2_+|j_2,j_2-1\rangle = \sqrt{2j_2}|j_2,j_2\rangle$$
   
   Therefore:
   
   $$0 = \alpha J^2_+|j_1,j_1\rangle|j_2,j_2-1\rangle + \beta J^1_+|j_1,j_1-1\rangle|j_2,j_2\rangle$$
   
   $$= \alpha\sqrt{2j_2}|j_1,j_1\rangle|j_2,j_2\rangle + \beta\sqrt{2j_1}|j_1,j_1\rangle|j_2,j_2\rangle$$
   
   $$= (\alpha\sqrt{2j_2} + \beta\sqrt{2j_1})|j_1;j_2\rangle$$
   
   For this to equal zero, we need:
   
   $$\alpha\sqrt{j_2} + \beta\sqrt{j_1} = 0$$
   
   Solving this equation along with the normalization condition and phase convention:
   
   $$\beta = -\alpha\frac{\sqrt{j_2}}{\sqrt{j_1}}$$
   
   $$\alpha^2 + \alpha^2\frac{j_2}{j_1} = 1$$
   
   $$\alpha^2(1 + \frac{j_2}{j_1}) = \alpha^2\frac{j_1 + j_2}{j_1} = 1$$
   
   $$\alpha^2 = \frac{j_1}{j_1 + j_2}$$
   
   $$\alpha = \sqrt{\frac{j_1}{j_1 + j_2}}$$ (taking the positive root due to our phase convention)
   
   $$\beta = -\sqrt{\frac{j_2}{j_1 + j_2}}$$

Therefore, we have:

$$C^{j_1+j_2-1,j_1+j_2-1}_{j_1,j_1;j_2,j_2-1} = \alpha = \sqrt{\frac{j_1}{j_1+j_2}}$$

$$C^{j_1+j_2-1,j_1+j_2-1}_{j_1,j_1-1;j_2,j_2} = \beta = -\sqrt{\frac{j_2}{j_1+j_2}}$$

#### c) Generate Remaining Coefficients

Once we have the coefficients for $|j,j\rangle$ with $j = j_1 + j_2 - 1$, we can repeatedly apply the $J_-$ operator to generate all coefficients for this $j$ value, following the same procedure as for the maximal $j$ case.

We apply $J_-$ operator a total of $2j = 2(j_1+j_2-1)$ times to cover all possible $m$ values from $j$ down to $-j$.

### 3. Continue Process

We repeat this process for each allowed $j$ value:
- $j = j_1 + j_2 - 2$
- $j = j_1 + j_2 - 3$
- ...and so on, until $j = |j_1 - j_2|$

For each $j$ value, we first determine the coefficients for the highest weight state $|j,j\rangle$, ensuring orthogonality to all states with higher $j$ values. Then we use the lowering operator $J_-$ to generate all coefficients for that $j$ value.

## Properties

### 1. Selection Rules
$$C^{j, m}_{j_1, m_1;j_2, m_2} = \begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix} = 0$$
if any of:
- $m \neq m_1 + m_2$
- $j > j_1 + j_2$
- $j < |j_1 - j_2|$

### 2. Reality
All Clebsch-Gordan coefficients are real numbers when using the standard Condon-Shortley phase convention.

### 3. Bounds
The absolute value is always less than or equal to 1:

$$\left|C^{j, m}_{j_1, m_1;j_2, m_2}\right| = \left|\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix}\right| \leq 1$$

This follows from the fact that they are expansion coefficients of normalized states in an orthonormal basis.

### 4. Recursion Relation

The recursion relation for Clebsch-Gordan coefficients can be derived from the action of the angular momentum operators:

$$\sqrt{(j \pm m)(j \mp m + 1)} \, C^{j,m\mp1}_{j_1,m_1;j_2,m_2} = \sqrt{(j_1 \mp m_1)(j_1 \pm m_1 + 1)} \, C^{j,m}_{j_1,m_1\pm1;j_2,m_2} + \sqrt{(j_2 \mp m_2)(j_2 \pm m_2 + 1)} \, C^{j,m}_{j_1,m_1;j_2,m_2\pm1}$$

In bracket notation:

$$ \sqrt{(j \pm m)(j \mp m + 1)} \begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \mp 1 \end{pmatrix} = 
\sqrt{(j_1 \mp m_1)(j_1 \pm m_1 + 1)} \begin{pmatrix} j_1 & j_2 & j \\ m_1 \pm 1 & m_2 & m \end{pmatrix} + 
\sqrt{(j_2 \mp m_2)(j_2 \pm m_2 + 1)} \begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 \pm 1 & m \end{pmatrix} $$

This relation can be derived by applying $J_\pm$ to both sides of the expansion:

$$|(j_1,j_2)j,m\rangle = \sum_{m_1,m_2} C^{j, m}_{j_1, m_1;j_2, m_2} |j_1,m_1\rangle |j_2,m_2\rangle$$

### 5. Symmetry Properties

Clebsch-Gordan coefficients have several important symmetry properties:

$$C^{j, m}_{j_1, m_1;j_2, m_2} = C^{j,-m}_{j_1,-m_1;j_2,-m_2}$$

Or in bracket notation:

$$\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix} = (-1)^{j_1+j_2-j}\begin{pmatrix} j_1 & j_2 & j \\ -m_1 & -m_2 & -m \end{pmatrix}$$

When exchanging the two angular momenta:

$$C^{j,m}_{j_1,m_1;j_2,m_2} = (-1)^{j_1+j_2-j} C^{j,m}_{j_2,m_2;j_1,m_1}$$

Or in bracket notation:

$$\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix} = (-1)^{j_1+j_2-j}\begin{pmatrix} j_2 & j_1 & j \\ m_2 & m_1 & m \end{pmatrix}$$

Additional symmetry relation:

$$\begin{pmatrix} j_1 & j_2 & j \\ m_1 & m_2 & m \end{pmatrix} = \begin{pmatrix} j_2 & j_1 & j \\ -m_2 & -m_1 & -m \end{pmatrix}$$

These symmetry properties can be used to reduce the number of coefficients that need to be calculated and to check the correctness of calculations.

In particular, the symmetry under exchange of angular momenta implies:

$$|(j_1,j_2)j,m\rangle = (-1)^{j_1+j_2-j}|(j_2,j_1)j,m\rangle$$

## Implementation Notes

### Numerical Stability

1. When implementing the recursive algorithm:
   - Use high-precision arithmetic for intermediate calculations
   - Maintain error bounds
   - Check against symmetry properties for validation
   - Consider caching frequently used values

2. Special attention needed for:
   - Square root calculations of differences
   - Accumulation of errors in recursive steps
   - Normalization conditions

### Common Cases

Special handling for frequently encountered cases:

1. Two spin-1/2 particles:
   - Singlet state ($j=0$):
     $$|0,0\rangle = \frac{1}{\sqrt{2}}(|\frac{1}{2},-\frac{1}{2}\rangle|\frac{1}{2},\frac{1}{2}\rangle - |\frac{1}{2},\frac{1}{2}\rangle|\frac{1}{2},-\frac{1}{2}\rangle)$$
   
   - Triplet states ($j=1$):
     $$|1,1\rangle = |\frac{1}{2},\frac{1}{2}\rangle|\frac{1}{2},\frac{1}{2}\rangle$$
     $$|1,0\rangle = \frac{1}{\sqrt{2}}(|\frac{1}{2},-\frac{1}{2}\rangle|\frac{1}{2},\frac{1}{2}\rangle + |\frac{1}{2},\frac{1}{2}\rangle|\frac{1}{2},-\frac{1}{2}\rangle)$$
     $$|1,-1\rangle = |\frac{1}{2},-\frac{1}{2}\rangle|\frac{1}{2},-\frac{1}{2}\rangle$$

2. Integer spin combinations:
   - Two spin-1 particles
   - Spin-1 with spin-1/2

### Validation

Test implementation against:
1. Known analytical values
2. Symmetry properties
3. Recursion relations
4. Orthogonality conditions
5. Special cases (e.g., $j_1=j_2=\frac{1}{2}$)

## References

1. Condon and Shortley, "The Theory of Atomic Spectra"
2. Edmonds, "Angular Momentum in Quantum Mechanics"
3. Varshalovich et al., "Quantum Theory of Angular Momentum"