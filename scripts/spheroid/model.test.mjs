import test from 'node:test';
import assert from 'node:assert/strict';
import { createLivePersistentSimulation, LIVE_STEP_COUNT_DEFAULT, LIVE_STEP_COUNT_MAX, LIVE_STEP_COUNT_MIN, liveRunHorizon, makeReference, runDiffusiveControl, runPersistentEnsemble, spheroidGeometry, spheroidSurfaceArea, transformDensityToAxisRatio, transformToAxisRatio } from '../../frontend/src/spheroid/spheroid-model.mjs';

test('fixed-volume spheroid geometry matches sphere and curvature identities', () => {
  const R = 1.7;
  for (const q of [-0.7, 0, 0.8]) {
    const pole = spheroidGeometry(q, 0, R), equator = spheroidGeometry(q, Math.PI / 2, R);
    assert.ok(Math.abs(pole.a ** 2 * pole.c - R ** 3) < 1e-11);
    assert.ok(Math.abs(pole.volume - (4 * Math.PI / 3) * R ** 3) < 1e-10);
    assert.ok(Math.abs(pole.gaussianCurvature - R ** -2 * Math.exp(-8 * q)) < 1e-10);
    assert.ok(Math.abs(equator.gaussianCurvature - R ** -2 * Math.exp(4 * q)) < 1e-10);
  }
  const sphere = spheroidGeometry(0, Math.PI / 3, R);
  assert.ok(Math.abs(sphere.E - R ** 2) < 1e-12);
  assert.ok(Math.abs(sphere.gaussianCurvature - R ** -2) < 1e-12);
  assert.ok(Math.abs(sphere.areaDensity - R ** 2 * Math.sin(Math.PI / 3)) < 1e-12);
  assert.ok(Math.abs(spheroidSurfaceArea(0, R) - 4 * Math.PI * R ** 2) < 1e-7);
  let sphereArea = 0;
  const n = 10000, dTheta = Math.PI / n;
  for (let i = 0; i <= n; i++) sphereArea += spheroidGeometry(0, i * dTheta, R).areaDensity * (i === 0 || i === n ? 0.5 : 1) * dTheta;
  assert.ok(Math.abs(2 * Math.PI * sphereArea - 4 * Math.PI * R ** 2) < 1e-5);
});

test('seeded persistent ensemble replays and preserves positivity, current bound, and finite speed', () => {
  const config = { kind: 'bimodal-current', eta: 0.35, seed: 39001, population: 6000, finalTime: 2 };
  const first = runPersistentEnsemble(config), second = runPersistentEnsemble(config);
  assert.deepEqual(first.representativePath, second.representativePath);
  assert.deepEqual(first.eventLog, second.eventLog);
  assert.equal(first.frames.at(-1).mass, 1);
  const initialIntegratedCurrent = first.frames[0].current.reduce((sum, value) => sum + value * (3 / first.frames[0].current.length), 0);
  assert.ok(Math.abs(initialIntegratedCurrent - 0.6 * 0.35) < 0.02);
  for (const frame of first.frames) for (let i = 0; i < frame.density.length; i++) {
    assert.ok(frame.density[i] >= 0);
    assert.ok(Math.abs(frame.current[i]) <= 0.6 * frame.density[i] + 1e-12);
  }
  for (const point of first.representativePath) assert.ok(Math.abs(point.q - first.representativePath[0].q) <= 0.6 * point.time + 1e-10);
});

test('reflecting endpoints reverse direction without leaving the declared shape domain', () => {
  const result = runPersistentEnsemble({ kind: 'centered-gaussian', seed: 39005, population: 2000, qMin: -0.1, qMax: 0.1 });
  assert.ok(result.totalReflections > 0);
  assert.ok(result.frames.every((frame) => frame.mass === 1));
  assert.ok(result.representativePath.every((point) => point.q >= -0.1 && point.q <= 0.1));
});

test('live persistent simulation advances deterministically and reports complete frames', () => {
  const config = { kind: 'centered-gaussian', seed: 39017, population: 500, qMin: -0.1, qMax: 0.1, finalTime: 0.1, outputStep: 0.05, histogramCells: 24 };
  const first = createLivePersistentSimulation(config), replay = createLivePersistentSimulation(config);
  assert.equal(first.initialFrame.time, 0);
  assert.equal(first.initialFrame.mass, 1);
  assert.deepEqual(first.initialFrame, replay.initialFrame);
  const firstStep = first.next(), replayStep = replay.next();
  assert.equal(firstStep.frame.time, 0.05);
  assert.equal(firstStep.done, false);
  assert.deepEqual(firstStep, replayStep);
  const finalStep = first.next();
  assert.equal(finalStep.frame.time, 0.1);
  assert.equal(finalStep.done, true);
  assert.equal(finalStep.frame.mass, 1);
  assert.ok(finalStep.frame.meanArea > 0);
  assert.ok(finalStep.frame.meanPoleCurvature > 0);
  assert.ok(finalStep.frame.meanEquatorCurvature > 0);
  assert.ok(finalStep.frame.density.every((value) => value >= 0));
  assert.ok(Math.abs(finalStep.frame.density.reduce((sum, value) => sum + value * (0.2 / 24), 0) - 1) < 1e-12);
  const afterCompletion = first.next();
  assert.equal(afterCompletion.done, true);
  assert.equal(afterCompletion.frame.time, 0.1);
});

test('selected live step count sets the run horizon and bounds', () => {
  assert.equal(LIVE_STEP_COUNT_MIN, 1);
  assert.equal(LIVE_STEP_COUNT_DEFAULT, 200);
  assert.equal(LIVE_STEP_COUNT_MAX, 500);
  assert.equal(liveRunHorizon(1, 0.1), 0.1);
  assert.equal(liveRunHorizon(20, 0.1), 2);
  assert.equal(liveRunHorizon(LIVE_STEP_COUNT_DEFAULT, 0.1), 20);
  assert.equal(liveRunHorizon(LIVE_STEP_COUNT_MAX, 0.1), 50);
  assert.throws(() => liveRunHorizon(0, 0.1), /integer from 1 to 500/);
  assert.throws(() => liveRunHorizon(501, 0.1), /integer from 1 to 500/);
  assert.throws(() => liveRunHorizon(2.5, 0.1), /integer from 1 to 500/);

  const steps = 7, outputStep = 0.1;
  const simulation = createLivePersistentSimulation({ kind: 'centered-gaussian', seed: 39017, population: 100, finalTime: liveRunHorizon(steps, outputStep), outputStep, histogramCells: 12 });
  const sameSeedShortRun = createLivePersistentSimulation({ kind: 'centered-gaussian', seed: 39017, population: 100, finalTime: liveRunHorizon(3, outputStep), outputStep, histogramCells: 12 });
  assert.deepEqual(simulation.initialFrame, sameSeedShortRun.initialFrame);
  const frames = [simulation.initialFrame];
  let result;
  for (let index = 0; index < steps; index++) {
    result = simulation.next();
    frames.push(result.frame);
    if (index < 3) assert.deepEqual(result.frame, sameSeedShortRun.next().frame);
  }
  assert.equal(frames.length, steps + 1);
  assert.ok(Math.abs(frames.at(-1).time - steps * outputStep) < 1e-12);
  assert.equal(result.done, true);
});

test('independent reflecting finite-volume reference conserves mass and admissibility', () => {
  const reference = makeReference({ kind: 'bimodal-current', eta: 0.35, cells: 300, outputStep: 0.1 });
  assert.ok(Math.max(...reference.mass.map((mass) => Math.abs(mass - 1))) < 1e-12);
  for (const frame of reference.frames) for (let i = 0; i < frame.density.length; i++) {
    assert.ok(frame.density[i] >= -1e-12);
    assert.ok(Math.abs(frame.current[i]) <= 0.6 * frame.density[i] + 1e-12);
  }
});

test('q to axis-ratio density Jacobian preserves mass for the same transformed samples', () => {
  const samples = [-0.5, 0.1, 0.7], density = [0.2, 0.5, 0.3], dq = 0.01;
  const massQ = density.reduce((sum, value) => sum + value * dq, 0);
  const massR = samples.reduce((sum, q, i) => {
    const transformed = transformToAxisRatio(q, 1);
    assert.ok(Math.abs(transformed.drdt + 1.8 * transformed.r) < 1e-12);
    return sum + density[i] * transformed.densityJacobian * 3 * transformed.r * dq;
  }, 0);
  assert.ok(Math.abs(massQ - massR) < 1e-12);
  const densityTransform = transformDensityToAxisRatio([-0.5, 0.1, 0.7], density.map((value) => value / dq), dq);
  assert.ok(Math.abs(densityTransform.massQ - densityTransform.massR) < 1e-12);
  assert.equal(densityTransform.rCenters.length, density.length);
});

test('diffusive control exports the same path and Jacobian-transformed density in r', () => {
  const control = runDiffusiveControl({ kind: 'centered-gaussian', seed: 49001, population: 2000, finalTime: 0.2, dt: 0.002 });
  assert.equal(control.path.length, control.frames.length);
  for (let i = 0; i < control.frames.length; i++) {
    assert.ok(Math.abs(control.path[i].r - Math.exp(-3 * control.path[i].q)) < 1e-12);
    assert.ok(Math.abs(control.frames[i].axisRatio.massR - control.frames[i].axisRatio.massQ) < 1e-12);
  }
});
