export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function spheroidGeometry(q, theta, R = 1, constraint = 'volume') {
  if (!(R > 0) || !Number.isFinite(q) || !Number.isFinite(theta)) throw new Error('R must be positive and q/theta finite');
  const scale = geometryScale(q, R, constraint);
  const a = scale * R * Math.exp(q);
  const c = scale * R * Math.exp(-2 * q);
  const sin = Math.sin(theta), cos = Math.cos(theta);
  const E = a * a * cos * cos + c * c * sin * sin;
  const G = a * a * sin * sin;
  return {
    a, b: a, c, r: c / a,
    E, G,
    areaDensity: a * sin * Math.sqrt(E),
    gaussianCurvature: c * c / (E * E),
    volume: (4 * Math.PI / 3) * a * a * c,
  };
}

export const LIVE_STEP_COUNT_MIN = 1;
export const LIVE_STEP_COUNT_MAX = 200;
export const LIVE_STEP_COUNT_DEFAULT = 200;

export function liveRunHorizon(stepCount, outputStep) {
  if (!Number.isInteger(stepCount) || stepCount < LIVE_STEP_COUNT_MIN || stepCount > LIVE_STEP_COUNT_MAX) {
    throw new Error(`Step count must be an integer from ${LIVE_STEP_COUNT_MIN} to ${LIVE_STEP_COUNT_MAX}`);
  }
  if (!(outputStep > 0) || !Number.isFinite(outputStep)) throw new Error('Output step must be a positive finite number');
  return stepCount * outputStep;
}

export function initialDensity(kind, q, eta = 0) {
  const gaussian = (x, center, sigma) => Math.exp(-0.5 * ((x - center) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  const u = kind === 'centered-gaussian'
    ? gaussian(q, 0, 0.18)
    : 0.5 * (gaussian(q, -0.45, 0.16) + gaussian(q, 0.45, 0.16));
  return [u * (1 + eta) / 2, u * (1 - eta) / 2];
}

export function makeReference({ kind, eta = 0, qMin = -1.5, qMax = 1.5, cells = 600, velocity = 0.6, lambda = 0.8, finalTime = 2, outputStep = 0.1, timeStepFraction = 0.35 }) {
  const dx = (qMax - qMin) / cells;
  const q = Array.from({ length: cells }, (_, i) => qMin + (i + 0.5) * dx);
  let plus = new Float64Array(cells), minus = new Float64Array(cells);
  for (let i = 0; i < cells; i++) [plus[i], minus[i]] = initialDensity(kind, q[i], eta);
  let mass = plus.reduce((a, b) => a + b, 0) + minus.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cells; i++) { plus[i] /= mass * dx; minus[i] /= mass * dx; }
  const maxDt = Math.min(timeStepFraction * dx / velocity, 0.2 / (2 * lambda));
  const frameCount = Math.round(finalTime / outputStep);
  const frames = [];
  const summarize = (time) => ({ time, plus: Array.from(plus), minus: Array.from(minus), density: plus.map((v, i) => v + minus[i]), current: plus.map((v, i) => velocity * (v - minus[i])) });
  frames.push(summarize(0));
  const flip = (dt) => {
    const decay = Math.exp(-2 * lambda * dt);
    for (let i = 0; i < cells; i++) {
      const total = plus[i] + minus[i], diff = (plus[i] - minus[i]) * decay;
      plus[i] = (total + diff) / 2; minus[i] = (total - diff) / 2;
    }
  };
  const transport = (dt) => {
    const rate = velocity * dt / dx;
    const nextPlus = new Float64Array(cells), nextMinus = new Float64Array(cells);
    for (let i = 0; i < cells; i++) {
      const incomingPlus = i === 0 ? minus[0] : plus[i - 1];
      const outgoingPlus = plus[i];
      const incomingMinus = i === cells - 1 ? plus[cells - 1] : minus[i + 1];
      const outgoingMinus = minus[i];
      nextPlus[i] = plus[i] - rate * (outgoingPlus - incomingPlus);
      nextMinus[i] = minus[i] + rate * (incomingMinus - outgoingMinus);
    }
    plus = nextPlus; minus = nextMinus;
  };
  for (let frame = 1; frame <= frameCount; frame++) {
    const target = frame * outputStep;
    let time = (frame - 1) * outputStep;
    while (time < target - 1e-14) {
      const dt = Math.min(maxDt, target - time);
      flip(dt / 2); transport(dt); flip(dt / 2); time += dt;
    }
    frames.push(summarize(target));
  }
  return { q, dx, maxDt, frames, mass: frames.map(({ plus: p, minus: m }) => (p.reduce((a, b) => a + b, 0) + m.reduce((a, b) => a + b, 0)) * dx), qMin, qMax };
}

const initialCdfCache = new Map();
export function sampleInitial(random, kind, eta, qMin, dx, cells) {
  const key = `${kind}:${eta}:${qMin}:${dx}:${cells}`;
  let cached = initialCdfCache.get(key);
  if (!cached) {
    const cdf = new Float64Array(cells);
    let total = 0;
    for (let i = 0; i < cells; i++) { const q = qMin + (i + 0.5) * dx; const [p, m] = initialDensity(kind, q, eta); total += p + m; cdf[i] = total; }
    cached = { cdf, total };
    initialCdfCache.set(key, cached);
  }
  const { cdf, total } = cached;
  const target = random() * total;
  let cell = 0;
  while (cell < cells - 1 && cdf[cell] < target) cell++;
  const q = qMin + (cell + random()) * dx;
  const direction = random() < (1 + eta) / 2 ? 1 : -1;
  return { q, direction };
}

function surfaceArea(q) {
  if (Math.abs(q) < 1e-8) return 4 * Math.PI;
  const a2 = Math.exp(2 * q);
  if (q < 0) {
    const eccentricity = Math.sqrt(1 - Math.exp(6 * q));
    return 2 * Math.PI * a2 * (1 + Math.exp(-3 * q) * Math.asin(eccentricity) / eccentricity);
  }
  const eccentricity = Math.sqrt(1 - Math.exp(-6 * q));
  return 2 * Math.PI * a2 * (1 + Math.exp(-6 * q) * Math.atanh(eccentricity) / eccentricity);
}

function geometryScale(q, R, constraint) {
  if (!(R > 0)) throw new Error('R must be positive');
  if (constraint === 'volume') return 1;
  if (constraint === 'area') return Math.sqrt((4 * Math.PI) / surfaceArea(q));
  throw new Error(`Unknown spheroid constraint: ${constraint}`);
}

export function spheroidSurfaceArea(q, R = 1, constraint = 'volume') {
  if (!(R > 0)) throw new Error('R must be positive');
  if (constraint === 'area') return 4 * Math.PI * R * R;
  if (constraint !== 'volume') throw new Error(`Unknown spheroid constraint: ${constraint}`);
  return R * R * surfaceArea(q);
}

export function spheroidVolume(q, R = 1, constraint = 'volume') {
  const scale = geometryScale(q, R, constraint);
  return (4 * Math.PI / 3) * (scale * R) ** 3;
}

function sampleGeometryMean(qValues, constraint = 'volume') {
  let area = 0, volume = 0, poleK = 0, equatorK = 0;
  for (const q of qValues) {
    const scale = geometryScale(q, 1, constraint);
    area += spheroidSurfaceArea(q, 1, constraint);
    volume += spheroidVolume(q, 1, constraint);
    poleK += Math.exp(-8 * q) / (scale * scale);
    equatorK += Math.exp(4 * q) / (scale * scale);
  }
  return { meanArea: area / qValues.length, meanVolume: volume / qValues.length, meanPoleCurvature: poleK / qValues.length, meanEquatorCurvature: equatorK / qValues.length };
}

export function runPersistentEnsemble({ kind, eta = 0, seed, population, qMin = -1.5, qMax = 1.5, velocity = 0.6, lambda = 0.8, finalTime = 2, outputStep = 0.1, histogramCells = 120, representativeIndex = 0, constraint = 'volume' }) {
  const random = mulberry32(seed), dx = (qMax - qMin) / histogramCells;
  const q = new Float64Array(population), sigma = new Int8Array(population);
  for (let i = 0; i < population; i++) { const init = sampleInitial(random, kind, eta, qMin, (qMax - qMin) / 600, 600); q[i] = init.q; sigma[i] = init.direction; }
  const times = Array.from({ length: Math.round(finalTime / outputStep) + 1 }, (_, i) => i * outputStep);
  const frames = [], eventLog = [];
  const representativePath = [];
  let totalFlips = 0, totalReflections = 0;
  for (const time of times) {
    if (frames.length > 0) {
      const previous = times[frames.length - 1];
      for (let i = 0; i < population; i++) {
        let t = previous;
        while (t < time - 1e-14) {
          const flipTime = -Math.log(Math.max(random(), Number.MIN_VALUE)) / lambda;
          const wallTime = sigma[i] > 0 ? (qMax - q[i]) / velocity : (q[i] - qMin) / velocity;
          const duration = Math.min(flipTime, wallTime, time - t);
          q[i] += sigma[i] * velocity * duration; t += duration;
          if (wallTime <= flipTime && wallTime <= duration + 1e-14) {
            q[i] = sigma[i] > 0 ? qMax : qMin; sigma[i] *= -1; totalReflections++;
            if (i === representativeIndex) eventLog.push({ time: t, type: 'reflection', q: q[i], sigma: sigma[i] });
          } else if (flipTime <= duration + 1e-14) {
            sigma[i] *= -1; totalFlips++;
            if (i === representativeIndex) eventLog.push({ time: t, type: 'flip', q: q[i], sigma: sigma[i] });
          }
          if (duration <= 1e-15) throw new Error('Non-advancing event in persistent process');
        }
      }
    }
    const counts = new Float64Array(histogramCells), directional = new Float64Array(histogramCells);
    const qValues = Array.from(q);
    let meanQ = 0, meanQ2 = 0, meanR = 0;
    for (let i = 0; i < population; i++) {
      const cell = Math.max(0, Math.min(histogramCells - 1, Math.floor((q[i] - qMin) / dx)));
      counts[cell]++; directional[cell] += sigma[i]; meanQ += q[i]; meanQ2 += q[i] * q[i]; meanR += Math.exp(-3 * q[i]);
    }
    frames.push({ time, density: Array.from(counts, (n) => n / (population * dx)), current: Array.from(directional, (n) => velocity * n / (population * dx)), mass: 1, meanQ: meanQ / population, meanQ2: meanQ2 / population, meanR: meanR / population, ...sampleGeometryMean(qValues, constraint), representativeQ: q[representativeIndex], representativeSigma: sigma[representativeIndex] });
    representativePath.push({ time, q: q[representativeIndex], sigma: sigma[representativeIndex], r: Math.exp(-3 * q[representativeIndex]) });
  }
  return { seed, population, kind, eta, qMin, qMax, velocity, lambda, finalTime, outputStep, histogramCells, constraint, times, frames, representativeIndex, representativePath, eventLog, totalFlips, totalReflections };
}

export function createLivePersistentSimulation({ kind, eta = 0, seed, population = 2000, qMin = -1.5, qMax = 1.5, velocity = 0.6, lambda = 0.8, finalTime = 2, outputStep = 0.05, histogramCells = 120, representativeIndex = 0, constraint = 'volume' }) {
  const random = mulberry32(seed), dx = (qMax - qMin) / histogramCells;
  const totalSteps = Math.max(1, Math.ceil(finalTime / outputStep - 1e-10));
  const q = new Float64Array(population), sigma = new Int8Array(population);
  for (let i = 0; i < population; i++) {
    const initial = sampleInitial(random, kind, eta, qMin, (qMax - qMin) / 600, 600);
    q[i] = initial.q; sigma[i] = initial.direction;
  }
  let time = 0, stepIndex = 0, totalFlips = 0, totalReflections = 0;
  const eventLog = [];
  const capture = () => {
    const counts = new Float64Array(histogramCells), directions = new Float64Array(histogramCells);
    let meanQ = 0, meanQ2 = 0, meanR = 0;
    for (let i = 0; i < population; i++) {
      const cell = Math.max(0, Math.min(histogramCells - 1, Math.floor((q[i] - qMin) / dx)));
      counts[cell]++; directions[cell] += sigma[i];
      meanQ += q[i]; meanQ2 += q[i] * q[i]; meanR += Math.exp(-3 * q[i]);
    }
    return {
      time,
      density: Array.from(counts, (count) => count / (population * dx)),
      current: Array.from(directions, (count) => velocity * count / (population * dx)),
      mass: 1,
      meanQ: meanQ / population,
      meanQ2: meanQ2 / population,
      meanR: meanR / population,
      ...sampleGeometryMean(Array.from(q), constraint),
      representativeQ: q[representativeIndex],
      representativeSigma: sigma[representativeIndex],
    };
  };
  const next = () => {
    if (stepIndex >= totalSteps || time >= finalTime - 1e-10) return { frame: capture(), done: true, eventLog, totalFlips, totalReflections };
    const target = Math.min(finalTime, (stepIndex + 1) * outputStep);
    for (let i = 0; i < population; i++) {
      let t = time;
      while (t < target - 1e-14) {
        const flipTime = -Math.log(Math.max(random(), Number.MIN_VALUE)) / lambda;
        const wallTime = sigma[i] > 0 ? (qMax - q[i]) / velocity : (q[i] - qMin) / velocity;
        const duration = Math.min(flipTime, wallTime, target - t);
        q[i] += sigma[i] * velocity * duration; t += duration;
        if (wallTime <= flipTime && wallTime <= duration + 1e-14) {
          q[i] = sigma[i] > 0 ? qMax : qMin; sigma[i] *= -1; totalReflections++;
          if (i === representativeIndex) eventLog.push({ time: t, type: 'reflection', q: q[i], sigma: sigma[i] });
        } else if (flipTime <= duration + 1e-14) {
          sigma[i] *= -1; totalFlips++;
          if (i === representativeIndex) eventLog.push({ time: t, type: 'flip', q: q[i], sigma: sigma[i] });
        }
        if (duration <= 1e-15) throw new Error('Non-advancing event in live persistent process');
      }
    }
    time = target; stepIndex++;
    return { frame: capture(), done: stepIndex >= totalSteps || time >= finalTime - 1e-10, eventLog, totalFlips, totalReflections };
  };
  const initialFrame = capture();
  return { seed, population, kind, eta, velocity, lambda, finalTime, outputStep, constraint, initialFrame, next };
}

export function runDiffusiveControl({ kind, eta = 0, seed, population = 32000, qMin = -1.5, qMax = 1.5, D = 0.12, finalTime = 2, dt = 0.002, outputStep = 0.1, constraint = 'volume' }) {
  const random = mulberry32(seed), dx = (qMax - qMin) / 120;
  const q = new Float64Array(population);
  for (let i = 0; i < population; i++) q[i] = sampleInitial(random, kind, eta, qMin, (qMax - qMin) / 600, 600).q;
  const frames = [], path = [], stepsPerOutput = Math.round(outputStep / dt), noiseScale = Math.sqrt(2 * D * dt);
  for (let frame = 0; frame <= Math.round(finalTime / outputStep); frame++) {
    if (frame > 0) for (let step = 0; step < stepsPerOutput; step++) for (let i = 0; i < population; i++) {
      q[i] += noiseScale * normal(random);
      while (q[i] < qMin || q[i] > qMax) q[i] = q[i] < qMin ? 2 * qMin - q[i] : 2 * qMax - q[i];
    }
    const counts = new Uint32Array(120);
    let meanQ = 0, meanR = 0;
    for (let i = 0; i < population; i++) { counts[Math.max(0, Math.min(119, Math.floor((q[i] - qMin) / dx)))]++; meanQ += q[i]; meanR += Math.exp(-3 * q[i]); }
    const density = Array.from(counts, (n) => n / (population * dx));
    const qCenters = Array.from({ length: 120 }, (_, i) => qMin + (i + 0.5) * dx);
    const transformed = transformDensityToAxisRatio(qCenters, density, dx);
    frames.push({ time: frame * outputStep, density, current: Array(120).fill(0), axisRatio: { centers: transformed.rCenters, density: transformed.densityR, massQ: transformed.massQ, massR: transformed.massR }, mass: 1, meanQ: meanQ / population, meanR: meanR / population, ...sampleGeometryMean(Array.from(q), constraint) });
    path.push({ time: frame * outputStep, q: q[0], r: Math.exp(-3 * q[0]) });
  }
  return { seed, population, kind, eta, D, dt, qMin, qMax, frames, path };
}

export function transformToAxisRatio(q, sigma, velocity = 0.6) {
  const r = Math.exp(-3 * q);
  return { r, drdt: -3 * velocity * sigma * r, densityJacobian: 1 / (3 * r) };
}

export function transformDensityToAxisRatio(qCenters, densityQ, dq) {
  const rCenters = qCenters.map((q) => Math.exp(-3 * q));
  const densityR = qCenters.map((q, i) => densityQ[i] / (3 * Math.exp(-3 * q)));
  return {
    rCenters,
    densityR,
    massQ: densityQ.reduce((sum, value) => sum + value * dq, 0),
    massR: densityR.reduce((sum, value, i) => sum + value * 3 * rCenters[i] * dq, 0),
  };
}

function normal(random) {
  const u = Math.max(random(), Number.MIN_VALUE), v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
