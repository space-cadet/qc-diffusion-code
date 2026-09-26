---
source_branch: main
source_commit: ce44fd2af3c628dc25cc3aa2c584d3e79f4cb93f
---

# Session 2026-09-26 - Afternoon

*Created: 2026-09-26 12:03:25 IST*
*Last Updated: 2026-09-26 18:10:09 IST*

## Focus

T39/T39a/T39b/T39c: plan a reproducible spheroid walk, independent numerical checks, and a 3D web presentation.

## Work completed

1. Linked the paper's geometry-space research programme and spheroid derivation to this app's implementation tasks.
2. Created one parent task and three bounded subtasks for a pure seeded model, numerical comparison, and 3D page.
3. Recorded the experiment's state/data contract, analytic invariants, coordinate-change check, replay requirements, and scientific claim limits in `memory-bank/implementation-details/spheroid-geometry-space-experiment.md`.
4. Recorded the overlap review of `spin-network-app`: it currently provides fixed-graph diffusion and a 2D coined walk; its spin-foam computation is a future type sketch, not the stochastic simplicial growth implementation.

## Implementation update

1. Implemented a renderer-independent fixed-volume spheroid model, exact event-driven persistent walk with reflection, separate Euler–Maruyama control, seeded replay, and analytic geometry calculations.
2. Added an independent reflecting-boundary finite-volume directional-equation reference, a frozen v1 run specification, three population levels, eight seeds per level, three reference time steps, two initial profiles, and saved JSON/CSV outputs.
3. The final 32,000-walker relative $L^1$ means are 0.05042 (95% CI half-width 0.00294) for the centered Gaussian and 0.04910 (0.00318) for the bimodal nonzero-current profile. Reference maximum mass drift is $1.78\times10^{-15}$; time-refinement errors are 0.00123 and 0.00137.
4. Added a saved-run 3D page with orbit controls, curvature coloring, synchronized ensemble density and representative path, and replay controls. Pure Node validation passes (6/6).

## Working state

- T38 remains a plan, not callable runner infrastructure; the experiment uses the existing Mulberry32 algorithm from the separate Bianchi validation. T27 and T28/T30 app work is untouched by this work.
- This checkout already had unrelated modified and untracked files before the T39 documentation was added; those were preserved.
- Browser verification remains open because frontend dependencies are not installed and pnpm could not be downloaded from the registry. At that point the paper repository had not been modified; it has since recorded T15a/NUM-7 and opened T15b. The linked T39 results note remains open.

## Next steps

1. Install dependencies when network access is available and complete T39c browser/replay/responsive QA.
2. Add a linked methods/results note in the separate paper repository after the code-side result review.

## Later UI and geometry updates

1. Added a live seeded ensemble run with a 200-step default horizon (20 model-time units) so the timeline includes the plateau after the initial ramp; changing the step count restarts the run.
2. Connected page preferences to the common Zustand persistence framework and added fallback merging for older or partial saved state. Reconciled the TypeScript store and tracked JavaScript runtime export to resolve the reported missing spheroid state errors.
3. Improved narrow-screen layout for the 3D view, controls, metric selector, chart, and page overflow.
4. Added fixed-area selection alongside the default fixed-volume model. Fixed-area geometry rescales the axes together, preserves $c/a$, holds area at $4\pi R^2$, and allows volume to vary. Mean area is available under fixed volume; mean volume is available under fixed area. Both modes reuse the same $q$ walk and recalculate geometric observables.
5. Explained the highly deformed representative shape as a consequence of the saved seed reaching an extreme $q$ under the configured bounds, while the chart shows the ensemble mean.

## Verification and remaining work

- Focused TypeScript check, JS syntax checks, `git diff --check`, and fixed-area geometry spot checks passed. Earlier pure-model validation passed 8/8 checks.
- Full frontend build is blocked by `ts-quantum` import resolution in existing quantum-walk code. No browser session was available for acceptance verification.
- Browser QA for replay, mobile layout, persistence, constraints, and chart labels remains pending. The separate paper-repository methods/results link remains outstanding.

## 2026-09-26 16:54 IST - PR review corrections

1. Added every selectable geometric metric to the saved ensemble frames so replay charts use measured values.
2. Added separate directional-reference and diffusive-control data through the 20-unit maximum live horizon. The frozen T39b acceptance run remains at two units; live runs are capped at 200 steps.
3. Changing the walker count now restarts an active live run with the selected seed and requested population.
4. Regenerated the JSON/CSV outputs from clean source revision `6a46cd5f119b0e126935625225bfe58dc230a41f`. Source digest: `a89fd367328ed3e3f0df85bae3ea94b80abac17ef926e3c40ffe9e6372d088f8`. Frozen relative-$L^1$ results are unchanged; analytic surface-area errors are now accurately reported as $0.1691\pm0.0788$ and $0.0615\pm0.0318$.

Browser QA and the separate paper-repository methods/results note remain outstanding. The model test suite was not rerun during these review fixes.

## 2026-09-26 17:03 IST - Preserve the existing live-run limit

Kept the existing 500-step live-run maximum so persisted settings remain valid. Extended the saved comparison reference and diffusive control to 50 model-time units; the separate frozen acceptance study remains at two units. Regenerated the JSON from clean source commit `e90aa058f17a219a555d41b9c5ff1fb025f05ebd` with source digest `2f1f6ce81c784266073bd771c4c459c83881662b743c55468d789262ee1783a1`.

## 2026-09-26 18:10 IST - Cross-repository Memory Bank closeout

- Verified from the fetched Git history that T39 PR #19 merged into main at `74ef789`; browser acceptance remains pending in T39c.
- The paper repository now records T15a/NUM-7 as a matched sampler/equation benchmark, not independent evidence for a physical transition law, and tracks the full two-anisotropy geometry-first problem under T15b.
- The generic isotropic 2D direction-reset failure remains a control for that distinct process and does not settle full Bianchi I.
- The T39 methods/results link in the paper checkout remains a follow-up after review; it is separate from the paper-side T15a/T15b records.
