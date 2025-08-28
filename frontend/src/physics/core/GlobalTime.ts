// Centralized simulation time source with graceful legacy fallback.
// When the new PhysicsEngine runs, it will set the current simulation time and dt here.
// Legacy code paths (no engine) will transparently fall back to wall-clock time and default dt.

let currentTimeSec: number | undefined = undefined;
let currentDtSec: number | undefined = undefined;

export function setSimTime(timeSeconds: number, dtSeconds: number) {
  currentTimeSec = timeSeconds;
  currentDtSec = dtSeconds;
}

export function simTime(): number {
  if (typeof currentTimeSec === 'number') return currentTimeSec;
  return Date.now() / 1000; // fallback for legacy path
}

export function simDt(defaultDt: number = 0.01): number {
  if (typeof currentDtSec === 'number') return currentDtSec;
  return defaultDt; // legacy path default dt to preserve visuals
}
