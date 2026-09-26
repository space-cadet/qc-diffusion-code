export function mulberry32(seed: number): () => number;
export function spheroidGeometry(q: number, theta: number, R?: number, constraint?: SpheroidConstraint): {
  a: number; b: number; c: number; r: number; E: number; G: number;
  areaDensity: number; gaussianCurvature: number; volume: number;
};
export type SpheroidConstraint = 'volume' | 'area';
export const LIVE_STEP_COUNT_MIN: 1;
export const LIVE_STEP_COUNT_MAX: 200;
export const LIVE_STEP_COUNT_DEFAULT: 200;
export function liveRunHorizon(stepCount: number, outputStep: number): number;
export function initialDensity(kind: string, q: number, eta?: number): [number, number];
export function makeReference(config: Record<string, unknown>): any;
export function runPersistentEnsemble(config: Record<string, any>): any;
export interface PersistentWalkFrame {
  time: number;
  density: number[];
  current: number[];
  mass: number;
  meanQ: number;
  meanQ2: number;
  meanR: number;
  meanArea: number;
  meanVolume: number;
  meanPoleCurvature: number;
  meanEquatorCurvature: number;
  representativeQ: number;
  representativeSigma: number;
}
export interface LivePersistentSimulationConfig {
  kind: string;
  eta?: number;
  seed: number;
  population?: number;
  qMin?: number;
  qMax?: number;
  velocity?: number;
  lambda?: number;
  finalTime?: number;
  outputStep?: number;
  histogramCells?: number;
  representativeIndex?: number;
  constraint?: SpheroidConstraint;
}
export function createLivePersistentSimulation(config: LivePersistentSimulationConfig): {
  seed: number;
  population: number;
  kind: string;
  eta: number;
  velocity: number;
  lambda: number;
  finalTime: number;
  outputStep: number;
  initialFrame: PersistentWalkFrame;
  next(): { frame: PersistentWalkFrame; done: boolean; eventLog: Array<{ time: number; type: string; q: number; sigma: number }>; totalFlips: number; totalReflections: number };
};
export function runDiffusiveControl(config: Record<string, any>): any;
export function transformToAxisRatio(q: number, sigma: number, velocity?: number): { r: number; drdt: number; densityJacobian: number };
export function transformDensityToAxisRatio(qCenters: number[], densityQ: number[], dq: number): { rCenters: number[]; densityR: number[]; massQ: number; massR: number };
export function spheroidSurfaceArea(q: number, R?: number, constraint?: SpheroidConstraint): number;
export function spheroidVolume(q: number, R?: number, constraint?: SpheroidConstraint): number;
