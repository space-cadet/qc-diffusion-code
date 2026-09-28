# Headless Random Walk Statistics Runner

## Objective

Run the production `RandomWalkSimulator` and `PhysicsEngine` directly from Node, with no React, renderer, tsParticles container, or Playwright browser. The runner must reproduce a declared configuration exactly and write analysis-ready statistics.

## Current State

- `RandomWalkSimulator` already owns particle initialization, strategies, stepping, density profiles, collision statistics, and simulation time.
- `PhysicsEngine` owns phase ordering and the fixed simulation clock.
- Current randomness enters through ambient `Math.random()`, so a run cannot be reproduced by seed.
- `scripts/run-random-walk.ts` launches a headless browser and clicks UI controls; it does not expose engine statistics as a stable data product.
- `scripts/bianchi-telegraph-validation.mjs` is headless and seeded, but deliberately implements a separate event-driven model.

## Design

1. Add a small RNG interface to the simulator configuration and pass it to initial distributions, thermal velocities, and stochastic motion strategies.
2. Extract a Node-safe runner module that accepts a JSON configuration, creates `RandomWalkSimulator` with `useNewEngine: true`, and advances exactly `steps` engine ticks.
3. Sample statistics at a declared cadence: time, particle count, collision counters, density grid, mean position, covariance/MSD, radial moments, and finite-speed front.
4. Write a compact summary plus optional time-series JSON and CSV. Include seed, git revision, strategy list, dimensions, domain, boundaries, and all numerical settings in every output.
5. Add tests proving byte-for-byte repeatability for a seed and matching one-step behavior against direct engine invocation.

## Constraints

- Do not import React hooks, canvas code, DOM APIs, or the UI store.
- Keep Bianchi-specific coordinates and PDE comparison in their separate validation module.
- Preserve current UI choices; this task changes engine plumbing and CLI access only.
- A headless result can be compared with component-engine behavior when its seeded RNG path is verified.

## Deliverables

- `scripts/run-random-walk-headless.mjs` (or an equivalent Node entry point)
- A documented package script and JSON configuration example
- Seeded regression tests
- JSON/CSV result schema and one checked-in small example output or fixture
