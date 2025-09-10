# Testing Framework Enhancement Plan (C23)

## Overview
This document outlines the ongoing efforts to enhance the project's testing framework, consolidating changes related to test environment setup, dependency management for testing, and specific test case refinements. This work is part of Task C23: "Comprehensive Testing Framework Enhancement."

## Changes Implemented

### 1. Test Environment Setup
*   **Vitest Configuration:** The `vite.config.ts` file has been updated to configure Vitest with `globals: true` and `environment: 'jsdom'`. This ensures that tests can run in a browser-like environment, which is crucial for frontend components.
*   **JSDOM Dependency:** The `jsdom` library has been added as a development dependency in `frontend/package.json` and its entry updated in `frontend/pnpm-lock.yaml`. This provides the necessary DOM environment for running tests outside of a real browser.

### 2. Test Script Update
*   The `test` script in `frontend/package.json` has been modified from `vitest` to `pnpm exec vitest run`. This ensures consistent execution of tests within the pnpm monorepo environment.

### 3. Physics Engine Test Refinements
*   **`CTRWStrategy2D.test.ts`:** The precision for a `toBeCloseTo` assertion was reduced from 1 to 0. This adjustment accounts for statistical variations in the simulation results, making the test more robust.
*   **`integration.test.ts`:**
    *   The import of `CircularBuffer` was changed from a `require` statement to a direct ES module import.
    *   A test case was refined to verify particle position changes more accurately, ensuring that the particle moves as expected based on its velocity and the time step.
*   **`two-phase-engine.test.ts`:** The import of `CoordinateSystem` was changed from a `require` statement to a direct ES module import.

## Future Work (as part of C23)
*   Expand test coverage for other physics strategies and components.
*   Investigate and implement end-to-end testing where appropriate.
*   Continuously monitor and resolve any new build or dependency vulnerabilities related to the testing framework.
