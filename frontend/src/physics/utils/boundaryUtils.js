export function applyPeriodicBoundary(position, boundaries) {
    const { xMin, xMax, yMin, yMax } = boundaries;
    const width = xMax - xMin;
    const height = yMax - yMin;
    let x = position.x;
    let y = position.y;
    // Wrap x coordinate
    if (x < xMin)
        x = xMax - (xMin - x) % width;
    if (x > xMax)
        x = xMin + (x - xMax) % width;
    // Wrap y coordinate
    if (y < yMin)
        y = yMax - (yMin - y) % height;
    if (y > yMax)
        y = yMin + (y - yMax) % height;
    return { position: { x, y } };
}
export function applyReflectiveBoundary(position, velocity, boundaries) {
    const { xMin, xMax, yMin, yMax } = boundaries;
    let { x, y } = position;
    let { vx, vy } = velocity;
    // Reflect off x boundaries
    if (x < xMin) {
        x = 2 * xMin - x;
        vx = -vx;
    }
    if (x > xMax) {
        x = 2 * xMax - x;
        vx = -vx;
    }
    // Reflect off y boundaries
    if (y < yMin) {
        y = 2 * yMin - y;
        vy = -vy;
    }
    if (y > yMax) {
        y = 2 * yMax - y;
        vy = -vy;
    }
    return {
        position: { x, y },
        velocity: { vx, vy }
    };
}
export function applyAbsorbingBoundary(position, boundaries) {
    const { xMin, xMax, yMin, yMax } = boundaries;
    const { x, y } = position;
    // Check if particle is outside boundaries
    const absorbed = x < xMin || x > xMax || y < yMin || y > yMax;
    return {
        position: { x, y },
        absorbed
    };
}
