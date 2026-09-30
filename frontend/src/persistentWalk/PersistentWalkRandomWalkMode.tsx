import React, { useEffect, useMemo, useState } from "react";
import {
  createPersistentWalkRunExport,
  type PersistentWalkDiagnostics,
  type PersistentWalkMode,
  type PersistentWalkRunConfig,
  type TelegraphModeSnapshot,
} from "./persistentWalkRandomWalk";
import { triggerJsonDownload } from "./downloadJson";
import { kacGoldsteinSpectralReference } from "./kacGoldsteinReference";

interface ReferenceData {
  task?: string;
  settings?: { populations?: number[]; rootSeed?: number };
  cases?: Array<{
    profile: string;
    ordering: string;
    assessment?: { status?: string; densityGate?: number; meanAt320k?: number; ci95UpperAt320k?: number };
    levels?: Array<{
      population: number;
      finalDensityRelativeL1?: { mean: number; ci95Lower?: number; ci95Upper?: number; n: number };
      replicates?: Array<{ errors?: Array<{ time: number; densityRelativeL1: number }> }>;
    }>;
  }>;
  overallAssessment?: { status?: string; claim?: string };
  protocol?: { seed?: number; walkersPerSnapshot?: number; times?: number[]; speed?: number; poissonResetRate?: number };
  radialSnapshots?: Array<{ time: number; walkers: number; radius: number[]; radialProbabilityDensity: number[] }>;
  momentResults?: Array<{ time: number; meanDisplacementSquared: number; analyticMeanDisplacementSquared: number }>;
  checks?: { allMsdEstimatesWithinThreeStandardErrors?: boolean; causalFrontObserved?: boolean };
}

type MasoliverLindenberghReferenceSnapshot = NonNullable<ReferenceData["radialSnapshots"]>[number];

function resampleMasoliverLindenberghReferenceToNormalizedRadius(
  snapshot: MasoliverLindenberghReferenceSnapshot,
  speed: number,
  targetBinCount: number,
): number[] | undefined {
  const frontRadius = speed * snapshot.time;
  if (frontRadius <= 0 || targetBinCount <= 0 || snapshot.radius.length < 2) return undefined;

  const sourceStep = snapshot.radius[1] - snapshot.radius[0];
  if (sourceStep <= 0) return undefined;
  const sourceCount = Math.min(snapshot.radius.length, snapshot.radialProbabilityDensity.length);

  return Array.from({ length: targetBinCount }, (_unused, targetIndex) => {
    const targetRadiusStart = (targetIndex / targetBinCount) * frontRadius;
    const targetRadiusEnd = ((targetIndex + 1) / targetBinCount) * frontRadius;
    let probabilityMass = 0;

    for (let sourceIndex = 0; sourceIndex < sourceCount; sourceIndex++) {
      const sourceCenter = snapshot.radius[sourceIndex];
      const sourceStart = Math.max(0, sourceCenter - sourceStep / 2);
      if (sourceCenter > frontRadius && sourceStart <= frontRadius + 1e-12) {
        // The saved histogram places the finite-speed front atom in the first
        // bin whose center lies beyond vt. Keep that full bin mass at x=1.
        if (targetIndex === targetBinCount - 1) {
          probabilityMass += snapshot.radialProbabilityDensity[sourceIndex] * sourceStep;
        }
        continue;
      }
      const sourceEnd = Math.min(frontRadius, sourceCenter + sourceStep / 2);
      const overlap = Math.max(0, Math.min(targetRadiusEnd, sourceEnd) - Math.max(targetRadiusStart, sourceStart));
      probabilityMass += snapshot.radialProbabilityDensity[sourceIndex] * overlap;
    }

    // The source is a density per unit radius. Divide the rebinned probability
    // mass by the target width in r/(vt) to obtain density in normalized radius.
    return probabilityMass * targetBinCount;
  });
}

interface DiagnosticsProps {
  mode: PersistentWalkMode;
  config: PersistentWalkRunConfig;
  diagnostics: PersistentWalkDiagnostics | null;
  telegraphModeHistory: TelegraphModeSnapshot[];
}

function polyline(values: number[], width: number, height: number, maximum: number, symmetric = false): string {
  if (values.length === 0 || maximum <= 0) return "";
  const pad = 5;
  return values.map((value, index) => {
    const x = pad + (index / Math.max(1, values.length - 1)) * (width - pad * 2);
    const y = symmetric
      ? height / 2 - (value / maximum) * (height / 2 - pad)
      : height - pad - (Math.max(0, value) / maximum) * (height - pad * 2);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function PersistentWalkChart({
  title,
  values,
  reference,
  referenceLabel = "Saved reference",
  labels,
  symmetric = false,
}: {
  title: string;
  values: number[];
  reference?: number[];
  referenceLabel?: string;
  labels: string;
  symmetric?: boolean;
}) {
  const width = 560;
  const height = 120;
  const maximum = Math.max(1e-12, ...(symmetric ? values.map(Math.abs) : values), ...(reference ? (symmetric ? reference.map(Math.abs) : reference) : []));
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-700">{title}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full rounded border bg-white" role="img" aria-label={labels}>
        <path d={`M5 ${symmetric ? height / 2 : height - 5}H${width - 5}`} stroke="#cbd5e1" />
        {reference && <path d={polyline(reference, width, height, maximum, symmetric)} fill="none" stroke="#f97316" strokeWidth="1.8" strokeDasharray="5 4" />}
        <path d={polyline(values, width, height, maximum, symmetric)} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
      {reference && <div className="mt-1 flex gap-4 text-[11px] text-slate-500"><span>● Current run</span><span className="text-orange-600">╌ {referenceLabel}</span></div>}
    </div>
  );
}

function PopulationRefinementChart({ rows }: { rows: Array<{ population: number; mean: number; lower?: number; upper?: number; replicates: number }> }) {
  if (rows.length < 2) return null;
  const width = 560;
  const height = 180;
  const margin = { left: 58, right: 16, top: 14, bottom: 42 };
  const xValues = rows.map((row) => Math.log10(row.population));
  const yValues = rows.map((row) => Math.log10(Math.max(row.mean, 1e-8)));
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues) - 0.15;
  const yMax = Math.max(...yValues) + 0.15;
  const x = (population: number) => margin.left + ((Math.log10(population) - xMin) / (xMax - xMin)) * (width - margin.left - margin.right);
  const y = (value: number) => margin.top + (1 - (Math.log10(Math.max(value, 1e-8)) - yMin) / (yMax - yMin)) * (height - margin.top - margin.bottom);
  const path = rows.map((row, index) => `${index ? "L" : "M"}${x(row.population).toFixed(1)},${y(row.mean).toFixed(1)}`).join(" ");
  const guide = rows.map((row, index) => {
    const value = rows[0].mean * Math.sqrt(rows[0].population / row.population);
    return `${index ? "L" : "M"}${x(row.population).toFixed(1)},${y(value).toFixed(1)}`;
  }).join(" ");
  return <section className="rounded border bg-white p-3">
    <h4 className="text-sm font-semibold">Saved ensemble refinement</h4>
    <p className="mt-1 text-xs text-slate-500">Final-time relative density L1 across the paper benchmark’s walker counts. The 320k level uses eight seeds; other levels use one.</p>
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-44 w-full" role="img" aria-label="Saved Kac–Goldstein benchmark density error versus ensemble size, with an inverse square root reference line">
      {[0, 1, 2, 3, 4].map((index) => {
        const yy = margin.top + index / 4 * (height - margin.top - margin.bottom);
        return <line key={index} x1={margin.left} x2={width - margin.right} y1={yy} y2={yy} stroke="#e2e8f0" />;
      })}
      <path d={guide} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5 4" />
      <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" />
      {rows.map((row) => <circle key={row.population} cx={x(row.population)} cy={y(row.mean)} r="4" fill="#2563eb" />)}
      {rows.map((row) => <text key={`label-${row.population}`} x={x(row.population)} y={height - 18} textAnchor="middle" fontSize="10" fill="#475569">{row.population >= 1000 ? `${Math.round(row.population / 1000)}k` : row.population}</text>)}
      <text x={margin.left} y={height - 3} fontSize="10" fill="#475569">walkers (log scale)</text>
      <text transform={`translate(13 ${height / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#475569">relative density L1 (log scale)</text>
    </svg>
    <div className="flex flex-wrap gap-x-4 text-xs text-slate-600"><span>● Saved benchmark</span><span>╌ N⁻¹/² reference</span></div>
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs"><thead><tr className="text-slate-500"><th className="py-1 pr-3">Walkers</th><th className="py-1 pr-3">Mean L1</th><th className="py-1 pr-3">95% interval</th><th className="py-1">Seeds</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.population} className="border-t border-slate-100"><td className="py-1 pr-3">{row.population.toLocaleString()}</td><td className="py-1 pr-3">{row.mean.toFixed(4)}</td><td className="py-1 pr-3">{row.lower !== undefined && row.upper !== undefined ? `${row.lower.toFixed(4)}–${row.upper.toFixed(4)}` : "single run"}</td><td className="py-1">{row.replicates}</td></tr>)}</tbody>
      </table>
    </div>
  </section>;
}

const MODE_COLORS = ["#2563eb", "#ea580c", "#059669"];

function TelegraphModeHistoryChart({ history }: { history: TelegraphModeSnapshot[] }) {
  if (history.length < 2) return <div className="rounded border bg-white p-3 text-sm text-slate-500">Run the unbounded walk to collect Fourier-mode comparisons over time.</div>;
  const width = 560;
  const height = 190;
  const margin = { left: 56, right: 14, top: 14, bottom: 38 };
  const xMax = Math.max(...history.map((row) => row.lambdaTime));
  const yMax = Math.max(0.02, ...history.flatMap((row) => row.modes.map((mode) => mode.absoluteDifference + 2 * mode.standardError)));
  const x = (value: number) => margin.left + (value / xMax) * (width - margin.left - margin.right);
  const y = (value: number) => height - margin.bottom - (value / yMax) * (height - margin.top - margin.bottom);
  const scaledModes = history[history.length - 1].modes.map((mode) => mode.scaledWavenumber);
  return <section className="rounded border bg-white p-3">
    <h4 className="text-sm font-semibold">Telegraph fluid-limit mode error</h4>
    <p className="mt-1 text-xs text-slate-500">Absolute difference between the walk’s empirical displacement Fourier mode and the telegraph approximation, versus λt.</p>
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-44 w-full" role="img" aria-label="Absolute difference between empirical walk Fourier modes and the telegraph approximation over lambda times time">
      {[0, 1, 2, 3, 4].map((index) => {
        const yy = margin.top + index / 4 * (height - margin.top - margin.bottom);
        return <line key={index} x1={margin.left} x2={width - margin.right} y1={yy} y2={yy} stroke="#e2e8f0" />;
      })}
      {scaledModes.map((kappa, index) => {
        const points = history.map((row) => ({ x: row.lambdaTime, y: row.modes.find((mode) => mode.scaledWavenumber === kappa)?.absoluteDifference ?? 0 }));
        const path = points.map((point, pointIndex) => `${pointIndex ? "L" : "M"}${x(point.x).toFixed(1)},${y(point.y).toFixed(1)}`).join(" ");
        return <path key={kappa} d={path} fill="none" stroke={MODE_COLORS[index % MODE_COLORS.length]} strokeWidth="2" />;
      })}
      <line x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} stroke="#64748b" />
      <text x={margin.left} y={height - 12} fontSize="10" fill="#475569">λt</text>
      <text transform={`translate(13 ${height / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#475569">absolute mode difference</text>
    </svg>
    <div className="flex flex-wrap gap-x-4 text-xs text-slate-600">{scaledModes.map((kappa, index) => <span key={kappa} className="inline-flex items-center gap-1"><i className="h-2 w-3" style={{ backgroundColor: MODE_COLORS[index % MODE_COLORS.length] }} />κ={kappa}</span>)}</div>
  </section>;
}

function downloadRun(mode: PersistentWalkMode, config: PersistentWalkRunConfig, diagnostics: PersistentWalkDiagnostics | null) {
  if (!diagnostics) return;
  const payload = createPersistentWalkRunExport(mode, config, diagnostics);
  triggerJsonDownload(payload, `${mode}-seed-${config.seed}-t${diagnostics.time.toFixed(3)}.json`);
}

export const PersistentWalkDiagnosticsPanel: React.FC<DiagnosticsProps> = ({ mode, config, diagnostics, telegraphModeHistory }) => {
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [referenceError, setReferenceError] = useState(false);
  const kacGoldsteinReference = useMemo(() => mode === "kac-goldstein" && diagnostics
    && config.speed === 1
    && (config.flipRate ?? 0) === (config.ordering === "derivative" ? 0.75 : 0)
    ? kacGoldsteinSpectralReference(config.profile, config.ordering, diagnostics.time, diagnostics.density.length)
    : null,
  [mode, config.profile, config.ordering, config.flipRate, config.speed, diagnostics?.time, diagnostics?.density.length]);
  const kacGoldsteinDensityL1 = kacGoldsteinReference && diagnostics
    ? diagnostics.density.reduce((sum, value, index) => sum + Math.abs(value - kacGoldsteinReference.density[index]), 0)
      * ((kacGoldsteinReference.domain[1] - kacGoldsteinReference.domain[0]) / diagnostics.density.length)
    : undefined;
  const kacGoldsteinCurrentL1 = kacGoldsteinReference && diagnostics?.current
    ? diagnostics.current.reduce((sum, value, index) => sum + Math.abs(value - kacGoldsteinReference.current[index]), 0)
      * ((kacGoldsteinReference.domain[1] - kacGoldsteinReference.domain[0]) / diagnostics.current.length)
    : undefined;

  useEffect(() => {
    let cancelled = false;
    const file = mode === "kac-goldstein" ? "kac-goldstein-bianchi-i-v1.json" : "masoliver-lindenbergh-euclidean-v1.json";
    setReference(null);
    setReferenceError(false);
    fetch(`${import.meta.env.BASE_URL}research/${file}`)
      .then((response) => {
        if (!response.ok) throw new Error("Reference data unavailable");
        return response.json();
      })
      .then((data: ReferenceData) => {
        if (!cancelled) {
          setReference(data);
          setReferenceError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setReferenceError(true);
      });
    return () => { cancelled = true; };
  }, [mode]);

  const referenceSnapshot = mode === "masoliver-lindenbergh" && reference?.radialSnapshots
    ? reference.radialSnapshots.reduce<MasoliverLindenberghReferenceSnapshot | null>((best, row) => {
      if (!diagnostics) return best;
      if (!best || Math.abs(row.time - diagnostics.time) < Math.abs(best.time - diagnostics.time)) return row;
      return best;
    }, null)
    : null;
  const referenceCase = mode === "kac-goldstein" ? reference?.cases?.find((row) =>
    row.profile === (config.profile === "centered" ? "centered-single-bump" : config.profile === "bimodal" ? "symmetric-bimodal" : "asymmetric-nonzero-current")
    && row.ordering === (config.ordering === "reduced" ? "reduced-laplace-beltrami" : "manuscript-derivative-only")
  ) : null;
  const refinementRows = referenceCase?.levels?.flatMap((level) => {
    const summary = level.finalDensityRelativeL1;
    if (summary) return [{ population: level.population, mean: summary.mean, lower: summary.ci95Lower, upper: summary.ci95Upper, replicates: summary.n }];
    const values = (level.replicates ?? []).map((replicate) => replicate.errors?.[replicate.errors.length - 1]?.densityRelativeL1).filter((value): value is number => value !== undefined);
    if (!values.length) return [];
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return [{ population: level.population, mean, replicates: values.length }];
  }) ?? [];
  const referenceMoment = mode === "masoliver-lindenbergh" && reference?.momentResults && diagnostics
    ? reference.momentResults.reduce<NonNullable<ReferenceData["momentResults"]>[number] | null>((best, row) => {
      if (!best || Math.abs(row.time - diagnostics.time) < Math.abs(best.time - diagnostics.time)) return row;
      return best;
    }, null)
    : null;
  const canCompareMasoliverLindenberghBaseline = mode === "masoliver-lindenbergh"
    && (config.initialDistType ?? "origin") === "origin"
    && (config.boundaryCondition ?? "unbounded") === "unbounded"
    && config.speed === reference?.protocol?.speed
    && config.resetRate === reference?.protocol?.poissonResetRate;
  const analyticMsd = diagnostics && mode === "masoliver-lindenbergh"
    ? config.resetRate > 0
      ? (2 * config.speed * config.speed / (config.resetRate * config.resetRate)) * (config.resetRate * diagnostics.time - 1 + Math.exp(-config.resetRate * diagnostics.time))
      : config.speed * config.speed * diagnostics.time * diagnostics.time
    : undefined;

  return (
    <section className="h-full overflow-auto rounded-lg border bg-white p-4" aria-label="PersistentWalk research diagnostics">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{mode === "kac-goldstein" ? "Kac–Goldstein 1D Walk diagnostics" : "Masoliver-Lindenbergh 2D Walk diagnostics"}</h3>
          <p className="text-xs text-slate-500">Model time {diagnostics?.time.toFixed(3) ?? "0.000"} · seed {config.seed}</p>
        </div>
        <button
          type="button"
          onClick={() => downloadRun(mode, config, diagnostics)}
          disabled={!diagnostics}
          className="rounded border border-blue-700 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download run JSON
        </button>
      </div>

      {diagnostics && mode === "kac-goldstein" && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Metric label="Mass" value={diagnostics.mass.toFixed(4)} />
            <Metric label="Mean β" value={diagnostics.mean.toFixed(4)} />
            <Metric label="Var β" value={diagnostics.variance.toFixed(4)} />
            <Metric label="Reversals" value={diagnostics.eventCount.toLocaleString()} />
            <Metric label="⟨eᵅ⁺ᵝ⟩" value={diagnostics.meanAx?.toFixed(4) ?? "—"} />
            <Metric label="⟨eᵅ⁻²ᵝ⟩" value={diagnostics.meanAz?.toFixed(4) ?? "—"} />
          </div>
          <div className="space-y-3">
            <PersistentWalkChart title="Density u(β)" values={diagnostics.density} reference={kacGoldsteinReference?.density} referenceLabel="2048-cell Fourier reference" labels="KacGoldstein walker density compared with the exact Fourier density reference." />
            <PersistentWalkChart title="Current J(β)" values={diagnostics.current ?? []} reference={kacGoldsteinReference?.current} referenceLabel="2048-cell Fourier reference" labels="KacGoldstein signed walker current compared with the exact Fourier current reference." symmetric />
          </div>
          <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
            <span className="block">Live-run error vs 2048-cell Fourier reference at α={diagnostics.time.toFixed(3)}: density relative L1 {kacGoldsteinDensityL1?.toFixed(4) ?? "—"}; current L1 per reference mass {kacGoldsteinCurrentL1?.toFixed(4) ?? "—"}.</span>
            Saved 320k-walker paper benchmark (separate from this live run): {referenceCase?.assessment?.status ?? (reference ? "case not found" : "loading")}; selected case density L1 mean {referenceCase?.assessment?.meanAt320k?.toFixed(4) ?? "—"}, 95% upper {referenceCase?.assessment?.ci95UpperAt320k?.toFixed(4) ?? "—"} (gate {referenceCase?.assessment?.densityGate?.toFixed(2) ?? "—"}).
            <span className="block mt-1">The paper benchmark includes six profile/order cases and populations {reference?.settings?.populations?.join(", ") ?? "—"}. {reference?.overallAssessment?.claim ?? ""}</span>
          </div>
          <PopulationRefinementChart rows={refinementRows} />
        </>
      )}

      {diagnostics && mode === "masoliver-lindenbergh" && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Metric label="Mass" value={diagnostics.mass.toFixed(4)} />
            <Metric label="MSD" value={diagnostics.meanSquareDisplacement?.toFixed(4) ?? "—"} />
            <Metric label="Theory MSD" value={analyticMsd?.toFixed(4) ?? "—"} />
            <Metric label="Cov XX" value={diagnostics.covarianceXX?.toFixed(4) ?? "—"} />
            <Metric label="Cov YY" value={diagnostics.covarianceYY?.toFixed(4) ?? "—"} />
            <Metric label="Cov XY" value={diagnostics.covarianceXY?.toFixed(4) ?? "—"} />
            <Metric label="Mean resets" value={diagnostics.walkers ? (diagnostics.eventCount / diagnostics.walkers).toFixed(3) : "—"} />
            <Metric label="Reference distance vt" value={diagnostics.frontRadius?.toFixed(3) ?? "—"} />
          </div>
          <PersistentWalkChart
            title="Radial displacement density in r/(vt)"
            values={diagnostics.density.map((value) => value * (diagnostics.frontRadius ?? 0))}
            reference={diagnostics.time > 0 && canCompareMasoliverLindenberghBaseline && referenceSnapshot
              ? resampleMasoliverLindenberghReferenceToNormalizedRadius(
                  referenceSnapshot,
                  reference?.protocol?.speed ?? 1,
                  diagnostics.density.length,
                )
              : undefined}
            labels="MasoliverLindenbergh radial probability density in normalized radius, with the saved 250 thousand walker reference when available."
          />
          <p className="text-xs text-slate-500">This curve measures displacement from each walker’s own start, so it is expected to look similar across initial position profiles. The shared Density Profile panel shows the current absolute x–y positions.</p>
          <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
            Saved paper reference: {reference?.protocol?.walkersPerSnapshot?.toLocaleString() ?? "—"} walkers per snapshot, seed {reference?.protocol?.seed ?? "—"}; resets λ={reference?.protocol?.poissonResetRate ?? "—"}, speed v={reference?.protocol?.speed ?? "—"}.
            {referenceMoment && <span className="block mt-1">Nearest saved snapshot t={referenceMoment.time}: measured MSD {referenceMoment.meanDisplacementSquared.toFixed(4)}, analytic MSD {referenceMoment.analyticMeanDisplacementSquared.toFixed(4)}. {canCompareMasoliverLindenberghBaseline ? "The radial shape overlay scales each run by its own causal radius vt." : "Radial overlay is hidden because current v or λ differs from the reference baseline."}</span>}
            {referenceError && <span className="block mt-1 text-amber-800">Saved reference file could not be loaded.</span>}
            <span className="block mt-1">The kinetic position-heading process is exact; the telegraph equation is only its long-scale approximation.</span>
          </div>
          {diagnostics.telegraphModes && <section className="space-y-2 rounded border border-slate-200 bg-slate-50 p-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Fourier-mode comparison with the telegraph approximation</h4>
              <p className="mt-1 text-xs text-slate-600">Uses each walker’s displacement from its own initial position, so the comparison applies to the selected initial position profile. It requires unbounded motion, positive reset rate, and no interparticle collisions. The telegraph modes are a long-time, long-distance approximation.</p>
              <p className="mt-1 text-xs text-slate-600">Current horizon: λt={diagnostics.telegraphModes.lambdaTime.toFixed(2)}. Modes use κ=k√(Dt), D=v²/(2λ). The table reports empirical and telegraph values with the empirical Monte Carlo standard error.</p>
            </div>
            <TelegraphModeHistoryChart history={telegraphModeHistory} />
            <div className="overflow-x-auto rounded border bg-white p-2">
              <table className="w-full text-left text-xs"><thead><tr className="text-slate-500"><th className="py-1 pr-3">κ</th><th className="py-1 pr-3">Walk</th><th className="py-1 pr-3">Telegraph</th><th className="py-1 pr-3">Absolute difference</th><th className="py-1">Monte Carlo SE</th></tr></thead>
                <tbody>{diagnostics.telegraphModes.modes.map((row) => <tr key={row.scaledWavenumber} className="border-t border-slate-100"><td className="py-1 pr-3">{row.scaledWavenumber}</td><td className="py-1 pr-3">{row.empirical.toFixed(4)}</td><td className="py-1 pr-3">{row.telegraph.toFixed(4)}</td><td className="py-1 pr-3">{row.absoluteDifference.toFixed(4)}</td><td className="py-1">{row.standardError.toFixed(4)}</td></tr>)}</tbody>
              </table>
            </div>
          </section>}
          {!diagnostics.telegraphModes && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Telegraph-mode comparison is unavailable for the current setup. Use unbounded motion, a positive reset rate, and disable interparticle collisions.</p>}
        </>
      )}
    </section>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-slate-50 p-2"><div className="text-xs text-slate-500">{label}</div><div className="font-mono">{value}</div></div>;
}
