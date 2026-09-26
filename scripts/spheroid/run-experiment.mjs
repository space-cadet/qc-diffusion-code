import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVE_STEP_COUNT_MAX, LIVE_STEP_COUNT_DEFAULT, liveRunHorizon, makeReference, runDiffusiveControl, runPersistentEnsemble, spheroidSurfaceArea, transformDensityToAxisRatio } from '../../frontend/src/spheroid/spheroid-model.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, 'frontend/public/data/t39-run-v1.json');
const specPath = resolve(root, 'memory-bank/implementation-details/spheroid-run-spec-v1.md');
const specHash = createHash('sha256').update(readFileSync(specPath)).digest('hex');
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
const trackedDiffHash = createHash('sha256').update(execFileSync('git', ['diff', '--binary', 'HEAD'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })).digest('hex');
const experimentFiles = [
  'frontend/src/App.tsx',
  'frontend/src/spheroid/spheroid-model.mjs',
  'frontend/src/spheroid/spheroid-model.d.mts',
  'frontend/src/spheroid/SpheroidWalkPage.tsx',
  'scripts/spheroid/run-experiment.mjs',
  'scripts/spheroid/model.test.mjs',
  'memory-bank/implementation-details/spheroid-run-spec-v1.md',
];
const experimentHash = createHash('sha256');
for (const relativePath of experimentFiles) experimentHash.update(relativePath).update('\0').update(readFileSync(resolve(root, relativePath)));

const runStarted = Date.now();
const definitions = [
  { id: 'centered-gaussian', label: 'Centered Gaussian', eta: 0 },
  { id: 'bimodal-current', label: 'Bimodal, positive initial current', eta: 0.35 },
];
const seedList = Array.from({ length: 8 }, (_, i) => 39001 + i);
const populations = [8000, 16000, 32000];
const histogramCells = 120;
const outputStep = 0.1;
const liveComparisonFinalTime = liveRunHorizon(LIVE_STEP_COUNT_MAX, outputStep);
const configurations = [];

function aggregateReferenceFrame(frame, refDx, targetCells) {
  const ratio = Math.round((3 / targetCells) / refDx);
  const density = Array(targetCells).fill(0), current = Array(targetCells).fill(0);
  for (let i = 0; i < frame.density.length; i++) {
    const target = Math.min(targetCells - 1, Math.floor(i / ratio));
    density[target] += frame.density[i] * refDx / (3 / targetCells);
    current[target] += frame.current[i] * refDx / (3 / targetCells);
  }
  return { density, current };
}

function relativeL1(a, b) {
  let numerator = 0, denominator = 0;
  for (let i = 0; i < a.length; i++) { numerator += Math.abs(a[i] - b[i]); denominator += Math.abs(b[i]); }
  return numerator / denominator;
}

function relativeArrayL1(a, b) {
  let numerator = 0, denominator = 0;
  for (let i = 0; i < a.length; i++) { numerator += Math.abs(a[i] - b[i]); denominator += Math.abs(b[i]); }
  return numerator / denominator;
}

function scaledCurrentL1(a, b, cellWidth, velocity) {
  let error = 0;
  for (let i = 0; i < a.length; i++) error += Math.abs(a[i] - b[i]) * cellWidth;
  return error / velocity;
}

function meanInterval(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return { mean, ci95: 2.365 * Math.sqrt(variance / values.length), min: Math.min(...values), max: Math.max(...values) };
}

for (const profile of definitions) {
  const reference = makeReference({ kind: profile.id, eta: profile.eta });
  const timeRefinements = [0.175, 0.0875].map((timeStepFraction) => ({ timeStepFraction, result: makeReference({ kind: profile.id, eta: profile.eta, timeStepFraction }) }));
  const referenceMassDrift = Math.max(...reference.mass.map((mass) => Math.abs(mass - 1)));
  const finalReference = aggregateReferenceFrame(reference.frames.at(-1), reference.dx, histogramCells);
  const fineReferenceFinal = aggregateReferenceFrame(timeRefinements.at(-1).result.frames.at(-1), reference.dx, histogramCells);
  const mediumReferenceFinal = aggregateReferenceFrame(timeRefinements[0].result.frames.at(-1), reference.dx, histogramCells);
  const timeResolution = {
    steps: [reference, ...timeRefinements.map(({ result }) => result)].map(({ maxDt, mass }) => ({ maxDt, massDriftMax: Math.max(...mass.map((value) => Math.abs(value - 1))) })),
    mediumToFineRelativeL1: relativeArrayL1(mediumReferenceFinal.density, fineReferenceFinal.density),
  };
  const referenceObservables = reference.frames.map((frame) => {
    let mass = 0, meanQ = 0, meanQ2 = 0, meanR = 0, meanArea = 0, meanPoleCurvature = 0, meanEquatorCurvature = 0;
    for (let i = 0; i < reference.q.length; i++) {
      const shapeQ = reference.q[i], probability = frame.density[i] * reference.dx;
      mass += probability; meanQ += probability * shapeQ; meanQ2 += probability * shapeQ * shapeQ;
      meanR += probability * Math.exp(-3 * shapeQ); meanArea += probability * spheroidSurfaceArea(shapeQ);
      meanPoleCurvature += probability * Math.exp(-8 * shapeQ); meanEquatorCurvature += probability * Math.exp(4 * shapeQ);
    }
    return { time: frame.time, mass, meanQ, meanQ2, meanR, meanArea, meanPoleCurvature, meanEquatorCurvature };
  });
  const liveReference = makeReference({ kind: profile.id, eta: profile.eta, finalTime: liveComparisonFinalTime, outputStep });
  const liveQCenters = Array.from({ length: histogramCells }, (_, i) => -1.5 + (i + 0.5) * (3 / histogramCells));
  const liveReferenceObservables = liveReference.frames.map((frame) => {
    let mass = 0, meanQ = 0, meanQ2 = 0, meanR = 0, meanArea = 0, meanPoleCurvature = 0, meanEquatorCurvature = 0;
    for (let i = 0; i < liveReference.q.length; i++) {
      const shapeQ = liveReference.q[i], probability = frame.density[i] * liveReference.dx;
      mass += probability; meanQ += probability * shapeQ; meanQ2 += probability * shapeQ * shapeQ;
      meanR += probability * Math.exp(-3 * shapeQ); meanArea += probability * spheroidSurfaceArea(shapeQ);
      meanPoleCurvature += probability * Math.exp(-8 * shapeQ); meanEquatorCurvature += probability * Math.exp(4 * shapeQ);
    }
    return { time: frame.time, mass, meanQ, meanQ2, meanR, meanArea, meanPoleCurvature, meanEquatorCurvature };
  });
  const liveDiffusiveControl = runDiffusiveControl({ kind: profile.id, eta: profile.eta, seed: 49001, population: 4000, finalTime: liveComparisonFinalTime, outputStep });
  const liveDiffusiveFrames = liveDiffusiveControl.frames.map(({ time, density, meanQ, meanR, meanArea, meanVolume, meanPoleCurvature, meanEquatorCurvature }) => ({ time, density, meanQ, meanR, meanArea, meanVolume, meanPoleCurvature, meanEquatorCurvature }));
  const refinement = [];
  const referenceFinalObservables = referenceObservables.at(-1);
  let finalRuns = [];
  for (const population of populations) {
    const runs = [];
    for (const seed of seedList) {
      const run = runPersistentEnsemble({ kind: profile.id, eta: profile.eta, seed, population, histogramCells });
      const final = run.frames.at(-1);
      const metrics = {
        seed,
        population,
        relativeL1: relativeL1(final.density, finalReference.density),
        meanQ: final.meanQ,
        meanQ2: final.meanQ2,
        meanR: final.meanR,
        meanArea: final.meanArea,
        meanPoleCurvature: final.meanPoleCurvature,
        meanEquatorCurvature: final.meanEquatorCurvature,
        meanQAbsError: Math.abs(final.meanQ - referenceFinalObservables.meanQ),
        meanQ2AbsError: Math.abs(final.meanQ2 - referenceFinalObservables.meanQ2),
        meanRAbsError: Math.abs(final.meanR - referenceFinalObservables.meanR),
        meanAreaAbsError: Math.abs(final.meanArea - referenceFinalObservables.meanArea),
        currentL1: scaledCurrentL1(final.current, finalReference.current, 3 / histogramCells, 0.6),
        mass: final.mass,
        finalDensity: final.density,
        finalCurrent: final.current,
      };
      runs.push({ metrics, run });
    }
    refinement.push({ population, relativeL1: meanInterval(runs.map(({ metrics }) => metrics.relativeL1)), meanQ: meanInterval(runs.map(({ metrics }) => metrics.meanQ)), meanR: meanInterval(runs.map(({ metrics }) => metrics.meanR)), meanArea: meanInterval(runs.map(({ metrics }) => metrics.meanArea)), meanQAbsError: meanInterval(runs.map(({ metrics }) => metrics.meanQAbsError)), meanQ2AbsError: meanInterval(runs.map(({ metrics }) => metrics.meanQ2AbsError)), meanRAbsError: meanInterval(runs.map(({ metrics }) => metrics.meanRAbsError)), meanAreaAbsError: meanInterval(runs.map(({ metrics }) => metrics.meanAreaAbsError)), currentL1: meanInterval(runs.map(({ metrics }) => metrics.currentL1)), seeds: runs.map(({ metrics }) => metrics) });
    if (population === populations.at(-1)) finalRuns = runs;
  }

  const qCenters = Array.from({ length: histogramCells }, (_, i) => -1.5 + (i + 0.5) * (3 / histogramCells));
  const referenceByTime = reference.frames.map((frame) => {
    const aggregated = aggregateReferenceFrame(frame, reference.dx, histogramCells);
    const transformed = transformDensityToAxisRatio(qCenters, aggregated.density, 3 / histogramCells);
    return { time: frame.time, ...aggregated, axisRatio: { centers: transformed.rCenters, density: transformed.densityR, massQ: transformed.massQ, massR: transformed.massR } };
  });
  const ensembleFrames = reference.frames.map((refFrame, frameIndex) => {
    const frameMeans = Array.from({ length: histogramCells }, () => 0);
    const currentMeans = Array.from({ length: histogramCells }, () => 0);
    let meanQ = 0, meanR = 0, meanArea = 0, meanVolume = 0, meanPoleCurvature = 0, meanEquatorCurvature = 0;
    for (const { run } of finalRuns) for (let cell = 0; cell < histogramCells; cell++) {
      frameMeans[cell] += run.frames[frameIndex].density[cell] / seedList.length;
      currentMeans[cell] += run.frames[frameIndex].current[cell] / seedList.length;
    }
    for (const { run } of finalRuns) {
      const frame = run.frames[frameIndex];
      meanQ += frame.meanQ / seedList.length; meanR += frame.meanR / seedList.length;
      meanArea += frame.meanArea / seedList.length; meanVolume += frame.meanVolume / seedList.length;
      meanPoleCurvature += frame.meanPoleCurvature / seedList.length; meanEquatorCurvature += frame.meanEquatorCurvature / seedList.length;
    }
    const transformed = transformDensityToAxisRatio(qCenters, frameMeans, 3 / histogramCells);
    return { time: refFrame.time, density: frameMeans, current: currentMeans, meanQ, meanR, meanArea, meanVolume, meanPoleCurvature, meanEquatorCurvature, axisRatio: { centers: transformed.rCenters, density: transformed.densityR, massQ: transformed.massQ, massR: transformed.massR } };
  });

  const representative = finalRuns[0].run;
  const diffusive = runDiffusiveControl({ kind: profile.id, eta: profile.eta, seed: 49001, population: 4000 });
  configurations.push({
    profile,
    reference: { q: reference.q, dx: reference.dx, cells: reference.q.length, frames: referenceByTime, observables: referenceObservables, massDriftMax: referenceMassDrift },
    liveComparison: {
      reference: { q: liveQCenters, frames: liveReference.frames.map((frame) => ({ time: frame.time, ...aggregateReferenceFrame(frame, liveReference.dx, histogramCells) })), observables: liveReferenceObservables },
      diffusiveControl: { frames: liveDiffusiveFrames },
    },
    timeResolution,
    refinement,
    ensembleFrames,
    representative: { seed: representative.seed, population: representative.population, path: representative.representativePath, eventLog: representative.eventLog, totalFlips: representative.totalFlips, totalReflections: representative.totalReflections },
    diffusiveControl: { seed: diffusive.seed, population: diffusive.population, D: diffusive.D, dt: diffusive.dt, path: diffusive.path, frames: diffusive.frames },
  });
}

const payload = {
  schema: 'qc-diffusion-code/t39-spheroid-run-v1',
  createdAt: new Date().toISOString(),
  specification: { version: 't39-pre-run-v1', path: 'memory-bank/implementation-details/spheroid-run-spec-v1.md', sha256: specHash },
  provenance: { repositoryRevision: revision, worktreeWasDirty: dirty, trackedDiffSha256: trackedDiffHash, experimentFilesSha256: experimentHash.digest('hex'), experimentFiles, runtime: process.version, elapsedSeconds: (Date.now() - runStarted) / 1000 },
  parameters: { R: 1, qMin: -1.5, qMax: 1.5, velocity: 0.6, lambda: 0.8, finalTime: 2, liveComparisonFinalTime, liveComparisonStepCount: LIVE_STEP_COUNT_MAX, liveComparisonDefaultStepCount: LIVE_STEP_COUNT_DEFAULT, outputStep, populationLevels: populations, seeds: seedList, histogramCells, referenceCells: 600 },
  profiles: configurations,
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload)}\n`);
const summaries = configurations.flatMap(({ profile, refinement, reference, timeResolution }) => refinement.map((row) => ({ profile: profile.id, population: row.population, relativeL1: row.relativeL1, currentL1: row.currentL1, referenceMassDrift: reference.massDriftMax, timeResolutionL1: timeResolution.mediumToFineRelativeL1 })));
writeFileSync(resolve(dirname(output), 't39-run-v1-summary.csv'), `profile,population,mean_relative_l1,ci95_relative_l1,min_relative_l1,max_relative_l1,mean_current_l1,ci95_current_l1,reference_mass_drift,reference_medium_to_fine_l1\n${summaries.map(({ profile, population, relativeL1: l1, currentL1, referenceMassDrift, timeResolutionL1 }) => `${profile},${population},${l1.mean},${l1.ci95},${l1.min},${l1.max},${currentL1.mean},${currentL1.ci95},${referenceMassDrift},${timeResolutionL1}`).join('\n')}\n`);
console.log(JSON.stringify({ output, specHash, revision, dirty, elapsedSeconds: payload.provenance.elapsedSeconds, summaries }, null, 2));
