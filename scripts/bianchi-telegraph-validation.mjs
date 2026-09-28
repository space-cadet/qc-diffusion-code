import { writeFileSync } from 'node:fs';

const TWO_PI = 2 * Math.PI;

export function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function validateBianchiParameters({ velocity, lambda, B }) {
  if (!(velocity > 0) || !(lambda > 0)) {
    throw new Error('velocity and lambda must both be positive');
  }
  if (!(B <= 0)) {
    throw new Error('The stochastic interpretation requires B <= 0');
  }
  if (Math.abs(B + 2 * lambda) > 1e-12) {
    throw new Error('B must equal -2 * lambda for the telegraph correspondence');
  }
}

export function makeValidationConfig(overrides = {}) {
  const config = {
    seed: 20260721,
    particleCount: 20_000,
    gridSize: 64,
    domainHalfWidth: 4,
    initialRadius: 0.25,
    velocity: 1,
    lambda: 1,
    alphaFinal: 1.2,
    alphaStep: 0.01,
    boundary: 'absorbing',
    ...overrides,
  };
  config.B ??= -2 * config.lambda;
  validateBianchiParameters(config);
  if (config.boundary !== 'absorbing') {
    throw new Error('The headless validation currently supports absorbing boundaries only');
  }
  return config;
}

// Standard dimensionless Misner Bianchi-IX potential in the convention
// u_{alpha alpha} + 2 lambda u_alpha = v^2 Delta_beta u - exp(4 alpha) V u.
// It is intentionally kept separate from the manuscript's -24 pi^2 exp(6 alpha) R
// form until their normalization relation is fixed.
export function bianchiIXMisnerPotential(betaPlus, betaMinus) {
  const rootThree = Math.sqrt(3);
  return (
    Math.exp(-8 * betaPlus) / 3
    - (4 * Math.exp(-2 * betaPlus) * Math.cosh(2 * rootThree * betaMinus)) / 3
    + (2 * Math.exp(4 * betaPlus) * (Math.cosh(4 * rootThree * betaMinus) - 1)) / 3
  );
}

export function makeBianchiIXConfig(overrides = {}) {
  const config = makeValidationConfig({
    alphaInitial: -2,
    alphaFinal: -1.2,
    domainHalfWidth: 1.2,
    potentialAmplitude: 1,
    ...overrides,
  });
  if (!(config.alphaInitial < config.alphaFinal)) {
    throw new Error('alphaInitial must be smaller than alphaFinal');
  }
  return config;
}

function sampleDisk(random, radius) {
  const radial = radius * Math.sqrt(random());
  const angle = TWO_PI * random();
  return { betaPlus: radial * Math.cos(angle), betaMinus: radial * Math.sin(angle) };
}

function isInsideDomain(betaPlus, betaMinus, halfWidth) {
  return Math.abs(betaPlus) < halfWidth && Math.abs(betaMinus) < halfWidth;
}

function makeBetaAxis(config, dx) {
  return Array.from(
    { length: config.gridSize },
    (_, index) => -config.domainHalfWidth + (index + 0.5) * dx,
  );
}

export function runPersistentWalk(configInput) {
  const config = makeValidationConfig(configInput);
  const random = createSeededRandom(config.seed);
  const walkers = [];
  const maxFrontRadius = config.initialRadius + config.velocity * config.alphaFinal;

  for (let particle = 0; particle < config.particleCount; particle += 1) {
    const initial = sampleDisk(random, config.initialRadius);
    let betaPlus = initial.betaPlus;
    let betaMinus = initial.betaMinus;
    let direction = TWO_PI * random();
    let alpha = 0;
    let absorbed = false;

    while (alpha < config.alphaFinal && !absorbed) {
      const wait = -Math.log(Math.max(random(), Number.MIN_VALUE)) / config.lambda;
      const duration = Math.min(wait, config.alphaFinal - alpha);
      betaPlus += config.velocity * Math.cos(direction) * duration;
      betaMinus += config.velocity * Math.sin(direction) * duration;
      alpha += duration;
      absorbed = !isInsideDomain(betaPlus, betaMinus, config.domainHalfWidth);
      if (wait <= duration && !absorbed) direction = TWO_PI * random();
    }

    walkers.push({ betaPlus, betaMinus, absorbed });
  }

  return { config, walkers, maxFrontRadius };
}

export function histogramWalk(walkResult) {
  const { config, walkers, maxFrontRadius } = walkResult;
  const size = config.gridSize;
  const dx = (2 * config.domainHalfWidth) / size;
  const density = new Float64Array(size * size);
  let absorbedCount = 0;
  let maxObservedRadius = 0;
  let frontViolations = 0;
  let meanPlus = 0;
  let meanMinus = 0;
  let radialSecondMoment = 0;

  for (const walker of walkers) {
    if (walker.absorbed) {
      absorbedCount += 1;
      continue;
    }
    const radius = Math.hypot(walker.betaPlus, walker.betaMinus);
    maxObservedRadius = Math.max(maxObservedRadius, radius);
    if (radius > maxFrontRadius + 1e-10) frontViolations += 1;
    meanPlus += walker.betaPlus;
    meanMinus += walker.betaMinus;
    radialSecondMoment += radius * radius;
    const xIndex = Math.floor((walker.betaPlus + config.domainHalfWidth) / dx);
    const yIndex = Math.floor((walker.betaMinus + config.domainHalfWidth) / dx);
    if (xIndex >= 0 && xIndex < size && yIndex >= 0 && yIndex < size) {
      density[yIndex * size + xIndex] += 1 / (config.particleCount * dx * dx);
    }
  }

  const surviving = config.particleCount - absorbedCount;
  return {
    density,
    dx,
    moments: {
      mass: surviving / config.particleCount,
      meanBetaPlus: meanPlus / config.particleCount,
      meanBetaMinus: meanMinus / config.particleCount,
      radialSecondMoment: radialSecondMoment / config.particleCount,
    },
    front: { maxObservedRadius, maxAllowedRadius: maxFrontRadius, violations: frontViolations },
    absorbedCount,
  };
}

function laplacian(field, index, size, dxSquared) {
  const x = index % size;
  const y = Math.floor(index / size);
  if (x === 0 || y === 0 || x === size - 1 || y === size - 1) return 0;
  return (field[index - 1] + field[index + 1] + field[index - size] + field[index + size] - 4 * field[index]) / dxSquared;
}

export function solveBianchiITelegraph(configInput) {
  const config = makeValidationConfig(configInput);
  const size = config.gridSize;
  const dx = (2 * config.domainHalfWidth) / size;
  const dt = Math.min(config.alphaStep, 0.45 * dx / (Math.sqrt(2) * config.velocity));
  const steps = Math.ceil(config.alphaFinal / dt);
  const actualDt = config.alphaFinal / steps;
  const dxSquared = dx * dx;
  const normalisation = 1 / (Math.PI * config.initialRadius * config.initialRadius);
  let current = new Float64Array(size * size);

  for (let y = 0; y < size; y += 1) {
    const betaMinus = -config.domainHalfWidth + (y + 0.5) * dx;
    for (let x = 0; x < size; x += 1) {
      const betaPlus = -config.domainHalfWidth + (x + 0.5) * dx;
      if (Math.hypot(betaPlus, betaMinus) <= config.initialRadius) current[y * size + x] = normalisation;
    }
  }

  let previous = new Float64Array(size * size);
  for (let index = 0; index < current.length; index += 1) {
    previous[index] = current[index] + 0.5 * actualDt * actualDt * config.velocity ** 2 * laplacian(current, index, size, dxSquared);
  }

  for (let step = 0; step < steps; step += 1) {
    const next = new Float64Array(size * size);
    for (let index = 0; index < current.length; index += 1) {
      const x = index % size;
      const y = Math.floor(index / size);
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) continue;
      const wave = actualDt * actualDt * config.velocity ** 2 * laplacian(current, index, size, dxSquared);
      next[index] = (2 * current[index] - (1 - config.lambda * actualDt) * previous[index] + wave) / (1 + config.lambda * actualDt);
    }
    previous = current;
    current = next;
  }

  return { density: current, dx, alpha: config.alphaFinal, alphaStep: actualDt };
}

export function solveBianchiIXTelegraph(configInput = {}) {
  const config = makeBianchiIXConfig(configInput);
  const size = config.gridSize;
  const dx = (2 * config.domainHalfWidth) / size;
  const duration = config.alphaFinal - config.alphaInitial;
  const dt = Math.min(config.alphaStep, 0.45 * dx / (Math.sqrt(2) * config.velocity));
  const steps = Math.ceil(duration / dt);
  const actualDt = duration / steps;
  const dxSquared = dx * dx;
  const normalisation = 1 / (Math.PI * config.initialRadius * config.initialRadius);
  let current = new Float64Array(size * size);
  let minimumSource = Infinity;
  let maximumSource = -Infinity;

  const sourceAt = (index, alpha) => {
    const x = index % size;
    const y = Math.floor(index / size);
    const betaPlus = -config.domainHalfWidth + (x + 0.5) * dx;
    const betaMinus = -config.domainHalfWidth + (y + 0.5) * dx;
    // A positive value creates expected particle number; a negative value kills it.
    return -config.potentialAmplitude * Math.exp(4 * alpha) * bianchiIXMisnerPotential(betaPlus, betaMinus);
  };

  for (let y = 0; y < size; y += 1) {
    const betaMinus = -config.domainHalfWidth + (y + 0.5) * dx;
    for (let x = 0; x < size; x += 1) {
      const betaPlus = -config.domainHalfWidth + (x + 0.5) * dx;
      if (Math.hypot(betaPlus, betaMinus) <= config.initialRadius) current[y * size + x] = normalisation;
    }
  }

  let previous = new Float64Array(size * size);
  for (let index = 0; index < current.length; index += 1) {
    const source = sourceAt(index, config.alphaInitial);
    minimumSource = Math.min(minimumSource, source);
    maximumSource = Math.max(maximumSource, source);
    previous[index] = current[index] + 0.5 * actualDt * actualDt * (
      config.velocity ** 2 * laplacian(current, index, size, dxSquared) + source * current[index]
    );
  }

  for (let step = 0; step < steps; step += 1) {
    const alpha = config.alphaInitial + (step + 1) * actualDt;
    const next = new Float64Array(size * size);
    for (let index = 0; index < current.length; index += 1) {
      const x = index % size;
      const y = Math.floor(index / size);
      if (x === 0 || y === 0 || x === size - 1 || y === size - 1) continue;
      const source = sourceAt(index, alpha);
      minimumSource = Math.min(minimumSource, source);
      maximumSource = Math.max(maximumSource, source);
      const wave = actualDt * actualDt * (
        config.velocity ** 2 * laplacian(current, index, size, dxSquared) + source * current[index]
      );
      next[index] = (2 * current[index] - (1 - config.lambda * actualDt) * previous[index] + wave) / (1 + config.lambda * actualDt);
    }
    previous = current;
    current = next;
  }

  let minimumDensity = Infinity;
  let maximumDensity = -Infinity;
  let mass = 0;
  for (const value of current) {
    minimumDensity = Math.min(minimumDensity, value);
    maximumDensity = Math.max(maximumDensity, value);
    mass += value * dx * dx;
  }

  return {
    config,
    density: current,
    dx,
    sourceTerm: { minimum: minimumSource, maximum: maximumSource },
    densityDiagnostics: {
      minimum: minimumDensity,
      maximum: maximumDensity,
      mass,
      nonnegative: minimumDensity >= -1e-12,
    },
    ensemble: {
      positiveFixedPopulation: false,
      positiveBranchingPopulation: false,
      representation: 'signed weighted trajectories or an amplitude-level formulation',
      reason: 'The source term changes sign and the scalar telegraph field becomes negative under refinement; branching and killing alone cannot represent it as a nonnegative density.',
    },
  };
}

export function compareDensities(monteCarlo, telegraph) {
  if (monteCarlo.density.length !== telegraph.density.length) throw new Error('Density grids must match');
  const cellArea = monteCarlo.dx * monteCarlo.dx;
  let l1 = 0;
  let l2Squared = 0;
  for (let index = 0; index < monteCarlo.density.length; index += 1) {
    const difference = monteCarlo.density[index] - telegraph.density[index];
    l1 += Math.abs(difference) * cellArea;
    l2Squared += difference * difference * cellArea;
  }
  return { l1, l2: Math.sqrt(l2Squared) };
}

export function runBianchiIValidation(configInput = {}) {
  const walk = runPersistentWalk(configInput);
  const monteCarlo = histogramWalk(walk);
  const telegraph = solveBianchiITelegraph(walk.config);
  return {
    parameters: {
      seed: walk.config.seed,
      velocity: walk.config.velocity,
      lambda: walk.config.lambda,
      B: walk.config.B,
      boundary: walk.config.boundary,
      particleCount: walk.config.particleCount,
      gridSize: walk.config.gridSize,
      domainHalfWidth: walk.config.domainHalfWidth,
      initialRadius: walk.config.initialRadius,
      alphaFinal: walk.config.alphaFinal,
    },
    betaPlus: makeBetaAxis(walk.config, monteCarlo.dx),
    betaMinus: makeBetaAxis(walk.config, monteCarlo.dx),
    monteCarlo: { moments: monteCarlo.moments, front: monteCarlo.front, absorbedCount: monteCarlo.absorbedCount, density: Array.from(monteCarlo.density) },
    telegraph: { alpha: telegraph.alpha, alphaStep: telegraph.alphaStep, density: Array.from(telegraph.density) },
    errors: compareDensities(monteCarlo, telegraph),
  };
}

export function runRefinementStudy(baseConfig = {}) {
  const levels = [
    { gridSize: 32, particleCount: 5_000, alphaStep: 0.02 },
    { gridSize: 64, particleCount: 20_000, alphaStep: 0.01 },
    { gridSize: 96, particleCount: 45_000, alphaStep: 0.006 },
  ];
  return levels.map((level, index) => {
    const result = runBianchiIValidation({ ...baseConfig, ...level, seed: (baseConfig.seed ?? 20260721) + index });
    return { gridSize: level.gridSize, particleCount: level.particleCount, l1: result.errors.l1, l2: result.errors.l2, frontViolations: result.monteCarlo.front.violations };
  });
}

function summarizeReport(report) {
  return {
    parameters: report.validation.parameters,
    moments: report.validation.monteCarlo.moments,
    finiteSpeedFront: report.validation.monteCarlo.front,
    errors: report.validation.errors,
    refinement: report.refinement,
  };
}

function summarizeBianchiIX(result) {
  return {
    parameters: {
      alphaInitial: result.config.alphaInitial,
      alphaFinal: result.config.alphaFinal,
      gridSize: result.config.gridSize,
      potentialConvention: 'exp(4 alpha) V_Misner(betaPlus, betaMinus)',
    },
    sourceTerm: result.sourceTerm,
    densityDiagnostics: result.densityDiagnostics,
    ensemble: result.ensemble,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputIndex = process.argv.indexOf('--output');
  const bianchiIX = process.argv.includes('--bianchi-ix');
  const report = bianchiIX
    ? { bianchiIX: solveBianchiIXTelegraph() }
    : { validation: runBianchiIValidation(), refinement: runRefinementStudy() };
  const json = JSON.stringify(report, null, 2);
  if (outputIndex >= 0 && process.argv[outputIndex + 1]) writeFileSync(process.argv[outputIndex + 1], json);
  else process.stdout.write(`${JSON.stringify(bianchiIX ? summarizeBianchiIX(report.bianchiIX) : summarizeReport(report), null, 2)}\n`);
}
