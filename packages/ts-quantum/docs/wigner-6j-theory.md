# Wigner 6j Symbols - Theory and Implementation

*Extracted from Varshalovich, Moskalev, and Khersonskii - "Quantum Theory of Angular Momentum"*

## 1. Introduction & Definition

### 1.1 Physical Interpretation

The Wigner 6j symbols are related to the coefficients of transformations between different coupling schemes of three angular momenta. The angular momenta $j_1$, $j_2$, $j_3$ may be coupled to give a resultant angular momentum $j$ and its projection $m$ in three different ways:

I) $j_1 + j_2 = j_{12}$,    $j_{12} + j_3 = j$
II) $j_2 + j_3 = j_{23}$,   $j_1 + j_{23} = j$  
III) $j_1 + j_3 = j_{13}$,  $j_{13} + j_2 = j$

States belonging to each coupling scheme form a complete set of states. A transition from one coupling scheme to another is performed by some unitary transformation which relates the states with the same total angular momentum $j$ and projection $m$.

### 1.2 Mathematical Definition

One defines the Wigner 6j symbols $\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$ by the relation:

$$\langle j_1j_2(j_{12})j_3jm|j_1j_3(j_{13})j_2jm\rangle = \delta_{jj'}\delta_{mm'}(-1)^{j_1+j_2+j_3+j} \sqrt{(2j_{12} + 1)(2j_{13} + 1)} \left\{\begin{array}{ccc} j_1 & j_2 & j_{12} \\ j_3 & j & j_{13} \end{array}\right\}$$

According to this definition, the 6j symbols may be given in terms of the Clebsch-Gordan coefficients. Here the sum is over $m_1,m_2,m_3,m_{12},m_{23}$ while $m$ and $m'$ are fixed. This relation completely determines absolute values and phases of the 6j symbols. The 6j symbols turn out to be real just as the Clebsch-Gordan coefficients are.

### 1.3 Relationship to Racah Coefficients

Instead of the Wigner 6j symbols the Racah coefficients are often used, especially in spectroscopy theory. These coefficients differ from the 6j symbols only by a phase factor:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = (-1)^{a+b+d+e} W(abed;cf)$$

The Racah coefficients were introduced independently of the 6j symbols. The phase of the Racah coefficients coincides with the phase of the coefficients which describe the transformation between I and II coupling schemes.

### 1.4 R-Symbol Notation

The 6j symbols and the Racah coefficients may be written in the form of a 3×4 array $||R_{ia}||$ ($i = 1,2,3$; $\alpha = 1,2,3,4$) which is called the R-symbol:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = (-1)^{r} \prod_{i=1}^{3} \prod_{\alpha=1}^{4} \frac{(R_{i\alpha})!}{\prod_{i=1}^{3} \prod_{\alpha=1}^{4} (R_{i\alpha})!}$$

where the elements $R_{i\alpha}$ are:

$R_{11} = -c + d + e$, $R_{12} = b + d - f$, $R_{13} = a + c - f$, $R_{14} = a + b - c$

$R_{21} = -b + d + f$, $R_{22} = c + d - e$, $R_{23} = a - b + c$, $R_{24} = a - e + f$

$R_{31} = -a + e + f$, $R_{32} = -a + b + c$, $R_{33} = c - d + e$, $R_{34} = b - d + f$

All 12 elements $R_{i\alpha}$ are integer nonnegative numbers.

## 2. Mathematical Properties

### 2.1 Triangular Conditions and Validity

The quantum-mechanical rules of vector addition impose some restrictions on possible values of momenta which are arguments of the 6j symbol $\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$:

(a) All momenta are integer or half-integer nonnegative numbers (with one exception considered in Sec. 9.4).

(b) Each triad $\{j_1j_2j_{12}\}$, $\{j_{23}j_3j\}$, $\{j_1j_3j_{13}\}$ and $\{j_{23}j_1j\}$ should satisfy the triangular condition.

The 6j symbols $\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$ vanish if at least one of the triads $(abc)$, $(cde)$, $(aef)$ and $(bdf)$ does not obey the triangular conditions.

### 2.2 Reality and Orthogonality Properties

The 6j symbols turn out to be real just as the Clebsch-Gordan coefficients are. The unitarity of the recoupling transformations implies the orthogonality and normalization conditions of the 6j symbols.

### 2.3 Symmetry Relations

The symmetry properties of the 6j symbols may be formulated using the R symbols. The value of the R symbol is invariant under any permutation of its rows or columns. These symmetry relations involve $3! \times 4! = 144$ generally different Racah coefficients.

**Classical Symmetries**: The 6j symbol is invariant under any permutation of its columns or under interchange of the upper and lower arguments in each of any two columns:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \left\{\begin{array}{ccc} a & c & b \\ d & f & e \end{array}\right\} = \left\{\begin{array}{ccc} b & a & c \\ e & d & f \end{array}\right\} = \cdots$$

These relations involve $3! \times 4 = 24$ different 6j symbols.

**Regge Symmetries**: The relations below are functional ones, i.e. in general they cannot be obtained by interchanging the 6j symbol arguments:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \left\{\begin{array}{ccc} a & s_1-b & s_1-c \\ d & s_1-e & s_1-f \end{array}\right\} = \left\{\begin{array}{ccc} s_2-a & b & s_2-c \\ s_2-d & e & s_2-f \end{array}\right\}$$

where $s_1 = a + b + c$, $s_2 = a + d + e$, $s_3 = b + d + f$.

Combining the Regge symmetries and the classical symmetries, one gets all 144 symmetry relations.

### 2.4 Selection Rules

## 3. Computational Formulas

### 3.1 Racah's Original Formula

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \Delta(abc)\Delta(cde)\Delta(aef)\Delta(bdf) \sum_n \frac{(-1)^{n+s}}{[n - a - b - c]![n - c - d - e]![n - a - e - f]![n - b - d - f]![a + b + d + e - n]!} \times \frac{1}{[a + c - d + f - n]![b + c + e + f - n]!}$$

where the sums are over all integer nonnegative values of $n$ so that no factorial in denominators has a negative argument. The quantities $\Delta(abc)$ are defined by:

$$\Delta(abc) = \sqrt{\frac{(a+b-c)!(a-b+c)!(-a+b+c)!}{(a+b+c+1)!}}$$

This is the fundamental Racah formula for computing 6j symbols.

### 3.2 Alternative Expressions

By the replacement $n \to a + b + d + e - n$ one can rewrite the Racah formula in the form:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = (-1)^{a+b+d+e} \Delta(abc)\Delta(cde)\Delta(aef)\Delta(bdf) \sum_n \frac{(-1)^n (a + b + d + e + 1 - n)!}{n![a + b - c - n]![-c + d + e - n]![a + e - f - n]![b + d - f - n]!} \times \frac{1}{[-a + c - d + f + n]![-b + c - e + f + n]!}$$

**Bargmann Formula**: 

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \prod_{i=1}^{3} \prod_{\alpha=1}^{4} \frac{(R_{i\alpha})!}{\sum_{n} (-1)^n (n+1)! \prod_{i=1}^{3} \prod_{\alpha=1}^{4} \frac{1}{(x_i + y_\alpha - n)!}}$$

where $R_{i\alpha}$ are elements of the R symbol, $x_i, y_\alpha$ are summation indices, $n = \sum_{i=1}^{3} x_i + \sum_{\alpha=1}^{4} y_\alpha$.

### 3.3 Recursion Relations

**Relations in which arguments are changed by 1/2:**

$$[(a + b + c + 1)(-a + b + c)(c + d + e + 1)(c + d - e)]^{1/2} \left\{\begin{array}{ccc} a & b-\frac{1}{2} & c-\frac{1}{2} \\ d & e & f \end{array}\right\}$$

$$= -2c[(b + d + f + 1)(b + d - f)]^{1/2} \left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$$

$$+ [(a + b - c + 1)(a - b + c)(-c + d + e + 1)(c - d + e)]^{1/2} \left\{\begin{array}{ccc} a & b+\frac{1}{2} & c-\frac{1}{2} \\ d & e & f \end{array}\right\}$$

**Relations in which arguments are changed by 1:**

$$(2c + 1)\{2[a(a + 1)d(d + 1) + b(b + 1)e(e + 1) - c(c + 1)f(f + 1)] - [a(a + 1) + b(b + 1) - c(c + 1)][d(d + 1) + e(e + 1) - c(c + 1)]\} \left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$$

$$= -c[(a + b + c + 2)(-a + b + c + 1)(a - b + c + 1)(a + b - c) \times (d + e + c + 2)(-d + e + c + 1)(d - e + c + 1)(d + e - c)]^{1/2} \left\{\begin{array}{ccc} a & b & c+1 \\ d & e & f \end{array}\right\}$$

$$- (c + 1)[(a + b + c + 1)(-a + b + c)(a - b + c)(a + b - c + 1) \times (d + e + c + 1)(-d + e + c)(d - e + c)(d + e - c + 1)]^{1/2} \left\{\begin{array}{ccc} a & b & c-1 \\ d & e & f \end{array}\right\}$$

### 3.4 Special Cases

**One of Arguments is Equal to Zero:**

$$\left\{\begin{array}{ccc} 0 & b & c \\ d & e & f \end{array}\right\} = (-1)^{b+e+d} \frac{\delta_{bc}\delta_{ef}}{\sqrt{(2b + 1)(2e + 1)}}$$

$$\left\{\begin{array}{ccc} a & 0 & c \\ d & e & f \end{array}\right\} = (-1)^{a+d+e} \frac{\delta_{ac}\delta_{df}}{\sqrt{(2a + 1)(2d + 1)}}$$

$$\left\{\begin{array}{ccc} a & b & 0 \\ d & e & f \end{array}\right\} = (-1)^{a+b+e} \frac{\delta_{ab}\delta_{de}}{\sqrt{(2a + 1)(2d + 1)}}$$

**One of Arguments is Equal to the Sum of Two Others:**

If one of the 6j symbol arguments is equal to sum of two others from the same triad $(abc)$, $(cde)$, $(aef)$, $(bdf)$, one may use the classical symmetries to express it in the form:

$$\left\{\begin{array}{ccc} a & b & a+b \\ d & e & a+b \end{array}\right\} = (-1)^{a+b+d+e} \frac{(2a)!(2b)!(a + b + d + e + 1)!(a + b - d + e)!(a + b + d - e)!(-a + e + f)!(-b + d + f)!}{(2a + 2b + 1)!(-a - b + d + e)!(a + e - f)!(a - e + f)!(a + e + f + 1)!(b + d - f)!(b - d + f)!(b + d + f + 1)!}$$

## 4. Geometric Interpretation

### 4.1 Tetrahedron Association

The asymptotic behaviour of the 6j symbols $\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\}$ for large angular momenta is closely associated with geometric properties of the tetrahedron whose edges are $a + \frac{1}{2}$, $b + \frac{1}{2}$, etc.

The tetrahedron edges are defined as:
- $j_{12} = a + \frac{1}{2}$, $j_{13} = b + \frac{1}{2}$, $j_{14} = c + \frac{1}{2}$
- $j_{23} = d + \frac{1}{2}$, $j_{24} = e + \frac{1}{2}$, $j_{34} = f + \frac{1}{2}$
- $j_{ii} = 0$

### 4.2 Ponzano-Regge Semiclassical Approximation

The Ponzano-Regge Formula (semiclassical approximation to the 6j symbols): If $a, b, c, d, e, f \gg 1$, then

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} \approx \frac{1}{\sqrt{12\pi V}} \cos\left(\sum_{i<k} j_{ik} \Theta_{ik} + \frac{\pi}{4}\right)$$

where $V$ is the volume of the tetrahedron, $\Theta_{ik}$ is the angle between two external normals to the planes adjacent to the edge $j_{ik}$.

This formula is valid only if $V^2 > 0$ (classically allowed domain). If $V^2 < 0$ (classically forbidden domain, when an associated tetrahedron does not exist), the asymptotic expression becomes:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} \approx \frac{2}{\sqrt{12\pi|V|}} \cos\Phi \exp\left(-\sum_{i,k=1}^{4} j_{ik}|\text{Im}\Theta_{ik}|\right)$$

where $V^2 < 0$, and $\Phi = \sum_{i<k} (\pi - \frac{\pi}{2})\text{Re}\Theta_{ik}$.

In this case the 6j symbols are exponentially small even if the triangular condition is satisfied.

### 4.3 Volume Formulas and Classical Limits

The tetrahedron volume is equal to:

$$288 V^2 = \begin{vmatrix}
0 & j_{12}^2 & j_{13}^2 & j_{14}^2 & 1 \\
j_{12}^2 & 0 & j_{23}^2 & j_{24}^2 & 1 \\
j_{13}^2 & j_{23}^2 & 0 & j_{34}^2 & 1 \\
j_{14}^2 & j_{24}^2 & j_{34}^2 & 0 & 1 \\
1 & 1 & 1 & 1 & 0
\end{vmatrix}$$

The angles $\Theta_{ik}$ are given by:
$$5 S_i S_k \sin \Theta_{ik} = -F_{ik}$$

where $S_i$ is the area of the triangle opposite to the vertex $p_i$. One can evaluate $S_i$ using the standard formulas. For example:

$$16 S_1^2 = (j_{12} + j_{13} + j_{14})(j_{12} + j_{13} - j_{14})(j_{12} - j_{13} + j_{14})(-j_{12} + j_{13} + j_{14})$$

**Wigner Formula**: In particular, for large angular momenta, one has:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} \approx \frac{1}{24\pi V}$$

This formula is valid only on the average because the 6j symbols oscillate rapidly with momentum variations in the region of large angular momenta.

## 5. Implementation Considerations

### 5.1 Numerical Stability

The expressions for the 6j symbols given above are valid if all triangular conditions are satisfied. When implementing these formulas, care must be taken with:

1. **Factorial calculations**: For large arguments, factorials can overflow. Use logarithmic representation or Stirling's approximation when necessary.

2. **Alternating sums**: The Racah formula involves alternating sums which can lead to numerical instability due to cancellation of large terms.

3. **Square root calculations**: Ensure arguments of square roots are non-negative, which should be guaranteed by the triangular conditions.

### 5.2 Efficient Computation Strategies

1. **Use recursion relations**: The recursion relations can be more numerically stable than direct calculation for certain parameter ranges.

2. **Special cases first**: Always check for special cases (zero arguments, equal arguments, etc.) before applying general formulas.

3. **Symmetry relations**: Use the 144 symmetry relations to reduce computational effort by transforming arguments to a canonical form.

4. **Caching**: Since 6j symbols appear frequently in calculations, implement caching mechanisms.

### 5.3 Symmetry Exploitation

The 144 symmetry relations of the 6j symbols can be used to:

1. **Canonical form**: Transform any 6j symbol to a standard form with specific ordering of arguments
2. **Reduced computation**: Only compute a subset of all possible 6j symbols and use symmetries to obtain others
3. **Validation**: Use symmetry relations to check computational results
4. **Memory optimization**: Store only unique values and generate others via symmetry

### 5.4 Connection to 3j Symbols

The 6j symbols may be written as sums of products of the Clebsch-Gordan coefficients or 3jm symbols. The relations between the 6j symbols and the 3jm symbols are:

$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \sum_{\alpha,\beta,\gamma,\delta,\epsilon,\phi} (-1)^{s-\alpha-\beta-\gamma} \begin{pmatrix} a & b & c \\ \alpha & \beta & \gamma \end{pmatrix} \begin{pmatrix} c & d & e \\ \gamma & \delta & \epsilon \end{pmatrix} \begin{pmatrix} a & f & e \\ \alpha & \phi & -\epsilon \end{pmatrix} \begin{pmatrix} b & d & f \\ \beta & -\delta & -\phi \end{pmatrix}$$

In this equation the sum is over all possible values of $\alpha,\beta,\gamma,\delta,\epsilon,\phi$ with only three summation indices being independent.

## 6. Applications in Quantum Theory

### 6.1 Spin Network Vertices

The 6j symbols appear naturally in the evaluation of spin network vertices. In particular, they are essential for:

1. **3-valent vertices**: The fundamental building blocks of spin networks
2. **Vertex amplitude calculations**: Computing the quantum amplitude associated with a vertex
3. **Recoupling transformations**: Converting between different coupling schemes in complex spin networks

### 6.2 Angular Momentum Coupling

The primary application of 6j symbols is in angular momentum coupling theory:

1. **Recoupling coefficients**: Transform between different ways of coupling three angular momenta
2. **Matrix elements**: Calculate matrix elements of tensor operators between coupled angular momentum states
3. **Selection rules**: Determine which matrix elements are non-zero based on angular momentum conservation

### 6.3 Quantum Geometry Applications

In quantum geometry and loop quantum gravity:

1. **Tetrahedron quantum states**: The geometric interpretation connects 6j symbols to quantum tetrahedra
2. **Volume operators**: The Ponzano-Regge formula relates 6j symbols to classical geometric volumes
3. **Quantum polyhedra**: 6j symbols appear in the quantum description of polyhedral shapes

## 7. Key Formulas Reference

### 7.1 Essential Implementation Formulas

**Racah Formula (most fundamental):**
$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = \Delta(abc)\Delta(cde)\Delta(aef)\Delta(bdf) \sum_n \frac{(-1)^{n+s}}{[n - a - b - c]![n - c - d - e]![n - a - e - f]![n - b - d - f]![a + b + d + e - n]!} \times \frac{1}{[a + c - d + f - n]![b + c + e + f - n]!}$$

**Delta function:**
$$\Delta(abc) = \sqrt{\frac{(a+b-c)!(a-b+c)!(-a+b+c)!}{(a+b+c+1)!}}$$

**Triangular condition check:**
The 6j symbol vanishes unless all four triads $(abc)$, $(cde)$, $(aef)$, $(bdf)$ satisfy:
$$|j_1 - j_2| \leq j_3 \leq j_1 + j_2$$

**Phase relation to Racah coefficients:**
$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} = (-1)^{a+b+d+e} W(abed;cf)$$

### 7.2 Special Values

**Zero argument cases:**
$$\left\{\begin{array}{ccc} 0 & b & c \\ d & e & f \end{array}\right\} = (-1)^{b+e+d} \frac{\delta_{bc}\delta_{ef}}{\sqrt{(2b + 1)(2e + 1)}}$$

**Sum cases:**
$$\left\{\begin{array}{ccc} a & b & a+b \\ d & e & a+b \end{array}\right\} = (-1)^{a+b+d+e} \frac{(2a)!(2b)!(a + b + d + e + 1)!(a + b - d + e)!(a + b + d - e)!}{(2a + 2b + 1)!(-a - b + d + e)!(a + e - f)!(a - e + f)!(a + e + f + 1)!} \times \frac{(-a + e + f)!(-b + d + f)!}{(b + d - f)!(b - d + f)!(b + d + f + 1)!}$$

**Equal pairs:**
When $a = b$ and $d = e$:
$$\left\{\begin{array}{ccc} a & a & c \\ d & d & f \end{array}\right\} = (-1)^{2a+c+f} \frac{\sqrt{(2a - c)!(2d - c)!}}{[(2a + c + 1)!(2d + c + 1)!]^{1/2}} V_c(a,f,d)$$

where $V_c(a,f,d) = V_c(d,f,a)$ and satisfies specific recursion relations.

### 7.3 Asymptotic Expressions

**Ponzano-Regge Formula (large arguments):**
$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} \approx \frac{1}{\sqrt{12\pi V}} \cos\left(\sum_{i<k} j_{ik} \Theta_{ik} + \frac{\pi}{4}\right)$$

**Edmonds' Formula (specific large argument case):**
If $f, m, n$ are arbitrary and $a, b, c \gg f, m, n$:
$$\left\{\begin{array}{ccc} a & b & c \\ f & m & n \end{array}\right\} \approx \frac{(-1)^{a+b+c+f+m+n}}{\sqrt{(2a + 1)(2b + 1)}} d^f_{mn}(\theta)$$

where $d^f_{mn}(\theta)$ is the rotation matrix, and $\theta$ is the angle between tetrahedron edges.

**Racah Formula (one large argument):**
If $a, b, c \gg f$ and $f$ is an arbitrary integer:
$$\left\{\begin{array}{ccc} a & b & c \\ b & a & f \end{array}\right\} \approx \frac{(-1)^{a+b+c+f}}{\sqrt{(2a + 1)(2b + 1)}} P_f(\cos\theta)$$

where $P_f$ is the Legendre polynomial and $\cos\theta = \frac{a(a + 1) + b(b + 1) - c(c + 1)}{2\sqrt{a(a + 1)b(b + 1)}}$.

**Wigner Formula (all large arguments):**
$$\left\{\begin{array}{ccc} a & b & c \\ d & e & f \end{array}\right\} \approx \frac{1}{24\pi V}$$

This formula is valid only on the average due to rapid oscillations.

## References

- Varshalovich, D.A., Moskalev, A.N., and Khersonskii, V.K. "Quantum Theory of Angular Momentum", Chapter 9
