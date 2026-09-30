# Headless Random Walk Statistics Runner

## Purpose

Run the production `RandomWalkSimulator` and `PhysicsEngine` from Node for repeatable random-walk statistics. The runner does not load React, the canvas, or browser automation.

## Run

From `frontend/`:

```bash
pnpm random-walk:headless -- \
  --config scripts/examples/random-walk-headless.json \
  --format both \
  --out /tmp/random-walk-run.json
```

The format may be `json`, `csv`, or `both`. The output path may end in `.json` or `.csv`; the runner writes both files beside that path when `both` is selected. It rejects output paths that would overwrite the input configuration.

The example config records the seed, fixed time step, step count, sample cadence, density resolution, model parameters, initial profile, dimension, boundary, and selected strategy. The runner normalizes defaults into the configuration stored in each output.

## Seeded engine path

`RandomWalkSimulator` accepts an optional random function. The runner supplies a seeded Mulberry32 source to initial position sampling, thermal or strategy velocity sampling, initial event times, `ParticleManager`, and `PhysicsEngine` strategy contexts. Existing callers that omit it retain `Math.random` behavior.

The runner defaults `initialVelocityMode` to `strategy` so fixed-speed strategies use the same model speed used by `StrategyFactory`. Set it to `thermal` to generate initial velocities from the temperature parameter. Kac–Goldstein uses two velocity directions; the asymmetric 1D profile biases the positive direction to 0.7, matching the Random Walk initializer.

Exactly one motion strategy is required; `collisions` may be included in addition. Kac–Goldstein requires 1D and Masoliver–Lindenbergh requires 2D. Boundary options are `periodic`, `reflective`, `absorbing`, and `unbounded`.

## Output

JSON contains schema version, seed, normalized configuration, source revision, dirty-source flag, and sampled time series. CSV has one row per density bin and sample time.

Each sample includes:

- time, total and active particle counts, and surviving mass fraction;
- mean displacement, covariance, and mean-square displacement over active walkers;
- strategy and interparticle event counts;
- finite-speed front and front ratio where those quantities are defined;
- a 1D density array or 2D x-y density grid and its bounds.

Density weights are normalized by the original walker count, so their integral reflects mass loss at absorbing boundaries. Moments are calculated over active walkers. The finite-speed front is omitted for Lévy flights, time-fractional jumps, or interparticle collisions. Distances use the engine's spatial units, including the strategy-specific speed scale.

## Current verification

- Direct TypeScript check passed with `frontend/node_modules/.bin/tsc --noEmit`.
- The example 2D Masoliver–Lindenbergh run completed twice with seed 42; all 11 samples matched exactly. The final front ratio was 1.000000000000005.
- A 1D Kac–Goldstein run produced JSON and CSV, five samples, and a final front ratio of 1.0000000000000056.
- `frontend/src/physics/__tests__/RandomWalkSimulator.seeded.test.ts` contains same-seed and different-seed regression tests. The Vitest suite was not run in this session.

Source outputs include the Git revision and mark whether the checkout is dirty. For a clean provenance record, run from a committed checkout.
