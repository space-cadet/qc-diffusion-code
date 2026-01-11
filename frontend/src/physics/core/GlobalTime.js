// Centralized simulation time source with graceful legacy fallback.
// When the new PhysicsEngine runs, it will set the current simulation time and dt here.
// Legacy code paths (no engine) will transparently fall back to wall-clock time and default dt.
let currentTimeSec = undefined;
let currentDtSec = undefined;
export function setSimTime(timeSeconds, dtSeconds) {
    currentTimeSec = timeSeconds;
    currentDtSec = dtSeconds;
}
export function simTime() {
    if (typeof currentTimeSec === 'number')
        return currentTimeSec;
    return Date.now() / 1000; // fallback for legacy path
}
export function simDt(defaultDt = 0.01) {
    if (typeof currentDtSec === 'number')
        return currentDtSec;
    return defaultDt; // legacy path default dt to preserve visuals
}
