# URL-Backed Navigation and Shareable Views
*Created: 2026-09-29 19:47:01 IST*
*Last Updated: 2026-09-29 20:40:54 IST*

**Task:** T35a, under T35

## Goal

Make pages and meaningful sections within the app addressable by URL. A shared link should open the intended view directly, including after refresh, without replacing the page's existing UI or runtime.

## URL Plan

- Use stable path segments for top-level pages, such as `/random-walk`, `/simplicial-growth`, and `/spheroid-walk`.
- Use a nested path when a page has a durable view or subsection, such as `/simplicial-growth/boundary`.
- Use query parameters for selections and settings within an existing page. For example, `/random-walk?strategy=kac-goldstein` selects the Kac–Goldstein strategy in the existing Random Walk parameter panel.
- Use a fragment for a meaningful in-page destination, such as `/random-walk?strategy=kac-goldstein#diagnostics` or `/spheroid-walk#curvature`.
- Omit default or transient UI state unless the user can reasonably expect it to be restored from a shared link.

These examples describe the addressable views, not separate pages or simulation implementations. Random Walk strategies remain composed through the existing strategy selector, unified parameter panel, physics engine, and renderer.

## Navigation State

1. Resolve the path to the app page.
2. Resolve any nested view, query selection, and fragment owned by that page.
3. Apply URL-owned navigation state before reading persisted navigation state; a stored active tab must not redirect a direct link.
4. Update the URL from desktop navigation, mobile navigation, and in-page tabs through one navigation path.
5. Respond to browser Back and Forward by restoring the corresponding URL state.

Keep URL state limited to navigation and explicitly shareable settings. Do not serialize the full live simulation or large run payload into ordinary navigation URLs.

## Compatibility and Hosting

- Preserve the existing `?data=` run-sharing behavior from `ExportPanel`; avoid replacing or dropping its query value when navigation changes.
- Keep the app's Vercel single-page-app fallback so direct requests to nested paths serve the app shell. Confirm this with a direct-path load, not only by navigating from `/`.
- Inspect installed dependencies and current `App.tsx` structure before selecting a router. Avoid adding a second routing system alongside any existing package.
- Unknown paths should show a useful not-found or default-page state, rather than silently selecting an unrelated page.

## Implemented URL Inventory

The application currently exposes these navigable pages and in-page destinations:

| Page | URL destination |
| --- | --- |
| PDE Simulation | /simulation; fragments #solver, #equations, #telegraph, #diffusion, #initial-conditions, #simulation-settings |
| Random Walk Sim | /random-walk?strategy=&lt;strategy&gt;; fragments #random-walk-parameters, #random-walk-canvas, #density, #history, #export, #diagnostics |
| Quantum Walk | /quantum-walk?view=visualization, analysis, or education |
| Quantum Walk Framework | /quantum-walk-framework?view=visualization or analysis |
| Analysis | /analysis |
| Lab Demo | /lab-demo |
| Simplicial Growth | /simplicial-growth for Boundary Growth; /simplicial-growth/interior for Interior Moves |
| Spheroid Walk | /spheroid-walk#spheroid-geometry or #spheroid-live-controls |
| Memory Bank | /memory-bank?folder=&lt;path&gt; or /memory-bank?doc=&lt;category/file&gt; |

Analysis and Lab Demo have no selected in-page navigation tabs. Random Walk's strategy parameter is query state inside the same page and shared parameter panel. PDE collapsible sections are addressed by fragments; Memory Bank folder and document selections are query state.

## Implementation State

- frontend/src/navigation/urlNavigation.ts provides the page map, History API updates, Back/Forward subscription, and URL query helpers without adding a router dependency.
- frontend/src/App.tsx uses URL paths for desktop and mobile page selection, synchronizes a URL-selected strategy before persisted selection, and scrolls to fragment targets.
- Quantum Walk view tabs, Simplicial Growth tabs, PDE disclosures, Random Walk panel anchors, and Memory Bank folder/document selections read and update the URL.
- vercel.json already rewrites nested paths to the SPA entry point; no configuration change was needed.
- Existing Random Walk share links at /?data=... still resolve to Random Walk.
- TypeScript, the production build, and local browser checks pass. The local checks covered direct Random Walk strategy/subsection links, refresh, Back/Forward restoration, PDE disclosure restoration, the Simplicial Growth interior path, and opening a Memory Bank document from its URL. The deployed URL has not been checked.

## Acceptance Checks

- [x] Open a direct local link and confirm it restores the expected page and subsection.
- [x] Refresh a deep link and confirm it remains on the same view.
- [x] Navigate between views and confirm Back and Forward restore the prior selections.
- Open `/random-walk?strategy=kac-goldstein` and confirm the unified Random Walk UI selects the strategy without a separate page, panel, or engine.
- [x] Confirm local Vite serves the nested Simplicial Growth route on direct load and refresh.
- [ ] Verify existing deployed `?data=` links and a direct Vercel nested-path request.

## Scope

This plan covers URL-backed navigation and shareable view state. Reworking simulation ownership, adding strategy-specific pages, or changing scientific run data formats is outside T35a unless separately authorized.
