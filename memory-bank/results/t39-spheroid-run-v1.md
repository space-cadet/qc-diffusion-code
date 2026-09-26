# T39 spheroid geometry-space experiment — run v1

**Outcome:** the frozen stochastic-versus-reference criterion passed at 32,000 walkers for both initial profiles. This is a numerical result for a chosen reflecting persistent process on the spheroid parameter $q$. It is not a gravitational or Wheeler–DeWitt result.

## Run and provenance

The settings were frozen in [the pre-run specification](../implementation-details/spheroid-run-spec-v1.md) before production results were examined. It sets $R=1$, $q\in[-1.5,1.5]$, $v=0.6$, $\lambda=0.8$, $0\leq t\leq2$, 600 reference cells, 120 comparison bins, and output interval $0.1$. Initial data are a centered Gaussian with zero current and a bimodal Gaussian with initial current fraction $\eta=0.35$. Both use reflecting endpoints and density per unit $q$.

The JSON run file contains all time-sampled mean ensemble densities, currents, and selectable geometric metrics; final per-seed densities and currents at each population; the selected particle's sampled path and events; and transformed $r=c/a$ densities. It also includes separate directional-reference and diffusive-control comparisons through $t=50$, the maximum live-page horizon. The frozen numerical acceptance study remains at $t=2$; the extended comparisons support the UI and do not extend that study's acceptance claim. The CSV contains the population-refinement summary. The model uses the same Mulberry32 generator as the existing Bianchi validation script; T38's generic runner is still only a plan, so it supplied no callable infrastructure.

- Data: [`t39-run-v1.json`](../../frontend/public/data/t39-run-v1.json) and [`t39-run-v1-summary.csv`](../../frontend/public/data/t39-run-v1-summary.csv)
- Reproduction: `node scripts/spheroid/run-experiment.mjs`
- Specification SHA-256: `65b7c4ca53f1b1b06a3df31fe6e7e25ffdeabfe2f61123d555844c95231f0dd3`
- Source revision: `e90aa058f17a219a555d41b9c5ff1fb025f05ebd`; the worktree was clean when the run began.
- Experiment-source SHA-256: `2f1f6ce81c784266073bd771c4c459c83881662b743c55468d789262ee1783a1`; tracked-diff SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` (empty diff).
- Node: v26.8.1; result generation took about 11.8 seconds.

## Numerical results

Each population level uses eight seeds (39001–39008). The reported interval is the two-sided 95% Student-$t$ interval across seed-level errors. Relative $L^1$ is calculated from terminal bin densities. Current error is integrated absolute current difference divided by $v$.

| Initial profile | Walkers | Relative $L^1$ mean ± 95% CI | Current error / $v$ |
|---|---:|---:|---:|
| Centered Gaussian, zero current | 8,000 | 0.0958 ± 0.0055 | 0.0985 |
| Centered Gaussian, zero current | 16,000 | 0.0703 ± 0.0046 | 0.0695 |
| Centered Gaussian, zero current | 32,000 | 0.0504 ± 0.0029 | 0.0483 |
| Bimodal, initial current fraction 0.35 | 8,000 | 0.0963 ± 0.0084 | 0.0953 |
| Bimodal, initial current fraction 0.35 | 16,000 | 0.0705 ± 0.0041 | 0.0722 |
| Bimodal, initial current fraction 0.35 | 32,000 | 0.0491 ± 0.0032 | 0.0472 |

The predeclared pass rule was mean relative $L^1\leq0.10$ for both profiles at the final population. At 32,000, even the upper endpoints of both intervals are below 0.054. The 8,000-walker bimodal interval crosses 0.10, while its predeclared mean criterion passes; population refinement lowers the mean error at each step.

The finite-volume reference used exact local Poisson-flip updates with Strang splitting and conservative upwind transport. For both profiles, maximum reference mass drift was $1.78\times10^{-15}$. With 600 spatial cells fixed, the medium-to-fine time-step relative $L^1$ differences were 0.00123 and 0.00137; the frozen limit was 0.005. The reference's maximum steps were 0.002917, 0.001458, and 0.000729. This establishes time-step stability for this grid, not spatial-grid convergence.

At the final population, mean absolute differences in $q$ and $q^2$ were 0.00432 and 0.00381 for the centered profile, and 0.00417 and 0.00251 for the bimodal profile. The mean absolute difference in $r=c/a$ was $0.1193\pm0.0655$ and $0.1139\pm0.0854$; mean surface-area differences were $0.1691\pm0.0788$ and $0.0615\pm0.0318$ (95% intervals across seeds). These summaries are descriptive; no separate moment pass threshold was frozen.

The analytic checks cover $a^2c=R^3$, fixed enclosed volume, the sphere metric, area and curvature, and pole/equator curvature at $q=-0.7,0,0.8$. Total area uses the closed-form oblate/prolate ellipsoid formulas with the sphere limit at $q=0$. The tests also check nonnegative directional densities, $|J|\leq vu$, finite-speed support, reflecting-boundary reversals, and exact seeded replay. The transformed-density mass discrepancy for the persistent ensemble was at most $2.22\times10^{-16}$; it was at most $1.11\times10^{-16}$ for the diffusive control. Both transformed paths use $r=e^{-3q}$, rather than a new equal-step process in $r$.

## Interpretation and limits

For the persistent model, the two direction populations obey

$$
\partial_t p_+ + v\partial_q p_+ = -\lambda p_+ + \lambda p_-,\qquad
\partial_t p_- - v\partial_q p_- = \lambda p_+ - \lambda p_-.
$$

With $u=p_++p_-$ and $J=v(p_+-p_-)$, conservation and current evolution give $\partial_tu+\partial_qJ=0$ and $\partial_tJ+2\lambda J=-v^2\partial_qu$, hence $\partial_t^2u+2\lambda\partial_tu=v^2\partial_q^2u$. This telegraph description applies to this constant-speed Poisson-flip law in the declared $q$ measure, with $u\geq0$ and $|J|\leq vu$. The separate diffusive control instead follows Brownian motion; it is not evidence for the telegraph limit at these finite parameters.

The stochastic-to-reference comparison supports the implementation of this specified one-dimensional process at the tested settings. It does not select the shape-space metric $M(q)$, derive the speed or flip rate from geometry, or establish a cosmological clock. The separate Euler–Maruyama diffusion control uses $D=0.12$, $\Delta t=0.002$, and 4,000 walkers per profile; it is illustrative and has no independent heat-equation convergence study. Only one representative particle's exact event history is stored; the ensemble is replayable from its saved seeds and settings, while all output-time ensemble fields are serialized.

The 3D page is implemented and loads the saved run, but browser interaction and responsive layout have not been verified. This review fix regenerated the experiment data from the clean source revision above; it did not rerun the unit suite or browser checks. The paper checkout was not modified, per the instruction to keep work inside this code repository. Its source documents are [the spheroid specification](/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/spheroid-geometry-space-walk.md) and [the geometry-space plan](/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/geometry-space-research-plan.md); a linked result note in that separate checkout remains outstanding.
