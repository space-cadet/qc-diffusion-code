export class ParameterManager {
    constructor(params) {
        this.collisionRate = params.collisionRate;
        this.jumpLength = params.jumpLength;
        this.velocity = params.velocity;
        this.dt = params.dt ?? 0.01;
        this.particleCount = params.particleCount;
        this.dimension = params.dimension;
        this.interparticleCollisions = params.interparticleCollisions;
        this.simulationType = params.simulationType;
        this.graphType = params.graphType;
        this.graphSize = params.graphSize;
        this.strategies = params.strategies;
        this.boundaryCondition = params.boundaryCondition;
        this.canvasWidth = params.canvasWidth || 800;
        this.canvasHeight = params.canvasHeight || 600;
        this.initialDistType = params.initialDistType || 'uniform';
        this.distSigmaX = params.distSigmaX || 80;
        this.distSigmaY = params.distSigmaY || 80;
        this.distR0 = params.distR0 || 150;
        this.distDR = params.distDR || 20;
        this.distThickness = params.distThickness || 40;
        this.distNx = params.distNx || 20;
        this.distNy = params.distNy || 15;
        this.distJitter = params.distJitter || 4;
        this.temperature = params.temperature || 1.0;
    }
    updateParameters(params) {
        let needsReinitialization = false;
        if (params.dimension && params.dimension !== this.dimension) {
            this.dimension = params.dimension;
            needsReinitialization = true;
        }
        if (params.particleCount && params.particleCount !== this.particleCount) {
            this.particleCount = params.particleCount;
            needsReinitialization = true;
        }
        // Update physics parameters
        if (params.collisionRate !== undefined) {
            this.collisionRate = params.collisionRate;
        }
        if (params.jumpLength !== undefined) {
            this.jumpLength = params.jumpLength;
        }
        if (params.velocity !== undefined) {
            this.velocity = params.velocity;
        }
        if (params.dt !== undefined) {
            this.dt = params.dt;
        }
        if (params.interparticleCollisions !== undefined) {
            this.interparticleCollisions = params.interparticleCollisions;
        }
        if (params.canvasWidth) {
            this.canvasWidth = params.canvasWidth;
        }
        if (params.canvasHeight) {
            this.canvasHeight = params.canvasHeight;
        }
        if (params.initialDistType) {
            this.initialDistType = params.initialDistType;
        }
        if (params.distSigmaX !== undefined) {
            this.distSigmaX = params.distSigmaX;
        }
        if (params.distSigmaY !== undefined) {
            this.distSigmaY = params.distSigmaY;
        }
        if (params.distR0 !== undefined) {
            this.distR0 = params.distR0;
        }
        if (params.distDR !== undefined) {
            this.distDR = params.distDR;
        }
        if (params.distThickness !== undefined) {
            this.distThickness = params.distThickness;
        }
        if (params.distNx !== undefined) {
            this.distNx = params.distNx;
        }
        if (params.distNy !== undefined) {
            this.distNy = params.distNy;
        }
        if (params.distJitter !== undefined) {
            this.distJitter = params.distJitter;
        }
        if (params.temperature !== undefined) {
            this.temperature = params.temperature;
        }
        if (params.strategies) {
            this.strategies = params.strategies;
        }
        if (params.boundaryCondition) {
            this.boundaryCondition = params.boundaryCondition;
        }
        return needsReinitialization;
    }
    getPhysicsParameters() {
        return {
            collisionRate: this.collisionRate,
            jumpLength: this.jumpLength,
            velocity: this.velocity,
            dt: this.dt
        };
    }
    getTimeStep() {
        return this.dt;
    }
    setTimeStep(dt) {
        this.dt = dt;
    }
    validatePhysicsParameters() {
        return this.collisionRate > 0 && this.jumpLength > 0 && this.velocity > 0;
    }
    getBoundaryConfig() {
        const halfWidth = this.canvasWidth / 2;
        const halfHeight = this.canvasHeight / 2;
        return {
            type: (this.boundaryCondition || 'periodic'),
            xMin: -halfWidth,
            xMax: halfWidth,
            yMin: -halfHeight,
            yMax: halfHeight
        };
    }
}
