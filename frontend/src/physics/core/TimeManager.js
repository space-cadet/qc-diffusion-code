export class TimeManager {
    constructor(timeStep = 0.016) {
        this.simulationTime = 0; // seconds
        this.timeStep = timeStep;
    }
    advance() {
        this.simulationTime += this.timeStep;
        return this.timeStep;
    }
    getCurrentTime() {
        return this.simulationTime;
    }
    reset() {
        this.simulationTime = 0;
    }
    setTimeStep(dt) {
        this.timeStep = dt;
    }
}
