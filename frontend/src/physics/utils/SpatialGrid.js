export class SpatialGrid {
    constructor(gridSize, cellSize) {
        this.grid = new Map();
        this.gridSize = gridSize;
        this.cellSize = cellSize;
        console.log(`[SpatialGrid] Initialized: gridSize=${gridSize}, cellSize=${cellSize}`);
    }
    clear() {
        this.grid.clear();
    }
    getGridKey(x, y) {
        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);
        return `${gx},${gy}`;
    }
    insert(particle) {
        const key = this.getGridKey(particle.position.x, particle.position.y);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(particle);
    }
    getNearbyParticles(particle) {
        const nearby = [];
        const gx = Math.floor(particle.position.x / this.cellSize);
        const gy = Math.floor(particle.position.y / this.cellSize);
        // Check 3x3 grid around particle
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${gx + dx},${gy + dy}`;
                const particles = this.grid.get(key);
                if (particles) {
                    nearby.push(...particles);
                }
            }
        }
        // Log grid query efficiency very rarely (~0.0001%)
        if (Math.random() < 0.000001) { // ~0.0001% chance
            console.log(`[SpatialGrid] Query grid(${gx},${gy}): found ${nearby.length} nearby particles`);
        }
        return nearby;
    }
}
