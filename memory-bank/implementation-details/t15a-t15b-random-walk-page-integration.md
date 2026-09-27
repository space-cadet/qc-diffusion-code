# T15a/T15b Modes in the Existing Random Walk Page

*Created: 2026-09-27 12:46:25 IST*
*Last Updated: 2026-09-27 18:01:51 IST*
*Task: T40*

## Page integration decision

T15a and T15b are selectable process modes within the current Random Walk page (`frontend/src/RandomWalkSimV2.tsx`). Do not add a new app page, tab, route, or navigation entry. Extend the existing page controls and reuse its visualization only where the display and engine assumptions match the model.

The two models have different state spaces and stochastic rules. Implement them as independent strategies integrated into the existing physics engine, with a process selector on the existing page. Keep model-specific state and stochastic logic separate inside the strategies. Large reference ensembles should come from saved summaries or offline/worker runs, while interactive runs can use smaller ensembles.

## General simulation issues (separate from T15 requirements)

These findings concerned the existing general-purpose Random Walk engine and were addressed in the completed T27 work. They are not additional T15 model requirements:

- The 2D factory previously integrated both ballistic and CTRW motion. The strategy selection was corrected to use one motion strategy and compose interparticle collisions separately.
- The page engine previously used ambient randomness; seeded run initialization is now available for the general Random Walk path.
- The former frame-based CTRW timing and canvas-scaled coordinates did not directly provide the model-time/event semantics or unbounded domains required by the paper models; T40 still needs independent model strategies.
- The general density display and export path are not scientific reference outputs; T40 retains its model-specific comparison and export requirements.

These are ensembles of walkers, but their stochastic events are individual direction reversals or heading resets, not pairwise collisions between walkers. Do not substitute the page's elastic interparticle collision strategy for those model events. T27 is complete and does not own future strategy-diagnostic plots. This does not change T40’s requirement that both models integrate through independent strategies in the existing engine.

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

- `qc-diffusion-T15a` derivation and benchmark: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/bianchi-i-one-anisotropy-derivation.md` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/docs/tasks/t15a-bianchi-i-benchmark-v1.md`.
- `qc-diffusion-T15b` process and benchmark: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/docs/t15b-euclidean-persistent-walk.md` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/docs/t15b-ml-fluid-limit-v2.md`.
- Reference runners: `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/scripts/run_t15a_bianchi_i.py` and `/Volumes/Data/owncloud/root/research/articles/qc-diffusion/numerics/scripts/run_t15b_euclidean.py`.

## Implementation and verification record — 2026-09-27

- Added a process selector to `RandomWalkSimV2` and extended its existing parameter panel. Both T15 modes render in the current page's canvas and diagnostics slots; no page, tab, route, or navigation entry was added.
- Added independent seeded runners in `frontend/src/t15/t15RandomWalk.ts`. T15a uses the frozen bump profiles, conditional initial direction for the nonzero-current case, unit speed, and the two ordering reversal rates. T15b starts at the origin with uniform headings and independently resets each heading at rate λ. Both use model time and ignore canvas edges as boundaries.
- Added a 2048-cell Fourier density/current reference in `frontend/src/t15/t15aReference.ts`, following the paper runner's exact coupled spectral evolution. Live T15a density and current are overlaid and report relative L1 errors. The paper's larger benchmark summary remains labeled separately from the live run.
- T15b reports radial density in normalized radius, MSD and analytic MSD, covariance, reset count, and causal radius. Its saved radial overlay is shown only at baseline speed/rate and scales each snapshot by its own causal radius.
- The T15 JSON export records normalized settings, seed, model time, diagnostics, and a model-specific scientific note. The payload serializer is unit-tested; the in-app browser did not expose a download event, so browser file delivery still needs confirmation.
- Focused T15 tests pass 9/9. The root production build passes, including the shared workspace packages, frontend typecheck, and Vite bundle. Browser checks confirmed the same root URL and navigation, T15a α=1 completion, T15b t=4 completion, and no console errors. The browser emitted two existing Vite warnings for externalized `util` methods.
- In one live 10,000-walker T15a derivative/asymmetric run, α≈0.542 gave density L1 0.0377 and current L1 0.0359; at α=1 the same seed gave density L1 0.0557 and current L1 0.0463. The saved paper benchmark's separate 320,000-walker eight-seed density gate passed (mean 0.0333, 95% upper 0.0345, gate 0.05). Do not treat the live 10,000-walker run as the paper benchmark.
- In one live 10,000-walker T15b baseline run at t=4, MSD was 6.0339 versus analytic 6.0366 and saved measured reference 6.0375; the causal radius was exactly 4.000.
- T27's general strategy composition, non-seeded engine randomness, and general density/export concerns remain separate and were not changed by T40.

## Architecture correction — 2026-09-27 18:01:51 IST

- The current `T15RandomWalkSimulation` and `T15RandomWalkCanvas` form a separate simulation and animation path. They display inside the Random Walk page, but they do not implement T15a and T15b as strategies in the existing physics engine.
- The user rejected that architecture and clarified that each process must be an independent strategy. Keep the current implementation, numerical results, and browser checks labeled as a prototype only; they do not satisfy the engine-integration acceptance criterion.
- T40 remains in progress. The next implementation must use the existing strategy/engine/page runtime, preserve the models' distinct state spaces and stochastic events, and then rerun model and same-page checks. Actual JSON browser download is also still unverified.
