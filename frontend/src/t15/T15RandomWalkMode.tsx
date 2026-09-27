import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createT15RunExport,
  T15RandomWalkSimulation,
  type T15Diagnostics,
  type T15Mode,
  type T15RunConfig,
} from "./t15RandomWalk";
import { t15aSpectralReference } from "./t15aReference";

interface CanvasProps {
  mode: T15Mode;
  config: T15RunConfig;
  isRunning: boolean;
  initializeVersion: number;
  resetVersion: number;
  onDiagnostics: (diagnostics: T15Diagnostics) => void;
  onStats: (time: number, events: number) => void;
  onComplete: (time: number, events: number) => void;
}

function drawWalkers(
  canvas: HTMLCanvasElement,
  simulation: T15RandomWalkSimulation,
  mode: T15Mode
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width <= 0 || height <= 0) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  if (mode === "t15a") {
    const xMin = -6;
    const xMax = 6;
    const midY = height / 2;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
    ctx.fillStyle = "rgba(37, 99, 235, 0.55)";
    ctx.beginPath();
    for (let i = 0; i < simulation.x.length; i += 1) {
      const x = simulation.x[i];
      if (x < xMin || x > xMax) continue;
      const px = ((x - xMin) / (xMax - xMin)) * width;
      const py = midY + (simulation.direction[i] > 0 ? -7 : 7);
      ctx.moveTo(px + 1.5, py);
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("β = −6", 8, height - 10);
    ctx.fillText("β = 6", Math.max(8, width - 42), height - 10);
    ctx.fillText("viewport only", 8, 18);
    return;
  }

  const radius = Math.max(simulation.config.speed * simulation.time, 0.5);
  const scaleRadius = radius * 1.08;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = Math.min(width, height) / (2 * scaleRadius);
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(37, 99, 235, 0.5)";
  ctx.beginPath();
  for (let i = 0; i < simulation.x.length; i += 1) {
    const px = centerX + simulation.x[i] * scale;
    const py = centerY - simulation.y[i] * scale;
    ctx.moveTo(px + 1.5, py);
    ctx.arc(px, py, 1.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "#334155";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(`causal front r = vt = ${radius.toFixed(2)}`, 8, 18);
}

export const T15RandomWalkCanvas: React.FC<CanvasProps> = ({
  mode,
  config,
  isRunning,
  initializeVersion,
  resetVersion,
  onDiagnostics,
  onStats,
  onComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<T15RandomWalkSimulation | null>(null);
  const completeRef = useRef(false);
  const onDiagnosticsRef = useRef(onDiagnostics);
  const onStatsRef = useRef(onStats);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => { onDiagnosticsRef.current = onDiagnostics; }, [onDiagnostics]);
  useEffect(() => { onStatsRef.current = onStats; }, [onStats]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  useEffect(() => {
    const simulation = new T15RandomWalkSimulation(mode, config);
    simulationRef.current = simulation;
    completeRef.current = false;
    onDiagnosticsRef.current(simulation.diagnostics());
    onStatsRef.current(0, 0);
  }, [mode, config, initializeVersion, resetVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      const simulation = simulationRef.current;
      if (simulation) drawWalkers(canvas, simulation, mode);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    let frameId = 0;
    let previousTime = 0;
    let lastDiagnosticsTime = 0;
    let lastStatsTime = 0;
    const horizon = mode === "t15a" ? 1 : 4;
    const modelTimePerSecond = horizon / 6;

    const renderFrame = (now: number) => {
      frameId = requestAnimationFrame(renderFrame);
      const simulation = simulationRef.current;
      if (!simulation) return;
      const elapsed = previousTime === 0 ? 0 : Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;

      if (isRunning && simulation.time < horizon) {
        const requestedDelta = elapsed * modelTimePerSecond;
        simulation.advance(Math.min(requestedDelta, horizon - simulation.time));
        if (simulation.time >= horizon && !completeRef.current) {
          completeRef.current = true;
          onCompleteRef.current(simulation.time, simulation.events);
        }
      }

      const canvas = canvasRef.current;
      if (canvas && now - lastStatsTime >= 50) {
        drawWalkers(canvas, simulation, mode);
        onStatsRef.current(simulation.time, simulation.events);
        lastStatsTime = now;
      }
      if (lastDiagnosticsTime === 0 || now - lastDiagnosticsTime >= 200) {
        onDiagnosticsRef.current(simulation.diagnostics());
        lastDiagnosticsTime = now;
      }
    };

    frameId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(frameId);
  }, [mode, isRunning]);

  return (
    <div className="h-full min-h-64 flex flex-col rounded-lg border bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600">
        <span>{mode === "t15a" ? "Bianchi I · velocity-flip walkers" : "Euclidean plane · persistent walkers"}</span>
        <span>{config.walkers.toLocaleString()} walkers</span>
      </div>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={mode === "t15a"
          ? "One-dimensional T15a walkers on the beta line; the visible interval is a viewport only."
          : "Two-dimensional T15b walkers with the causal front shown as a dashed circle."}
        className="min-h-0 flex-1 rounded bg-slate-50"
        style={{ width: "100%", height: "100%" }}
      />
      <p className="mt-2 text-xs text-slate-500">
        {mode === "t15a"
          ? "The β display window does not impose a boundary. Direction reversals occur independently for each walker."
          : "The dashed circle is the finite-speed front r = vt, not a boundary. Heading resets occur independently for each walker."}
      </p>
    </div>
  );
};

interface ReferenceData {
  task?: string;
  settings?: { populations?: number[]; rootSeed?: number };
  cases?: Array<{
    profile: string;
    ordering: string;
    assessment?: { status?: string; densityGate?: number; meanAt320k?: number; ci95UpperAt320k?: number };
  }>;
  overallAssessment?: { status?: string; claim?: string };
  protocol?: { seed?: number; walkersPerSnapshot?: number; times?: number[]; speed?: number; poissonResetRate?: number };
  radialSnapshots?: Array<{ time: number; walkers: number; radius: number[]; radialProbabilityDensity: number[] }>;
  momentResults?: Array<{ time: number; meanDisplacementSquared: number; analyticMeanDisplacementSquared: number }>;
  checks?: { allMsdEstimatesWithinThreeStandardErrors?: boolean; causalFrontObserved?: boolean };
}

type T15bReferenceSnapshot = NonNullable<ReferenceData["radialSnapshots"]>[number];

interface DiagnosticsProps {
  mode: T15Mode;
  config: T15RunConfig;
  diagnostics: T15Diagnostics | null;
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

function T15Chart({
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

function downloadRun(mode: T15Mode, config: T15RunConfig, diagnostics: T15Diagnostics | null) {
  if (!diagnostics) return;
  const payload = createT15RunExport(mode, config, diagnostics);
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${mode}-seed-${config.seed}-t${diagnostics.time.toFixed(3)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const T15DiagnosticsPanel: React.FC<DiagnosticsProps> = ({ mode, config, diagnostics }) => {
  const [reference, setReference] = useState<ReferenceData | null>(null);
  const [referenceError, setReferenceError] = useState(false);
  const t15aReference = useMemo(() => mode === "t15a" && diagnostics
    ? t15aSpectralReference(config.profile, config.ordering, diagnostics.time, diagnostics.density.length)
    : null,
  [mode, config.profile, config.ordering, diagnostics?.time, diagnostics?.density.length]);
  const t15aDensityL1 = t15aReference && diagnostics
    ? diagnostics.density.reduce((sum, value, index) => sum + Math.abs(value - t15aReference.density[index]), 0)
      * ((t15aReference.domain[1] - t15aReference.domain[0]) / diagnostics.density.length)
    : undefined;
  const t15aCurrentL1 = t15aReference && diagnostics?.current
    ? diagnostics.current.reduce((sum, value, index) => sum + Math.abs(value - t15aReference.current[index]), 0)
      * ((t15aReference.domain[1] - t15aReference.domain[0]) / diagnostics.current.length)
    : undefined;

  useEffect(() => {
    let cancelled = false;
    const file = mode === "t15a" ? "t15a-bianchi-i-v1.json" : "t15b-euclidean-v1.json";
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

  const referenceSnapshot = mode === "t15b" && reference?.radialSnapshots
    ? reference.radialSnapshots.reduce<T15bReferenceSnapshot | null>((best, row) => {
      if (!diagnostics) return best;
      if (!best || Math.abs(row.time - diagnostics.time) < Math.abs(best.time - diagnostics.time)) return row;
      return best;
    }, null)
    : null;
  const referenceCase = mode === "t15a" ? reference?.cases?.find((row) =>
    row.profile === (config.profile === "centered" ? "centered-single-bump" : config.profile === "bimodal" ? "symmetric-bimodal" : "asymmetric-nonzero-current")
    && row.ordering === (config.ordering === "reduced" ? "reduced-laplace-beltrami" : "manuscript-derivative-only")
  ) : null;
  const referenceMoment = mode === "t15b" && reference?.momentResults && diagnostics
    ? reference.momentResults.reduce<NonNullable<ReferenceData["momentResults"]>[number] | null>((best, row) => {
      if (!best || Math.abs(row.time - diagnostics.time) < Math.abs(best.time - diagnostics.time)) return row;
      return best;
    }, null)
    : null;
  const canCompareT15bBaseline = mode === "t15b"
    && config.speed === reference?.protocol?.speed
    && config.resetRate === reference?.protocol?.poissonResetRate;
  const analyticMsd = diagnostics && mode === "t15b"
    ? config.resetRate > 0
      ? (2 * config.speed * config.speed / (config.resetRate * config.resetRate)) * (config.resetRate * diagnostics.time - 1 + Math.exp(-config.resetRate * diagnostics.time))
      : config.speed * config.speed * diagnostics.time * diagnostics.time
    : undefined;

  return (
    <section className="h-full overflow-auto rounded-lg border bg-white p-4" aria-label="T15 research diagnostics">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{mode === "t15a" ? "T15a diagnostics" : "T15b diagnostics"}</h3>
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

      {diagnostics && mode === "t15a" && (
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
            <T15Chart title="Density u(β)" values={diagnostics.density} reference={t15aReference?.density} referenceLabel="2048-cell Fourier reference" labels="T15a walker density compared with the exact Fourier density reference." />
            <T15Chart title="Current J(β)" values={diagnostics.current ?? []} reference={t15aReference?.current} referenceLabel="2048-cell Fourier reference" labels="T15a signed walker current compared with the exact Fourier current reference." symmetric />
          </div>
          <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
            <span className="block">Live-run error vs 2048-cell Fourier reference at α={diagnostics.time.toFixed(3)}: density relative L1 {t15aDensityL1?.toFixed(4) ?? "—"}; current L1 per reference mass {t15aCurrentL1?.toFixed(4) ?? "—"}.</span>
            Saved 320k-walker paper benchmark (separate from this live run): {referenceCase?.assessment?.status ?? (reference ? "case not found" : "loading")}; selected case density L1 mean {referenceCase?.assessment?.meanAt320k?.toFixed(4) ?? "—"}, 95% upper {referenceCase?.assessment?.ci95UpperAt320k?.toFixed(4) ?? "—"} (gate {referenceCase?.assessment?.densityGate?.toFixed(2) ?? "—"}).
            <span className="block mt-1">The paper benchmark includes six profile/order cases and populations {reference?.settings?.populations?.join(", ") ?? "—"}. {reference?.overallAssessment?.claim ?? ""}</span>
          </div>
        </>
      )}

      {diagnostics && mode === "t15b" && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <Metric label="Mass" value={diagnostics.mass.toFixed(4)} />
            <Metric label="MSD" value={diagnostics.meanSquareDisplacement?.toFixed(4) ?? "—"} />
            <Metric label="Theory MSD" value={analyticMsd?.toFixed(4) ?? "—"} />
            <Metric label="Cov XX" value={diagnostics.covarianceXX?.toFixed(4) ?? "—"} />
            <Metric label="Cov YY" value={diagnostics.covarianceYY?.toFixed(4) ?? "—"} />
            <Metric label="Cov XY" value={diagnostics.covarianceXY?.toFixed(4) ?? "—"} />
            <Metric label="Mean resets" value={diagnostics.walkers ? (diagnostics.eventCount / diagnostics.walkers).toFixed(3) : "—"} />
            <Metric label="Causal radius vt" value={diagnostics.frontRadius?.toFixed(3) ?? "—"} />
          </div>
          <T15Chart
            title="Radial density in normalized radius r/(vt)"
            values={diagnostics.density.map((value) => value * (diagnostics.frontRadius ?? 0))}
            reference={diagnostics.time > 0 && canCompareT15bBaseline && referenceSnapshot
              ? referenceSnapshot.radialProbabilityDensity.map((value) => value * referenceSnapshot.time * (reference?.protocol?.speed ?? 1))
              : undefined}
            labels="T15b radial probability density in normalized radius, with the saved 250 thousand walker reference when available."
          />
          <div className="mt-3 rounded bg-slate-50 p-3 text-xs text-slate-600">
            Saved paper reference: {reference?.protocol?.walkersPerSnapshot?.toLocaleString() ?? "—"} walkers per snapshot, seed {reference?.protocol?.seed ?? "—"}; resets λ={reference?.protocol?.poissonResetRate ?? "—"}, speed v={reference?.protocol?.speed ?? "—"}.
            {referenceMoment && <span className="block mt-1">Nearest saved snapshot t={referenceMoment.time}: measured MSD {referenceMoment.meanDisplacementSquared.toFixed(4)}, analytic MSD {referenceMoment.analyticMeanDisplacementSquared.toFixed(4)}. {canCompareT15bBaseline ? "The radial shape overlay scales each run by its own causal radius vt." : "Radial overlay is hidden because current v or λ differs from the reference baseline."}</span>}
            {referenceError && <span className="block mt-1 text-amber-800">Saved reference file could not be loaded.</span>}
            <span className="block mt-1">The kinetic position-heading process is exact; the telegraph equation is only its long-scale approximation.</span>
          </div>
        </>
      )}
    </section>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded bg-slate-50 p-2"><div className="text-xs text-slate-500">{label}</div><div className="font-mono">{value}</div></div>;
}
