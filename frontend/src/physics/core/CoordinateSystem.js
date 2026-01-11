import { applyPeriodicBoundary, applyReflectiveBoundary, applyAbsorbingBoundary } from '../utils/boundaryUtils';
export class CoordinateSystem {
    constructor(canvasSize, boundaries, dimension) {
        this.boundaries = boundaries;
        this.canvasSize = canvasSize;
        this.dimension = dimension;
    }
    toCanvas(physics) {
        const wPhys = this.boundaries.xMax - this.boundaries.xMin || 1;
        const hPhys = (this.boundaries.yMax - this.boundaries.yMin) || 1;
        const x = ((physics.x - this.boundaries.xMin) / wPhys) * this.canvasSize.width;
        const y = this.dimension === '1D'
            ? this.canvasSize.height / 2
            : ((physics.y - this.boundaries.yMin) / hPhys) * this.canvasSize.height;
        return { x, y };
    }
    toPhysics(canvas) {
        const wPhys = this.boundaries.xMax - this.boundaries.xMin || 1;
        const hPhys = (this.boundaries.yMax - this.boundaries.yMin) || 1;
        const x = this.boundaries.xMin + (canvas.x / Math.max(this.canvasSize.width, 1)) * wPhys;
        const y = this.dimension === '1D'
            ? 0
            : this.boundaries.yMin + (canvas.y / Math.max(this.canvasSize.height, 1)) * hPhys;
        return { x, y };
    }
    constrainToDimension(p) {
        return this.dimension === '1D' ? { x: p.x, y: 0 } : p;
    }
    isWithinBounds(p) {
        return (p.x >= this.boundaries.xMin && p.x <= this.boundaries.xMax &&
            (this.dimension === '1D' || (p.y >= this.boundaries.yMin && p.y <= this.boundaries.yMax)));
    }
    updateBoundaries(config) {
        this.boundaries = config;
    }
    updateCanvasSize(size) {
        this.canvasSize = size;
    }
    updateDimension(dimension) {
        this.dimension = dimension;
    }
    getCanvasSize() {
        return { ...this.canvasSize };
    }
    getBoundaries() {
        return { ...this.boundaries };
    }
    getDimension() {
        return this.dimension;
    }
    calculateDisplacement(pos1, pos2) {
        return {
            x: pos2.x - pos1.x,
            y: this.dimension === '1D' ? 0 : pos2.y - pos1.y
        };
    }
    calculateVelocity(pos1, pos2, dt) {
        return this.toVelocity({
            x: (pos2.x - pos1.x) / dt,
            y: this.dimension === '1D' ? 0 : (pos2.y - pos1.y) / dt
        });
    }
    toVelocity(vector) {
        return { vx: vector.x, vy: vector.y };
    }
    toVector(velocity) {
        return { x: velocity.vx, y: velocity.vy };
    }
    applyBoundaryConditions(pos, vel) {
        // Implementation depends on boundary type from this.boundaries
        switch (this.boundaries.type) {
            case 'periodic':
                return applyPeriodicBoundary(pos, this.boundaries);
            case 'reflective':
                return vel ? applyReflectiveBoundary(pos, vel, this.boundaries) :
                    { position: pos };
            case 'absorbing':
                return applyAbsorbingBoundary(pos, this.boundaries);
            default:
                return { position: pos };
        }
    }
    getRandomPosition() {
        return {
            x: this.boundaries.xMin + Math.random() * (this.boundaries.xMax - this.boundaries.xMin),
            y: this.dimension === '1D' ? 0 :
                this.boundaries.yMin + Math.random() * (this.boundaries.yMax - this.boundaries.yMin)
        };
    }
}
