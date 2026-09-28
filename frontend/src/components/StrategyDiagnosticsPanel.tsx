import React, { useMemo } from 'react';
import {
  fitGrowthExponent,
  type StrategyDiagnosticsSnapshot,
} from '../physics/diagnostics/strategyDiagnostics';

interface Point { x: number; y: number }
interface Series { name: string; color: string; points: Point[] }

const COLORS = ['#2563eb', '#ea580c', '#059669', '#9333ea', '#dc2626', '#0891b2', '#65a30d', '#c026d3'];

function formatTick(value: number): string {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value) >= 1000 || (Math.abs(value) > 0 && Math.abs(value) < 0.01)) return value.toExponential(1);
  return Number(value.toPrecision(3)).toString();
}

function linePath(points: Point[], xMap: (value: number) => number, yMap: (value: number) => number): string {
  return points.map((point, index) => `${index ? 'L' : 'M'}${xMap(point.x).toFixed(1)},${yMap(point.y).toFixed(1)}`).join(' ');
}

function DiagnosticChart({
  title,
  subtitle,
  series,
  xLabel,
  yLabel,
  logX = false,
  logY = false,
}: {
  title: string;
  subtitle?: string;
  series: Series[];
  xLabel: string;
  yLabel: string;
  logX?: boolean;
  logY?: boolean;
}) {
  const width = 720;
  const height = 250;
  const margin = { left: 62, right: 18, top: 22, bottom: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const valid = series.flatMap((line) => line.points).filter((point) =>
    Number.isFinite(point.x) && Number.isFinite(point.y) && (!logX || point.x > 0) && (!logY || point.y > 0)
  );
  if (valid.length < 2) {
    return <section className="rounded border bg-white p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">Run the simulation to collect samples.</div>
    </section>;
  }
  const tx = (value: number) => logX ? Math.log10(value) : value;
  const ty = (value: number) => logY ? Math.log10(value) : value;
  let xMin = Math.min(...valid.map((point) => tx(point.x)));
  let xMax = Math.max(...valid.map((point) => tx(point.x)));
  let yMin = Math.min(...valid.map((point) => ty(point.y)));
  let yMax = Math.max(...valid.map((point) => ty(point.y)));
  if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }
  if (yMin === yMax) { yMin -= 0.5; yMax += 0.5; }
  const xPad = (xMax - xMin) * 0.04;
  const yPad = (yMax - yMin) * 0.08;
  xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;
  const xMap = (value: number) => margin.left + ((tx(value) - xMin) / (xMax - xMin)) * plotWidth;
  const yMap = (value: number) => margin.top + plotHeight - ((ty(value) - yMin) / (yMax - yMin)) * plotHeight;
  const xTicks = Array.from({ length: 5 }, (_item, index) => xMin + ((xMax - xMin) * index) / 4);
  const yTicks = Array.from({ length: 5 }, (_item, index) => yMin + ((yMax - yMin) * index) / 4);

  return <section className="min-w-0 rounded border bg-white p-3">
    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={title}>
      {xTicks.map((tick, index) => <g key={`x-${index}`}>
        <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight - (index / 4) * plotHeight} y2={margin.top + plotHeight - (index / 4) * plotHeight} stroke="#e2e8f0" />
        <text x={margin.left + (index / 4) * plotWidth} y={height - margin.bottom + 17} textAnchor="middle" fontSize="10" fill="#64748b">{formatTick(logX ? 10 ** tick : tick)}</text>
      </g>)}
      {yTicks.map((tick, index) => <g key={`y-${index}`}>
        <line x1={margin.left + (index / 4) * plotWidth} x2={margin.left + (index / 4) * plotWidth} y1={margin.top} y2={margin.top + plotHeight} stroke="#f1f5f9" />
        <text x={margin.left - 7} y={margin.top + plotHeight - (index / 4) * plotHeight + 3} textAnchor="end" fontSize="10" fill="#64748b">{formatTick(logY ? 10 ** tick : tick)}</text>
      </g>)}
      <line x1={margin.left} x2={width - margin.right} y1={margin.top + plotHeight} y2={margin.top + plotHeight} stroke="#64748b" />
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotHeight} stroke="#64748b" />
      {series.map((line) => {
        const points = line.points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && (!logX || point.x > 0) && (!logY || point.y > 0));
        return points.length > 1 ? <path key={line.name} d={linePath(points, xMap, yMap)} fill="none" stroke={line.color} strokeWidth="2" /> : null;
      })}
      <text x={margin.left + plotWidth / 2} y={height - 8} textAnchor="middle" fontSize="11" fill="#334155">{xLabel}{logX ? ' (log)' : ''}</text>
      <text transform={`translate(14 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="#334155">{yLabel}{logY ? ' (log)' : ''}</text>
    </svg>
    {series.length > 1 && <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {series.map((line) => <span key={line.name} className="inline-flex items-center gap-1"><i className="inline-block h-2 w-3" style={{ backgroundColor: line.color }} />{line.name}</span>)}
    </div>}
  </section>;
}

function ccdf(values: number[]): Point[] {
  const sorted = values.filter((value) => value > 0 && Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length < 2) return [];
  const stride = Math.max(1, Math.floor(sorted.length / 180));
  const result: Point[] = [];
  for (let i = 0; i < sorted.length; i += stride) result.push({ x: sorted[i], y: (sorted.length - i) / sorted.length });
  const last = sorted.length - 1;
  if (result[result.length - 1]?.x !== sorted[last]) result.push({ x: sorted[last], y: 1 / sorted.length });
  return result;
}

function TrajectoryPlot({ trails, comparisonTrails = [], comparisonLabel = 'comparison' }: {
  trails: StrategyDiagnosticsSnapshot['trails'];
  comparisonTrails?: StrategyDiagnosticsSnapshot['trails'];
  comparisonLabel?: string;
}) {
  const width = 720;
  const height = 330;
  const margin = 24;
  const all = [...trails, ...comparisonTrails].flatMap((trail) => trail.points);
  if (all.length < 2) return <section className="rounded border bg-white p-3"><h4 className="text-sm font-semibold">Representative trajectories</h4><div className="flex h-52 items-center justify-center text-sm text-slate-500">Trajectory samples will appear as the walk advances.</div></section>;
  let xMin = Math.min(...all.map((point) => point.x));
  let xMax = Math.max(...all.map((point) => point.x));
  let yMin = Math.min(...all.map((point) => point.y));
  let yMax = Math.max(...all.map((point) => point.y));
  if (xMin === xMax) { xMin -= 1; xMax += 1; }
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const xPad = (xMax - xMin) * 0.04;
  const yPad = (yMax - yMin) * 0.04;
  xMin -= xPad; xMax += xPad; yMin -= yPad; yMax += yPad;
  const xMap = (x: number) => margin + ((x - xMin) / (xMax - xMin)) * (width - 2 * margin);
  const yMap = (y: number) => height - margin - ((y - yMin) / (yMax - yMin)) * (height - 2 * margin);
  return <section className="min-w-0 rounded border bg-white p-3">
    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2"><h4 className="text-sm font-semibold">Representative trajectories</h4><span className="text-xs text-slate-500">Selected walkers; event markers show turns and jumps</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-label="Representative random walk trajectories">
      <rect x={margin} y={margin} width={width - margin * 2} height={height - margin * 2} fill="#f8fafc" stroke="#cbd5e1" />
      {trails.map((trail, index) => <g key={trail.id}>
        <path d={linePath(trail.points, xMap, yMap)} fill="none" stroke={COLORS[index % COLORS.length]} strokeWidth="1.5" strokeOpacity="0.8" />
        {trail.points.filter((point) => point.event).map((point, markerIndex) => point.event === 'jump'
          ? <rect key={markerIndex} x={xMap(point.x) - 3} y={yMap(point.y) - 3} width="6" height="6" fill={COLORS[index % COLORS.length]} stroke="white" />
          : point.event === 'wait'
            ? <path key={markerIndex} d={`M${xMap(point.x)},${yMap(point.y) - 4} l4,7 h-8 z`} fill="#f59e0b" stroke="white" />
            : <circle key={markerIndex} cx={xMap(point.x)} cy={yMap(point.y)} r="3.2" fill={COLORS[index % COLORS.length]} stroke="white" />)}
      </g>)}
      {comparisonTrails.map((trail, index) => <path key={`comparison-${trail.id}`} d={linePath(trail.points, xMap, yMap)} fill="none" stroke="#64748b" strokeWidth="1.2" strokeDasharray="4 4" strokeOpacity="0.7" />)}
      <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="11" fill="#334155">position x</text>
      <text x="10" y={height / 2} transform={`rotate(-90 10 ${height / 2})`} textAnchor="middle" fontSize="11" fill="#334155">position y</text>
    </svg>
    <div className="flex flex-wrap gap-4 text-xs text-slate-600"><span>● Turn / reset</span><span>■ Discrete jump</span><span>▲ Wait ends / jump starts</span>{comparisonTrails.length > 0 && <span>Dashed paths: {comparisonLabel}</span>}</div>
  </section>;
}

function comparableSetups(a: StrategyDiagnosticsSnapshot, b: StrategyDiagnosticsSnapshot): boolean {
  const configA = a.config;
  const configB = b.config;
  const speedA = configA.parameters.velocity ?? configA.parameters.speed ?? 1;
  const speedB = configB.parameters.velocity ?? configB.parameters.speed ?? 1;
  const rateA = configA.parameters.collisionRate ?? configA.parameters.flipRate ?? configA.parameters.resetRate ?? 0;
  const rateB = configB.parameters.collisionRate ?? configB.parameters.flipRate ?? configB.parameters.resetRate ?? 0;
  const strategyParameters: Record<string, string[]> = {
    levy: ['levyAlpha', 'levyScale'],
    fractional: ['fractionalBeta', 'fractionalWaitingScale', 'fractionalJumpLength'],
    t15a: ['ordering'],
  };
  const sameStrategyParameters = configA.strategy !== configB.strategy
    || (strategyParameters[configA.strategy] ?? []).every((key) => {
      const valueA = configA.parameters[key];
      const valueB = configB.parameters[key];
      return valueA !== undefined && valueB !== undefined && Math.abs(valueA - valueB) < 1e-9;
    });
  return configA.seed === configB.seed
    && configA.dimension === configB.dimension
    && configA.particleCount === configB.particleCount
    && configA.initialDistribution === configB.initialDistribution
    && configA.boundary === configB.boundary
    && Math.abs(speedA - speedB) < 1e-9
    && Math.abs(rateA - rateB) < 1e-9
    && sameStrategyParameters;
}

function comparisonSpreadKind(snapshot: StrategyDiagnosticsSnapshot): 'msd' | 'medianR2' {
  return snapshot.config.strategy === 'levy' ? 'medianR2' : 'msd';
}

export function StrategyDiagnosticsPanel({ snapshot, comparison, onCaptureComparison, onClearComparison }: {
  snapshot: StrategyDiagnosticsSnapshot | null;
  comparison: StrategyDiagnosticsSnapshot | null;
  onCaptureComparison: () => void;
  onClearComparison: () => void;
}) {
  const diagnostics = useMemo(() => {
    if (!snapshot) return null;
    const strategy = snapshot.config.strategy;
    const isLevy = strategy === 'levy';
    const spreadMetric = isLevy ? 'medianR2' : 'msd';
    const exponent = fitGrowthExponent(snapshot.spread, spreadMetric);
    const spreadName = isLevy ? 'Median squared radius' : 'Mean squared displacement';
    const spreadSeries: Series[] = [
      { name: spreadName, color: COLORS[0], points: snapshot.spread.map((sample) => ({ x: sample.time, y: sample[spreadMetric] })) },
      { name: '90th-percentile radius²', color: COLORS[1], points: snapshot.spread.map((sample) => ({ x: sample.time, y: sample.p90Radius ** 2 })) },
    ];
    const radialSeries = snapshot.radialDensity.map((sample, index) => ({
      name: `t=${formatTick(sample.time)}`,
      color: COLORS[index % COLORS.length],
      points: sample.radii.map((radius, pointIndex) => ({ x: radius, y: sample.density[pointIndex] })),
    }));
    const eventSeries: Series[] = [{ name: 'Events per particle', color: COLORS[2], points: snapshot.spread.map((sample) => ({ x: sample.time, y: sample.eventsPerParticle })) }];
    const hasVelocityState = !['levy', 'fractional'].includes(strategy);
    const correlationSeries: Series[] = hasVelocityState ? [{
      name: 'Initial velocity correlation', color: COLORS[3],
      points: snapshot.spread.filter((sample) => sample.velocityCorrelation !== null).map((sample) => ({ x: sample.time, y: sample.velocityCorrelation! })),
    }] : [];
    return { exponent, isLevy, spreadName, spreadSeries, radialSeries, eventSeries, correlationSeries, hasVelocityState };
  }, [snapshot]);

  if (!snapshot || !diagnostics) return null;
  const { config } = snapshot;
  const comparisonIsLikeForLike = comparison ? comparableSetups(snapshot, comparison) : false;
  const comparisonMetricMatches = comparison && comparisonSpreadKind(snapshot) === comparisonSpreadKind(comparison);
  const comparisonLabel = comparison ? `${comparison.config.strategy} run` : 'comparison';
  const metric = diagnostics.isLevy ? 'medianR2' : 'msd';
  const spreadSeries = [...diagnostics.spreadSeries];
  const eventSeries = [...diagnostics.eventSeries];
  const correlationSeries = [...diagnostics.correlationSeries];
  const radialSeries = [...diagnostics.radialSeries];
  if (comparison && comparisonIsLikeForLike) {
    if (comparisonMetricMatches) spreadSeries.push({ name: `${comparisonLabel} · ${comparisonSpreadKind(comparison) === 'medianR2' ? 'median r²' : 'MSD'}`, color: '#64748b', points: comparison.spread.map((sample) => ({ x: sample.time, y: sample[metric] })) });
    eventSeries.push({ name: comparisonLabel, color: '#64748b', points: comparison.spread.map((sample) => ({ x: sample.time, y: sample.eventsPerParticle })) });
    const currentHasVelocity = !['levy', 'fractional'].includes(config.strategy);
    const comparisonHasVelocity = !['levy', 'fractional'].includes(comparison.config.strategy);
    if (currentHasVelocity && comparisonHasVelocity) correlationSeries.push({ name: comparisonLabel, color: '#64748b', points: comparison.spread.filter((sample) => sample.velocityCorrelation !== null).map((sample) => ({ x: sample.time, y: sample.velocityCorrelation! })) });
    if (comparison.config.dimension === config.dimension) {
      radialSeries.push(...comparison.radialDensity.map((sample, index) => ({
        name: `${comparisonLabel} · t=${formatTick(sample.time)}`,
        color: COLORS[(index + 4) % COLORS.length],
        points: sample.radii.map((radius, pointIndex) => ({ x: radius, y: sample.density[pointIndex] })),
      })));
    }
  }
  const extentIsLimited = config.boundary !== 'unbounded';
  const showWaitAndJump = !['simple', 'ballistic'].includes(config.strategy);
  const exponentText = diagnostics.exponent === null ? 'collecting more points' : diagnostics.exponent.toFixed(2);

  return <section className="mt-4 space-y-3 rounded-lg border border-slate-300 bg-slate-100 p-4" aria-label="Random walk strategy diagnostics">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Strategy diagnostics</h2>
      <p className="mt-1 text-xs text-slate-600">
        {config.strategy} · {config.dimension} · seed {config.seed} · {config.particleCount.toLocaleString()} walkers · {config.initialDistribution} initial state · {config.boundary} boundary · t={formatTick(snapshot.time)} · {snapshot.totalEvents.toLocaleString()} events · {snapshot.activeParticles.toLocaleString()} active
      </p>
      <p className="mt-1 text-xs text-slate-500">{Object.entries(config.parameters).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => `${key}=${formatTick(value)}`).join(' · ')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onCaptureComparison} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">Use this run as comparison</button>
        {comparison && <button type="button" onClick={onClearComparison} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">Clear comparison</button>}
        {comparison && <span className={`text-xs ${comparisonIsLikeForLike ? 'text-emerald-700' : 'text-amber-700'}`}>
          {comparisonIsLikeForLike ? `Overlaying matching setup: ${comparisonLabel}` : `Comparison paused: ${comparisonLabel} differs in seed, dimension, count, initial state, boundary, speed, event rate, or strategy parameters.`}
        </span>}
      </div>
      {comparison && comparisonIsLikeForLike && !comparisonMetricMatches && <p className="mt-1 text-xs text-amber-700">Spread overlay is omitted because the saved run uses a different spread statistic (MSD versus median radius²).</p>}
      <p className="mt-1 text-xs text-slate-600">
        Like-for-like runs should keep seed, dimension, walker count, initial distribution, and boundaries fixed. The curves describe this run’s observed domain; finite boundaries can reflect, wrap, or absorb walkers and truncate tail statistics.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <DiagnosticChart title="Ensemble spread" subtitle={`Log-log slope estimate: ${exponentText} · fitted from later positive-time samples`} series={spreadSeries} xLabel="simulation time" yLabel={diagnostics.spreadName} logX logY />
      <DiagnosticChart title="Events per particle" subtitle="Cumulative strategy events divided by the original ensemble size" series={eventSeries} xLabel="simulation time" yLabel="events / particle" />
      <DiagnosticChart title="Velocity / heading correlation" subtitle={diagnostics.hasVelocityState ? 'Ensemble correlation with each walker’s initial velocity' : 'Not defined for this jump-and-wait process'} series={correlationSeries} xLabel="lag from start" yLabel="C(t)" />
      <DiagnosticChart title="Radial displacement density" subtitle="Normalized displacement radius relative to each walker’s initial position; each snapshot is independently normalized" series={radialSeries} xLabel="displacement radius" yLabel={config.dimension === '2D' ? 'probability / area' : 'probability / length'} />
      {showWaitAndJump && <>
        <DiagnosticChart title={diagnostics.isLevy ? 'Sampled jump-length CCDF' : 'Flight / jump-length CCDF'} subtitle={diagnostics.isLevy ? 'Pareto lengths drawn by the strategy; boundary-transformed displacement may differ' : 'For persistent runs, length means speed × sampled wait; for discrete walks it is the jump size'} series={[{ name: 'Current · P(L ≥ ℓ)', color: COLORS[0], points: ccdf(snapshot.jumpSamples) }, ...(comparisonIsLikeForLike && comparison ? [{ name: `${comparisonLabel} · P(L ≥ ℓ)`, color: '#64748b', points: ccdf(comparison.jumpSamples) }] : [])]} xLabel="length" yLabel="complementary probability" logX logY />
        <DiagnosticChart title="Waiting-time CCDF" subtitle="Inter-event times sampled by the active strategy" series={[{ name: 'Current · P(τ ≥ t)', color: COLORS[1], points: ccdf(snapshot.waitSamples) }, ...(comparisonIsLikeForLike && comparison ? [{ name: `${comparisonLabel} · P(τ ≥ t)`, color: '#64748b', points: ccdf(comparison.waitSamples) }] : [])]} xLabel="waiting time" yLabel="complementary probability" logX logY />
      </>}
      <TrajectoryPlot trails={snapshot.trails} comparisonTrails={comparisonIsLikeForLike && comparison ? comparison.trails : []} comparisonLabel={comparisonLabel} />
    </div>
    <p className="text-xs text-slate-500">
      Spread uses {diagnostics.isLevy ? 'median squared radius because the ordinary MSD is unstable for this heavy-tailed process' : 'ensemble MSD'}; the exponent is a descriptive fit over the latter 65% of sampled positive-time data, not a universal law. Event histograms are capped reservoir samples for long-run memory control.
      {extentIsLimited ? ' The selected finite boundary can clip or transform path lengths; compare only runs with the same boundary and geometry.' : ' This run has no physical boundary.'}
    </p>
  </section>;
}
