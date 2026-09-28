# Random Walk Strategy Diagnostics

T41 adds live diagnostics below the existing Random Walk page. It reuses the current simulation and renderer; it does not add a route or a second model runner.

## Data path

`PhysicsContext` carries an optional `onStrategyEvent` callback. CTRW, Lévy, fractional, T15a, and T15b strategies emit exact scheduled event times, event positions, wait intervals, and strategy-defined flight/jump lengths. The page's `StrategyDiagnosticsRecorder` consumes those events plus sampled particle frames. Telemetry does not consume the physics random stream.

The recorder samples ensemble frames at increasing simulation-time intervals, retains up to 1,200 spread points, keeps a deterministic reservoir of up to 24,000 positive wait/jump lengths, stores up to eight radial-density snapshots, and tracks eight representative trajectories. These limits keep long runs' chart state bounded.

## Plot meanings

- Spread uses ensemble mean squared displacement and the 90th-percentile radius squared. Lévy runs use median squared radius instead of ordinary MSD. A log-log slope is fit over the latter 65% of positive-time samples and is descriptive of the collected run.
- The radial plot shows normalized displacement-radius density relative to each walker's own initial position. Two-dimensional bins are normalized by annular area; one-dimensional bins are normalized by bin width. Snapshots use their own radial range and are not pointwise time-series comparisons.
- Event counts are stochastic turns, resets, and jumps divided by the original ensemble size. Interparticle collisions are not included.
- Velocity correlation is each walker's current velocity projected onto its initial velocity and normalized by initial speed squared. It is hidden as not-defined for pure jump/wait Lévy and fractional processes.
- The waiting-time CCDF uses sampled inter-event durations. Persistent-walk length means speed multiplied by wait duration; discrete jump strategies report their generated jump lengths. The Lévy curve uses the sampled Pareto draw before boundary effects.
- Trajectory lines are sampled for eight walkers. Circles show turns/resets, squares show discrete jumps, and amber triangles mark the end of a fractional wait where its jump starts.

## Run comparison and limits

Users can save the current run as a reference, change strategy, and overlay comparable curves. The panel enables overlays only when seed, dimension, walker count, initial distribution, boundary, speed, and event rate match. It reports the mismatch if those setup values differ. The spread curve is omitted when the reference and current runs use different statistics (MSD versus median squared radius).

When both runs use the same Lévy or fractional strategy, the overlay check also requires its distribution parameters to match (`levyAlpha`/`levyScale`, or `fractionalBeta`/waiting scale/jump length). Cross-strategy comparisons remain available when the shared setup matches.

Finite boundary modes can reflect, wrap, or absorb walkers. The panel identifies the active boundary and warns that finite domains transform paths or truncate tails; the raw generated Lévy jump length is kept distinct from the boundary-transformed displacement.

The frontend production build passes. Live browser acceptance remains necessary to confirm that the plots populate during a run and that comparison setup checks behave as intended.
