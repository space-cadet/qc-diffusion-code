# UI Test Session: T40 T15 engine integration
**Date**: 2026-09-28 00:13 IST
**URL**: http://localhost:5175/
**Tester**: Codex

## Test Objective
Verify T15a and T15b run through the existing Random Walk page and confirm the run JSON download in the browser.

## Pre-conditions
- [x] Browser open
- [x] Navigated to the T40 worktree dev server
- [x] Console baseline captured

## Test Steps Log

### Step 1: Open the existing Random Walk view
**Action**: Select Random Walk from the current application navigation.
**Expected**: Random Walk opens without changing the route or adding navigation.
**Actual**: Random Walk opened at the same `/` URL using the existing bottom navigation.
**Console Errors**: None.
**Screenshot**: Captured in the browser test output.
**Status**: PASS

### Step 2: Switch through T15a and T15b
**Action**: Select each process mode and run its configured horizon.
**Expected**: Both modes remain on the same Random Walk view and show model diagnostics.
**Actual**: T15a and T15b both ran in the existing view. T15a stopped at model time 1.000; its live density/current L1 readings were 0.0586/0.0586 for the default 10,000-walker reduced-ordering case. T15b stopped at model time 4.000; its MSD was 6.0893 versus saved 6.0375 and analytic 6.0366, with causal radius 4.000. Reset returned the page to time zero, and T15b ran to the horizon again.
**Console Errors**: None. Existing warnings were emitted on initial standard-page load for `util` browser externalization and empty initial density data.
**Screenshot**: T15a horizon and T15b horizon captured in the browser test output.
**Status**: PASS

### Step 3: Download run JSON
**Action**: Use the diagnostics panel's download control.
**Expected**: A JSON file is downloaded with model, seed, settings, model time, and diagnostics.
**Actual**: The enabled download control was activated twice, but the in-app browser did not emit a download event and no matching file appeared in the standard Downloads folder. Payload serialization is covered by unit tests; browser file delivery remains unverified in this browser.
**Console Errors**: None.
**Screenshot**: T15b diagnostics and causal-front view captured in the browser test output.
**Status**: BLOCKED

## Summary

### Errors Found
No browser runtime errors. Existing initial-page warnings: Vite externalizes `util.debuglog` and `util.inspect`; the standard Random Walk page logs empty-density warnings before particles are available.

### Issues Identified
The in-app browser did not surface or save the generated JSON download during this check.

## Post-conditions
- [x] Browser tab closed after the check
- [x] UI test log created
