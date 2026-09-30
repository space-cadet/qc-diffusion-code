# Random Walk Panel Workspace and Viewport Controls
*Created: 2026-09-30 02:48:52 IST*
*Last Updated: 2026-09-30 09:35:52 IST*
*Last Updated: 2026-09-30 02:48:52 IST*

**Task:** T42

## Goal

Make the Random Walk page panels movable, resizable, collapsible, and persistent; add viewport zoom and a clear finite-domain outline; and simplify simulation transport controls to one state-aware button.

## Existing Patterns to Reuse

- Docked panels use React Grid Layout for drag and resize. `randomWalkSimLayouts` is already persisted in Zustand.
- Floating panels use `FloatingPanel` with `react-rnd` for drag, resize, collapse, and persisted geometry/collapse state.
- `useRandomWalkPanels` wires the existing floating panel state and callbacks.
- `ParticleCanvasV2` resizes with its container. The renderer receives viewport dimensions, while current particle projection has no user-controlled zoom.
- The parameter panel currently has a Start button plus a Pause/Resume toggle.

## Planned Changes

1. Extend the current docked and floating panel patterns so every Random Walk panel can be moved, resized, and collapsed. Include Strategy Diagnostics and persistent-walk diagnostics in the panel arrangement.
2. Persist panel positions, sizes, and collapse states through the existing app store. Keep sensible defaults and minimum sizes.
3. Add zoom to the particle viewport as a display transform; do not change model coordinates or physics state. Make the configured finite container boundary visible and identify unbounded domains without drawing a false boundary.
4. Replace separate Start and Pause/Resume controls with one control whose label and action follow the stopped, running, and paused state.

## Constraints

- Reuse React Grid Layout, `FloatingPanel`/`react-rnd`, the existing store, canvas, and renderer paths. Do not add a UI framework or a second panel system.
- Keep all walk strategies in the existing Random Walk page, parameter panel, and engine.
- Do not change statistical definitions or the saved-run comparison rules owned by T41. T38 remains the separate plan for a reproducible headless statistics runner.

## Current Review Findings

- The docked grid already supports dragging/resizing and persists layout, but not a shared whole-panel collapse state.
- The general Strategy Diagnostics panel is currently outside the grid. Persistent-walk diagnostics are nested inside History.
- Floating Observables and Custom Observables panels already support drag, resize, collapse, and persistence.
- Viewport sizing responds to container changes, but no user zoom control or clear configured-domain outline was found.
- The current transport controls expose Start separately from the Pause/Resume toggle.

## Acceptance

- Each Random Walk panel's position, size, and collapsed state can be changed and survives page reload.
- Dragging begins from the existing title/header affordance and resizing respects the established minimum sizes.
- Zoom changes framing only; particle positions and boundary behavior remain governed by the physics engine.
- Finite boundaries are visibly distinct from the viewport edge; unbounded mode has no physical-boundary outline.
- A single control correctly starts, pauses, and resumes the simulation.
- The existing shared Random Walk route and engine remain in use.

## Implementation Progress — 2026-09-30

- Docked panels now have draggable headers and collapse controls; Strategy Diagnostics and persistent-walk diagnostics are separate grid panels.
- Docked layout, collapse state, and viewport zoom use persisted Zustand state. Older layouts receive defaults for the new diagnostics panels.
- Particle zoom transforms rendered coordinates around the viewport center. The finite domain receives an inset outline; unbounded mode receives a label and no boundary outline.
- The parameter panel now has one Start/Pause/Resume button.
- Particle View, Density, persistent-walk diagnostics, and strategy diagnostics pause their display refreshes when individually collapsed. Their Auto settings remain unchanged and govern refresh again after expansion; collapsing a panel does not pause the physics engine. Simulation transport remains in Parameters.
- TypeScript check passes. Browser review of dragging, resize, collapse/reload, zoom, and strategy-specific boundary appearance remains open.
