export function sampleCanvasPosition(i, params) {
    const cx = params.canvasWidth / 2;
    const cy = params.canvasHeight / 2;
    if (params.dimension === '1D') {
        switch (params.initialDistType) {
            case 'gaussian': {
                const bm = boxMuller;
                const x = cx + bm() * params.distSigmaX;
                return { x: clamp(x, 0, params.canvasWidth), y: cy };
            }
            case 'stripe': {
                const half = params.distThickness / 2;
                const x = cx + (Math.random() * 2 - 1) * half;
                return { x: clamp(x, 0, params.canvasWidth), y: cy };
            }
            case 'grid': {
                const nx = Math.max(1, params.distNx);
                const gx = i % nx;
                const cellW = params.canvasWidth / nx;
                const jitterX = (Math.random() * 2 - 1) * params.distJitter;
                const x = (gx + 0.5) * cellW + jitterX;
                return { x: clamp(x, 0, params.canvasWidth), y: cy };
            }
            case 'uniform':
            default:
                return { x: Math.random() * params.canvasWidth, y: cy };
        }
    }
    switch (params.initialDistType) {
        case 'gaussian': {
            const bm = boxMuller;
            const x = cx + bm() * params.distSigmaX;
            const y = cy + bm() * params.distSigmaY;
            return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
        }
        case 'ring': {
            const r0 = params.distR0;
            const dr = params.distDR;
            const r = r0 + (Math.random() - 0.5) * 2 * dr;
            const theta = Math.random() * 2 * Math.PI;
            const x = cx + r * Math.cos(theta);
            const y = cy + r * Math.sin(theta);
            return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
        }
        case 'stripe': {
            const half = params.distThickness / 2;
            const x = cx + (Math.random() * 2 - 1) * half;
            const y = Math.random() * params.canvasHeight;
            return { x: clamp(x, 0, params.canvasWidth), y };
        }
        case 'grid': {
            const nx = Math.max(1, params.distNx);
            const ny = Math.max(1, params.distNy);
            const gx = i % nx;
            const gy = Math.floor(i / nx) % ny;
            const cellW = params.canvasWidth / nx;
            const cellH = params.canvasHeight / ny;
            const jitterX = (Math.random() * 2 - 1) * params.distJitter;
            const jitterY = (Math.random() * 2 - 1) * params.distJitter;
            const x = (gx + 0.5) * cellW + jitterX;
            const y = (gy + 0.5) * cellH + jitterY;
            return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
        }
        case 'uniform':
        default:
            return { x: Math.random() * params.canvasWidth, y: Math.random() * params.canvasHeight };
    }
}
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
function boxMuller() {
    let u = 0, v = 0;
    while (u === 0)
        u = Math.random();
    while (v === 0)
        v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
