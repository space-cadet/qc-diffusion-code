export interface DensityField {
  x: number[];
  rho: number[];
  u: number[];
  moments: Moments;
  collisionRate: number[];
}

export interface Moments {
  mean: number;
  variance: number;
  skewness: number;
  kurtosis: number;
}

export interface ScalingParams {
  tau: number;
  a: number;
  D: number;
  v: number;
  gamma: number;
}
