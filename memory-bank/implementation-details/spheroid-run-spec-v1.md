# T39 pre-run specification v1

Frozen before production results were generated on 2026-09-26. This specification describes an arbitrary persistent process on a fixed-volume spheroid family; it is not a gravitational or WDW test.

## Geometry and state

Use $a=b=Re^q$, $c=Re^{-2q}$, $r=c/a=e^{-3q}$, and the marked axial parameterization in `spheroid-geometry-space-walk.md`. Set $R=1$, and use shape interval $q\in[-1.5,1.5]$. Axes remain marked and rotations/permutations are not quotiented. The stochastic measure is $dq$.

For the persistent process, $dq/dt=v\sigma$, $v=0.6$, and Poisson flips have rate $\lambda=0.8$. At either endpoint of the interval, reverse $\sigma$ immediately and continue the clock (specular reflection). This gives the directional boundary conditions $p_+(q_{min})=p_-(q_{min})$ and $p_-(q_{max})=p_+(q_{max})$. Initialize two profiles from cellwise-normalized smooth densities: a centered Gaussian ($s=0.18$, initial current fraction $\eta=0$) and an equal two-Gaussian mixture centered at $q=\pm0.45$ ($s=0.16$, $\eta=0.35$), with $p_\pm=u(1\pm\eta)/2$.

The independent reference is a conservative, cell-centered finite-volume solve of the same two directional transport equations, with exact local Poisson-flip updates by Strang splitting. Use 600 cells and primary $\Delta t\leq0.35\Delta q/v$, sample every 0.1 model-time units through $t=2$. Repeat at $0.175\Delta q/v$ and $0.0875\Delta q/v$ with the same spatial grid. Reflection is imposed through the incoming boundary flux. Reference mass drift tolerance is $10^{-10}$ at each time resolution; medium-to-fine terminal relative $L^1$ difference must be $\leq0.005$ for the reference to be called time-resolved. All fields use density per unit $q$ and are compared as cell probabilities.

## Frozen stochastic study and acceptance

For each profile, run eight independent seeds at populations 8,000, 16,000, and 32,000, for 21 output times from 0 through 2. Seeds are `39001` through `39008`; initial-state and event draws consume one documented Mulberry32 stream per run. Save the selected particle's event history and sampled trajectory. No results were inspected when these choices were fixed.

At final time, report the mean and 95% Student-t interval across eight seed-level relative discrete $L^1$ errors (histogram cell mass versus the reference), mass error, $q$ moments, current, and geometric moments. The predeclared numerical acceptance is mean relative $L^1\leq0.10$ for both profiles, reference mass drift $\leq10^{-10}$, and no finite-speed or positivity violations. This is an exploratory Monte Carlo criterion; failure is retained as a result. Report population refinement rather than selecting a favorable seed.

Test geometry at $q=-0.7,0,0.8$ and $\theta=0,\pi/2,\pi/3$: $a^2c=R^3$, $V=4\pi R^3/3$, sphere metric/curvature, pole/equator curvature, and area density. Test the same trajectory in $r$ with $p_r=p_q/(3r)$ and transformed speed $dr/dt=-3v\sigma r$; do not generate a new equal-step walk in $r$.

Diffusive control: Euler-Maruyama $dq=\sqrt{2D}dW$, $D=0.12$, reflecting endpoints, $\Delta t=0.002$, same initial profiles, seed stream rule, and terminal output. Its transformed path and density use Itô's $dr=9Dr\,dt-3r\sqrt{2D}\,dW$ and the same Jacobian. It is a separate control, not the $\lambda\to\infty$ limit in this finite run.

## Provenance and decisions

Every output records this spec version and hash, seed, parameters, repository HEAD, dirty-worktree status, runtime, solver resolution, and output cadence. Eight seeds are the independent units. The 3D interface replays serialized shape frames; animation rate never advances the stochastic process. Any changed threshold or solver setting requires a new pre-run specification and a separately labeled run.
