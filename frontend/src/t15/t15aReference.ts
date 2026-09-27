import type { T15Ordering, T15Profile } from "./t15RandomWalk";

const DOMAIN: [number, number] = [-6, 6];
const GRID_SIZE = 2048;
const GRID_SPACING = (DOMAIN[1] - DOMAIN[0]) / GRID_SIZE;

export interface T15aReferenceProfile {
  density: number[];
  current: number[];
  domain: [number, number];
}

function fft(real: Float64Array, imaginary: Float64Array, inverse: boolean): void {
  const length = real.length;
  for (let i = 1, j = 0; i < length; i += 1) {
    let bit = length >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imaginary[i], imaginary[j]] = [imaginary[j], imaginary[i]];
    }
  }

  for (let width = 2; width <= length; width <<= 1) {
    const angleStep = (inverse ? 2 : -2) * Math.PI / width;
    const halfWidth = width >> 1;
    for (let block = 0; block < length; block += width) {
      for (let offset = 0; offset < halfWidth; offset += 1) {
        const angle = angleStep * offset;
        const twiddleReal = Math.cos(angle);
        const twiddleImaginary = Math.sin(angle);
        const even = block + offset;
        const odd = even + halfWidth;
        const productReal = twiddleReal * real[odd] - twiddleImaginary * imaginary[odd];
        const productImaginary = twiddleReal * imaginary[odd] + twiddleImaginary * real[odd];
        real[odd] = real[even] - productReal;
        imaginary[odd] = imaginary[even] - productImaginary;
        real[even] += productReal;
        imaginary[even] += productImaginary;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < length; i += 1) {
      real[i] /= length;
      imaginary[i] /= length;
    }
  }
}

function bump(beta: number, center: number, width: number): number {
  const scaled = (beta - center) / width;
  if (Math.abs(scaled) >= 1) return 0;
  return Math.exp(-1 / (1 - scaled * scaled));
}

function initialProfile(profile: T15Profile): { density: Float64Array; current: Float64Array } {
  const density = new Float64Array(GRID_SIZE);
  const current = new Float64Array(GRID_SIZE);
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const beta = DOMAIN[0] + (i + 0.5) * GRID_SPACING;
    if (profile === "bimodal") {
      density[i] = 0.5 * bump(beta, -0.65, 0.35) + 0.5 * bump(beta, 0.65, 0.35);
    } else if (profile === "asymmetric") {
      density[i] = bump(beta, -0.2, 0.85);
      current[i] = 0.4 * density[i];
    } else {
      density[i] = bump(beta, 0, 0.7);
    }
  }

  let mass = 0;
  for (const value of density) mass += value * GRID_SPACING;
  for (let i = 0; i < GRID_SIZE; i += 1) {
    density[i] /= mass;
    current[i] /= mass;
  }
  return { density, current };
}

/** Exact Fourier evolution of the T15a density/current system on the paper's 2048-cell box. */
export function t15aSpectralReference(
  profile: T15Profile,
  ordering: T15Ordering,
  time: number,
  bins = 120,
): T15aReferenceProfile {
  const { density: initialDensity, current: initialCurrent } = initialProfile(profile);
  const densityReal = initialDensity.slice();
  const densityImaginary = new Float64Array(GRID_SIZE);
  const currentReal = initialCurrent.slice();
  const currentImaginary = new Float64Array(GRID_SIZE);
  fft(densityReal, densityImaginary, false);
  fft(currentReal, currentImaginary, false);

  const damping = ordering === "derivative" ? 0.75 : 0;
  const decay = Math.exp(-damping * time);
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const frequencyIndex = i <= GRID_SIZE / 2 ? i : i - GRID_SIZE;
    const waveNumber = 2 * Math.PI * frequencyIndex / (DOMAIN[1] - DOMAIN[0]);
    const squaredRoot = damping * damping - waveNumber * waveNumber;
    let cosh: number;
    let sinhOverRoot: number;
    if (squaredRoot >= 0) {
      const root = Math.sqrt(squaredRoot);
      cosh = Math.cosh(root * time);
      sinhOverRoot = root < 1e-12 ? time : Math.sinh(root * time) / root;
    } else {
      const root = Math.sqrt(-squaredRoot);
      cosh = Math.cos(root * time);
      sinhOverRoot = root < 1e-12 ? time : Math.sin(root * time) / root;
    }

    const oldDensityReal = densityReal[i];
    const oldDensityImaginary = densityImaginary[i];
    const oldCurrentReal = currentReal[i];
    const oldCurrentImaginary = currentImaginary[i];
    const densityFactor = cosh + damping * sinhOverRoot;
    const currentFactor = cosh - damping * sinhOverRoot;
    densityReal[i] = decay * (densityFactor * oldDensityReal + waveNumber * sinhOverRoot * oldCurrentImaginary);
    densityImaginary[i] = decay * (densityFactor * oldDensityImaginary - waveNumber * sinhOverRoot * oldCurrentReal);
    currentReal[i] = decay * (currentFactor * oldCurrentReal + waveNumber * sinhOverRoot * oldDensityImaginary);
    currentImaginary[i] = decay * (currentFactor * oldCurrentImaginary - waveNumber * sinhOverRoot * oldDensityReal);
  }

  fft(densityReal, densityImaginary, true);
  fft(currentReal, currentImaginary, true);

  const density = new Array<number>(bins).fill(0);
  const current = new Array<number>(bins).fill(0);
  const binWidth = (DOMAIN[1] - DOMAIN[0]) / bins;
  for (let i = 0; i < GRID_SIZE; i += 1) {
    const beta = DOMAIN[0] + (i + 0.5) * GRID_SPACING;
    const bin = Math.floor((beta - DOMAIN[0]) / binWidth);
    if (bin >= 0 && bin < bins) {
      density[bin] += densityReal[i] * GRID_SPACING / binWidth;
      current[bin] += currentReal[i] * GRID_SPACING / binWidth;
    }
  }
  return { density, current, domain: DOMAIN };
}
