# Spheroid geometry-space experiment: implementation plan

*Created: 2026-09-26 12:03:25 IST. Updated: 2026-09-26 16:33 IST. Status: T39a/T39b implemented and run v1 recorded; T39c browser QA pending.*

## Scientific contract

The canonical analytic model and its limitations are in `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/spheroid-geometry-space-walk.md`. A state stores $q$, with $a=b=Re^q$, $c=Re^{-2q}$, and optional persistent direction $\sigma$. The renderer receives geometry derived from the state; it does not update the stochastic law. The process clock, seed, boundary convention, initial distribution, and output measure are explicit data.

The UI offers two geometry normalizations over the same sampled $q$ path and probability distributions. Fixed volume is the default, with $a=b=Re^q$ and $c=Re^{-2q}$, so area varies. Fixed area scales all three axes by a common $q$-dependent factor so the surface area stays $4\pi R^2$; $c/a=e^{-3q}$ is preserved while volume varies. Surface-area and volume means in the timeline are recomputed from each distribution for the selected normalization. Switching the control does not resample the walk or define a new process.

Ellipsoid surfaces are intrinsically curved; ordinary ellipse boundaries are intrinsically one-dimensional. The embedded shape, intrinsic surface metric, and selected metric or step rule on shape space are separate objects. This model supplies an intuitive example of motion between geometries and no gravitational equation.

## Work order and interfaces

1. **T39a model:** pure TypeScript geometry functions and seeded event-driven persistent trajectories, plus a diffusive control. Return a versioned run object containing parameters, random seed, event log, sampled trajectory, and exact geometry observables. Reuse T38's RNG seam if it exists; no UI imports in the model.
2. **T39b numerics:** independent deterministic directional-equation reference and analytic geometry checks. Compare fields, current, normalization, support, area and curvature distributions, and the $q\leftrightarrow c/a$ coordinate transformation. Use multiple initial data, seeds, and refinements. Save JSON/CSV with revisions and uncertainty; declare an acceptance specification before interpreting the result.
3. **T39c web:** Three.js page using saved runs and a live seeded ensemble. Surface deformation and curvature color use exact formulas; synchronized plots display the representative path, ensemble distributions, and selectable geometric invariants. UI preferences use the common Zustand persistence store; layout adapts to mobile. Separate animation time from simulation time; orbiting the camera must leave all observables unchanged.

## Invariants and checks

- $a^2c=R^3$ and enclosed volume $4\pi R^3/3$.
- $K_{\mathrm{pole}}=R^{-2}e^{-8q}$, $K_{\mathrm{equator}}=R^{-2}e^{4q}$, and $K=R^{-2}$ for $q=0$.
- Persistent trajectories satisfy $|q(t)-q(0)|\leq vt$; $u\geq0$, $|J|\leq vu$ and total probability are checked on valid domains.
- With $r=c/a=e^{-3q}$, transform the same process and its density by $p_r=p_q/(3r)$; an equal-step process newly defined in $r$ is a separate experiment.
- A saved seed/configuration reproduces the event log and web replay. Record attempted events, accepted state changes, and output samples distinctly.

## Repository connections

- Paper T15/T15a owns the research programme and pending Bianchi derivation; T9 tracks numerical evidence.
- This repository T39a/T39b/T39c owns implementation and demonstration. T38 may provide headless-runner infrastructure; the independent reference must remain independent.
- Existing `frontend/src/lab/components/SimplicialVisualization3D.tsx` shows a 3D rendering approach. It does not supply ellipsoid geometry or physics.
- `spin-network-app` was also inspected: its current walk examples act on fixed graphs, and its spin-foam computation is only a future type sketch. The stochastic growth implementation remains in this repository's simplicial code; neither app has a validated quantum-gravity transition law yet.
- `graph-tools` and `ts-quantum` belong to later microscopic stages; they are not needed for the spheroid prototype.

## Run v1 outcome

The frozen study and numerical results are recorded in `memory-bank/implementation-details/spheroid-run-spec-v1.md` and `memory-bank/results/t39-spheroid-run-v1.md`. Both initial profiles meet the predeclared mean relative-$L^1$ threshold at 32,000 walkers. The page can replay the saved JSON or run a live seeded ensemble. Focused TypeScript, JS syntax, diff whitespace, and geometry spot checks passed; browser verification and a separate paper-repository result link remain outstanding. Full frontend build remains blocked by unresolved `ts-quantum` imports in existing quantum-walk files.
