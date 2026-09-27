# T15a/T15b Modes in the Existing Random Walk Page

*Created: 2026-09-27 12:46:25 IST*
*Last Updated: 2026-09-27 12:56:04 IST*
*Task: T40*

## Page integration decision

T15a and T15b are selectable process modes within the current Random Walk page (`frontend/src/RandomWalkSimV2.tsx`). Do not add a new app page, tab, route, or navigation entry. Extend the existing page controls and reuse its visualization only where the display and engine assumptions match the model.

The two models have different state spaces and stochastic rules. Keep their model state and seeded runners explicit and separate; use a process selector to choose which runner and diagnostics the existing page displays. Large reference ensembles should come from saved summaries or offline/worker runs, while interactive runs can use smaller ensembles.

## General simulation issues (separate from T15 requirements)

These findings concern the existing general-purpose Random Walk engine and are tracked under T27. They are not additional T15 model requirements:

- The 2D factory and orchestrator appear to include and integrate both ballistic and CTRW strategies. This contradicts the earlier memory claim that CTRW replaces ballistic motion; verify and resolve that path.
- The page engine uses ambient randomness, so general runs cannot be reproduced from a recorded seed today.
- The current frame-based CTRW timing and canvas-scaled coordinates do not directly provide the model-time/event semantics or unbounded domains required by the paper models.
- The current density display rescales from each update and does not provide fixed, comparable research snapshots; general-page export callbacks are stubs.

These are ensembles of walkers, but their stochastic events are individual direction reversals or heading resets, not pairwise collisions between walkers. Do not substitute the page's elastic interparticle collision strategy for those model events. The T15 modes may bypass the general engine limitations while still rendering on the existing page.

## T15a model mode

- State: one-dimensional position $\beta \in \mathbb{R}$, direction $\pm 1$, speed 1, and model time $\alpha \in [0,1]$; direction reversals use rate $a$.
- Reference cases: $(B,a)=(0,0)$ and $(B,a)=(-3/2,3/4)$.
- Initial profiles: centered, bimodal, and asymmetric with nonzero initial current $J_0=0.4u$.
- Diagnostics: density $u$, current $J$, mass, mean and variance of $\beta$, and ensemble means of $\exp(\alpha+\beta)$ and $\exp(\alpha-2\beta)$.
- The model domain is unbounded. A display window such as $[-6,6]$ is only a viewport and must not absorb, reflect, or otherwise change walkers.

## T15b model mode

- State: planar position $X \in \mathbb{R}^2$ and heading $\theta$, with speed $v$; resets occur at Poisson rate $\lambda$ and choose a uniform heading. Initial headings are uniform.
- Reference baseline: $v=1$, $\lambda=1$, initial position at the origin, seed 15026, 250,000 walkers, and snapshots at $t \in [0.25,0.5,1,2,4]$.
- Diagnostics: radial density, mean-square displacement, covariance, and the finite-speed front $r \le vt$.
- Keep the exact position-heading kinetic process as the model. The Masoliver-Lindenberg telegraph equation is a long-scale approximation and must be labeled as such if shown.

## Integration and verification requirements

- Put a T15a/T15b selector in the existing page and keep the current route and navigation unchanged.
- Record seed, model parameters, initial profile, model time, and ensemble size with each run; support an analysis-friendly export of that record and its diagnostics.
- Use model-specific domain, time, and reset/reversal rules; do not inherit reflective/absorbing canvas boundaries or pairwise collision behavior by accident.
- Compare seeded summaries with the reference numerical scripts and check T15a mass/current behavior and T15b finite-speed front before claiming agreement.
- Verify in the browser that both modes run and switch within the existing page. Keep general engine cleanup tracked independently in T27.

## Scientific source of truth

- T15a derivation and benchmark: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/bianchi-i-one-anisotropy-derivation.md` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/docs/tasks/t15a-bianchi-i-benchmark-v1.md`.
- T15b process and benchmark: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/t15b-euclidean-persistent-walk.md` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/docs/t15b-ml-fluid-limit-v2.md`.
- Reference runners: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/scripts/run_t15a_bianchi_i.py` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/scripts/run_t15b_euclidean.py`.
