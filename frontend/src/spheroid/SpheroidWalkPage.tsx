import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createLivePersistentSimulation, LIVE_STEP_COUNT_DEFAULT, LIVE_STEP_COUNT_MAX, LIVE_STEP_COUNT_MIN, liveRunHorizon, spheroidGeometry, spheroidSurfaceArea, spheroidVolume } from './spheroid-model.mjs';
import { DEFAULT_SPHEROID_WALK_UI_STATE, useAppStore, type SpheroidConstraint, type SpheroidMetric } from '../stores/appStore';

type RunData = {
  schema: string;
  provenance: { repositoryRevision: string };
  specification: { sha256: string };
  parameters: { qMin: number; qMax: number; velocity: number; lambda: number; finalTime: number; outputStep: number };
  profiles: Array<{
    profile: { id: string; label: string; eta: number };
    reference: { q: number[]; frames: Array<{ time: number; density: number[]; current: number[] }>; observables: Array<MetricFrame>; massDriftMax: number };
    liveComparison: {
      reference: { q: number[]; frames: Array<{ time: number; density: number[]; current: number[] }>; observables: Array<MetricFrame> };
      diffusiveControl: { frames: Array<MetricFrame & { density: number[] }> };
    };
    ensembleFrames: Array<MetricFrame & { density: number[]; current: number[] }>;
    representative: { seed: number; path: Array<{ time: number; q: number; r: number; sigma: number }>; eventLog: Array<{ time: number; type: string }> };
    refinement: Array<{ population: number; relativeL1: { mean: number; ci95: number }; meanR: { mean: number; ci95: number } }>;
    diffusiveControl: { frames: Array<MetricFrame & { density: number[] }> };
  }>;
};

type MetricFrame = { time: number; meanQ: number; meanR: number; meanArea: number; meanVolume?: number; meanPoleCurvature: number; meanEquatorCurvature: number };
type LiveFrame = MetricFrame & { density: number[]; current: number[]; mass: number; pathPoint: { time: number; q: number; r: number; sigma: number }; totalFlips: number; totalReflections: number; eventLog: Array<{ time: number; type: string }> };

function densityAtTime(frames: Array<{ time: number; density: number[] }>, time: number, outputStep: number) {
  if (!frames.length) return [];
  if (time > frames[frames.length - 1].time + 1e-10) return [];
  const lowerIndex = Math.max(0, Math.min(frames.length - 1, Math.floor(time / outputStep)));
  const upperIndex = Math.min(frames.length - 1, lowerIndex + 1);
  const lower = frames[lowerIndex], upper = frames[upperIndex];
  const fraction = upperIndex === lowerIndex ? 0 : Math.max(0, Math.min(1, (time - lower.time) / (upper.time - lower.time)));
  return lower.density.map((value, index) => value + ((upper.density[index] ?? value) - value) * fraction);
}

function metricsFromDensityFrames(frames: Array<{ time: number; density: number[] }>, qCenters: number[], dq: number, constraint: SpheroidConstraint): MetricFrame[] {
  const perBin = qCenters.map((q) => ({
    meanQ: q,
    meanR: Math.exp(-3 * q),
    meanArea: spheroidSurfaceArea(q, 1, constraint),
    meanVolume: spheroidVolume(q, 1, constraint),
    meanPoleCurvature: spheroidGeometry(q, 0, 1, constraint).gaussianCurvature,
    meanEquatorCurvature: spheroidGeometry(q, Math.PI / 2, 1, constraint).gaussianCurvature,
  }));
  return frames.map((frame) => {
    const metric: MetricFrame = { time: frame.time, meanQ: 0, meanR: 0, meanArea: 0, meanVolume: 0, meanPoleCurvature: 0, meanEquatorCurvature: 0 };
    frame.density.forEach((density, index) => {
      const weight = density * dq;
      const values = perBin[index];
      metric.meanQ += weight * values.meanQ;
      metric.meanR += weight * values.meanR;
      metric.meanArea += weight * values.meanArea;
      metric.meanVolume = (metric.meanVolume ?? 0) + weight * values.meanVolume;
      metric.meanPoleCurvature += weight * values.meanPoleCurvature;
      metric.meanEquatorCurvature += weight * values.meanEquatorCurvature;
    });
    return metric;
  });
}

function Surface({ q, curvature, constraint }: { q: number; curvature: boolean; constraint: SpheroidConstraint }) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<{ renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls; mesh: THREE.Mesh; frame: number } | null>(null);
  useEffect(() => {
    if (!host.current) return;
    const target = host.current;
    const world = new THREE.Scene(); world.background = new THREE.Color('#f8fafc');
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100); camera.position.set(5.5, 4.5, 5.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(window.devicePixelRatio); target.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    world.add(new THREE.HemisphereLight(0xffffff, 0x475569, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2); light.position.set(4, 5, 3); world.add(light);
    const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide, vertexColors: true });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material); world.add(mesh);
    const resize = () => { const width = target.clientWidth; const height = target.clientHeight; if (!width || !height) return; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(target); resize();
    const render = () => { const current = scene.current; if (!current) return; current.frame = requestAnimationFrame(render); current.controls.update(); current.renderer.render(world, current.camera); };
    scene.current = { renderer, camera, controls, mesh, frame: 0 }; render();
    return () => { observer.disconnect(); cancelAnimationFrame(scene.current?.frame ?? 0); controls.dispose(); mesh.geometry.dispose(); material.dispose(); renderer.dispose(); target.removeChild(renderer.domElement); scene.current = null; };
  }, []);
  useEffect(() => {
    const current = scene.current; if (!current) return;
    const geometry = new THREE.BufferGeometry();
    const thetaSegments = 42, phiSegments = 72;
    const positions: number[] = [], colors: number[] = [], indices: number[] = [];
    const K = (theta: number) => spheroidGeometry(q, theta, 1, constraint).gaussianCurvature;
    const kPole = spheroidGeometry(q, 0, 1, constraint).gaussianCurvature;
    const kEquator = spheroidGeometry(q, Math.PI / 2, 1, constraint).gaussianCurvature;
    const kMin = Math.min(kPole, kEquator), kMax = Math.max(kPole, kEquator);
    for (let i = 0; i <= thetaSegments; i++) {
      const theta = Math.PI * i / thetaSegments;
      for (let j = 0; j <= phiSegments; j++) {
        const phi = 2 * Math.PI * j / phiSegments;
        const g = spheroidGeometry(q, theta, 1, constraint);
        positions.push(g.a * Math.sin(theta) * Math.cos(phi), g.a * Math.sin(theta) * Math.sin(phi), g.c * Math.cos(theta));
        const color = new THREE.Color();
        color.setHSL(curvature ? 0.66 * (1 - (K(theta) - kMin) / Math.max(kMax - kMin, 1e-12)) : 0.54, 0.78, 0.55);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let i = 0; i < thetaSegments; i++) for (let j = 0; j < phiSegments; j++) {
      const a = i * (phiSegments + 1) + j, b = a + phiSegments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    current.mesh.geometry.dispose(); current.mesh.geometry = geometry;
    current.camera.lookAt(0, 0, 0);
  }, [q, curvature, constraint]);
  return <div ref={host} className="h-[260px] w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 sm:h-[300px] md:h-[340px]" aria-label="Interactive spheroid surface" />;
}

function DensityPlot({ density, reference, control, qMin, qMax, time, path, selectedTime, finalTime, ensembleLabel }: { density: number[]; reference: number[]; control: number[]; qMin: number; qMax: number; time: number; path: Array<{ time: number; q: number }>; selectedTime: number; finalTime: number; ensembleLabel: string }) {
  const width = 640, height = 190, pad = 24, max = Math.max(...density, ...reference, ...control, 1e-10);
  const line = (values: number[]) => values.map((value, i) => `${pad + i / (values.length - 1) * (width - 2 * pad)},${height - pad - value / max * (height - 2 * pad)}`).join(' ');
  return <div><svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`Shape density at model time ${time.toFixed(1)}`}>
    <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#94a3b8" />
    <polyline points={line(reference)} fill="none" stroke="#0f172a" strokeWidth="2" />
    <polyline points={line(density)} fill="none" stroke="#0284c7" strokeWidth="2.5" />
    <polyline points={line(control)} fill="none" stroke="#f97316" strokeWidth="1.7" strokeDasharray="5 4" />
    <text x={pad} y={height - 4} fontSize="11" fill="#475569">q = {qMin}</text><text x={width - pad - 38} y={height - 4} fontSize="11" fill="#475569">{qMax}</text>
  </svg><div className="flex flex-wrap gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 bg-sky-600" />{ensembleLabel}</span><span><i className="mr-1 inline-block h-2 w-2 bg-slate-900" />Directional equation reference</span><span><i className="mr-1 inline-block h-2 w-2 bg-orange-500" />Diffusive control (D=0.12)</span></div><p className="mt-1 text-xs text-slate-500">Density is probability per unit q. The reference uses reflecting endpoints.</p>
  <p className="mt-3 text-xs font-medium text-slate-600">Representative seeded path q(t)</p><svg viewBox={`0 0 ${width} 106`} className="w-full" role="img" aria-label="Representative seeded trajectory through shape space">
    <line x1={pad} y1={86} x2={width - pad} y2={86} stroke="#94a3b8" />
    <polyline points={path.map((point) => `${pad + point.time / finalTime * (width - 2 * pad)},${80 - (point.q - qMin) / (qMax - qMin) * 60}`).join(' ')} fill="none" stroke="#7c3aed" strokeWidth="2" />
    <circle cx={pad + selectedTime / finalTime * (width - 2 * pad)} cy={80 - ((path.find((point) => Math.abs(point.time - selectedTime) < 1e-8)?.q ?? qMin) - qMin) / (qMax - qMin) * 60} r="4" fill="#7c3aed" />
    <text x={pad} y="101" fontSize="11" fill="#475569">t = 0</text><text x={width - pad - 38} y="101" fontSize="11" fill="#475569">t = {finalTime}</text>
  </svg></div>;
}

function ObservablePlot({ ensemble, reference, control, selectedTime, finalTime, metric, constraint, onMetricChange }: { ensemble: MetricFrame[]; reference: MetricFrame[]; control: MetricFrame[]; selectedTime: number; finalTime: number; metric: SpheroidMetric; constraint: SpheroidConstraint; onMetricChange: (metric: SpheroidMetric) => void }) {
  const labels: Record<SpheroidMetric, string> = { meanQ: 'Mean shape coordinate q', meanR: 'Mean axis ratio c/a', meanArea: 'Mean surface area (R²)', meanVolume: 'Mean enclosed volume (R³)', meanPoleCurvature: 'Mean pole Gaussian curvature (R⁻²)', meanEquatorCurvature: 'Mean equator Gaussian curvature (R⁻²)' };
  const availableMetrics: SpheroidMetric[] = constraint === 'volume'
    ? ['meanQ', 'meanR', 'meanArea', 'meanPoleCurvature', 'meanEquatorCurvature']
    : ['meanQ', 'meanR', 'meanVolume', 'meanPoleCurvature', 'meanEquatorCurvature'];
  const width = 640, height = 150, pad = 32;
  const values = [...ensemble, ...reference, ...control].map((frame) => frame[metric] ?? 0);
  const min = Math.min(...values), max = Math.max(...values), span = Math.max(max - min, Math.abs(max) * 1e-6, 1e-10);
  const line = (series: MetricFrame[]) => series.map((frame) => `${pad + frame.time / finalTime * (width - 2 * pad)},${112 - ((frame[metric] ?? 0) - min) / span * 82}`).join(' ');
  const x = pad + selectedTime / finalTime * (width - 2 * pad);
  return <div className="mt-3 min-w-0"><div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center"><label htmlFor="spheroid-metric" className="text-xs font-medium text-slate-600">Geometric observable over walk time</label><select id="spheroid-metric" className="w-full min-w-0 rounded border border-slate-300 px-2 py-2 text-sm sm:w-auto sm:py-1 sm:text-xs" value={metric} onChange={(event) => onMetricChange(event.target.value as SpheroidMetric)}>{availableMetrics.map((key) => <option key={key} value={key}>{labels[key]}</option>)}</select></div><svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${labels[metric]} over model time`}><line x1={pad} y1="112" x2={width - pad} y2="112" stroke="#94a3b8" /><polyline points={line(reference)} fill="none" stroke="#0f172a" strokeWidth="2" /><polyline points={line(ensemble)} fill="none" stroke="#0284c7" strokeWidth="2.5" /><polyline points={line(control)} fill="none" stroke="#f97316" strokeWidth="1.7" strokeDasharray="5 4" /><line x1={x} y1="18" x2={x} y2="114" stroke="#7c3aed" strokeDasharray="3 3" /><text x={pad} y="136" fontSize="11" fill="#475569">t = 0</text><text x={width - pad - 38} y="136" fontSize="11" fill="#475569">t = {finalTime}</text><text x={pad} y="15" fontSize="10" fill="#64748b">{min.toPrecision(3)}</text><text x={width - pad - 38} y="15" fontSize="10" fill="#64748b">{max.toPrecision(3)}</text></svg><div className="flex flex-wrap gap-3 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2 w-2 bg-sky-600" />Current run</span><span><i className="mr-1 inline-block h-2 w-2 bg-slate-900" />Directional equation reference</span><span><i className="mr-1 inline-block h-2 w-2 bg-orange-500" />Diffusive control</span></div></div>;
}

export default function SpheroidWalkPage() {
  const spheroidUI = useAppStore((state) => state.spheroidWalkUIState ?? DEFAULT_SPHEROID_WALK_UI_STATE);
  const setSpheroidUI = useAppStore((state) => state.setSpheroidWalkUIState);
  const [run, setRun] = useState<RunData | null>(null);
  const { profileIndex, seed: seedInput, population, stepCount, colorByCurvature: curvature, metric, constraint } = spheroidUI;
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [runStatus, setRunStatus] = useState<'Ready' | 'Running' | 'Paused' | 'Complete'>('Ready');
  const [stepCountDraft, setStepCountDraft] = useState(String(stepCount || LIVE_STEP_COUNT_DEFAULT));
  const [isLiveRun, setIsLiveRun] = useState(false);
  const [liveFrames, setLiveFrames] = useState<LiveFrame[]>([]);
  const simulation = useRef<ReturnType<typeof createLivePersistentSimulation> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/data/t39-run-v1.json').then((response) => { if (!response.ok) throw new Error('Saved T39 run file was not found.'); return response.json(); }).then(setRun).catch((reason) => setError(String(reason))); }, []);
  const profile = run?.profiles[profileIndex];
  const startLiveRun = (requestedStepCount?: number, requestedConstraint: SpheroidConstraint = constraint, requestedPopulation: number = population) => {
    if (!profile || !run) return;
    const seed = Number(seedInput);
    if (!seedInput.trim() || !Number.isSafeInteger(seed)) { setError('Enter a whole-number seed to start the walk.'); return; }
    const steps = requestedStepCount ?? Number(stepCountDraft);
    if (!Number.isInteger(steps) || steps < LIVE_STEP_COUNT_MIN || steps > LIVE_STEP_COUNT_MAX) return;
    const finalTime = liveRunHorizon(steps, run.parameters.outputStep);
    setSpheroidUI({ stepCount: steps }); setStepCountDraft(String(steps));
    const process = createLivePersistentSimulation({ kind: profile.profile.id, eta: profile.profile.eta, seed, population: requestedPopulation, ...run.parameters, finalTime, constraint: requestedConstraint, histogramCells: profile.ensembleFrames[0].density.length });
    const initial = process.initialFrame;
    const first: LiveFrame = { ...initial, pathPoint: { time: initial.time, q: initial.representativeQ, r: Math.exp(-3 * initial.representativeQ), sigma: initial.representativeSigma }, totalFlips: 0, totalReflections: 0, eventLog: [] };
    simulation.current = process;
    setError(''); setIsLiveRun(true); setLiveFrames([first]); setFrameIndex(0); setRunStatus('Running'); setPlaying(true);
  };
  const handlePopulationChange = (nextPopulation: number) => {
    if (isLiveRun && (!seedInput.trim() || !Number.isSafeInteger(Number(seedInput)))) {
      setError('Enter a whole-number seed before changing walkers on an active live run.');
      return;
    }
    setSpheroidUI({ population: nextPopulation });
    if (isLiveRun) startLiveRun(stepCount, constraint, nextPopulation);
  };
  const handleStepCountChange = (value: string) => {
    setStepCountDraft(value);
    const nextStepCount = Number(value);
    if (!Number.isInteger(nextStepCount) || nextStepCount < LIVE_STEP_COUNT_MIN || nextStepCount > LIVE_STEP_COUNT_MAX || nextStepCount === stepCount) return;
    if (isLiveRun && (!seedInput.trim() || !Number.isSafeInteger(Number(seedInput)))) {
      setStepCountDraft(String(stepCount));
      setError('Enter a whole-number seed before changing steps on an active live run.');
      return;
    }
    setSpheroidUI({ stepCount: nextStepCount });
    if (isLiveRun) {
      startLiveRun(nextStepCount);
    } else {
      setPlaying(false); setFrameIndex(0); setRunStatus('Ready'); setLiveFrames([]); simulation.current = null;
    }
  };
  useEffect(() => {
    if (!playing || !isLiveRun) return;
    const timer = window.setInterval(() => {
      const process = simulation.current;
      if (!process) return;
      const result = process.next();
      const frame: LiveFrame = { ...result.frame, pathPoint: { time: result.frame.time, q: result.frame.representativeQ, r: Math.exp(-3 * result.frame.representativeQ), sigma: result.frame.representativeSigma }, totalFlips: result.totalFlips, totalReflections: result.totalReflections, eventLog: result.eventLog };
      setLiveFrames((frames) => [...frames, frame]);
      setFrameIndex((index) => index + 1);
      if (result.done) { setPlaying(false); setRunStatus('Complete'); }
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, isLiveRun]);
  useEffect(() => {
    if (!playing || isLiveRun) return;
    const lastIndex = profile?.representative.path.length ? profile.representative.path.length - 1 : 0;
    if (frameIndex >= lastIndex) { setPlaying(false); setRunStatus('Complete'); return; }
    const timer = window.setTimeout(() => setFrameIndex((index) => Math.min(lastIndex, index + 1)), 250);
    return () => window.clearTimeout(timer);
  }, [playing, isLiveRun, profile, frameIndex]);
  useEffect(() => { setFrameIndex(0); setPlaying(false); setRunStatus('Ready'); setIsLiveRun(false); setLiveFrames([]); simulation.current = null; }, [profileIndex]);
  const path = isLiveRun ? liveFrames.map((entry) => entry.pathPoint) : profile?.representative.path ?? [];
  const timeline: Array<MetricFrame & { density: number[]; current: number[] }> = isLiveRun ? liveFrames : profile?.ensembleFrames ?? [];
  const frame = timeline[frameIndex];
  const selected = path[frameIndex];
  const referenceFrames = isLiveRun ? profile?.liveComparison.reference.frames ?? [] : profile?.reference.frames ?? [];
  const controlFrames = isLiveRun ? profile?.liveComparison.diffusiveControl.frames ?? [] : profile?.diffusiveControl.frames ?? [];
  const refDensity = profile ? densityAtTime(referenceFrames, selected?.time ?? 0, run?.parameters.outputStep ?? 0.1) : [];
  const controlDensity = profile ? densityAtTime(controlFrames, selected?.time ?? 0, run?.parameters.outputStep ?? 0.1) : [];
  const info = useMemo(() => {
    if (!selected) return null;
    const pole = spheroidGeometry(selected.q, 0, 1, constraint);
    const equator = spheroidGeometry(selected.q, Math.PI / 2, 1, constraint);
    return { a: pole.a, c: pole.c, Kpole: pole.gaussianCurvature, Kequator: equator.gaussianCurvature };
  }, [selected, constraint]);
  const metricReference = useMemo(() => {
    if (!profile || !run) return [];
    const reference = isLiveRun ? profile.liveComparison.reference : profile.reference;
    if (constraint === 'volume') return reference.observables;
    const dq = (run.parameters.qMax - run.parameters.qMin) / reference.q.length;
    return metricsFromDensityFrames(reference.frames, reference.q, dq, constraint);
  }, [constraint, isLiveRun, profile, run]);
  const metricControl = useMemo(() => {
    if (!profile || !run) return [];
    const frames = isLiveRun ? profile.liveComparison.diffusiveControl.frames : profile.diffusiveControl.frames;
    if (constraint === 'volume') return frames;
    const dq = (run.parameters.qMax - run.parameters.qMin) / frames[0].density.length;
    const centers = frames[0].density.map((_, index) => run.parameters.qMin + (index + 0.5) * dq);
    return metricsFromDensityFrames(frames, centers, dq, constraint);
  }, [constraint, isLiveRun, profile, run]);
  const metricEnsemble = useMemo(() => {
    if (constraint === 'volume' || !run || !timeline.length) return timeline;
    const dq = (run.parameters.qMax - run.parameters.qMin) / timeline[0].density.length;
    const centers = timeline[0].density.map((_, index) => run.parameters.qMin + (index + 0.5) * dq);
    return metricsFromDensityFrames(timeline, centers, dq, constraint);
  }, [constraint, run, timeline]);
  const chartMetric = constraint === 'volume' && metric === 'meanVolume' ? 'meanArea' : constraint === 'area' && metric === 'meanArea' ? 'meanVolume' : metric;
  if (error && !run) return <div className="p-8 text-rose-700">{error}</div>;
  if (!run || !profile || !frame || !selected || !info) return <div className="p-8 text-slate-600">Loading saved spheroid experiment…</div>;
  const best = profile.refinement.at(-1)!;
  const finalTime = isLiveRun ? liveRunHorizon(stepCount, run.parameters.outputStep) : run.parameters.finalTime;
  const totalSteps = isLiveRun ? stepCount : profile.ensembleFrames.length - 1;
  const displayedStep = Math.min(totalSteps, frameIndex);
  const liveComplete = isLiveRun && (liveFrames.at(-1)?.time ?? 0) >= finalTime - 1e-10;
  const eventCount = isLiveRun ? liveFrames.at(-1)!.totalFlips + liveFrames.at(-1)!.totalReflections : profile.representative.eventLog.length;
  const progress = Math.min(100, selected.time / finalTime * 100);
  const validStepCountDraft = Number.isInteger(Number(stepCountDraft)) && Number(stepCountDraft) >= LIVE_STEP_COUNT_MIN && Number(stepCountDraft) <= LIVE_STEP_COUNT_MAX;
  const playButtonClass = 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  return <main className="mx-auto min-w-0 max-w-7xl space-y-4 overflow-x-hidden overflow-y-auto p-3 pb-24 text-slate-900 sm:p-4 md:p-6 md:pb-20">
    <header><p className="text-sm font-semibold uppercase tracking-wide text-sky-700">T39 · Geometry-space experiment</p><h1 className="text-2xl font-semibold">A seeded walk between spheroid geometries</h1><p className="mt-1 max-w-4xl text-sm text-slate-600">The state q changes the spheroid's shape; its overall scale is adjusted to keep {constraint === 'volume' ? 'volume' : 'surface area'} fixed. The persistent walk is a chosen stochastic law on q with external model time; this experiment makes no gravitational or Wheeler–DeWitt claim.</p>{error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}</header>
    <section id="spheroid-geometry" className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
      <div className="min-w-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200"><Surface q={selected.q} curvature={curvature} constraint={constraint} /><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><div><b>t = {selected.time.toFixed(1)}</b><span className="mx-2 text-slate-300">|</span>q = {selected.q.toFixed(4)}<span className="mx-2 text-slate-300">|</span>c/a = {selected.r.toFixed(4)}</div><label className="flex items-center gap-2"><input type="checkbox" checked={curvature} onChange={(event) => setSpheroidUI({ colorByCurvature: event.target.checked })} />Color by Gaussian curvature</label></div>{curvature && <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500"><span className="shrink-0">min K = {Math.min(info.Kpole, info.Kequator).toFixed(3)} R⁻²</span><div className="h-2 min-w-4 flex-1 rounded" style={{ background: 'linear-gradient(90deg, hsl(238 78% 55%), hsl(0 78% 55%))' }} /><span className="shrink-0">max K = {Math.max(info.Kpole, info.Kequator).toFixed(3)} R⁻²</span></div>}
        <div className="mt-3 flex flex-wrap items-center gap-2"><button className={`${playButtonClass} ${playing ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`} onClick={() => { if (playing) { setPlaying(false); if (runStatus === 'Running') setRunStatus('Paused'); } else if (liveComplete) { startLiveRun(); } else if (isLiveRun || selected.time < run.parameters.finalTime) { if (isLiveRun) setFrameIndex(liveFrames.length - 1); setPlaying(true); setRunStatus('Running'); } else { setFrameIndex(0); setPlaying(true); setRunStatus('Running'); } }}>{playing ? 'Pause' : isLiveRun ? liveComplete ? 'Run again' : 'Resume' : 'Play replay'}</button><button className={`${playButtonClass} bg-red-600 hover:bg-red-700 focus:ring-red-500`} onClick={() => { if (isLiveRun) { startLiveRun(); } else { setPlaying(false); setFrameIndex(0); setRunStatus('Ready'); } }}>Reset</button><span className="ml-auto w-auto text-right text-xs tabular-nums text-slate-500">t = {selected.time.toFixed(2)}</span><input aria-label="Walk time" className="order-last basis-full accent-sky-700 sm:order-none sm:min-w-24 sm:flex-1 sm:basis-auto" type="range" min={0} max={path.length - 1} value={frameIndex} onChange={(event) => { setPlaying(false); setRunStatus('Paused'); setFrameIndex(Number(event.target.value)); }} /></div>
      </div>
      <div className="min-w-0 space-y-4 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Walk controls and geometry</h2><div className="flex flex-wrap gap-2"><select aria-label="Initial profile" className="max-w-full rounded border border-slate-300 px-2 py-2 text-sm" value={profileIndex} onChange={(event) => setSpheroidUI({ profileIndex: Number(event.target.value) })}>{run.profiles.map((entry, index) => <option key={entry.profile.id} value={index}>{entry.profile.label}</option>)}</select><select aria-label="Geometry constraint" className="max-w-full rounded border border-slate-300 px-2 py-2 text-sm" value={constraint} onChange={(event) => { const next = event.target.value as SpheroidConstraint; const nextMetric = next === 'volume' && metric === 'meanVolume' ? 'meanArea' : next === 'area' && metric === 'meanArea' ? 'meanVolume' : metric; setSpheroidUI({ constraint: next, metric: nextMetric }); if (isLiveRun) startLiveRun(stepCount, next); }}><option value="volume">Keep volume fixed</option><option value="area">Keep surface area fixed</option></select></div></div><p className="-mt-2 text-xs text-slate-500">{constraint === 'volume' ? 'Enclosed volume is fixed at 4πR³/3; area may vary.' : 'Surface area is fixed at 4πR²; enclosed volume may vary.'}{isLiveRun ? ' Changing this choice restarts the live run with the same seed.' : ''}</p>
        <section id="spheroid-live-controls" className="space-y-3 rounded-lg border border-slate-200 bg-gray-50 p-3 text-sm" aria-label="Live walk controls">
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1"><span className="block text-xs font-medium text-slate-600">Seed</span><input className="w-28 max-w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" type="number" step="1" value={seedInput} onChange={(event) => { setSpheroidUI({ seed: event.target.value }); setError(''); }} /></label>
            <label className="space-y-1"><span className="block text-xs font-medium text-slate-600">Walkers</span><select className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" value={population} onChange={(event) => handlePopulationChange(Number(event.target.value))}><option value={1000}>1,000</option><option value={2000}>2,000</option><option value={5000}>5,000</option></select></label>
            <label className="space-y-1"><span className="block text-xs font-medium text-slate-600">Steps</span><input aria-label="Step count" aria-invalid={!validStepCountDraft} className="w-24 rounded-md border border-slate-300 bg-white px-2 py-2 text-sm" type="number" min={LIVE_STEP_COUNT_MIN} max={LIVE_STEP_COUNT_MAX} step="1" value={stepCountDraft} onChange={(event) => handleStepCountChange(event.target.value)} onBlur={() => { if (!validStepCountDraft) setStepCountDraft(String(stepCount)); }} /></label>
            <button className={`${playButtonClass} bg-green-600 hover:bg-green-700 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-gray-400`} disabled={!validStepCountDraft} onClick={() => startLiveRun(Number(stepCountDraft))}>Start live run</button>
          </div>
          <p className="text-xs text-slate-500">1–{LIVE_STEP_COUNT_MAX} steps · {run.parameters.outputStep.toFixed(2)} model time per step. Default is 200 steps (20 model-time units); saved comparisons cover the full 500-step (50 model-time) maximum. Changing steps or walkers restarts an active live run with the same seed.</p>
          {!validStepCountDraft && <p role="alert" className="text-xs text-rose-700">Enter a whole number from {LIVE_STEP_COUNT_MIN} to {LIVE_STEP_COUNT_MAX}.</p>}
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs"><span className="inline-flex items-center gap-2"><i className={`inline-block h-2.5 w-2.5 rounded-full ${runStatus === 'Running' ? 'animate-pulse bg-green-500' : runStatus === 'Paused' ? 'bg-amber-500' : runStatus === 'Complete' ? 'bg-sky-600' : 'bg-slate-300'}`} />{isLiveRun ? `Live run · ${runStatus}` : `Saved run · ${runStatus}`}</span><span className="tabular-nums text-slate-600">Step {displayedStep} / {totalSteps} · {selected.time.toFixed(2)} / {finalTime.toFixed(2)} model time</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Walk progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`Step ${displayedStep} of ${totalSteps}; model time ${selected.time.toFixed(2)} of ${finalTime.toFixed(2)}`}><div className="h-full rounded-full bg-sky-600 transition-[width] duration-100" style={{ width: `${progress}%` }} /></div>
          <p className="text-xs text-slate-500">{isLiveRun ? `${liveFrames.at(-1)?.totalFlips ?? 0} direction flips · ${liveFrames.at(-1)?.totalReflections ?? 0} boundary reflections` : 'The saved 32,000-walker ensemble is ready to replay.'}</p>
        </section>
        <dl className="grid grid-cols-2 gap-2 text-xs sm:gap-3 sm:text-sm"><div className="min-w-0"><dt className="text-slate-500">Current axes (a=b, c)</dt><dd className="break-words font-medium">{info.a.toFixed(3)}, {info.c.toFixed(3)}</dd></div><div className="min-w-0"><dt className="text-slate-500">Curvature at pole / equator</dt><dd className="break-words font-medium">{info.Kpole.toFixed(3)} / {info.Kequator.toFixed(3)}</dd></div><div><dt className="text-slate-500">Walkers</dt><dd className="font-medium">{isLiveRun ? population.toLocaleString() : '32,000 saved'}</dd></div><div><dt className="text-slate-500">Steps</dt><dd className="font-medium">{totalSteps} {isLiveRun ? '(live run)' : '(saved replay)'}</dd></div><div className="min-w-0"><dt className="text-slate-500">Speed / flip rate (v, λ)</dt><dd className="font-medium">{run.parameters.velocity}, {run.parameters.lambda}</dd></div><div className="min-w-0"><dt className="text-slate-500">Mean relative L¹ ± 95% CI (saved run)</dt><dd className="break-words font-medium">{best.relativeL1.mean.toFixed(3)} ± {best.relativeL1.ci95.toFixed(3)}</dd></div></dl><DensityPlot density={frame.density} reference={refDensity} control={controlDensity} qMin={run.parameters.qMin} qMax={run.parameters.qMax} time={frame.time} path={path} selectedTime={selected.time} finalTime={finalTime} ensembleLabel={isLiveRun ? `Live ensemble · ${population.toLocaleString()} walkers` : 'Saved ensemble · 32,000 walkers'} /><ObservablePlot ensemble={metricEnsemble} reference={metricReference} control={metricControl} selectedTime={selected.time} finalTime={finalTime} metric={chartMetric} constraint={constraint} onMetricChange={(nextMetric) => setSpheroidUI({ metric: nextMetric })} /></div>
    </section>
    <section className="rounded-xl bg-white p-4 text-sm shadow-sm ring-1 ring-slate-200"><h2 className="font-semibold">How to read this view</h2><p className="mt-1 text-slate-600">The surface embedding displays the metric E dθ² + G dφ². Camera rotation changes only the view. Blue-to-red color shows analytic intrinsic Gaussian curvature; q=0 is a sphere, q&gt;0 is oblate, and q&lt;0 is prolate. Under fixed volume, a=b=Re^q and c=Re^-2q. Under fixed area, those axes are rescaled together so the surface area remains 4πR² while preserving the same c/a ratio. The walk and density are defined in q; the directional reference and diffusive control use the same q distributions, with their geometric observables recalculated for the selected constraint. Changing to r=c/a requires the Jacobian pᵣ = p_q/(3r).</p><p className="mt-2 text-xs text-slate-500">Run schema {run.schema}; revision {run.provenance.repositoryRevision}; q-walk spec SHA-256 {run.specification.sha256.slice(0, 16)}… · {isLiveRun ? 'ensemble event total' : 'representative event log'}: {eventCount} flips/reflections.</p></section>
  </main>;
}
